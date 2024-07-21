import { Account, Chain, Client, Transport } from "viem";
import { type GetReportReturnType } from "@deroll/rpc/client";
import { PublicCartesiRpcSchema } from "../decorators/publicL2";

export type GetReportParams = {
    inputNumber: number;
    reportNumber: number;
};

export const getReport = <
    TChain extends Chain | undefined,
    TAccount extends Account | undefined,
>(
    client: Client<Transport, TChain, TAccount, PublicCartesiRpcSchema>,
    params: GetReportParams,
): Promise<GetReportReturnType> => {
    const { inputNumber, reportNumber } = params;
    return client.request({
        method: "cartesi_getReport",
        params: [inputNumber, reportNumber],
    });
};
