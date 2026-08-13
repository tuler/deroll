import { type Rollup, RollupError } from "@cartesi/rollup";
import { constants } from "node:os";
import type { AdvanceRequestHandler, InspectRequestHandler } from "./types.js";

// libcmt's mock IO driver reports ENODATA once the inputs listed in CMT_INPUTS
// are exhausted. Its numeric value is platform-specific (61 on Linux, 96 on
// macOS), so read it from node instead of hardcoding it.
const ENODATA = constants.errno.ENODATA;

export type Handlers = {
    advance?: AdvanceRequestHandler;
    inspect?: InspectRequestHandler;
};

/**
 * Run the rollup request loop until there is nothing left to read.
 *
 * The loop itself is `Rollup.run` in the binding, which already implements the
 * semantics deroll wants: a request is accepted unless the handler returns
 * `false`, a request with no registered handler is rejected, and a handler
 * exception rejects the request and emits the error as a report (reports
 * survive a rejection, so the failure stays visible from outside the machine).
 *
 * What it does not do is end. `Rollup.run` returns `Promise<never>`: its
 * `finish` call sits outside the try, so exhausting the mock inputs listed in
 * `CMT_INPUTS` rejects the promise. That is the right behavior inside a real
 * machine, where the loop is meant to run forever, but on the host it turns the
 * normal end of a test run into a crash. This resolves instead.
 */
export const run = async (
    rollup: Rollup,
    handlers: Handlers,
): Promise<void> => {
    // set to true if there is a CMT_INPUTS env var defined
    const hostMode = !!process.env.CMT_INPUTS;

    try {
        await rollup.run(handlers);
    } catch (e: unknown) {
        if (hostMode && e instanceof RollupError && e.errno === -ENODATA) {
            // no more mock inputs to read, exit gracefully
            return;
        }
        throw e;
    }
};
