// The contract implemented by payload decoder modules. Defined canonically in
// the @deroll/decoder package (which is also what decoder authors write
// against), and re-exported here so the explorer and authors share one source
// of truth. See packages/explorer/decoder and the example decoder packages.

import type { Decoder } from '@deroll/decoder'

/**
 * The payload sources a decoder can handle — the names of Decoder's optional
 * decode methods, derived so it cannot drift from the contract.
 */
export type PayloadKind = Exclude<keyof Decoder, 'version' | 'name'>

export type {
  DecodeContext,
  DecodeResult,
  Decoder,
  InputDecoder,
  OutputDecoder,
  ReportDecoder,
  WithdrawalAccountDecoder,
  WithdrawalOutputDecoder,
  Tag,
  TagColor,
  // Back-compat alias for the historical name used inside the explorer.
  Decoder as DecoderModule,
} from '@deroll/decoder'
