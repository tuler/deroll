---
"@deroll/rollup": minor
---

Port the binding to the libcmt v2 API overhaul (machine-guest-tools
`91dc33e`, "output indexing" era).

This is a **breaking** change. libcmt v2 made the rollup layer raw I/O only and moved
all EVM-ABI encoding/decoding into a separate `codec` module, so the binding mirrors
that split — the package is now exclusively the native `rollup.h` binding, and is
**renamed from `@deroll/cmio` to `@deroll/rollup`** to reflect that:

- **`Rollup` is a thin, raw wrapper.** `finish()` is replaced by
  `waitForInput({ accept })`, which returns `{ type, payload }` with the **raw, undecoded**
  input bytes. Outputs are emitted with `emitOutput(bytes)` (returns the output index);
  `emitReport`/`emitException`/`progress`/`close`/`run` are unchanged in spirit.
- **ABI encoding/decoding lives in the new [`@deroll/codec`](https://www.npmjs.com/package/@deroll/codec)
  package** — pure JS, dual ESM + CommonJS, browser-compatible. Compose it with the raw API, e.g.
  `rollup.emitOutput(encodeNotice(payload))` and `decodeAdvance(request.payload)`.
- **Removed:** delegate-call vouchers (dropped by libcmt v2 along with the
  `Output1..Output4` envelope design), `gio()` (libcmt v2 dropped generic IO support),
  and the `loadMerkle`/`saveMerkle`/`resetMerkle` methods (no longer part of the
  rollup API).
- The high-level `emitVoucher`/`emitNotice`/`emitDelegateCallVoucher` methods and the
  decoded `AdvanceRequest` fields on `finish()` are gone; use `@deroll/codec` instead.
- The package no longer depends on `ox`.
