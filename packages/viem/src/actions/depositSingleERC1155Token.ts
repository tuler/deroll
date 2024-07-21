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
import { erc1155SinglePortalAbi, erc1155SinglePortalAddress } from "../rollups";
import { ErrorType, GetAccountParameter, UnionEvaluate } from "../types/utils";
import {
    estimateDepositSingleERC1155TokenGas,
    EstimateDepositSingleERC1155TokenGasErrorType,
    EstimateDepositSingleERC1155TokenGasParameters,
} from "./estimateDepositSingleERC1155TokenGas";

export type DepositSingleERC1155TokenParameters<
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
        value: bigint;
    };
export type DepositSingleERC1155TokenReturnType = Hash;
export type DepositSingleERC1155TokenErrorType =
    | EstimateDepositSingleERC1155TokenGasErrorType
    | WriteContractErrorType
    | ErrorType;

export const depositSingleERC1155Token = async <
    TChain extends Chain | undefined,
    TAccount extends Account | undefined,
    TChainOverride extends Chain | undefined = undefined,
>(
    client: Client<Transport, TChain, TAccount>,
    params: DepositSingleERC1155TokenParameters<
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
        tokenId,
        value,
    } = params;

    const gas_ =
        typeof gas !== "number" && gas !== null
            ? await estimateDepositSingleERC1155TokenGas(
                  client,
                  params as EstimateDepositSingleERC1155TokenGasParameters,
              )
            : undefined;

    return writeContract(client, {
        account: account!,
        abi: erc1155SinglePortalAbi,
        address: erc1155SinglePortalAddress,
        chain,
        functionName: "depositSingleERC1155Token",
        args: [
            token,
            application,
            tokenId,
            value,
            baseLayerData,
            execLayerData,
        ],
        gas: gas_,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
    } satisfies WriteContractParameters as any);
};
