import { createApp } from "@deroll/app";

// create application
const app = createApp();

// log incoming advance request
app.addAdvanceHandler(async ({ payload }) => {
    app.createNotice({ payload });
    return true;
});

// log incoming inspect request
app.addInspectHandler(async (payload) => {
    app.createReport(payload);
});

// start app
app.start().catch((e) => {
    console.error(e);
    process.exit(1);
});
