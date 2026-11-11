import { buildArchitectureModel, freeId } from './architecture-model.ts'
import { architectureElementPath, draftRecordPath } from './architecture-path.ts'
import { loadArchitecture } from './architecture-reader.ts'
import { GromaFileSystem } from './groma-filesystem.ts'
import {
  renderArchitectureDocument,
  renderDraftDocument,
  writeDocument,
} from './markdown-emitter.ts'
import { addGroup } from './group.ts'
import type { ArchitectureElement } from './types.ts'
import type { StructuralResult } from './curate.ts'
import { requireText } from './naming.ts'
import { addRelation } from './relation.ts'
import { addFlow } from './flow-authoring.ts'

export interface AddInput {
  thing: string
  /** The name of a person, an external or a draft, or the source id of a relation. */
  name: string
  /** With thing relation: the target id. */
  relation?: string
  /** With thing group: the member ids. */
  members?: string[]
  overview?: string
  description?: string
  technology?: string
  steps?: string
  /** Internal system containing a declared existing runtime. */
  parent?: string
}

type DeclaredThing = 'actor' | 'external' | 'draft' | 'container'

/** Proposed architecture uses the draft command and its required parent. */
const draftKinds: Record<string, string> = {
  system: '',
  component: ' --parent <container-id>',
}

function requireThing(thing: string, name: string): DeclaredThing {
  const parentHint = draftKinds[thing]
  if (parentHint !== undefined) {
    throw new Error(
      `To draft a ${thing}, run: groma draft ${thing} "${name}"${parentHint}`,
    )
  }
  if (thing === 'actor' || thing === 'external' || thing === 'draft' || thing === 'container') return thing
  throw new Error('thing must be actor, external, container or draft')
}

function renderThing(thing: DeclaredThing, id: string, input: AddInput, overview: string): string {
  if (thing === 'draft') return renderDraftDocument({ id, title: input.name, outcome: overview })
  return renderArchitectureDocument({
    id,
    kind: thing === 'actor' ? 'actor' : thing === 'container' ? 'container' : 'system',
    parent: input.parent,
    technology: input.technology,
    name: input.name,
    description: input.description,
    overview,
    status: 'stable',
  })
}

/** Existing runtime boundaries are declared under their internal software system. */
function declaredParent(thing: DeclaredThing, input: AddInput, elements: ArchitectureElement[]): ArchitectureElement | undefined {
  if (thing !== 'container') {
    if (input.parent !== undefined) throw new Error('--parent is only valid for a container')
    return undefined
  }
  if (input.parent === undefined) throw new Error('--parent is required for a container')
  const parent = elements.find(element => element.id === input.parent)
  if (parent?.kind !== 'system' || parent.external) throw new Error('a container requires an internal system parent')
  return parent
}

/** Declare known architecture independently of scanner evidence; proposed software still uses draft. */
export function addThing(repositoryRoot: string, input: AddInput & { thing: DeclaredThing | 'relation' | 'flow' }): Promise<string>
export function addThing(repositoryRoot: string, input: AddInput): Promise<string | StructuralResult>
export async function addThing(repositoryRoot: string, input: AddInput): Promise<string | StructuralResult> {
  if (input.thing === 'flow') return addFlow(repositoryRoot, requireText(input.name, 'name'), input)
  if (input.thing === 'relation') {
    return addRelation(repositoryRoot, {
      source: input.name,
      target: requireText(input.relation, 'target'),
      description: input.description,
      technology: input.technology,
    })
  }
  if (input.thing === 'group') return addGroup(repositoryRoot, { name: input.name, members: input.members ?? [] })
  const name = requireText(input.name, 'name')
  const thing = requireThing(input.thing, name)
  const overview = requireText(input.overview, '--overview')
  if (input.technology !== undefined && thing !== 'external' && thing !== 'container') {
    throw new Error('--technology is only valid for an external or container')
  }
  const filesystem = GromaFileSystem.open(repositoryRoot)
  const records = await loadArchitecture(repositoryRoot)
  const model = buildArchitectureModel(records.documents)
  const parent = declaredParent(thing, input, model.elements)
  const id = freeId(records, model, name)
  const root = filesystem.sourceFilename()
  const destination = thing === 'draft'
    ? draftRecordPath(root, id)
    : architectureElementPath({ root, kind: thing === 'actor' ? 'actor' : thing === 'container' ? 'container' : 'system',
      id, external: thing === 'external', parentSourceFilename: parent?.sourceFilename })
  if (filesystem.exists(filesystem.relative(destination))) {
    throw new Error(`architecture document already exists at ${destination}`)
  }
  await writeDocument(repositoryRoot, destination, renderThing(thing, id, input, overview))
  return id
}
