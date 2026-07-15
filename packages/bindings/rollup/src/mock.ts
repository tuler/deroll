// Pure-JS port of libcmt's io-mock.c: simulates the machine by reading inputs
// from files listed in CMT_INPUTS ("reason:file,reason:file,...") and writing
// outputs to files named after the input being processed. Behavior mirrors
// the C mock so dapps and tests run unchanged against either implementation.
import fs from "node:fs";
import {
    EBUSY,
    EINVAL,
    EIO,
    ENOBUFS,
    ENODATA,
    ENOSYS,
    ErrnoError,
    errnoOf,
} from "./errors.js";
import {
    HTIF_YIELD_AUTOMATIC_REASON_PROGRESS,
    HTIF_YIELD_AUTOMATIC_REASON_TX_OUTPUT,
    HTIF_YIELD_AUTOMATIC_REASON_TX_REPORT,
    HTIF_YIELD_CMD_AUTOMATIC,
    HTIF_YIELD_CMD_MANUAL,
    HTIF_YIELD_MANUAL_REASON_RX_ACCEPTED,
    HTIF_YIELD_MANUAL_REASON_RX_REJECTED,
    HTIF_YIELD_MANUAL_REASON_TX_EXCEPTION,
    type IoDriver,
    type YieldRequest,
    debugEnabled,
    debugYield,
} from "./io.js";

const BUFFER_LENGTH = 2 << 20; // 2MB, same as the cmio device buffers

/** Options for {@link MockDriver}. */
export interface MockDriverOptions {
    /** Input list, in CMT_INPUTS format. Defaults to `process.env.CMT_INPUTS`. */
    inputs?: string;
}

// mimic the kernel driver (and io-mock.c) by limiting open devices to 1
let openCount = 0;

export class MockDriver implements IoDriver {
    readonly tx: Buffer;
    readonly rx: Buffer;

    #inputsLeft: string[];
    #inputType = 0;
    #inputFilename = "none";
    #inputFileext = ".bin";
    #inputSeq = 0;
    #outputSeq = 0;
    #reportSeq = 0;
    #exceptionSeq = 0;
    #gioSeq = 0;
    #open;

    constructor(options: MockDriverOptions = {}) {
        if (openCount > 0) {
            throw new ErrnoError(EBUSY);
        }
        openCount++;
        this.#open = true;
        this.tx = Buffer.alloc(BUFFER_LENGTH);
        this.rx = Buffer.alloc(BUFFER_LENGTH);
        const inputs = options.inputs ?? process.env.CMT_INPUTS ?? "";
        this.#inputsLeft = inputs.length > 0 ? inputs.split(",") : [];
    }

    close(): void {
        if (this.#open) {
            this.#open = false;
            openCount--;
        }
    }

    yield(rr: YieldRequest): YieldRequest {
        debugYield("tohost", rr);
        const reply = this.#yield(rr);
        debugYield("fromhost", reply);
        return reply;
    }

    #yield(rr: YieldRequest): YieldRequest {
        if (rr.cmd === HTIF_YIELD_CMD_MANUAL) {
            switch (rr.reason) {
                case HTIF_YIELD_MANUAL_REASON_RX_ACCEPTED:
                    return this.#rxAccepted(rr);
                case HTIF_YIELD_MANUAL_REASON_RX_REJECTED:
                    return this.#rxRejected(rr);
                case HTIF_YIELD_MANUAL_REASON_TX_EXCEPTION:
                    return this.#storeNextOutput("exception-", rr, () =>
                        String(this.#exceptionSeq++),
                    );
                default:
                    return this.#txGio(rr);
            }
        }
        if (rr.cmd === HTIF_YIELD_CMD_AUTOMATIC) {
            switch (rr.reason) {
                case HTIF_YIELD_AUTOMATIC_REASON_PROGRESS:
                    process.stderr.write(
                        `Progress: ${(rr.data / 10).toFixed(2).padStart(6)}\n`,
                    );
                    return { ...rr };
                case HTIF_YIELD_AUTOMATIC_REASON_TX_OUTPUT:
                    return this.#storeNextOutput("output-", rr, () =>
                        String(this.#outputSeq++),
                    );
                case HTIF_YIELD_AUTOMATIC_REASON_TX_REPORT:
                    return this.#storeNextOutput("report-", rr, () =>
                        String(this.#reportSeq++),
                    );
                default:
                    throw new ErrnoError(EINVAL);
            }
        }
        throw new ErrnoError(EINVAL);
    }

    /** Accept: store the root hash of the previous input, load the next one. */
    #rxAccepted(rr: YieldRequest): YieldRequest {
        if (this.#inputSeq++ > 0) {
            // skip the first finish: there is no previous input yet
            this.#storeOutput(
                `${this.#inputFilename}.outputs_root_hash${this.#inputFileext}`,
                rr.data,
            );
        }
        try {
            return this.#loadNextInput(rr);
        } catch {
            throw new ErrnoError(ENODATA);
        }
    }

    #rxRejected(rr: YieldRequest): YieldRequest {
        process.stderr.write("no revert for the mock implementation\n");
        try {
            return this.#loadNextInput(rr);
        } catch {
            throw new ErrnoError(ENOSYS);
        }
    }

    /** Generic IO: store the request, reply with the next input file. */
    #txGio(rr: YieldRequest): YieldRequest {
        this.#storeNextOutput("gio-", rr, () => String(this.#gioSeq++));
        return this.#loadNextInput(rr);
    }

    #loadNextInput(rr: YieldRequest): YieldRequest {
        const entry = this.#inputsLeft.shift();
        if (entry === undefined) {
            throw new ErrnoError(EINVAL);
        }
        const match = /^\s*(-?\d+):(.+)$/.exec(entry);
        if (!match) {
            throw new ErrnoError(EINVAL);
        }
        const filepath = match[2] as string;

        let data: Buffer;
        try {
            data = fs.readFileSync(filepath);
        } catch (error) {
            if (debugEnabled()) {
                process.stderr.write(`failed to load "${filepath}"\n`);
            }
            throw new ErrnoError(errnoOf(error));
        }
        if (data.length > this.rx.length) {
            throw new ErrnoError(EIO);
        }

        // split "name.ext" at the first dot, like io-mock.c does
        const dot = filepath.indexOf(".");
        if (dot <= 0 || dot === filepath.length - 1) {
            if (debugEnabled()) {
                process.stderr.write(
                    `failed to parse filename: "${filepath}"\n`,
                );
            }
            throw new ErrnoError(EINVAL);
        }
        this.#inputFilename = filepath.slice(0, dot);
        this.#inputFileext = filepath.slice(dot);

        this.#inputType = Number.parseInt(match[1] as string, 10);
        data.copy(this.rx);
        this.#outputSeq = 0;
        this.#reportSeq = 0;
        this.#exceptionSeq = 0;

        if (debugEnabled()) {
            process.stderr.write(
                `processing filename: "${filepath}" (${data.length}), type: ${this.#inputType}\n`,
            );
        }
        return { ...rr, reason: this.#inputType, data: data.length };
    }

    #storeNextOutput(
        ns: string,
        rr: YieldRequest,
        nextSeq: () => string,
    ): YieldRequest {
        this.#storeOutput(
            `${this.#inputFilename}.${ns}${nextSeq()}${this.#inputFileext}`,
            rr.data,
        );
        return { ...rr };
    }

    #storeOutput(filepath: string, length: number): void {
        if (length > this.tx.length) {
            throw new ErrnoError(ENOBUFS);
        }
        try {
            fs.writeFileSync(filepath, this.tx.subarray(0, length));
        } catch (error) {
            process.stderr.write(`failed to store "${filepath}"\n`);
            throw new ErrnoError(errnoOf(error));
        }
        if (debugEnabled()) {
            process.stderr.write(`wrote filename: "${filepath}" (${length})\n`);
        }
    }
}
