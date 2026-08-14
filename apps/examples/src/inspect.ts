import { Rollup } from "@cartesi/rollup";
import { createWallet } from "@deroll/wallet";
import { isAddress, stringToHex } from "viem";

// open the rollup device
const rollup = new Rollup();

// create wallet
const wallet = createWallet();

// report a UTF-8 string back to the caller
const report = (rollup: Rollup, message: string): boolean => {
    rollup.emitReport(stringToHex(message));
    return true;
};

// an inspect payload is an arbitrary buffer, and the application decides how to
// encode it. this one uses a plain UTF-8 string split on "/", but the same
// handler could just as well parse JSON or decode ABI parameters — see
// https://deroll.dev/app/data-encoding
rollup
    .run({
        // the wallet claims portal deposits, so there are balances to query
        advance: wallet.handler,

        inspect: ({ payload }, rollup) => {
            const [command, argument] = payload.toString().split("/");

            switch (command) {
                case "hello":
                    return report(rollup, `Hello ${argument ?? "world"}`);

                case "wallet": {
                    if (!argument || !isAddress(argument)) {
                        return report(rollup, "wallet/<address> expected");
                    }
                    const balances = wallet.getWallet(argument);
                    return report(
                        rollup,
                        JSON.stringify(balances, (_, v) =>
                            typeof v === "bigint" ? v.toString() : v,
                        ),
                    );
                }

                default:
                    return report(rollup, `Unknown query ${command}`);
            }
        },
    })
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
