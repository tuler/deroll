import { describe, expect, test } from "vitest";

import { createWallet } from "../src";

describe("noop", () => {
    test("init", () => {
        const wallet = createWallet();
        const user = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
        const token = "0x491604c0FDF08347Dd1fa4Ee062a822A5DD06B5D";
        expect(wallet.etherBalanceOf(user)).toBe(0n);
        expect(wallet.erc20BalanceOf(token, user)).toBe(0n);
        expect(wallet.erc721Has(token, user, 1n)).toBe(false);
        expect(wallet.erc1155BalanceOf(token, user, 1n)).toBe(0n);

        const sender = wallet.getWallet(user);
        expect(sender.ether).toBe(0n);
    });

    test("reject", async () => {
        const wallet = createWallet();
        const response = await wallet.handler({
            metadata: {
                msg_sender: "0x18930e8a66a1DbE21D00581216789AAB7460Afd0",
                block_number: 0,
                epoch_index: 0,
                input_index: 0,
                timestamp: 0,
            },
            payload: "0xdeadbeef",
        });
        expect(response).toBe("reject");
    });
});
