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
import { dAppAddressRelayAbi, dAppAddressRelayAddress } from "../rollups";

export type EstimateRelayDAppAddressGasParameters<
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
    };
export type EstimateRelayDAppAddressGasReturnType = bigint;
export type EstimateRelayDAppAddressGasErrorType =
    | EstimateContractGasErrorType
    | ErrorType;

export const estimateRelayDAppAddressGas = <
    chain extends Chain | undefined,
    account extends Account | undefined,
    chainOverride extends Chain | undefined = undefined,
>(
    client: Client<Transport, chain, account>,
    parameters: EstimateRelayDAppAddressGasParameters<
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
    } = parameters;

    const params = {
        account,
        abi: dAppAddressRelayAbi,
        address: dAppAddressRelayAddress,
        functionName: "relayDAppAddress",
        args: [application],
        gas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
        // TODO: Not sure `chain` is necessary since it's not used downstream
        // in `estimateContractGas` or `estimateGas`
        // @ts-ignore
        chain,
    } satisfies EstimateContractGasParameters<
        typeof dAppAddressRelayAbi,
        "relayDAppAddress"
    >;
    return estimateContractGas(client, params as any);
};
