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
import { erc1155BatchPortalAbi, erc1155BatchPortalAddress } from "../rollups";

export type EstimateDepositBatchERC1155TokenGasParameters<
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
        tokenIds: bigint[];
        values: bigint[];
    };
export type EstimateDepositBatchERC1155TokenGasReturnType = bigint;
export type EstimateDepositBatchERC1155TokenGasErrorType =
    | EstimateContractGasErrorType
    | ErrorType;

export const estimateDepositBatchERC1155TokenGas = <
    chain extends Chain | undefined,
    account extends Account | undefined,
    chainOverride extends Chain | undefined = undefined,
>(
    client: Client<Transport, chain, account>,
    parameters: EstimateDepositBatchERC1155TokenGasParameters<
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
        tokenIds,
        values,
    } = parameters;

    const params = {
        account,
        abi: erc1155BatchPortalAbi,
        address: erc1155BatchPortalAddress,
        functionName: "depositBatchERC1155Token",
        args: [
            token,
            application,
            tokenIds,
            values,
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
        typeof erc1155BatchPortalAbi,
        "depositBatchERC1155Token"
    >;
    return estimateContractGas(client, params as any);
};
