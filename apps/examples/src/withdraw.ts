import { createApp } from "@deroll/app";
import { createERC20TransferVoucher } from "@deroll/wallet";
import { decodeFunctionData, parseAbi } from "viem";

// create application
const app = createApp({ url: "http://127.0.0.1:5004" });

// define application ABI
const abi = parseAbi(["function withdraw(address token, uint256 amount)"]);

// handle input encoded as ABI function call
app.addAdvanceHandler(async ({ metadata, payload }) => {
    const { functionName, args } = decodeFunctionData({ abi, data: payload });

    switch (functionName) {
        case "withdraw":
            const [token, amount] = args;
            const recipient = metadata.msg_sender;

            // encode voucher of token transfer to requester
            const voucher = createERC20TransferVoucher(
                token,
                recipient,
                amount,
            );

            // create voucher output
            await app.createVoucher(voucher);
            return "accept";
    }
});

// start app
app.start().catch((e) => process.exit(1));
