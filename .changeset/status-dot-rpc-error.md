---
"@deroll/explorer": patch
---

don't report a node as unreachable when it answers JSON-RPC but errors on `cartesi_getChainId` (e.g. running without an EVM reader) — the connection dot now also probes `cartesi_getNodeVersion` and treats any RPC-level reply as connected, omitting the chain id when unavailable
