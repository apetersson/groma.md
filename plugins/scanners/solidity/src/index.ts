import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { parse, ParserError } from '@solidity-parser/parser'
import type { BaseASTNode, ContractDefinition, FunctionDefinition } from '@solidity-parser/parser/dist/src/ast-types'
import {
  createScanObservation, type CodeDeclaration, type CodeFile, type CodeSymbol,
  type CodeVisibility, type ScannerPlugin, type ScanSymbol, type SourceReference,
} from '@groma/scanner'

const isSource = (file: string) => file.endsWith('.sol')

function functionName(node: FunctionDefinition): string {
  if (node.isConstructor) return node.name ?? 'constructor'
  if (node.isReceiveEther) return 'receive'
  if (node.isFallback) return 'fallback'
  return node.name ?? 'fallback'
}

/** Source accessibility: free and library functions can be imported by unrelated contracts. */
function visibility(node: FunctionDefinition, owner?: string): CodeVisibility {
  if (node.visibility === 'private') return 'private'
  if (node.visibility === 'internal' && owner !== undefined && owner !== 'library') return 'protected'
  return 'public'
}

async function declarations(root: string, file: string, entries: readonly string[] = []) {
  const source = await readFile(path.join(root, file), 'utf8')
  let ast: ReturnType<typeof parse>
  try { ast = parse(source, { loc: true, range: true, tokens: true }) }
  catch (error) {
    if (!(error instanceof ParserError)) throw error
    const first = error.errors[0]
    throw new Error(`SOLIDITY_SYNTAX_ERROR: ${file}:${first?.line ?? 1}: ${first?.message ?? error.message}`, { cause: error })
  }
  const tokens = ast.tokens ?? []
  const starts = new Map(tokens.map((token, index) => [token.range?.[0], index]))
  const symbols: ScanSymbol[] = []
  const outline: CodeDeclaration[] = []

  function symbol(node: BaseASTNode, name: string, qualified: string, kind: string): CodeSymbol {
    const index = starts.get(node.range![0]) ?? 0
    let line = node.loc!.start.line
    for (let cursor = index; cursor < tokens.length; cursor++) {
      const token = tokens[cursor]!
      if (token.range![0] > node.range![1]) break
      if (token.value === name) { line = token.loc!.start.line; break }
    }
    symbols.push({ id: `${file}#${qualified}@${node.range![0]}`, name: qualified, kind })
    return { name, line,
      visibility: 'public', entry: entries.includes(qualified) }
  }

  function contract(node: ContractDefinition): CodeDeclaration {
    const declaration = symbol(node, node.name, node.name, node.kind)
    const members = node.subNodes.flatMap(child => {
      if (child.type !== 'FunctionDefinition') return []
      const method = child as FunctionDefinition
      const name = functionName(method)
      return [{ ...symbol(method, name, `${node.name}.${name}`, 'function'), visibility: visibility(method, node.kind) }]
    })
    return { ...declaration, kind: 'type', members }
  }

  for (const node of ast.children) {
    if (node.type === 'ContractDefinition') outline.push(contract(node))
    else if (node.type === 'FunctionDefinition') {
      const name = functionName(node)
      outline.push({ ...symbol(node, name, name, 'function'), kind: 'function', visibility: visibility(node) })
    } else if (node.type === 'StructDefinition' || node.type === 'EnumDefinition') {
      outline.push({ ...symbol(node, node.name, node.name, node.type), kind: 'type', members: [] })
    }
  }
  return { symbols, outline }
}

async function readCodeStructure(root: string, references: readonly SourceReference[]): Promise<CodeFile[]> {
  const result: CodeFile[] = []
  for (const reference of references.filter(reference => isSource(reference.file))) {
    const parsed = await declarations(root, reference.file, reference.symbols)
    if (parsed.outline.length) result.push({ file: reference.file, declarations: parsed.outline })
  }
  return result
}

export default {
  id: 'solidity',
  listSourceFiles: async (_root, _settings, candidates) => candidates.filter(isSource),
  async checkReadiness(root, _settings, files) {
    const sources = files.filter(isSource)
    if (!sources.length) throw new Error('solidity: No selected Solidity source files were found.')
    for (const file of sources) await declarations(root, file)
  },
  async scan(root, _settings, files) {
    const sources = [...files.filter(isSource)].sort()
    if (!sources.length) return undefined
    const inventory = []
    for (const file of sources) {
      const parsed = await declarations(root, file)
      inventory.push({ file, roots: ['.'], symbols: parsed.symbols })
    }
    return createScanObservation({
      scanner: { id: 'solidity', technology: 'solidity', engine: '@solidity-parser/parser', engineVersion: '0.20.2' },
      roots: [{ id: '.', kind: 'repository', name: path.basename(root) }],
      files: inventory,
      diagnostics: [{ severity: 'info', code: 'SOLIDITY_SYNTAX_ONLY',
        message: 'Solidity syntax only; imports, inheritance, calls, deployments, modifiers and assembly are not resolved.' }],
    })
  },
  readCodeStructure,
} satisfies ScannerPlugin
