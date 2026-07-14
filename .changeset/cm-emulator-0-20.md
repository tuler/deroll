---
"@deroll/cm": minor
---

Upgrade the machine-emulator to v0.20.0. The C API surface changed with the emulator's address-range/hash-tree refactor, and the binding follows it:

- `create()`/`load()`/`store()` gain the new emulator parameters: `create(config, runtimeConfig?, dir?)` (backing store directory), `load(dir, runtimeConfig?, sharing?)` and `store(dir, sharing?)` with the new `SharingMode` enum (defaults match the upstream Lua binding: load `None`, store `All`).
- `replaceMemoryRange(rangeConfig)` now takes a `MemoryRangeConfig` object; `getMemoryRanges()` is now `getAddressRanges()`; `verifyMerkleTree()` is now `verifyHashTree()`; `verifyDirtyPageMaps()` was removed upstream (see `getHashTreeStats()`); the instance `verifyStep()` was removed upstream (use the module-level `verifyStep()`); `getProof()` accepts an optional `log2RootSize`.
- New APIs: `getVersion()`, `writeWord()`, `getNodeHash()`, `cloneStored()`, `removeStored()`, `getHashTreeStats()`.
- `UarchBreakReason` values changed order upstream (`CycleOverflow` added before `Failed`); `BreakReason` gains `ConsoleOutput`/`ConsoleInput`.
- Machine configs follow the new schema: `image_filename`/`shared` are replaced by `backing_store` objects, processor registers move under `processor.registers`, `tlb` is replaced by `pmas`, and the runtime config gains `console`/`no_reserve` (dropping `htif`/`skip_root_hash_*`).
- Building from source now requires a C++23 compiler (gcc 13+ / clang 16+).
