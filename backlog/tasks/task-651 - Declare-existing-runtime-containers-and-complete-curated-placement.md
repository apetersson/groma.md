---
id: TASK-651
title: Declare existing runtime containers and complete curated placement
status: Done
assignee:
  - '@codex'
created_date: '2026-11-11 19:13'
updated_date: '2026-11-11 19:22'
labels: []
dependencies: []
references:
  - src/add.ts
  - src/curate.ts
  - src/write-commands.ts
  - docs/component-markdown.md
modified_files:
  - src/add.ts
  - src/write-commands.ts
  - src/curate.ts
  - src/core.ts
  - src/viewers/web/authoring.ts
  - test-bun/container-declaration.test.ts
  - docs/agent-instructions/structure.md
  - docs/component-markdown.md
  - src/instructions.ts
ordinal: 707000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A curator who knows runtime boundaries cannot create stable containers when a scanner has no execution-entry evidence. Kiss V2 remains under Unidentified container, and described components with relationships or flows cannot be placed afterward.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The CLI can declare an existing stable container under an internal system without scanner Code, while rejecting invalid parents.
- [x] #2 A curator can complete system-level component placement into a same-system container without losing descriptions, source ownership, groups, relationships or flows; rescans preserve the result.
- [x] #3 The Kiss V2 map displays the source-supported runtime boundaries without an Unidentified container, with unchanged application source.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Acceptance criteria have objective verification evidence.
- [x] #2 Relevant checks pass and changes remain task-scoped.
- [x] #3 Public contracts or documentation are updated when behavior changes.
- [x] #4 Implementation Plan reflects the final approach; correction history and verification are recorded in Implementation Notes.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add existing-container declaration to the shared add writer and CLI, validating an internal system parent; retain draft for proposed software. Standard stable C4 Container records carry parent and meaning in existing OKF fields, so ordinary Markdown readers see the boundary without new metadata.
2. Complete only missing component placement (system to a container of that system) with authored meaning, Code, groups and links preserved. Reuse existing link rebasing; retain restrictions for other structural changes. Reflect eligibility in the map model.
3. Add concurrent generic fixture tests for declaration validation and CLI creation, and for described placement with actor links and flows preserved across two rescans. Existing entrypoint tests cover automatic placement; manual declarations currently have no coverage. Wrong results are draft/rejected boundaries, lost prose/links or duplicate owners on rescan.
4. Use CLI curation to place the Kiss source snapshot under verified runtime boundaries, refresh overviews and validate no unidentified placement, source hashes unchanged, links/flows stable on two scans; inspect rendered map and export.
5. Run bun run check and required cold simplicity/full-context reviews. Commit and push task-scoped code on its own branch.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented stable runtime declaration in the existing add writer/CLI and same-system placement completion through existing link rebasing. Focused container-declaration, system-curation and entrypoint tests: 11 pass, 147 assertions; TypeScript passes. Cold simplicity review found no blockers and confirmed ordinary OKF/C4 records, existing ownership and validation are reused. Its suggested predicate consolidation is non-blocking and not required for this small flow.

Kiss curation now declares 12 runtime application containers and places all 24 components / 38 source files, including explicit current and historical profiles. NFT delegatecall code stays in the proxy storage context; owned Safes are separate role instances of the account application. Helper addresses and mixed-source ownership are stated in overviews, without pretending every source file is a runtime. Required check: lint, types and 26 Node tests pass; Bun 924 pass / 64 skip / 25 previously reproduced Java-toolchain and registry-fixture failures, with the two new declaration/placement tests passing. Own specification and quality review: shared writer validates parents, narrow placement completion reuses loadability/link validation and retains existing non-completion restrictions; no new lint warnings.

Kiss verification passed: 12 stable containers, zero components with unidentified placement, 24 components owning all 38 selected source files exactly once, 59 relationships and all six flows retained. Two actual CLI scans created zero elements and preserved the complete curated model; original Kiss source hashes and snapshot source bytes are unchanged. Browser reload displays 1 system / 12 containers / 24 components with labelled runtime boundaries, actors west and external systems east; Unidentified container is absent.

Full-context complexity review: ALL GOOD, no blocking findings. Static map and authored Markdown exported to the chat artifact folder as kiss-v2-runtime-map and kiss-v2-runtime-records; verification report saved as kiss-v2-runtime-verification.json. No production scanner inference, new architecture metadata or Kiss application changes were introduced.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added stable existing-container declaration and safe completion of unknown component placement through the shared CLI/writer and existing link rebasing. The Kiss map now has 12 containers with no unidentified components, preserving 38 owned files, 59 relationships and six flows across two rescans. Original source hashes are unchanged. Focused tests and reviews pass; full checks retain the same 25 known Java/registry baseline failures.
<!-- SECTION:FINAL_SUMMARY:END -->
