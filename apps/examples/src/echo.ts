import { createApp } from "@deroll/app";

// create application
const app = createApp();

// log incoming advance request
app.addAdvanceHandler(({ payload }) => {
    app.createNotice(payload);
    return "accept";
});

// log incoming inspect request
app.addInspectHandler(({ payload }) => {
    app.createReport(payload);
});

// start app
app.start().catch((e) => {
    console.error(e);
    process.exit(1);
});
