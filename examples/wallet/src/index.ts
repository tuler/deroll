import { createApp } from "@deroll/app";
import { createRouter } from "@deroll/router";
import { createWallet } from "@deroll/wallet";

// create app
const app = createApp({ url: "http://localhost:5004" });

// create wallet
const wallet = createWallet();

const router = createRouter({ app });
router.add<{ address: string }>(
    "wallet/:address",
    ({ params: { address } }) => {
        return JSON.stringify({
            balance: wallet.balanceOfEther(address),
        });
    },
);

app.addAdvanceHandler(wallet.handler);
app.addInspectHandler(router.handler);

// start app
app.start().catch((e) => process.exit(1));
