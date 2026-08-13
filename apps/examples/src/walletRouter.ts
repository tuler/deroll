import { type AdvanceRequestHandler, Rollup, chain } from "@cartesi/rollup";
import { createRouter } from "@deroll/router";
import { createWallet } from "@deroll/wallet";

// open the rollup device
const rollup = new Rollup();

// create wallet
const wallet = createWallet();

// create router
const router = createRouter();
router.add<{ address: string }>("wallet/:address", ({ params: { address } }) =>
    JSON.stringify(wallet.getWallet(address), (_, v) =>
        typeof v === "bigint" ? v.toString() : v,
    ),
);

// application logic, for inputs the wallet did not claim as a deposit
const application: AdvanceRequestHandler = ({ msgSender, payload }) => {
    console.log(`${msgSender} says ${payload.toString()}`);
    return true;
};

rollup
    .run({
        // the wallet claims portal deposits; anything else falls through
        advance: chain(wallet.handler, application),
        inspect: router.handler,
    })
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
