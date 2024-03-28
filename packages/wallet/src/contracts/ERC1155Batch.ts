import {
    type Address,
    isHex,
    getAddress,
    isAddress,
    encodeFunctionData,
} from "viem";
import { Voucher } from "@deroll/app";
import { erc1155Abi, erc1155BatchPortalAddress } from "../rollups";
import { parseERC1155BatchDeposit } from "..";
import { DepositArgs, DepositOperation } from "../token";
import { Wallet } from "../wallet";
import {
    ArrayEmptyError,
    NegativeTokenIdError,
    ArrayNoSameLength,
    InsufficientBalanceError,
} from "../errors";

interface BalanceOf {
    addresses: Address[];
    tokenIds: bigint[];
    owner: string;
    getWallet(address: string): Wallet;
}

interface Transfer {
    tokenIds: bigint[];
    amounts: bigint[];
    from: Address;
    to: Address;
    getWallet(address: string): Wallet;
    setWallet(address: string, wallet: Wallet): void;
    token: Address;
}

interface Withdraw {
    tokenIds: bigint[];
    amounts: bigint[];
    token: Address;
    address: Address;
    getWallet(address: string): Wallet;
    getDapp(): Address;
}

export class ERC1155Batch implements DepositOperation {
    balanceOf({ addresses, tokenIds, owner, getWallet }: BalanceOf): bigint[] {
        if (addresses.length !== tokenIds.length) {
            throw new ArrayNoSameLength("addresses", "tokenIds");
        }

        const wallet = getWallet(owner);
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
        getWallet,
        setWallet,
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

        const walletFrom = getWallet(from);
        const walletTo = getWallet(to);

        const nfts = new Map(walletFrom.erc1155[token]);

        // check balance
        for (let i = 0; i < tokenIds.length; i++) {
            const tokenId = tokenIds[i];
            const amount = amounts[i];

            const item = nfts.get(tokenId) ?? 0n;

            if (amount < 0n) {
                throw new NegativeTokenIdError(tokenId, amount);
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

        setWallet(from, walletFrom);
        setWallet(to, walletTo);
    }
    withdraw({
        getWallet,
        tokenIds,
        amounts,
        token,
        address,
        getDapp,
    }: Withdraw): Voucher {
        if (!tokenIds.length) throw new ArrayEmptyError("tokenIds");
        if (!amounts.length) throw new ArrayEmptyError("amounts");

        if (tokenIds.length !== amounts.length) {
            throw new ArrayNoSameLength("tokenIds", "amounts");
        }

        // normalize addresses
        token = getAddress(token);
        address = getAddress(address);

        const wallet = getWallet(address);

        const nfts = new Map(wallet.erc1155[token]);

        // check balance
        for (let i = 0; i < tokenIds.length; i++) {
            const tokenId = tokenIds[i];
            const value = amounts[i];
            if (value < 0n) {
                throw new NegativeTokenIdError(tokenId, value);
            }
            const balance = nfts.get(tokenId) ?? 0n;
            if (balance < value) {
                throw new InsufficientBalanceError(address, token, value);
            }

            nfts.set(tokenId, balance - value);
        }

        wallet.erc1155[token] = nfts;

        const dappAddress = getDapp();
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
    async deposit({
        payload,
        setWallet,
        getWallet,
    }: DepositArgs): Promise<void> {
        const { token, sender, tokenIds, values } =
            parseERC1155BatchDeposit(payload);

        const wallet = getWallet(sender);
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
        setWallet(sender, wallet);
    }
    isDeposit(msgSender: Address): boolean {
        return msgSender === erc1155BatchPortalAddress;
    }
}
export const erc1155Batch = new ERC1155Batch();
