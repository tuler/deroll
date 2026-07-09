// Wire types come from @cartesi/rpc — the typed client for the Cartesi
// Rollups node JSON-RPC API (https://cartesi.github.io/rollups-ts) and the
// source of truth for everything the node serves. This module only re-exports
// them and adds UI-side constants.

import type { EpochStatus } from '@cartesi/rpc'

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
