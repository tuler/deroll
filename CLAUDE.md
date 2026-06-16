# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Deroll is a TypeScript framework for building the **backend** of decentralized applications (dApps) on [Cartesi](https://cartesi.io) rollups. A Cartesi dApp backend is a long-running process that polls the Cartesi **Rollup HTTP Server** for requests, processes them deterministically, and produces outputs. Deroll wraps that protocol in a small set of composable libraries.

The two request types from the rollup are:
- **advance_state** — a state-changing input (on-chain). Handlers return `"accept"` or `"reject"`; on reject the machine state is reverted and vouchers/notices are discarded (reports survive).
- **inspect_state** — a read-only query (off-chain). Handlers produce reports but cannot change state.

The four outputs a backend can emit: **notices** (verifiable event logs), **reports** (stateless logs, e.g. inspect results), **vouchers** (executable on-chain calls, e.g. withdrawals), and **delegate-call vouchers**.

## Monorepo layout

pnpm + Turborepo workspace. Published packages live in `packages/*`; `apps/*` are private (docs + examples).

- **`packages/core`** (`@deroll/core`) — shared types and the OpenAPI-generated `schema.ts`. Defines the `App` interface and request/output types. No runtime logic; everything else depends on this.
- **`packages/app`** (`@deroll/app`) — `createApp()`. The concrete `HttpApp` that runs the poll loop against the Rollup HTTP Server via an `openapi-fetch` client, dispatches to advance/inspect handlers, and exposes `createNotice/createReport/createVoucher/...`. This is the entry point of every dApp.
- **`packages/wallet`** (`@deroll/wallet`) — `createWallet()`. In-memory asset ledger (Ether, ERC-20, ERC-721, ERC-1155). Parses deposits coming from Cartesi portal contracts, tracks balances, supports internal transfers, and builds withdrawal vouchers. Largest/most complex package.
- **`packages/router`** (`@deroll/router`) — `createRouter()`. URL-pattern dispatch (via `path-to-regexp`) for **inspect** requests; matched handlers return a string that becomes a report.
- **`packages/create-app`** (`@deroll/create-app`) — the `npm init @deroll/app` scaffolding CLI. Downloads templates and a Dockerfile from the remote `cartesi/application-templates` GitHub repo (via `got`); does not bundle templates locally.
- **`packages/tsconfig`** (`@deroll/tsconfig`) — shared `base.json` TS config (strict, ES2022, ESM).
- **`packages/testing`** — currently empty (no `package.json` or source).

Apps: `apps/docs` (Vocs documentation site) and `apps/examples` (runnable backend examples — `echo`, `minimal`, `router`, `wallet`, `walletRouter`, `withdraw`, `abi`).

### How the pieces compose

`createApp` owns the loop and the HTTP outputs. Wallet and Router are plugged in as handlers, not subclasses:

```ts
const app = createApp({ url });
const wallet = createWallet();
const router = createRouter({ app });

app.addAdvanceHandler(wallet.handler);   // wallet processes deposits on advance
app.addInspectHandler(router.handler);   // router answers inspect queries
app.start();
```

Advance handlers run in registration order. With `broadcastAdvanceRequests` unset/false, the first handler to return `"accept"` short-circuits the rest; when true, all handlers run and the request is accepted if any accepted. Handler exceptions are caught and logged, never thrown out of the loop.

## Commands

Run from the repo root (Turborepo orchestrates across packages):

```sh
pnpm install         # corepack-managed pnpm (see packageManager in package.json)
pnpm build           # turbo build — respects ^build dependency order
pnpm test            # turbo test — runs vitest in packages that define a test script
pnpm lint            # turbo lint — biome check across all packages
pnpm dev             # turbo dev (watch mode, persistent, --continue)
pnpm clean           # remove dist + node_modules everywhere
```

Per-package / focused work:

```sh
pnpm --filter @deroll/wallet test           # test one package
pnpm --filter @deroll/wallet build          # build one package
pnpm --filter @deroll/wallet exec vitest run __tests__/transfer.test.ts   # single test file
pnpm --filter @deroll/wallet exec vitest run -t "withdraw"                # tests matching a name
```

Tests use **Vitest** and live in `__tests__/` (only `wallet` and `router` currently have them). The wallet package has `@vitest/coverage-istanbul` and `@vitest/ui` available.

## Build & codegen specifics

- Each package builds with **tsup** to dual CJS + ESM (`dist/index.cjs` + `dist/index.js`) with `.d.ts`/`.d.cts` type declarations. Packages are `type: module`, `sideEffects: false`.
- **`@deroll/core` build is two-step**: `codegen` then `compile`. `codegen` runs `tsx schema.ts`, which fetches the Cartesi rollup OpenAPI spec (pinned to a `cartesi/openapi-interfaces` version) and generates `src/schema.ts` via `openapi-typescript`. A custom transform rewrites OpenAPI `format: hex`/`format: address` fields to viem's `Hex`/`Address` types instead of plain strings. **Do not hand-edit `packages/core/src/schema.ts`** — change `packages/core/schema.ts` (the generator) and re-run codegen.
- `viem` is the shared toolkit for hex/ABI encoding throughout. Deposit parsing and voucher creation in `@deroll/wallet` rely on `@cartesi/viem` for portal/contract addresses and ABIs.

## Conventions

- **Formatting & linting: Biome** (not ESLint/Prettier). Config in `biome.json`: 4-space indent, double quotes. Run `pnpm lint`; Biome respects `.gitignore`. `organizeImports` is intentionally off.
- **Public API shape**: each package exposes a `create*()` factory returning an interface (`App`, `WalletApp`, `Router`), with the implementing class kept internal. Follow this pattern when adding capabilities.
- **Versioning/releases: Changesets.** Packages are at `2.0.0-alpha.x`. Add a changeset (`pnpm changeset`) for any user-facing change; `pnpm version-packages` bumps and `pnpm release` builds + publishes.
- Node 20+ (LTS); the docs app requires Node 22+.
