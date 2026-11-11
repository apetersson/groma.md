import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('./', import.meta.url))

/** Bundle the JavaScript parser so scanning needs neither solc nor project dependencies. */
export async function buildPackage(destination: string): Promise<void> {
  await mkdir(path.join(destination, 'src'), { recursive: true })
  const built = await Bun.build({ entrypoints: [path.join(root, 'src/index.ts')],
    outdir: path.join(destination, 'src'), target: 'node', format: 'esm', naming: 'index.js' })
  if (!built.success) throw new AggregateError(built.logs, 'Solidity scanner build failed')
  const { dependencies: _, ...manifest } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
  await writeFile(path.join(destination, 'package.json'), `${JSON.stringify({ ...manifest,
    files: ['src', 'LICENSE', 'SOLIDITY-PARSER-LICENSE', 'README.md', 'validation.md'],
    groma: { scanner: { ...manifest.groma.scanner, entry: './src/index.js' } },
  }, null, 2)}\n`)
  const require = createRequire(import.meta.url)
  const parser = path.dirname(require.resolve('@solidity-parser/parser/package.json'))
  await cp(path.join(parser, 'LICENSE'), path.join(destination, 'SOLIDITY-PARSER-LICENSE'))
  await cp(path.join(root, '../../../LICENSE'), path.join(destination, 'LICENSE'))
  await cp(path.join(root, '../../../docs/scanners/solidity/index.md'), path.join(destination, 'README.md'))
  await cp(path.join(root, '../../../docs/scanners/solidity/validation.md'), path.join(destination, 'validation.md'))
}

if (import.meta.main) {
  const destination = path.resolve(process.argv[2] ?? path.join(root, 'dist/package'))
  await buildPackage(destination)
  console.log(destination)
}
