// The decoder contract — the fully typed spec a payload decoder is written
// against. The Cartesi Node Explorer re-exports these types internally, so
// the `context` your decoder receives is exactly what is documented here.
//
// The API record types are NOT defined here. They come verbatim from
// @cartesi/rpc — the typed client for the Cartesi Rollups node JSON-RPC API
// (https://cartesi.github.io/rollups-ts) — which is the source of truth for
// everything the node serves. This module only defines what is decoder
// specific: which raw-bytes field is being decoded (DecodeContext) and what a
// decoder may return (DecodeResult).
//
// It is type-only (no runtime code) and all @cartesi/rpc imports are
// type-only, so importing from it adds nothing to your bundle. See ./portals
// and ./bytes for runtime helpers, and ./index for a convenient barrel.

import type { Hex, HexNumber, Input, Output, Report, Withdrawal } from "@cartesi/rpc";

// ---- API records (from @cartesi/rpc, re-exported for convenience) ----

export type {
    Address,
    DelegateCallVoucher,
    Hash,
    Hex,
    HexNumber,
    Input,
    Notice,
    Output,
    Report,
    Voucher,
    Withdrawal,
} from "@cartesi/rpc";

// Aliases kept for decoders written against the pre-@cartesi/rpc names.

/** @deprecated Use `Input["decoded_data"]` (non-null) instead. */
export type EvmAdvance = NonNullable<Input["decoded_data"]>;
/** @deprecated Use the `Notice | Voucher | DelegateCallVoucher` union from @cartesi/rpc instead. */
export type DecodedOutput = NonNullable<Output["decoded_data"]>;
/** @deprecated Use `HexNumber` from @cartesi/rpc instead. */
export type HexUint = HexNumber;
/** @deprecated Use `Hex` from @cartesi/rpc instead. */
export type ByteArray = Hex;
/** @deprecated Use `Hex` from @cartesi/rpc instead. */
export type FunctionSelector = Hex;

// ---- Payload sources ----
//
// The rollups node serves several raw-bytes fields whose encoding is defined
// by the application, not by the protocol — these are what a decoder is asked
// to make readable. Each `kind` names exactly one such field:
//
//   kind                   record       bytes decoded
//   ─────────────────────  ───────────  ──────────────────────────────────────
//   "input"                Input        input.decoded_data.payload — the
//                                       advance payload sent by the user (for
//                                       deposits, the portal message; see
//                                       ./portals).
//   "output"               Output       output.decoded_data.payload — the
//                                       payload of a Notice, Voucher or
//                                       DelegateCallVoucher.
//   "report"               Report       report.raw_data — the full report
//                                       body (e.g. inspect responses, error
//                                       messages).
//   "withdrawal-account"   Withdrawal   withdrawal.account — the account
//                                       encoding produced by the app's
//                                       WithdrawalOutputBuilder (opaque to
//                                       the node).
//   "withdrawal-output"    Withdrawal   withdrawal.output — the raw output
//                                       blob emitted for that account by the
//                                       app's WithdrawalOutputBuilder.
//
// Everything else the node serves (hashes, indices, proofs, tournament data,
// …) is protocol-defined and rendered by the explorer itself — decoders are
// never called for those.

/** Payload kinds a decoder may be asked to handle. */
export type PayloadKind =
    | "input"
    | "output"
    | "report"
    | "withdrawal-account"
    | "withdrawal-output";

interface BaseContext {
    /** Application contract address, lowercase "0x…" hex. */
    application: string;
    /** Chain id of the connected node, when known. */
    chainId?: number;
}

/** Context for an advance payload (`input.decoded_data.payload`). */
export interface InputContext extends BaseContext {
    kind: "input";
    record?: Input;
}

/** Context for an output payload (`output.decoded_data.payload`). */
export interface OutputContext extends BaseContext {
    kind: "output";
    record?: Output;
}

/** Context for a report body (`report.raw_data`). */
export interface ReportContext extends BaseContext {
    kind: "report";
    record?: Report;
}

/** Context for a withdrawal account encoding (`withdrawal.account`). */
export interface WithdrawalAccountContext extends BaseContext {
    kind: "withdrawal-account";
    record?: Withdrawal;
}

/** Context for a withdrawal output blob (`withdrawal.output`). */
export interface WithdrawalOutputContext extends BaseContext {
    kind: "withdrawal-output";
    record?: Withdrawal;
}

/**
 * Identifies the payload being decoded. Discriminated by `kind`, so narrowing
 * on `context.kind` also narrows `context.record` to the matching record type:
 *
 *   if (context.kind === 'input') context.record // typed as Input | undefined
 */
export type DecodeContext =
    | InputContext
    | OutputContext
    | ReportContext
    | WithdrawalAccountContext
    | WithdrawalOutputContext;

// ---- Decode result ----

/**
 * Named tag colors. The explorer maps each name to theme-aware (light/dark)
 * pill styles; an unrecognized color falls back to "gray".
 */
export type TagColor =
    | "gray"
    | "blue"
    | "cyan"
    | "indigo"
    | "violet"
    | "pink"
    | "green"
    | "amber"
    | "red";

/**
 * A colored tag/pill rendered by the explorer next to the decoded payload —
 * in table cells and in the detail view. Use tags for short categorical
 * facts: the message kind ("transfer", "mint"), the asset ("ERC-20"), a
 * severity ("error"), …
 */
export interface Tag {
    /** Short label shown inside the pill. */
    label: string;
    /** Pill color; defaults to "gray". */
    color?: TagColor;
    /** Optional tooltip shown on hover. */
    title?: string;
}

export interface DecodeResult {
    /** One-line human-readable summary, shown in table cells. */
    summary?: string;
    /** Tags/pills shown alongside the summary; a bare string is a gray tag. */
    tags?: Array<string | Tag>;
    /** Structured value for the detail view: a string renders as text, objects/arrays as JSON. */
    data?: unknown;
}

/** What decode() may return; null/undefined means "not recognized". */
export type DecodeResultLike = DecodeResult | null | undefined;

/**
 * A payload decoder module. Export `version`, optionally `name`, and `decode`
 * as named exports (a default-exported object also works).
 *
 *   export const version = 2
 *   export const name = 'My decoder'
 *   export const decode: Decoder['decode'] = (payload, context) => { … }
 */
export interface Decoder {
    /**
     * Interface version. Version 1 decoders are only called for the "input",
     * "output" and "report" kinds; declare version 2 to also receive the
     * withdrawal payload kinds (decoders written before those kinds existed
     * often have a catch-all branch that would mis-decode them). DecodeResult
     * (including tags) is shared by both versions, and the contract evolves
     * additively within a version — return null for anything you do not
     * recognize instead of assuming the full set.
     */
    version: 1 | 2;
    /** Display name shown in the registration UI. */
    name?: string;
    /**
     * Decodes a hex payload ("0x…"). Return null/undefined when the payload is
     * not recognized — the explorer falls back to its hex/UTF-8 view. Throwing
     * is treated the same, plus an unobtrusive error hint. May be async.
     */
    decode(
        payload: string,
        context: DecodeContext,
    ): DecodeResultLike | Promise<DecodeResultLike>;
}
