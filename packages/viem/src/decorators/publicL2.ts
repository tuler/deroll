import {
    type GetNoticeCountParams as GetNoticeCountParamsRPC,
    type GetNoticeCountReturnType,
    type GetNoticeParams as GetNoticeParamsRPC,
    type GetNoticeReturnType,
    type GetReportCountParams as GetReportCountParamsRPC,
    type GetReportCountReturnType,
    type GetReportParams as GetReportParamsRPC,
    type GetReportReturnType,
    type GetVoucherCountParams as GetVoucherCountParamsRPC,
    type GetVoucherCountReturnType,
    type GetVoucherParams as GetVoucherParamsRPC,
    type GetVoucherReturnType,
    type InputNumberParams as InputNumberParamsRPC,
    type InputNumberReturnType,
    type GetInputParams as GetInputParamsRPC,
    type GetInputReturnType,
} from "@deroll/rpc/client";
import { Account, Chain, Client, Transport } from "viem";
import {
    getInput,
    getNotice,
    getNoticeCount,
    getReport,
    getReportCount,
    getVoucher,
    getVoucherCount,
    inputNumber,
    waitForInput,
    type GetInputParams,
    type GetNoticeParams,
    type GetNoticeCountParams,
    type GetReportParams,
    type GetReportCountParams,
    type GetVoucherParams,
    type GetVoucherCountParams,
    type InputNumberParams,
    type WaitForInputParams,
} from "../actions";

export type PublicCartesiRpcSchema = [
    {
        Method: "cartesi_inputNumber";
        Parameters: InputNumberParamsRPC;
        ReturnType: InputNumberReturnType;
    },
    {
        Method: "cartesi_getInput";
        Parameters: GetInputParamsRPC;
        ReturnType: GetInputReturnType;
    },
    {
        Method: "cartesi_getNoticeCount";
        Parameters: GetNoticeCountParamsRPC;
        ReturnType: GetNoticeCountReturnType;
    },
    {
        Method: "cartesi_getReportCount";
        Parameters: GetReportCountParamsRPC;
        ReturnType: GetReportCountReturnType;
    },
    {
        Method: "cartesi_getVoucherCount";
        Parameters: GetVoucherCountParamsRPC;
        ReturnType: GetVoucherCountReturnType;
    },
    {
        Method: "cartesi_getNotice";
        Parameters: GetNoticeParamsRPC;
        ReturnType: GetNoticeReturnType;
    },
    {
        Method: "cartesi_getReport";
        Parameters: GetReportParamsRPC;
        ReturnType: GetReportReturnType;
    },
    {
        Method: "cartesi_getVoucher";
        Parameters: GetVoucherParamsRPC;
        ReturnType: GetVoucherReturnType;
    },
];

export type PublicActionsL2 = {
    inputNumber: (params?: InputNumberParams) => Promise<InputNumberReturnType>;
    getInput: (params: GetInputParams) => Promise<GetInputReturnType>;
    getNoticeCount: (
        params: GetNoticeCountParams,
    ) => Promise<GetNoticeCountReturnType>;
    getReportCount: (
        params: GetReportCountParams,
    ) => Promise<GetReportCountReturnType>;
    getVoucherCount: (
        params: GetVoucherCountParams,
    ) => Promise<GetVoucherCountReturnType>;
    getNotice: (params: GetNoticeParams) => Promise<GetNoticeReturnType>;
    getReport: (params: GetReportParams) => Promise<GetReportReturnType>;
    getVoucher: (params: GetVoucherParams) => Promise<GetVoucherReturnType>;
    waitForInput: (params: WaitForInputParams) => Promise<GetInputReturnType>;
};

export const publicActionsL2 =
    () =>
    <
        TTransport extends Transport,
        TChain extends Chain | undefined = Chain | undefined,
        TAccount extends Account | undefined = Account | undefined,
    >(
        client: Client<TTransport, TChain, TAccount>,
    ): PublicActionsL2 => {
        return {
            inputNumber: (params) => inputNumber(client, params),
            getInput: (params) => getInput(client, params),
            getNoticeCount: (params) => getNoticeCount(client, params),
            getReportCount: (params) => getReportCount(client, params),
            getVoucherCount: (params) => getVoucherCount(client, params),
            getNotice: (params) => getNotice(client, params),
            getReport: (params) => getReport(client, params),
            getVoucher: (params) => getVoucher(client, params),
            waitForInput: (params) => waitForInput(client, params),
        };
    };
