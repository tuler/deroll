---
"@deroll/create-app": patch
"@deroll/decoder": patch
"@deroll/genext2fs": patch
"@deroll/wallet": patch
---

bump dependencies: `@cartesi/rollup` 1.0.0-alpha.3, `@cartesi/codec` 1.0.0-alpha.5 and viem 2.57. The wallet now recognizes deposits from the portal addresses of the new rollups contracts (through `@cartesi/codec`'s `decodeDeposit`). Applications scaffolded by `@deroll/create-app` build on Node.js 24.20.0
