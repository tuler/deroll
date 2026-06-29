# @tuler/node-cartesi-machine

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
