---
"@deroll/core": minor
"@deroll/app": minor
"@deroll/create-app": minor
---

Use `@cartesi/rollup` instead of the in-repo `@deroll/cmio` binding.

The libcmt binding is now published by Cartesi from [`cartesi/rollups-ts`](https://github.com/cartesi/rollups-ts) as `@cartesi/rollup`, so the `@deroll/cmio` and `@deroll/cm` packages have been removed from this repo in favor of `@cartesi/rollup` and `@cartesi/machine`.

**Breaking:** output indices are now `bigint`. `@cartesi/rollup` reports them as the `uint64` libcmt returns, and the `App` interface follows, so `createNotice`, `createVoucher` and `createDelegateCallVoucher` resolve to a `bigint` instead of a `number` (as do the `index` fields of `NoticeResponse` and `VoucherResponse`). Code that only awaits these calls is unaffected; code that stores or compares the returned index needs a `bigint` (`0n`, not `0`).

- `npm init @deroll/app` scaffolds `@cartesi/rollup` as the binding package: it is the direct dependency in the generated `package.json`, the esbuild `external`, and what the generated Dockerfile stages next to the bundle.
- Fixed host mode (`CMT_INPUTS`) exiting with an unhandled `RollupError` on Linux once the mock inputs were exhausted. The graceful exit tested for errno `-96`, which is `ENODATA` on macOS only; it now reads the platform's `ENODATA` from `node:os`.
