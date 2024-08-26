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
import { erc1155BatchPortalAbi, erc1155BatchPortalAddress } from "../rollups";
import { ErrorType, GetAccountParameter, UnionEvaluate } from "../types/utils";
import {
    estimateDepositBatchERC1155TokenGas,
    EstimateDepositBatchERC1155TokenGasErrorType,
    EstimateDepositBatchERC1155TokenGasParameters,
} from "./estimateDepositBatchERC1155TokenGas";

export type DepositBatchERC1155TokenParameters<
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
        tokenIds: bigint[];
        values: bigint[];
    };
export type DepositBatchERC1155TokenReturnType = Hash;
export type DepositBatchERC1155TokenErrorType =
    | EstimateDepositBatchERC1155TokenGasErrorType
    | WriteContractErrorType
    | ErrorType;

export const depositBatchERC1155Token = async <
    TChain extends Chain | undefined,
    TAccount extends Account | undefined,
    TChainOverride extends Chain | undefined = undefined,
>(
    client: Client<Transport, TChain, TAccount>,
    params: DepositBatchERC1155TokenParameters<
        TChain,
        TAccount,
        TChainOverride
    >,
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
        tokenIds,
        values,
    } = params;

    const gas_ =
        typeof gas !== "number" && gas !== null
            ? await estimateDepositBatchERC1155TokenGas(
                  client,
                  params as EstimateDepositBatchERC1155TokenGasParameters,
              )
            : undefined;

    return writeContract(client, {
        account: account!,
        abi: erc1155BatchPortalAbi,
        address: erc1155BatchPortalAddress,
        chain,
        functionName: "depositBatchERC1155Token",
        args: [
            token,
            application,
            tokenIds,
            values,
            baseLayerData,
            execLayerData,
        ],
        gas: gas_,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
    } satisfies WriteContractParameters as any);
};
