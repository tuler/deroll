import { Rollup } from "@cartesi/rollup";
import { run } from "@deroll/core";
import { createERC20TransferVoucher } from "@deroll/wallet";
import { decodeFunctionData, parseAbi, toHex } from "viem";

// open the rollup device
const rollup = new Rollup();

// define application ABI
const abi = parseAbi(["function withdraw(address token, uint256 amount)"]);

// handle input encoded as ABI function call
run(rollup, {
    advance: ({ msgSender, payload }, rollup) => {
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
                rollup.emitVoucher(voucher);
                return true;
            }
        }
        return false;
    },
}).catch((e) => {
    console.error(e);
    process.exit(1);
});
