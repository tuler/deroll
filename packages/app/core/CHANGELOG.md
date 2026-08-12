# @deroll/core

## 2.0.0-alpha.5

### Minor Changes

- ab112e9: Use `@cartesi/rollup` instead of the in-repo `@deroll/cmio` binding.
  
  The libcmt binding is now published by Cartesi from [`cartesi/rollups-ts`](https://github.com/cartesi/rollups-ts) as `@cartesi/rollup`, so the `@deroll/cmio` and `@deroll/cm` packages have been removed from this repo in favor of `@cartesi/rollup` and `@cartesi/machine`.
  
  **Breaking:** output indices are now `bigint`. `@cartesi/rollup` reports them as the `uint64` libcmt returns, and the `App` interface follows, so `createNotice`, `createVoucher` and `createDelegateCallVoucher` resolve to a `bigint` instead of a `number` (as do the `index` fields of `NoticeResponse` and `VoucherResponse`). Code that only awaits these calls is unaffected; code that stores or compares the returned index needs a `bigint` (`0n`, not `0`).
  
  - `npm init @deroll/app` scaffolds `@cartesi/rollup` as the binding package: it is the direct dependency in the generated `package.json`, the esbuild `external`, and what the generated Dockerfile stages next to the bundle.
  - Fixed host mode (`CMT_INPUTS`) exiting with an unhandled `RollupError` on Linux once the mock inputs were exhausted. The graceful exit tested for errno `-96`, which is `ENODATA` on macOS only; it now reads the platform's `ENODATA` from `node:os`.

### Patch Changes

- 40cfed6: dependencies

## 2.0.0-alpha.4

### Patch Changes

- 7970c89: types aligned to native (instead of http)

## 2.0.0-alpha.3

### Patch Changes

- 9498721: Bump dependencies

## 2.0.0-alpha.2

### Patch Changes

- 7a6ed6c: fix packaging

## 2.0.0-alpha.1

### Patch Changes

- 40cfed6: bump dependencies
- f8758ad: add delegate call voucher

## 2.0.0-alpha.0

### Major Changes

- f0ff7dc: rollups v2

## 1.0.0

### Major Changes

- cdcb4fd: bump dependencies

## 0.2.1

### Patch Changes

- 09c8d46: Moving broadcastAdvanceRequests to AppOptions type

## 0.2.0

### Minor Changes

- b034d0c: bump viem
- b034d0c: bump openapi-typescript

## 0.1.1

### Patch Changes

- a85702c: bump dependencies

## 0.1.0

### Minor Changes

- 488d46b: separation of @deroll/app into @deroll/app and @deroll/core
