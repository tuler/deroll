# @deroll/create-app

## 2.0.0-alpha.14

### Minor Changes

- ab112e9: Use `@cartesi/rollup` instead of the in-repo `@deroll/cmio` binding.
  
  The libcmt binding is now published by Cartesi from [`cartesi/rollups-ts`](https://github.com/cartesi/rollups-ts) as `@cartesi/rollup`, so the `@deroll/cmio` and `@deroll/cm` packages have been removed from this repo in favor of `@cartesi/rollup` and `@cartesi/machine`.
  
  **Breaking:** output indices are now `bigint`. `@cartesi/rollup` reports them as the `uint64` libcmt returns, and the `App` interface follows, so `createNotice`, `createVoucher` and `createDelegateCallVoucher` resolve to a `bigint` instead of a `number` (as do the `index` fields of `NoticeResponse` and `VoucherResponse`). Code that only awaits these calls is unaffected; code that stores or compares the returned index needs a `bigint` (`0n`, not `0`).
  
  - `npm init @deroll/app` scaffolds `@cartesi/rollup` as the binding package: it is the direct dependency in the generated `package.json`, the esbuild `external`, and what the generated Dockerfile stages next to the bundle.
  - Fixed host mode (`CMT_INPUTS`) exiting with an unhandled `RollupError` on Linux once the mock inputs were exhausted. The graceful exit tested for errno `-96`, which is `ENODATA` on macOS only; it now reads the platform's `ENODATA` from `node:os`.

### Patch Changes

- 40cfed6: dependencies

## 2.0.0-alpha.13

### Patch Changes

- b1fb92d: fix references to alpha

## 2.0.0-alpha.12

### Patch Changes

- b09551a: Target libcmt 0.18.0 (machine-guest-tools `v0.18.0`). The binding's public JavaScript API is unchanged; the upgrade is internal and to the build:

  - `HTIF_YIELD_REASON_ADVANCE`/`HTIF_YIELD_REASON_INSPECT` were renamed to `HTIF_YIELD_REASON_ADVANCE_STATE`/`HTIF_YIELD_REASON_INSPECT_STATE` in libcmt; the addon's request dispatch in `finish()` follows the rename.
  - libcmt now bundles the `cmio` ioctl ABI (`include/libcmt/ioctl.h`) instead of including `<linux/cartesi/cmio.h>`, so cross-building the linux-riscv64 prebuild no longer needs the Cartesi Linux headers. The `linux-libc-dev-riscv64-cross` install was dropped from CI, the release workflow and `test/machine/Dockerfile.prebuild`.
  - The mock IO driver writes the outputs Merkle root to `<input>.outputs_merkle_root<ext>` (was `<input>.outputs_root_hash<ext>`), matching the terminology used by rollups-contracts and the machine emulator. Only affects test harnesses that read that file directly.
  - The riscv64 end-to-end machine test now boots the v0.21.0 Cartesi kernel (6.5.13-ctsi-2) with machine-guest-tools `v0.18.0`, matching what the submodule targets.
  - `create-app`'s generated Dockerfile installs machine-guest-tools 0.18.0.

## 2.0.0-alpha.11

### Patch Changes

- bff06a2: Add `@deroll/cmio` — Node.js bindings for libcmt (migrated from `@tuler/node-libcmt`). The libcmt C source is tracked as a git submodule (`machine-guest-tools`) and compiled into a native addon (host builds use the mock-IO driver). `@deroll/app` and the `create-app` scaffolding now depend on the in-repo `@deroll/cmio` instead of the external `@tuler/node-libcmt`.

## 2.0.0-alpha.10

### Patch Changes

- fc3e447: drop yarn support

## 2.0.0-alpha.9

### Patch Changes

- 4e3d33a: add esbuild to bun trusted dependency
- 4389271: fix bun dockerfile

## 2.0.0-alpha.8

### Patch Changes

- ac9ce80: bun package manager support
- fd0e715: bunfig.toml
- 31d6270: do not favor pnpm
- 06757d3: fix yarn install command

## 2.0.0-alpha.7

### Patch Changes

- c640b5e: fix pnpm-workspace.yaml
- 0218ce4: yarn support

## 2.0.0-alpha.6

### Patch Changes

- 42c6401: embedded Dockerfile
- 42c6401: new cartesi version compatibility

## 2.0.0-alpha.5

### Patch Changes

- 0b3bbdf: bump deps

## 2.0.0-alpha.4

### Patch Changes

- 9498721: Bump dependencies

## 2.0.0-alpha.3

### Patch Changes

- c2527d8: exposing ClientOptions at HttpApp

## 2.0.0-alpha.2

### Patch Changes

- 69bd3c1: fetching latest version of project dependencies
- b940b9a: package manager selection
- e8fd88a: update instructions
- b009910: package manager selection
- 7a6ed6c: fix packaging

## 2.0.0-alpha.1

### Patch Changes

- 40cfed6: bump dependencies

## 2.0.0-alpha.0

### Major Changes

- f0ff7dc: rollups v2

## 1.0.0

### Major Changes

- ec11559: using version 1.0.0

## 0.1.1

### Patch Changes

- 78aedc3: fix libraries selection being optional

## 0.1.0

### Minor Changes

- ae0069e: new app creator
