import { createApp } from "@deroll/app";
import { toHex } from "viem";

// create application
const app = createApp();

// log incoming advance request
app.addAdvanceHandler((request) => {
    const { type, payload, ...metadata } = request;
    console.log(metadata);
    console.log(payload.toString());
    return "accept";
});

// log incoming inspect request
app.addInspectHandler((request) => {
    console.log(toHex(request.payload));
});

// start app
app.start().catch((e) => {
    console.error(e);
    process.exit(1);
});
