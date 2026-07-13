---
"@deroll/codec": minor
---

New package: EVM-ABI codecs for Cartesi rollup inputs and outputs, extracted from
`@deroll/rollup` so the wire formats can be used without the native binding — in Node.js
**and in browsers**. Pure JavaScript (dual ESM + CommonJS) depending only on `ox` and `abitype`
(types only — argument types are derived from the ABI itself).
The codecs speak ox's native types — bytes/addresses are 0x-hex strings, numbers
are `bigint` — with no conversions inside; invalid values raise ox's own errors.
The full `abi` is also exported for direct use with viem/ox.

One function per libcmt `codec.h` entry, producing/consuming the exact same bytes
(verified against libcmt's own `cast`-generated golden vectors):

- `decodeAdvance` / `encodeAdvance` —
  `EvmAdvance(uint64,address,address,uint64,uint64,uint256,uint64,bytes)`
- `encodeNotice` — `Notice(bytes32,bytes)`
- `encodeCallVoucher` — `CallVoucher(bytes32,address,uint256,bytes)`
- `encodeErc20Transfer` — `Erc20Transfer(bytes32,address,address,uint256)`
- `encodeErc721Transfer` — `Erc721Transfer(bytes32,address,address,uint256)`
- `encodeErc1155Transfer` — `Erc1155Transfer(bytes32,address,address,uint256,uint256)`
- `encodeErc1155BatchTransfer` — `Erc1155BatchTransfer(bytes32,address,address,(uint256,uint256)[])`

Every output carries `appContext`, a free-form `bytes32` applications use to tag
outputs (recipients can filter outputs by it); it is optional and defaults to the
zero hash.
