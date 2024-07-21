import { Account, Chain, Client, Transport } from "viem";
import { type GetVoucherReturnType } from "@deroll/rpc/client";
import { PublicCartesiRpcSchema } from "../decorators/publicL2";

export type GetVoucherParams = {
    inputNumber: number;
    voucherNumber: number;
};

export const getVoucher = <
    TChain extends Chain | undefined,
    TAccount extends Account | undefined,
>(
    client: Client<Transport, TChain, TAccount, PublicCartesiRpcSchema>,
    params: GetVoucherParams,
): Promise<GetVoucherReturnType> => {
    const { inputNumber, voucherNumber } = params;
    return client.request({
        method: "cartesi_getVoucher",
        params: [inputNumber, voucherNumber],
    });
};
