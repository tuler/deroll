# @tuler/node-libcmt

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
