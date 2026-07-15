// Real-device driver: /dev/cmio inside the Cartesi Machine. The kernel
// driver only speaks ioctl+mmap, which pure JS cannot issue, so this wraps a
// minimal native shim (shim/shim.cc) that maps the tx/rx buffers and forwards
// the packed 64-bit yield. Everything above it stays in JavaScript.
import { createRequire } from "node:module";
import path from "node:path";
import { ErrnoError, errnoOf } from "./errors.js";
import {
    type IoDriver,
    type YieldRequest,
    debugYield,
    packYield,
    unpackYield,
} from "./io.js";

interface ShimDevice {
    readonly tx: ArrayBuffer;
    readonly rx: ArrayBuffer;
    yield(packed: bigint): bigint;
    close(): void;
}

interface Shim {
    Device: new () => ShimDevice;
}

let shim: Shim | undefined;

const loadShim = (): Shim => {
    if (shim === undefined) {
        // dist/ -> package root; node-gyp-build resolves prebuilds/ or build/
        const root = path.join(__dirname, "..");
        const require = createRequire(
            path.join(root, "package.json"),
        ) as NodeJS.Require;
        try {
            shim = require("node-gyp-build")(root) as Shim;
        } catch (error) {
            throw new Error(
                "@deroll/rollup native shim is not available; " +
                    "the /dev/cmio driver needs it (rebuild with `npm rebuild @deroll/rollup` " +
                    "or set DEROLL_ROLLUP_BUILD_SHIM=1 during install)",
                { cause: error },
            );
        }
    }
    return shim;
};

/** Path of the Cartesi Machine IO device. */
export const CMIO_DEVICE = "/dev/cmio";

export class CmioDriver implements IoDriver {
    readonly tx: Buffer;
    readonly rx: Buffer;
    #device: ShimDevice;
    #open = true;

    constructor() {
        const { Device } = loadShim();
        try {
            this.#device = new Device();
        } catch (error) {
            throw new ErrnoError(errnoOf(error), (error as Error).message);
        }
        // zero-copy views over the mmap'd device buffers
        this.tx = Buffer.from(this.#device.tx);
        this.rx = Buffer.from(this.#device.rx);
    }

    yield(rr: YieldRequest): YieldRequest {
        debugYield("tohost", rr);
        let packed: bigint;
        try {
            packed = this.#device.yield(packYield(rr));
        } catch (error) {
            throw new ErrnoError(errnoOf(error), (error as Error).message);
        }
        const reply = unpackYield(packed);
        debugYield("fromhost", reply);
        return reply;
    }

    close(): void {
        if (this.#open) {
            this.#open = false;
            // the shim munmaps the buffers: tx/rx views are invalid from here
            this.#device.close();
        }
    }
}
