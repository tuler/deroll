---
"@deroll/explorer": minor
"@deroll/mock-server": patch
"@deroll/json-decoder": patch
---

Explorer now talks to the node through the `@cartesi/rpc` typed client interface instead of a hand-rolled integration, adopting its wire types throughout (the transport is a local shim around the same json-rpc-2.0 client until an upstream `createClient` bug — transport failures never settle the request — is fixed) — including name-based decoded output types ("Notice"/"Voucher"/"DelegateCallVoucher", with selector fallback for older nodes). Decoder tags render as colored pills in payload tables and detail views, and withdrawal `account`/`output` bytes are now decodable via a decoder's `withdrawalAccount`/`withdrawalOutput` methods (per-kind decoder methods are the new version-2 contract; legacy version-1 `decode()` modules still load for input/output/report). The mock server matches the real node's output shapes and serves withdrawals; the example JSON decoder demonstrates tags.
