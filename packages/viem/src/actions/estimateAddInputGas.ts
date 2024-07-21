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
    Hex,
    Transport,
    UnionOmit,
} from "viem";
import { estimateContractGas } from "viem/actions";
import { ErrorType, GetAccountParameter, UnionEvaluate } from "../types/utils";
import { inputBoxAbi, inputBoxAddress } from "../rollups";

export type EstimateAddInputGasParameters<
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
        payload: Hex;
    };
export type EstimateAddInputGasReturnType = bigint;
export type EstimateAddInputGasErrorType =
    | EstimateContractGasErrorType
    | ErrorType;

export const estimateAddInputGas = <
    chain extends Chain | undefined,
    account extends Account | undefined,
    chainOverride extends Chain | undefined = undefined,
>(
    client: Client<Transport, chain, account>,
    parameters: EstimateAddInputGasParameters<chain, account, chainOverride>,
) => {
    const {
        account,
        chain = client.chain,
        application,
        gas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
        payload,
    } = parameters;

    const params = {
        account,
        abi: inputBoxAbi,
        address: inputBoxAddress,
        functionName: "addInput",
        args: [application, payload],
        gas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
        // TODO: Not sure `chain` is necessary since it's not used downstream
        // in `estimateContractGas` or `estimateGas`
        // @ts-ignore
        chain,
    } satisfies EstimateContractGasParameters<typeof inputBoxAbi, "addInput">;
    return estimateContractGas(client, params as any);
};
