import { createApp } from "@deroll/app";
import { toHex } from "viem";

// create application
const app = createApp();

// log incoming advance request
app.addAdvanceHandler(async (data) => {
    console.log(data.metadata);
    console.log(data.payload.toString());
    return "accept";
});

// log incoming inspect request
app.addInspectHandler(async (data) => {
    console.log(toHex(data.payload));
});

// start app
app.start().catch((e) => {
    console.error(e);
    process.exit(1);
});
