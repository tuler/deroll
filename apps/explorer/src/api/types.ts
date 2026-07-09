// Wire types come from @cartesi/rpc — the typed client for the Cartesi
// Rollups node JSON-RPC API (https://cartesi.github.io/rollups-ts) and the
// source of truth for everything the node serves. This module only re-exports
// them and adds UI-side constants.

import type { EpochStatus, Output } from '@cartesi/rpc'

export type * from '@cartesi/rpc'

export const EPOCH_STATUSES: EpochStatus[] = [
  'OPEN',
  'CLOSED',
  'INPUTS_PROCESSED',
  'CLAIM_COMPUTED',
  'CLAIM_SUBMITTED',
  'CLAIM_STAGED',
  'CLAIM_ACCEPTED',
  'CLAIM_REJECTED',
  'CLAIM_FORECLOSED',
]

/**
 * Function selectors of the canonical output types (Cartesi Outputs library).
 * The node decodes outputs and reports `decoded_data.type` as the type NAME
 * ("Notice", "Voucher", "DelegateCallVoucher"); the selector is what the
 * `output_type` list filter takes on the wire.
 */
export const OUTPUT_TYPE_SELECTORS: Record<string, string> = {
  '0xc258d6e5': 'Notice',
  '0x237a816f': 'Voucher',
  '0x10321e8b': 'DelegateCallVoucher',
}

/** The node reports the output type by name; older nodes sent the selector. */
export function outputTypeLabel(type?: string | null): string {
  if (!type) return 'Unknown'
  if (type.startsWith('0x')) return OUTPUT_TYPE_SELECTORS[type.toLowerCase()] ?? type
  return type
}

/** Voucher/DelegateCallVoucher destination; Notices have none. */
export function outputDestination(decoded: Output['decoded_data']): string | undefined {
  return decoded && 'destination' in decoded ? decoded.destination : undefined
}

/** Voucher value (wei); other output types have none. */
export function outputValue(decoded: Output['decoded_data']): string | undefined {
  return decoded && 'value' in decoded ? decoded.value : undefined
}
