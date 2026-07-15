// The rollup protocol, ported from libcmt's rollup.c on top of an IoDriver:
// finish/accept semantics, output emission with the outputs merkle tree, and
// the EVM-ABI framing of inputs and outputs.
import fs from "node:fs";
import {
    ADDRESS_LENGTH,
    U256_LENGTH,
    decodeEvmAdvance,
    encodeDelegateCallVoucher,
    encodeNotice,
    encodeVoucher,
} from "./abi.js";
import { CMIO_DEVICE, CmioDriver } from "./device.js";
import { EINVAL, ENOBUFS, RollupError, errnoOf } from "./errors.js";
import {
    HTIF_DEVICE_YIELD,
    HTIF_YIELD_AUTOMATIC_REASON_PROGRESS,
    HTIF_YIELD_AUTOMATIC_REASON_TX_OUTPUT,
    HTIF_YIELD_AUTOMATIC_REASON_TX_REPORT,
    HTIF_YIELD_CMD_AUTOMATIC,
    HTIF_YIELD_CMD_MANUAL,
    HTIF_YIELD_MANUAL_REASON_RX_ACCEPTED,
    HTIF_YIELD_MANUAL_REASON_RX_REJECTED,
    HTIF_YIELD_MANUAL_REASON_TX_EXCEPTION,
    HTIF_YIELD_REASON_ADVANCE,
    type IoDriver,
    type YieldRequest,
} from "./io.js";
import { MERKLE_STATE_LENGTH, Merkle } from "./merkle.js";
import { MockDriver } from "./mock.js";

/** 0x-prefixed hex string. Compatible with viem's `Hex` and `Address`. */
export type Hex = `0x${string}`;

/** Bytes input: 0x-prefixed hex string, Buffer or Uint8Array. */
export type BytesLike = Hex | Uint8Array;

/** EVM address: 0x-prefixed hex string (20 bytes), Buffer or Uint8Array. */
export type AddressLike = Hex | Uint8Array;

/** Unsigned 256-bit value: bigint, number, or 32 bytes (hex string/Uint8Array). */
export type U256Like = bigint | number | Hex | Uint8Array;

export interface AdvanceRequest {
    type: "advance";
    /** Network chain id. */
    chainId: bigint;
    /** Application contract address (0x-prefixed hex). */
    appContract: Hex;
    /** Input sender address (0x-prefixed hex). */
    msgSender: Hex;
    /** Block number of this input. */
    blockNumber: bigint;
    /** Block timestamp of this input (UNIX epoch seconds). */
    blockTimestamp: bigint;
    /** RANDAO mix of the post beacon state of the previous block. */
    prevRandao: bigint;
    /** Input index relative to all inputs ever sent to the application. */
    index: bigint;
    /** Input payload. */
    payload: Buffer;
}

export interface InspectRequest {
    type: "inspect";
    /** Inspect query payload. */
    payload: Buffer;
}

export type RollupRequest = AdvanceRequest | InspectRequest;

export interface GioResponse {
    responseCode: number;
    responseData: Buffer;
}

/** Arguments for {@link Rollup.emitVoucher}. Encoded on-chain as `Voucher(address,uint256,bytes)`. */
export interface Voucher {
    /** Address the voucher executes against (20 bytes): an EOA for transfers, a contract for calls. */
    destination: AddressLike;
    /** Amount of wei sent with the execution. Default: `0n`. */
    value?: U256Like;
    /** EVM calldata to execute at `destination`. Default: empty (plain transfer). */
    payload?: BytesLike;
}

/** Arguments for {@link Rollup.emitDelegateCallVoucher}. Encoded on-chain as `DelegateCallVoucher(address,bytes)`. */
export interface DelegateCallVoucher {
    /** Contract whose code runs in the application contract's storage context (20 bytes). */
    destination: AddressLike;
    /** Calldata for the delegate call. Default: empty. There is no `value` — `DELEGATECALL` cannot transfer ether. */
    payload?: BytesLike;
}

export interface RunHandlers {
    advance?: (
        request: AdvanceRequest,
        rollup: Rollup,
    ) => boolean | undefined | Promise<boolean | undefined>;
    inspect?: (
        request: InspectRequest,
        rollup: Rollup,
    ) => boolean | undefined | Promise<boolean | undefined>;
}

export interface RollupOptions {
    /**
     * IO driver to use. `"cmio"` is the real device (needs the native shim),
     * `"mock"` the pure-JS file-based mock, or any custom {@link IoDriver}.
     * Default: `"cmio"` when `/dev/cmio` exists, `"mock"` otherwise.
     */
    driver?: IoDriver | "mock" | "cmio";
}

const EMPTY = Buffer.alloc(0);

function toBytes(value: unknown, name: string): Buffer {
    if (typeof value === "string") {
        if (!/^0x(?:[0-9a-fA-F]{2})*$/.test(value)) {
            throw new TypeError(
                `${name} must be a 0x-prefixed hex string, Buffer or Uint8Array`,
            );
        }
        return Buffer.from(value.slice(2), "hex");
    }
    if (value instanceof Uint8Array) {
        return Buffer.isBuffer(value)
            ? value
            : Buffer.from(value.buffer, value.byteOffset, value.byteLength);
    }
    throw new TypeError(
        `${name} must be a 0x-prefixed hex string, Buffer or Uint8Array`,
    );
}

function toAddress(value: unknown, name: string): Buffer {
    const bytes = toBytes(value, name);
    if (bytes.length !== ADDRESS_LENGTH) {
        throw new TypeError(`${name} must be ${ADDRESS_LENGTH} bytes long`);
    }
    return bytes;
}

function toU256(value: unknown, name: string): Buffer {
    if (typeof value === "bigint" || typeof value === "number") {
        let v = BigInt(value);
        if (v < 0n || v >= 1n << 256n) {
            throw new RangeError(
                `${name} must fit in an unsigned 256-bit integer`,
            );
        }
        const bytes = Buffer.alloc(U256_LENGTH);
        for (let i = U256_LENGTH - 1; i >= 0 && v > 0n; i--) {
            bytes[i] = Number(v & 0xffn);
            v >>= 8n;
        }
        return bytes;
    }
    const bytes = toBytes(value, name);
    if (bytes.length !== U256_LENGTH) {
        throw new TypeError(`${name} must be ${U256_LENGTH} bytes long`);
    }
    return bytes;
}

const toHex = (bytes: Buffer): Hex => `0x${bytes.toString("hex")}`;

const defaultDriver = (): IoDriver =>
    fs.existsSync(CMIO_DEVICE) ? new CmioDriver() : new MockDriver();

export class Rollup {
    #driver: IoDriver;
    #merkle = new Merkle();
    #open = true;
    // root hash sent on finish, recomputed only when outputs were emitted
    #finishLeafCount = -1n;
    #finishRootHash: Buffer = Buffer.alloc(U256_LENGTH);
    // length of the data the emulator placed in rx on the last yield
    #fromhostData = 0;

    /**
     * Opens the rollup device and initializes the outputs merkle tree.
     * Inside a Cartesi Machine this talks to /dev/cmio (through the native
     * shim); elsewhere it uses the pure-JS mock, driven by the CMT_INPUTS and
     * CMT_DEBUG environment variables.
     */
    constructor(options: RollupOptions = {}) {
        const driver = options.driver;
        try {
            if (driver === undefined) {
                this.#driver = defaultDriver();
            } else if (driver === "mock") {
                this.#driver = new MockDriver();
            } else if (driver === "cmio") {
                this.#driver = new CmioDriver();
            } else {
                this.#driver = driver;
            }
        } catch (error) {
            throw new RollupError("cmt_rollup_init", errnoOf(error), error);
        }
    }

    #assertOpen(): void {
        if (!this.#open) {
            throw new Error("rollup is closed");
        }
    }

    #yield(syscall: string, rr: YieldRequest): YieldRequest {
        try {
            return this.#driver.yield(rr);
        } catch (error) {
            throw new RollupError(syscall, errnoOf(error), error);
        }
    }

    /**
     * Accept or reject the previous request and wait for the next one.
     * Synchronous on purpose: on the real device the call yields the machine,
     * pausing the whole guest, so nothing else could run concurrently anyway.
     */
    finish({ accept = true }: { accept?: boolean } = {}): RollupRequest {
        this.#assertOpen();
        let reply: YieldRequest;
        if (accept) {
            if (this.#finishLeafCount !== this.#merkle.leafCount) {
                this.#finishRootHash = this.#merkle.getRootHash();
            }
            this.#finishRootHash.copy(this.#driver.tx);
            reply = this.#yield("cmt_rollup_finish", {
                dev: HTIF_DEVICE_YIELD,
                cmd: HTIF_YIELD_CMD_MANUAL,
                reason: HTIF_YIELD_MANUAL_REASON_RX_ACCEPTED,
                data: U256_LENGTH,
            });
            this.#finishLeafCount = this.#merkle.leafCount;
        } else {
            // On the real device this does not return: the machine reverts to
            // its state before the input. The mock loads the next input, which
            // we return like an accept (io-mock.c leaves this undefined).
            reply = this.#yield("cmt_rollup_finish", {
                dev: HTIF_DEVICE_YIELD,
                cmd: HTIF_YIELD_CMD_MANUAL,
                reason: HTIF_YIELD_MANUAL_REASON_RX_REJECTED,
                data: 0,
            });
        }
        this.#fromhostData = reply.data;
        const input = this.#driver.rx.subarray(0, this.#fromhostData);
        if (reply.reason === HTIF_YIELD_REASON_ADVANCE) {
            let advance: ReturnType<typeof decodeEvmAdvance>;
            try {
                advance = decodeEvmAdvance(input);
            } catch (error) {
                // rollup.c maps any decode failure to -ENOBUFS
                throw new RollupError(
                    "cmt_rollup_read_advance_state",
                    ENOBUFS,
                    error,
                );
            }
            return {
                type: "advance",
                chainId: advance.chainId,
                appContract: toHex(advance.appContract),
                msgSender: toHex(advance.msgSender),
                blockNumber: advance.blockNumber,
                blockTimestamp: advance.blockTimestamp,
                prevRandao: BigInt(toHex(advance.prevRandao)),
                index: advance.index,
                payload: advance.payload,
            };
        }
        return { type: "inspect", payload: Buffer.from(input) };
    }

    /** Send an output frame and record it in the outputs merkle tree. */
    #emitOutput(syscall: string, frame: Buffer): number {
        if (frame.length > this.#driver.tx.length) {
            throw new RollupError(syscall, ENOBUFS);
        }
        frame.copy(this.#driver.tx);
        this.#yield(syscall, {
            dev: HTIF_DEVICE_YIELD,
            cmd: HTIF_YIELD_CMD_AUTOMATIC,
            reason: HTIF_YIELD_AUTOMATIC_REASON_TX_OUTPUT,
            data: frame.length,
        });
        const index = this.#merkle.leafCount;
        try {
            this.#merkle.pushBackData(frame);
        } catch (error) {
            throw new RollupError(syscall, errnoOf(error), error);
        }
        return Number(index);
    }

    /** Emit a voucher (Voucher(address,uint256,bytes)). Returns the output index. */
    emitVoucher({ destination, value = 0n, payload = EMPTY }: Voucher): number {
        this.#assertOpen();
        const frame = encodeVoucher(
            toAddress(destination, "destination"),
            toU256(value, "value"),
            toBytes(payload, "payload"),
        );
        return this.#emitOutput("cmt_rollup_emit_voucher", frame);
    }

    /** Emit a delegate call voucher (DelegateCallVoucher(address,bytes)). Returns the output index. */
    emitDelegateCallVoucher({
        destination,
        payload = EMPTY,
    }: DelegateCallVoucher): number {
        this.#assertOpen();
        const frame = encodeDelegateCallVoucher(
            toAddress(destination, "destination"),
            toBytes(payload, "payload"),
        );
        return this.#emitOutput("cmt_rollup_emit_delegate_call_voucher", frame);
    }

    /** Emit a notice (Notice(bytes)). Returns the output index. */
    emitNotice(payload: BytesLike): number {
        this.#assertOpen();
        const frame = encodeNotice(toBytes(payload, "payload"));
        return this.#emitOutput("cmt_rollup_emit_notice", frame);
    }

    /** Emit a report (raw bytes, not part of the outputs merkle tree). */
    emitReport(payload: BytesLike): void {
        this.#assertOpen();
        const bytes = toBytes(payload, "payload");
        if (bytes.length > this.#driver.tx.length) {
            throw new RollupError("cmt_rollup_emit_report", ENOBUFS);
        }
        bytes.copy(this.#driver.tx);
        this.#yield("cmt_rollup_emit_report", {
            dev: HTIF_DEVICE_YIELD,
            cmd: HTIF_YIELD_CMD_AUTOMATIC,
            reason: HTIF_YIELD_AUTOMATIC_REASON_TX_REPORT,
            data: bytes.length,
        });
    }

    /** Emit an exception, signaling that the request could not be processed. */
    emitException(payload: BytesLike): void {
        this.#assertOpen();
        const bytes = toBytes(payload, "payload");
        if (bytes.length > this.#driver.tx.length) {
            throw new RollupError("cmt_rollup_emit_exception", ENOBUFS);
        }
        bytes.copy(this.#driver.tx);
        this.#yield("cmt_rollup_emit_exception", {
            dev: HTIF_DEVICE_YIELD,
            cmd: HTIF_YIELD_CMD_MANUAL,
            reason: HTIF_YIELD_MANUAL_REASON_TX_EXCEPTION,
            data: bytes.length,
        });
    }

    /** Report progress of the current request (raw uint32 value). */
    progress(value: number): void {
        this.#assertOpen();
        if (typeof value !== "number") {
            throw new TypeError("progress must be a number");
        }
        this.#yield("cmt_rollup_progress", {
            dev: HTIF_DEVICE_YIELD,
            cmd: HTIF_YIELD_CMD_AUTOMATIC,
            reason: HTIF_YIELD_AUTOMATIC_REASON_PROGRESS,
            data: value >>> 0,
        });
    }

    /** Perform a generic IO request to the given domain. */
    gio({ domain, id }: { domain: number; id: BytesLike }): GioResponse {
        this.#assertOpen();
        if (typeof domain !== "number") {
            throw new TypeError("domain must be a number");
        }
        if (domain < 0 || domain > 0xffff) {
            throw new RangeError("domain must fit in 16 bits");
        }
        const idBytes = toBytes(id, "id");
        if (idBytes.length > this.#driver.tx.length) {
            throw new RollupError("cmt_gio_request", ENOBUFS);
        }
        idBytes.copy(this.#driver.tx);
        const reply = this.#yield("cmt_gio_request", {
            dev: HTIF_DEVICE_YIELD,
            cmd: HTIF_YIELD_CMD_MANUAL,
            reason: domain,
            data: idBytes.length,
        });
        this.#fromhostData = reply.data;
        return {
            responseCode: reply.reason,
            responseData: Buffer.from(this.#driver.rx.subarray(0, reply.data)),
        };
    }

    /** Load the outputs merkle tree state from a file (cmt_merkle_t layout). */
    loadMerkle(file: string): void {
        this.#assertOpen();
        let data: Buffer;
        try {
            data = fs.readFileSync(String(file));
        } catch (error) {
            throw new RollupError(
                "cmt_rollup_load_merkle",
                errnoOf(error),
                error,
            );
        }
        if (data.length !== MERKLE_STATE_LENGTH) {
            throw new RollupError("cmt_rollup_load_merkle", EINVAL);
        }
        this.#merkle.load(data);
    }

    /** Store the outputs merkle tree state to a file (cmt_merkle_t layout). */
    saveMerkle(file: string): void {
        this.#assertOpen();
        try {
            fs.writeFileSync(String(file), this.#merkle.save());
        } catch (error) {
            throw new RollupError(
                "cmt_rollup_save_merkle",
                errnoOf(error),
                error,
            );
        }
    }

    /** Reset the outputs merkle tree to pristine state. */
    resetMerkle(): void {
        this.#assertOpen();
        this.#merkle.reset();
    }

    /** Release the underlying device. Further calls throw. */
    close(): void {
        if (this.#open) {
            this.#open = false;
            this.#driver.close();
        }
    }

    /**
     * Convenience request loop. Handlers receive (request, rollup), may be
     * async, and accept the request unless they return false (exceptions
     * reject and are reported). Runs until finish fails (e.g. mock inputs are
     * exhausted, or the device is closed), which rejects with that error.
     */
    async run(handlers: RunHandlers = {}): Promise<never> {
        let accept = true;
        for (;;) {
            const request = this.finish({ accept });
            try {
                if (request.type === "advance") {
                    accept = handlers.advance
                        ? (await handlers.advance(request, this)) !== false
                        : false;
                } else {
                    accept = handlers.inspect
                        ? (await handlers.inspect(request, this)) !== false
                        : false;
                }
            } catch (error) {
                accept = false;
                this.emitReport(
                    Buffer.from(String((error as Error)?.stack ?? error)),
                );
            }
        }
    }
}
