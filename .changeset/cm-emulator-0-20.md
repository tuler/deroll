---
"@deroll/cm": minor
---

Upgrade the binding from machine-emulator 0.19.0 to 0.20.0. This is a breaking change that follows the upstream C API:

- Machine config: `image_filename`/`shared` replaced by the `backing_store` object (`data_filename`, `dht_filename`, `dpt_filename`, `shared`, `create`, `truncate`); processor registers nested under `processor.registers`; `tlb`, `clint`, `plic` and `htif` sections removed; new `pmas` and `hash_tree` sections.
- Runtime config: `htif.no_console_putchar` replaced by the `console` config with full I/O redirection; `concurrency.update_merkle_tree` renamed to `update_hash_tree`; `skip_root_hash_check`/`skip_root_hash_store` removed; new `no_reserve`.
- `create()` accepts an optional `dir` for on-disk machines; `load()` and `store()` accept an optional `SharingMode` (`None`, `Config`, `All`).
- `getMemoryRanges()` renamed to `getAddressRanges()`; `replaceMemoryRange()` now takes a `MemoryRangeConfig` object; `getProof()` accepts an optional `log2RootSize`.
- `verifyMerkleTree()` renamed to `verifyHashTree()`; `verifyDirtyPageMaps()` removed in favor of `getHashTreeStats()`.
- `Constant.TreeLog2*` renamed to `Constant.HashTreeLog2*`; `PmaConstant` renamed to `ArConstant` with new shadow/PMAs entries.
- New: `getVersion()`, `writeWord()`, `getNodeHash()`, `cloneStored()`, `removeStored()`, `readConsoleOutput()`, `writeConsoleInput()`, `collectMcycleRootHashes()`, `collectUarchCycleRootHashes()`, `getHash()`, `getConcatHash()`, `MAX_UARCH_CYCLE`, `BreakReason.ConsoleOutput`/`ConsoleInput`, `UarchBreakReason.CycleOverflow`, `SharingMode` and `HashFunction` enums.
- Fixed `MAX_MCYCLE` to be `UINT64_MAX` (it previously overflowed 64 bits).
