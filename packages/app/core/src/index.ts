import type {
    AdvanceRequestHandler,
    DelegateCallVoucher,
    InspectRequestHandler,
    Notice,
    Report,
    Voucher,
} from "./types.js";

export * from "./types.js";

export type AppOptions = {
    broadcastAdvanceRequests?: boolean;
};

export interface App {
    start(): Promise<void>;
    createNotice(request: Notice): Promise<bigint>;
    createReport(request: Report): Promise<void>;
    createVoucher(request: Voucher): Promise<bigint>;
    createDelegateCallVoucher(request: DelegateCallVoucher): Promise<bigint>;
    addAdvanceHandler(handler: AdvanceRequestHandler): void;
    addInspectHandler(handler: InspectRequestHandler): void;
}
