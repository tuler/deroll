---
"@deroll/core": minor
"@deroll/app": minor
"@deroll/wallet": minor
"@deroll/router": minor
---

Redesign the app stack on top of the native `@deroll/rollup` binding and the
`@deroll/codec` package. This is a **breaking** change across `@deroll/core`,
`@deroll/app`, `@deroll/wallet` and `@deroll/router`:

- **Flattened advance data.** Advance handlers receive the codec's `Advance`
  object directly — `{ chainId, appContract, msgSender, blockNumber,
  blockTimestamp, prevRandao, index, payload }` — with no `metadata` nesting.
  Payloads (advance and inspect) are 0x-hex strings (`Hex`), no longer
  `Buffer`s.
- **Boolean handler results.** Advance handlers return `true` (accept) or
  `false` (reject) instead of the `"accept"` / `"reject"` strings, matching
  the underlying binding. Inspect handlers receive the raw query payload
  (`Hex`) directly, and `createReport` / `registerException` take the payload
  directly instead of a `{ payload }` wrapper. The `AdvanceRequestData`,
  `InspectRequestData`, `Report`, `Exception` and `RequestHandlerResult`
  types are gone — use `Advance` and `Hex` from the codec.
- **Synchronous output methods.** The `create*` methods, `registerException`
  and `stop` no longer return promises — the native binding emits outputs
  synchronously, so `createNotice` etc. return the output index (`number`)
  directly and no longer need `await`. Only `start()` remains async.
- **`createVoucher` is now `createCallVoucher`**, matching the rollup's
  `CallVoucher` output format; `value` and `payload` are required (`0n` / `0x`
  when unused). `createDelegateCallVoucher` is removed (the output type was
  dropped by the rollup).
- **Typed asset transfer outputs.** New `App` methods `createErc20Transfer`,
  `createErc721Transfer`, `createErc1155Transfer` and
  `createErc1155BatchTransfer` emit the rollup's dedicated transfer formats
  without manual ABI encoding, plus `createOutput(payload)` as an escape hatch
  for already-encoded outputs.
- **Output `appContext`.** Every output accepts an optional `bytes32`
  `appContext` tag (default zero hash); an application-wide default can be set
  via the new `createApp({ appContext })` option. `App` also gains `stop()`.
- **Wallet withdrawals return typed outputs.** The `withdraw*` methods debit
  the ledger and return the typed output object — a `CallVoucher` from
  `withdrawEther`, the corresponding `ERC*Transfer` from the others — to be
  emitted with the matching `App` method, e.g.
  `app.createErc20Transfer(wallet.withdrawErc20(token, user, amount))`. This
  routes wallet withdrawals through the App's encoders, so the app-wide
  `appContext` default applies to them like any other output. The
  ERC-721/1155 withdrawals no longer take the application address (`dapp`)
  parameter nor a `data` payload (the wire formats dropped it). The deposit
  parsers take `Hex` payloads, and the `create*TransferVoucher` /
  `createWithdrawEtherVoucher` helpers are removed in favor of the typed
  outputs.
- **Removed HTTP-era types** from `@deroll/core` (`Voucher`,
  `DelegateCallVoucher`, `RequestMetadata`, ...); the request/output
  vocabulary now comes from `@deroll/codec`.
