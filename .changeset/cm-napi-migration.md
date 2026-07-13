---
"@deroll/cm": minor
---

Replace the koffi FFI binding with a native N-API addon compiled through node-gyp from a `machine-emulator` git submodule (pinned at v0.19.0). The package no longer requires a system-wide emulator installation: libcartesi and the JSON-RPC client are compiled into the addon, and the `cartesi-jsonrpc-machine` server executable is built alongside it and used automatically by `spawn()` (override with `CARTESI_JSONRPC_MACHINE`). Building from source requires a C++20 compiler and Boost headers. Also fixes the `MAX_MCYCLE` constant to be `UINT64_MAX` (previously a 72-bit value that only worked through implicit truncation).
