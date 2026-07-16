# @tuler/node-cartesi-machine

## 0.2.0-alpha.3

### Minor Changes

- f91ed1f: Upgrade the machine-emulator to v0.20.0. The C API surface changed with the emulator's address-range/hash-tree refactor, and the binding follows it:

  - `create()`/`load()`/`store()` gain the new emulator parameters: `create(config, runtimeConfig?, dir?)` (backing store directory), `load(dir, runtimeConfig?, sharing?)` and `store(dir, sharing?)` with the new `SharingMode` enum (defaults match the upstream Lua binding: load `None`, store `All`).
  - `replaceMemoryRange(rangeConfig)` now takes a `MemoryRangeConfig` object; `getMemoryRanges()` is now `getAddressRanges()`; `verifyMerkleTree()` is now `verifyHashTree()`; `verifyDirtyPageMaps()` was removed upstream (see `getHashTreeStats()`); the instance `verifyStep()` was removed upstream (use the module-level `verifyStep()`); `getProof()` accepts an optional `log2RootSize`.
  - New APIs: `getVersion()`, `writeWord()`, `getNodeHash()`, `cloneStored()`, `removeStored()`, `getHashTreeStats()`.
  - `UarchBreakReason` values changed order upstream (`CycleOverflow` added before `Failed`); `BreakReason` gains `ConsoleOutput`/`ConsoleInput`.
  - Machine configs follow the new schema: `image_filename`/`shared` are replaced by `backing_store` objects, processor registers move under `processor.registers`, `tlb` is replaced by `pmas`, and the runtime config gains `console`/`no_reserve` (dropping `htif`/`skip_root_hash_*`).
  - Building from source now requires a C++23 compiler (gcc 13+ / clang 16+).

- 053e2f5: Link the addon against the static libraries of the official machine-emulator distribution instead of compiling libcartesi from a vendored submodule. Source builds now require an installed emulator (the `machine-emulator` `.deb` on Debian/Ubuntu, `brew install cartesi-machine-emulator` on macOS; override locations with `CARTESI_INC`/`CARTESI_LIB`) instead of Boost headers and a C++23 compiler — and the consensus-relevant bits are exactly the official release binaries'. The machine-emulator submodule and the committed generated files are gone, keeping the binding independent of the emulator's build system. libslirp symbols referenced by the official library are stubbed out by default (no runtime dependency; virtio net-user fails at runtime) — build with `CARTESI_SLIRP=yes` to link the real library. Prebuilt platform packages bundle the distribution's `cartesi-jsonrpc-machine` server, so nothing changes for prebuild users.
- d9164b6: Replace the koffi FFI binding with a native N-API addon compiled through node-gyp from a `machine-emulator` git submodule (pinned at v0.19.0). The package no longer requires a system-wide emulator installation: libcartesi and the JSON-RPC client are compiled into the addon, and the `cartesi-jsonrpc-machine` server executable is built alongside it and used automatically by `spawn()` (override with `CARTESI_JSONRPC_MACHINE`). Building from source requires a C++20 compiler and Boost headers. Also fixes the `MAX_MCYCLE` constant to be `UINT64_MAX` (previously a 72-bit value that only worked through implicit truncation).
- 29425fd: Ship prebuilt binaries as per-platform packages (`@deroll/cm-{linux,darwin}-{x64,arm64}`), installed via `optionalDependencies` so consumers download only their platform's binaries and never need a C++ toolchain. Each platform package carries both the N-API addon and the `cartesi-jsonrpc-machine` server executable, so `spawn()` keeps working out of the box. Source compilation remains as the fallback for unsupported platforms.

## 0.2.0-alpha.2

### Minor Changes

- 966dccd: Upgrade koffi from 2.x to 3.x. koffi 3 ships its native engine as platform-specific subpackages (`@koromix/koffi-<platform>`) pulled in via optionalDependencies, and represents pointers as BigInt. cm's FFI usage — `koffi.load`, opaque types, C-prototype function declarations and `_Out_` parameters — is unchanged, so there is no change to cm's public API.

### Patch Changes

- d97d160: Align the TypeScript configuration with the monorepo: extend `@deroll/tsconfig/base.json` (NodeNext, ES2022, strict), add `.js` extensions to relative imports, and upgrade to TypeScript 6. Internal tooling change — the public API is unchanged.

## 0.2.0-alpha.1

### Patch Changes

- b0739c1: remove old @tuler references

## 0.2.0-alpha.0

### Minor Changes

- df387f6: Add `@deroll/cm` — Cartesi Machine Node.js bindings (migrated from `@tuler/node-cartesi-machine`). Loads `libcartesi` at runtime via koffi FFI; no native build step.

## 0.7.0

### Minor Changes

- 8d1fc4e: Rollups API for local machines (test scenario)

## 0.6.0

### Minor Changes

- e6fe06e: Rollups API
- 7848203: allow setCleanupCall chaining

### Patch Changes

- 861df4f: Fixing stdout of remote machines

## 0.5.0

### Minor Changes

- cc508be: Usage of CmioYieldReason enum (number) instead of number or bigint

## 0.4.1

### Patch Changes

- 068b5bc: Fix receiveCmioRequest

## 0.4.0

### Minor Changes

- f9ab696: Changed: The `CmioYieldReason` enum has been replaced with a `const` object to allow the use of `bigint` in all values. Update any code referencing `CmioYieldReason` to use the new object and expect `bigint` values for these fields.
- b270e42: Changed: The `PmaConstant` enum has been replaced with a `const` object to allow the use of `bigint` for address values (`CmioRxBufferStart`, `CmioTxBufferStart`, and `RamStart`). Update any code referencing `PmaConstant` to use the new object and expect `bigint` values for these fields.
- cdd1671: Improved method chaining for `RemoteCartesiMachine`: methods like `load`, `create`, `cloneEmpty`, and `store` now all return a `RemoteCartesiMachine` instance, enabling fluent chaining of these calls.

## 0.3.0

### Minor Changes

- 5403f30: remove the exposed delete method, and use a finalizer to automatically call cm_delete on garbage collected machines
- 1632cd7: change default packaging to ESM (still providing CommonJS compatibility)

## 0.2.0

### Minor Changes

- 797f2b2: The `spawn` function's `address` parameter is now optional and defaults to `"127.0.0.1:0"`. This makes it easier to spawn a remote machine server with sensible defaults.

  No breaking changes.

  **New Behavior:**

  - `spawn()` - Uses default address `"127.0.0.1:0"`
  - `spawn("127.0.0.1:5000")` - Uses specified address
  - `spawn(undefined, 5000)` - Uses default address with custom timeout

- 6683739: Add `MAX_MCYCLE` constant (0xffffffffffffffffffn) for use as the default maximum cycle count. The `mcycleEnd` parameter of `run` is now optional and defaults to `MAX_MCYCLE`.

## 0.1.0

### Minor Changes

- 06cfe86: binding for emulator 0.19.0 using FFI

## 0.0.8

### Patch Changes

- 251bb48: fix typings

## 0.0.7

### Patch Changes

- 89ad28d: fix typescript packaging

## 0.0.6

### Patch Changes

- 8c431e0: fix release version number
- 5918c10: fix npm package contents

## 0.0.5

### Patch Changes

- c508985: fix: add header files to npm package

## 0.0.4

### Patch Changes

- 915b22e: fix publishing

## 0.0.3

### Patch Changes

- 142914a: remove compilation warnings

## 0.0.2

### Patch Changes

- 4040226: release automation
- 28f9950: pre-compiled binaries
