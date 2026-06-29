// Types mirroring the Cartesi Rollups Node JSON-RPC API (jsonrpc-discover.json, v2.0.0)

/** Hex encoded uint64, e.g. "0x1f" */
export type HexUint = string
/** Hex encoded 20-byte address */
export type Address = string
/** Hex encoded 32-byte hash */
export type Hash = string
/** Hex encoded byte array, e.g. "0xdeadbeef" */
export type ByteArray = string
/** Hex encoded 4-byte function selector */
export type FunctionSelector = string

export interface Pagination {
  total_count: number
  limit: number
  offset: number
}

export interface ListResult<T> {
  data: T[]
  pagination: Pagination
}

export interface GetResult<T> {
  data: T
}

export type ApplicationState = 'ENABLED' | 'DISABLED' | 'FAILED' | 'INOPERABLE'

export type ConsensusType = 'AUTHORITY' | 'QUORUM' | 'PRT'

export type EpochStatus =
  | 'OPEN'
  | 'CLOSED'
  | 'INPUTS_PROCESSED'
  | 'CLAIM_COMPUTED'
  | 'CLAIM_SUBMITTED'
  | 'CLAIM_ACCEPTED'
  | 'CLAIM_REJECTED'

export const EPOCH_STATUSES: EpochStatus[] = [
  'OPEN',
  'CLOSED',
  'INPUTS_PROCESSED',
  'CLAIM_COMPUTED',
  'CLAIM_SUBMITTED',
  'CLAIM_ACCEPTED',
  'CLAIM_REJECTED',
]

export type InputCompletionStatus =
  | 'NONE'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXCEPTION'
  | 'MACHINE_HALTED'
  | 'OUTPUTS_LIMIT_EXCEEDED'
  | 'CYCLE_LIMIT_EXCEEDED'
  | 'TIME_LIMIT_EXCEEDED'
  | 'PAYLOAD_LENGTH_LIMIT_EXCEEDED'

export type SnapshotPolicy = 'NONE' | 'EVERY_INPUT' | 'EVERY_EPOCH'

export type WinnerCommitment = 'NONE' | 'ONE' | 'TWO'

export type MatchDeletionReason = 'STEP' | 'TIMEOUT' | 'CHILD_TOURNAMENT' | 'NOT_DELETED'

export interface ExecutionParameters {
  snapshot_policy: SnapshotPolicy
  advance_inc_cycles: HexUint
  advance_max_cycles: HexUint
  inspect_inc_cycles: HexUint
  inspect_max_cycles: HexUint
  advance_inc_deadline: HexUint
  advance_max_deadline: HexUint
  inspect_inc_deadline: HexUint
  inspect_max_deadline: HexUint
  load_deadline: HexUint
  store_deadline: HexUint
  fast_deadline: HexUint
  max_concurrent_inspects: number
  created_at: string
  updated_at: string
}

export interface Application {
  name: string
  iapplication_address: Address
  iconsensus_address: Address
  iinputbox_address: Address
  template_hash: Hash
  epoch_length: HexUint
  data_availability: ByteArray
  consensus_type: ConsensusType
  state: ApplicationState
  reason: string | null
  iinputbox_block: HexUint
  last_epoch_check_block: HexUint
  last_input_check_block: HexUint
  last_output_check_block: HexUint
  last_tournament_check_block: HexUint
  processed_inputs: HexUint
  created_at: string
  updated_at: string
  execution_parameters: ExecutionParameters
}

export interface Epoch {
  index: HexUint
  first_block: HexUint
  last_block: HexUint
  input_index_lower_bound: HexUint
  input_index_upper_bound: HexUint
  machine_hash: Hash | null
  outputs_merkle_root: Hash | null
  outputs_merkle_proof: Hash[] | null
  commitment: Hash | null
  commitment_proof: Hash[] | null
  claim_transaction_hash: Hash | null
  tournament_address: Address | null
  status: EpochStatus
  virtual_index: HexUint
  created_at: string
  updated_at: string
}

export interface EvmAdvance {
  chain_id: HexUint
  application_contract: Address
  sender: Address
  block_number: HexUint
  block_timestamp: HexUint
  prev_randao: ByteArray
  index: HexUint
  payload: ByteArray
}

export interface Input {
  epoch_index: HexUint
  index: HexUint
  block_number: HexUint
  raw_data: ByteArray
  decoded_data: EvmAdvance | null
  status: InputCompletionStatus
  machine_hash: Hash | null
  outputs_hash: Hash | null
  transaction_reference: ByteArray
  created_at: string
  updated_at: string
}

/** Union of Notice, Voucher and DelegateCallVoucher */
export interface DecodedOutput {
  type: FunctionSelector
  /** Voucher and DelegateCallVoucher only */
  destination?: Address
  /** Voucher only (decimal string, wei) */
  value?: string
  payload: ByteArray
}

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

export interface Report {
  epoch_index: HexUint
  input_index: HexUint
  index: HexUint
  raw_data: ByteArray
  created_at: string
  updated_at: string
}

export interface Tournament {
  epoch_index: HexUint
  address: Address
  parent_tournament_address: Address | null
  parent_match_id_hash: Hash | null
  max_level: HexUint
  level: HexUint
  log2step: HexUint
  height: HexUint
  winner_commitment: Hash | null
  final_state_hash: Hash | null
  finished_at_block: HexUint
  created_at: string
  updated_at: string
}

export interface Commitment {
  epoch_index: HexUint
  tournament_address: Address
  commitment: Hash
  final_state_hash: Hash
  submitter_address: Address
  block_number: HexUint
  tx_hash: Hash
  created_at: string
  updated_at: string
}

export interface Match {
  epoch_index: HexUint
  tournament_address: Address
  id_hash: Hash
  commitment_one: ByteArray
  commitment_two: ByteArray
  left_of_two: ByteArray
  block_number: HexUint
  tx_hash: Hash
  winner_commitment: WinnerCommitment
  deletion_reason: MatchDeletionReason
  deletion_block_number: HexUint
  deletion_tx_hash: Hash
  created_at: string
  updated_at: string
}

export interface MatchAdvanced {
  epoch_index: HexUint
  tournament_address: Address
  id_hash: Hash
  other_parent: ByteArray
  left_node: ByteArray
  block_number: HexUint
  tx_hash: Hash
  created_at: string
  updated_at: string
}

/** Known output function selectors (Cartesi Outputs library) */
export const OUTPUT_TYPES: Record<string, string> = {
  '0xc258d6e5': 'Notice',
  '0x237a816f': 'Voucher',
  '0x10321e8b': 'DelegateCallVoucher',
}
