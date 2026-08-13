---
"@deroll/core": minor
"@deroll/app": minor
"@deroll/router": minor
"@deroll/wallet": minor
---

Stop restating the rollup protocol in `@deroll/core`, and align `@deroll/app` with the binding it wraps.

Now that `@cartesi/rollup` owns the protocol vocabulary, `@deroll/core` keeps only what is genuinely deroll's — the composition contract that lets independently authored handlers share one rollup loop — and re-exports the rest. `@deroll/app` remains the multi-handler loop with reject-by-default semantics, but it no longer wraps a synchronous binding in an asynchronous facade.

**Breaking: the protocol types come from `@cartesi/rollup`.** `@deroll/core` re-exports `AdvanceRequest`, `InspectRequest`, `RollupRequest`, `Voucher`, `DelegateCallVoucher`, `BytesLike`, `AddressLike`, `U256Like` and `Hex` instead of declaring its own copies, so the two can never drift. `@cartesi/rollup` is a **peer dependency** of `@deroll/core`: the rollup device allows only one open handle per process, so the dependency tree must resolve to a single copy of the binding. `@deroll/core` no longer depends on `viem`.

Removed along the way: `RollupAdvanceRequest`, `RollupInspectRequest`, `RequestType`, `RequestData`, `RequestMetadata`, `NoticeResponse`, `ReportResponse` and `VoucherResponse` — leftovers of the Rollup HTTP Server transport, with no consumers since it was replaced.

**Breaking: the advance request is flat.** `AdvanceRequestData`/`AdvanceRequestMetadata` are replaced by `AdvanceRequest`, which carries the metadata fields directly alongside `payload` and a `type: "advance"` discriminant. `InspectRequestData` becomes `InspectRequest`.

```diff
-app.addAdvanceHandler(async ({ metadata, payload }) => {
-    console.log(metadata.msgSender);
+app.addAdvanceHandler(({ msgSender, payload }) => {
+    console.log(msgSender);
     return "accept";
 });
```

**Breaking: outputs are synchronous, and notice/report payloads are no longer wrapped.** Emitting an output is a device write, not I/O the event loop can interleave with — `finish` pauses the entire guest — so the `App` methods no longer return promises. The `Notice`, `Report` and `Exception` wrapper types are gone; vouchers keep their object argument, since they carry a `destination` and an optional `value` besides the payload.

```diff
-const id = await app.createNotice({ payload: stringToHex("hello") });
-await app.createReport({ payload: stringToHex("hello") });
-const id = await app.createVoucher({ destination, payload });
+const id = app.createNotice(stringToHex("hello"));
+app.createReport(stringToHex("hello"));
+const id = app.createVoucher({ destination, payload });
```

Handlers may still be `async` — they are awaited — but they no longer have to be. `@deroll/wallet`'s and `@deroll/router`'s handlers are now synchronous.

**Breaking: a handler exception rejects the request and is reported.** Previously an exception was written to `stderr` and the next handler ran anyway, which could let a later handler write state on top of a partially applied one — and left the failure invisible from outside the machine. Now the input is rejected immediately, the remaining handlers are skipped, and the error is emitted as a report, which survives the rejection. Applications that relied on throwing to fall through to another handler should return `"reject"` instead.

**`registerException` is now part of the `App` interface.** `NativeApp` always implemented it, but it was missing from the interface that `createApp` returns, so it was unreachable through the public API.

`Router.handler` now reads its query straight out of the request `Buffer` instead of round-tripping it through viem's `toBytes`, which only decoded correctly by accident.
