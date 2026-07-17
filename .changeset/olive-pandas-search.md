---
"@deroll/explorer": minor
"@deroll/mock-server": patch
"@deroll/json-decoder": patch
---

Explorer now talks to the node through `@cartesi/rpc`'s typed `createClient` instead of a hand-rolled integration, adopting its wire types throughout (requires `@cartesi/rpc` ≥ 2.0.0-alpha.23, which fixes transport failures never settling the request) — including name-based decoded output types ("Notice"/"Voucher"/"DelegateCallVoucher", with selector fallback for older nodes). Decoder tags render as colored pills in payload tables and detail views, and withdrawal `account`/`output` bytes are now decodable via a decoder's `withdrawalAccount`/`withdrawalOutput` methods (per-kind decoder methods are the new contract; the old single-`decode()` shape is no longer loaded). Portal deposit inputs are decoded by the explorer itself — summary, tags and structured deposit, with or without a registered decoder — and a decoder's optional `deposit` method decorates that native view with a decode of the deposit's app-specific attachment. The explorer also blesses viem for decoders: it is pinned in the import map and kept external on the esm.sh route, so decoder authors import it without bundling it. The mock server matches the real node's output shapes and serves withdrawals; the example JSON decoder demonstrates tags.
