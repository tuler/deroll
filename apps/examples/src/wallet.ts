import { createApp } from "@deroll/app";
import { createWallet } from "@deroll/wallet";

// create app
const app = createApp({ url: "http://127.0.0.1:5004" });

// create wallet
const wallet = createWallet();

app.addAdvanceHandler(wallet.handler);

// start app
app.start().catch((e) => {
    console.error(e);
    process.exit(1);
});
