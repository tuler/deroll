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
import { erc20PortalAbi, erc20PortalAddress } from "../rollups";

export type EstimateDepositERC20TokensGasParameters<
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
        amount: bigint;
        application: Address;
        execLayerData: Hex;
        token: Address;
    };
export type EstimateDepositERC20TokensGasReturnType = bigint;
export type EstimateDepositERC20TokensGasErrorType =
    | EstimateContractGasErrorType
    | ErrorType;

export const estimateDepositERC20TokensGas = <
    chain extends Chain | undefined,
    account extends Account | undefined,
    chainOverride extends Chain | undefined = undefined,
>(
    client: Client<Transport, chain, account>,
    parameters: EstimateDepositERC20TokensGasParameters<
        chain,
        account,
        chainOverride
    >,
) => {
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
    } = parameters;

    const params = {
        account,
        abi: erc20PortalAbi,
        address: erc20PortalAddress,
        functionName: "depositERC20Tokens",
        args: [token, application, amount, execLayerData],
        gas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
        // TODO: Not sure `chain` is necessary since it's not used downstream
        // in `estimateContractGas` or `estimateGas`
        // @ts-ignore
        chain,
    } satisfies EstimateContractGasParameters<
        typeof erc20PortalAbi,
        "depositERC20Tokens"
    >;
    return estimateContractGas(client, params as any);
};
