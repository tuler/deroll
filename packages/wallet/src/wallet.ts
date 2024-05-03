import { AdvanceRequestHandler, Voucher } from "@deroll/core";
import { Address, Hex, getAddress, isAddress } from "viem";

import { dAppAddressRelayAddress } from "./rollups";
import {
    createERC1155BatchTransferVoucher,
    createERC1155SingleTransferVoucher,
    createERC20TransferVoucher,
    createERC721TransferVoucher,
    createWithdrawEtherVoucher,
    isERC1155BatchDeposit,
    isERC1155SingleDeposit,
    isERC20Deposit,
    isERC721Deposit,
    isEtherDeposit,
    parseERC1155BatchDeposit,
    parseERC1155SingleDeposit,
    parseERC20Deposit,
    parseERC721Deposit,
    parseEtherDeposit,
} from ".";

export type Wallet = {
    ether: bigint;
    erc20: Record<Address, bigint>; // key = token address, value = amount
    erc721: Record<Address, Set<bigint>>; // key = token address, value = set of tokenIds
    erc1155: Record<Address, Map<bigint, bigint>>; // key = token address, value = map of tokenId to values
};

type DeepReadonly<T> = Readonly<{
    [K in keyof T]: T[K] extends number | string | symbol
        ? Readonly<T[K]>
        : T[K] extends Array<infer A>
          ? Readonly<Array<DeepReadonly<A>>>
          : DeepReadonly<T[K]>;
}>;

const createEmptyWallet = (): Wallet => ({
    ether: 0n,
    erc20: {},
    erc721: {},
    erc1155: {},
});

const normalizeAddress = (address: string): string =>
    isAddress(address) ? getAddress(address) : address;

export interface WalletApp {
    etherBalanceOf(address: string): bigint;
    erc20BalanceOf(token: Address, address: string): bigint;
    erc721Has(token: Address, address: string, tokenId: bigint): boolean;
    erc1155BalanceOf(token: Address, address: string, tokenId: bigint): bigint;
    getWallet(address: string): DeepReadonly<Wallet>;
    handler: AdvanceRequestHandler;
    transferEther(from: string, to: string, value: bigint): void;
    transferERC20(
        token: Address,
        from: string,
        to: string,
        amount: bigint,
    ): void;
    transferERC721(
        token: Address,
        from: string,
        to: string,
        tokenId: bigint,
    ): void;
    transferERC1155(
        token: Address,
        from: string,
        to: string,
        tokenId: bigint,
        value: bigint,
    ): void;
    transferBatchERC1155(
        token: Address,
        from: string,
        to: string,
        tokenIds: bigint[],
        values: bigint[],
    ): void;
    withdrawEther(address: Address, value: bigint): Voucher;
    withdrawERC20(token: Address, address: Address, amount: bigint): Voucher;
    withdrawERC721(token: Address, address: Address, tokenId: bigint): Voucher;
    withdrawERC1155(
        token: Address,
        address: Address,
        tokenId: bigint,
        value: bigint,
        data: Hex,
    ): Voucher;
    withdrawBatchERC1155(
        token: Address,
        address: Address,
        tokenIds: bigint[],
        values: bigint[],
        data: Hex,
    ): Voucher;
}

export class WalletAppImpl implements WalletApp {
    private dapp?: Address;
    private wallets: Record<string, Wallet> = {};

    constructor() {
        this.handler = this.handler.bind(this);
    }

    public etherBalanceOf(address: string): bigint {
        // if is address, normalize it
        address = normalizeAddress(address);

        // ether balance
        const wallet = this.wallets[address] ?? createEmptyWallet();
        return wallet.ether;
    }

    public erc20BalanceOf(token: Address, address: string): bigint {
        // if is address, normalize it
        if (isAddress(address)) {
            address = getAddress(address);
        }

        const wallet = this.wallets[address] ?? createEmptyWallet();

        // erc-20 balance
        return wallet.erc20[token] ?? 0n;
    }

    public erc721Has(
        token: Address,
        address: string,
        tokenId: bigint,
    ): boolean {
        // if is address, normalize it
        address = normalizeAddress(address);

        const wallet = this.wallets[address] ?? createEmptyWallet();
        const ids = wallet.erc721[token] ?? new Set();
        return ids.has(tokenId);
    }

    public erc1155BalanceOf(
        token: Address,
        address: string,
        tokenId: bigint,
    ): bigint {
        // if is address, normalize it
        address = normalizeAddress(address);

        const wallet = this.wallets[address] ?? createEmptyWallet();
        const values = wallet.erc1155[token] ?? new Map();
        return values.get(tokenId) ?? 0n;
    }

    public getWallet(address: string): Readonly<Wallet> {
        // if is address, normalize it
        address = normalizeAddress(address);

        const wallet = this.wallets[address] ?? createEmptyWallet();
        return wallet;
    }

    public handler: AdvanceRequestHandler = async (data) => {
        if (isEtherDeposit(data)) {
            // parse payload
            let { sender, value } = parseEtherDeposit(data.payload);

            // get or create wallet
            const wallet = this.wallets[sender] ?? createEmptyWallet();

            // increment balance
            wallet.ether += value;

            this.wallets[sender] = wallet;
            return "accept";
        } else if (isERC20Deposit(data)) {
            // parse payload
            let { success, token, sender, amount } = parseERC20Deposit(
                data.payload,
            );

            if (success) {
                // get or create wallet
                const wallet = this.wallets[sender] ?? createEmptyWallet();

                // increment balance
                wallet.erc20[token] = wallet.erc20[token]
                    ? wallet.erc20[token] + amount
                    : amount;

                this.wallets[sender] = wallet;
            }
            return "accept";
        } else if (isERC721Deposit(data)) {
            // parse payload
            const { sender, token, tokenId } = parseERC721Deposit(data.payload);

            // get or create wallet
            const wallet = this.wallets[sender] ?? createEmptyWallet();

            // set ownership
            wallet.erc721[token] = wallet.erc721[token] ?? new Set();
            wallet.erc721[token].add(tokenId);

            this.wallets[sender] = wallet;
            return "accept";
        } else if (isERC1155SingleDeposit(data)) {
            // parse payload
            const { sender, token, tokenId, value } = parseERC1155SingleDeposit(
                data.payload,
            );

            // get or create wallet
            const wallet = this.wallets[sender] ?? createEmptyWallet();

            // increment balance
            wallet.erc1155[token] = wallet.erc1155[token] ?? new Map();
            wallet.erc1155[token].set(
                tokenId,
                (wallet.erc1155[token].get(tokenId) ?? 0n) + value,
            );

            this.wallets[sender] = wallet;
            return "accept";
        } else if (isERC1155BatchDeposit(data)) {
            // parse payload
            const { sender, token, tokenIds, values } =
                parseERC1155BatchDeposit(data.payload);

            // get or create wallet
            const wallet = this.wallets[sender] ?? createEmptyWallet();

            // increment balance
            wallet.erc1155[token] = wallet.erc1155[token] ?? new Map();
            tokenIds.forEach((tokenId, i) => {
                wallet.erc1155[token].set(
                    tokenId,
                    (wallet.erc1155[token].get(tokenId) ?? 0n) + values[i],
                );
            });

            this.wallets[sender] = wallet;
            return "accept";
        } else if (
            getAddress(data.metadata.msg_sender) === dAppAddressRelayAddress
        ) {
            // assign dapp address
            this.dapp = getAddress(data.payload);
            return "accept";
        }
        return "reject";
    };

    public transferEther(from: string, to: string, value: bigint): void {
        // normalize addresses
        from = normalizeAddress(from);
        to = normalizeAddress(to);

        // check if transfer is possible
        const balance = this.etherBalanceOf(from);
        if (balance < value) {
            throw new Error(`insufficient balance of user ${from}`);
        }

        const walletFrom = this.wallets[from] ?? createEmptyWallet();
        const walletTo = this.wallets[to] ?? createEmptyWallet();

        // make the transfer
        walletFrom.ether = walletFrom.ether - value;
        walletTo.ether = walletTo.ether + value;
        this.wallets[from] = walletFrom;
        this.wallets[to] = walletTo;
    }

    public transferERC20(
        token: Address,
        from: string,
        to: string,
        amount: bigint,
    ): void {
        // normalize addresses
        from = normalizeAddress(from);
        to = normalizeAddress(to);

        // check if transfer is possible
        const balance = this.erc20BalanceOf(token, from);
        if (balance < amount) {
            throw new Error(
                `insufficient balance of user ${from} of token ${token}`,
            );
        }

        const walletFrom = this.wallets[from] ?? createEmptyWallet();
        const walletTo = this.wallets[to] ?? createEmptyWallet();

        // make the transfer
        walletFrom.erc20[token] = walletFrom.erc20[token] - amount;
        walletTo.erc20[token] = walletTo.erc20[token]
            ? walletTo.erc20[token] + amount
            : amount;
        this.wallets[from] = walletFrom;
        this.wallets[to] = walletTo;
    }

    public transferERC721(
        token: Address,
        from: string,
        to: string,
        tokenId: bigint,
    ): void {
        // normalize addresses
        from = normalizeAddress(from);
        to = normalizeAddress(to);

        // check if transfer is possible
        const has = this.erc721Has(token, from, tokenId);
        if (!has) {
            throw new Error(
                `user ${from} does not have tokenId ${tokenId} of token ${token}`,
            );
        }

        const walletFrom = this.wallets[from] ?? createEmptyWallet();
        const walletTo = this.wallets[to] ?? createEmptyWallet();

        // make the transfer
        walletFrom.erc721[token].delete(tokenId);
        walletTo.erc721[token] = walletTo.erc721[token]
            ? walletTo.erc721[token].add(tokenId)
            : new Set([tokenId]);

        this.wallets[from] = walletFrom;
        this.wallets[to] = walletTo;
    }

    public transferERC1155(
        token: Address,
        from: string,
        to: string,
        tokenId: bigint,
        value: bigint,
    ): void {
        // normalize addresses
        from = normalizeAddress(from);
        to = normalizeAddress(to);

        // check if transfer is possible
        const balance = this.erc1155BalanceOf(token, from, tokenId);
        if (balance < value) {
            throw new Error(
                `insufficient balance of user ${from} of token ${token} tokenId ${tokenId}`,
            );
        }

        const walletFrom = this.wallets[from] ?? createEmptyWallet();
        const walletTo = this.wallets[to] ?? createEmptyWallet();
        const tokenBalance =
            this.wallets[from].erc1155[token].get(tokenId) ?? 0n;

        // make the transfer
        walletFrom.erc1155[token].set(tokenId, tokenBalance - value);
        walletTo.erc1155[token] = walletTo.erc1155[token] ?? new Map();
        walletTo.erc1155[token].set(
            tokenId,
            (walletTo.erc1155[token].get(tokenId) ?? 0n) + value,
        );

        this.wallets[from] = walletFrom;
        this.wallets[to] = walletTo;
    }

    public transferBatchERC1155(
        token: Address,
        from: string,
        to: string,
        tokenIds: bigint[],
        values: bigint[],
    ): void {
        // normalize addresses
        from = normalizeAddress(from);
        to = normalizeAddress(to);

        // check arrays lengths
        if (tokenIds.length !== values.length) {
            throw new Error(
                `tokenIds and values must have the same length: ${tokenIds.length} != ${values.length}`,
            );
        }

        // check balance
        tokenIds.forEach((tokenId, i) => {
            const balance = this.erc1155BalanceOf(token, from, tokenId);
            const value = values[i];
            if (balance < value) {
                throw new Error(
                    `insufficient balance of user ${from} of token ${token} tokenId ${tokenId}`,
                );
            }
        });

        const walletFrom = this.wallets[from] ?? createEmptyWallet();
        const walletTo = this.wallets[to] ?? createEmptyWallet();

        // make the transfer
        tokenIds.forEach((tokenId, i) => {
            const tokenBalance =
                this.wallets[from].erc1155[token].get(tokenId) ?? 0n;
            const value = values[i];
            walletFrom.erc1155[token].set(tokenId, tokenBalance - value);
            walletTo.erc1155[token] = walletTo.erc1155[token] ?? new Map();
            walletTo.erc1155[token].set(
                tokenId,
                (walletTo.erc1155[token].get(tokenId) ?? 0n) + value,
            );
        });

        this.wallets[from] = walletFrom;
        this.wallets[to] = walletTo;
    }

    withdrawEther(address: Address, value: bigint): Voucher {
        // normalize address
        address = getAddress(address);

        // check balance
        const balance = this.etherBalanceOf(address);
        if (this.etherBalanceOf(address) < value) {
            throw new Error(
                `insufficient balance of user ${address}: ${value.toString()} > ${balance.toString()}`,
            );
        }

        // check if dapp address is defined
        if (!this.dapp) {
            throw new Error(`undefined application address`);
        }

        const wallet = this.wallets[address];

        // reduce balance right away
        wallet.ether = wallet.ether - value;

        // create voucher
        return createWithdrawEtherVoucher(this.dapp, address, value);
    }

    withdrawERC20(token: Address, address: Address, amount: bigint): Voucher {
        // normalize addresses
        token = getAddress(token);
        address = getAddress(address);

        // check balance
        const balance = this.erc20BalanceOf(token, address);
        if (balance < amount) {
            throw new Error(
                `insufficient balance of user ${address} of token ${token}: ${amount.toString()} > ${balance.toString()}`,
            );
        }

        const wallet = this.wallets[address];

        // reduce balance right away
        wallet.erc20[token] -= amount;

        return createERC20TransferVoucher(token, address, amount);
    }

    withdrawERC721(token: Address, address: Address, tokenId: bigint): Voucher {
        // normalize addresses
        token = getAddress(token);
        address = getAddress(address);

        // check balance
        const has = this.erc721Has(token, address, tokenId);
        if (!has) {
            throw new Error(
                `user ${address} does not have tokenId ${tokenId} of token ${token}`,
            );
        }

        // check if dapp address is defined
        if (!this.dapp) {
            throw new Error(`undefined application address`);
        }

        const wallet = this.wallets[address];

        // remove tokenId right away
        wallet.erc721[token].delete(tokenId);

        // create voucher
        return createERC721TransferVoucher(token, this.dapp, address, tokenId);
    }

    withdrawERC1155(
        token: Address,
        address: Address,
        tokenId: bigint,
        value: bigint,
        data: Hex,
    ): Voucher {
        // normalize addresses
        token = getAddress(token);
        address = getAddress(address);

        // check balance
        const balance = this.erc1155BalanceOf(token, address, tokenId);
        if (balance < value) {
            throw new Error(
                `insufficient balance of user ${address} of token ${token} tokenId ${tokenId}`,
            );
        }

        // check if dapp address is defined
        if (!this.dapp) {
            throw new Error(`undefined application address`);
        }

        const wallet = this.wallets[address];

        // reduce balance right away
        wallet.erc1155[token].set(tokenId, balance - value);

        // create voucher
        return createERC1155SingleTransferVoucher(
            token,
            this.dapp,
            address,
            tokenId,
            value,
            data,
        );
    }

    withdrawBatchERC1155(
        token: Address,
        address: Address,
        tokenIds: bigint[],
        values: bigint[],
        data: Hex,
    ): Voucher {
        // normalize addresses
        token = getAddress(token);
        address = getAddress(address);

        // check arrays lengths
        if (tokenIds.length !== values.length) {
            throw new Error(
                `tokenIds and values must have the same length: ${tokenIds.length} != ${values.length}`,
            );
        }

        // check balance
        tokenIds.forEach((tokenId, i) => {
            const balance = this.erc1155BalanceOf(token, address, tokenId);
            const value = values[i];
            if (balance < value) {
                throw new Error(
                    `insufficient balance of user ${address} of token ${token} tokenId ${tokenId}`,
                );
            }
        });

        // check if dapp address is defined
        if (!this.dapp) {
            throw new Error(`undefined application address`);
        }

        const wallet = this.wallets[address];

        // reduce balance right away
        tokenIds.forEach((tokenId, i) => {
            const balance = this.erc1155BalanceOf(token, address, tokenId);
            const value = values[i];
            wallet.erc1155[token].set(tokenId, balance - value);
        });

        // create voucher
        return createERC1155BatchTransferVoucher(
            token,
            this.dapp,
            address,
            tokenIds,
            values,
            data,
        );
    }
}
