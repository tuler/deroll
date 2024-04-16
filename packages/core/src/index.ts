import {
    AdvanceRequestHandler,
    InspectRequestHandler,
    Notice,
    Report,
    Voucher,
} from "./types";

export * from "./types";
export * from "./schema";

export interface App {
    start(): Promise<void>;
    createNotice(request: Notice): Promise<number>;
    createReport(request: Report): Promise<void>;
    createVoucher(request: Voucher): Promise<number>;
    addAdvanceHandler(handler: AdvanceRequestHandler): void;
    addInspectHandler(handler: InspectRequestHandler): void;
}
