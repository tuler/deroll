import { Rollup } from "@cartesi/rollup";

// open the rollup device
const rollup = new Rollup();

rollup
    .run({
        // echo incoming advance request as a notice
        advance: ({ payload }, rollup) => {
            rollup.emitNotice(payload);
            return true;
        },

        // echo incoming inspect request as a report
        inspect: ({ payload }, rollup) => {
            rollup.emitReport(payload);
        },
    })
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
