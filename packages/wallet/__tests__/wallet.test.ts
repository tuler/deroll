import { beforeEach, describe, expect, test } from "vitest";
import { Address, encodePacked, zeroAddress } from "viem";

import {
    createWallet,
    isERC20Deposit,
    isEtherDeposit,
    parseEtherDeposit,
} from "../src";
import { erc20PortalAddress, etherPortalAddress } from "../src/rollups";

describe("Wallet", () => {
    beforeEach(() => {});

    test("isEtherDeposit", () => {
        expect(
            isEtherDeposit({
                metadata: {
                    msg_sender: etherPortalAddress,
                    block_number: 0,
                    epoch_index: 0,
                    input_index: 0,
                    timestamp: 0,
                },
                payload: "0xdeadbeef",
            }),
        ).toBeTruthy();

        expect(
            isEtherDeposit({
                metadata: {
                    msg_sender: etherPortalAddress.toLowerCase() as Address,
                    block_number: 0,
                    epoch_index: 0,
                    input_index: 0,
                    timestamp: 0,
                },
                payload: "0xdeadbeef",
            }),
        ).toBeTruthy();

        expect(
            isEtherDeposit({
                metadata: {
                    msg_sender: erc20PortalAddress,
                    block_number: 0,
                    epoch_index: 0,
                    input_index: 0,
                    timestamp: 0,
                },
                payload: "0xdeadbeef",
            }),
        ).toBeFalsy();
    });

    test("isERC20Deposit", () => {
        expect(
            isERC20Deposit({
                metadata: {
                    msg_sender: erc20PortalAddress,
                    block_number: 0,
                    epoch_index: 0,
                    input_index: 0,
                    timestamp: 0,
                },
                payload: "0xdeadbeef",
            }),
        ).toBeTruthy();

        expect(
            isERC20Deposit({
                metadata: {
                    msg_sender: erc20PortalAddress.toLowerCase() as Address,
                    block_number: 0,
                    epoch_index: 0,
                    input_index: 0,
                    timestamp: 0,
                },
                payload: "0xdeadbeef",
            }),
        ).toBeTruthy();

        expect(
            isERC20Deposit({
                metadata: {
                    msg_sender: etherPortalAddress,
                    block_number: 0,
                    epoch_index: 0,
                    input_index: 0,
                    timestamp: 0,
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

    test("init", () => {});

    test("deposit ETH", async () => {
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
        expect(wallet.balanceOf(sender)).toEqual(value);
    });

    test("deposit ETH non normalized address", async () => {
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
        expect(wallet.balanceOf(sender.toLowerCase())).toEqual(value);
    });

    test.todo("deposit ERC20", () => {});

    test.todo("transfer ETH without balance", () => {});

    test.todo("transfer ETH", () => {});

    test.todo("transfer ERC20 without balance", () => {});

    test.todo("transfer ERC20", () => {});

    test.todo("withdraw ETH with no balance", () => {});

    test.todo("withdraw ETH with undefined portal address", () => {});

    test.todo("withdraw ETH", () => {});

    test.todo("withdraw ERC20", () => {});

    test.todo("withdraw ERC20 with no balance", () => {});

    test.todo("depositEtherRoute reject", () => {});

    test.todo("depositEtherRoute", () => {});

    test.todo("depositERC20Route reject", () => {});

    test.todo("depositERC20Route", () => {});

    test.todo("withdrawEtherRoute reject no balance", async () => {});

    test.todo("withdrawEtherRoute", async () => {});

    test.todo("withdrawERC20Route reject no balance", async () => {});

    test.todo("withdrawERC20Route", async () => {});
});
