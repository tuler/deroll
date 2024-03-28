import { getRandomValues } from "node:crypto";
import { beforeEach, describe, expect, test } from "vitest";
import {
    Address,
    Hex,
    bytesToHex,
    encodeAbiParameters,
    encodeFunctionData,
    encodePacked,
    getAddress,
    parseAbiParameters,
} from "viem";

import {
    createWallet,
    isERC20Deposit,
    isERC721Deposit,
    isERC1155SingleDeposit,
    isERC1155BatchDeposit,
    isEtherDeposit,
    parseERC1155BatchDeposit,
    parseERC1155SingleDeposit,
    parseEtherDeposit,
    parseERC20Deposit,
    parseERC721Deposit,
} from "../src";
import {
    erc20PortalAddress,
    erc721PortalAddress,
    erc1155SinglePortalAddress,
    erc1155BatchPortalAddress,
    etherPortalAddress,
    erc20Abi,
    erc721Abi,
    erc1155Abi,
    dAppAddressRelayAddress,
    cartesiDAppAbi,
} from "../src/rollups";

function generateAddress(): Address {
    const address = new Uint8Array(20);
    const random = getRandomValues(address);
    const hex = bytesToHex(random);
    return getAddress(hex);
}

describe("Wallet", () => {
    beforeEach(() => {});

    describe("should be able to check if is deposit", () => {
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

        test("isERC721Deposit", () => {
            expect(
                isERC721Deposit({
                    metadata: {
                        msg_sender: erc721PortalAddress,
                        block_number: 0,
                        epoch_index: 0,
                        input_index: 0,
                        timestamp: 0,
                    },
                    payload: "0xdeadbeef",
                }),
            ).toBeTruthy();
        });

        test("isERC1155Deposit", () => {
            expect(
                isERC1155SingleDeposit({
                    metadata: {
                        msg_sender: erc1155SinglePortalAddress,
                        block_number: 0,
                        epoch_index: 0,
                        input_index: 0,
                        timestamp: 0,
                    },
                    payload: "0xdeadbeef",
                }),
            ).toBeTruthy();

            expect(
                isERC1155BatchDeposit({
                    metadata: {
                        msg_sender: erc1155BatchPortalAddress,
                        block_number: 0,
                        epoch_index: 0,
                        input_index: 0,
                        timestamp: 0,
                    },
                    payload: "0xdeadbeef",
                }),
            ).toBeTruthy();
        });
    });

    describe("should be able to parse deposit", () => {
        test("parseEtherDeposit", () => {
            const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
            const value = 123456n;
            const payload = encodePacked(
                ["address", "uint256"],
                [sender, value],
            );
            const deposit = parseEtherDeposit(payload);
            expect(deposit).toEqual({
                sender,
                value,
            });
        });

        test("parseERC20Deposit", () => {
            const token = generateAddress();
            const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
            const amount = 123456n;
            const success = true;
            const payload = encodePacked(
                ["bool", "address", "address", "uint256", "bytes", "bytes"],
                [true, token, sender, amount, "0x", "0x"],
            );
            const deposit = parseERC20Deposit(payload);
            expect(deposit).toEqual({
                success,
                token,
                sender,
                amount,
            });
        });
        test("parseERC721Deposit", () => {
            const token = generateAddress();
            const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
            const tokenId = 123456n;
            const payload = encodePacked(
                ["address", "address", "uint256", "bytes", "bytes"],
                [token, sender, tokenId, "0x", "0x"],
            );
            const deposit = parseERC721Deposit(payload);
            expect(deposit).toEqual({
                token,
                sender,
                tokenId,
            });
        });

        test("parseERC1155SingleDeposit", async () => {
            const address = "0xf252ee8851e87c530de36e798a0e2f28ce100477";
            const sender = "0x18930e8a66a1dbe21d00581216789aab7460afd0";
            const tokenId = 123456n;
            const value = 1n;

            const payload = encodePacked(
                ["address", "address", "uint256", "uint256", "bytes", "bytes"],
                [address, sender, tokenId, value, "0x", "0x"],
            );

            const result = parseERC1155SingleDeposit(payload);
            expect(result.token.toLowerCase()).toEqual(
                "0xf252ee8851e87c530de36e798a0e2f28ce100477",
            );
            expect(result.sender.toLowerCase()).toEqual(
                "0x18930e8a66a1dbe21d00581216789aab7460afd0",
            );
            expect(result.tokenId).toEqual(123456n);
            expect(result.value).toEqual(1n);
        });

        test("parseERC1155BatchDeposit", async () => {
            const tokens = new Map<bigint, bigint>([
                [3n, 5n],
                [4n, 7n],
            ]);

            const tokensBytes = encodeAbiParameters(
                parseAbiParameters("uint256[] tokenIds, uint256[] values"),
                [[...tokens.keys()], [...tokens.values()]],
            );

            const payload = encodePacked(
                ["address", "address", "bytes"],
                [
                    "0x3aa5ebb10dc797cac828524e59a333d0a371443c",
                    "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
                    tokensBytes,
                ],
            );

            const result = parseERC1155BatchDeposit(payload);
            expect(result.token.toLowerCase()).toEqual(
                "0x3aa5ebb10dc797cac828524e59a333d0a371443c",
            );
            expect(result.sender.toLowerCase()).toEqual(
                "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
            );
            expect(result.tokenIds.length).toEqual(2);
            expect(result.tokenIds).toEqual([3n, 4n]);
            expect(result.values.length).toEqual(2);
            expect(result.values).toEqual([5n, 7n]);
        });
    });

    describe("should be able to deposit", () => {
        test("deposit ETH", async () => {
            const wallet = createWallet();
            const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
            const value = 123456n;
            const payload = encodePacked(
                ["address", "uint256"],
                [sender, value],
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
            expect(wallet.balanceOfEther(sender)).toEqual(value);
        });

        test("deposit ETH non normalized address", async () => {
            const wallet = createWallet();
            const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
            const value = 123456n;
            const payload = encodePacked(
                ["address", "uint256"],
                [sender, value],
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
            expect(wallet.balanceOfEther(sender.toLowerCase())).toEqual(value);
        });

        test("deposit ERC20", async () => {
            const wallet = createWallet();
            const token = generateAddress();
            const amount = 123456n;
            const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
            const metadata = {
                msg_sender: erc20PortalAddress,
                block_number: 0,
                epoch_index: 0,
                input_index: 0,
                timestamp: 0,
            };

            const payload = encodePacked(
                ["bool", "address", "address", "uint256", "bytes"],
                [true, token, sender, amount, "0x"],
            );

            const response = await wallet.handler({ metadata, payload });
            expect(response).toEqual("accept");
            expect(wallet.balanceOfERC20(token, sender)).toEqual(amount);
        });

        test("deposit ERC721", async () => {
            const token = generateAddress();
            const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
            const tokenId = 123456n;

            const wallet = createWallet();
            const metadata = {
                msg_sender: erc721PortalAddress,
                block_number: 0,
                epoch_index: 0,
                input_index: 0,
                timestamp: 0,
            };

            const payload = encodePacked(
                ["address", "address", "uint256", "bytes", "bytes"],
                [token, sender, tokenId, "0x", "0x"],
            ) as Hex;

            const response = await wallet.handler({ metadata, payload });
            expect(response).toEqual("accept");
            expect(wallet.balanceOfERC721(token, sender)).toEqual(1n);
        });

        test("deposit ERC1155", async () => {
            const wallet = createWallet();
            const token = "0xc961145a54C96E3aE9bAA048c4F4D6b04C13916b";
            const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";

            const metadata = {
                msg_sender: erc1155SinglePortalAddress,
                block_number: 0,
                epoch_index: 0,
                input_index: 0,
                timestamp: 0,
            };

            const payload = encodePacked(
                ["address", "address", "uint256", "uint256", "bytes", "bytes"],
                [token, sender, 123456n, 1n, "0x", "0x"],
            );

            const handler = () => wallet.handler({ metadata, payload });
            expect(handler()).resolves.toEqual("accept");
            expect(wallet.balanceOfERC1155(token, 123456n, sender)).toEqual(1n);

            const metadataBatch = {
                msg_sender: erc1155BatchPortalAddress,
                block_number: 0,
                epoch_index: 0,
                input_index: 0,
                timestamp: 0,
            };

            const tokensBatch = new Map<bigint, bigint>([
                [123456n, 2n],
                [123457n, 1n],
            ]);

            const tokens = encodeAbiParameters(
                parseAbiParameters("uint256[] tokenIds, uint256[] values"),
                [[...tokensBatch.keys()], [...tokensBatch.values()]],
            );

            const batchPayload = encodePacked(
                ["address", "address", "bytes", "bytes", "bytes"],
                [token, sender, tokens, "0x", "0x"],
            );

            const batchHandler = () =>
                wallet.handler({
                    metadata: metadataBatch,
                    payload: batchPayload,
                });
            expect(batchHandler()).resolves.toEqual("accept");
            expect(wallet.balanceOfERC1155(token, 123456n, sender)).toEqual(3n);
        });
    });

    describe("should be able to transfer", () => {
        test("transfer ETH without balance", async () => {
            const wallet = createWallet();
            const from = generateAddress();
            const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
            const amount = 1n;
            const call = () => wallet.transferEther(
                from,
                sender,
                amount,
            );

            expect(call).toThrowError();
            expect(wallet.balanceOfEther(sender)).toEqual(0n);
        });

        test("transfer ETH", async () => {
            const wallet = createWallet();
            const sender = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
            const value = 123456n;

            const metadata = {
                msg_sender: etherPortalAddress,
                block_number: 0,
                epoch_index: 0,
                input_index: 0,
                timestamp: 0,
            };

            const payload = encodePacked(
                ["address", "uint256"],
                [sender, value],
            );

            const response = await wallet.handler({ metadata, payload });
            expect(response).toEqual("accept");
        });

        test("transfer ERC20 without balance", () => {
            const wallet = createWallet();
            const from = generateAddress();
            const to = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";

            const token = generateAddress();
            const amount = 123456n;

            const call = () => wallet.transferERC20(
                token,
                from,
                to,
                amount,
            );
            expect(call).toThrowError();
            expect(wallet.balanceOfERC20(token, to)).toEqual(0n);
        });

        test("transfer ERC20", async () => {
            const wallet = createWallet();
            const from = generateAddress();
            const to = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
            const token = generateAddress();
            const amount = 123456n;

            /**
             * Deposit
             */
            const metadata = {
                msg_sender: erc20PortalAddress,
                block_number: 0,
                epoch_index: 0,
                input_index: 0,
                timestamp: 0,
            };

            const payload = encodePacked(
                ["bool", "address", "address", "uint256", "bytes", "bytes"],
                [true, token, from, amount, "0x", "0x"],
            );

            const handler = () => wallet.handler({ metadata, payload });
            expect(handler()).resolves.toEqual("accept");
            expect(wallet.balanceOfERC20(token, from)).toEqual(amount);

            /**
             * Transfer
             */
            const call = () => wallet.transferERC20(token, from, to, amount);
            expect(call).not.toThrowError();
            expect(wallet.balanceOfERC20(token, from)).toEqual(0n);
            expect(wallet.balanceOfERC20(token, to)).toEqual(amount);
        });

        test("transfer ERC721 without balance", async () => {
            const from = generateAddress();
            const to = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
            const wallet = createWallet();
            const tokenId = 123456n;
            const token = generateAddress();

            /**
             * Transfer
             */
            const call = () => wallet.transferERC721(token, from, to, tokenId);
            expect(call).toThrowError();
            expect(wallet.balanceOfERC20(token, from)).toEqual(0n);
            expect(wallet.balanceOfERC20(token, to)).toEqual(0n);
        });

        test("transfer ERC721", async () => {
            const token = generateAddress();
            const to = "0x999999cf1046e68e36E1aA2E0E07105eDDD1f08E";
            const from = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";

            const wallet = createWallet();

            // Deposit
            const tokenId = 123456n;
            const metadata = {
                msg_sender: erc721PortalAddress,
                block_number: 0,
                epoch_index: 0,
                input_index: 0,
                timestamp: 0,
            };

            const payload = encodePacked(
                ["address", "address", "uint256", "bytes", "bytes"],
                [token, from, tokenId, "0x", "0x"],
            );

            const handler = () => wallet.handler({ metadata, payload });
            expect(handler()).resolves.toEqual("accept");
            expect(wallet.balanceOfERC721(token, from)).toEqual(1n);
            expect(wallet.balanceOfERC721(token, to)).toEqual(0n);
        });

        test.todo("transfer ERC1155Batch with token not found", () => {});
        test.todo("transfer ERC1155Batch with values negative", () => {});

        test("transfer ERC1155 without balance", () => {
            const token = "0xc961145a54C96E3aE9bAA048c4F4D6b04C13916b";
            const from = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
            const to = "0x999999cf1046e68e36E1aA2E0E07105eDDD1f08E";
            const wallet = createWallet();

            // Transfer
            const call = () =>
                wallet.transferERC1155(token, from, to, [123456n], [1n]);
            expect(call).toThrowError();
            expect(wallet.balanceOfERC1155(token, 123456n, from)).toEqual(0n);
            expect(wallet.balanceOfERC1155(token, 123456n, to)).toEqual(0n);
        });
        test("transfer ERC1155", () => {
            const token = "0xc961145a54C96E3aE9bAA048c4F4D6b04C13916b";
            const from = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
            const to = "0x999999cf1046e68e36E1aA2E0E07105eDDD1f08E";
            const wallet = createWallet();

            // Deposit
            const metadata = {
                msg_sender: erc1155SinglePortalAddress,
                block_number: 0,
                epoch_index: 0,
                input_index: 0,
                timestamp: 0,
            };

            const payload = encodePacked(
                ["address", "address", "uint256", "uint256", "bytes", "bytes"],
                [token, from, 123456n, 1n, "0x", "0x"],
            );

            const handler = () => wallet.handler({ metadata, payload });
            expect(handler()).resolves.toEqual("accept");
            expect(wallet.balanceOfERC1155(token, 123456n, from)).toEqual(1n);

            // Transfer
            const call = () =>
                wallet.transferERC1155(token, from, to, [123456n], [1n]);
            expect(call).not.toThrowError();
            expect(wallet.balanceOfERC1155(token, 123456n, from)).toEqual(0n);
            expect(wallet.balanceOfERC1155(token, 123456n, to)).toEqual(1n);
        });
    });

    describe("should be able to withdraw", () => {
        test("withdraw ETH with no balance", () => {
            const wallet = createWallet();
            const address = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
            const amount = 123456n;

            // Relay
            const relay = {
                msg_sender: dAppAddressRelayAddress,
                block_number: 0,
                epoch_index: 0,
                input_index: 0,
                timestamp: 0,
            };
            expect(
                wallet.handler({ metadata: relay, payload: address }),
            ).resolves.toEqual("accept");

            // Withdraw
            const call = () => wallet.withdrawEther(address, amount);
            expect(call).toThrowError();
        });

        test.todo("withdraw ETH with undefined portal address", () => {
            // Deposit
            const wallet = createWallet();
            const address = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
            const amount = 123456n;

            const metadata = {
                msg_sender: etherPortalAddress,
                block_number: 0,
                epoch_index: 0,
                input_index: 0,
                timestamp: 0,
            };

            const payload = encodePacked(
                ["address", "uint256"],
                [address, amount],
            );

            const handler = () => wallet.handler({ metadata, payload });
            expect(handler()).resolves.toEqual("accept");
            expect(wallet.balanceOfEther(address)).toEqual(amount);

            // Withdraw
            const call = wallet.withdrawEther(address, amount);
            expect(call).toThrowError();
        });

        test("withdraw ETH", () => {
            // Deposit
            const wallet = createWallet();
            const address = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
            const amount = 123456n;

            const metadata = {
                msg_sender: etherPortalAddress,
                block_number: 0,
                epoch_index: 0,
                input_index: 0,
                timestamp: 0,
            };

            const payload = encodePacked(
                ["address", "uint256"],
                [address, amount],
            );

            const handler = () => wallet.handler({ metadata, payload });
            expect(handler()).resolves.toEqual("accept");
            expect(wallet.balanceOfEther(address)).toEqual(amount);

            // Relay
            const relay = {
                msg_sender: dAppAddressRelayAddress,
                block_number: 0,
                epoch_index: 0,
                input_index: 0,
                timestamp: 0,
            };
            expect(
                wallet.handler({ metadata: relay, payload: address }),
            ).resolves.toEqual("accept");

            // Withdraw
            const call = wallet.withdrawEther(address, amount);
            expect(call).toEqual({
                destination: address,
                payload: encodeFunctionData({
                    abi: cartesiDAppAbi,
                    functionName: "withdrawEther",
                    args: [address, amount],
                }),
            });
        });

        test("withdraw ERC20", () => {
            const wallet = createWallet();
            const token = generateAddress();
            const address = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
            const amount = 123456n;

            // Deposit
            const metadata = {
                msg_sender: erc20PortalAddress,
                block_number: 0,
                epoch_index: 0,
                input_index: 0,
                timestamp: 0,
            };

            const payload = encodePacked(
                ["bool", "address", "address", "uint256", "bytes", "bytes"],
                [true, token, address, amount, "0x", "0x"],
            );

            const handler = () => wallet.handler({ metadata, payload });
            expect(handler()).resolves.toEqual("accept");
            expect(wallet.balanceOfERC20(token, address)).toEqual(amount);

            // Withdraw
            const call = encodeFunctionData({
                abi: erc20Abi,
                functionName: "transfer",
                args: [address, amount],
            });
            expect(wallet.withdrawERC20(token, address, amount)).toMatchObject({
                destination: token,
                payload: call,
            });
        });

        test("withdraw ERC20 with no balance", () => {
            const wallet = createWallet();
            const token = generateAddress();
            const address = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
            const amount = 123456n;

            const expectCall = () =>
                wallet.withdrawERC20(token, address, amount);
            expect(expectCall).toThrow();
        });

        test("withdraw ERC721 with no balance", () => {
            const wallet = createWallet();
            const token = generateAddress();
            const address = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
            const tokenId = 123456n;

            // Relay
            const relay = {
                msg_sender: dAppAddressRelayAddress,
                block_number: 0,
                epoch_index: 0,
                input_index: 0,
                timestamp: 0,
            };
            expect(
                wallet.handler({ metadata: relay, payload: address }),
            ).resolves.toEqual("accept");

            // Withdraw
            const handler = () =>
                wallet.withdrawERC721(token, address, tokenId);
            expect(handler).toThrowError();
        });
        test("withdraw ERC721", () => {
            const wallet = createWallet();
            const token = generateAddress();
            const address = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
            const tokenId = 123456n;
            const dappAddress = "0x999999cf1046e68e36E1aA2E0E07105eDDD1f08E";

            // Deposit
            const metadata = {
                msg_sender: erc721PortalAddress,
                block_number: 0,
                epoch_index: 0,
                input_index: 0,
                timestamp: 0,
            };

            const payload = encodePacked(
                ["address", "address", "uint256", "bytes", "bytes"],
                [token, address, tokenId, "0x", "0x"],
            );

            const handler = () => wallet.handler({ metadata, payload });
            expect(handler()).resolves.toEqual("accept");
            expect(wallet.balanceOfERC721(token, address)).toEqual(1n);

            // Relay
            const relay = {
                msg_sender: dAppAddressRelayAddress,
                block_number: 0,
                epoch_index: 0,
                input_index: 0,
                timestamp: 0,
            };
            expect(
                wallet.handler({ metadata: relay, payload: dappAddress }),
            ).resolves.toEqual("accept");

            // Withdraw
            const payloadVoucher = encodeFunctionData({
                abi: erc721Abi,
                functionName: "safeTransferFrom",
                args: [dappAddress, address, tokenId],
            });
            const result = wallet.withdrawERC721(token, address, tokenId);

            expect(result.destination).toEqual(token);
            expect(result.payload).toEqual(payloadVoucher);
        });

        test("withdraw ERC1155 Single with no balance", () => {
            const wallet = createWallet();
            const token = "0xc961145a54C96E3aE9bAA048c4F4D6b04C13916b";
            const address = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
            const dappAddress = "0x999999cf1046e68e36E1aA2E0E07105eDDD1f08E";
            const tokenId = 123456n;

            // Relay
            const relay = {
                msg_sender: dAppAddressRelayAddress,
                block_number: 0,
                epoch_index: 0,
                input_index: 0,
                timestamp: 0,
            };
            expect(
                wallet.handler({ metadata: relay, payload: dappAddress }),
            ).resolves.toEqual("accept");

            // Withdraw
            const call = () =>
                wallet.withdrawERC1155(token, address, tokenId, 1n);
            expect(call).toThrowError();
        });
        test("withdraw ERC1155 Single", () => {
            const wallet = createWallet();
            const token = "0xc961145a54C96E3aE9bAA048c4F4D6b04C13916b";
            const address = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
            const dappAddress = "0x999999cf1046e68e36E1aA2E0E07105eDDD1f08E";
            const tokenId = 123456n;

            const metadata = {
                msg_sender: erc1155SinglePortalAddress,
                block_number: 0,
                epoch_index: 0,
                input_index: 0,
                timestamp: 0,
            };

            const payload = encodePacked(
                ["address", "address", "uint256", "uint256", "bytes", "bytes"],
                [token, address, tokenId, 1n, "0x", "0x"],
            );

            const handler = () => wallet.handler({ metadata, payload });
            expect(handler()).resolves.toEqual("accept");
            expect(wallet.balanceOfERC1155(token, tokenId, address)).toEqual(
                1n,
            );

            // Relay
            const relay = {
                msg_sender: dAppAddressRelayAddress,
                block_number: 0,
                epoch_index: 0,
                input_index: 0,
                timestamp: 0,
            };
            expect(
                wallet.handler({ metadata: relay, payload: dappAddress }),
            ).resolves.toEqual("accept");

            // Withdraw
            const payloadVoucher = encodeFunctionData({
                abi: erc1155Abi,
                functionName: "safeTransferFrom",
                args: [dappAddress, address, tokenId, 1n, "0x"],
            });
            const result = wallet.withdrawERC1155(token, address, tokenId, 1n);

            expect(result.destination).toEqual(token);
            expect(result.payload).toEqual(payloadVoucher);
        });

        test("withdraw ERC1155 Batch with no balance", () => {
            const wallet = createWallet();
            const token = "0xc961145a54C96E3aE9bAA048c4F4D6b04C13916b";
            const address = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
            const dappAddress = "0x999999cf1046e68e36E1aA2E0E07105eDDD1f08E";

            // Relay
            const relay = {
                msg_sender: dAppAddressRelayAddress,
                block_number: 0,
                epoch_index: 0,
                input_index: 0,
                timestamp: 0,
            };
            expect(
                wallet.handler({ metadata: relay, payload: dappAddress }),
            ).resolves.toEqual("accept");

            // Withdraw
            const tokenId = 3n;
            const call = () =>
                wallet.withdrawERC1155(token, address, tokenId, 1n);
            expect(call).toThrowError();
        });
        test("withdraw ERC1155 Batch", () => {
            const wallet = createWallet();
            const token = "0xc961145a54C96E3aE9bAA048c4F4D6b04C13916b";
            const address = "0x18930e8a66a1DbE21D00581216789AAB7460Afd0";
            const dappAddress = "0x999999cf1046e68e36E1aA2E0E07105eDDD1f08E";

            const tokens = new Map<bigint, bigint>([
                [3n, 5n],
                [4n, 7n],
            ]);

            const tokensIds = [...tokens.keys()];
            const values = [...tokens.values()];

            // Deposit
            const metadata = {
                msg_sender: erc1155BatchPortalAddress,
                block_number: 0,
                epoch_index: 0,
                input_index: 0,
                timestamp: 0,
            };

            const payloadRest = encodeAbiParameters(
                parseAbiParameters("int256[] tokenIds, uint256[] values"),
                [tokensIds, values],
            );

            const payload = encodePacked(
                ["address", "address", "bytes"],
                [token, address, payloadRest],
            );

            const handler = () => wallet.handler({ metadata, payload });
            expect(handler()).resolves.toEqual("accept");
            const addresses = Array(tokens.size).fill(token);
            expect(
                wallet.balanceOfERC1155(addresses, tokensIds, address),
            ).toEqual(values);

            // Relay
            const relay = {
                msg_sender: dAppAddressRelayAddress,
                block_number: 0,
                epoch_index: 0,
                input_index: 0,
                timestamp: 0,
            };
            expect(
                wallet.handler({ metadata: relay, payload: dappAddress }),
            ).resolves.toEqual("accept");

            // Withdraw
            const tokenId = 3n;
            const payloadVoucher = encodeFunctionData({
                abi: erc1155Abi,
                functionName: "safeTransferFrom",
                args: [dappAddress, address, tokenId, 1n, "0x"],
            });
            const result = wallet.withdrawERC1155(token, address, tokenId, 1n);

            expect(result.destination).toEqual(token);
            expect(result.payload).toEqual(payloadVoucher);
        });
    });

    describe("Wallet with Route", () => {
        describe("should be able to deposit", () => {
            test.todo("depositEtherRoute reject", () => {});

            test.todo("depositEtherRoute", () => {});

            test.todo("depositERC20Route reject", () => {});

            test.todo("depositERC20Route", () => {});
        });

        describe("should be able to withdraw", () => {
            test.todo("withdrawEtherRoute reject no balance", async () => {});

            test.todo("withdrawEtherRoute", async () => {});

            test.todo("withdrawERC20Route reject no balance", async () => {});

            test.todo("withdrawERC20Route", async () => {});
        });
    });
});
