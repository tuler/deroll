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
 * Verdict an advance handler returns for an input. On `"reject"` the machine
 * state is reverted and any notices/vouchers emitted for the input are
 * discarded; reports survive.
 */
export type RequestHandlerResult = "accept" | "reject";

/**
 * Handles an advance (state-changing) request. May be synchronous — the
 * underlying binding is, since `finish` pauses the whole guest.
 */
export type AdvanceRequestHandler = (
    request: AdvanceRequest,
) => RequestHandlerResult | Promise<RequestHandlerResult>;

/**
 * Handles an inspect (read-only) request. Produces reports; it cannot change
 * state, so it returns no verdict.
 */
export type InspectRequestHandler = (
    request: InspectRequest,
) => void | Promise<void>;
