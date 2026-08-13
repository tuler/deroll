import { Rollup } from "@cartesi/rollup";
import { toHex } from "viem";

// open the rollup device
const rollup = new Rollup();

rollup
    .run({
        // log incoming advance request
        advance: (request) => {
            const { type, payload, ...metadata } = request;
            console.log(metadata);
            console.log(payload.toString());
            return true;
        },

        // log incoming inspect request
        inspect: (request) => {
            console.log(toHex(request.payload));
        },
    })
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
