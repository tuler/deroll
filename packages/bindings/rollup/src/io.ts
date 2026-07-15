// Low-level IO driver contract, mirroring libcmt's cmt_io_driver: a pair of
// 2MB tx/rx buffers shared with the emulator plus a single yield primitive
// that hands control back to it (see machine-guest-tools sys-utils/libcmt).

/** Yield device (HTIF). */
export const HTIF_DEVICE_YIELD = 2;

/** Yield commands. */
export const HTIF_YIELD_CMD_AUTOMATIC = 0;
export const HTIF_YIELD_CMD_MANUAL = 1;

/** Automatic yield reasons. */
export const HTIF_YIELD_AUTOMATIC_REASON_PROGRESS = 1;
export const HTIF_YIELD_AUTOMATIC_REASON_TX_OUTPUT = 2;
export const HTIF_YIELD_AUTOMATIC_REASON_TX_REPORT = 4;

/** Manual yield reasons. */
export const HTIF_YIELD_MANUAL_REASON_RX_ACCEPTED = 1;
export const HTIF_YIELD_MANUAL_REASON_RX_REJECTED = 2;
export const HTIF_YIELD_MANUAL_REASON_TX_EXCEPTION = 4;

/** Reply reasons for RX_ACCEPTED/RX_REJECTED. */
export const HTIF_YIELD_REASON_ADVANCE = 0;
export const HTIF_YIELD_REASON_INSPECT = 1;

/** A yield request/reply, the single primitive under the whole protocol. */
export interface YieldRequest {
    dev: number;
    cmd: number;
    reason: number;
    data: number;
}

/**
 * IO driver: what {@link Rollup} needs from the machine. Implementations:
 * {@link MockDriver} (pure JS, host testing) and {@link CmioDriver}
 * (/dev/cmio via a minimal native shim, inside the Cartesi Machine).
 */
export interface IoDriver {
    /** Transmit buffer, written by the application. */
    readonly tx: Buffer;
    /** Receive buffer, written by the emulator. */
    readonly rx: Buffer;
    /** Perform the yield in `rr` and return the reply. Throws {@link ErrnoError}. */
    yield(rr: YieldRequest): YieldRequest;
    /** Release the device. */
    close(): void;
}

/** Pack a yield request into the 64-bit HTIF tohost format. */
export const packYield = (rr: YieldRequest): bigint =>
    (BigInt(rr.dev & 0xff) << 56n) |
    (BigInt(rr.cmd & 0xff) << 48n) |
    (BigInt(rr.reason & 0xffff) << 32n) |
    BigInt(rr.data >>> 0);

/** Unpack a 64-bit HTIF fromhost value into a yield reply. */
export const unpackYield = (packed: bigint): YieldRequest => ({
    dev: Number((packed >> 56n) & 0xffn),
    cmd: Number((packed >> 48n) & 0xffn),
    reason: Number((packed >> 32n) & 0xffffn),
    data: Number(packed & 0xffff_ffffn),
});

export const debugEnabled = (): boolean => process.env.CMT_DEBUG !== undefined;

export const debugYield = (label: string, rr: YieldRequest): void => {
    if (debugEnabled()) {
        process.stderr.write(
            `${label} {\n\t.dev = ${rr.dev},\n\t.cmd = ${rr.cmd},\n\t.reason = ${rr.reason},\n\t.data = ${rr.data},\n};\n`,
        );
    }
};
