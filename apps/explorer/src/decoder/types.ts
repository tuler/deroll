// The contract implemented by payload decoder modules. Defined canonically in
// the @tuler/luke-decoder package (which is also what decoder authors write
// against), and re-exported here so the explorer and authors share one source
// of truth. See packages/decoder-kit and the example decoder packages.

export type {
  PayloadKind,
  DecodeContext,
  DecodeResult,
  Decoder,
  // Back-compat alias for the historical name used inside the explorer.
  Decoder as DecoderModule,
} from '@tuler/luke-decoder'
