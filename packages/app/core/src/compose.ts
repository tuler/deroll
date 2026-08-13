import type { AdvanceRequestHandler } from "./types.js";

/**
 * Compose advance handlers into one, presented the input in order until a
 * handler accepts it. Accepts if any handler accepted, declines if none did —
 * so an input nobody recognized is rejected by the loop.
 *
 * This is the composition the rollup loop needs: `Rollup.run` takes a single
 * advance handler, while a deroll application is typically several
 * independently authored ones — a wallet that claims portal deposits, then the
 * application's own logic.
 *
 * Handler exceptions are deliberately not caught. They propagate to the loop,
 * which rejects the input and emits the error as a report — rejecting is the
 * right outcome, and running later handlers would risk writing state on top of
 * a partially applied one.
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
 * accepted it. Accepts if any handler accepted.
 *
 * Use this when handlers observe the same input for different reasons — an
 * indexer or a logger alongside the handler that actually owns the input —
 * rather than competing to claim it.
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
