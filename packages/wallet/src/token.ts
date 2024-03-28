import { type Address, type Hex, getAddress } from "viem";
import { isValidAdvanceRequestData } from "./util";
import { InvalidPayloadError } from "./errors";
import type { Wallet } from "./wallet";
import {
    erc1155Batch,
    erc1155Single,
    erc20,
    erc721,
    ether,
    relay,
} from "./contracts";

export interface DepositArgs {
    setDapp(address: Address): void;
    payload: Hex;
    getWallet(address: string): Wallet;
    setWallet(address: string, wallet: Wallet): void;
}

export interface DepositOperation {
    isDeposit(msgSender: Address): boolean;
    deposit(context: DepositArgs): Promise<void>;
}

class DepositHandler {
    private readonly handlers: Readonly<DepositOperation>[] = [
        ether,
        erc20,
        erc721,
        erc1155Single,
        erc1155Batch,
        relay,
    ];

    /**
     * Find the deposit handler for the given data
     * @param data payload with metadata
     * @returns
     * @throws if data is invalid
     */
    public findDeposit(data: unknown): DepositOperation | undefined {
        if (!isValidAdvanceRequestData(data)) {
            throw new InvalidPayloadError(data);
        }
        const msgSender = getAddress(data.metadata.msg_sender);

        const handler = this.handlers.find((handler) =>
            handler.isDeposit(msgSender),
        );
        if (handler) {
            return handler;
        }
    }
}

export const depositHandler = new DepositHandler();