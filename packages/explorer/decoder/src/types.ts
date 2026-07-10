// The decoder contract — the fully typed spec a payload decoder is written
// against. The Cartesi Node Explorer re-exports these types internally, so
// the records and context your decoder receives are exactly what is
// documented here.
//
// The API record types are NOT defined here. They come verbatim from
// @cartesi/rpc — the typed client for the Cartesi Rollups node JSON-RPC API
// (https://cartesi.github.io/rollups-ts) — which is the source of truth for
// everything the node serves. This module only defines what is decoder
// specific: one optional method per application-defined raw-bytes field, and
// what those methods may return (DecodeResult).
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
// to make readable. A decoder exports one method per field it understands
// (all optional; the explorer falls back to its hex/UTF-8 view for the rest):
//
//   method               record       bytes decoded
//   ───────────────────  ───────────  ────────────────────────────────────────
//   input                Input        input.decoded_data.payload — the
//                                     advance payload sent by the user (for
//                                     deposits, the portal message; see
//                                     ./portals).
//   output               Output       output.decoded_data.payload — the
//                                     payload of a Notice, Voucher or
//                                     DelegateCallVoucher.
//   report               Report       report.raw_data — the full report body
//                                     (e.g. inspect responses, error
//                                     messages).
//   withdrawalAccount    Withdrawal   withdrawal.account — the account
//                                     encoding produced by the app's
//                                     WithdrawalOutputBuilder (opaque to the
//                                     node).
//   withdrawalOutput     Withdrawal   withdrawal.output — the raw output blob
//                                     emitted for that account by the app's
//                                     WithdrawalOutputBuilder.
//
// Everything else the node serves (hashes, indices, proofs, tournament data,
// …) is protocol-defined and rendered by the explorer itself — decoders are
// never called for those.

/** The payload sources a decoder can handle; each is an optional Decoder method. */
export type PayloadKind =
    | "input"
    | "output"
    | "report"
    | "withdrawalAccount"
    | "withdrawalOutput";

/** Context passed to every decode method. */
export interface DecodeContext {
    /** Application contract address, lowercase "0x…" hex. */
    application: string;
    /** Chain id of the connected node, when known. */
    chainId?: number;
}

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

/** What a decode method may return; null/undefined means "not recognized". */
export type DecodeResultLike = DecodeResult | null | undefined;

/**
 * A decode method: receives the full API record (the raw bytes are a field of
 * it — see the payload-sources table above) and returns a DecodeResult, or
 * null/undefined when the payload is not recognized — the explorer then falls
 * back to its hex/UTF-8 view. Throwing is treated the same, plus an
 * unobtrusive error hint. May be async.
 */
export type DecodeMethod<R> = (
    record: R,
    context: DecodeContext,
) => DecodeResultLike | Promise<DecodeResultLike>;

/**
 * A payload decoder module (interface version 2). Export `version`,
 * optionally `name`, and one method per payload source you understand — all
 * methods optional, as named exports (a default-exported object also works):
 *
 *   export const version = 2
 *   export const name = 'My decoder'
 *   export const input: Decoder['input'] = (input, context) => { … }
 *   export const report: Decoder['report'] = (report) => { … }
 *
 * An exported method is also the capability signal: the explorer only calls
 * what you export, so new payload sources added to the contract later are
 * simply methods you don't have yet.
 */
export interface Decoder {
    /** Interface version; per-kind methods are version 2. */
    version: 2;
    /** Display name shown in the registration UI. */
    name?: string;
    /** Decodes `input.decoded_data.payload` — the advance payload sent by the user. */
    input?: DecodeMethod<Input>;
    /** Decodes `output.decoded_data.payload` — a Notice/Voucher/DelegateCallVoucher payload. */
    output?: DecodeMethod<Output>;
    /** Decodes `report.raw_data` — the full report body. */
    report?: DecodeMethod<Report>;
    /** Decodes `withdrawal.account` — the app-defined account encoding. */
    withdrawalAccount?: DecodeMethod<Withdrawal>;
    /** Decodes `withdrawal.output` — the app-defined withdrawal output blob. */
    withdrawalOutput?: DecodeMethod<Withdrawal>;
}

// ---- Version 1 (legacy) ----

/** @deprecated Context of the version-1 `decode()` contract. */
export type LegacyDecodeContext = DecodeContext &
    (
        | { kind: "input"; record?: Input }
        | { kind: "output"; record?: Output }
        | { kind: "report"; record?: Report }
    );

/**
 * @deprecated The version-1 contract: a single `decode(payload, context)`
 * discriminated by `context.kind`. Still loaded by the explorer, but only for
 * the input/output/report payloads it predates. Write new decoders as
 * version 2 with per-kind methods.
 */
export interface LegacyDecoder {
    version: 1;
    name?: string;
    decode(
        payload: string,
        context: LegacyDecodeContext,
    ): DecodeResultLike | Promise<DecodeResultLike>;
}

/** Any decoder module the explorer accepts. */
export type AnyDecoder = Decoder | LegacyDecoder;
