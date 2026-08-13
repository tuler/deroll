import { Rollup } from "@cartesi/rollup";
import { createWallet } from "@deroll/wallet";

// open the rollup device
const rollup = new Rollup();

// create wallet
const wallet = createWallet();

rollup.run({ advance: wallet.handler }).catch((e) => {
    console.error(e);
    process.exit(1);
});
