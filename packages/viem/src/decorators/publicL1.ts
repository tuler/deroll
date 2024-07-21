import { Account, Chain, Client, Transport } from "viem";
import {
    estimateAddInputGas,
    type EstimateAddInputGasParameters,
    type EstimateAddInputGasReturnType,
} from "../actions/estimateAddInputGas";
import {
    estimateDepositEtherGas,
    type EstimateDepositEtherGasParameters,
    type EstimateDepositEtherGasReturnType,
} from "../actions/estimateDepositEtherGas";
import {
    estimateDepositERC20TokensGas,
    type EstimateDepositERC20TokensGasParameters,
    type EstimateDepositERC20TokensGasReturnType,
} from "../actions/estimateDepositERC20TokensGas";
import {
    estimateDepositERC721TokenGas,
    type EstimateDepositERC721TokenGasParameters,
    type EstimateDepositERC721TokenGasReturnType,
} from "../actions/estimateDepositERC721TokenGas";
import {
    estimateDepositSingleERC1155TokenGas,
    type EstimateDepositSingleERC1155TokenGasParameters,
    type EstimateDepositSingleERC1155TokenGasReturnType,
} from "../actions/estimateDepositSingleERC1155TokenGas";
import {
    estimateDepositBatchERC1155TokenGas,
    type EstimateDepositBatchERC1155TokenGasParameters,
    type EstimateDepositBatchERC1155TokenGasReturnType,
} from "../actions/estimateDepositBatchERC1155TokenGas";
import {
    estimateRelayDAppAddressGas,
    type EstimateRelayDAppAddressGasParameters,
    type EstimateRelayDAppAddressGasReturnType,
} from "../actions/estimateRelayDAppAddressGas";
import {
    estimateExecuteVoucherGas,
    EstimateExecuteVoucherGasParameters,
    EstimateExecuteVoucherGasReturnType,
} from "../actions/estimateExecuteVoucherGas";

export type PublicActionsL1<
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends Account | undefined = Account | undefined,
> = {
    estimateAddInputGas: <chainOverride extends Chain | undefined = undefined>(
        parameters: EstimateAddInputGasParameters<
            TChain,
            TAccount,
            chainOverride
        >,
    ) => Promise<EstimateAddInputGasReturnType>;

    estimateDepositEtherGas: <
        chainOverride extends Chain | undefined = undefined,
    >(
        parameters: EstimateDepositEtherGasParameters<
            TChain,
            TAccount,
            chainOverride
        >,
    ) => Promise<EstimateDepositEtherGasReturnType>;

    estimateDepositERC20TokensGas: <
        chainOverride extends Chain | undefined = undefined,
    >(
        parameters: EstimateDepositERC20TokensGasParameters<
            TChain,
            TAccount,
            chainOverride
        >,
    ) => Promise<EstimateDepositERC20TokensGasReturnType>;

    estimateDepositERC721TokenGas: <
        chainOverride extends Chain | undefined = undefined,
    >(
        parameters: EstimateDepositERC721TokenGasParameters<
            TChain,
            TAccount,
            chainOverride
        >,
    ) => Promise<EstimateDepositERC721TokenGasReturnType>;

    estimateDepositSingleERC1155TokenGas: <
        chainOverride extends Chain | undefined = undefined,
    >(
        parameters: EstimateDepositSingleERC1155TokenGasParameters<
            TChain,
            TAccount,
            chainOverride
        >,
    ) => Promise<EstimateDepositSingleERC1155TokenGasReturnType>;

    estimateDepositBatchERC1155TokenGas: <
        chainOverride extends Chain | undefined = undefined,
    >(
        parameters: EstimateDepositBatchERC1155TokenGasParameters<
            TChain,
            TAccount,
            chainOverride
        >,
    ) => Promise<EstimateDepositBatchERC1155TokenGasReturnType>;

    estimateExecuteVoucherGas: <
        chainOverride extends Chain | undefined = undefined,
    >(
        parameters: EstimateExecuteVoucherGasParameters<
            TChain,
            TAccount,
            chainOverride
        >,
    ) => Promise<EstimateExecuteVoucherGasReturnType>;

    estimateRelayDAppAddressGas: <
        chainOverride extends Chain | undefined = undefined,
    >(
        parameters: EstimateRelayDAppAddressGasParameters<
            TChain,
            TAccount,
            chainOverride
        >,
    ) => Promise<EstimateRelayDAppAddressGasReturnType>;
};

export const publicActionsL1 =
    () =>
    <
        TTransport extends Transport,
        TChain extends Chain | undefined = Chain | undefined,
        TAccount extends Account | undefined = Account | undefined,
    >(
        client: Client<TTransport, TChain, TAccount>,
    ): PublicActionsL1 => {
        return {
            estimateAddInputGas: (params) =>
                estimateAddInputGas(client, params),
            estimateDepositEtherGas: (params) =>
                estimateDepositEtherGas(client, params),
            estimateDepositERC20TokensGas: (params) =>
                estimateDepositERC20TokensGas(client, params),
            estimateDepositERC721TokenGas: (params) =>
                estimateDepositERC721TokenGas(client, params),
            estimateDepositSingleERC1155TokenGas: (params) =>
                estimateDepositSingleERC1155TokenGas(client, params),
            estimateDepositBatchERC1155TokenGas: (params) =>
                estimateDepositBatchERC1155TokenGas(client, params),
            estimateExecuteVoucherGas: (params) =>
                estimateExecuteVoucherGas(client, params),
            estimateRelayDAppAddressGas: (params) =>
                estimateRelayDAppAddressGas(client, params),
        };
    };
