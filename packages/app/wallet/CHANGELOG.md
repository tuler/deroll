# @deroll/wallet

## 2.0.0-alpha.10

### Patch Changes

- 5f6ba6e: bump dependencies

## 2.0.0-alpha.9

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

## 2.0.0-alpha.8

### Patch Changes

- 40cfed6: dependencies
- Updated dependencies [ab112e9]
- Updated dependencies [40cfed6]
  - @deroll/core@2.0.0-alpha.5

## 2.0.0-alpha.7

### Major Changes

- 4c51eda: refactor deposit parsing to use `@cartesi/codec`

  The hand-rolled deposit parsing utilities were removed in favor of the new [`@cartesi/codec`](https://cartesi.github.io/rollups-ts/codec) package, which is now the canonical implementation of Cartesi rollups encoding and decoding:

  - removed `isEtherDeposit`, `isERC20Deposit`, `isERC721Deposit`, `isERC1155SingleDeposit` and `isERC1155BatchDeposit`: use `decodeDeposit` from `@cartesi/codec`, which dispatches on the input `msgSender` and returns a deposit discriminated by a `type` field;
  - removed `parseEtherDeposit`, `parseERC20Deposit`, `parseERC721Deposit`, `parseERC1155SingleDeposit` and `parseERC1155BatchDeposit`: use `decodeEtherDeposit`, `decodeErc20Deposit`, `decodeErc721Deposit`, `decodeErc1155SingleDeposit` and `decodeErc1155BatchDeposit` from `@cartesi/codec`;
  - removed the `EtherDeposit`, `ERC20Deposit`, `ERC721Deposit`, `ERC1155SingleDeposit` and `ERC1155BatchDeposit` types: use the deposit types exported by `@cartesi/codec`. Note that the ERC-20 deposit amount field is named `value` (not `amount`), and decoded deposits also carry the `baseLayerData`/`execLayerData` fields.

  The wallet handler and the voucher creation utilities (`createWithdrawEtherVoucher`, `createERC20TransferVoucher`, `createERC721TransferVoucher`, `createERC1155SingleTransferVoucher` and `createERC1155BatchTransferVoucher`) are unchanged.

## 2.0.0-alpha.6

### Patch Changes

- 42f97d1: revert wallet back to depend on @deroll/core
- Updated dependencies [7970c89]
  - @deroll/core@2.0.0-alpha.4

## 2.0.0-alpha.5

### Patch Changes

- d1b448d: New wallet based on binding

## 2.0.0-alpha.4

### Patch Changes

- 9498721: Bump dependencies
- ce7ae8a: Bump @cartesi/viem to 2.0.0-alpha.28
- Updated dependencies [9498721]
  - @deroll/core@2.0.0-alpha.3

## 2.0.0-alpha.3

### Patch Changes

- 7a6ed6c: fix packaging
- Updated dependencies [7a6ed6c]
  - @deroll/core@2.0.0-alpha.2

## 2.0.0-alpha.2

### Major Changes

- 4dae713: Bump @cartesi/viem version to alpha.12

## 2.0.0-alpha.1

### Major Changes

- 9558dc0: Remove @cartesi/rollups and wagmi/cli dependency and replace with @cartesi/viem lib.

### Patch Changes

- 40cfed6: bump dependencies
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

## 0.8.1

### Patch Changes

- Updated dependencies [09c8d46]
  - @deroll/core@0.2.1

## 0.8.0

### Minor Changes

- b034d0c: bump viem
- b034d0c: bump openapi-typescript

### Patch Changes

- Updated dependencies [b034d0c]
- Updated dependencies [b034d0c]
  - @deroll/core@0.2.0

## 0.7.0

### Minor Changes

- 79b1b04: expose low-level voucher helpers

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

## 0.5.2

### Patch Changes

- Updated dependencies [1f556f4]
  - @deroll/app@0.5.3

## 0.5.1

### Patch Changes

- Updated dependencies [ab0e599]
  - @deroll/app@0.5.2

## 0.5.0

### Minor Changes

- 4af490c: add support for ERC721 and ERC1155
- 4af490c: BREAKING: change balanceOf to explicit etherBalanceOf and erc20BalanceOf

### Patch Changes

- 00dbe37: bump dependencies
- Updated dependencies [00dbe37]
  - @deroll/app@0.5.1

## 0.4.0

### Minor Changes

- b6e208a: bump rollups-contracts to 1.2
- 903d8ec: migrate from viem@v1 to viem@v2

### Patch Changes

- Updated dependencies [583e2fa]
- Updated dependencies [903d8ec]
  - @deroll/app@0.5.0

## 0.3.7

### Patch Changes

- 4189e2a: fix wallets assignment bug

## 0.3.6

### Patch Changes

- 26efd8d: fix bug in balanceOf ERC-20

## 0.3.5

### Patch Changes

- Updated dependencies [2f65b2f]
  - @deroll/app@0.4.0

## 0.3.4

### Patch Changes

- d07d6b0: fix wallet initialization on transfer

## 0.3.3

### Patch Changes

- 0fa80f3: fix wallet initialization

## 0.3.2

### Patch Changes

- 9796d6e: fix bytes32 to bigint conversion

## 0.3.1

### Patch Changes

- 4e1455f: normalize address during sender check

## 0.3.0

### Minor Changes

- 81bbb4f: address normalization

### Patch Changes

- 71f992e: export low level types
- Updated dependencies [be34557]
  - @deroll/app@0.3.0

## 0.2.2

### Patch Changes

- fc2df22: fix ether balance for unexisting wallet
  - @deroll/app@0.2.0

## 0.2.1

### Patch Changes

- c7b6676: fix wallet and router handle binding

## 0.2.0

### Minor Changes

- 38202d0: expose low level wallet API
- 15db7f1: fix package publishing

### Patch Changes

- Updated dependencies [15db7f1]
  - @deroll/app@0.2.0

## 0.1.0

### Minor Changes

- 575ec7b: Initial version

### Patch Changes

- Updated dependencies [575ec7b]
  - @deroll/app@0.1.0
