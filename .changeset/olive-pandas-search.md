---
"@deroll/explorer": minor
"@deroll/mock-server": patch
"@deroll/json-decoder": patch
---

Explorer now talks to the node through `@cartesi/wagmi`'s hooks (≥ 2.0.0-alpha.37, whose query keys include the server URL so switching nodes never serves another node's cache), built on `@cartesi/viem`'s typed client — the hand-rolled JSON-RPC integration is gone. Records are `@cartesi/viem`'s transformed shapes (camelCase, `bigint`, `Date`); the Raw JSON views show that transformed object rather than the wire bytes. Decoder tags render as colored pills in payload tables and detail views, and withdrawal `account`/`output` bytes are now decodable via a decoder's `withdrawalAccount`/`withdrawalOutput` methods (per-kind decoder methods are the new contract; the old single-`decode()` shape is no longer loaded). Portal deposit inputs are decoded by the explorer itself — summary, tags and structured deposit, with or without a registered decoder — and a decoder's optional `deposit` method decorates that native view with a decode of the deposit's app-specific attachment. The explorer also blesses viem for decoders: it is pinned in the import map and kept external on the esm.sh route, so decoder authors import it without bundling it. The mock server matches the real node's output shapes and serves withdrawals; the example JSON decoder demonstrates tags.
