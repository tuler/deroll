import {
    type Address,
    getAddress,
    isAddress,
    encodeFunctionData,
} from "viem";
import type { AdvanceRequestHandler, Voucher } from "@deroll/app";
import { erc1155Abi } from "../rollups";
import { parseERC1155SingleDeposit } from "..";
import { CanHandler } from "../types";
import type { Wallet, WalletApp } from "../wallet";
import { InsufficientBalanceError, NegativeAmountError } from "../errors";

interface BalanceOf {
    address: Address;
    tokenId: bigint;
    owner: string;
}

interface Transfer {
    from: string;
    to: string;
    token: Address;
    tokenId: bigint;
    amount: bigint;
}

interface Withdraw {
    token: Address;
    address: Address;
    tokenId: bigint;
    amount: bigint;
}

export class ERC1155Single implements CanHandler {
    constructor(private wallet: WalletApp) { };

    balanceOf({ address, tokenId, owner }: BalanceOf): bigint {
        const wallet = this.wallet.getWalletOrNew(owner);
        address = getAddress(address);

        const collection = wallet.erc1155[address];
        const balance = collection?.get(tokenId) ?? 0n;

        return balance;
    }
    transfer({
        from,
        to,
        token,
        tokenId,
        amount,
    }: Transfer): void {
        token = getAddress(token);

        if (isAddress(from)) {
            from = getAddress(from);
        }

        if (isAddress(to)) {
            to = getAddress(to);
        }

        const walletFrom = this.wallet.getWalletOrNew(from);
        const walletTo = this.wallet.getWalletOrNew(to);

        let nfts = walletFrom.erc1155[token];
        if (!nfts) {
            nfts = new Map();
            walletFrom.erc1155[token] = nfts;
        }

        // check balance
        const balance = nfts.get(tokenId) ?? 0n;

        if (amount < 0n) {
            throw new NegativeAmountError(amount);
        }
        if (balance < amount) {
            throw new InsufficientBalanceError(from, token, tokenId);
        }

        nfts.set(tokenId, balance - amount);

        let nftsTo = walletTo.erc1155[token];
        if (!nftsTo) {
            nftsTo = new Map();
            walletTo.erc1155[token] = nftsTo;
        }

        const item = nftsTo.get(tokenId) ?? 0n;
        nftsTo.set(tokenId, item + amount);

        this.wallet.setWallet(from, walletFrom);
        this.wallet.setWallet(to, walletTo);
    }
    withdraw({
        tokenId,
        amount,
        token,
        address,
    }: Withdraw): Voucher {
        // normalize addresses
        token = getAddress(token);
        address = getAddress(address);

        const wallet = this.wallet.getWalletOrNew(address);
        let nfts = wallet.erc1155[token];

        if (!nfts) {
            nfts = new Map();
            wallet.erc1155[token] = nfts;
        }

        // check balance
        const balance = nfts.get(tokenId) ?? 0n;
        if (amount < 0n) {
            throw new NegativeAmountError(amount);
        }
        if (balance < amount) {
            throw new InsufficientBalanceError(address, token, tokenId);
        }

        nfts.set(tokenId, balance - amount);

        const dappAddress = this.wallet.getDappAddressOrThrow();

        const call = encodeFunctionData({
            abi: erc1155Abi,
            functionName: "safeTransferFrom",
            args: [dappAddress, address, tokenId, amount, "0x"],
        });

        return {
            destination: token,
            payload: call,
        };
    }

    handler: AdvanceRequestHandler = async ({ payload }) => {
        const { tokenId, sender, token, value } =
            parseERC1155SingleDeposit(payload);

        const wallet = this.wallet.getWalletOrNew(sender);
        let collection = wallet.erc1155[token];
        if (!collection) {
            collection = new Map();
            wallet.erc1155[token] = collection;
        }
        const tokenBalance = collection.get(tokenId) ?? 0n;
        collection.set(tokenId, tokenBalance + value);
        this.wallet.setWallet(sender, wallet);

        return "accept"
    }
}