---
"@deroll/cmio": minor
---

Port the binding to the libcmt v2 API overhaul (machine-guest-tools `feature/libcmt-v2`).

This is a **breaking** change. libcmt v2 made the rollup layer raw I/O only and moved
all EVM-ABI encoding/decoding into a separate `codec` module, so the binding now mirrors
that split:

- **`Rollup` is now a thin, raw wrapper.** `finish()` is replaced by
  `waitForInput({ accept })`, which returns `{ type, payload }` with the **raw, undecoded**
  input bytes. Outputs are emitted with `emitOutput(bytes)` (returns the output index);
  `emitReport`/`emitException`/`progress`/`close`/`run` are unchanged in spirit.
- **ABI encoding/decoding moved to JS helpers.** New functions
  `decodeAdvance(input)`, `encodeNotice(payload)`, `encodeVoucher({ destination, value, payload })`
  and `encodeDelegateCallVoucher({ destination, payload })` mirror libcmt's codec module,
  implemented with [`ox`](https://oxlib.sh) (a new runtime dependency) for the EVM-ABI work.
  Compose them with the raw API, e.g. `rollup.emitOutput(encodeNotice(payload))` and
  `decodeAdvance(request.payload)`.
- **The on-chain output format changed.** Notices and vouchers are now encoded as the
  `Output1..Output4(bytes32[N],bytes)` envelope with a 32-byte type tag, not the old
  `Notice(bytes)` / `Voucher(address,uint256,bytes)` selectors. This tracks a newer
  rollups-contracts version.
- **Removed:** `gio()` (libcmt v2 dropped generic IO support entirely) and the
  `loadMerkle`/`saveMerkle`/`resetMerkle` methods (no longer part of the rollup API;
  `cmt_merkle_reset` is also absent from the v2 sources).
- The high-level `emitVoucher`/`emitNotice`/`emitDelegateCallVoucher` methods and the
  decoded `AdvanceRequest` fields on `finish()` are gone; use the `encode*`/`decodeAdvance`
  helpers instead.
