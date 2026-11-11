import { expect, test } from 'bun:test'
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createScanObservation } from '@groma/scanner'
import { writes } from '../src/authoring.ts'
import { loadArchitecture } from '../src/architecture-reader.ts'
import { loadAnnotatedArchitecture, reconcileScanObservations } from '../src/core.ts'

const scan = createScanObservation({
  scanner: { id: 'fixture', technology: 'fixture', engine: 'fixture', engineVersion: '1' },
  roots: [{ id: '.', kind: 'repository', name: 'Service' }],
  files: ['entry.ts', 'worker.ts'].map(file => ({ file, roots: ['.'], symbols: [] })), diagnostics: [],
})

async function repository() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'groma-container-declaration-'))
  await cp(path.resolve(import.meta.dir, '../test/fixtures/empty-project'), root, { recursive: true })
  await writes.edit(root, { id: 'project', title: 'Service' })
  await reconcileScanObservations(root, [scan])
  return root
}

const cli = path.resolve(import.meta.dir, '../src/cli.ts')

test.concurrent('the CLI declares a stable runtime without Code and rejects missing or invalid parents without writes', async () => {
  const root = await repository()
  try {
    const proc = Bun.spawn([process.execPath, cli, 'add', 'container', 'Runtime', '--parent', 'service',
      '--overview', 'Runs requests.', '--technology', 'EVM'], { cwd: root, stdout: 'pipe', stderr: 'pipe' })
    expect(await proc.exited, await new Response(proc.stderr).text()).toBe(0)
    const world = await loadAnnotatedArchitecture(root)
    expect(world.elements.find(element => element.id === 'runtime')).toMatchObject({
      kind: 'container', parent: 'service', origin: 'observed', technology: 'EVM', code: [], overview: 'Runs requests.',
    })
    expect(await readFile(path.join(root, 'groma/systems/service/containers/runtime/container.md'), 'utf8'))
      .toContain('status: stable')
    await writes.add(root, { thing: 'external', name: 'Remote', overview: 'Another service.' })
    const before = await loadArchitecture(root)
    for (const parent of [undefined, 'missing', 'remote', 'runtime', 'entry']) {
      await expect(writes.add(root, { thing: 'container', name: 'Invalid', parent, overview: 'Unknown runtime.' }))
        .rejects.toThrow(parent === undefined ? '--parent is required' : 'internal system parent')
    }
    expect(await loadArchitecture(root)).toEqual(before)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test.concurrent('manual placement preserves curated meaning, links, flows and ownership across rescans', async () => {
  const root = await repository()
  try {
    await writes.add(root, { thing: 'container', name: 'Runtime', parent: 'service', overview: 'Runs requests.' })
    await writes.add(root, { thing: 'external', name: 'Other', overview: 'External service.' })
    const actor = await writes.add(root, { thing: 'actor', name: 'Caller', overview: 'Starts work.' })
    await writes.edit(root, { id: 'entry', description: 'Accepts work.', overview: 'Keeps [worker](worker.md) nearby.', group: 'Requests' })
    await writes.add(root, { thing: 'relation', name: actor, relation: 'entry', description: 'Starts work', technology: 'RPC' })
    await writes.add(root, { thing: 'relation', name: 'entry.ts', relation: 'worker.ts', description: 'Runs work', technology: 'Call' })
    await writes.add(root, { thing: 'flow', name: 'Run', overview: 'Runs requested work.', steps: [
      '| From | To | Action |', '| --- | --- | --- |',
      '| [Caller](../actors/caller.md) | [Entry](../systems/service/components/entry.md) | Start |',
      '| [Entry](../systems/service/components/entry.md) | [Worker](../systems/service/components/worker.md) | Run |',
    ].join('\n') })
    const before = await loadAnnotatedArchitecture(root)
    expect(before.elements.find(element => element.id === 'entry')?.movable).toBe(true)
    await expect(writes.edit(root, { id: 'entry', parent: 'other' })).rejects.toThrow()
    await writes.edit(root, { id: 'entry', parent: 'runtime' })
    await writes.edit(root, { id: 'worker', parent: 'runtime' })
    const placed = await loadAnnotatedArchitecture(root)
    const component = placed.elements.find(element => element.id === 'entry')!
    expect(component).toMatchObject({ id: 'entry', parent: 'runtime', description: 'Accepts work.', group: 'Requests' })
    expect(component.code.map(reference => reference.file)).toEqual(['entry.ts'])
    expect(placed.relationships).toEqual(before.relationships)
    expect(placed.flows).toEqual(before.flows)
    const record = (await loadArchitecture(root)).documents.find(document =>
      (document.frontmatter.groma as { id: string })?.id === 'entry')!
    expect(await readFile(path.join(root, record.sourceFilename), 'utf8')).toContain('[worker](worker.md)')
    for (let repeat = 0; repeat < 2; repeat++) {
      expect((await reconcileScanObservations(root, [scan])).created).toBe(0)
      expect(await loadAnnotatedArchitecture(root)).toEqual(placed)
    }
    const owners = placed.elements.flatMap(element => element.code.map(reference => [reference.file, element.id]))
    expect(owners.sort()).toEqual([['entry.ts', 'entry'], ['worker.ts', 'worker']])
  } finally { await rm(root, { recursive: true, force: true }) }
})
