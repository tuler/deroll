import type {
    AdvanceRequestHandler,
    CallVoucher,
    Erc20Transfer,
    Erc721Transfer,
    Erc1155BatchTransfer,
    Erc1155Transfer,
} from "@deroll/core";
import { type Address, getAddress, isAddress } from "viem";

import {
    isErc1155BatchDeposit,
    isErc1155SingleDeposit,
    isErc20Deposit,
    isErc721Deposit,
    isEtherDeposit,
    parseErc1155BatchDeposit,
    parseErc1155SingleDeposit,
    parseErc20Deposit,
    parseErc721Deposit,
    parseEtherDeposit,
} from "./index.js";

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
    transferErc20(
        token: Address,
        from: string,
        to: string,
        amount: bigint,
    ): void;
    transferErc721(
        token: Address,
        from: string,
        to: string,
        tokenId: bigint,
    ): void;
    transferErc1155(
        token: Address,
        from: string,
        to: string,
        tokenId: bigint,
        value: bigint,
    ): void;
    transferBatchErc1155(
        token: Address,
        from: string,
        to: string,
        tokenIds: bigint[],
        values: bigint[],
    ): void;
    withdrawEther(address: Address, value: bigint): CallVoucher;
    withdrawErc20(
        token: Address,
        address: Address,
        amount: bigint,
    ): Erc20Transfer;
    withdrawErc721(
        token: Address,
        address: Address,
        tokenId: bigint,
    ): Erc721Transfer;
    withdrawErc1155(
        token: Address,
        address: Address,
        tokenId: bigint,
        value: bigint,
    ): Erc1155Transfer;
    withdrawBatchErc1155(
        token: Address,
        address: Address,
        tokenIds: bigint[],
        values: bigint[],
    ): Erc1155BatchTransfer;
}

export class WalletAppImpl implements WalletApp {
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
            const { sender, value } = parseEtherDeposit(data.payload);

            // get or create wallet
            const wallet = this.wallets[sender] ?? createEmptyWallet();

            // increment balance
            wallet.ether += value;

            this.wallets[sender] = wallet;
            return true;
        } else if (isErc20Deposit(data)) {
            // parse payload
            const { token, sender, amount } = parseErc20Deposit(data.payload);

            // get or create wallet
            const wallet = this.wallets[sender] ?? createEmptyWallet();

            // increment balance
            wallet.erc20[token] = wallet.erc20[token]
                ? wallet.erc20[token] + amount
                : amount;

            this.wallets[sender] = wallet;

            return true;
        } else if (isErc721Deposit(data)) {
            // parse payload
            const { sender, token, tokenId } = parseErc721Deposit(data.payload);

            // get or create wallet
            const wallet = this.wallets[sender] ?? createEmptyWallet();

            // set ownership
            wallet.erc721[token] = wallet.erc721[token] ?? new Set();
            wallet.erc721[token].add(tokenId);

            this.wallets[sender] = wallet;
            return true;
        } else if (isErc1155SingleDeposit(data)) {
            // parse payload
            const { sender, token, tokenId, value } = parseErc1155SingleDeposit(
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
            return true;
        } else if (isErc1155BatchDeposit(data)) {
            // parse payload
            const { sender, token, tokenIds, values } =
                parseErc1155BatchDeposit(data.payload);

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
            return true;
        }
        return false;
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

    public transferErc20(
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

    public transferErc721(
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

    public transferErc1155(
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

    public transferBatchErc1155(
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

    withdrawEther(address: Address, value: bigint): CallVoucher {
        // normalize address
        address = getAddress(address);

        // check balance
        const balance = this.etherBalanceOf(address);
        if (this.etherBalanceOf(address) < value) {
            throw new Error(
                `insufficient balance of user ${address}: ${value.toString()} > ${balance.toString()}`,
            );
        }

        const wallet = this.wallets[address];

        // reduce balance right away
        wallet.ether = wallet.ether - value;

        // plain transfer voucher (no calldata)
        return {
            destination: address,
            value,
            payload: "0x",
        };
    }

    withdrawErc20(
        token: Address,
        address: Address,
        amount: bigint,
    ): Erc20Transfer {
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

        return {
            recipient: address,
            token,
            value: amount,
        };
    }

    withdrawErc721(
        token: Address,
        address: Address,
        tokenId: bigint,
    ): Erc721Transfer {
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

        const wallet = this.wallets[address];

        // remove tokenId right away
        wallet.erc721[token].delete(tokenId);

        return {
            recipient: address,
            token,
            tokenId,
        };
    }

    withdrawErc1155(
        token: Address,
        address: Address,
        tokenId: bigint,
        value: bigint,
    ): Erc1155Transfer {
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

        const wallet = this.wallets[address];

        // reduce balance right away
        wallet.erc1155[token].set(tokenId, balance - value);

        return {
            recipient: address,
            token,
            tokenId,
            value,
        };
    }

    withdrawBatchErc1155(
        token: Address,
        address: Address,
        tokenIds: bigint[],
        values: bigint[],
    ): Erc1155BatchTransfer {
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

        const wallet = this.wallets[address];

        // reduce balance right away
        tokenIds.forEach((tokenId, i) => {
            const balance = this.erc1155BalanceOf(token, address, tokenId);
            const value = values[i];
            wallet.erc1155[token].set(tokenId, balance - value);
        });

        return {
            recipient: address,
            token,
            items: tokenIds.map(
                (tokenId, i) => [tokenId, values[i]] as [bigint, bigint],
            ),
        };
    }
}
