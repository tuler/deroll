import type { Advance } from "@deroll/core";
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
    isErc1155BatchDeposit,
    isErc1155SingleDeposit,
    isErc20Deposit,
    isErc721Deposit,
    isEtherDeposit,
    parseErc1155BatchDeposit,
    parseErc1155SingleDeposit,
    parseErc20Deposit,
    parseErc721Deposit,
    parseEtherDeposit,
} from "../src/index.js";

// the deposit detectors only inspect the sender, so a minimal advance request
// (with a dummy payload) is enough to exercise them
const advance = (msgSender: Hex): Advance => ({
    chainId: 1n,
    appContract: "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e",
    msgSender,
    blockNumber: 0n,
    blockTimestamp: 0n,
    prevRandao: 0n,
    index: 0n,
    payload: "0xdeadbeef",
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

    test("isErc20Deposit", () => {
        expect(isErc20Deposit(advance(erc20PortalAddress))).toBeTruthy();
        expect(
            isErc20Deposit(
                advance(erc20PortalAddress.toLowerCase() as Address),
            ),
        ).toBeTruthy();
        expect(isErc20Deposit(advance(etherPortalAddress))).toBeFalsy();
    });

    test("isErc721Deposit", () => {
        expect(isErc721Deposit(advance(erc721PortalAddress))).toBeTruthy();
        expect(
            isErc721Deposit(
                advance(erc721PortalAddress.toLowerCase() as Address),
            ),
        ).toBeTruthy();
        expect(isErc721Deposit(advance(etherPortalAddress))).toBeFalsy();
        expect(isErc721Deposit(advance(erc20PortalAddress))).toBeFalsy();
    });

    test("isErc1155SingleDeposit", () => {
        expect(
            isErc1155SingleDeposit(advance(erc1155SinglePortalAddress)),
        ).toBeTruthy();
        expect(
            isErc1155SingleDeposit(
                advance(erc1155SinglePortalAddress.toLowerCase() as Address),
            ),
        ).toBeTruthy();
        expect(isErc1155SingleDeposit(advance(etherPortalAddress))).toBeFalsy();
        expect(isErc1155SingleDeposit(advance(erc20PortalAddress))).toBeFalsy();
    });

    test("isErc1155BatchDeposit", () => {
        expect(
            isErc1155BatchDeposit(advance(erc1155BatchPortalAddress)),
        ).toBeTruthy();
        expect(
            isErc1155BatchDeposit(
                advance(erc1155BatchPortalAddress.toLowerCase() as Address),
            ),
        ).toBeTruthy();
        expect(isErc1155BatchDeposit(advance(etherPortalAddress))).toBeFalsy();
        expect(isErc1155BatchDeposit(advance(erc20PortalAddress))).toBeFalsy();
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

    test("parseErc20Deposit", () => {
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const amount = 123456n;
        const payload = encodePacked(
            ["address", "address", "uint256"],
            [token, sender, amount],
        );
        const deposit = parseErc20Deposit(payload);
        expect(deposit).toEqual({
            token,
            sender,
            amount,
        });
    });

    test("parseErc721Deposit", () => {
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const tokenId = 123n;
        const payload = encodePacked(
            ["address", "address", "uint256"],
            [token, sender, tokenId],
        );
        const deposit = parseErc721Deposit(payload);
        expect(deposit).toEqual({
            token,
            sender,
            tokenId,
        });
    });

    test("parseErc1155SingleDeposit", () => {
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const tokenId = 123n;
        const value = 456n;
        const payload = encodePacked(
            ["address", "address", "uint256", "uint256"],
            [token, sender, tokenId, value],
        );
        const deposit = parseErc1155SingleDeposit(payload);
        expect(deposit).toEqual({
            token,
            sender,
            tokenId,
            value,
        });
    });

    test("parseErc1155BatchDeposit", () => {
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const tokenIds = [1n, 2n];
        const values = [123n, 456n];
        const payload = encodePacked(["address", "address"], [token, sender]);
        const rest = encodeAbiParameters(
            parseAbiParameters("uint256[], uint256[]"),
            [tokenIds, values],
        );
        const deposit = parseErc1155BatchDeposit(concat([payload, rest]));
        expect(deposit).toEqual({
            token,
            sender,
            tokenIds,
            values,
        });
    });
});
