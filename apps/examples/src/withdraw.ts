import { createApp } from "@deroll/app";
import { decodeFunctionData, parseAbi } from "viem";

// create application
const app = createApp();

// define application ABI
const abi = parseAbi(["function withdraw(address token, uint256 amount)"]);

// handle input encoded as ABI function call
app.addAdvanceHandler(async ({ msgSender, payload }) => {
    const { functionName, args } = decodeFunctionData({
        abi,
        data: payload,
    });

    switch (functionName) {
        case "withdraw": {
            const [token, amount] = args;

            // create typed ERC-20 transfer output to the requester
            app.createErc20Transfer({
                recipient: msgSender,
                token,
                value: amount,
            });
            return true;
        }
    }
});

// start app
app.start().catch((e) => {
    console.error(e);
    process.exit(1);
});
