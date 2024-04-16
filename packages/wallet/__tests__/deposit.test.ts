import { RequestMetadata } from "@deroll/core";
import {
    Address,
    concat,
    encodeAbiParameters,
    encodePacked,
    parseAbiParameters,
} from "viem";
import { describe, expect, test } from "vitest";

import { createWallet } from "../src";
import {
    erc1155BatchPortalAddress,
    erc1155SinglePortalAddress,
    erc20PortalAddress,
    erc721PortalAddress,
    etherPortalAddress,
} from "../src/rollups";

describe("deposit", () => {
    test("ETH", async () => {
        const wallet = createWallet();
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const value = 123456n;
        const payload = encodePacked(["address", "uint256"], [sender, value]);
        const metadata = {
            msg_sender: etherPortalAddress,
            block_number: 0,
            epoch_index: 0,
            input_index: 0,
            timestamp: 0,
        };
        const response = await wallet.handler({ metadata, payload });
        expect(response).toEqual("accept");
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
        const metadata = {
            msg_sender: etherPortalAddress,
            block_number: 0,
            epoch_index: 0,
            input_index: 0,
            timestamp: 0,
        };
        const response = await wallet.handler({ metadata, payload });
        expect(response).toEqual("accept");
        expect(wallet.etherBalanceOf(sender.toLowerCase())).toEqual(value);
    });

    test("ERC20", async () => {
        const wallet = createWallet();
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const amount = 123n;
        expect(wallet.erc20BalanceOf(token, sender)).toBe(0n);
        const payload = encodePacked(
            ["bool", "address", "address", "uint256"],
            [true, token, sender, amount],
        );
        const metadata: RequestMetadata = {
            msg_sender: erc20PortalAddress,
            block_number: 0,
            epoch_index: 0,
            input_index: 0,
            timestamp: 0,
        };
        const response = await wallet.handler({ metadata, payload });
        expect(response).toBe("accept");
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
        const metadata: RequestMetadata = {
            msg_sender: erc721PortalAddress,
            block_number: 0,
            epoch_index: 0,
            input_index: 0,
            timestamp: 0,
        };
        const response = await wallet.handler({ metadata, payload });
        expect(response).toBe("accept");
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
        const metadata: RequestMetadata = {
            msg_sender: erc1155SinglePortalAddress,
            block_number: 0,
            epoch_index: 0,
            input_index: 0,
            timestamp: 0,
        };
        const response = await wallet.handler({ metadata, payload });
        expect(response).toBe("accept");
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
        const metadata: RequestMetadata = {
            msg_sender: erc1155BatchPortalAddress,
            block_number: 0,
            epoch_index: 0,
            input_index: 0,
            timestamp: 0,
        };
        const response = await wallet.handler({
            metadata,
            payload: concat([payload, rest]),
        });
        expect(response).toBe("accept");
        expect(wallet.erc1155BalanceOf(token, sender, tokenIds[0])).toBe(
            values[0],
        );
        expect(wallet.erc1155BalanceOf(token, sender, tokenIds[1])).toBe(
            values[1],
        );
    });
});
