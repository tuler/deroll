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
} from "../src/index.js";

const hexToBuffer = (hex: string): Buffer => Buffer.from(hex.slice(2), "hex");

// the deposit detectors only inspect the sender, so a minimal advance request
// (with a dummy payload) is enough to exercise them
const advance = (msgSender: Hex): AdvanceRequestData => ({
    metadata: {
        chainId: 1n,
        appContract: "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e",
        msgSender,
        blockNumber: 0n,
        blockTimestamp: 0n,
        prevRandao: 0n,
        index: 0n,
    },
    payload: Buffer.from("deadbeef", "hex"),
});

describe("parser", () => {
    test("isEtherDeposit", () => {
        expect(isEtherDeposit(advance(etherPortalAddress))).toBeTruthy();
        expect(
            isEtherDeposit(
                advance(etherPortalAddress.toLowerCase() as Address),
            ),
        ).toBeTruthy();
        expect(isEtherDeposit(advance(erc20PortalAddress))).toBeFalsy();
    });

    test("isERC20Deposit", () => {
        expect(isERC20Deposit(advance(erc20PortalAddress))).toBeTruthy();
        expect(
            isERC20Deposit(
                advance(erc20PortalAddress.toLowerCase() as Address),
            ),
        ).toBeTruthy();
        expect(isERC20Deposit(advance(etherPortalAddress))).toBeFalsy();
    });

    test("isERC721Deposit", () => {
        expect(isERC721Deposit(advance(erc721PortalAddress))).toBeTruthy();
        expect(
            isERC721Deposit(
                advance(erc721PortalAddress.toLowerCase() as Address),
            ),
        ).toBeTruthy();
        expect(isERC721Deposit(advance(etherPortalAddress))).toBeFalsy();
        expect(isERC721Deposit(advance(erc20PortalAddress))).toBeFalsy();
    });

    test("isERC1155SingleDeposit", () => {
        expect(
            isERC1155SingleDeposit(advance(erc1155SinglePortalAddress)),
        ).toBeTruthy();
        expect(
            isERC1155SingleDeposit(
                advance(erc1155SinglePortalAddress.toLowerCase() as Address),
            ),
        ).toBeTruthy();
        expect(isERC1155SingleDeposit(advance(etherPortalAddress))).toBeFalsy();
        expect(isERC1155SingleDeposit(advance(erc20PortalAddress))).toBeFalsy();
    });

    test("isERC1155BatchDeposit", () => {
        expect(
            isERC1155BatchDeposit(advance(erc1155BatchPortalAddress)),
        ).toBeTruthy();
        expect(
            isERC1155BatchDeposit(
                advance(erc1155BatchPortalAddress.toLowerCase() as Address),
            ),
        ).toBeTruthy();
        expect(isERC1155BatchDeposit(advance(etherPortalAddress))).toBeFalsy();
        expect(isERC1155BatchDeposit(advance(erc20PortalAddress))).toBeFalsy();
    });

    test("parseEtherDeposit", () => {
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const value = 123456n;
        const payload = hexToBuffer(
            encodePacked(["address", "uint256"], [sender, value]),
        );
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
        const payload = hexToBuffer(
            encodePacked(
                ["address", "address", "uint256"],
                [token, sender, amount],
            ),
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
        const payload = hexToBuffer(
            encodePacked(
                ["address", "address", "uint256"],
                [token, sender, tokenId],
            ),
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
        const payload = hexToBuffer(
            encodePacked(
                ["address", "address", "uint256", "uint256"],
                [token, sender, tokenId, value],
            ),
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
        const deposit = parseERC1155BatchDeposit(
            hexToBuffer(concat([payload, rest])),
        );
        expect(deposit).toEqual({
            token,
            sender,
            tokenIds,
            values,
        });
    });
});
