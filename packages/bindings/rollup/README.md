# @deroll/rollup

Cartesi Machine rollup binding with the **libcmt protocol implemented in pure JavaScript**. Experimental sibling of [`@deroll/cmio`](../cmio), which wraps the C libcmt as a native addon.

Everything above the device boundary — EVM-ABI framing of inputs/outputs, keccak-256, the outputs merkle tree, finish/accept semantics, and the file-based mock used for host development — is TypeScript ported from [libcmt](https://github.com/cartesi/machine-guest-tools/tree/main/sys-utils/libcmt) (`abi.c`, `merkle.c`, `rollup.c`, `io-mock.c`). The only native code left is a ~180-line shim (`shim/shim.cc`) for the one thing JavaScript cannot do: the `ioctl`+`mmap` contract of the `/dev/cmio` kernel driver inside the Cartesi Machine.

Practical consequences:

- On the **host** (any OS/arch) the package is pure JS: no toolchain, no prebuilds, no node-gyp. The mock driver is driven by the same `CMT_INPUTS`/`CMT_DEBUG` environment variables as libcmt's mock and writes the same output files.
- On **riscv64** (inside the machine) the install script builds/loads the tiny shim, which maps the device tx/rx buffers and forwards the packed 64-bit HTIF yield. The shim tracks the (stable) kernel driver interface, not libcmt — protocol evolution happens in JS.
- Protocol behavior is kept byte-compatible with libcmt: outputs, `outputs_root_hash` files and the saved merkle state (`cmt_merkle_t` layout, interchangeable with `loadMerkle`/`saveMerkle` in `@deroll/cmio`) are verified byte-for-byte against the native binding in the test suite.

## Usage

Same API as `@deroll/cmio`:

```ts
import { Rollup } from "@deroll/rollup";

const rollup = new Rollup();
await rollup.run({
    advance(request, rollup) {
        rollup.emitNotice(request.payload);
        return true; // accept (default); return false to reject
    },
    inspect(request, rollup) {
        rollup.emitReport(request.payload);
    },
});
```

Extras over the native binding:

- `new Rollup({ driver })` accepts `"mock"`, `"cmio"`, or any custom `IoDriver` implementation (handy for tests). By default the real device is used when `/dev/cmio` exists, the mock otherwise.
- The building blocks are exported: `MockDriver`, `CmioDriver`, `Merkle`, the ABI codec and the HTIF yield constants.

## Testing on the host (mock)

```sh
CMT_INPUTS="0:advance.bin,1:inspect.bin" node my-dapp.js
# -> advance.output-0.bin, advance.report-0.bin, ...
```

Reason `0` is advance (EVM-ABI encoded `EvmAdvance`), `1` is inspect (raw payload); any other reason is a gio reply with that response code. Set `CMT_DEBUG=yes` for verbose logging.

## The native shim

The `/dev/cmio` driver exposes only `ioctl` (`IOCTL_CMIO_SETUP`, `IOCTL_CMIO_YIELD`) and fixed-address `mmap` — none of which Node.js core can issue. The shim does exactly that and nothing else, exposing the mapped buffers to JS as zero-copy `ArrayBuffer`s.

The install script builds it only on riscv64 (`DEROLL_ROLLUP_BUILD_SHIM=1` forces it elsewhere, e.g. to run against a future mock device). After `close()` the mapped buffers are unmapped: do not touch `tx`/`rx` views afterwards.

Known behavioral divergence from libcmt: `finish({ accept: false })` on the mock returns the next request cleanly (in C this path is undefined for the mock; on the real device it never returns because the machine reverts).

## License

Apache-2.0, same as libcmt, from which this package derives.
