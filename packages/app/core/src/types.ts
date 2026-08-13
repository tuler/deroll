import type { Rollup } from "@cartesi/rollup";

// The rollup protocol vocabulary — request shapes, output shapes and the byte
// aliases — is owned by @cartesi/rollup, the libcmt binding. Deroll re-exports
// it rather than restating it, so the two can never drift.
export type {
    AddressLike,
    AdvanceRequest,
    BytesLike,
    DelegateCallVoucher,
    Hex,
    InspectRequest,
    RollupRequest,
    U256Like,
    Voucher,
} from "@cartesi/rollup";

import type { AdvanceRequest, InspectRequest } from "@cartesi/rollup";

/**
 * The slice of the rollup a request handler is handed: emitting outputs,
 * reporting progress and generic IO.
 *
 * Deliberately narrower than `Rollup` — it omits `finish`, `run`, `close` and
 * the merkle methods, which belong to whoever owns the loop. A handler calling
 * `finish` mid-request would desynchronize it.
 *
 * It is a `Pick` rather than the class itself so that it can be satisfied
 * structurally: `Rollup` declares a `#private` field, which TypeScript treats
 * as a nominal brand, so a hand-written fake is not assignable to the class.
 * `Rollup` is assignable to this, so handlers still compose with `Rollup.run`.
 */
export type RollupContext = Pick<
    Rollup,
    | "emitNotice"
    | "emitReport"
    | "emitVoucher"
    | "emitDelegateCallVoucher"
    | "emitException"
    | "progress"
    | "gio"
>;

/**
 * Whether an advance handler handled the input: `true` accepts it, `false`
 * declines it and passes it to the next handler in the chain.
 *
 * Note that a single `false` does not reject the input — only an input no
 * handler accepted is rejected, which reverts the machine state and discards
 * the notices and vouchers emitted for it (reports survive).
 *
 * There is deliberately no `void` in this type. `Rollup.run` in the binding
 * accepts a request unless a handler returns `false`; deroll is the opposite,
 * rejecting unless a handler opts in, so a handler that falls off its end must
 * be a type error rather than a silent accept.
 */
export type RequestHandlerResult = boolean;

/**
 * Handles an advance (state-changing) request. May be synchronous — the
 * underlying binding is, since `finish` pauses the whole guest.
 */
export type AdvanceRequestHandler = (
    request: AdvanceRequest,
    rollup: RollupContext,
) => RequestHandlerResult | Promise<RequestHandlerResult>;

/**
 * Handles an inspect (read-only) request. Produces reports; it cannot change
 * state, so it returns no verdict.
 */
export type InspectRequestHandler = (
    request: InspectRequest,
    rollup: RollupContext,
) => void | Promise<void>;
