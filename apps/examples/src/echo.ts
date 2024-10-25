import { createApp } from "@deroll/app";

// create application
const app = createApp({ url: "http://127.0.0.1:5004" });

// log incoming advance request
app.addAdvanceHandler(async ({ payload }) => {
    await app.createNotice({ payload });
    return "accept";
});

// log incoming inspect request
app.addInspectHandler(async ({ payload }) => {
    await app.createReport({ payload });
});

// start app
app.start().catch((e) => {
    console.error(e);
    process.exit(1);
});
