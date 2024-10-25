import { GetVoucherReturnType } from "@deroll/rpc/client";
import {
    Account,
    Address,
    Chain,
    Client,
    DeriveChain,
    FormattedTransactionRequest,
    GetChainParameter,
    Hash,
    Transport,
    UnionOmit,
    WriteContractErrorType,
    WriteContractParameters,
    WriteContractReturnType,
} from "viem";
import { writeContract } from "viem/actions";
import { cartesiDAppAbi } from "../rollups";
import { ErrorType, GetAccountParameter, UnionEvaluate } from "../types/utils";
import { toEVM } from "../types/voucher";
import {
    estimateExecuteVoucherGas,
    EstimateExecuteVoucherGasErrorType,
    EstimateExecuteVoucherGasParameters,
} from "./estimateExecuteVoucherGas";

export type ExecuteVoucherParameters<
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
        voucher: GetVoucherReturnType;
    };
export type ExecuteVoucherReturnType = Hash;
export type ExecuteVoucherErrorType =
    | EstimateExecuteVoucherGasErrorType
    | WriteContractErrorType
    | ErrorType;

export const executeVoucher = async <
    TChain extends Chain | undefined,
    TAccount extends Account | undefined,
    TChainOverride extends Chain | undefined = undefined,
>(
    client: Client<Transport, TChain, TAccount>,
    params: ExecuteVoucherParameters<TChain, TAccount, TChainOverride>,
): Promise<WriteContractReturnType> => {
    const {
        account,
        application,
        chain = client.chain,
        gas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
        voucher,
    } = params;

    const gas_ =
        typeof gas !== "number" && gas !== null
            ? await estimateExecuteVoucherGas(
                  client,
                  params as EstimateExecuteVoucherGasParameters,
              )
            : undefined;

    const args = toEVM(voucher);
    return writeContract(client, {
        account: account!,
        abi: cartesiDAppAbi,
        address: application,
        chain,
        functionName: "executeVoucher",
        args,
        gas: gas_,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
    } satisfies WriteContractParameters as any);
};
