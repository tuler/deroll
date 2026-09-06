# @deroll/create-app

## 2.0.0-alpha.16

### Patch Changes

- 5f6ba6e: bump dependencies

## 2.0.0-alpha.15

### Minor Changes

- 8819916: Stop wrapping `@cartesi/rollup`. Both `@deroll/app` and `@deroll/core` are removed; what remains of deroll is the wallet and the router, plugged into the binding's own loop.
  
  `@cartesi/rollup` owns the request loop (`Rollup.run`), the outputs (`emitNotice`, `emitReport`, `emitVoucher`, …), the protocol vocabulary, and — as of `1.0.0-alpha.1` — the handler composition (`chain`, `broadcast`) that was the last thing deroll had to add. Wrapping any of it only created a second vocabulary that could drift from the first.
  
  ```diff
  -const app = createApp();
  -const wallet = createWallet();
  -const router = createRouter({ app });
  -
  -app.addAdvanceHandler(wallet.handler);
  -app.addAdvanceHandler(application);
  -app.addInspectHandler(router.handler);
  -app.start();
  +const rollup = new Rollup();
  +const wallet = createWallet();
  +const router = createRouter();
  +
  +rollup.run({
  +    advance: chain(wallet.handler, application),
  +    inspect: router.handler,
  +});
  ```
  
  **Breaking: `@deroll/app` and `@deroll/core` are removed.** `createApp`, the `App` interface, `addAdvanceHandler`/`addInspectHandler`, and deroll's copies of `chain`/`broadcast` are all gone.
  
  - Open the device with `new Rollup()` and enter its loop with `rollup.run({ advance, inspect })`. Only one `Rollup` may be open per process.
  - Compose several handlers with `chain` (each is offered the request until one accepts) or `broadcast` (every one sees it regardless), both imported from `@cartesi/rollup`.
  - Emit outputs through the rollup every handler is handed as its second argument: `app.createNotice(payload)` becomes `rollup.emitNotice(payload)`, and `app.registerException` becomes `rollup.emitException`.
  - Take the handler and protocol types (`AdvanceRequestHandler`, `InspectRequestHandler`, `AdvanceRequest`, `Voucher`, `BytesLike`, …) from `@cartesi/rollup` instead of `@deroll/core`.
  
  **Breaking: handlers return a boolean.** `"accept"`/`"reject"` were the `status` field of the Rollup HTTP Server's `/finish` request body, passed through verbatim by deroll v1 — the last of that transport's vocabulary in the API. `true` claims the request, `false` declines it and leaves it to the next handler. The old words were misleading in a chain anyway: returning `"reject"` never rejected the input, it only declined it, and the input is rejected when nobody claims it.
  
  **Breaking: the advance request is flat.** `AdvanceRequestData`/`AdvanceRequestMetadata` are replaced by `AdvanceRequest`, which carries the metadata fields directly alongside `payload` and a `type: "advance"` discriminant. `InspectRequestData` becomes `InspectRequest`.
  
  ```diff
  -app.addAdvanceHandler(async ({ metadata, payload }) => {
  -    console.log(metadata.msgSender);
  -    return "accept";
  -});
  +rollup.run({
  +    advance: ({ msgSender, payload }) => {
  +        console.log(msgSender);
  +        return true;
  +    },
  +});
  ```
  
  **Breaking: outputs are synchronous, and notice/report payloads are not wrapped.** Emitting an output is a device write, not I/O the event loop can interleave with — `finish` pauses the entire guest — so nothing returns a promise, and `{ payload }` wrappers are gone. Vouchers keep their object argument, since they carry a `destination` and an optional `value` besides the payload. Handlers may still be `async`, but no longer have to be.
  
  **Breaking: `createRouter` takes no arguments, and its handler returns a verdict.** The router used to hold an `App` so it could emit reports; it now receives the rollup as a handler argument. `RouterOptions` is removed. `Router.handler` returns whether a route matched, so it composes with `chain` and an unmatched query falls through to the next handler.
  
  `Router.handler` also reads its query straight out of the request `Buffer` instead of round-tripping it through viem's `toBytes`, which only decoded correctly by accident.
  
  **`registerException` was unreachable.** `NativeApp` implemented it, but it was missing from the interface `createApp` returned, so no application could ever call it. It is now `rollup.emitException`.
  
  **A handler exception rejects the request and is reported.** Previously it went to `stderr` and the next handler ran anyway, which could let a later handler write state on top of a partially applied one, and left the failure invisible from outside the machine. `Rollup.run` now rejects the input and emits the error as a report, which survives the rejection. Code that relied on throwing to fall through to another handler should return `false` instead.
  
  Requires `@cartesi/rollup@1.0.0-alpha.1`, which is a peer dependency of `@deroll/wallet` and `@deroll/router` — the rollup device allows only one open handle per process, so the dependency tree must resolve to a single copy of the binding.
- 91be234: Remove `@deroll/router`. There is no v2 of the package; the published versions are deprecated on npm and stay installable, so v1 applications keep resolving.
  
  The router matched inspect payloads against URL patterns. That made sense when an inspect request *was* an HTTP `GET` against the inspect server and the payload was the path it was made to. It is now an arbitrary buffer whose encoding the application chooses, and the routing key follows from that choice — a segment of a string, a field of a JSON object, a function selector under ABI. Only the first of those looks like a URL, and the package carried no knowledge of the Cartesi protocol to justify keeping it: strip `bytesToString` and `emitReport` and what remained was `path-to-regexp` behind a for-loop.
  
  Dispatch in the inspect handler instead:
  
  ```diff
  -const router = createRouter();
  -router.add<{ name: string }>(
  -    "hello/:name",
  -    ({ params: { name } }) => `Hello ${name}`,
  -);
  -
  -rollup.run({ inspect: router.handler });
  +const inspect: InspectRequestHandler = ({ payload }, rollup) => {
  +    const [command, name] = payload.toString().split("/");
  +
  +    switch (command) {
  +        case "hello":
  +            rollup.emitReport(stringToHex(`Hello ${name}`));
  +            return true;
  +        default:
  +            return false; // no match: `chain` moves on, as the router did
  +    }
  +};
  +
  +rollup.run({ inspect });
  ```
  
  Returning `false` where no route matched preserves the router's behaviour, so a handler composed with `chain` still falls through. To keep pattern matching, depend on `path-to-regexp` directly — it is what the router used, and calling `match()` yourself is a few lines. The docs gained a [Dispatching queries](https://deroll.dev/app/inspect-handlers#dispatching-queries) section covering that alongside the JSON and ABI equivalents.
  
  **`@deroll/create-app` no longer offers the router.** The `router` library choice and the `--use-router` flag are gone, and `Library` is now just `"wallet"`. The `router` and `walletRouter` templates are replaced by a single `inspect` example that dispatches by hand.

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
