import {
    Account,
    Address,
    Chain,
    Client,
    DeriveChain,
    FormattedTransactionRequest,
    GetChainParameter,
    Hash,
    Transport,
    UnionOmit,
    WriteContractErrorType,
    WriteContractParameters,
    WriteContractReturnType,
} from "viem";
import { writeContract } from "viem/actions";
import { dAppAddressRelayAbi, dAppAddressRelayAddress } from "../rollups";
import { ErrorType, GetAccountParameter, UnionEvaluate } from "../types/utils";
import {
    estimateRelayDAppAddressGas,
    type EstimateRelayDAppAddressGasErrorType,
    type EstimateRelayDAppAddressGasParameters,
} from "./estimateRelayDAppAddressGas";

export type RelayDAppAddressParameters<
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
    };
export type RelayDAppAddressReturnType = Hash;
export type RelayDAppAddressErrorType =
    | EstimateRelayDAppAddressGasErrorType
    | WriteContractErrorType
    | ErrorType;

export const relayDAppAddress = async <
    TChain extends Chain | undefined,
    TAccount extends Account | undefined,
    TChainOverride extends Chain | undefined = undefined,
>(
    client: Client<Transport, TChain, TAccount>,
    params: RelayDAppAddressParameters<TChain, TAccount, TChainOverride>,
): Promise<WriteContractReturnType> => {
    const {
        account,
        application,
        chain = client.chain,
        gas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
    } = params;

    const gas_ =
        typeof gas !== "number" && gas !== null
            ? await estimateRelayDAppAddressGas(
                  client,
                  params as EstimateRelayDAppAddressGasParameters,
              )
            : undefined;

    return writeContract(client, {
        account: account!,
        abi: dAppAddressRelayAbi,
        address: dAppAddressRelayAddress,
        chain,
        functionName: "relayDAppAddress",
        args: [application],
        gas: gas_,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
    } satisfies WriteContractParameters as any);
};
