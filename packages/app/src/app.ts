import createClient from "openapi-fetch";

import { paths, components } from "./schema";
import {
    Notice,
    Report,
    AdvanceRequestHandler,
    RequestHandlerResult,
    Voucher,
    AdvanceRequestData,
    InspectRequestHandler,
    InspectRequestData,
} from "./types";

type RollupsRequest = components["schemas"]["RollupRequest"];

export type AppOptions = {
    url: string;
    broadcastAdvanceRequests?: boolean;
};

export interface App {
    start(): Promise<void>;
    createNotice(request: Notice): Promise<number>;
    createReport(request: Report): Promise<void>;
    createVoucher(request: Voucher): Promise<number>;
    addAdvanceHandler(handler: AdvanceRequestHandler): void;
    addInspectHandler(handler: InspectRequestHandler): void;
}

export class AppImpl implements App {
    private options: AppOptions;
    private advanceHandlers: AdvanceRequestHandler[];
    private inspectHandlers: InspectRequestHandler[];
    private POST;

    constructor(options: AppOptions) {
        this.options = options;
        this.advanceHandlers = [];
        this.inspectHandlers = [];

        // create openapi typescript client
        const { POST } = createClient<paths>({ baseUrl: options.url });
        this.POST = POST;
    }

    public async createNotice(notice: Notice): Promise<number> {
        const { data, response } = await this.POST("/notice", {
            body: notice,
        });
        if (data) {
            return data.index;
        } else {
            throw new Error(response.statusText);
        }
    }

    public async createReport(report: Report): Promise<void> {
        const { response } = await this.POST("/report", {
            body: report,
        });
        if (!response.ok) {
            throw new Error(response.statusText);
        }
    }

    public async createVoucher(voucher: Voucher): Promise<number> {
        const { data, response } = await this.POST("/voucher", {
            body: voucher,
        });
        if (data) {
            return data.index;
        } else {
            throw new Error(response.statusText);
        }
    }

    private handleAdvance: AdvanceRequestHandler = async (data) => {
        // initialize final result as reject, which is the case if no handler accepts the request
        let finalResult: RequestHandlerResult = "reject";

        // present the input to all handlers
        for (const handler of this.advanceHandlers) {
            try {
                const result = await handler(data);
                if (result == "accept") {
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
            const { data, response } = await this.POST("/finish", {
                body: { status },
                parseAs: "text",
            });
            if (response.status == 200 && data) {
                const request = JSON.parse(data) as RollupsRequest;
                switch (request.request_type) {
                    case "advance_state":
                        status = await this.handleAdvance(
                            request.data as AdvanceRequestData,
                        );
                        break;
                    case "inspect_state":
                        await this.handleInspect(
                            request.data as InspectRequestData,
                        );
                        break;
                }
            } else if (response.status == 202) {
                // no rollup request available
            }
        }
    }
}
