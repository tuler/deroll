import { MissingContextArgumentError } from "../errors";
import { type Address, isHex, getAddress, isAddress, encodeFunctionData } from "viem";
import { erc1155Abi, erc1155BatchPortalAddress } from "../rollups";
import { parseERC1155BatchDeposit } from "..";
import { TokenOperation, TokenContext } from "../token";
import { Voucher } from "@deroll/app";

export class ERC1155Batch implements TokenOperation {
    balanceOf({
        addresses,
        tokenIds,
        owner,
        getWallet,
    }: TokenContext): bigint[] {
        if (!addresses || !tokenIds || !getWallet || !owner) {
            throw new MissingContextArgumentError<TokenContext>({
                addresses,
                tokenIds,
                getWallet,
            });
        }

        if (addresses.length !== tokenIds.length) {
            throw new Error("addresses and tokenIds must have the same length");
        }

        const ownerAddress = getAddress(owner);
        const wallet = getWallet(ownerAddress);
        const balances: bigint[] = [];

        for (let i = 0; i < addresses.length; i++) {
            let address = addresses[i];
            if (isAddress(address)) {
                address = getAddress(address);
            }

            const tokenId = tokenIds[i];

            const collection = wallet.erc1155.get(address as Address);
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
    }: TokenContext): void {
        if (
            !tokenIds ||
            !amounts ||
            !from ||
            !to ||
            !setWallet ||
            !getWallet ||
            !token
        ) {
            throw new MissingContextArgumentError<TokenContext>({
                tokenIds,
                amounts,
                from,
                to,
                getWallet,
                setWallet,
                token,
            });
        }

        if (tokenIds.length !== amounts.length) {
            throw new Error("tokenIds and values must have the same length");
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
        for (let i = 0; i < tokenIds.length; i++) {
            const tokenId = tokenIds[i];
            const amount = amounts[i];

            const item = nfts.get(tokenId) ?? 0n;

            if (amount < 0n) {
                throw new Error(
                    `negative value for tokenId ${tokenId}: ${amount}`,
                );
            }
            if (item < amount) {
                throw new Error(
                    `insufficient balance of user ${from} of token ${tokenId}: ${amount.toString()} > ${
                        item.toString() ?? "0"
                    }`,
                );
            }
        }

        for (let i = 0; i < tokenIds.length; i++) {
            const tokenId = tokenIds[i];
            const amount = amounts[i];
            const item = nfts.get(tokenId) ?? 0n;
            nfts.set(tokenId, item - amount);
        }

        let nftsTo = walletTo.erc1155.get(token);
        if (!nftsTo) {
            nftsTo = new Map();
            walletTo.erc1155.set(token, nftsTo);
        }

        for (let i = 0; i < tokenIds.length; i++) {
            const tokenId = tokenIds[i];
            const value = amounts[i];
            const item = nftsTo.get(tokenId) ?? 0n;
            nftsTo.set(tokenId, item + value);
        }

        setWallet(from as Address, walletFrom);
        setWallet(to as Address, walletTo);
    }
    withdraw({
        getWallet,
        tokenIds,
        amounts,
        token,
        address,
        getDapp,
    }: TokenContext): Voucher {
        if (!tokenIds || !amounts || !token || !address || !getWallet || !getDapp) {
            throw new MissingContextArgumentError<TokenContext>({
                tokenIds,
                amounts,
                token,
                address,
                getWallet,
                getDapp,
            });
        }

        if (!tokenIds.length || !amounts.length) {
            throw new Error("tokenIds and values must not be empty");
        }

        if (tokenIds.length !== amounts.length) {
            throw new Error(
                `tokenIds(size: ${tokenIds.length})) and values(size: ${amounts.length}) must have the same length`,
            );
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
        for (let i = 0; i < tokenIds.length; i++) {
            const tokenId = tokenIds[i];
            const value = amounts[i];
            if (value < 0n) {
                throw new Error(
                    `negative value for tokenId ${tokenId}: ${value}`,
                );
            }
            const balance = nfts.get(tokenId) ?? 0n;
            if (balance < value) {
                throw new Error(
                    `insufficient balance of user ${address} of token ${token} of tokenId ${tokenId}: ${value.toString()} > ${
                        balance.toString() ?? "0"
                    }`,
                );
            }
        }

        for (let i = 0; i < tokenIds.length; i++) {
            const tokenId = tokenIds[i];
            const value = amounts[i];
            const balance = nfts.get(tokenId) ?? 0n;
            nfts.set(tokenId, balance - value);
        }

        const dappAddress = getDapp();
        let call = encodeFunctionData({
            abi: erc1155Abi,
            functionName: "safeBatchTransferFrom",
            args: [dappAddress, address as Address, tokenIds, amounts, "0x"],
        });

        if (tokenIds.length === 1 && amounts.length === 1) {
            call = encodeFunctionData({
                abi: erc1155Abi,
                functionName: "safeTransferFrom",
                args: [dappAddress, address as Address, tokenIds[0], amounts[0], "0x"],
            });
        }

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
        console.log("ERC-1155 batch");

        if (!payload || !isHex(payload) || !getWallet || !setWallet) {
            throw new MissingContextArgumentError<TokenContext>({
                payload,
                getWallet,
                setWallet,
            });
        }

        const { token, sender, tokenIds, values } =
            parseERC1155BatchDeposit(payload);

        const wallet = getWallet(sender);
        let collection = wallet.erc1155.get(token);
        if (!collection) {
            collection = new Map();
            wallet.erc1155.set(token, collection);
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
