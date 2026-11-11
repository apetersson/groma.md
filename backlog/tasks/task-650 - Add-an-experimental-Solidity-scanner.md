---
id: TASK-650
title: Add an experimental Solidity scanner
status: Done
assignee:
  - '@codex'
created_date: '2026-11-11 11:06'
updated_date: '2026-11-11 18:56'
labels: []
dependencies: []
references:
  - docs/scanners/creating-a-plugin.md
  - packages/scanner/src/index.ts
  - src/scanner/modules/official-catalog.ts
modified_files:
  - plugins/scanners/solidity/package.json
  - bun.lock
  - plugins/scanners/solidity/src/index.ts
  - plugins/scanners/solidity/build.ts
  - src/scanner/modules/official-catalog.ts
  - scripts/scanner-release.ts
  - docs/scanners/solidity/index.md
  - docs/scanners/solidity/validation.md
  - README.md
  - test/fixtures/solidity-source/Declarations.sol
  - test-bun/solidity-scanner.test.ts
ordinal: 706000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Solidity projects currently have no source inventory or Code outline in Groma. Supply a self-contained scanner following the scanner authoring guide, without installing or running application dependencies.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A packaged Solidity plugin can be installed and scans selected .sol files from a fresh checkout with stable source inventory and roots.
- [x] #2 Code outlines list contracts, interfaces, libraries and top-level declarations with function members, visibility and source locations.
- [x] #3 Discovery, source listing, readiness, documentation, focused behavior tests and public repository qualification are supplied; unsupported inference is explicit.
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
1. Add a syntax-only Solidity plugin using a bundled parser; inventory selected sources in a repository analysis root and expose named declarations and function outlines. No inferred containers, deployments or calls. OKF remains ordinary core-owned Markdown; Solidity types are source symbols, not new C4 elements.
2. Integrate discovery and package staging; document installation and extraction limits.
3. Add focused concurrent fixture tests: inventory stability and membership, outline kinds/visibility/locations/entry matching, invalid-source failure, and offline packaged use. Existing scanner tests do not exercise Solidity syntax.
4. Qualify the packaged scanner on public source checkouts and mixed-language scans; preserve application files.
5. Run required repository checks, simplicity and full-context reviews, and finalize on the task branch.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Packaged qualification passed on two public Solidity/frontend template repositories, with stable observations, unique ownership and unchanged application sources. Readiness, plugin installation, CLI scans and repeated core scans passed. See docs/scanners/solidity/validation.md.

Both required reviews passed after fixing name locations across comments and source-accessibility mappings for free/library functions. Existing fixture assertions failed before each correction and passed afterward.

Final required check: lint/typecheck and 26 Node tests pass; Bun 922 pass, 64 skip, 25 unrelated Java-toolchain and fixture-registry failures. Representative failures reproduced in an unmodified baseline checkout. All Solidity tests pass.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added an experimental self-contained Solidity scanner with inventory, declaration outlines, readiness, source listing, discovery and release packaging. Qualified on two public mixed frontend/contract checkouts. Focused tests and both required reviews pass. Full repository check retains reproduced baseline Java-toolchain and registry-fixture failures; syntax-only extraction omits call and deployment inference.
<!-- SECTION:FINAL_SUMMARY:END -->
