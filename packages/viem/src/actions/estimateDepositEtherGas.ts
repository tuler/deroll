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
import { etherPortalAbi, etherPortalAddress } from "../rollups";

export type EstimateDepositEtherGasParameters<
    chain extends Chain | undefined = Chain | undefined,
    account extends Account | undefined = Account | undefined,
    chainOverride extends Chain | undefined = Chain | undefined,
    _derivedChain extends Chain | undefined = DeriveChain<chain, chainOverride>,
> = UnionEvaluate<
    UnionOmit<
        FormattedTransactionRequest<_derivedChain>,
        "accessList" | "data" | "from" | "gas" | "gasPrice" | "to" | "type"
    >
> &
    GetAccountParameter<account, Account | Address> &
    GetChainParameter<chain, chainOverride> & {
        /** Gas limit for transaction execution */
        gas?: bigint | undefined;
        application: Address;
        execLayerData: Hex;
    };
export type EstimateDepositEtherGasReturnType = bigint;
export type EstimateDepositEtherGasErrorType =
    | EstimateContractGasErrorType
    | ErrorType;

export const estimateDepositEtherGas = <
    chain extends Chain | undefined,
    account extends Account | undefined,
    chainOverride extends Chain | undefined = undefined,
>(
    client: Client<Transport, chain, account>,
    parameters: EstimateDepositEtherGasParameters<
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
        execLayerData,
        value,
    } = parameters;

    const params = {
        account,
        abi: etherPortalAbi,
        address: etherPortalAddress,
        functionName: "depositEther",
        args: [application, execLayerData],
        gas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
        value,
        // TODO: Not sure `chain` is necessary since it's not used downstream
        // in `estimateContractGas` or `estimateGas`
        // @ts-ignore
        chain,
    } satisfies EstimateContractGasParameters<
        typeof etherPortalAbi,
        "depositEther"
    >;
    return estimateContractGas(client, params as any);
};
