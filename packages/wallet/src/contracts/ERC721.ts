import { MissingContextArgumentError } from "../errors";
import {
    type Address,
    isHex,
    getAddress,
    isAddress,
    encodeFunctionData,
    erc721Abi,
} from "viem";
import { erc721PortalAddress } from "../rollups";
import { parseERC721Deposit } from "..";
import { TokenOperation, TokenContext } from "../token";
import type { Voucher } from "@deroll/app";

export class ERC721 implements TokenOperation {
    balanceOf({ owner, getWallet, address }: TokenContext): bigint {
        if (!getWallet || !owner || !address) {
            throw new MissingContextArgumentError<TokenContext>({
                getWallet,
                owner,
                address,
            });
        }

        const ownerAddress = getAddress(owner);
        const wallet = getWallet(ownerAddress);
        if (isAddress(address)) {
            address = getAddress(address);
        }
        const size = wallet.erc721.get(address as Address)?.size ?? 0n;
        return BigInt(size);
    }
    transfer({
        from,
        to,
        getWallet,
        setWallet,
        token,
        tokenId,
    }: TokenContext): void {
        if (!from || !to || !getWallet || !setWallet || !token || !tokenId) {
            throw new MissingContextArgumentError<TokenContext>({
                from,
                to,
                getWallet,
            });
        }

        // normalize addresses
        if (isAddress(from)) {
            from = getAddress(from);
        }
        if (isAddress(to)) {
            to = getAddress(to);
        }

        const walletFrom = getWallet(from);
        const walletTo = getWallet(to);

        const balance = walletFrom.erc721.get(token);

        if (!balance) {
            throw new Error(
                `insufficient balance of user ${from} of token ${token}`,
            );
        }

        if (!balance.has(tokenId)) {
            throw new Error(
                `user ${from} does not have token ${tokenId} of token ${token}`,
            );
        }

        let balanceTo = walletTo.erc721.get(token);
        if (!balanceTo) {
            balanceTo = new Set();
            walletTo.erc721.set(token, balanceTo);
        }
        balanceTo.add(tokenId);
        balance.delete(tokenId);

        setWallet(from as Address, walletFrom);
        setWallet(to as Address, walletTo);
    }
    withdraw({
        token,
        address,
        getWallet,
        setWallet,
        tokenId,
        getDapp,
    }: TokenContext): Voucher {
        if (
            !token ||
            !address ||
            !getWallet ||
            !setWallet ||
            !tokenId ||
            !getDapp
        ) {
            throw new MissingContextArgumentError<TokenContext>({
                token,
                address,
                getWallet,
                setWallet,
                tokenId,
                getDapp,
            });
        }

        token = getAddress(token);
        address = getAddress(address);

        const wallet = getWallet(address);

        if (!wallet) {
            throw new Error(`wallet of user ${address} is undefined`);
        }

        const collection = wallet?.erc721.get(token);
        if (!collection) {
            throw new Error(
                `insufficient balance of user ${address} of token ${token}`,
            );
        }
        if (!collection.has(tokenId)) {
            throw new Error(
                `insufficient balance of user ${address} of token ${token} id ${tokenId}`,
            );
        }
        const dappAddress = getDapp();

        collection.delete(tokenId);
        const call = encodeFunctionData({
            abi: erc721Abi,
            functionName: "safeTransferFrom",
            args: [dappAddress, address as Address, tokenId],
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
        console.log("ERC-721 data");

        if (!payload || !isHex(payload) || !setWallet || !getWallet) {
            throw new MissingContextArgumentError<TokenContext>({
                payload,
                setWallet,
                getWallet,
            });
        }

        const { token, sender, tokenId } = parseERC721Deposit(payload);

        const wallet = getWallet(sender);

        const collection = wallet.erc721.get(token);
        if (collection) {
            collection.add(tokenId);
        } else {
            const collection = new Set([tokenId]);
            wallet.erc721.set(token, collection);
        }
        setWallet(sender, wallet);
    }
    isDeposit(msgSender: Address): boolean {
        return msgSender === erc721PortalAddress;
    }
}
