import { RequestMetadata } from "@deroll/core";
import {
    concat,
    encodeAbiParameters,
    encodeFunctionData,
    encodePacked,
    erc20Abi,
    erc721Abi,
    parseAbiParameters,
    zeroHash,
} from "viem";
import { describe, expect, test } from "vitest";

import { createWallet } from "../src";
import { erc1155Abi } from "../src/abi";
import {
    erc1155BatchPortalAddress,
    erc1155SinglePortalAddress,
    erc20PortalAddress,
    erc721PortalAddress,
    etherPortalAddress,
} from "../src/rollups";

describe("withdraw", () => {
    test("ETH with no balance", () => {
        const wallet = createWallet();
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const value = 1n;
        expect(() => wallet.withdrawEther(sender, value)).toThrowError();
    });

    test("ETH", async () => {
        const wallet = createWallet();
        const dapp = "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e";
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const value = 3n;
        const withdraw = 1n;

        // deposit 1 wei to "from"
        const payload = encodePacked(["address", "uint256"], [sender, value]);
        const metadata: RequestMetadata = {
            app_contract: dapp,
            block_number: 0,
            block_timestamp: 0,
            chain_id: 1,
            input_index: 0,
            msg_sender: etherPortalAddress,
            prev_randao: zeroHash,
        };
        const response = await wallet.handler({ metadata, payload });
        expect(response).toEqual("accept");
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
        const dapp = "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e";
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const value = 3n;
        const withdraw = 1n;
        expect(wallet.erc20BalanceOf(token, sender)).toBe(0n);
        const payload = encodePacked(
            ["address", "address", "uint256"],
            [token, sender, value],
        );
        const metadata: RequestMetadata = {
            app_contract: dapp,
            block_number: 0,
            block_timestamp: 0,
            chain_id: 1,
            input_index: 0,
            msg_sender: erc20PortalAddress,
            prev_randao: zeroHash,
        };
        const response = await wallet.handler({ metadata, payload });
        expect(response).toBe("accept");
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
        const payload = encodePacked(
            ["address", "address", "uint256"],
            [token, sender, tokenId],
        );
        const metadata: RequestMetadata = {
            app_contract: dapp,
            block_number: 0,
            block_timestamp: 0,
            chain_id: 1,
            input_index: 0,
            msg_sender: erc721PortalAddress,
            prev_randao: zeroHash,
        };
        const response = await wallet.handler({ metadata, payload });
        expect(response).toBe("accept");
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
        const payload = encodePacked(
            ["address", "address", "uint256", "uint256"],
            [token, sender, tokenId, value],
        );
        const metadata: RequestMetadata = {
            app_contract: dapp,
            block_number: 0,
            block_timestamp: 0,
            chain_id: 1,
            input_index: 0,
            msg_sender: erc1155SinglePortalAddress,
            prev_randao: zeroHash,
        };
        const response = await wallet.handler({ metadata, payload });
        expect(response).toBe("accept");
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
        const payload = encodePacked(["address", "address"], [token, sender]);
        const rest = encodeAbiParameters(
            parseAbiParameters("uint256[], uint256[]"),
            [tokenIds, values],
        );

        const metadata: RequestMetadata = {
            app_contract: dapp,
            block_number: 0,
            block_timestamp: 0,
            chain_id: 1,
            input_index: 0,
            msg_sender: erc1155BatchPortalAddress,
            prev_randao: zeroHash,
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
