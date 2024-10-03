import {
    Address,
    concat,
    encodeAbiParameters,
    encodePacked,
    parseAbiParameters,
    zeroHash,
} from "viem";
import { describe, expect, test } from "vitest";

import {
    isERC1155BatchDeposit,
    isERC1155SingleDeposit,
    isERC20Deposit,
    isERC721Deposit,
    isEtherDeposit,
    parseERC1155BatchDeposit,
    parseERC1155SingleDeposit,
    parseERC20Deposit,
    parseERC721Deposit,
    parseEtherDeposit,
} from "../src";
import {
    erc1155BatchPortalAddress,
    erc1155SinglePortalAddress,
    erc20PortalAddress,
    erc721PortalAddress,
    etherPortalAddress,
} from "../src/rollups";

describe("parser", () => {
    test("isEtherDeposit", () => {
        expect(
            isEtherDeposit({
                metadata: {
                    app_contract: "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e",
                    block_number: 0,
                    block_timestamp: 0,
                    chain_id: 1,
                    input_index: 0,
                    msg_sender: etherPortalAddress,
                    prev_randao: zeroHash,
                },
                payload: "0xdeadbeef",
            }),
        ).toBeTruthy();

        expect(
            isEtherDeposit({
                metadata: {
                    app_contract: "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e",
                    block_number: 0,
                    block_timestamp: 0,
                    chain_id: 1,
                    input_index: 0,
                    msg_sender: etherPortalAddress.toLowerCase() as Address,
                    prev_randao: zeroHash,
                },
                payload: "0xdeadbeef",
            }),
        ).toBeTruthy();

        expect(
            isEtherDeposit({
                metadata: {
                    app_contract: "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e",
                    block_number: 0,
                    block_timestamp: 0,
                    chain_id: 1,
                    input_index: 0,
                    msg_sender: erc20PortalAddress,
                    prev_randao: zeroHash,
                },
                payload: "0xdeadbeef",
            }),
        ).toBeFalsy();
    });

    test("isERC20Deposit", () => {
        expect(
            isERC20Deposit({
                metadata: {
                    app_contract: "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e",
                    block_number: 0,
                    block_timestamp: 0,
                    chain_id: 1,
                    input_index: 0,
                    msg_sender: erc20PortalAddress,
                    prev_randao: zeroHash,
                },
                payload: "0xdeadbeef",
            }),
        ).toBeTruthy();

        expect(
            isERC20Deposit({
                metadata: {
                    app_contract: "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e",
                    block_number: 0,
                    block_timestamp: 0,
                    chain_id: 1,
                    input_index: 0,
                    msg_sender: erc20PortalAddress.toLowerCase() as Address,
                    prev_randao: zeroHash,
                },
                payload: "0xdeadbeef",
            }),
        ).toBeTruthy();

        expect(
            isERC20Deposit({
                metadata: {
                    app_contract: "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e",
                    block_number: 0,
                    block_timestamp: 0,
                    chain_id: 1,
                    input_index: 0,
                    msg_sender: etherPortalAddress,
                    prev_randao: zeroHash,
                },
                payload: "0xdeadbeef",
            }),
        ).toBeFalsy();
    });

    test("isERC721Deposit", () => {
        expect(
            isERC721Deposit({
                metadata: {
                    app_contract: "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e",
                    block_number: 0,
                    block_timestamp: 0,
                    chain_id: 1,
                    input_index: 0,
                    msg_sender: erc721PortalAddress,
                    prev_randao: zeroHash,
                },
                payload: "0xdeadbeef",
            }),
        ).toBeTruthy();

        expect(
            isERC721Deposit({
                metadata: {
                    app_contract: "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e",
                    block_number: 0,
                    block_timestamp: 0,
                    chain_id: 1,
                    input_index: 0,
                    msg_sender: erc721PortalAddress.toLowerCase() as Address,
                    prev_randao: zeroHash,
                },
                payload: "0xdeadbeef",
            }),
        ).toBeTruthy();

        expect(
            isERC721Deposit({
                metadata: {
                    app_contract: "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e",
                    block_number: 0,
                    block_timestamp: 0,
                    chain_id: 1,
                    input_index: 0,
                    msg_sender: etherPortalAddress,
                    prev_randao: zeroHash,
                },
                payload: "0xdeadbeef",
            }),
        ).toBeFalsy();
        expect(
            isERC721Deposit({
                metadata: {
                    app_contract: "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e",
                    block_number: 0,
                    block_timestamp: 0,
                    chain_id: 1,
                    input_index: 0,
                    msg_sender: erc20PortalAddress,
                    prev_randao: zeroHash,
                },
                payload: "0xdeadbeef",
            }),
        ).toBeFalsy();
    });

    test("isERC1155SingleDeposit", () => {
        expect(
            isERC1155SingleDeposit({
                metadata: {
                    app_contract: "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e",
                    block_number: 0,
                    block_timestamp: 0,
                    chain_id: 1,
                    input_index: 0,
                    msg_sender: erc1155SinglePortalAddress,
                    prev_randao: zeroHash,
                },
                payload: "0xdeadbeef",
            }),
        ).toBeTruthy();

        expect(
            isERC1155SingleDeposit({
                metadata: {
                    app_contract: "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e",
                    block_number: 0,
                    block_timestamp: 0,
                    chain_id: 1,
                    input_index: 0,
                    msg_sender:
                        erc1155SinglePortalAddress.toLowerCase() as Address,
                    prev_randao: zeroHash,
                },
                payload: "0xdeadbeef",
            }),
        ).toBeTruthy();

        expect(
            isERC1155SingleDeposit({
                metadata: {
                    app_contract: "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e",
                    block_number: 0,
                    block_timestamp: 0,
                    chain_id: 1,
                    input_index: 0,
                    msg_sender: etherPortalAddress,
                    prev_randao: zeroHash,
                },
                payload: "0xdeadbeef",
            }),
        ).toBeFalsy();
        expect(
            isERC1155SingleDeposit({
                metadata: {
                    app_contract: "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e",
                    block_number: 0,
                    block_timestamp: 0,
                    chain_id: 1,
                    input_index: 0,
                    msg_sender: erc20PortalAddress,
                    prev_randao: zeroHash,
                },
                payload: "0xdeadbeef",
            }),
        ).toBeFalsy();
    });

    test("isERC1155BatchDeposit", () => {
        expect(
            isERC1155BatchDeposit({
                metadata: {
                    app_contract: "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e",
                    block_number: 0,
                    block_timestamp: 0,
                    chain_id: 1,
                    input_index: 0,
                    msg_sender: erc1155BatchPortalAddress,
                    prev_randao: zeroHash,
                },
                payload: "0xdeadbeef",
            }),
        ).toBeTruthy();

        expect(
            isERC1155BatchDeposit({
                metadata: {
                    app_contract: "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e",
                    block_number: 0,
                    block_timestamp: 0,
                    chain_id: 1,
                    input_index: 0,
                    msg_sender:
                        erc1155BatchPortalAddress.toLowerCase() as Address,
                    prev_randao: zeroHash,
                },
                payload: "0xdeadbeef",
            }),
        ).toBeTruthy();

        expect(
            isERC1155BatchDeposit({
                metadata: {
                    app_contract: "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e",
                    block_number: 0,
                    block_timestamp: 0,
                    chain_id: 1,
                    input_index: 0,
                    msg_sender: etherPortalAddress,
                    prev_randao: zeroHash,
                },
                payload: "0xdeadbeef",
            }),
        ).toBeFalsy();
        expect(
            isERC1155BatchDeposit({
                metadata: {
                    app_contract: "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e",
                    block_number: 0,
                    block_timestamp: 0,
                    chain_id: 1,
                    input_index: 0,
                    msg_sender: erc20PortalAddress,
                    prev_randao: zeroHash,
                },
                payload: "0xdeadbeef",
            }),
        ).toBeFalsy();
    });

    test("parseEtherDeposit", () => {
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const value = 123456n;
        const payload = encodePacked(["address", "uint256"], [sender, value]);
        const deposit = parseEtherDeposit(payload);
        expect(deposit).toEqual({
            sender,
            value,
        });
    });

    test("parseERC20Deposit", () => {
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const amount = 123456n;
        const payload = encodePacked(
            ["address", "address", "uint256"],
            [token, sender, amount],
        );
        const deposit = parseERC20Deposit(payload);
        expect(deposit).toEqual({
            token,
            sender,
            amount,
        });
    });

    test("parseERC721Deposit", () => {
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const tokenId = 123n;
        const payload = encodePacked(
            ["address", "address", "uint256"],
            [token, sender, tokenId],
        );
        const deposit = parseERC721Deposit(payload);
        expect(deposit).toEqual({
            token,
            sender,
            tokenId,
        });
    });

    test("parseERC1155SingleDeposit", () => {
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const tokenId = 123n;
        const value = 456n;
        const payload = encodePacked(
            ["address", "address", "uint256", "uint256"],
            [token, sender, tokenId, value],
        );
        const deposit = parseERC1155SingleDeposit(payload);
        expect(deposit).toEqual({
            token,
            sender,
            tokenId,
            value,
        });
    });

    test("parseERC1155BatchDeposit", () => {
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const tokenIds = [1n, 2n];
        const values = [123n, 456n];
        const payload = encodePacked(["address", "address"], [token, sender]);
        const rest = encodeAbiParameters(
            parseAbiParameters("uint256[], uint256[]"),
            [tokenIds, values],
        );
        const deposit = parseERC1155BatchDeposit(concat([payload, rest]));
        expect(deposit).toEqual({
            token,
            sender,
            tokenIds,
            values,
        });
    });
});
