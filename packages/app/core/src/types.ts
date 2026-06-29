import type { Address, Hex } from "viem";

export type AdvanceRequestMetadata = {
    chainId: bigint;
    appContract: Address;
    msgSender: Address;
    blockNumber: bigint;
    blockTimestamp: bigint;
    prevRandao: bigint;
    index: bigint;
};

export type AdvanceRequestData = {
    metadata: AdvanceRequestMetadata;
    payload: Buffer;
};

export type InspectRequestData = {
    payload: Buffer;
};

export type RollupAdvanceRequest = {
    request_type: "advance_state";
    data: AdvanceRequestData;
};

export type RollupInspectRequest = {
    request_type: "inspect_state";
    data: InspectRequestData;
};
export type RollupRequest = RollupAdvanceRequest | RollupInspectRequest;

export type RequestType = RollupRequest["request_type"];
export type RequestData = AdvanceRequestData | InspectRequestData;
export type RequestMetadata = AdvanceRequestMetadata;
export type RequestHandlerResult = "accept" | "reject";
export type Payload = Hex | Uint8Array;
export type Notice = { payload: Payload };
export type Report = { payload: Payload };
export type Voucher = {
    destination: Address;
    value?: bigint;
    payload?: Hex;
};
export type DelegateCallVoucher = {
    destination: Address;
    payload?: Hex;
};
export type Exception = { payload: Payload };

export type NoticeResponse = { index: number };
export type ReportResponse = Record<string, never>; // XXX: should probably be 204 (no content)
export type VoucherResponse = { index: number };

export type InspectRequestHandler = (data: InspectRequestData) => Promise<void>;

export type AdvanceRequestHandler = (
    data: AdvanceRequestData,
) => Promise<RequestHandlerResult>;
