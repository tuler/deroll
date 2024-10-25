import { Account, Chain, Client, Transport } from "viem";
import { type InputNumberReturnType } from "@deroll/rpc/client";
import { PublicCartesiRpcSchema } from "../decorators/publicL2";

export type InputNumberParams = undefined;

export const inputNumber = <
    TChain extends Chain | undefined,
    TAccount extends Account | undefined,
>(
    client: Client<Transport, TChain, TAccount, PublicCartesiRpcSchema>,
    params?: InputNumberParams,
): Promise<InputNumberReturnType> => {
    return client.request({ method: "cartesi_inputNumber", params: [] });
};
