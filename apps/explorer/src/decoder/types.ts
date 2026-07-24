// The contract implemented by payload decoder modules. Defined canonically in
// the @deroll/decoder package (which is also what decoder authors write
// against), and re-exported here so the explorer and authors share one source
// of truth. See packages/explorer/decoder and the example decoder packages.

import type { Decoder } from "@deroll/decoder";

/** The names of Decoder's optional decode methods, derived so they cannot drift. */
export type DecodeMethodName = Exclude<keyof Decoder, "version" | "name">;

/**
 * The payload sources pages hand to useDecodedPayload. `deposit` is not one:
 * portal deposits are detected and decoded inside the `input` flow, where the
 * decoder's deposit method only decorates the native result.
 */
export type PayloadKind = Exclude<DecodeMethodName, "deposit">;

export type {
    DecodeContext,
    DecodeResult,
    Decoder,
    InputDecoder,
    DepositDecoder,
    OutputDecoder,
    ReportDecoder,
    WithdrawalAccountDecoder,
    WithdrawalOutputDecoder,
    Tag,
    TagColor,
    // Back-compat alias for the historical name used inside the explorer.
    Decoder as DecoderModule,
} from "@deroll/decoder";
