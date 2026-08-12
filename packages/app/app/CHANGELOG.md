# @deroll/app

## 2.0.0-alpha.12

### Minor Changes

- ab112e9: Use `@cartesi/rollup` instead of the in-repo `@deroll/cmio` binding.
  
  The libcmt binding is now published by Cartesi from [`cartesi/rollups-ts`](https://github.com/cartesi/rollups-ts) as `@cartesi/rollup`, so the `@deroll/cmio` and `@deroll/cm` packages have been removed from this repo in favor of `@cartesi/rollup` and `@cartesi/machine`.
  
  **Breaking:** output indices are now `bigint`. `@cartesi/rollup` reports them as the `uint64` libcmt returns, and the `App` interface follows, so `createNotice`, `createVoucher` and `createDelegateCallVoucher` resolve to a `bigint` instead of a `number` (as do the `index` fields of `NoticeResponse` and `VoucherResponse`). Code that only awaits these calls is unaffected; code that stores or compares the returned index needs a `bigint` (`0n`, not `0`).
  
  - `npm init @deroll/app` scaffolds `@cartesi/rollup` as the binding package: it is the direct dependency in the generated `package.json`, the esbuild `external`, and what the generated Dockerfile stages next to the bundle.
  - Fixed host mode (`CMT_INPUTS`) exiting with an unhandled `RollupError` on Linux once the mock inputs were exhausted. The graceful exit tested for errno `-96`, which is `ENODATA` on macOS only; it now reads the platform's `ENODATA` from `node:os`.

### Patch Changes

- 40cfed6: dependencies
- Updated dependencies [ab112e9]
- Updated dependencies [40cfed6]
  - @deroll/core@2.0.0-alpha.5

## 2.0.0-alpha.11

### Patch Changes

- Updated dependencies [e900240]
  - @deroll/cmio@0.2.0-alpha.4

## 2.0.0-alpha.10

### Patch Changes

- Updated dependencies [b09551a]
  - @deroll/cmio@0.2.0-alpha.3

## 2.0.0-alpha.9

### Patch Changes

- 4b80ab5: Republish with a valid package.json. Versions `2.0.0-alpha.7` and `2.0.0-alpha.8` were published with unresolved `workspace:*` references to `@deroll/cmio` and `@deroll/core`, making them uninstallable. The release process now resolves `workspace:` and `catalog:` protocols to concrete versions before `changeset publish`.

## 2.0.0-alpha.8

### Patch Changes

- Updated dependencies [692adda]
  - @deroll/cmio@0.2.0-alpha.2

## 2.0.0-alpha.7

### Patch Changes

- Updated dependencies [b0739c1]
  - @deroll/cmio@0.2.0-alpha.1

## 2.0.0-alpha.6

### Patch Changes

- bff06a2: Add `@deroll/cmio` — Node.js bindings for libcmt (migrated from `@tuler/node-libcmt`). The libcmt C source is tracked as a git submodule (`machine-guest-tools`) and compiled into a native addon (host builds use the mock-IO driver). `@deroll/app` and the `create-app` scaffolding now depend on the in-repo `@deroll/cmio` instead of the external `@tuler/node-libcmt`.
- Updated dependencies [bff06a2]
  - @deroll/cmio@0.2.0-alpha.0

## 2.0.0-alpha.5

### Patch Changes

- 1de94d9: native app
- Updated dependencies [7970c89]
  - @deroll/core@2.0.0-alpha.4

## 2.0.0-alpha.4

### Patch Changes

- 9498721: Bump dependencies
- Updated dependencies [9498721]
  - @deroll/core@2.0.0-alpha.3

## 2.0.0-alpha.3

### Patch Changes

- c2527d8: changing createApp param name from url to baseUrl

## 2.0.0-alpha.2

### Patch Changes

- 7a6ed6c: fix packaging
- Updated dependencies [7a6ed6c]
  - @deroll/core@2.0.0-alpha.2

## 2.0.0-alpha.1

### Patch Changes

- 40cfed6: bump dependencies
- f8758ad: add delegate call voucher
- Updated dependencies [40cfed6]
- Updated dependencies [f8758ad]
  - @deroll/core@2.0.0-alpha.1

## 2.0.0-alpha.0

### Major Changes

- f0ff7dc: rollups v2

### Patch Changes

- Updated dependencies [f0ff7dc]
  - @deroll/core@2.0.0-alpha.0

## 1.0.0

### Major Changes

- cdcb4fd: bump dependencies

### Patch Changes

- Updated dependencies [cdcb4fd]
  - @deroll/core@1.0.0

## 0.7.1

### Patch Changes

- 09c8d46: Moving broadcastAdvanceRequests to AppOptions type
- Updated dependencies [09c8d46]
  - @deroll/core@0.2.1

## 0.7.0

### Minor Changes

- b034d0c: bump viem
- b034d0c: bump openapi-typescript

### Patch Changes

- Updated dependencies [b034d0c]
- Updated dependencies [b034d0c]
  - @deroll/core@0.2.0

## 0.6.1

### Patch Changes

- a85702c: bump dependencies
- Updated dependencies [a85702c]
  - @deroll/core@0.1.1

## 0.6.0

### Minor Changes

- 488d46b: separation of @deroll/app into @deroll/app and @deroll/core

### Patch Changes

- Updated dependencies [488d46b]
  - @deroll/core@0.1.0

## 0.5.3

### Patch Changes

- 1f556f4: fix request handling using openapi-fetch 0.9

## 0.5.2

### Patch Changes

- ab0e599: enforce request body in openapi schema

## 0.5.1

### Patch Changes

- 00dbe37: bump dependencies

## 0.5.0

### Minor Changes

- 583e2fa: using a tagged version of openapi-interfaces
- 903d8ec: migrate from viem@v1 to viem@v2

## 0.4.0

### Minor Changes

- 2f65b2f: Added support for "host-mode" or "no-backend" at the base of the framework

## 0.3.0

### Minor Changes

- be34557: option to broadcast input to all advance handlers

## 0.2.0

### Minor Changes

- 15db7f1: fix package publishing

## 0.1.0

### Minor Changes

- 575ec7b: Initial version
