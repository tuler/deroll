---
"@deroll/create-app": minor
---

Remove `@deroll/router`. There is no v2 of the package; the published versions are deprecated on npm and stay installable, so v1 applications keep resolving.

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
