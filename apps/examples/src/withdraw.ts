import { createApp } from "@deroll/app";
import { createERC20TransferVoucher } from "@deroll/wallet";
import { decodeFunctionData, parseAbi, toHex } from "viem";

// create application
const app = createApp();

// define application ABI
const abi = parseAbi(["function withdraw(address token, uint256 amount)"]);

// handle input encoded as ABI function call
app.addAdvanceHandler(({ msgSender, payload }) => {
    const { functionName, args } = decodeFunctionData({
        abi,
        data: toHex(payload),
    });

    switch (functionName) {
        case "withdraw": {
            const [token, amount] = args;

            // encode voucher of token transfer to requester
            const voucher = createERC20TransferVoucher(
                token,
                msgSender,
                amount,
            );

            // create voucher output
            app.createVoucher(voucher);
            return "accept";
        }
    }
    return "reject";
});

// start app
app.start().catch((e) => {
    console.error(e);
    process.exit(1);
});
