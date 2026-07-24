import {
    encodeErc20Deposit,
    encodeErc721Deposit,
    encodeErc1155BatchDeposit,
    encodeErc1155SingleDeposit,
    encodeEtherDeposit,
    erc20PortalAddress,
    erc721PortalAddress,
    erc1155BatchPortalAddress,
    erc1155SinglePortalAddress,
    etherPortalAddress,
} from "@cartesi/codec";
import type { AdvanceRequestData } from "@deroll/core";
import {
    type Hex,
    encodeFunctionData,
    erc20Abi,
    erc721Abi,
    zeroHash,
} from "viem";
import { describe, expect, test } from "vitest";

import { erc1155Abi } from "../src/abi/index.js";
import { createWallet } from "../src/index.js";

// build a libcmt-shaped advance request from the portal sender and a hex payload
const advance = (msgSender: Hex, payload: Hex): AdvanceRequestData => ({
    metadata: {
        chainId: 1n,
        appContract: "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e",
        msgSender,
        blockNumber: 0n,
        blockTimestamp: 0n,
        prevRandao: 0n,
        index: 0n,
    },
    payload: Buffer.from(payload.slice(2), "hex"),
});

describe("withdraw", () => {
    test("ETH with no balance", () => {
        const wallet = createWallet();
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const value = 1n;
        expect(() => wallet.withdrawEther(sender, value)).toThrowError();
    });

    test("ETH", async () => {
        const wallet = createWallet();
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const value = 3n;
        const withdraw = 1n;

        // deposit 1 wei to "from"
        const payload = encodeEtherDeposit({
            sender,
            value,
            execLayerData: "0x",
        });
        const response = await wallet.handler(
            advance(etherPortalAddress, payload),
        );
        expect(response).toBeTruthy();
        expect(wallet.etherBalanceOf(sender)).toEqual(value);

        const voucher = wallet.withdrawEther(sender, withdraw);
        expect(wallet.etherBalanceOf(sender)).toEqual(value - withdraw);
        expect(voucher.destination).toBe(sender);
        expect(voucher.payload).toBe("0x");
    });

    test("ERC20 with no balance", () => {
        const wallet = createWallet();
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const value = 3n;
        expect(() => wallet.withdrawERC20(token, sender, value)).toThrowError();
    });

    test("ERC20", async () => {
        const wallet = createWallet();
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const value = 3n;
        const withdraw = 1n;
        expect(wallet.erc20BalanceOf(token, sender)).toBe(0n);
        const payload = encodeErc20Deposit({
            token,
            sender,
            value,
            execLayerData: "0x",
        });
        const response = await wallet.handler(
            advance(erc20PortalAddress, payload),
        );
        expect(response).toBeTruthy();
        expect(wallet.erc20BalanceOf(token, sender)).toBe(value);

        const voucher = wallet.withdrawERC20(token, sender, withdraw);
        expect(wallet.erc20BalanceOf(token, sender)).toBe(value - withdraw);
        expect(voucher.destination).toBe(token);
        expect(voucher.payload).toBe(
            encodeFunctionData({
                abi: erc20Abi,
                functionName: "transfer",
                args: [sender, withdraw],
            }),
        );
    });

    test("ERC721 with no balance", () => {
        const wallet = createWallet();
        const dapp = "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e";
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const tokenId = 1n;
        expect(() =>
            wallet.withdrawERC721(dapp, token, sender, tokenId),
        ).toThrowError();
    });

    test("ERC721", async () => {
        const wallet = createWallet();
        const dapp = "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e";
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const tokenId = 1n;
        expect(wallet.erc721Has(token, sender, tokenId)).toBe(false);
        const payload = encodeErc721Deposit({
            token,
            sender,
            tokenId,
            baseLayerData: "0x",
            execLayerData: "0x",
        });
        const response = await wallet.handler(
            advance(erc721PortalAddress, payload),
        );
        expect(response).toBeTruthy();
        expect(wallet.erc721Has(token, sender, tokenId)).toBe(true);

        const voucher = wallet.withdrawERC721(dapp, token, sender, tokenId);
        expect(wallet.erc721Has(token, sender, tokenId)).toBe(false);
        expect(voucher.destination).toBe(token);
        expect(voucher.payload).toBe(
            encodeFunctionData({
                abi: erc721Abi,
                functionName: "safeTransferFrom",
                args: [dapp, sender, tokenId],
            }),
        );
    });

    test("ERC1155 with no balance", () => {
        const wallet = createWallet();
        const dapp = "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e";
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const tokenId = 1n;
        const value = 3n;
        const data = zeroHash;
        expect(() =>
            wallet.withdrawERC1155(dapp, token, sender, tokenId, value, data),
        ).toThrowError();
    });

    test("ERC1155", async () => {
        const wallet = createWallet();
        const dapp = "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e";
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const tokenId = 1n;
        const value = 3n;
        const withdraw = 1n;
        const data = zeroHash;
        expect(wallet.erc1155BalanceOf(token, sender, tokenId)).toBe(0n);
        const payload = encodeErc1155SingleDeposit({
            token,
            sender,
            tokenId,
            value,
            baseLayerData: "0x",
            execLayerData: "0x",
        });
        const response = await wallet.handler(
            advance(erc1155SinglePortalAddress, payload),
        );
        expect(response).toBeTruthy();
        expect(wallet.erc1155BalanceOf(token, sender, tokenId)).toBe(value);

        const voucher = wallet.withdrawERC1155(
            dapp,
            token,
            sender,
            tokenId,
            withdraw,
            data,
        );
        expect(wallet.erc1155BalanceOf(token, sender, tokenId)).toBe(
            value - withdraw,
        );
        expect(voucher.destination).toBe(token);
        expect(voucher.payload).toBe(
            encodeFunctionData({
                abi: erc1155Abi,
                functionName: "safeTransferFrom",
                args: [dapp, sender, tokenId, withdraw, data],
            }),
        );
    });

    test("ERC1155 batch with wrong array length", () => {
        const wallet = createWallet();
        const dapp = "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e";
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const tokenIds = [1n, 2n];
        const values = [3n];
        const data = zeroHash;
        expect(() =>
            wallet.withdrawBatchERC1155(
                dapp,
                token,
                sender,
                tokenIds,
                values,
                data,
            ),
        ).toThrowError();
    });

    test("ERC1155 batch with no balance", () => {
        const wallet = createWallet();
        const dapp = "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e";
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const tokenIds = [1n, 2n];
        const values = [3n, 5n];
        const data = zeroHash;
        expect(() =>
            wallet.withdrawBatchERC1155(
                dapp,
                token,
                sender,
                tokenIds,
                values,
                data,
            ),
        ).toThrowError();
    });

    test("ERC1155 batch", async () => {
        const wallet = createWallet();
        const dapp = "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e";
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const dappAddress = "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e";
        const tokenIds = [1n, 2n];
        const values = [3n, 5n];
        const withdraws = [1n, 2n];
        const data = zeroHash;
        expect(wallet.erc1155BalanceOf(token, sender, tokenIds[0])).toBe(0n);
        expect(wallet.erc1155BalanceOf(token, sender, tokenIds[1])).toBe(0n);
        const payload = encodeErc1155BatchDeposit({
            token,
            sender,
            tokenIds,
            values,
            baseLayerData: "0x",
            execLayerData: "0x",
        });

        const response = await wallet.handler(
            advance(erc1155BatchPortalAddress, payload),
        );
        expect(response).toBeTruthy();
        expect(wallet.erc1155BalanceOf(token, sender, tokenIds[0])).toBe(
            values[0],
        );
        expect(wallet.erc1155BalanceOf(token, sender, tokenIds[1])).toBe(
            values[1],
        );

        const voucher = wallet.withdrawBatchERC1155(
            dapp,
            token,
            sender,
            tokenIds,
            withdraws,
            data,
        );
        expect(wallet.erc1155BalanceOf(token, sender, tokenIds[0])).toBe(
            values[0] - withdraws[0],
        );
        expect(wallet.erc1155BalanceOf(token, sender, tokenIds[1])).toBe(
            values[1] - withdraws[1],
        );
        expect(voucher.destination).toBe(token);
        expect(voucher.payload).toBe(
            encodeFunctionData({
                abi: erc1155Abi,
                functionName: "safeBatchTransferFrom",
                args: [dappAddress, sender, tokenIds, withdraws, data],
            }),
        );
    });
});
