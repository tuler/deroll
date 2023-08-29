import createClient from "openapi-fetch";

import { paths } from "./schema";
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

export type AppOptions = {
    url: string;
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
    private advanceHandlers: AdvanceRequestHandler[];
    private inspectHandlers: InspectRequestHandler[];
    private POST;

    constructor(options: AppOptions) {
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
        try {
            // initialize final result as reject, which is the case if no handler accepts the request
            let finalResult: RequestHandlerResult = "reject";

            // present the input to all handlers
            for (const handler of this.advanceHandlers) {
                const result = await handler(data);
                if (result != "reject") {
                    finalResult = result;
                }
            }
            return finalResult;
        } catch (e) {
            console.error(e);
            return "reject";
        }
    };

    private handleInspect: InspectRequestHandler = async (data) => {
        try {
            // present the input to all handlers
            for (const handler of this.inspectHandlers) {
                await handler(data);
            }
        } catch (e) {
            console.error(e);
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
            });

            if (response.status == 200 && data) {
                switch (data.request_type) {
                    case "advance_state":
                        status = await this.handleAdvance(
                            data.data as AdvanceRequestData,
                        );
                        break;
                    case "inspect_state":
                        await this.handleInspect(
                            data.data as InspectRequestData,
                        );
                        break;
                }
            }
        }
    }
}
