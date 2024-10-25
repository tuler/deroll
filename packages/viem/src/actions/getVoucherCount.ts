import { Account, Chain, Client, Transport } from "viem";
import { type GetVoucherCountReturnType } from "@deroll/rpc/client";
import { PublicCartesiRpcSchema } from "../decorators/publicL2";

export type GetVoucherCountParams = {
    inputNumber: number;
};

export const getVoucherCount = <
    TChain extends Chain | undefined,
    TAccount extends Account | undefined,
>(
    client: Client<Transport, TChain, TAccount, PublicCartesiRpcSchema>,
    params: GetVoucherCountParams,
): Promise<GetVoucherCountReturnType> => {
    const { inputNumber } = params;
    return client.request({
        method: "cartesi_getVoucherCount",
        params: [inputNumber],
    });
};
