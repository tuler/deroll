---
"@deroll/cm": minor
---

Ship prebuilt binaries as per-platform packages (`@deroll/cm-{linux,darwin}-{x64,arm64}`), installed via `optionalDependencies` so consumers download only their platform's binaries and never need a C++ toolchain. Each platform package carries both the N-API addon and the `cartesi-jsonrpc-machine` server executable, so `spawn()` keeps working out of the box. Source compilation remains as the fallback for unsupported platforms.
