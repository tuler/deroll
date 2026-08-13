---
"@deroll/core": minor
"@deroll/create-app": minor
"@deroll/router": minor
"@deroll/wallet": minor
---

Stop wrapping `@cartesi/rollup`. `@deroll/app` is removed, and `@deroll/core` keeps only what is genuinely deroll's: composing several handlers into the one the binding's loop accepts.

`@cartesi/rollup` already owns the request loop (`Rollup.run`), the outputs (`emitNotice`, `emitReport`, `emitVoucher`, …) and the protocol vocabulary. What it does not have is composition — `run` takes exactly one advance handler and one inspect handler, while an application typically has several independently authored concerns. That gap is now the whole of `@deroll/core`.

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

**Breaking: `@deroll/app` is removed.** `createApp` and the `App` interface are gone. Open the device with `new Rollup()` from `@cartesi/rollup` and enter its loop with `rollup.run({ advance, inspect })`. Note that only one `Rollup` may be open per process.

**Breaking: outputs are emitted through the rollup.** `app.createNotice(payload)` becomes `rollup.emitNotice(payload)`, and likewise for reports, vouchers and delegate-call vouchers; `app.registerException` becomes `rollup.emitException`. Every handler receives the rollup as its second argument, so it does not need to close over anything.

**Breaking: `addAdvanceHandler`/`addInspectHandler` are replaced by composition.** Use `chain(...)` to present an input to each handler until one accepts it, or `broadcast(...)` to present it to all of them regardless. The `broadcastAdvanceRequests` option is gone: it is now chosen per group of handlers rather than for the whole application, and the two compose (`chain(a, broadcast(b, c))`).

**Breaking: `createRouter` takes no arguments.** The router used to hold an `App` so it could emit reports; it now receives the rollup as a handler argument. `RouterOptions` is removed.

`@deroll/core` gains `RollupContext`, the slice of `Rollup` a handler may use — the emit methods plus `progress` and `gio`, and deliberately not `finish`, `run`, `close` or the merkle helpers, which belong to whoever owns the loop. It is a structural `Pick` rather than the class, so handler tests can pass a plain object instead of mocking the native binding.

**Breaking: the protocol types come from `@cartesi/rollup`.** `@deroll/core` re-exports `AdvanceRequest`, `InspectRequest`, `RollupRequest`, `Voucher`, `DelegateCallVoucher`, `BytesLike`, `AddressLike`, `U256Like` and `Hex` instead of declaring its own copies, so the two can never drift. `@cartesi/rollup` is a **peer dependency** of `@deroll/core`: the rollup device allows only one open handle per process, so the dependency tree must resolve to a single copy of the binding. `@deroll/core` no longer depends on `viem`.

**Note:** `Rollup.run` returns `Promise<never>` — on the host, exhausting the inputs listed in `CMT_INPUTS` rejects rather than resolving, where `app.start()` used to exit cleanly. That belongs to the binding rather than to deroll, and is tracked upstream.

Removed along the way: `RollupAdvanceRequest`, `RollupInspectRequest`, `RequestType`, `RequestData`, `RequestMetadata`, `NoticeResponse`, `ReportResponse` and `VoucherResponse` — leftovers of the Rollup HTTP Server transport, with no consumers since it was replaced.

**Breaking: advance handlers return a boolean.** `"accept"`/`"reject"` were the `status` field of the Rollup HTTP Server's `/finish` request body, passed through verbatim by deroll v1 — the last piece of that transport's vocabulary left in the API. Handlers now return `true` to accept an input or `false` to decline it and pass it to the next handler, matching `finish({ accept })` in the binding. The words were also misleading in a handler chain: returning `"reject"` never rejected the input, it only declined it, and the input is rejected only when no handler accepted.

`RequestHandlerResult` is now `boolean`, deliberately without `void`: `Rollup.run` in the binding accepts a request unless a handler returns `false`, whereas deroll rejects unless a handler opts in, so a handler that falls off its end must be a type error rather than a silent accept.

```diff
-app.addAdvanceHandler(async (data) => {
-    if (!isMine(data)) return "reject";
-    return "accept";
-});
+rollup.run({
+    advance: (request) => {
+        if (!isMine(request)) return false;
+        return true;
+    },
+});
```

**Breaking: the advance request is flat.** `AdvanceRequestData`/`AdvanceRequestMetadata` are replaced by `AdvanceRequest`, which carries the metadata fields directly alongside `payload` and a `type: "advance"` discriminant. `InspectRequestData` becomes `InspectRequest`.

```diff
-app.addAdvanceHandler(async ({ metadata, payload }) => {
-    console.log(metadata.msgSender);
+app.addAdvanceHandler(({ msgSender, payload }) => {
+    console.log(msgSender);
     return "accept";
 });
```

**Breaking: outputs are synchronous, and notice/report payloads are no longer wrapped.** Emitting an output is a device write, not I/O the event loop can interleave with — `finish` pauses the entire guest — so the emit methods do not return promises. The `Notice`, `Report` and `Exception` wrapper types are gone; vouchers keep their object argument, since they carry a `destination` and an optional `value` besides the payload.

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

**`registerException` was unreachable and is now `rollup.emitException`.** `NativeApp` implemented it, but it was missing from the interface `createApp` returned, so no application could ever call it.

`Router.handler` now reads its query straight out of the request `Buffer` instead of round-tripping it through viem's `toBytes`, which only decoded correctly by accident.
