type Proof = {
    context: string;
    validity: {
        inputIndexWithinEpoch: number;
        outputIndexWithinInput: number;
        outputHashesRootHash: string;
        vouchersEpochRootHash: string;
        noticesEpochRootHash: string;
        machineStateHash: string;
        outputHashInOutputHashesSiblings: string[];
        outputHashesInEpochSiblings: string[];
    };
};
export type InputStatus =
    | "UNPROCESSED"
    | "ACCEPTED"
    | "REJECTED"
    | "EXCEPTION"
    | "MACHINE_HALTED"
    | "CYCLE_LIMIT_EXCEEDED"
    | "TIME_LIMIT_EXCEEDED"
    | "PAYLOAD_LENGTH_LIMIT_EXCEEDED";
export type InputNumberParams = [];
export type InputNumberReturnType = number;
export type GetInputParams = [number];
export type GetInputReturnType = {
    blockNumber: string;
    msgSender: string;
    payload: string;
    status: InputStatus;
    timestamp: string;
};
type OutputCountParams = [number];
type OutputCountReturnType = number;
export type GetNoticeCountParams = OutputCountParams;
export type GetNoticeCountReturnType = OutputCountReturnType;
export type GetReportCountParams = OutputCountParams;
export type GetReportCountReturnType = OutputCountReturnType;
export type GetVoucherCountParams = OutputCountParams;
export type GetVoucherCountReturnType = OutputCountReturnType;
export type GetNoticeParams = [number, number];
export type GetNoticeReturnType = {
    payload: string;
    proof?: Proof | null;
};
export type GetReportParams = [number, number];
export type GetReportReturnType = { payload: string };
export type GetVoucherParams = [number, number];
export type GetVoucherReturnType = {
    destination: string;
    payload: string;
    proof?: Proof | null;
};
