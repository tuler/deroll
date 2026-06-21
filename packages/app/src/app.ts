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
import { Rollup } from "@tuler/node-libcmt";

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

    public async createNotice(notice: Notice): Promise<number> {
        return this.rollup.emitNotice(notice.payload);
    }

    public async createReport(report: Report): Promise<void> {
        this.rollup.emitReport(report.payload);
    }

    public async createVoucher(voucher: Voucher): Promise<number> {
        return this.rollup.emitVoucher(voucher);
    }

    public async createDelegateCallVoucher(
        voucher: DelegateCallVoucher,
    ): Promise<number> {
        return this.rollup.emitDelegateCallVoucher(voucher);
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
        let status: RequestHandlerResult = "accept";
        while (true) {
            const request = this.rollup.finish({ accept: status === "accept" });
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
        }
    }
}
