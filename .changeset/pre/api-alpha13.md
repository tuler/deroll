---
"@deroll/decoder": minor
---

follow the rollups-node 2.0.0-alpha.13 JSON-RPC API: bump `@cartesi/client` to 2.0.0-alpha.38 and `@cartesi/codec` to 1.0.0-alpha.5 (new contract/portal addresses). The re-exported `Input` record replaces `outputsHash` with `txBufferDataBlock`, adds `exceptionData`, and its status drops the resource-limit values for OVERFLOW/UNEXPECTED_YIELD/INVALID_OUTPUTS_ROOT
