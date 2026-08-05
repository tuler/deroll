# @tuler/node-libcmt

## 0.2.0-alpha.3

### Minor Changes

- b09551a: Target libcmt 0.18.0 (machine-guest-tools `v0.18.0`). The binding's public JavaScript API is unchanged; the upgrade is internal and to the build:

  - `HTIF_YIELD_REASON_ADVANCE`/`HTIF_YIELD_REASON_INSPECT` were renamed to `HTIF_YIELD_REASON_ADVANCE_STATE`/`HTIF_YIELD_REASON_INSPECT_STATE` in libcmt; the addon's request dispatch in `finish()` follows the rename.
  - libcmt now bundles the `cmio` ioctl ABI (`include/libcmt/ioctl.h`) instead of including `<linux/cartesi/cmio.h>`, so cross-building the linux-riscv64 prebuild no longer needs the Cartesi Linux headers. The `linux-libc-dev-riscv64-cross` install was dropped from CI, the release workflow and `test/machine/Dockerfile.prebuild`.
  - The mock IO driver writes the outputs Merkle root to `<input>.outputs_merkle_root<ext>` (was `<input>.outputs_root_hash<ext>`), matching the terminology used by rollups-contracts and the machine emulator. Only affects test harnesses that read that file directly.
  - The riscv64 end-to-end machine test now boots the v0.21.0 Cartesi kernel (6.5.13-ctsi-2) with machine-guest-tools `v0.18.0`, matching what the submodule targets.
  - `create-app`'s generated Dockerfile installs machine-guest-tools 0.18.0.

## 0.2.0-alpha.2

### Patch Changes

- 692adda: bump node-gyp

## 0.2.0-alpha.1

### Patch Changes

- b0739c1: remove old @tuler references

## 0.2.0-alpha.0

### Minor Changes

- bff06a2: Add `@deroll/cmio` — Node.js bindings for libcmt (migrated from `@tuler/node-libcmt`). The libcmt C source is tracked as a git submodule (`machine-guest-tools`) and compiled into a native addon (host builds use the mock-IO driver). `@deroll/app` and the `create-app` scaffolding now depend on the in-repo `@deroll/cmio` instead of the external `@tuler/node-libcmt`.

## 0.1.4

### Patch Changes

- 6b33918: Export a `RollupError` class for failures raised by the libcmt binding. Failed
  libcmt calls now throw a `RollupError` (instead of a plain `Error`) carrying the
  negative `errno` and the failed call name in `syscall`. Argument validation
  still throws `TypeError`/`RangeError`.

## 0.1.3

### Patch Changes

- fc44942: using libcmt 0.17.2

## 0.1.2

### Patch Changes

- 9edb5cc: Export named `Voucher` and `DelegateCallVoucher` types for the `emitVoucher` and `emitDelegateCallVoucher` arguments, so consumers can import and reference them directly instead of relying on inline anonymous object types.

## 0.1.1

### Patch Changes

- ef6cd57: Type hex strings as 0x-template literals for viem compatibility
