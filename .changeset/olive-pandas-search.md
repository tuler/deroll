---
"@deroll/explorer": minor
"@deroll/mock-server": patch
"@deroll/json-decoder": patch
---

Explorer now talks to the node through `@cartesi/rpc` (typed JSON-RPC client) instead of a hand-rolled integration, adopting its wire types throughout — including name-based decoded output types ("Notice"/"Voucher"/"DelegateCallVoucher", with selector fallback for older nodes). Decoder tags render as colored pills in payload tables and detail views, and withdrawal `account`/`output` bytes are now decodable via the new `withdrawal-account`/`withdrawal-output` payload kinds. The mock server matches the real node's output shapes and serves withdrawals; the example JSON decoder demonstrates tags.
