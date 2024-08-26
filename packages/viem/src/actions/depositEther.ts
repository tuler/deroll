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
import { etherPortalAbi, etherPortalAddress } from "../rollups";
import { ErrorType, GetAccountParameter, UnionEvaluate } from "../types/utils";
import {
    estimateDepositEtherGas,
    EstimateDepositEtherGasErrorType,
    EstimateDepositEtherGasParameters,
} from "./estimateDepositEtherGas";

export type DepositEtherParameters<
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
        execLayerData: Hex;
        value: bigint;
    };
export type DepositEtherReturnType = Hash;
export type DepositEtherErrorType =
    | EstimateDepositEtherGasErrorType
    | WriteContractErrorType
    | ErrorType;

export const depositEther = async <
    TChain extends Chain | undefined,
    TAccount extends Account | undefined,
    TChainOverride extends Chain | undefined = undefined,
>(
    client: Client<Transport, TChain, TAccount>,
    params: DepositEtherParameters<TChain, TAccount, TChainOverride>,
): Promise<WriteContractReturnType> => {
    const {
        account,
        application,
        chain = client.chain,
        execLayerData,
        gas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
        value,
    } = params;

    const gas_ =
        typeof gas !== "number" && gas !== null
            ? await estimateDepositEtherGas(
                  client,
                  params as EstimateDepositEtherGasParameters,
              )
            : undefined;

    return writeContract(client, {
        account: account!,
        abi: etherPortalAbi,
        address: etherPortalAddress,
        chain,
        functionName: "depositEther",
        args: [application, execLayerData],
        gas: gas_,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
        value,
    } satisfies WriteContractParameters as any);
};
