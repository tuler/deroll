# @deroll/explorer

## 0.2.0-alpha.4

### Minor Changes

- f23be12: Explorer now talks to the node through `@cartesi/wagmi`'s hooks (≥ 2.0.0-alpha.37, whose query keys include the server URL so switching nodes never serves another node's cache), built on `@cartesi/viem`'s typed client — the hand-rolled JSON-RPC integration is gone. Records are `@cartesi/viem`'s transformed shapes (camelCase, `bigint`, `Date`); the Raw JSON views show that transformed object rather than the wire bytes. Decoder tags render as colored pills in payload tables and detail views, and withdrawal `account`/`output` bytes are now decodable via a decoder's `withdrawalAccount`/`withdrawalOutput` methods (per-kind decoder methods are the new contract; the old single-`decode()` shape is no longer loaded). Portal deposit inputs are decoded by the explorer itself via `@cartesi/codec` (`decodeDeposit` — the protocol's own encode/decode library, replacing the hand-rolled portal address table and payload parsing) — summary, tags and structured deposit, with or without a registered decoder — and a decoder's optional `deposit` method decorates that native view with a decode of the deposit's app-specific attachment. The explorer also blesses viem and `@cartesi/codec` for decoders: both are pinned in the import map and kept external on the esm.sh route, so decoder authors import them without bundling them. The mock server matches the real node's output shapes and serves withdrawals; the example JSON decoder demonstrates tags.

### Patch Changes

- Updated dependencies [f23be12]
  - @deroll/decoder@0.2.0-alpha.3

## 0.2.0-alpha.3

### Minor Changes

- 35c8b72: follow the rollups-node 2.0.0-alpha.12 JSON-RPC API: applications now report `enabled` + `status` (OK/FAILED/DIVERGED/CORRUPTED) instead of `state`, carry a withdrawal config, foreclosure lifecycle fields and three new sync checkpoints; epochs gain `staged_at_block` and the CLAIM_STAGED/CLAIM_FORECLOSED statuses; inputs gain REPORTS_LIMIT_EXCEEDED. Adds a Withdrawals tab (list + per-account detail) for post-foreclosure withdrawal events, and Withdrawal config / Foreclosure sections on the application overview
- 3377b7b: load payload decoders from GitHub gists — paste a gist page URL (the decoder file is found automatically, or picked via its `#file-…` anchor), a per-file Raw URL, or the `gist:id/file.ts` shorthand

### Patch Changes

- def3695: pin gist page URL registrations to the gist's current revision — the gists API lookup already made for the filename also carries the revision, so the esm.sh URL no longer floats at the gist's HEAD, where esm.sh's request-time resolution goes stale after a gist edit or fails intermittently (revision-pinned raw URLs never had this problem)
- d47f8ac: keep the `@deroll/decoder` import external for decoders registered as hand-pasted esm.sh URLs — without the flag esm.sh rewrote the kit import to an absolute npm URL the import map cannot remap, silently loading `@deroll/decoder@0.1.0` (npm's `latest`) instead of the pinned kit, so v3 portal deposits failed to decode
- 0fcb47d: point the `@deroll/decoder` import map at the kit's home in this monorepo, pinned to a commit — esm.sh intermittently fails to resolve floating branch refs, which broke every kit-using decoder
- 35c8b72: don't report a node as unreachable when it answers JSON-RPC but errors on `cartesi_getChainId` (e.g. running without an EVM reader) — the connection dot now also probes `cartesi_getNodeVersion` and treats any RPC-level reply as connected, omitting the chain id when unavailable

## 0.1.1-alpha.2

### Patch Changes

- Updated dependencies [2cfadb7]
  - @deroll/decoder@0.2.0-alpha.2

## 0.1.1-alpha.1

### Patch Changes

- Updated dependencies [b163ca2]
  - @deroll/decoder@0.2.0-alpha.1

## 0.1.1-alpha.0

### Patch Changes

- Updated dependencies [f3e42fe]
  - @deroll/decoder@0.2.0-alpha.0
