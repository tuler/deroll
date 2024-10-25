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
import { erc721PortalAbi, erc721PortalAddress } from "../rollups";
import { ErrorType, GetAccountParameter, UnionEvaluate } from "../types/utils";
import {
    estimateDepositERC721TokenGas,
    EstimateDepositERC721TokenGasErrorType,
    EstimateDepositERC721TokenGasParameters,
} from "./estimateDepositERC721TokenGas";

export type DepositERC721TokenParameters<
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
        baseLayerData: Hex;
        execLayerData: Hex;
        token: Address;
        tokenId: bigint;
    };
export type DepositERC721TokenReturnType = Hash;
export type DepositERC721TokenErrorType =
    | EstimateDepositERC721TokenGasErrorType
    | WriteContractErrorType
    | ErrorType;

export const depositERC721Token = async <
    TChain extends Chain | undefined,
    TAccount extends Account | undefined,
    TChainOverride extends Chain | undefined = undefined,
>(
    client: Client<Transport, TChain, TAccount>,
    params: DepositERC721TokenParameters<TChain, TAccount, TChainOverride>,
): Promise<WriteContractReturnType> => {
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
    } = params;

    const gas_ =
        typeof gas !== "number" && gas !== null
            ? await estimateDepositERC721TokenGas(
                  client,
                  params as EstimateDepositERC721TokenGasParameters,
              )
            : undefined;

    return writeContract(client, {
        account: account!,
        abi: erc721PortalAbi,
        address: erc721PortalAddress,
        chain,
        functionName: "depositERC721Token",
        args: [token, application, tokenId, baseLayerData, execLayerData],
        gas: gas_,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
    } satisfies WriteContractParameters as any);
};
