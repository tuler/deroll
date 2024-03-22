import { isValidAdvanceRequestData } from "./util";
import { InvalidPayloadError } from "./errors";
import { getAddress, type Address, type Hex } from "viem";
import type { Wallet } from "./wallet";
import {
    Ether,
    ERC20,
    ERC721,
    ERC1155Single,
    ERC1155Batch,
    Relay,
} from "./contracts";

export type TokenContext = Partial<{
    address: string;
    addresses: string[];
    tokenIds: bigint[];
    tokenId: bigint;
    token: Address;
    from: string;
    to: string;
    owner: string;
    amount: bigint;
    amounts: bigint[];
    tokenOrAddress: string;
    recipient: Address;
    payload: Hex;
    getDapp(): Address;
    setDapp(address: Address): void;
    getWallet(address: string): Wallet;
    setWallet(address: Address, wallet: Wallet): void;
}>;

export interface DepositArgs {
    setDapp(address: Address): void;
    payload: Hex;
    getWallet(address: string): Wallet;
    setWallet(address: Address, wallet: Wallet): void;
}

export interface TokenOperation {
    isDeposit(msgSender: Address): boolean;
    deposit(context: DepositArgs): Promise<void>;
}

export class TokenHandler {
    private static instance: TokenHandler;
    private readonly handlers: Readonly<TokenOperation>[];

    public readonly ether = new Ether();
    public readonly erc20 = new ERC20();
    public readonly erc721 = new ERC721();
    public readonly erc1155Single = new ERC1155Single();
    public readonly erc1155Batch = new ERC1155Batch();

    /**
     * Singleton
     */
    private constructor() {
        this.handlers = [
            this.ether,
            this.erc20,
            this.erc721,
            this.erc1155Single,
            this.erc1155Batch,
            new Relay(),
        ];
    }
    public static getInstance(): TokenHandler {
        if (!TokenHandler.instance) {
            TokenHandler.instance = new TokenHandler();
        }
        return TokenHandler.instance;
    }

    /**
     * Find the deposit handler for the given data
     * @param data payload with metadata
     * @returns
     * @throws if data is invalid
     */
    public findDeposit(data: unknown): TokenOperation | undefined {
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
