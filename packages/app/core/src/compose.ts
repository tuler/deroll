import type { AdvanceRequestHandler, InspectRequestHandler } from "./types.js";

/**
 * Compose advance handlers into one, presented the input in order until a
 * handler accepts it. The composed handler accepts if any handler accepted,
 * and declines if none did — so an input nobody recognized is rejected.
 *
 * This is the composition the rollup loop needs: `Rollup.run` takes a single
 * advance handler, while a deroll application is typically several
 * independently authored ones (a wallet, then application logic).
 *
 * Handler exceptions are deliberately not caught here. They propagate to the
 * loop, which rejects the input and emits the error as a report — rejecting is
 * the right outcome, and letting later handlers run would risk writing state on
 * top of a partially applied one.
 */
export const chain =
    (...handlers: AdvanceRequestHandler[]): AdvanceRequestHandler =>
    async (request, rollup) => {
        for (const handler of handlers) {
            if (await handler(request, rollup)) {
                return true;
            }
        }
        return false;
    };

/**
 * Like {@link chain}, but every handler sees the input even after one has
 * accepted it. The composed handler accepts if any handler accepted.
 */
export const broadcast =
    (...handlers: AdvanceRequestHandler[]): AdvanceRequestHandler =>
    async (request, rollup) => {
        let accepted = false;
        for (const handler of handlers) {
            if (await handler(request, rollup)) {
                accepted = true;
            }
        }
        return accepted;
    };

/**
 * Compose inspect handlers into one, presented the query in order.
 *
 * Unlike {@link chain} there is no verdict to short-circuit on: an inspect
 * handler produces reports and returns nothing, so every handler runs.
 */
export const all =
    (...handlers: InspectRequestHandler[]): InspectRequestHandler =>
    async (request, rollup) => {
        for (const handler of handlers) {
            await handler(request, rollup);
        }
    };
