import { Account, Chain, Client } from "viem";
import {
    addInput,
    type AddInputParameters,
    type AddInputReturnType,
} from "../actions/addInput";
import {
    depositERC20Tokens,
    type DepositERC20TokensParameters,
    type DepositERC20TokensReturnType,
} from "../actions/depositERC20Tokens";
import {
    depositERC721Token,
    type DepositERC721TokenParameters,
    type DepositERC721TokenReturnType,
} from "../actions/depositERC721Token";
import {
    depositSingleERC1155Token,
    type DepositSingleERC1155TokenParameters,
    type DepositSingleERC1155TokenReturnType,
} from "../actions/depositSingleERC1155Token";
import {
    depositBatchERC1155Token,
    type DepositBatchERC1155TokenParameters,
    type DepositBatchERC1155TokenReturnType,
} from "../actions/depositBatchERC1155Token";
import {
    relayDAppAddress,
    type RelayDAppAddressParameters,
    type RelayDAppAddressReturnType,
} from "../actions/relayDAppAddress";
import {
    executeVoucher,
    ExecuteVoucherParameters,
    ExecuteVoucherReturnType,
} from "../actions/executeVoucher";
import {
    depositEther,
    DepositEtherParameters,
    DepositEtherReturnType,
} from "../actions/depositEther";

export type WalletActionsL1<
    chain extends Chain | undefined = Chain | undefined,
    account extends Account | undefined = Account | undefined,
> = {
    addInput: <chainOverride extends Chain | undefined = undefined>(
        parameters: AddInputParameters<chain, account, chainOverride>,
    ) => Promise<AddInputReturnType>;

    depositEther: <chainOverride extends Chain | undefined = undefined>(
        parameters: DepositEtherParameters<chain, account, chainOverride>,
    ) => Promise<DepositEtherReturnType>;

    depositERC20Tokens: <chainOverride extends Chain | undefined = undefined>(
        parameters: DepositERC20TokensParameters<chain, account, chainOverride>,
    ) => Promise<DepositERC20TokensReturnType>;

    depositERC721Token: <chainOverride extends Chain | undefined = undefined>(
        parameters: DepositERC721TokenParameters<chain, account, chainOverride>,
    ) => Promise<DepositERC721TokenReturnType>;

    depositSingleERC1155Token: <
        chainOverride extends Chain | undefined = undefined,
    >(
        parameters: DepositSingleERC1155TokenParameters<
            chain,
            account,
            chainOverride
        >,
    ) => Promise<DepositSingleERC1155TokenReturnType>;

    depositBatchERC1155Token: <
        chainOverride extends Chain | undefined = undefined,
    >(
        parameters: DepositBatchERC1155TokenParameters<
            chain,
            account,
            chainOverride
        >,
    ) => Promise<DepositBatchERC1155TokenReturnType>;

    executeVoucher: <chainOverride extends Chain | undefined = undefined>(
        parameters: ExecuteVoucherParameters<chain, account, chainOverride>,
    ) => Promise<ExecuteVoucherReturnType>;

    relayDAppAddress: <chainOverride extends Chain | undefined = undefined>(
        parameters: RelayDAppAddressParameters<chain, account, chainOverride>,
    ) => Promise<RelayDAppAddressReturnType>;
};

export const walletActionsL1 =
    () =>
    (client: Client): WalletActionsL1 => {
        return {
            addInput: (params) => addInput(client, params),
            depositEther: (params) => depositEther(client, params),
            depositERC20Tokens: (params) => depositERC20Tokens(client, params),
            depositERC721Token: (params) => depositERC721Token(client, params),
            depositSingleERC1155Token: (params) =>
                depositSingleERC1155Token(client, params),
            depositBatchERC1155Token: (params) =>
                depositBatchERC1155Token(client, params),
            executeVoucher: (params) => executeVoucher(client, params),
            relayDAppAddress: (params) => relayDAppAddress(client, params),
        };
    };
