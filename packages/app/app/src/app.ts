import { Rollup, RollupError } from "@cartesi/rollup";
import { constants } from "node:os";
import type {
    AdvanceRequestHandler,
    App,
    AppOptions,
    DelegateCallVoucher,
    Exception,
    InspectRequestHandler,
    Notice,
    Report,
    RequestHandlerResult,
    Voucher,
} from "@deroll/core";

// libcmt's mock IO driver reports ENODATA once the inputs listed in CMT_INPUTS
// are exhausted. Its numeric value is platform-specific (61 on Linux, 96 on
// macOS), so read it from node instead of hardcoding it.
const ENODATA = constants.errno.ENODATA;

export class NativeApp implements App {
    private options: AppOptions;
    private advanceHandlers: AdvanceRequestHandler[];
    private inspectHandlers: InspectRequestHandler[];
    private rollup: Rollup;

    constructor(options?: AppOptions) {
        this.options = options || {};
        this.advanceHandlers = [];
        this.inspectHandlers = [];

        // create Rollup instance
        this.rollup = new Rollup();
    }

    // @cartesi/rollup reports output indices as bigint (the uint64 libcmt
    // returns); the App interface exposes them as number
    public async createNotice(notice: Notice): Promise<number> {
        return Number(this.rollup.emitNotice(notice.payload));
    }

    public async createReport(report: Report): Promise<void> {
        this.rollup.emitReport(report.payload);
    }

    public async createVoucher(voucher: Voucher): Promise<number> {
        return Number(this.rollup.emitVoucher(voucher));
    }

    public async createDelegateCallVoucher(
        voucher: DelegateCallVoucher,
    ): Promise<number> {
        return Number(this.rollup.emitDelegateCallVoucher(voucher));
    }

    public async registerException(exception: Exception): Promise<void> {
        this.rollup.emitException(exception.payload);
    }

    private handleAdvance: AdvanceRequestHandler = async (data) => {
        // initialize final result as reject, which is the case if no handler accepts the request
        let finalResult: RequestHandlerResult = "reject";

        // present the input to all handlers
        for (const handler of this.advanceHandlers) {
            try {
                const result = await handler(data);
                if (result === "accept") {
                    if (!this.options.broadcastAdvanceRequests) {
                        // not broadcast, return accept immediately
                        return result;
                    }

                    // else, store the result, and return when all handlers have been called
                    finalResult = result;
                }
                // here result is "reject", just continue
            } catch (e) {
                // one of the handlers raised an exception, just log it
                // it will return "reject" if no handler accepts the request
                console.error(e);
            }
        }
        return finalResult;
    };

    private handleInspect: InspectRequestHandler = async (data) => {
        // present the input to all handlers
        for (const handler of this.inspectHandlers) {
            try {
                await handler(data);
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

        let status: RequestHandlerResult = "accept";

        // loop forever
        while (true) {
            try {
                const request = this.rollup.finish({
                    accept: status === "accept",
                });
                switch (request.type) {
                    case "advance": {
                        const { payload, type, ...metadata } = request;
                        status = await this.handleAdvance({
                            metadata,
                            payload,
                        });
                        break;
                    }
                    case "inspect": {
                        await this.handleInspect({ payload: request.payload });
                        break;
                    }
                }
            } catch (e: unknown) {
                if (e instanceof RollupError) {
                    if (hostMode && e.errno === -ENODATA) {
                        // no more mock inputs to read, exit gracefully
                        break;
                    }
                }
                throw e;
            }
        }
    }
}
