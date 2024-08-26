import { Account, Chain, Client, Transport } from "viem";
import { type GetNoticeReturnType } from "@deroll/rpc/client";
import { PublicCartesiRpcSchema } from "../decorators/publicL2";

export type GetNoticeParams = {
    inputNumber: number;
    noticeNumber: number;
};

export const getNotice = <
    TChain extends Chain | undefined,
    TAccount extends Account | undefined,
>(
    client: Client<Transport, TChain, TAccount, PublicCartesiRpcSchema>,
    params: GetNoticeParams,
): Promise<GetNoticeReturnType> => {
    const { inputNumber, noticeNumber } = params;
    return client.request({
        method: "cartesi_getNotice",
        params: [inputNumber, noticeNumber],
    });
};
