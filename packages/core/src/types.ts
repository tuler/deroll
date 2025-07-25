import type { components } from "./schema";

export type RollupRequest = components["schemas"]["RollupRequest"];
export type RequestType = RollupRequest["request_type"];
export type RequestData = RollupRequest["data"];
export type AdvanceRequestData = components["schemas"]["Advance"];
export type InspectRequestData = components["schemas"]["Inspect"];
export type RequestMetadata = components["schemas"]["Metadata"];
export type RequestHandlerResult = components["schemas"]["Finish"]["status"];
export type Notice = components["schemas"]["Notice"];
export type Payload = components["schemas"]["Payload"];
export type Report = components["schemas"]["Report"];
export type Voucher = components["schemas"]["Voucher"];
export type DelegateCallVoucher = components["schemas"]["DelegateCallVoucher"];
export type Exception = components["schemas"]["Exception"];

export type NoticeResponse = components["schemas"]["IndexResponse"];
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type ReportResponse = Record<string, never>; // XXX: should probably be 204 (no content)
export type VoucherResponse = components["schemas"]["IndexResponse"];

export type InspectRequestHandler = (data: InspectRequestData) => Promise<void>;

export type AdvanceRequestHandler = (
    data: AdvanceRequestData,
) => Promise<RequestHandlerResult>;
