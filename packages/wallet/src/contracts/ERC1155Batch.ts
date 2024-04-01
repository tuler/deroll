import {
    type Address,
    getAddress,
    isAddress,
    encodeFunctionData,
} from "viem";
import { Voucher, type AdvanceRequestHandler } from "@deroll/app";
import { erc1155Abi } from "../rollups";
import { parseERC1155BatchDeposit } from "..";
import { CanHandler } from "../types";
import { Wallet, type WalletApp } from "../wallet";
import {
    ArrayEmptyError,
    ArrayNoSameLength,
    InsufficientBalanceError,
    NegativeAmountError,
} from "../errors";

interface BalanceOf {
    addresses: Address[];
    tokenIds: bigint[];
    owner: string;
}

interface Transfer {
    tokenIds: bigint[];
    amounts: bigint[];
    from: string;
    to: string;
    token: Address;
}

interface Withdraw {
    tokenIds: bigint[];
    amounts: bigint[];
    token: Address;
    address: Address;
}

export class ERC1155Batch implements CanHandler {
    constructor(private wallet: WalletApp) { };

    balanceOf({ addresses, tokenIds, owner }: BalanceOf): bigint[] {
        if (addresses.length !== tokenIds.length) {
            throw new ArrayNoSameLength("addresses", "tokenIds");
        }

        const wallet = this.wallet.getWalletOrNew(owner);
        const balances: bigint[] = [];

        for (let i = 0; i < addresses.length; i++) {
            let address = getAddress(addresses[i]);

            const tokenId = tokenIds[i];

            const collection = wallet.erc1155[address];
            const item = collection?.get(tokenId) ?? 0n;
            balances.push(item);
        }

        return balances;
    }
    transfer({
        tokenIds,
        amounts,
        from,
        to,
        token,
    }: Transfer): void {
        if (tokenIds.length !== amounts.length) {
            throw new ArrayNoSameLength("tokenIds", "amounts");
        }

        token = getAddress(token);

        if (isAddress(from)) {
            from = getAddress(from);
        }

        if (isAddress(to)) {
            to = getAddress(to);
        }

        const walletFrom = this.wallet.getWalletOrNew(from);
        const walletTo = this.wallet.getWalletOrNew(to);

        const nfts = new Map(walletFrom.erc1155[token]);

        // check balance
        for (let i = 0; i < tokenIds.length; i++) {
            const tokenId = tokenIds[i];
            const amount = amounts[i];

            const item = nfts.get(tokenId) ?? 0n;

            if (amount < 0n) {
                throw new NegativeAmountError(amount);
            }
            if (item < amount) {
                throw new InsufficientBalanceError(from, token, amount);
            }

            nfts.set(tokenId, item - amount);
        }

        walletFrom.erc1155[token] = nfts;

        let nftsTo = walletTo.erc1155[token];
        if (!nftsTo) {
            nftsTo = new Map();
            walletTo.erc1155[token] = nftsTo;
        }

        for (let i = 0; i < tokenIds.length; i++) {
            const tokenId = tokenIds[i];
            const value = amounts[i];
            const item = nftsTo.get(tokenId) ?? 0n;
            nftsTo.set(tokenId, item + value);
        }

        this.wallet.setWallet(from, walletFrom);
        this.wallet.setWallet(to, walletTo);
    }
    withdraw({
        tokenIds,
        amounts,
        token,
        address,
    }: Withdraw): Voucher {
        if (!tokenIds.length) throw new ArrayEmptyError("tokenIds");
        if (!amounts.length) throw new ArrayEmptyError("amounts");

        if (tokenIds.length !== amounts.length) {
            throw new ArrayNoSameLength("tokenIds", "amounts");
        }

        // normalize addresses
        token = getAddress(token);
        address = getAddress(address);

        const wallet = this.wallet.getWalletOrNew(address);

        const nfts = new Map(wallet.erc1155[token]);

        // check balance
        for (let i = 0; i < tokenIds.length; i++) {
            const tokenId = tokenIds[i];
            const value = amounts[i];
            const balance = nfts.get(tokenId) ?? 0n;

            if (value < 0n) {
                throw new NegativeAmountError(value);
            }
            if (balance < value) {
                throw new InsufficientBalanceError(address, token, value);
            }

            nfts.set(tokenId, balance - value);
        }

        wallet.erc1155[token] = nfts;

        const dappAddress = this.wallet.getDappAddressOrThrow();
        let call = encodeFunctionData({
            abi: erc1155Abi,
            functionName: "safeBatchTransferFrom",
            args: [dappAddress, address, tokenIds, amounts, "0x"],
        });

        return {
            destination: token,
            payload: call,
        };
    }

    handler: AdvanceRequestHandler = async ({ payload }) => {

        const { token, sender, tokenIds, values } =
            parseERC1155BatchDeposit(payload);

        const wallet = this.wallet.getWalletOrNew(sender);
        let collection = wallet.erc1155[token];
        if (!collection) {
            collection = new Map();
            wallet.erc1155[token] = collection;
        }

        for (let i = 0; i < tokenIds.length; i++) {
            const tokenId = tokenIds[i];
            const value = values[i];

            const tokenBalance = collection.get(tokenId) ?? 0n;
            collection.set(tokenId, tokenBalance + value);
        }
        this.wallet.setWallet(sender, wallet);

        return "accept"
    }
}
