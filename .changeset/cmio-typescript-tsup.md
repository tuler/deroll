---
"@deroll/cmio": minor
---

Author the JavaScript half of the binding in TypeScript and generate the bundle and typings with tsup, instead of hand-writing `lib/index.js` alongside a separate `lib/index.d.ts`.

The sources now live in `src/` (`addon.ts`, `convert.ts`, `errors.ts`, `rollup.ts`, `types.ts`) next to the existing `addon.cc`, and `tsup` emits `dist/index.js` (ESM), `dist/index.cjs` (CJS) and the matching `.d.ts`/`.d.cts` from them — the same dual-output setup the other packages in the monorepo use. The public API is unchanged: same exports, same signatures, same runtime behavior. Types are no longer maintained separately from the implementation, so they can't drift.

- The package is now `type: module`, with `main`/`module`/`types` and `exports` pointing at `dist/`.
- `build` runs `tsup`; the native addon keeps compiling at install time via `node-gyp-build` and can be rebuilt explicitly with `build:native`. The prebuildify script was renamed `prebuild` → `prebuild:native` so it stops running as an npm lifecycle hook of `build` (matching `@deroll/genext2fs`).
- `RollupError` now matches `instanceof` across the CJS and ESM copies of the class, preserving the guarantee the previous ESM-wraps-CJS entry point provided.
