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
import { erc721PortalAbi, erc721PortalAddress } from "../rollups";

export type EstimateDepositERC721TokenGasParameters<
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
    };
export type EstimateDepositERC721TokenGasReturnType = bigint;
export type EstimateDepositERC721TokenGasErrorType =
    | EstimateContractGasErrorType
    | ErrorType;

export const estimateDepositERC721TokenGas = <
    chain extends Chain | undefined,
    account extends Account | undefined,
    chainOverride extends Chain | undefined = undefined,
>(
    client: Client<Transport, chain, account>,
    parameters: EstimateDepositERC721TokenGasParameters<
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
    } = parameters;

    const params = {
        account,
        abi: erc721PortalAbi,
        address: erc721PortalAddress,
        functionName: "depositERC721Token",
        args: [token, application, tokenId, baseLayerData, execLayerData],
        gas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
        // TODO: Not sure `chain` is necessary since it's not used downstream
        // in `estimateContractGas` or `estimateGas`
        // @ts-ignore
        chain,
    } satisfies EstimateContractGasParameters<
        typeof erc721PortalAbi,
        "depositERC721Token"
    >;
    return estimateContractGas(client, params as any);
};
