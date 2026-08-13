import { Rollup } from "@cartesi/rollup";
import { run } from "@deroll/core";
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

run(rollup, {
    advance: wallet.handler,
    inspect: router.handler,
}).catch((e) => {
    console.error(e);
    process.exit(1);
});
