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
import { erc1155SinglePortalAbi, erc1155SinglePortalAddress } from "../rollups";

export type EstimateDepositSingleERC1155TokenGasParameters<
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
        baseLayerData: Hex;
        execLayerData: Hex;
        token: Address;
        tokenId: bigint;
        value: bigint;
    };
export type EstimateDepositSingleERC1155TokenGasReturnType = bigint;
export type EstimateDepositSingleERC1155TokenGasErrorType =
    | EstimateContractGasErrorType
    | ErrorType;

export const estimateDepositSingleERC1155TokenGas = <
    chain extends Chain | undefined,
    account extends Account | undefined,
    chainOverride extends Chain | undefined = undefined,
>(
    client: Client<Transport, chain, account>,
    parameters: EstimateDepositSingleERC1155TokenGasParameters<
        chain,
        account,
        chainOverride
    >,
) => {
    const {
        account,
        application,
        baseLayerData,
        chain = client.chain,
        execLayerData,
        gas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
        token,
        tokenId,
        value,
    } = parameters;

    const params = {
        account,
        abi: erc1155SinglePortalAbi,
        address: erc1155SinglePortalAddress,
        functionName: "depositSingleERC1155Token",
        args: [
            token,
            application,
            tokenId,
            value,
            baseLayerData,
            execLayerData,
        ],
        gas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
        // TODO: Not sure `chain` is necessary since it's not used downstream
        // in `estimateContractGas` or `estimateGas`
        // @ts-ignore
        chain,
    } satisfies EstimateContractGasParameters<
        typeof erc1155SinglePortalAbi,
        "depositSingleERC1155Token"
    >;
    return estimateContractGas(client, params as any);
};
