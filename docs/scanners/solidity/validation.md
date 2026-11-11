# Solidity scanner qualification

Validated 2026-11-11 with Groma 0.7.8, scanner 0.1.0,
`@solidity-parser/parser` 0.20.2 and Bun 1.4.4 on macOS arm64.

## Source checkouts

| Source | Revision | Solidity files | Types | Functions/members | Companion inventory |
| --- | --- | ---: | ---: | ---: | --- |
| [Scaffold-ETH 2](https://github.com/scaffold-eth/scaffold-eth-2) | `87557d93c8c5c7c7c366002729f0fac8599f2fbb` | 1 | 1 | 4 | React 0.2.5: 42 files |
| [Scaffold-ETH](https://github.com/scaffold-eth/scaffold-eth) | `353eafb3c561c2d36304052acdd94d699ef7b2a9` | 1 | 1 | 4 | JavaScript 0.2.4: 65 files |

Types count top-level contracts, interfaces, libraries, structs and enums.
Function totals include constructors, receive/fallback handlers and free functions.

## Procedure and results

Built the self-contained scanner to `/tmp/groma-scanner-solidity`. Each run used
manifest-default selection, empty scanner settings and the default Git-ignore
policy. Companion packages were built from the same Groma checkout; no application
dependencies were installed and no application builds or source execution occurred.

For each project:

1. Ran readiness, scan and outline through the packaged plugin. Compared complete
   observations on repeat, including symbols, roots and diagnostics: identical.
2. Initialized a temporary Groma project (the public clones themselves were temporary)
   and installed the Solidity plugin with `groma plugin add /tmp/groma-scanner-solidity`.
   Both public projects enabled the companion scanner in that same `config.json`.
3. Ran core reconciliation twice and then the actual `groma scan` CLI. All succeeded.
   Serialized architecture was identical after rescan. Scaffold-ETH 2 owned 43
   physical files and Scaffold-ETH owned 66, each with exactly one owner.
   Repeat CLI scans created zero new elements. File ownership, IDs and relationships
   stayed stable. This is an uncurated first scan, not an approved C4 architecture.
4. Compared source hashes before/after: all Solidity inputs unchanged. Public clone
   tracked diffs contained only initialization's agent instruction changes, never
   application source changes.

## Interaction witnesses and limits

Scaffold-ETH's `packages/react-app/src/views/ExampleUI.jsx:41` invokes
`writeContracts.YourContract.setPurpose(newPurpose)`; the matching Solidity
method is in `packages/hardhat/contracts/YourContract.sol:18`. Both files were
inventoried. The JavaScript scanner cannot establish an external ethers receiver's
provider, and Solidity supplies no operation targets. No cross-language relationship
was invented from the matching method name.

Scaffold-ETH 2's `packages/nextjs/app/debug/_components/ContractUI.tsx:37` passes
runtime deployment data to the external `@scaffold-ui/debug-contracts` Contract
component. `packages/hardhat/contracts/YourContract.sol:45` declares `setGreeting`.
Both sources were inventoried, but ABI dispatch and runtime addresses cannot prove
a source-to-source invocation. The React scan reports two existing unsupported
callback bindings elsewhere in the explorer UI. Neither diagnostic blocks Solidity.

There are no HTTP witnesses in these contract interactions. On-chain/ABI calls,
inheritance, deployment ownership and proxy target resolution remain unsupported.
Public qualification covers two related template repositories, not arbitrary
Solidity dialects or framework coverage.

## Automated checks

`bun test test-bun/solidity-scanner.test.ts` passes three concurrent tests covering
selected inventory, atomic syntax failures, root membership, stable observations,
missing imports, discovery, outlines, overloaded member entries, name lines across
comments, visibility, and an offline built package with empty PATH and no project
dependencies. The comment-location fixture failed before its lookup fix and passed
afterward.

`bun run check` passes lint, TypeScript and the Node tests. The full Bun suite has
unrelated failures on this host: Java/JVM toolchain tests (no Java runtime), and
registry tests that contact the public registry rather than their fixture registry.
Representative failures were reproduced in a separate unmodified baseline checkout.
The final Bun suite result was 922 pass, 64 skip and 25 fail. The Solidity tests pass within the full suite.
