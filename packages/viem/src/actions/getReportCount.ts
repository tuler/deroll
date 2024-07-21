import { Account, Chain, Client, Transport } from "viem";
import { type GetReportCountReturnType } from "@deroll/rpc/client";
import { PublicCartesiRpcSchema } from "../decorators/publicL2";

export type GetReportCountParams = {
    inputNumber: number;
};

export const getReportCount = <
    TChain extends Chain | undefined,
    TAccount extends Account | undefined,
>(
    client: Client<Transport, TChain, TAccount, PublicCartesiRpcSchema>,
    params: GetReportCountParams,
): Promise<GetReportCountReturnType> => {
    const { inputNumber } = params;
    return client.request({
        method: "cartesi_getReportCount",
        params: [inputNumber],
    });
};
