import { createApp } from "@deroll/app";

// create application
const app = createApp();

// log incoming advance request
app.addAdvanceHandler(async (data) => {
    console.log(data.msgSender);
    console.log(data.payload);
    return true;
});

// log incoming inspect request
app.addInspectHandler(async (payload) => {
    console.log(payload);
});

// start app
app.start().catch((e) => {
    console.error(e);
    process.exit(1);
});
