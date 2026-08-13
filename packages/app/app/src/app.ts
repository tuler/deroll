import { Rollup, RollupError } from "@cartesi/rollup";
import { constants } from "node:os";
import type {
    AdvanceRequest,
    AdvanceRequestHandler,
    App,
    AppOptions,
    BytesLike,
    DelegateCallVoucher,
    InspectRequest,
    InspectRequestHandler,
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

    public createNotice(payload: BytesLike): bigint {
        return this.rollup.emitNotice(payload);
    }

    public createReport(payload: BytesLike): void {
        this.rollup.emitReport(payload);
    }

    public createVoucher(voucher: Voucher): bigint {
        return this.rollup.emitVoucher(voucher);
    }

    public createDelegateCallVoucher(voucher: DelegateCallVoucher): bigint {
        return this.rollup.emitDelegateCallVoucher(voucher);
    }

    public registerException(payload: BytesLike): void {
        this.rollup.emitException(payload);
    }

    /**
     * A handler blew up, so the request could not be processed: report the
     * failure and reject. Reports survive a rejection, so this is what makes
     * the error observable from outside the machine — rather than only on
     * stderr, inside a guest nobody is tailing.
     */
    private reportFailure(e: unknown): void {
        console.error(e);
        const message = e instanceof Error ? (e.stack ?? e.message) : String(e);
        try {
            this.rollup.emitReport(Buffer.from(message, "utf8"));
        } catch (reportError) {
            // emitting the report can itself fail (e.g. payload too large);
            // never let that take down the request loop
            console.error(reportError);
        }
    }

    private handleAdvance = async (
        request: AdvanceRequest,
    ): Promise<RequestHandlerResult> => {
        // initialize final result as reject, which is the case if no handler accepts the request
        let finalResult: RequestHandlerResult = "reject";

        // present the input to all handlers
        for (const handler of this.advanceHandlers) {
            try {
                const result = await handler(request);
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
                // a handler raised: the input is not processable, so reject the
                // whole request rather than letting later handlers write state
                // on top of a partially applied one
                this.reportFailure(e);
                return "reject";
            }
        }
        return finalResult;
    };

    private handleInspect = async (
        request: InspectRequest,
    ): Promise<RequestHandlerResult> => {
        // present the query to all handlers
        for (const handler of this.inspectHandlers) {
            try {
                await handler(request);
            } catch (e) {
                this.reportFailure(e);
                return "reject";
            }
        }
        return "accept";
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
                        status = await this.handleAdvance(request);
                        break;
                    }
                    case "inspect": {
                        status = await this.handleInspect(request);
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
