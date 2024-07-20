import {
    GetInputParams,
    GetInputReturnType,
    GetNoticeCountParams,
    GetNoticeCountReturnType,
    GetNoticeParams,
    GetNoticeReturnType,
    GetReportCountParams,
    GetReportCountReturnType,
    GetReportParams,
    GetReportReturnType,
    GetVoucherCountParams,
    GetVoucherCountReturnType,
    GetVoucherParams,
    GetVoucherReturnType,
    InputNumberParams,
    InputNumberReturnType,
} from "./types";

export type Methods = {
    cartesi_inputNumber(params: InputNumberParams): InputNumberReturnType;
    cartesi_getInput(params: GetInputParams): GetInputReturnType;
    cartesi_getNoticeCount(
        params: GetNoticeCountParams,
    ): GetNoticeCountReturnType;
    cartesi_getReportCount(
        params: GetReportCountParams,
    ): GetReportCountReturnType;
    cartesi_getVoucherCount(
        params: GetVoucherCountParams,
    ): GetVoucherCountReturnType;
    cartesi_getNotice(params: GetNoticeParams): GetNoticeReturnType;
    cartesi_getReport(params: GetReportParams): GetReportReturnType;
    cartesi_getVoucher(params: GetVoucherParams): GetVoucherReturnType;
};
