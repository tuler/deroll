# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Deroll is a TypeScript framework for building the **backend** of decentralized applications (dApps) on [Cartesi](https://cartesi.io) rollups. A Cartesi dApp backend is a long-running process that reads requests from inside the Cartesi Machine via the native **libcmt** binding (`@deroll/rollup`), processes them deterministically, and produces outputs. Deroll wraps that protocol in a small set of composable libraries. (The legacy Rollup HTTP Server transport has been replaced by the native binding.)

The two request types from the rollup are:
- **advance_state** — a state-changing input (on-chain). Handlers return a boolean (`true` accepts); on reject the machine state is reverted and vouchers/notices are discarded (reports survive).
- **inspect_state** — a read-only query (off-chain). Handlers produce reports but cannot change state.

The four outputs a backend can emit: **notices** (verifiable event logs), **reports** (stateless logs, e.g. inspect results), **vouchers** (executable on-chain calls, e.g. withdrawals), and **delegate-call vouchers**.

## Monorepo layout

bun + Turborepo workspace. Workspaces are grouped by pillar: `packages/*/*` (glob) and `apps/*`. The three pillars are **App** (`packages/app/*`), **Bindings** (`packages/bindings/*`), and **Explorer** (`packages/explorer/*`). `apps/*` are private (docs + examples + the explorer site).

App pillar — `packages/app/*`:
- **`packages/app/codec`** (`@deroll/codec`) — EVM-ABI codecs for rollup inputs/outputs (`EvmAdvance`, `Notice`, `CallVoucher`, `ERC*Transfer`), mirroring libcmt's codec module byte-for-byte. Pure JS, dual ESM + CJS, browser-compatible (no Node APIs; bytes/addresses are 0x-hex `Hex` strings, numbers `bigint`, errors come from ox; argument types are derived from the ABI via abitype); depends only on `ox` + `abitype`. Also exports the full `abi`. Used together with `@deroll/rollup` inside the machine, or standalone outside it.
- **`packages/app/core`** (`@deroll/core`) — shared, **hand-authored** types (a single `src/index.ts`; depends only on `@deroll/codec`). Defines the `App` interface, `AppOptions` (`broadcastAdvanceRequests?`, `appContext?`) and the two handler types; the request/output vocabulary is re-exported from the codec — advance handlers receive the codec's flat `Advance` object (no `metadata` nesting) and return booleans, inspect handlers receive the raw `Hex` payload, numbers are `bigint`. No runtime logic, no codegen; everything else depends on this.
- **`packages/app/app`** (`@deroll/app`) — `createApp()`. The concrete `NativeApp` (in `src/app.ts`) wraps the native `Rollup` from `@deroll/rollup`, drives the request loop via its blocking `waitForInput()`, decodes advances with `@deroll/codec`, dispatches to advance/inspect handlers, and exposes `createNotice/createReport/createCallVoucher/createERC*Transfer/createOutput`, stamping the app-level `appContext` default on outputs. This is the entry point of every dApp. Tests in `__tests__/` drive the loop against the libcmt mock (`CMT_INPUTS`).
- **`packages/app/wallet`** (`@deroll/wallet`) — `createWallet()`. In-memory asset ledger (Ether, ERC-20, ERC-721, ERC-1155). Parses deposits coming from Cartesi portal contracts (Hex payloads), tracks balances, supports internal transfers, and builds withdrawals: `withdraw*` debit the ledger and return the typed output object (`CallVoucher` for Ether, `ERC*Transfer` otherwise) to emit with the matching `app.create*` method, e.g. `app.createErc20Transfer(wallet.withdrawErc20(...))`. No codec dependency — encoding happens in the App. Largest/most complex package.
- **`packages/app/router`** (`@deroll/router`) — `createRouter()`. URL-pattern dispatch (via `path-to-regexp`) for **inspect** requests; matched handlers return a string that becomes a report.
- **`packages/app/create-app`** (`@deroll/create-app`) — the `npm init @deroll/app` scaffolding CLI. Downloads templates and a Dockerfile from the remote `cartesi/application-templates` GitHub repo (via `got`); does not bundle templates locally.
- **`packages/app/tsconfig`** (`@deroll/tsconfig`) — shared `base.json` TS config (strict, ES2022, ESM).

Bindings pillar — `packages/bindings/*` (`@deroll/rollup`, `@deroll/cm`) and Explorer pillar — `packages/explorer/*` (`@deroll/decoder`, `@deroll/json-decoder`, `@deroll/mock-server`): being migrated in from external repos (see the umbrella-monorepo-migration plan). Not all present yet.

Apps: `apps/docs` (Vocs documentation site), `apps/examples` (runnable backend examples — `echo`, `minimal`, `router`, `wallet`, `walletRouter`, `withdraw`, `abi`), and `apps/explorer` (the explorer site, deployed to explorer.deroll.dev).

### How the pieces compose

`createApp` owns the loop and the rollup outputs. Wallet and Router are plugged in as handlers, not subclasses:

```ts
const app = createApp();   // AppOptions: { broadcastAdvanceRequests?: boolean; appContext?: Hex }
const wallet = createWallet();
const router = createRouter({ app });

app.addAdvanceHandler(wallet.handler);   // wallet processes deposits on advance
app.addInspectHandler(router.handler);   // router answers inspect queries
app.start();
```

Advance handlers run in registration order and return booleans. With `broadcastAdvanceRequests` unset/false, the first handler to return `true` short-circuits the rest; when true, all handlers run and the request is accepted if any accepted. Handler exceptions are caught and logged, never thrown out of the loop. Inspect handlers receive the raw query payload (`Hex`) directly.

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

Tests use **Vitest** and live in `__tests__/` (`app`, `wallet` and `router` have them; the app tests exercise the real native binding through the libcmt mock). The wallet package has `@vitest/coverage-istanbul` and `@vitest/ui` available.

## Build specifics

- Each package builds with **tsup** to dual CJS + ESM (`dist/index.cjs` + `dist/index.js`) with `.d.ts`/`.d.cts` type declarations. Packages are `type: module`, `sideEffects: false`. `@deroll/core`'s build is a plain `tsup` — its types are hand-authored in `src/`, **not** generated (the previous OpenAPI/`openapi-typescript` codegen against `cartesi/openapi-interfaces` has been removed along with the HTTP transport).
- `viem` is the shared toolkit for hex/ABI encoding throughout. Deposit parsing and voucher creation in `@deroll/wallet` rely on `@cartesi/viem` for portal/contract addresses and ABIs.

## Conventions

- **Formatting & linting: Biome** (not ESLint/Prettier). Config in `biome.json`: 4-space indent, double quotes. Run `bun run lint`; Biome respects `.gitignore`. `organizeImports` is intentionally off.
- **Public API shape**: each package exposes a `create*()` factory returning an interface (`App`, `WalletApp`, `Router`), with the implementing class kept internal. Follow this pattern when adding capabilities.
- **Versioning/releases: Changesets.** Packages are at `2.0.0-alpha.x`. Add a changeset (`bun run changeset`) for any user-facing change; `bun run version-packages` bumps and `bun run release` builds + publishes.
- Node 20+ (LTS); the docs app requires Node 22+.
