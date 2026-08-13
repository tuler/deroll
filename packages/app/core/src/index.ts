import type {
    AdvanceRequestHandler,
    BytesLike,
    DelegateCallVoucher,
    InspectRequestHandler,
    Voucher,
} from "./types.js";

export * from "./types.js";

export type AppOptions = {
    /**
     * Present each advance request to every registered handler instead of
     * stopping at the first one that accepts. The request is accepted if any
     * handler accepted. Defaults to `false`.
     */
    broadcastAdvanceRequests?: boolean;
};

/**
 * The composition seam of deroll: a rollup loop that many independently
 * authored handlers can plug into, plus the outputs those handlers emit.
 *
 * Output methods are synchronous, mirroring the binding — emitting an output
 * is a device write, not I/O the event loop can interleave with.
 */
export interface App {
    start(): Promise<void>;
    /** Emit a notice. Returns the output index. */
    createNotice(payload: BytesLike): bigint;
    /** Emit a report. Reports are not indexed, so nothing is returned. */
    createReport(payload: BytesLike): void;
    /** Emit a voucher. Returns the output index. */
    createVoucher(voucher: Voucher): bigint;
    /** Emit a delegate call voucher. Returns the output index. */
    createDelegateCallVoucher(voucher: DelegateCallVoucher): bigint;
    /** Signal that the request could not be processed, halting the machine. */
    registerException(payload: BytesLike): void;
    addAdvanceHandler(handler: AdvanceRequestHandler): void;
    addInspectHandler(handler: InspectRequestHandler): void;
}
