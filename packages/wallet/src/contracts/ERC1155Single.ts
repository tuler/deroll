import { MissingContextArgumentError } from "../errors";
import {
    type Address,
    isHex,
    getAddress,
    isAddress,
    encodeFunctionData,
} from "viem";
import { erc1155Abi, erc1155SinglePortalAddress } from "../rollups";
import { parseERC1155SingleDeposit } from "..";
import { TokenOperation, TokenContext } from "../token";
import type { Voucher } from "@deroll/app";

export class ERC1155Single implements TokenOperation {
    balanceOf({ address, tokenId, getWallet, owner }: TokenContext): bigint {
        if (!address || !tokenId || !getWallet || !owner) {
            throw new MissingContextArgumentError<TokenContext>({
                getWallet,
                address,
                tokenId,
                owner,
            });
        }

        const ownerAddress = getAddress(owner);
        const wallet = getWallet(ownerAddress);

        if (isAddress(address)) {
            address = getAddress(address);
        }

        const collection = wallet.erc1155.get(address as Address);
        const balance = collection?.get(tokenId) ?? 0n;

        return balance;
    }
    transfer({
        from,
        to,
        getWallet,
        token,
        tokenId,
        amount,
        setWallet,
    }: TokenContext): void {
        if (
            !token ||
            !from ||
            !to ||
            !tokenId ||
            !getWallet ||
            !amount ||
            !setWallet
        ) {
            throw new MissingContextArgumentError<TokenContext>({
                token,
                from,
                to,
                tokenId,
                getWallet,
                amount,
                setWallet,
            });
        }

        if (isAddress(from)) {
            from = getAddress(from);
        }

        if (isAddress(to)) {
            to = getAddress(to);
        }

        const walletFrom = getWallet(from);
        const walletTo = getWallet(to);

        let nfts = walletFrom.erc1155.get(token);
        if (!nfts) {
            nfts = new Map();
            walletFrom.erc1155.set(token, nfts);
        }

        // check balance
        const balance = nfts.get(tokenId) ?? 0n;

        if (amount < 0n) {
            throw new Error(`negative value for tokenId ${tokenId}: ${amount}`);
        }
        if (balance < amount) {
            throw new Error(
                `insufficient balance of user ${from} of token ${tokenId}: ${amount.toString()} > ${
                    balance.toString() ?? "0"
                }`,
            );
        }

        nfts.set(tokenId, balance - amount);

        let nftsTo = walletTo.erc1155.get(token);
        if (!nftsTo) {
            nftsTo = new Map();
            walletTo.erc1155.set(token, nftsTo);
        }

        const item = nftsTo.get(tokenId) ?? 0n;
        nftsTo.set(tokenId, item + amount);

        setWallet(from as Address, walletFrom);
        setWallet(to as Address, walletTo);
    }
    withdraw({
        getWallet,
        tokenId,
        amount,
        token,
        address,
        getDapp,
    }: TokenContext): Voucher {
        if (
            !tokenId ||
            !amount ||
            !token ||
            !address ||
            !getWallet ||
            !getDapp
        ) {
            throw new MissingContextArgumentError<TokenContext>({
                tokenId,
                amount,
                token,
                address,
                getWallet,
                getDapp,
            });
        }

        // normalize addresses
        token = getAddress(token);
        address = getAddress(address);

        const wallet = getWallet(address);
        let nfts = wallet.erc1155.get(token);

        if (!nfts) {
            nfts = new Map();
            wallet.erc1155.set(token, nfts);
        }

        // check balance
        if (amount < 0n) {
            throw new Error(`negative value for tokenId ${tokenId}: ${amount}`);
        }
        const balance = nfts.get(tokenId) ?? 0n;
        if (balance < amount) {
            throw new Error(
                `insufficient balance of user ${address} of token ${token} of tokenId ${tokenId}: ${amount.toString()} > ${
                    balance.toString() ?? "0"
                }`,
            );
        }

        nfts.set(tokenId, balance - amount);

        const dappAddress = getDapp();

        const call = encodeFunctionData({
            abi: erc1155Abi,
            functionName: "safeTransferFrom",
            args: [dappAddress, address as Address, tokenId, amount, "0x"],
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
    }: TokenContext): Promise<void> {
        console.log("ERC-1155 single");

        if (!payload || !isHex(payload) || !getWallet || !setWallet) {
            throw new MissingContextArgumentError<TokenContext>({
                payload,
                getWallet,
                setWallet,
            });
        }

        const { tokenId, sender, token, value } =
            parseERC1155SingleDeposit(payload);

        const wallet = getWallet(sender);
        let collection = wallet.erc1155.get(token);
        if (!collection) {
            collection = new Map();
            wallet.erc1155.set(token, collection);
        }
        const tokenBalance = collection.get(tokenId) ?? 0n;
        collection.set(tokenId, tokenBalance + value);
        setWallet(sender, wallet);
    }
    isDeposit(msgSender: Address): boolean {
        return msgSender === erc1155SinglePortalAddress;
    }
}
