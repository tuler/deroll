import { components } from "./schema";

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

export type NoticeResponse = components["schemas"]["IndexResponse"];
export type ReportResponse = {}; // XXX: should probably be 204 (no content)
export type VoucherResponse = components["schemas"]["IndexResponse"];

export type InspectRequestHandler = (data: InspectRequestData) => Promise<void>;

export type AdvanceRequestHandler = (
    data: AdvanceRequestData,
) => Promise<RequestHandlerResult>;
