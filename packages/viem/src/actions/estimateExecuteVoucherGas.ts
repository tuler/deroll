import { GetVoucherReturnType } from "@deroll/rpc/client";
import {
    Account,
    Address,
    Chain,
    Client,
    DeriveChain,
    EstimateContractGasErrorType,
    EstimateContractGasParameters,
    FormattedTransactionRequest,
    GetChainParameter,
    Transport,
    UnionOmit,
} from "viem";
import { estimateContractGas } from "viem/actions";
import { ErrorType, GetAccountParameter, UnionEvaluate } from "../types/utils";
import { cartesiDAppAbi } from "../rollups";
import { toEVM } from "../types/voucher";

export type EstimateExecuteVoucherGasParameters<
    chain extends Chain | undefined = Chain | undefined,
    account extends Account | undefined = Account | undefined,
    chainOverride extends Chain | undefined = Chain | undefined,
    _derivedChain extends Chain | undefined = DeriveChain<chain, chainOverride>,
> = UnionEvaluate<
    UnionOmit<
        FormattedTransactionRequest<_derivedChain>,
        | "accessList"
        | "data"
        | "from"
        | "gas"
        | "gasPrice"
        | "to"
        | "type"
        | "value"
    >
> &
    GetAccountParameter<account, Account | Address> &
    GetChainParameter<chain, chainOverride> & {
        /** Gas limit for transaction execution */
        gas?: bigint | undefined;
        application: Address;
        voucher: GetVoucherReturnType;
    };
export type EstimateExecuteVoucherGasReturnType = bigint;
export type EstimateExecuteVoucherGasErrorType =
    | EstimateContractGasErrorType
    | ErrorType;

export const estimateExecuteVoucherGas = <
    chain extends Chain | undefined,
    account extends Account | undefined,
    chainOverride extends Chain | undefined = undefined,
>(
    client: Client<Transport, chain, account>,
    parameters: EstimateExecuteVoucherGasParameters<
        chain,
        account,
        chainOverride
    >,
) => {
    const {
        account,
        chain = client.chain,
        application,
        gas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
        voucher,
    } = parameters;

    const args = toEVM(voucher);

    const params = {
        account,
        abi: cartesiDAppAbi,
        address: application,
        functionName: "executeVoucher",
        args,
        gas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
        // TODO: Not sure `chain` is necessary since it's not used downstream
        // in `estimateContractGas` or `estimateGas`
        // @ts-ignore
        chain,
    } satisfies EstimateContractGasParameters<
        typeof cartesiDAppAbi,
        "executeVoucher"
    >;
    return estimateContractGas(client, params as any);
};
