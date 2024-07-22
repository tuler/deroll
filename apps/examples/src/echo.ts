import { createApp } from "@deroll/app";

// create application
const app = createApp({ url: "http://localhost:5004" });

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
app.start().catch((e) => process.exit(1));
