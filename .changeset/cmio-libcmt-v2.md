---
"@deroll/cmio": minor
---

Port the binding to the libcmt v2 API overhaul (machine-guest-tools
`7ffb2da`, "output indexing" era).

This is a **breaking** change. libcmt v2 made the rollup layer raw I/O only and moved
all EVM-ABI encoding/decoding into a separate `codec` module, so the binding mirrors
that split:

- **`Rollup` is a thin, raw wrapper.** `finish()` is replaced by
  `waitForInput({ accept })`, which returns `{ type, payload }` with the **raw, undecoded**
  input bytes. Outputs are emitted with `emitOutput(bytes)` (returns the output index);
  `emitReport`/`emitException`/`progress`/`close`/`run` are unchanged in spirit.
- **ABI encoding/decoding lives in JS helpers**, one per libcmt `codec.h` entry,
  implemented with [`ox`](https://oxlib.sh) (a new runtime dependency) and verified
  byte-for-byte against the C encoders: `decodeAdvance`/`encodeAdvance`
  (`EvmAdvance(uint64,address,address,uint64,uint64,uint256,uint64,bytes)`),
  `encodeNotice` (`Notice(bytes)`), `encodeCallVoucher` (`CallVoucher(address,uint256,bytes)`),
  and the new asset-transfer outputs `encodeERC20Transfer`, `encodeERC721Transfer`,
  `encodeERC1155SingleTransfer` and `encodeERC1155BatchTransfer`.
  Compose them with the raw API, e.g. `rollup.emitOutput(encodeNotice(payload))` and
  `decodeAdvance(request.payload)`.
- **The wire formats track the new rollups contracts.** `EvmAdvance` narrows
  `chainId`/`blockNumber`/`blockTimestamp`/`index` to `uint64` (new selector), and
  outputs use plain per-type selectors (`Notice`, `CallVoucher`, `ERC*Transfer`)
  instead of the previous `Voucher(address,uint256,bytes)` format.
- **Removed:** delegate-call vouchers (dropped by libcmt v2 along with the
  `Output1..Output4` envelope design), `gio()` (libcmt v2 dropped generic IO support),
  and the `loadMerkle`/`saveMerkle`/`resetMerkle` methods (no longer part of the
  rollup API).
- The high-level `emitVoucher`/`emitNotice`/`emitDelegateCallVoucher` methods and the
  decoded `AdvanceRequest` fields on `finish()` are gone; use the `encode*`/`decodeAdvance`
  helpers instead.
