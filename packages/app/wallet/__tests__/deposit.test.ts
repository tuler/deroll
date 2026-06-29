import type { AdvanceRequestData } from "@deroll/core";
import {
    type Address,
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

describe("deposit", () => {
    test("ETH", async () => {
        const wallet = createWallet();
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const value = 123456n;
        const payload = encodePacked(["address", "uint256"], [sender, value]);
        const response = await wallet.handler(
            advance(etherPortalAddress, payload),
        );
        expect(response).toBeTruthy();
        expect(wallet.etherBalanceOf(sender)).toEqual(value);
    });

    test("ETH non normalized address", async () => {
        const wallet = createWallet();
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const value = 123456n;
        const payload = encodePacked(
            ["address", "uint256"],
            [sender.toLowerCase() as Address, value],
        );
        const response = await wallet.handler(
            advance(etherPortalAddress, payload),
        );
        expect(response).toBeTruthy();
        expect(wallet.etherBalanceOf(sender.toLowerCase())).toEqual(value);
    });

    test("ERC20", async () => {
        const wallet = createWallet();
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const amount = 123n;
        expect(wallet.erc20BalanceOf(token, sender)).toBe(0n);
        const payload = encodePacked(
            ["address", "address", "uint256"],
            [token, sender, amount],
        );
        const response = await wallet.handler(
            advance(erc20PortalAddress, payload),
        );
        expect(response).toBeTruthy();
        expect(wallet.erc20BalanceOf(token, sender)).toBe(amount);
    });

    test("ERC721", async () => {
        const wallet = createWallet();
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const tokenId = 123n;
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
    });

    test("ERC1155", async () => {
        const wallet = createWallet();
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const tokenId = 1n;
        const value = 123n;
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
    });

    test("multiple ERC1155", async () => {
        const wallet = createWallet();
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const tokenIds = [1n, 2n];
        const values = [123n, 456n];
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
    });
});
