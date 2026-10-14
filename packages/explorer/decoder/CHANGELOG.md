# @deroll/decoder

## 0.2.0-alpha.5

### Minor Changes

- 76f9767: follow the rollups-node 2.0.0-alpha.13 JSON-RPC API: bump `@cartesi/client` to 2.0.0-alpha.38 and `@cartesi/codec` to 1.0.0-alpha.5 (new contract/portal addresses). The re-exported `Input` record replaces `outputsHash` with `txBufferDataBlock`, adds `exceptionData`, and its status drops the resource-limit values for OVERFLOW/UNEXPECTED_YIELD/INVALID_OUTPUTS_ROOT

### Patch Changes

- c1f731d: bump dependencies: `@cartesi/rollup` 1.0.0-alpha.3, `@cartesi/codec` 1.0.0-alpha.5 and viem 2.57. The wallet now recognizes deposits from the portal addresses of the new rollups contracts (through `@cartesi/codec`'s `decodeDeposit`). Applications scaffolded by `@deroll/create-app` build on Node.js 24.20.0
- 5f6ba6e: bump dependencies

## 0.2.0-alpha.4

### Patch Changes

- 40cfed6: dependencies

## 0.2.0-alpha.3

### Minor Changes

- f23be12: Redesign the decoder contract around the JSON-RPC API and richer results (breaking — the previous single-`decode()` contract is replaced):

  - The API record types (`Input`, `Output`, `Report`, `Withdrawal`, `Notice`, `Voucher`, `DelegateCallVoucher`) are now re-exported from `@cartesi/viem` — the typed toolkit for the node and the source of truth for what it serves — instead of being hand-duplicated. Decode methods receive the transformed records (camelCase fields, `bigint`, `Date`, e.g. `input.decodedData.payload`, `report.rawData`), and `Output["decodedData"]` is the properly discriminated `Notice | Voucher | DelegateCallVoucher` union. The dependency is type-only.
  - The contract is now **one optional method per application-defined raw-bytes field**, each receiving the full typed record plus a slim `{ application, chainId? }` context: `input(input)`, `output(output)`, `report(report)`, and the new `withdrawalAccount(withdrawal)` / `withdrawalOutput(withdrawal)` for the `Withdrawal.account` / `Withdrawal.output` bytes (defined by the app's `WithdrawalOutputBuilder`, opaque to the node). Each method has a named type (`InputDecoder`, `DepositDecoder`, `OutputDecoder`, `ReportDecoder`, `WithdrawalAccountDecoder`, `WithdrawalOutputDecoder`). An exported method is the capability signal — the explorer only calls what a decoder exports — which removes the old `context.kind` discrimination boilerplate and its catch-all mis-decode hazard.
  - **Portal deposits are no longer a decoder concern**: the explorer decodes them natively (they are protocol-defined), and the `input` method is never called for them. The only decoder-facing part of a deposit is its app-specific attachment, exposed through the optional `deposit(deposit, context)` method — it receives the already-decoded envelope as [`@cartesi/codec`](https://cartesi.github.io/rollups-ts/codec)'s `Deposit` union (discriminated by `type`, `bigint` amounts/ids, the NFT portals' `abi.encode(baseLayerData, execLayerData)` blobs split into plain fields, `"0x"` when absent) and decodes just those bytes; the explorer shows the result alongside the native deposit view. The kit re-exports `Deposit` and its variants from `@cartesi/codec` instead of hand-defining them — one more type that now has a protocol-level source of truth.
  - `DecodeResult` gains `tags` — colored tags/pills (`{ label, color?, title? }` with a fixed theme-aware color palette, or bare strings) rendered by the explorer next to the summary in tables and detail views.
  - The package is now **types-only** — just the contract: all protocol decoding (portal addresses, deposit decoding, deposit summaries/tags) moved into the explorer (built on `@cartesi/codec`), and the `ByteReader`/`formatUnits`/`toUtf8` byte helpers are gone in favor of blessed libraries — decoders import [viem](https://viem.sh) (byte/ABI work) and [`@cartesi/codec`](https://cartesi.github.io/rollups-ts/codec) (the protocol's on-chain formats) bare, without bundling them: the explorer serves both through its import map, pinned to the versions the explorer itself uses, and keeps the imports external when transpiling GitHub-hosted sources through esm.sh.

## 0.2.0-alpha.2

### Patch Changes

- 2cfadb7: fix addresses (lowercase)

## 0.2.0-alpha.1

### Patch Changes

- b163ca2: support for contracts v3 (alpha)

## 0.2.0-alpha.0

### Minor Changes

- f3e42fe: Add `@deroll/decoder` — the typed toolkit for writing Cartesi Node Explorer payload decoders (migrated from `@tuler/luke-decoder`). Part of bringing the explorer into the monorepo: the explorer site (`@deroll/explorer`) and its private companions (`@deroll/json-decoder`, `@deroll/mock-server`) come along too.
