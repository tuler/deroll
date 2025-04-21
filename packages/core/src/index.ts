import {
    AdvanceRequestHandler,
    DelegateCallVoucher,
    InspectRequestHandler,
    Notice,
    Report,
    Voucher,
} from "./types";

export * from "./schema";
export * from "./types";

export type AppOptions = {
    broadcastAdvanceRequests?: boolean;
};

export interface App {
    start(): Promise<void>;
    createNotice(request: Notice): Promise<number>;
    createReport(request: Report): Promise<void>;
    createVoucher(request: Voucher): Promise<number>;
    createDelegateCallVoucher(request: DelegateCallVoucher): Promise<number>;
    addAdvanceHandler(handler: AdvanceRequestHandler): void;
    addInspectHandler(handler: InspectRequestHandler): void;
}
