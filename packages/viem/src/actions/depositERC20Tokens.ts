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
import { erc20PortalAbi, erc20PortalAddress } from "../rollups";
import { ErrorType, GetAccountParameter, UnionEvaluate } from "../types/utils";
import {
    estimateDepositERC20TokensGas,
    EstimateDepositERC20TokensGasErrorType,
    EstimateDepositERC20TokensGasParameters,
} from "./estimateDepositERC20TokensGas";

export type DepositERC20TokensParameters<
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
        amount: bigint;
        application: Address;
        execLayerData: Hex;
        token: Address;
    };
export type DepositERC20TokensReturnType = Hash;
export type DepositERC20TokensErrorType =
    | EstimateDepositERC20TokensGasErrorType
    | WriteContractErrorType
    | ErrorType;

export const depositERC20Tokens = async <
    TChain extends Chain | undefined,
    TAccount extends Account | undefined,
    TChainOverride extends Chain | undefined = undefined,
>(
    client: Client<Transport, TChain, TAccount>,
    params: DepositERC20TokensParameters<TChain, TAccount, TChainOverride>,
): Promise<WriteContractReturnType> => {
    const {
        account,
        amount,
        application,
        chain = client.chain,
        execLayerData,
        gas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
        token,
    } = params;

    const gas_ =
        typeof gas !== "number" && gas !== null
            ? await estimateDepositERC20TokensGas(
                  client,
                  params as EstimateDepositERC20TokensGasParameters,
              )
            : undefined;

    return writeContract(client, {
        account: account!,
        abi: erc20PortalAbi,
        address: erc20PortalAddress,
        chain,
        functionName: "depositERC20Tokens",
        args: [token, application, amount, execLayerData],
        gas: gas_,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
    } satisfies WriteContractParameters as any);
};
