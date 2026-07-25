// The decoder contract — the fully typed spec a payload decoder is written
// against. The Cartesi Node Explorer re-exports these types internally, so
// the records and context your decoder receives are exactly what is
// documented here.
//
// The record types are NOT defined here. The API records come verbatim from
// @cartesi/client — the typed toolkit for the Cartesi Rollups node
// (https://cartesi.github.io/rollups-ts) that the explorer's data layer is
// built on — and the deposit envelope comes from @cartesi/codec, the
// encode/decode library for the protocol's on-chain formats. Both are the
// source of truth for what they describe. This module only defines what is
// decoder specific: one optional method per application-defined raw-bytes
// field, and what those methods may return (DecodeResult).
//
// The whole package is type-only (no runtime code), so importing from it adds
// nothing to your bundle. For the byte/ABI work itself use viem and
// @cartesi/codec — the blessed libraries the explorer provides to every
// decoder through its import map.

import type { Deposit } from "@cartesi/codec";
import type { Input, Output, Report, Withdrawal } from "@cartesi/client";

// ---- API records (from @cartesi/client, re-exported for convenience) ----

export type {
    DelegateCallVoucher,
    Input,
    Notice,
    Output,
    Report,
    Voucher,
    Withdrawal,
} from "@cartesi/client";
export type { Address, Hash, Hex } from "viem";

// ---- Payload sources ----
//
// The rollups node serves several raw-bytes fields whose encoding is defined
// by the application, not by the protocol — these are what a decoder is asked
// to make readable. A decoder exports one method per field it understands
// (all optional; the explorer falls back to its hex/UTF-8 view for the rest):
//
//   method               record         bytes decoded
//   ───────────────────  ─────────────  ──────────────────────────────────────
//   input                Input          input.decodedData.payload — the
//                                       advance payload sent by the user.
//                                       Never called for portal deposits: the
//                                       explorer decodes those by itself.
//   deposit              Deposit        the app-specific data attached to a
//                                       portal deposit (execLayerData /
//                                       baseLayerData). The deposit envelope
//                                       (asset, amounts, sender) arrives
//                                       already decoded.
//   output               Output         output.decodedData.payload — the
//                                       payload of a Notice, Voucher or
//                                       DelegateCallVoucher.
//   report               Report         report.rawData — the full report body
//                                       (e.g. inspect responses, error
//                                       messages).
//   withdrawalAccount    Withdrawal     withdrawal.account — the account
//                                       encoding produced by the app's
//                                       WithdrawalOutputBuilder (opaque to the
//                                       node).
//   withdrawalOutput     Withdrawal     withdrawal.output — the raw output
//                                       blob emitted for that account by the
//                                       app's WithdrawalOutputBuilder.
//
// Everything else the node serves (hashes, indices, proofs, tournament data,
// …) is protocol-defined and rendered by the explorer itself — decoders are
// never called for those. That includes the portal deposit envelope: the
// explorer recognizes deposits by sender, decodes and renders them natively,
// and only hands your `deposit` method the app-specific bytes riding inside.

// ---- Portal deposits ----
//
// Deposits are protocol-defined (InputEncoding.sol in rollups-contracts) and
// decoded by the explorer itself — never by a decoder — using
// @cartesi/codec, the protocol's encode/decode library
// (https://cartesi.github.io/rollups-ts/codec). These re-exports only
// describe what the `deposit` decode method RECEIVES: codec's Deposit union
// (discriminated by `type`, with bigint amounts/ids), whose
// baseLayerData/execLayerData fields carry the app-specific bytes the method
// is asked to decode — "0x" when the depositor attached nothing.

export type {
    Deposit,
    EtherDeposit,
    Erc20Deposit,
    Erc721Deposit,
    Erc1155SingleDeposit,
    Erc1155BatchDeposit,
} from "@cartesi/codec";

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

// ---- Decode methods ----
//
// A decode method receives the full API record (the raw bytes are a field of
// it — see the payload-sources table above) and returns a DecodeResult, or
// null/undefined when the payload is not recognized — the explorer then falls
// back to its hex/UTF-8 view. Throwing is treated the same, plus an
// unobtrusive error hint. Methods may be async.

type DecodeMethod<R> = (
    record: R,
    context: DecodeContext,
) => DecodeResultLike | Promise<DecodeResultLike>;

/**
 * Decodes `input.decodedData.payload` — the advance payload sent by the user.
 * Never called for portal deposits; those are decoded by the explorer itself
 * (see DepositDecoder for their app-specific attachment).
 */
export type InputDecoder = DecodeMethod<Input>;
/**
 * Decodes the app-specific data attached to a portal deposit — execLayerData
 * (and baseLayerData on the NFT portals); "0x" when absent. The deposit
 * envelope arrives already decoded as @cartesi/codec's Deposit; the explorer
 * renders the deposit itself and shows this method's result alongside it.
 */
export type DepositDecoder = DecodeMethod<Deposit>;
/** Decodes `output.decodedData.payload` — a Notice/Voucher/DelegateCallVoucher payload. */
export type OutputDecoder = DecodeMethod<Output>;
/** Decodes `report.rawData` — the full report body. */
export type ReportDecoder = DecodeMethod<Report>;
/** Decodes `withdrawal.account` — the app-defined account encoding. */
export type WithdrawalAccountDecoder = DecodeMethod<Withdrawal>;
/** Decodes `withdrawal.output` — the app-defined withdrawal output blob. */
export type WithdrawalOutputDecoder = DecodeMethod<Withdrawal>;

/**
 * A payload decoder module. Export `version`, optionally `name`, and one
 * method per payload source you understand — all methods optional, as named
 * exports (a default-exported object also works):
 *
 *   export const version = 1
 *   export const name = 'My decoder'
 *   export const input: InputDecoder = (input, context) => { … }
 *   export const report: ReportDecoder = (report) => { … }
 *
 * An exported method is also the capability signal: the explorer only calls
 * what you export, so new payload sources added to the contract later are
 * simply methods you don't have yet.
 */
export interface Decoder {
    /** Interface version; this contract is version 1. */
    version: 1;
    /** Display name shown in the registration UI. */
    name?: string;
    input?: InputDecoder;
    deposit?: DepositDecoder;
    output?: OutputDecoder;
    report?: ReportDecoder;
    withdrawalAccount?: WithdrawalAccountDecoder;
    withdrawalOutput?: WithdrawalOutputDecoder;
}
