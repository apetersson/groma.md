# Solidity scanner

Experimental syntax-only Solidity scanner using bundled `@solidity-parser/parser` 0.20.2.
It reads selected `.sol` files without solc, Foundry, Hardhat, project dependencies,
builds, network access or source execution. Missing imports do not block scanning.
Parser errors fail the observation with a file and line diagnostic.

## Install from this checkout

```sh
bun plugins/scanners/solidity/build.ts /tmp/groma-scanner-solidity
# In the project initialized with Groma:
groma plugin add /tmp/groma-scanner-solidity
groma scan
```

The package is not published. A local source package also works from a development
checkout with its workspace dependencies installed. Package staging includes the
parser and its license; consumers need no installation scripts.

## Evidence and Code outline

Every selected source file belongs to one repository analysis root. This is source
membership, not a deployment or C4 container. Contracts (including abstract ones),
interfaces and libraries are type declarations; their directly declared functions,
constructors, fallback and receive handlers are members. Top-level functions, structs
and enums are outlined too. Overloads stay separate. Nested structs/enums, fields,
getters, events, errors, modifiers and user-defined value type aliases are omitted.

Code symbols use `Contract.member` and bare top-level names. Selecting a type marks
only that type as an entry. Name lines come from parser tokens, including declarations
whose names occur on another line. `external` and `public` members map to `public`,
`internal` contract members to `protected` (the declaring type and its subtypes),
and `private` members to `private`. Free functions and non-private library functions
map to `public`: dependent source can import and use them. This describes source
accessibility, not ABI exposure. Types are `public`. See Solidity’s
[free function import example](https://www.soliditylang.org/blog/2020/09/02/solidity-0.7.1-release-announcement/)
and [library rules](https://docs.soliditylang.org/en/latest/contracts.html#libraries).
Legacy unspecified member visibility follows Solidity's public default.

This scanner does not resolve imports, inheritance, calls, deployments, proxy targets,
modifiers, assembly or build configuration. It emits no operations, invocations,
execution entries or inferred relationships. Inherited methods and compiler-generated
getters are not outlined. Syntax support follows the bundled parser, not a solc
version guarantee; semantic compilation errors may still parse.

## Selection

Defaults include `**/*.sol`, excluding Solidity test/script, dependency and build
folders (`test/`, `tests/`, `script/`, `lib/`, `node_modules/`, `out/`, `cache/`,
`artifacts/`, `typechain-types/`). Edit the configured include/exclude lists when
project layout differs. Listing returns selected `.sol` candidates without analysis;
readiness parses the same selected sources as scan. No unselected files are read.

See [qualification results](validation.md).
