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
import type { Hex } from "viem";
import { describe, expect, test } from "vitest";

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

describe("transfer", () => {
    test("ETH without balance", () => {
        const wallet = createWallet();
        const from = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const to = "0xd8464d1B3592b6c3786B32931E2a2AdAC501Aaad";

        expect(() => wallet.transferEther(from, to, 1n)).toThrowError();
    });

    test("ETH", async () => {
        const wallet = createWallet();
        const from = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const to = "0xd8464d1B3592b6c3786B32931E2a2AdAC501Aaad";
        const value = 3n;
        const transfer = 1n;

        // deposit 1 wei to "from"
        const payload = encodeEtherDeposit({
            sender: from,
            value,
            execLayerData: "0x",
        });
        const response = await wallet.handler(
            advance(etherPortalAddress, payload),
        );
        expect(response).toBeTruthy();
        expect(wallet.etherBalanceOf(from)).toEqual(value);
        expect(wallet.etherBalanceOf(to)).toEqual(0n);

        wallet.transferEther(from, to, transfer);
        expect(wallet.etherBalanceOf(from)).toEqual(value - transfer);
        expect(wallet.etherBalanceOf(to)).toEqual(transfer);
    });

    test("ERC20 without balance", () => {
        const wallet = createWallet();
        const from = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const to = "0xd8464d1B3592b6c3786B32931E2a2AdAC501Aaad";
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";

        expect(() => wallet.transferERC20(token, from, to, 1n)).toThrowError();
    });

    test("ERC20", async () => {
        const wallet = createWallet();
        const from = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const to = "0xd8464d1B3592b6c3786B32931E2a2AdAC501Aaad";
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const value = 3n;
        const transfer = 1n;

        // deposit 1 wei to "from"
        const payload = encodeErc20Deposit({
            token,
            sender: from,
            value,
            execLayerData: "0x",
        });
        const response = await wallet.handler(
            advance(erc20PortalAddress, payload),
        );
        expect(response).toBeTruthy();
        expect(wallet.erc20BalanceOf(token, from)).toEqual(value);
        expect(wallet.erc20BalanceOf(token, to)).toEqual(0n);

        wallet.transferERC20(token, from, to, transfer);
        expect(wallet.erc20BalanceOf(token, from)).toEqual(value - transfer);
        expect(wallet.erc20BalanceOf(token, to)).toEqual(transfer);
    });

    test("ERC721 without ownership", () => {
        const wallet = createWallet();
        const from = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const to = "0xd8464d1B3592b6c3786B32931E2a2AdAC501Aaad";
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const tokenId = 1n;

        expect(() =>
            wallet.transferERC721(token, from, to, tokenId),
        ).toThrowError();
    });

    test("ERC721", async () => {
        const wallet = createWallet();
        const from = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const to = "0xd8464d1B3592b6c3786B32931E2a2AdAC501Aaad";
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const tokenId = 1n;

        // deposit 1 to "from"
        const payload = encodeErc721Deposit({
            token,
            sender: from,
            tokenId,
            baseLayerData: "0x",
            execLayerData: "0x",
        });
        const response = await wallet.handler(
            advance(erc721PortalAddress, payload),
        );
        expect(response).toBeTruthy();
        expect(wallet.erc721Has(token, from, tokenId)).toEqual(true);
        expect(wallet.erc721Has(token, to, tokenId)).toEqual(false);

        wallet.transferERC721(token, from, to, tokenId);
        expect(wallet.erc721Has(token, from, tokenId)).toEqual(false);
        expect(wallet.erc721Has(token, to, tokenId)).toEqual(true);
    });

    test("ERC1155 without balance", () => {
        const wallet = createWallet();
        const from = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const to = "0xd8464d1B3592b6c3786B32931E2a2AdAC501Aaad";
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const tokenId = 1n;

        expect(() =>
            wallet.transferERC1155(token, from, to, tokenId, 1n),
        ).toThrowError();
    });

    test("ERC1155", async () => {
        const wallet = createWallet();
        const from = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const to = "0xd8464d1B3592b6c3786B32931E2a2AdAC501Aaad";
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const tokenId = 1n;
        const value = 3n;
        const transfer = 1n;

        // deposit 1 wei to "from"
        const payload = encodeErc1155SingleDeposit({
            token,
            sender: from,
            tokenId,
            value,
            baseLayerData: "0x",
            execLayerData: "0x",
        });
        const response = await wallet.handler(
            advance(erc1155SinglePortalAddress, payload),
        );
        expect(response).toBeTruthy();
        expect(wallet.erc1155BalanceOf(token, from, tokenId)).toEqual(value);
        expect(wallet.erc1155BalanceOf(token, to, tokenId)).toEqual(0n);

        wallet.transferERC1155(token, from, to, tokenId, transfer);
        expect(wallet.erc1155BalanceOf(token, from, tokenId)).toEqual(
            value - transfer,
        );
        expect(wallet.erc1155BalanceOf(token, to, tokenId)).toEqual(transfer);
    });

    test("ERC1155 batch without balance", () => {
        const wallet = createWallet();
        const from = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const to = "0xd8464d1B3592b6c3786B32931E2a2AdAC501Aaad";
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const tokenIds = [1n, 2n];
        const values = [123n, 456n];

        expect(() =>
            wallet.transferBatchERC1155(token, from, to, tokenIds, values),
        ).toThrowError();
    });

    test("ERC1155 batch wrong arrays", () => {
        const wallet = createWallet();
        const from = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const to = "0xd8464d1B3592b6c3786B32931E2a2AdAC501Aaad";
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const tokenIds = [1n, 2n];
        const values = [123n];

        expect(() =>
            wallet.transferBatchERC1155(token, from, to, tokenIds, values),
        ).toThrowError();
    });

    test("ERC1155 batch", async () => {
        const wallet = createWallet();
        const from = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const to = "0xd8464d1B3592b6c3786B32931E2a2AdAC501Aaad";
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const tokenIds = [1n, 2n];
        const values = [3n, 5n];
        const transfers = [1n, 2n];

        // deposit 1 wei to "from"
        const payload = encodeErc1155BatchDeposit({
            token,
            sender: from,
            tokenIds,
            values,
            baseLayerData: "0x",
            execLayerData: "0x",
        });
        const response = await wallet.handler(
            advance(erc1155BatchPortalAddress, payload),
        );
        expect(response).toBeTruthy();
        expect(wallet.erc1155BalanceOf(token, from, tokenIds[0])).toEqual(
            values[0],
        );
        expect(wallet.erc1155BalanceOf(token, from, tokenIds[1])).toEqual(
            values[1],
        );
        expect(wallet.erc1155BalanceOf(token, to, tokenIds[0])).toEqual(0n);
        expect(wallet.erc1155BalanceOf(token, to, tokenIds[1])).toEqual(0n);

        wallet.transferBatchERC1155(token, from, to, tokenIds, transfers);
        expect(wallet.erc1155BalanceOf(token, from, tokenIds[0])).toEqual(
            values[0] - transfers[0],
        );
        expect(wallet.erc1155BalanceOf(token, from, tokenIds[1])).toEqual(
            values[1] - transfers[1],
        );
        expect(wallet.erc1155BalanceOf(token, to, tokenIds[0])).toEqual(
            transfers[0],
        );
        expect(wallet.erc1155BalanceOf(token, to, tokenIds[1])).toEqual(
            transfers[1],
        );
    });
});
