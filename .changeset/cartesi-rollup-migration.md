---
"@deroll/app": minor
"@deroll/create-app": minor
---

Use `@cartesi/rollup` instead of the in-repo `@deroll/cmio` binding.

The libcmt binding is now published by Cartesi from [`cartesi/rollups-ts`](https://github.com/cartesi/rollups-ts) as `@cartesi/rollup`, so the `@deroll/cmio` and `@deroll/cm` packages have been removed from this repo in favor of `@cartesi/rollup` and `@cartesi/machine`.

- `@deroll/app` now depends on `@cartesi/rollup`. Its API is unchanged: `createNotice`/`createVoucher`/`createDelegateCallVoucher` still resolve to a `number`, even though `@cartesi/rollup` reports output indices as `bigint`.
- `npm init @deroll/app` scaffolds `@cartesi/rollup` as the binding package: it is the direct dependency in the generated `package.json`, the esbuild `external`, and what the generated Dockerfile stages next to the bundle.
- Fixed host mode (`CMT_INPUTS`) exiting with an unhandled `RollupError` on Linux once the mock inputs were exhausted. The graceful exit tested for errno `-96`, which is `ENODATA` on macOS only; it now reads the platform's `ENODATA` from `node:os`.
