import { expect, test } from 'bun:test'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { ScannerPlugin, ScanObservation } from '@groma/scanner'
import scanner from '../plugins/scanners/solidity/src/index.ts'
import manifest from '../plugins/scanners/solidity/package.json'
import { buildPackage } from '../plugins/scanners/solidity/build.ts'
import { discoverScanners } from '../src/scanner/modules/discovery.ts'
import { scannerFiles } from '../src/scanner/modules/selection.ts'

const fixture = path.resolve(import.meta.dir, '../test/fixtures/solidity-source')

test.concurrent('Solidity inventory is selected, atomic, stable and independent of missing imports', async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'groma-solidity-source-'))
  try {
    await cp(fixture, temporary, { recursive: true })
    await mkdir(path.join(temporary, 'test'))
    await writeFile(path.join(temporary, 'test/Broken.sol'), 'contract {')
    await writeFile(path.join(temporary, 'Empty.sol'), 'pragma solidity ^0.8.20;')
    const git = Bun.spawn(['git', 'init', '--quiet', temporary], { stderr: 'pipe' })
    expect(await git.exited).toBe(0)
    const selected = await scannerFiles(temporary, manifest.groma.scanner)
    expect(selected).toEqual(['Declarations.sol', 'Empty.sol'])
    expect(await scanner.listSourceFiles(temporary, {}, [...selected, 'notes.md'])).toEqual(selected)
    await scanner.checkReadiness(temporary, {}, selected)
    const first = (await scanner.scan(temporary, {}, selected))!
    expect(await scanner.scan(temporary, {}, [...selected].reverse())).toEqual(first)
    expect(first.files.map(file => [file.file, file.roots])).toEqual([
      ['Declarations.sol', ['.']], ['Empty.sol', ['.']],
    ])
    expect(first.roots).toEqual([{ id: '.', kind: 'repository', name: path.basename(temporary) }])
    const symbols = first.files[0]!.symbols
    expect(symbols.filter(symbol => symbol.name === 'Vault.deposit')).toHaveLength(2)
    expect(new Set(symbols.map(symbol => symbol.id)).size).toBe(symbols.length)
    expect(symbols.some(symbol => symbol.name === 'Vault.Nested')).toBeFalse()
    expect(first.operations).toBeUndefined()
    expect(first.invocations).toBeUndefined()
    await expect(scanner.scan(temporary, {}, [...selected, 'test/Broken.sol'])).rejects.toThrow('test/Broken.sol:1:')
    await expect(scanner.checkReadiness(temporary, {}, ['test/Broken.sol'])).rejects.toThrow('test/Broken.sol:1:')
    expect(await scanner.scan(temporary, {}, [])).toBeUndefined()
    await expect(scanner.checkReadiness(temporary, {}, [])).rejects.toThrow('No selected Solidity')
    expect((await discoverScanners(temporary)).recommendations.some(candidate => candidate.id === 'solidity')).toBeTrue()
  } finally { await rm(temporary, { recursive: true, force: true }) }
})

test.concurrent('Solidity outlines preserve declaration order, name lines, overloads and visibility', async () => {
  const [file] = await scanner.readCodeStructure(fixture, [{ file: 'Declarations.sol', symbols: ['Vault', 'Vault.deposit', 'Math.sum', 'helper'] }])
  expect(file!.declarations.map(declaration => declaration.name)).toEqual(['Vault', 'Reader', 'Math', 'helper', 'Record', 'Status'])
  const vault = file!.declarations[0]!
  expect(vault).toMatchObject({ kind: 'type', name: 'Vault', line: 5, entry: true, visibility: 'public' })
  if (vault.kind !== 'type') throw new Error('Expected contract outline')
  expect(vault.members).toEqual([
    { name: 'constructor', line: 11, visibility: 'public', entry: false },
    { name: 'deposit', line: 13, visibility: 'public', entry: true },
    { name: 'deposit', line: 14, visibility: 'public', entry: true },
    { name: 'extend', line: 15, visibility: 'protected', entry: false },
    { name: 'secret', line: 16, visibility: 'private', entry: false },
    { name: 'fallback', line: 17, visibility: 'public', entry: false },
    { name: 'receive', line: 18, visibility: 'public', entry: false },
  ])
  expect(file!.declarations[1]).toMatchObject({ kind: 'type', members: [{ name: 'read', visibility: 'public' }] })
  expect(file!.declarations[2]).toMatchObject({ kind: 'type', members: [{ name: 'sum', visibility: 'public', entry: true }] })
  expect(file!.declarations[3]).toMatchObject({ kind: 'function', visibility: 'public', entry: true })
  expect(await scanner.readCodeStructure(fixture, [])).toEqual([])
})

test.concurrent('bundled Solidity scanner runs offline with no project dependencies or external tools', async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'groma-solidity-package-'))
  try {
    const artifact = path.join(temporary, 'scanner')
    await buildPackage(artifact)
    const project = path.join(temporary, 'project')
    await cp(fixture, project, { recursive: true })
    const source = await readFile(path.join(project, 'Declarations.sol'), 'utf8')
    const runner = path.join(temporary, 'scan.mjs')
    await writeFile(runner, `
      globalThis.fetch = () => { throw new Error('Scanning used the network') };
      const scanner = (await import(${JSON.stringify(pathToFileURL(path.join(artifact, 'src/index.js')).href)})).default;
      const root = ${JSON.stringify(project)};
      await scanner.checkReadiness(root, {}, ['Declarations.sol']);
      const first = await scanner.scan(root, {}, ['Declarations.sol']);
      const second = await scanner.scan(root, {}, ['Declarations.sol']);
      if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error('Repeated scan differs');
      const outline = await scanner.readCodeStructure(root, [{ file: 'Declarations.sol', symbols: ['Vault'] }]);
      if (outline[0].declarations[0].name !== 'Vault') throw new Error('Missing outline');
      console.log(JSON.stringify(first));
    `)
    const child = Bun.spawn([process.execPath, runner], { cwd: temporary, stdout: 'pipe', stderr: 'pipe',
      env: { PATH: '', HOME: temporary, USERPROFILE: temporary, SystemRoot: process.env.SystemRoot ?? '' } })
    const [output, error, code] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ])
    expect(code, error).toBe(0)
    const result: ScanObservation = JSON.parse(output)
    expect(result.files[0]!.symbols.some(symbol => symbol.name === 'Vault.deposit')).toBeTrue()
    const built: ScannerPlugin = (await import(pathToFileURL(path.join(artifact, 'src/index.js')).href)).default
    expect(await built.scan(project, {}, ['Declarations.sol'])).toEqual(result)
    expect(await readFile(path.join(project, 'Declarations.sol'), 'utf8')).toBe(source)
  } finally { await rm(temporary, { recursive: true, force: true }) }
})
