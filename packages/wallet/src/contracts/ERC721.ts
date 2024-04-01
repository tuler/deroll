import {
    type Address,
    getAddress,
    isAddress,
    encodeFunctionData,
    erc721Abi,
} from "viem";
import type { AdvanceRequestHandler, Voucher } from "@deroll/app";
import { parseERC721Deposit } from "..";
import { CanHandler } from "../types";
import { Wallet, type WalletApp } from "../wallet";
import {
    InsufficientBalanceError,
} from "../errors";

interface BalanceOf {
    owner: Address;
    address: string;
}

interface Transfer {
    from: string;
    to: string;
    token: Address;
    tokenId: bigint;
}

interface Withdraw {
    token: Address;
    address: Address;
    tokenId: bigint;
}

export class ERC721 implements CanHandler {
    constructor(private wallet: WalletApp) { };

    balanceOf({ owner, address }: BalanceOf): bigint {
        const ownerAddress = getAddress(owner);
        const wallet = this.wallet.getWalletOrNew(ownerAddress);
        if (isAddress(address)) {
            address = getAddress(address);
        }
        const size = wallet.erc721[address]?.size ?? 0n;
        return BigInt(size);
    }
    transfer({
        from,
        to,
        token,
        tokenId,
    }: Transfer): void {
        token = getAddress(token);

        // normalize addresses
        if (isAddress(from)) {
            from = getAddress(from);
        }
        if (isAddress(to)) {
            to = getAddress(to);
        }

        const walletFrom = this.wallet.getWalletOrNew(from);
        const walletTo = this.wallet.getWalletOrNew(to);

        let wallet = walletFrom.erc721[token];

        if (!wallet?.has(tokenId)) {
            throw new InsufficientBalanceError(from, token, tokenId);
        }

        let balanceTo = walletTo.erc721[token];
        if (!balanceTo) {
            balanceTo = new Set();
            walletTo.erc721[token] = balanceTo;
        }
        balanceTo.add(tokenId);
        wallet.delete(tokenId);

        this.wallet.setWallet(from, walletFrom);
        this.wallet.setWallet(to, walletTo);
    }
    withdraw({
        token,
        address,
        tokenId,
    }: Withdraw): Voucher {
        token = getAddress(token);
        address = getAddress(address);

        const wallet = this.wallet.getWalletOrNew(address);

        let collection = wallet.erc721[token];

        if (!collection) {
            collection = new Set();
            wallet.erc721[token] = collection;
        }

        if (!collection.has(tokenId)) {
            throw new InsufficientBalanceError(address, token, tokenId);
        }

        const dappAddress = this.wallet.getDappAddressOrThrow();

        collection.delete(tokenId);
        const call = encodeFunctionData({
            abi: erc721Abi,
            functionName: "safeTransferFrom",
            args: [dappAddress, address, tokenId],
        });
        return {
            destination: token,
            payload: call,
        };
    }

    handler: AdvanceRequestHandler = async ({ payload }) => {
        const { token, sender, tokenId } = parseERC721Deposit(payload);

        const wallet = this.wallet.getWalletOrNew(sender);

        const collection = wallet.erc721[token];
        if (collection) {
            collection.add(tokenId);
        } else {
            const collection = new Set([tokenId]);
            wallet.erc721[token] = collection;
        }
        this.wallet.setWallet(sender, wallet);

        return "accept"
    }
}
