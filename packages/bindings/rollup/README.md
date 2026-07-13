# @deroll/rollup

Node.js bindings for [libcmt](https://github.com/cartesi/machine-guest-tools/tree/main/sys-utils/libcmt), the Cartesi Machine guest rollup library. It lets Node.js applications running inside a Cartesi Machine process rollup inputs (advances and inspects) and emit vouchers, notices, reports and exceptions — without going through the rollup HTTP server.

The package is a Node-API native addon:

- On **riscv64** (inside the Cartesi Machine) it statically links the real libcmt, which talks to the machine emulator through the kernel driver.
- On **other architectures** (your development host) it compiles libcmt's *mock* IO driver, which simulates inputs and outputs via files, driven by the `CMT_INPUTS` and `CMT_DEBUG` environment variables.

The right flavor is selected automatically by target architecture, so the same dapp code runs unchanged on the host and in the machine.

The API is **fully synchronous** on purpose: calls that wait on the emulator (`waitForInput`) yield the machine, which pauses the entire guest — including the Node.js event loop — so there is nothing to run concurrently while they wait. On the host mock they return immediately.

The binding mirrors libcmt's own split between its **rollup** module (raw I/O) and its **codec** module (EVM-ABI wire formats): the `Rollup` class here only moves raw bytes, and the sibling [`@deroll/codec`](../../app/codec) package (pure JS, browser-compatible) translates between structured values and bytes.

## Usage

```js
import { Rollup } from '@deroll/rollup';
import { decodeAdvance, encodeCallVoucher, encodeNotice } from '@deroll/codec';
import { Hex } from 'ox';

const rollup = new Rollup();
await rollup.run({
    advance(request, rollup) {
        // request.payload is the raw EvmAdvance input; decode it
        const advance = decodeAdvance(Hex.fromBytes(request.payload));
        // advance: { chainId, appContract, msgSender, blockNumber,
        //            blockTimestamp, prevRandao, index, payload }
        rollup.emitOutput(encodeNotice({ payload: advance.payload }));
        rollup.emitOutput(encodeCallVoucher({
            destination: advance.msgSender,
            value: 0n,
            payload: '0xdeadbeef',
        }));
        return true; // accept (default); return false to reject
    },
    inspect(request, rollup) {
        rollup.emitReport(request.payload);
    },
});
```

Or drive the loop yourself:

```js
const rollup = new Rollup();
let accept = true;
for (;;) {
    const request = rollup.waitForInput({ accept });
    accept = handle(request); // your logic
}
```

Byte arguments accept `Buffer`, `Uint8Array` or 0x-prefixed hex strings. Addresses are returned as 0x-hex strings, payloads as `Buffer`, and numeric fields as `bigint`.

The package is dual ESM + CommonJS — `const { Rollup } = require('@deroll/rollup')` works too, and both entry points share the same native addon instance.

### Rollup API (raw I/O)

| Method | Description |
| --- | --- |
| `new Rollup()` | Opens the rollup device. Only **one** instance may be open at a time (`-EBUSY` otherwise); `close()` the previous one first. |
| `waitForInput({ accept })` | Accepts/rejects the previous request, yields, and returns the next `{ type: 'advance' \| 'inspect', payload }` with the raw, undecoded payload. |
| `emitOutput(bytes)` | Emits a raw, already EVM-ABI encoded output; adds it to the outputs merkle tree and returns its index. |
| `emitReport(payload)` | Emits a report (raw bytes, not in the outputs merkle tree). |
| `emitException(payload)` | Signals that the request could not be processed. |
| `progress(value)` | Reports progress (raw uint32). |
| `close()` | Releases the device. |
| `run({ advance, inspect })` | Convenience loop over `waitForInput`; handlers may be async. Handler exceptions reject the input and are emitted as reports. |

Failed libcmt calls throw a `RollupError` with the negative errno in `error.errno` and the failed call in `error.syscall`.

### Codec helpers (EVM-ABI wire formats)

The EVM-ABI wire formats live in [`@deroll/codec`](../../app/codec), a pure-JS package (dual ESM + CommonJS) that also runs in browsers. Compose it with the raw API: `rollup.emitOutput(encodeNotice({ payload }))`, `decodeAdvance(Hex.fromBytes(request.payload))`, and `encodeAdvance` for crafting mock inputs when testing on the host.

## Documentation

Published at **<https://deroll.dev>** (the `apps/docs` Vocs site in this monorepo, under *rollup*).

## Testing on the host (mock)

The mock injects inputs from files listed in `CMT_INPUTS` and writes outputs to files named after the input:

```sh
CMT_INPUTS="0:advance.bin,1:inspect.bin" node my-dapp.js
# -> advance.output-0.bin, advance.report-0.bin, ...
```

Reason `0` is advance (EVM-ABI encoded `EvmAdvance` — build one with `@deroll/codec`'s `encodeAdvance`), `1` is inspect (raw payload). Set `CMT_DEBUG=yes` for verbose logging. See the [libcmt README](https://github.com/cartesi/machine-guest-tools/tree/main/sys-utils/libcmt#testing) for how to generate inputs with foundry's `cast`, or `test/rollup.test.mjs` here for a pure-JS encoder.

## Testing inside a Cartesi Machine

`test/machine/run.sh` tests the real riscv64 build end-to-end: it cross-builds the linux-riscv64 prebuild in Docker (mirroring CI), assembles a riscv64 Debian rootfs with Node.js and the packed package, boots it with [cartesi-machine](https://github.com/cartesi/machine-emulator), feeds ABI-encoded advance inputs and an inspect query via `--cmio-advance-state`/`--cmio-inspect-state`, and verifies the emitted outputs byte-for-byte. Requires Docker (with riscv64 emulation) and the `cartesi-machine` CLI (or set `CARTESI_MACHINE` to run it from the `cartesi/machine-emulator` docker image). Set `SKIP_PREBUILD=1`/`SKIP_ROOTFS=1` to reuse artifacts from a previous run. CI runs this in the `test-machine` job, reusing the prebuild built by `prebuild-riscv64`.

## Building

libcmt sources are expected at `deps/machine-guest-tools` (git submodule in this repository). Override the location with `LIBCMT_DIR=/path/to/sys-utils/libcmt` (must resolve inside the package directory tree for gyp).

```sh
git submodule update --init   # fetch libcmt sources
npm install                   # uses a prebuild when available, otherwise compiles
npm test                      # runs the suite against the mock
```

On riscv64 the addon does not compile libcmt; it links the static library installed by the machine-guest-tools `.deb` (`-l:libcmt.a`, headers from `/usr/include/libcmt`). Override with `LIBCMT_LIB=/path/to/libcmt.a`.

### Prebuilds

`npm run prebuild` produces `prebuilds/<platform>-<arch>/` via prebuildify; `node-gyp-build` picks them up at install time so consumers need no toolchain. Cross-building the riscv64 prebuild requires the riscv64 cross toolchain and a libcmt built with the Cartesi Linux headers — see `.github/workflows/build.yml`.

## Releasing

1. Bump `version` in `package.json`.
2. Tag the commit `vX.Y.Z` (must match the version) and push the tag.

CI then builds prebuilds for linux-x64, linux-arm64, linux-riscv64, darwin-x64 and darwin-arm64, packs them into the tarball together with the libcmt sources (from-source fallback for other platforms), smoke-tests an install of the packed tarball, publishes to npm, and attaches the tarball to a GitHub release.

Publishing uses [npm trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC): no npm token secret is required, and provenance attestations are generated automatically. The package on npmjs.com must have a Trusted Publisher configured pointing at this repository and the `build.yml` workflow. Note that npm only allows configuring a trusted publisher on an *existing* package, so the very first publish must be done manually (`npm publish` from a logged-in terminal).

## License

This package and all contributions are licensed under [APACHE 2.0](https://www.apache.org/licenses/LICENSE-2.0). Please review our [LICENSE](LICENSE) file.
