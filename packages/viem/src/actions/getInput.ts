import { Account, Chain, Client, Transport } from "viem";
import { type GetInputReturnType } from "@deroll/rpc/client";
import { PublicCartesiRpcSchema } from "../decorators/publicL2";

export type GetInputParams = {
    inputNumber: number;
};

export const getInput = <
    TChain extends Chain | undefined,
    TAccount extends Account | undefined,
>(
    client: Client<Transport, TChain, TAccount, PublicCartesiRpcSchema>,
    params: GetInputParams,
): Promise<GetInputReturnType> => {
    const { inputNumber } = params;
    return client.request({
        method: "cartesi_getInput",
        params: [inputNumber],
    });
};
