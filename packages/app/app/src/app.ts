import {
    type Hex,
    decodeAdvance,
    encodeCallVoucher,
    encodeErc20Transfer,
    encodeErc721Transfer,
    encodeErc1155BatchTransfer,
    encodeErc1155Transfer,
    encodeNotice,
    zeroHash,
} from "@deroll/codec";
import type {
    Advance,
    AdvanceRequestHandler,
    App,
    AppOptions,
    CallVoucher,
    Erc20Transfer,
    Erc721Transfer,
    Erc1155BatchTransfer,
    Erc1155Transfer,
    InspectRequestHandler,
    Notice,
} from "@deroll/core";
import { Rollup, RollupError } from "@deroll/rollup";
import { Hex as OxHex } from "ox";

export class NativeApp implements App {
    private options: AppOptions;
    private advanceHandlers: AdvanceRequestHandler[];
    private inspectHandlers: InspectRequestHandler[];
    private rollup: Rollup;
    private appContext: Hex;

    constructor(options?: AppOptions) {
        this.options = options ?? {};
        this.appContext = this.options.appContext ?? zeroHash;
        this.advanceHandlers = [];
        this.inspectHandlers = [];

        // open the rollup device
        this.rollup = new Rollup();
    }

    public stop(): void {
        this.rollup.close();
    }

    public createNotice(notice: Notice): number {
        return this.rollup.emitOutput(
            encodeNotice({
                appContext: notice.appContext ?? this.appContext,
                payload: notice.payload,
            }),
        );
    }

    public createReport(payload: Hex): void {
        this.rollup.emitReport(payload);
    }

    public createCallVoucher(voucher: CallVoucher): number {
        return this.rollup.emitOutput(
            encodeCallVoucher({
                ...voucher,
                appContext: voucher.appContext ?? this.appContext,
            }),
        );
    }

    public createErc20Transfer(transfer: Erc20Transfer): number {
        return this.rollup.emitOutput(
            encodeErc20Transfer({
                ...transfer,
                appContext: transfer.appContext ?? this.appContext,
            }),
        );
    }

    public createErc721Transfer(transfer: Erc721Transfer): number {
        return this.rollup.emitOutput(
            encodeErc721Transfer({
                ...transfer,
                appContext: transfer.appContext ?? this.appContext,
            }),
        );
    }

    public createErc1155Transfer(transfer: Erc1155Transfer): number {
        return this.rollup.emitOutput(
            encodeErc1155Transfer({
                ...transfer,
                appContext: transfer.appContext ?? this.appContext,
            }),
        );
    }

    public createErc1155BatchTransfer(transfer: Erc1155BatchTransfer): number {
        return this.rollup.emitOutput(
            encodeErc1155BatchTransfer({
                ...transfer,
                appContext: transfer.appContext ?? this.appContext,
            }),
        );
    }

    public createOutput(payload: Hex): number {
        return this.rollup.emitOutput(payload);
    }

    public registerException(payload: Hex): void {
        this.rollup.emitException(payload);
    }

    private handleAdvance = async (data: Advance): Promise<boolean> => {
        // rejected unless some handler accepts the request
        let accepted = false;

        // present the input to all handlers
        for (const handler of this.advanceHandlers) {
            try {
                if (await handler(data)) {
                    if (!this.options.broadcastAdvanceRequests) {
                        // not broadcast, accept immediately
                        return true;
                    }

                    // else, store the result, and return when all handlers have been called
                    accepted = true;
                }
                // handler rejected, just continue
            } catch (e) {
                // one of the handlers raised an exception, just log it
                // the input is rejected if no handler accepts it
                console.error(e);
            }
        }
        return accepted;
    };

    private handleInspect = async (payload: Hex): Promise<void> => {
        // present the query to all handlers
        for (const handler of this.inspectHandlers) {
            try {
                await handler(payload);
            } catch (e) {
                console.error(e);
            }
        }
    };

    public addAdvanceHandler(handler: AdvanceRequestHandler): void {
        this.advanceHandlers.push(handler);
    }

    public addInspectHandler(handler: InspectRequestHandler): void {
        this.inspectHandlers.push(handler);
    }

    async start() {
        // set to true if there is a CMT_INPUTS env var defined
        const hostMode = !!process.env.CMT_INPUTS;

        let accept = true;

        // loop forever
        for (;;) {
            let request: ReturnType<Rollup["waitForInput"]>;
            try {
                request = this.rollup.waitForInput({ accept });
            } catch (e: unknown) {
                if (
                    e instanceof Error &&
                    /unknown request type/.test(e.message)
                ) {
                    // forward-compatibility: skip machine extensions we don't know
                    console.warn("ignoring request of unknown type");
                    accept = true;
                    continue;
                }
                if (e instanceof RollupError && hostMode && e.errno === -61) {
                    // -ENODATA from the mock: inputs exhausted, exit gracefully
                    break;
                }
                if (e instanceof RollupError && hostMode && e.errno === -38) {
                    // -ENOSYS: the mock cannot revert rejected inputs; it also
                    // swallows the following queued input in the process
                    console.warn(
                        "libcmt mock cannot revert a rejected input; continuing",
                    );
                    accept = true;
                    continue;
                }
                throw e;
            }

            switch (request.type) {
                case "advance": {
                    try {
                        const advance = decodeAdvance(
                            OxHex.fromBytes(request.payload),
                        );
                        accept = await this.handleAdvance(advance);
                    } catch (e) {
                        // undecodable input: report the error and reject
                        console.error(e);
                        this.rollup.emitReport(OxHex.fromString(String(e)));
                        accept = false;
                    }
                    break;
                }
                case "inspect": {
                    await this.handleInspect(OxHex.fromBytes(request.payload));
                    accept = true;
                    break;
                }
            }
        }
    }
}
