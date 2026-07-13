import type { Advance } from "@deroll/core";
import {
    type Hex,
    concat,
    encodeAbiParameters,
    encodePacked,
    parseAbiParameters,
} from "viem";
import { describe, expect, test } from "vitest";

import {
    erc1155BatchPortalAddress,
    erc1155SinglePortalAddress,
    erc20PortalAddress,
    erc721PortalAddress,
    etherPortalAddress,
} from "@cartesi/viem/abi";
import { createWallet } from "../src/index.js";

// build an advance request from the portal sender and a hex payload
const advance = (msgSender: Hex, payload: Hex): Advance => ({
    chainId: 1n,
    appContract: "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e",
    msgSender,
    blockNumber: 0n,
    blockTimestamp: 0n,
    prevRandao: 0n,
    index: 0n,
    payload,
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
        const payload = encodePacked(["address", "uint256"], [sender, value]);
        const response = await wallet.handler(
            advance(etherPortalAddress, payload),
        );
        expect(response).toBeTruthy();
        expect(wallet.etherBalanceOf(sender)).toEqual(value);

        const voucher = wallet.withdrawEther(sender, withdraw);
        expect(wallet.etherBalanceOf(sender)).toEqual(value - withdraw);
        expect(voucher).toEqual({
            destination: sender,
            value: withdraw,
            payload: "0x",
        });
    });

    test("ERC20 with no balance", () => {
        const wallet = createWallet();
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const value = 3n;
        expect(() => wallet.withdrawErc20(token, sender, value)).toThrowError();
    });

    test("ERC20", async () => {
        const wallet = createWallet();
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const value = 3n;
        const withdraw = 1n;
        expect(wallet.erc20BalanceOf(token, sender)).toBe(0n);
        const payload = encodePacked(
            ["address", "address", "uint256"],
            [token, sender, value],
        );
        const response = await wallet.handler(
            advance(erc20PortalAddress, payload),
        );
        expect(response).toBeTruthy();
        expect(wallet.erc20BalanceOf(token, sender)).toBe(value);

        const transfer = wallet.withdrawErc20(token, sender, withdraw);
        expect(wallet.erc20BalanceOf(token, sender)).toBe(value - withdraw);
        expect(transfer).toEqual({
            recipient: sender,
            token,
            value: withdraw,
        });
    });

    test("ERC721 with no balance", () => {
        const wallet = createWallet();
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const tokenId = 1n;
        expect(() =>
            wallet.withdrawErc721(token, sender, tokenId),
        ).toThrowError();
    });

    test("ERC721", async () => {
        const wallet = createWallet();
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const tokenId = 1n;
        expect(wallet.erc721Has(token, sender, tokenId)).toBe(false);
        const payload = encodePacked(
            ["address", "address", "uint256"],
            [token, sender, tokenId],
        );
        const response = await wallet.handler(
            advance(erc721PortalAddress, payload),
        );
        expect(response).toBeTruthy();
        expect(wallet.erc721Has(token, sender, tokenId)).toBe(true);

        const transfer = wallet.withdrawErc721(token, sender, tokenId);
        expect(wallet.erc721Has(token, sender, tokenId)).toBe(false);
        expect(transfer).toEqual({
            recipient: sender,
            token,
            tokenId,
        });
    });

    test("ERC1155 with no balance", () => {
        const wallet = createWallet();
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const tokenId = 1n;
        const value = 3n;
        expect(() =>
            wallet.withdrawErc1155(token, sender, tokenId, value),
        ).toThrowError();
    });

    test("ERC1155", async () => {
        const wallet = createWallet();
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const tokenId = 1n;
        const value = 3n;
        const withdraw = 1n;
        expect(wallet.erc1155BalanceOf(token, sender, tokenId)).toBe(0n);
        const payload = encodePacked(
            ["address", "address", "uint256", "uint256"],
            [token, sender, tokenId, value],
        );
        const response = await wallet.handler(
            advance(erc1155SinglePortalAddress, payload),
        );
        expect(response).toBeTruthy();
        expect(wallet.erc1155BalanceOf(token, sender, tokenId)).toBe(value);

        const transfer = wallet.withdrawErc1155(
            token,
            sender,
            tokenId,
            withdraw,
        );
        expect(wallet.erc1155BalanceOf(token, sender, tokenId)).toBe(
            value - withdraw,
        );
        expect(transfer).toEqual({
            recipient: sender,
            token,
            tokenId,
            value: withdraw,
        });
    });

    test("ERC1155 batch with wrong array length", () => {
        const wallet = createWallet();
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const tokenIds = [1n, 2n];
        const values = [3n];
        expect(() =>
            wallet.withdrawBatchErc1155(token, sender, tokenIds, values),
        ).toThrowError();
    });

    test("ERC1155 batch with no balance", () => {
        const wallet = createWallet();
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const tokenIds = [1n, 2n];
        const values = [3n, 5n];
        expect(() =>
            wallet.withdrawBatchErc1155(token, sender, tokenIds, values),
        ).toThrowError();
    });

    test("ERC1155 batch", async () => {
        const wallet = createWallet();
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const tokenIds = [1n, 2n];
        const values = [3n, 5n];
        const withdraws = [1n, 2n];
        expect(wallet.erc1155BalanceOf(token, sender, tokenIds[0])).toBe(0n);
        expect(wallet.erc1155BalanceOf(token, sender, tokenIds[1])).toBe(0n);
        const payload = encodePacked(["address", "address"], [token, sender]);
        const rest = encodeAbiParameters(
            parseAbiParameters("uint256[], uint256[]"),
            [tokenIds, values],
        );

        const response = await wallet.handler(
            advance(erc1155BatchPortalAddress, concat([payload, rest])),
        );
        expect(response).toBeTruthy();
        expect(wallet.erc1155BalanceOf(token, sender, tokenIds[0])).toBe(
            values[0],
        );
        expect(wallet.erc1155BalanceOf(token, sender, tokenIds[1])).toBe(
            values[1],
        );

        const transfer = wallet.withdrawBatchErc1155(
            token,
            sender,
            tokenIds,
            withdraws,
        );
        expect(wallet.erc1155BalanceOf(token, sender, tokenIds[0])).toBe(
            values[0] - withdraws[0],
        );
        expect(wallet.erc1155BalanceOf(token, sender, tokenIds[1])).toBe(
            values[1] - withdraws[1],
        );
        expect(transfer).toEqual({
            recipient: sender,
            token,
            items: [
                [tokenIds[0], withdraws[0]],
                [tokenIds[1], withdraws[1]],
            ],
        });
    });
});
