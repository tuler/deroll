import { Account, Chain, Client, Transport } from "viem";
import { type GetNoticeCountReturnType } from "@deroll/rpc/client";
import { PublicCartesiRpcSchema } from "../decorators/publicL2";

export type GetNoticeCountParams = {
    inputNumber: number;
};

export const getNoticeCount = <
    TChain extends Chain | undefined,
    TAccount extends Account | undefined,
>(
    client: Client<Transport, TChain, TAccount, PublicCartesiRpcSchema>,
    params: GetNoticeCountParams,
): Promise<GetNoticeCountReturnType> => {
    const { inputNumber } = params;
    return client.request({
        method: "cartesi_getNoticeCount",
        params: [inputNumber],
    });
};
