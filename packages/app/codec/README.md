# @deroll/codec

EVM-ABI codecs for [Cartesi](https://cartesi.io) rollup inputs and outputs. Each function mirrors one entry of [libcmt](https://github.com/cartesi/machine-guest-tools/tree/main/sys-utils/libcmt)'s `codec` module and produces/consumes the exact same bytes — verified against libcmt's own golden vectors.

The package is **pure JavaScript** (dual ESM + CommonJS) with no Node.js APIs, so it runs in Node.js and browsers alike. The only dependencies are [`ox`](https://oxlib.sh) and [`abitype`](https://abitype.dev) (types only — the argument types are derived from the ABI itself). The codecs speak ox's native types — bytes and addresses are 0x-hex strings, numbers are `bigint` — with no conversions inside; invalid values raise ox's own errors. The full `abi` (one entry per wire format) is also exported for direct use with viem/ox.

Inside a Cartesi Machine, pair it with [`@deroll/rollup`](../../bindings/rollup), the native binding that moves the raw bytes:

```js
import { Rollup } from '@deroll/rollup';
import { decodeAdvance, encodeCallVoucher, encodeNotice } from '@deroll/codec';
import { Hex } from 'ox';

const rollup = new Rollup();
await rollup.run({
    advance(request, rollup) {
        const advance = decodeAdvance(Hex.fromBytes(request.payload));
        rollup.emitOutput(encodeNotice({ payload: advance.payload }));
        rollup.emitOutput(encodeCallVoucher({
            destination: advance.msgSender,
            value: 0n,
            payload: '0xdeadbeef',
        }));
        return true;
    },
});
```

Outside the machine (a browser, an indexer, a test) the same functions encode inputs and decode/encode outputs without any native code.

## API

| Function | Wire format |
| --- | --- |
| `decodeAdvance(input)` / `encodeAdvance(fields)` | `EvmAdvance(uint64,address,address,uint64,uint64,uint256,uint64,bytes)` |
| `encodeNotice({ appContext?, payload })` | `Notice(bytes32,bytes)` |
| `encodeCallVoucher({ appContext?, destination, value, payload })` | `CallVoucher(bytes32,address,uint256,bytes)` |
| `encodeErc20Transfer({ appContext?, recipient, token, value })` | `Erc20Transfer(bytes32,address,address,uint256)` |
| `encodeErc721Transfer({ appContext?, recipient, token, tokenId })` | `Erc721Transfer(bytes32,address,address,uint256)` |
| `encodeErc1155Transfer({ appContext?, recipient, token, tokenId, value })` | `Erc1155Transfer(bytes32,address,address,uint256,uint256)` |
| `encodeErc1155BatchTransfer({ appContext?, recipient, token, items })` | `Erc1155BatchTransfer(bytes32,address,address,(uint256,uint256)[])` |

Every output carries `appContext`, a free-form `bytes32` applications use to tag outputs (recipients can filter by it); it is optional and defaults to the zero hash. Addresses and bytes are `Hex` (`` `0x${string}` ``, structurally compatible with viem's `Hex`/`Address`); numbers are `bigint`. Invalid arguments raise ox errors (e.g. `Address.InvalidAddressError`, `Hex.IntegerOutOfRangeError`).

## Documentation

Published at **<https://deroll.dev>** (the `apps/docs` Vocs site in this monorepo).

## License

This package and all contributions are licensed under [APACHE 2.0](https://www.apache.org/licenses/LICENSE-2.0). Please review our [LICENSE](../../bindings/rollup/LICENSE) file.
