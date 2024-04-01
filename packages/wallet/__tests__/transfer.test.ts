import {
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
        const payload = encodePacked(["address", "uint256"], [from, value]);
        const metadata = {
            msg_sender: etherPortalAddress,
            block_number: 0,
            epoch_index: 0,
            input_index: 0,
            timestamp: 0,
        };
        const response = await wallet.handler({ metadata, payload });
        expect(response).toEqual("accept");
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
        const payload = encodePacked(
            ["bool", "address", "address", "uint256"],
            [true, token, from, value],
        );
        const metadata = {
            msg_sender: erc20PortalAddress,
            block_number: 0,
            epoch_index: 0,
            input_index: 0,
            timestamp: 0,
        };
        const response = await wallet.handler({ metadata, payload });
        expect(response).toEqual("accept");
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
        const payload = encodePacked(
            ["address", "address", "uint256"],
            [token, from, tokenId],
        );
        const metadata = {
            msg_sender: erc721PortalAddress,
            block_number: 0,
            epoch_index: 0,
            input_index: 0,
            timestamp: 0,
        };
        const response = await wallet.handler({ metadata, payload });
        expect(response).toEqual("accept");
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
        const payload = encodePacked(
            ["address", "address", "uint256", "uint256"],
            [token, from, tokenId, value],
        );
        const metadata = {
            msg_sender: erc1155SinglePortalAddress,
            block_number: 0,
            epoch_index: 0,
            input_index: 0,
            timestamp: 0,
        };
        const response = await wallet.handler({ metadata, payload });
        expect(response).toEqual("accept");
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
        const payload = encodePacked(["address", "address"], [token, from]);
        const rest = encodeAbiParameters(
            parseAbiParameters("uint256[], uint256[]"),
            [tokenIds, values],
        );
        const metadata = {
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
        expect(response).toEqual("accept");
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
