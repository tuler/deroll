import {
    createPublicClient,
    createWalletClient,
    http,
    zeroAddress,
    zeroHash,
} from "viem";
import { describe, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { getInputsAdded, publicActionsL2, walletActionsL1 } from "../src";
import { inputBoxAbi, inputBoxAddress } from "../src/rollups";
import { AddInput2Parameters } from "../src/decorators/walletL1";

describe("viem extension", () => {
    it("getInputIndex", async () => {
        const rpcUrl = "http://localhost:8545";
        const cartesiRpcUrl = "http://localhost:4000/rpc";

        const account = privateKeyToAccount(
            "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        );
        const chain = foundry;

        const publicClient = createPublicClient({
            transport: http(rpcUrl),
        });

        const publicClientL2 = createPublicClient({
            transport: http(cartesiRpcUrl),
        }).extend(publicActionsL2());

        const walletClient = createWalletClient({ transport: http() }).extend(
            walletActionsL1(),
        );

        const inputNumber = await publicClientL2.inputNumber([]);

        /*
        const { request: request_ } = await publicClient.simulateAddInput({
            args: [zeroAddress, zeroHash],
        });
        const hash = await walletClient.addInput(request);
        */

        // prepare an addInput
        const { request } = await publicClient.simulateContract({
            account,
            abi: inputBoxAbi,
            address: inputBoxAddress,
            functionName: "addInput",
            args: [zeroAddress, zeroHash],
        });

        // send an input
        const hash = await walletClient.writeContract(request);

        // wait for the transaction receipt
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        // get the input index from the transaction receipt
        const [inputAdded] = getInputsAdded(receipt);

        if (inputAdded) {
            const { inputIndex } = inputAdded;
            const notice = await publicClientL2.getNotice([
                Number(inputIndex),
                0,
            ]);
        }

        const p: AddInput2Parameters = {
            account,
            chain: foundry,
            request: {
                application: zeroAddress,
                payload: zeroHash,
            },
        };
        const hash2 = await walletClient.addInput({
            // account,
            args: [zeroAddress, zeroHash],
            // abi: inputBoxAbi,
            // address: inputBoxAddress,
            // functionName: "addInput",
            // chain: foundry,
        });

        // addInput
        /*
        const { request: request2 } = await publicClient.simulateAddInput({
            account,
            args: [zeroAddress, zeroHash],
        });
        await walletClient.addInput(request2);
        */
    });
});
