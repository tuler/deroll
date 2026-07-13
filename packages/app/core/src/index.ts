import type {
    Advance,
    CallVoucher,
    Erc20Transfer,
    Erc721Transfer,
    Erc1155BatchTransfer,
    Erc1155Transfer,
    Hex,
    Notice,
} from "@deroll/codec";

// The request/output vocabulary of a deroll application is the codec's:
// bytes and addresses are 0x-hex strings, numbers are bigint.
export type {
    Advance,
    CallVoucher,
    Erc20Transfer,
    Erc721Transfer,
    Erc1155BatchTransfer,
    Erc1155Transfer,
    Hex,
    Notice,
} from "@deroll/codec";

/**
 * Handles a decoded advance request (a state-changing input). Returns whether
 * the input is accepted; on `false` the machine state is reverted.
 */
export type AdvanceRequestHandler = (data: Advance) => Promise<boolean>;

/**
 * Handles an inspect request (a read-only query), receiving the raw,
 * application-defined query payload. Can only produce reports.
 */
export type InspectRequestHandler = (payload: Hex) => Promise<void>;

export type AppOptions = {
    /**
     * When true, every advance handler runs for every input and the input is
     * accepted if any handler accepted it. When false (default), the first
     * handler to accept short-circuits the rest.
     */
    broadcastAdvanceRequests?: boolean;

    /**
     * Default `appContext` (a free-form `bytes32`) stamped on every output the
     * app creates. A per-output `appContext` still wins. Defaults to the zero
     * hash.
     */
    appContext?: Hex;
};

// The output methods are synchronous: they map directly to the native
// binding, which emits outputs without any I/O to wait on.
export interface App {
    start(): Promise<void>;

    /** Release the rollup device. Further calls throw. */
    stop(): void;

    /** Emit a `Notice(bytes32,bytes)` output. Returns the output index. */
    createNotice(notice: Notice): number;

    /** Emit a report (raw bytes, not provable). */
    createReport(payload: Hex): void;

    /** Emit a `CallVoucher(address,bytes32,uint256,bytes)` output. Returns the output index. */
    createCallVoucher(voucher: CallVoucher): number;

    /** Emit an `Erc20Transfer` output. Returns the output index. */
    createErc20Transfer(transfer: Erc20Transfer): number;

    /** Emit an `Erc721Transfer` output. Returns the output index. */
    createErc721Transfer(transfer: Erc721Transfer): number;

    /** Emit an `Erc1155Transfer` output. Returns the output index. */
    createErc1155Transfer(transfer: Erc1155Transfer): number;

    /** Emit an `Erc1155BatchTransfer` output. Returns the output index. */
    createErc1155BatchTransfer(transfer: Erc1155BatchTransfer): number;

    /**
     * Emit an already EVM-ABI encoded output (e.g. produced with
     * `@deroll/codec` encoders). Returns the output index.
     */
    createOutput(payload: Hex): number;

    /** Signal that the current request could not be processed at all. */
    registerException(payload: Hex): void;

    addAdvanceHandler(handler: AdvanceRequestHandler): void;
    addInspectHandler(handler: InspectRequestHandler): void;
}
