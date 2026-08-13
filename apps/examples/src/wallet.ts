import { Rollup } from "@cartesi/rollup";
import { run } from "@deroll/core";
import { createWallet } from "@deroll/wallet";

// open the rollup device
const rollup = new Rollup();

// create wallet
const wallet = createWallet();

run(rollup, { advance: wallet.handler }).catch((e) => {
    console.error(e);
    process.exit(1);
});
