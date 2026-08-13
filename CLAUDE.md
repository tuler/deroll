# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Deroll is a TypeScript framework for building the **backend** of decentralized applications (dApps) on [Cartesi](https://cartesi.io) rollups. A Cartesi dApp backend is a long-running process that reads requests from inside the Cartesi Machine via the native **libcmt** binding (`@cartesi/rollup`, published from `cartesi/rollups-ts`), processes them deterministically, and produces outputs. Deroll wraps that protocol in a small set of composable libraries. (The legacy Rollup HTTP Server transport has been replaced by the native binding.)

The two request types from the rollup are:
- **advance_state** — a state-changing input (on-chain). Handlers return `"accept"` or `"reject"`; on reject the machine state is reverted and vouchers/notices are discarded (reports survive).
- **inspect_state** — a read-only query (off-chain). Handlers produce reports but cannot change state.

The four outputs a backend can emit: **notices** (verifiable event logs), **reports** (stateless logs, e.g. inspect results), **vouchers** (executable on-chain calls, e.g. withdrawals), and **delegate-call vouchers**.

## Monorepo layout

bun + Turborepo workspace. Workspaces are grouped by pillar: `packages/*/*` (glob) and `apps/*`. The three pillars are **App** (`packages/app/*`), **Bindings** (`packages/bindings/*`), and **Explorer** (`packages/explorer/*`). `apps/*` are private (docs + examples + the explorer site).

App pillar — `packages/app/*`:
- **`packages/app/wallet`** (`@deroll/wallet`) — `createWallet()`. In-memory asset ledger (Ether, ERC-20, ERC-721, ERC-1155). Parses deposits coming from Cartesi portal contracts, tracks balances, supports internal transfers, and builds withdrawal vouchers. Largest/most complex package.
- **`packages/app/router`** (`@deroll/router`) — `createRouter()`. URL-pattern dispatch (via `path-to-regexp`) for **inspect** requests; matched handlers return a string that becomes a report.
- **`packages/app/create-app`** (`@deroll/create-app`) — the `npm init @deroll/app` scaffolding CLI. It generates `package.json`, `tsconfig.json`, the esbuild script and the Dockerfile locally, and downloads the entry point from **this repo** — `apps/examples/src/<example>.ts` on the `prerelease/v2` branch (`src/index.ts:76`), chosen by the selected libraries. The examples *are* the templates, so changing them changes what `npm init` scaffolds.
- **`packages/app/tsconfig`** (`@deroll/tsconfig`) — shared `base.json` TS config (strict, ES2022, ESM).

Bindings pillar — `packages/bindings/*`:
- **`packages/bindings/genext2fs`** (`@deroll/genext2fs`) — N-API binding for `xgenext2fs`, the ext2 image generator; the main entry point is `tarToExt2()`. Compiles the `genext2fs` and `libarchive` submodules straight into the addon (see its README for how the CLI is turned into a library). **GPL-2.0-only**, unlike the rest of the repo.

The libcmt and Cartesi Machine emulator bindings used to live here as `@deroll/cmio` and `@deroll/cm`. They are now published from [`cartesi/rollups-ts`](https://github.com/cartesi/rollups-ts) as **`@cartesi/rollup`** and **`@cartesi/machine`**, and are consumed as ordinary external dependencies (`@cartesi/rollup` is a peer dependency of `@deroll/wallet` and `@deroll/router`, and a direct dependency of the scaffolded applications).

Explorer pillar — `packages/explorer/*` (`@deroll/decoder`, `@deroll/json-decoder`, `@deroll/mock-server`): being migrated in from external repos (see the umbrella-monorepo-migration plan). Not all present yet.

Apps: `apps/docs` (Vocs documentation site), `apps/examples` (runnable backend examples — `echo`, `minimal`, `router`, `wallet`, `walletRouter`, `withdraw`, `abi`), and `apps/explorer` (the explorer site, deployed to explorer.deroll.dev).

### How the pieces compose

`@cartesi/rollup` owns everything about the loop: the request cycle, the outputs, the protocol types, and the handler composition (`chain`, `broadcast`) added in `1.0.0-alpha.1`. Wallet and Router are plugged into it as handlers, and deroll ships no glue of its own:

```ts
import { Rollup, chain } from "@cartesi/rollup";

const rollup = new Rollup();      // only one may be open per process (-EBUSY otherwise)
const wallet = createWallet();
const router = createRouter();    // takes no app: handlers receive the rollup

rollup.run({
    advance: chain(wallet.handler, application),  // wallet claims deposits, rest falls through
    inspect: router.handler,                      // router answers inspect queries
});
```

An advance handler returns `true` to claim the input or `false` to pass it on; the input is rejected only when no handler accepted it. The return type is a strict `boolean` with no `void` on purpose — `Rollup.run` accepts a request unless a handler returns `false`, the opposite default, so a handler that falls off its end must be a type error rather than a silent accept.

Handler exceptions are **not** caught by `chain`. They propagate to `Rollup.run`, which rejects the input and emits the error as a report (reports survive a rejection, notices and vouchers do not), skipping the remaining handlers. Handlers may be sync or async; the emit methods are **synchronous**, mirroring the binding — `finish` pauses the whole guest, so there is no I/O for the event loop to interleave with.

Two handler types, easily confused: `RunHandlers` (what `Rollup.run` takes) allows `boolean | void` and treats a missing return as accept, because such a handler decides the input's fate alone. `RequestHandler`/`AdvanceRequestHandler`/`InspectRequestHandler` (what `chain` and `broadcast` compose) require a strict `boolean`, because a composed handler only makes a claim and there is no sensible default. `boolean` is assignable to `boolean | void`, so a composed handler drops straight into `run`.

Host mode is handled by the binding: since `1.0.0-alpha.1`, `run` returns `Promise<void>` and resolves when the mock's `CMT_INPUTS` are exhausted (on either the accept or the reject path), so every `dev:*` script exits 0. `@cartesi/rollup` also exports `driver` (`"ioctl" | "mock"`), decided at build time from the target architecture.

## Commands

Run from the repo root (Turborepo orchestrates across packages):

```sh
bun install          # bun is the package manager (see packageManager in package.json)
bun run build        # turbo build — respects ^build dependency order
bun run test         # turbo test — runs vitest in packages that define a test script
bun run lint         # turbo lint — biome check across all packages
bun run dev          # turbo dev (watch mode, persistent, --continue)
bun run clean        # remove dist + node_modules everywhere
```

Always use `bun run <script>` for package scripts — bare `bun test` would invoke Bun's own test runner instead of the Vitest-based `test` script.

Per-package / focused work:

```sh
bun run --filter @deroll/wallet test        # test one package
bun run --filter @deroll/wallet build       # build one package
cd packages/app/wallet && bunx vitest run __tests__/transfer.test.ts   # single test file
cd packages/app/wallet && bunx vitest run -t "withdraw"                # tests matching a name
```

Tests use **Vitest** and live in `__tests__/` (`wallet` and `router` have them). The wallet package has `@vitest/coverage-istanbul` and `@vitest/ui` available.

## Build specifics

- Each package builds with **tsup** to dual CJS + ESM (`dist/index.cjs` + `dist/index.js`) with `.d.ts`/`.d.cts` type declarations. Packages are `type: module`, `sideEffects: false`. The previous OpenAPI/`openapi-typescript` codegen against `cartesi/openapi-interfaces` has been removed along with the HTTP transport; no package generates types any more.
- `viem` is the shared toolkit for hex/ABI encoding throughout. Deposit parsing in `@deroll/wallet` relies on `@cartesi/codec` (`decodeDeposit`), the protocol's encode/decode library.

## Conventions

- **Formatting & linting: Biome** (not ESLint/Prettier). Config in `biome.json`: 4-space indent, double quotes. Run `bun run lint`; Biome respects `.gitignore`. `organizeImports` is intentionally off.
- **Public API shape**: each package exposes a `create*()` factory returning an interface (`App`, `WalletApp`, `Router`), with the implementing class kept internal. Follow this pattern when adding capabilities.
- **Versioning/releases: Changesets v3.** Packages are at `2.0.0-alpha.x`. Add a changeset (`bun run changeset`) for any user-facing change; `bun run version-packages` bumps and `bun run release` builds + publishes. The `release` script runs `scripts/resolve-workspace-deps.mjs` before `changeset publish` to rewrite `workspace:`/`catalog:` protocols to concrete versions in place — `changeset publish` shells out to `npm publish`, which (unlike bun/pnpm) does not resolve them. Keep `workspace:*` in the source package.jsons; the rewrite is a CI-only, uncommitted mutation.
  - **Private packages are not tracked** (`privatePackages: false` in `.changeset/config.json`), so `@deroll/docs`, `@deroll/examples`, `@deroll/explorer`, `@deroll/tsconfig`, `@deroll/json-decoder` and `@deroll/mock-server` are never versioned, tagged or listed in a changeset. Write changesets only for the published packages.
  - The repo is in **pre mode** (`alpha`). In v3 `.changeset/pre.json` holds just `{mode, tag}`; already-consumed changesets are moved into `.changeset/pre/` by `changeset version` instead of lingering in `.changeset/`.
  - v3 renamed `changeset tag` to `changeset git-tag`, and `changeset version` now exits 1 when there are no changesets. CI uses `changesets/action@v2` (v1 does not support v3) with the `publish-script` input.
- Node 20+ (LTS); the docs app requires Node 22+, and the Changesets v3 CLI requires Node 22.11+.
