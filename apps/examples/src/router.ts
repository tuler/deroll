import { Rollup } from "@cartesi/rollup";
import { createRouter } from "@deroll/router";

// open the rollup device
const rollup = new Rollup();

// create router
const router = createRouter();
router.add<{ name: string }>(
    "hello/:name",
    ({ params: { name } }) => `Hello ${name}`,
);

rollup.run({ inspect: router.handler }).catch((e) => {
    console.error(e);
    process.exit(1);
});
