---
"@deroll/explorer": minor
"@deroll/mock-server": patch
"@deroll/json-decoder": patch
---

Explorer now talks to the node through the `@cartesi/rpc` typed client interface instead of a hand-rolled integration, adopting its wire types throughout (the transport is a local shim around the same json-rpc-2.0 client until an upstream `createClient` bug — transport failures never settle the request — is fixed) — including name-based decoded output types ("Notice"/"Voucher"/"DelegateCallVoucher", with selector fallback for older nodes). Decoder tags render as colored pills in payload tables and detail views, and withdrawal `account`/`output` bytes are now decodable via a decoder's `withdrawalAccount`/`withdrawalOutput` methods (per-kind decoder methods are the new contract; the old single-`decode()` shape is no longer loaded). Portal deposit inputs are decoded by the explorer itself — summary, tags and structured deposit, with or without a registered decoder — and a decoder's optional `deposit` method decorates that native view with a decode of the deposit's app-specific attachment. The mock server matches the real node's output shapes and serves withdrawals; the example JSON decoder demonstrates tags.
