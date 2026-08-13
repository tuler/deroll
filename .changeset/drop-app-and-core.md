---
"@deroll/create-app": minor
"@deroll/router": minor
"@deroll/wallet": minor
---

Stop wrapping `@cartesi/rollup`. Both `@deroll/app` and `@deroll/core` are removed; what remains of deroll is the wallet and the router, plugged into the binding's own loop.

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
