// The decoder contract — the fully typed spec a payload decoder is written
// against. This module is the single source of truth: the Cartesi Node
// Explorer re-exports these types internally, so the `context.record` your
// decoder receives is exactly the API record documented here.
//
// It is type-only (no runtime code), so importing from it adds nothing to your
// bundle. See ./portals and ./bytes for runtime helpers, and ./index for a
// convenient barrel.

// ---- API primitives (hex-encoded strings from the JSON-RPC API) ----

/** Hex-encoded uint, e.g. "0x1f". */
export type HexUint = string
/** Hex-encoded 20-byte address, e.g. "0xab…". */
export type Address = string
/** Hex-encoded 32-byte hash. */
export type Hash = string
/** Hex-encoded byte array, e.g. "0xdeadbeef". */
export type ByteArray = string
/** Hex-encoded 4-byte function selector. */
export type FunctionSelector = string

// ---- API records (passed to decode() as context.record) ----

/** Decoded EVM advance metadata wrapping an input payload. */
export interface EvmAdvance {
  chain_id: HexUint
  application_contract: Address
  /** Input sender — a portal address for asset deposits, otherwise the user. */
  sender: Address
  block_number: HexUint
  block_timestamp: HexUint
  prev_randao: ByteArray
  index: HexUint
  payload: ByteArray
}

/** An application input. */
export interface Input {
  epoch_index: HexUint
  index: HexUint
  block_number: HexUint
  raw_data: ByteArray
  decoded_data: EvmAdvance | null
  status: string
  machine_hash: Hash | null
  outputs_hash: Hash | null
  transaction_reference: ByteArray
  created_at: string
  updated_at: string
}

/** Decoded output — union of Notice, Voucher and DelegateCallVoucher. */
export interface DecodedOutput {
  type: FunctionSelector
  /** Voucher and DelegateCallVoucher only. */
  destination?: Address
  /** Voucher only (decimal string, wei). */
  value?: string
  payload: ByteArray
}

/** An application output. */
export interface Output {
  epoch_index: HexUint
  input_index: HexUint
  index: HexUint
  raw_data: ByteArray
  decoded_data: DecodedOutput | null
  hash: Hash | null
  output_hashes_siblings: Hash[] | null
  execution_transaction_hash: Hash | null
  created_at: string
  updated_at: string
}

/** An application report. */
export interface Report {
  epoch_index: HexUint
  input_index: HexUint
  index: HexUint
  raw_data: ByteArray
  created_at: string
  updated_at: string
}

// ---- Decoder contract ----

/** Payload kinds a decoder may be asked to handle. */
export type PayloadKind = 'input' | 'output' | 'report'

interface BaseContext {
  /** Application contract address, lowercase "0x…" hex. */
  application: string
  /** Chain id of the connected node, when known. */
  chainId?: number
}

/** Context for an input payload; `record` is the full Input. */
export interface InputContext extends BaseContext {
  kind: 'input'
  record?: Input
}

/** Context for an output payload; `record` is the full Output. */
export interface OutputContext extends BaseContext {
  kind: 'output'
  record?: Output
}

/** Context for a report payload; `record` is the full Report. */
export interface ReportContext extends BaseContext {
  kind: 'report'
  record?: Report
}

/**
 * Identifies the payload being decoded. Discriminated by `kind`, so narrowing
 * on `context.kind` also narrows `context.record` to the matching record type:
 *
 *   if (context.kind === 'input') context.record // typed as Input | undefined
 */
export type DecodeContext = InputContext | OutputContext | ReportContext

export interface DecodeResult {
  /** One-line human-readable summary, shown in table cells. */
  summary?: string
  /** Structured value for the detail view: a string renders as text, objects/arrays as JSON. */
  data?: unknown
}

/** What decode() may return; null/undefined means "not recognized". */
export type DecodeResultLike = DecodeResult | null | undefined

/**
 * A payload decoder module. Export `version`, optionally `name`, and `decode`
 * as named exports (a default-exported object also works).
 *
 *   export const version = 1
 *   export const name = 'My decoder'
 *   export const decode: Decoder['decode'] = (payload, context) => { … }
 */
export interface Decoder {
  /** Interface version; this explorer supports version 1. */
  version: 1
  /** Display name shown in the registration UI. */
  name?: string
  /**
   * Decodes a hex payload ("0x…"). Return null/undefined when the payload is
   * not recognized — the explorer falls back to its hex/UTF-8 view. Throwing
   * is treated the same, plus an unobtrusive error hint. May be async.
   */
  decode(payload: string, context: DecodeContext): DecodeResultLike | Promise<DecodeResultLike>
}
