import {
    Account,
    Address,
    Chain,
    Client,
    DeriveChain,
    FormattedTransactionRequest,
    GetChainParameter,
    Hash,
    Hex,
    Transport,
    UnionOmit,
    WriteContractErrorType,
    WriteContractParameters,
    WriteContractReturnType,
} from "viem";
import { writeContract } from "viem/actions";
import { inputBoxAbi, inputBoxAddress } from "../rollups";
import { ErrorType, GetAccountParameter, UnionEvaluate } from "../types/utils";
import {
    estimateAddInputGas,
    EstimateAddInputGasErrorType,
    EstimateAddInputGasParameters,
} from "./estimateAddInputGas";

export type AddInputParameters<
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
        /**
         * Gas limit for transaction execution on the L1.
         * `null` to skip gas estimation & defer calculation to signer.
         */
        gas?: bigint | null | undefined;
        application: Address;
        payload: Hex;
    };
export type AddInputReturnType = Hash;
export type AddInputErrorType =
    | EstimateAddInputGasErrorType
    | WriteContractErrorType
    | ErrorType;

export const addInput = async <
    TChain extends Chain | undefined,
    TAccount extends Account | undefined,
    TChainOverride extends Chain | undefined = undefined,
>(
    client: Client<Transport, TChain, TAccount>,
    params: AddInputParameters<TChain, TAccount, TChainOverride>,
): Promise<WriteContractReturnType> => {
    const {
        account,
        application,
        chain = client.chain,
        gas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
        payload,
    } = params;

    const gas_ =
        typeof gas !== "number" && gas !== null
            ? await estimateAddInputGas(
                  client,
                  params as EstimateAddInputGasParameters,
              )
            : undefined;

    return writeContract(client, {
        account: account!,
        abi: inputBoxAbi,
        address: inputBoxAddress,
        chain,
        functionName: "addInput",
        args: [application, payload],
        gas: gas_,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
    } satisfies WriteContractParameters as any);
};
