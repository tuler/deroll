import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { getInputsAdded, publicActionsL2, walletActionsL1 } from "../src";

async function main() {
    const chain = foundry;
    const account = privateKeyToAccount(
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    );

    // create public client to chain default url
    const publicClient = createPublicClient({ chain, transport: http() });

    // create extended public client to L2 with RPC url
    // https://github.com/tuler/deroll/tree/main/packages/rpc
    const publicClientL2 = createPublicClient({
        chain,
        transport: http("http://localhost:4000/rpc"),
    }).extend(publicActionsL2());

    // create extended wallet client to chain default url
    const walletClient = createWalletClient({
        chain,
        transport: http(),
    }).extend(walletActionsL1());

    // application address
    const application = "0xab7528bb862fb57e8a2bcd567a2e929a0be56a5e";

    // send address
    const hash = await walletClient.relayDAppAddress({
        account,
        application,
        chain,
    });

    // wait for receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // get input index from receipt
    const [inputAdded] = getInputsAdded(receipt);
    if (inputAdded) {
        const { inputIndex } = inputAdded;

        // wait for input to be processed
        const input = await publicClientL2.waitForInput({
            inputNumber: Number(inputIndex),
        });
        console.log(input);

        // get notice 0 produced by application
        const notice = await publicClientL2.getNotice({
            inputNumber: Number(inputIndex),
            noticeNumber: 0,
        });

        console.log(notice);
    }
}

main();
