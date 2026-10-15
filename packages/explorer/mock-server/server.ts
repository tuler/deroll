// Mock Cartesi Rollups Node JSON-RPC server for developing the explorer UI.
// Run with: bun mock/server.ts   (serves http://localhost:10011/rpc with CORS enabled)

import { privateKeyToAccount } from 'viem/accounts'

const hex = (n: number | bigint) => '0x' + n.toString(16)
const addr = (seed: number) => '0x' + (seed + 1).toString(16).padStart(40, 'a')
const hash = (seed: number) => '0x' + (seed + 1).toString(16).padStart(64, 'b')
const utf8 = (text: string) => '0x' + Buffer.from(text, 'utf-8').toString('hex')
const now = (offsetMin: number) => new Date(Date.now() - offsetMin * 60_000).toISOString()

const executionParameters = {
  snapshot_policy: 'EVERY_EPOCH',
  advance_inc_cycles: hex(4194304),
  advance_max_cycles: hex(4611686018427387903n),
  inspect_inc_cycles: hex(4194304),
  inspect_max_cycles: hex(4611686018427387903n),
  advance_inc_deadline: hex(10_000_000_000),
  advance_max_deadline: hex(180_000_000_000),
  inspect_inc_deadline: hex(10_000_000_000),
  inspect_max_deadline: hex(180_000_000_000),
  load_deadline: hex(300_000_000_000),
  store_deadline: hex(180_000_000_000),
  fast_deadline: hex(5_000_000_000),
  max_concurrent_inspects: 10,
  created_at: now(10000),
  updated_at: now(5),
}

// ---- perp-dex packed payloads (decoded by @deroll/perp-dex-decoder) ----

// Big-endian hex of `value` in `size` bytes.
const be = (value: bigint | number, size: number) =>
  BigInt(value).toString(16).padStart(size * 2, '0')
// ASCII characters packed into a u64, first character in the lowest byte.
const symbolCode = (name: string) =>
  [...name].reduceRight((v, c) => (v << 8n) | BigInt(c.charCodeAt(0)), 0n)

type FeedEntry = [symbol: string, timestamp: number, coefficient: number, decimals: number]
const feedPrices = (entries: FeedEntry[]) =>
  '0x00' +
  be(entries.length, 2) +
  entries
    .map(([s, ts, c, d]) => be(symbolCode(s), 8) + be(ts, 8) + be(c, 8) + be(d, 1))
    .join('')
// Canonical Cartesi InputEncoding portal messages.
const erc20Deposit = (token: string, sender: string, amount: bigint) =>
  '0x' + token.slice(2) + sender.slice(2) + be(amount, 32)
const etherDeposit = (sender: string, value: bigint) => '0x' + sender.slice(2) + be(value, 32)
const withdraw = (coefficient: number, decimals: number) =>
  '0x02' + be(coefficient, 8) + be(decimals, 1)
const placeOrder = (
  symbol: string,
  price: [coefficient: number, decimals: number],
  size: [coefficient: number, decimals: number],
  side: number,
  timeInForce: number,
  postOnly = 0,
  reduceOnly = 0,
) =>
  '0x03' +
  be(symbolCode(symbol), 8) +
  be(price[0], 8) +
  be(price[1], 1) +
  be(size[0], 8) +
  be(size[1], 1) +
  be(side, 1) +
  be(timeInForce, 1) +
  be(postOnly, 1) +
  be(reduceOnly, 1)
const cancelOrder = (orderId: number) => '0x04' + be(orderId, 8)

// Deterministic Cartesi portal addresses (deposits arrive from these); must
// match @cartesi/codec's portal addresses for the explorer's deposit
// decoding (decodeDeposit) to kick in.
const erc20Portal = '0x3332DE61a8BB9aC84893b2f552Fe81C9a6dC5419'
const etherPortal = '0x035b11Be55656c6cfC822D1CaE568C1Af2e497b0'
const collateralToken = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // USDC (perp-dex collateral)
const priceFeed = addr(50)
const trader1 = addr(53)
const trader2 = addr(54)

const feedAt = (m: number): FeedEntry[] => {
  const ts = Math.floor(Date.now() / 1000) - (14 - m) * 60
  return [
    ['BTC', ts, 6512345 + m * 1000, 2],
    ['ETH', ts, 345678 + m * 100, 2],
    ['SOL', ts, 15125 + m * 10, 2],
    ['CTSI', ts, 1525 + m, 4],
  ]
}

// ---- Sequencer batches (decoded natively by the explorer) ----
//
// The batch submitter posts SSZ-encoded batches of signed user operations.
// Set the submitter below on the perp-dex Overview page to see them unfold.
const batchSubmitter = addr(60)
const perpApplication = addr(20)
const perpChainId = 31337

const le = (value: bigint | number, size: number) =>
  Buffer.from(be(value, size), 'hex').reverse().toString('hex')
const offset = (n: number) => le(n, 4)
const bytes = (h: string) => h.slice(2)
// An SSZ list of variable-size items: an offset table, then the items.
const sszList = (items: string[]) => {
  let at = items.length * 4
  const table = items.map((item) => {
    const o = offset(at)
    at += item.length / 2
    return o
  })
  return table.join('') + items.join('')
}
type WireOp = { nonce: number; maxFee: number; data: string; signature: string }
const sszOp = (op: WireOp) =>
  le(op.nonce, 4) + le(op.maxFee, 2) + offset(14) + offset(14 + bytes(op.data).length / 2) + bytes(op.data) + bytes(op.signature)
const sszBatch = (nonce: number, frames: { ops: WireOp[]; safeBlock: number; feePrice: number }[]) =>
  '0x' +
  le(nonce, 8) +
  offset(12) +
  sszList(frames.map((f) => offset(14) + le(f.safeBlock, 8) + le(f.feePrice, 2) + sszList(f.ops.map(sszOp))))

// Test-only keys for the two sequencer users.
const alice = privateKeyToAccount(`0x${'11'.repeat(32)}`)
const bob = privateKeyToAccount(`0x${'22'.repeat(32)}`)
const signOp = async (
  account: typeof alice,
  nonce: number,
  maxFee: number,
  data: string,
): Promise<WireOp> => ({
  nonce,
  maxFee,
  data,
  signature: await account.signTypedData({
    domain: {
      name: 'CartesiAppSequencer',
      version: '1',
      chainId: perpChainId,
      verifyingContract: perpApplication as `0x${string}`,
    },
    types: {
      UserOp: [
        { name: 'nonce', type: 'uint32' },
        { name: 'max_fee', type: 'uint16' },
        { name: 'data', type: 'bytes' },
      ],
    },
    primaryType: 'UserOp',
    message: { nonce, max_fee: maxFee, data: data as `0x${string}` },
  }),
})

// [sender, payload] per input, mixing portal deposits and app messages.
const perpPayloads: [string, string][] = [
  [erc20Portal, erc20Deposit(collateralToken, trader1, 5_000_000_000n)], // 5,000 USDC (6 decimals)
  [erc20Portal, erc20Deposit(collateralToken, trader2, 12_500_500_000n)], // 12,500.50 USDC
  [priceFeed, feedPrices(feedAt(2))],
  [trader1, placeOrder('BTC', [6500000, 2], [5, 1], 0, 0)], // Buy 0.5 BTC @ 65000
  [trader2, placeOrder('ETH', [346010, 2], [2, 0], 1, 1)], // Sell 2 ETH @ 3460.10 IOC
  [priceFeed, feedPrices(feedAt(5))],
  [trader1, placeOrder('SOL', [15080, 2], [10, 0], 0, 0, 1)], // post-only
  [trader1, cancelOrder(1042)],
  [trader2, withdraw(125025, 2)], // 1,250.25
  [priceFeed, feedPrices(feedAt(9))],
  [trader2, placeOrder('CTSI', [1530, 4], [1000, 0], 1, 0, 0, 1)], // reduce-only
  [trader2, cancelOrder(1043)],
  [etherPortal, etherDeposit(trader1, 1_500_000_000_000_000_000n)], // 1.5 ETH (18 decimals)
  [erc20Portal, erc20Deposit(collateralToken, trader1, 2_000_000_000n)], // 2,000 USDC
  [
    batchSubmitter,
    sszBatch(0, [
      {
        safeBlock: 1300,
        feePrice: 700,
        ops: [
          await signOp(alice, 0, 900, placeOrder('BTC', [6510000, 2], [2, 1], 0, 0)),
          await signOp(bob, 0, 800, placeOrder('ETH', [345900, 2], [1, 0], 1, 0, 1)),
          await signOp(alice, 1, 900, cancelOrder(1044)),
        ],
      },
      { safeBlock: 1301, feePrice: 700, ops: [] },
      {
        safeBlock: 1302,
        feePrice: 710,
        ops: [
          await signOp(bob, 1, 750, withdraw(50000, 2)),
          // A forged signature: decodes, but recovers no signer.
          { nonce: 7, maxFee: 900, data: cancelOrder(1), signature: '0x' + '00'.repeat(65) },
        ],
      },
    ]),
  ],
  [priceFeed, feedPrices(feedAt(13))],
  [
    batchSubmitter,
    sszBatch(1, [
      { safeBlock: 1390, feePrice: 705, ops: [await signOp(alice, 2, 900, placeOrder('SOL', [15100, 2], [4, 0], 1, 1))] },
    ]),
  ],
  // The submitter's payload that is not a batch: the scheduler rejects it.
  [batchSubmitter, '0x0200000000000000ff'],
]

const perpInputs = perpPayloads.map(([sender, payload], i) => ({
  epoch_index: hex(Math.min(Math.floor(i / 3), 4)),
  index: hex(i),
  block_number: hex(105 + i * 90),
  raw_data: '0x415bf363' + 'ab'.repeat(64),
  decoded_data: {
    chain_id: hex(31337),
    application_contract: addr(20),
    sender,
    block_number: hex(105 + i * 90),
    block_timestamp: hex(Math.floor(Date.now() / 1000) - (14 - i) * 60),
    prev_randao: hash(800 + i),
    index: hex(i),
    payload,
  },
  status: i === 11 ? 'REJECTED' : 'ACCEPTED',
  exception_data: null,
  machine_hash: hash(820 + i),
  tx_buffer_data_block: hash(840 + i),
  transaction_hash: hash(860 + i),
  log_index: hex(i % 4),
  created_at: now(1400 - i * 100),
  updated_at: now(140 - i * 10),
}))

const apps = [
  {
    name: 'echo-dapp',
    iapplication_address: addr(1),
    iconsensus_address: addr(2),
    iinputbox_address: addr(3),
    template_hash: hash(1),
    epoch_length: hex(720),
    claim_staging_period: hex(60),
    withdrawal_config: {
      guardian: addr(70),
      log2_leaves_per_account: hex(3),
      log2_max_num_of_accounts: hex(16),
      accounts_drive_start_index: hex(4096),
      withdrawal_output_builder: addr(71),
    },
    last_foreclose_check_block: hex(5000),
    last_accounts_drive_proved_check_block: hex(5000),
    last_withdrawal_check_block: hex(5000),
    consensus_type: 'AUTHORITY',
    enabled: true,
    status: 'OK',
    reason: null,
    foreclose_block: hex(0),
    foreclose_transaction: null,
    accounts_drive_proved_block: hex(0),
    accounts_drive_proved_transaction: null,
    accounts_drive_merkle_root: null,
    iinputbox_block: hex(100),
    last_epoch_check_block: hex(5000),
    last_input_check_block: hex(5000),
    last_output_check_block: hex(4990),
    last_tournament_check_block: hex(0),
    processed_inputs: hex(42),
    created_at: now(20000),
    updated_at: now(2),
    execution_parameters: executionParameters,
  },
  {
    name: 'honeypot',
    iapplication_address: addr(10),
    iconsensus_address: addr(11),
    iinputbox_address: addr(3),
    template_hash: hash(2),
    epoch_length: hex(1440),
    claim_staging_period: hex(60),
    withdrawal_config: {
      guardian: addr(70),
      log2_leaves_per_account: hex(3),
      log2_max_num_of_accounts: hex(16),
      accounts_drive_start_index: hex(4096),
      withdrawal_output_builder: addr(71),
    },
    last_foreclose_check_block: hex(5000),
    last_accounts_drive_proved_check_block: hex(5000),
    last_withdrawal_check_block: hex(5000),
    consensus_type: 'PRT',
    enabled: false,
    status: 'OK',
    reason: null,
    // foreclosed: exercises the foreclosure section and the withdrawals flow
    foreclose_block: hex(6100),
    foreclose_transaction: hash(610),
    accounts_drive_proved_block: hex(6200),
    accounts_drive_proved_transaction: hash(620),
    accounts_drive_merkle_root: hash(630),
    iinputbox_block: hex(200),
    last_epoch_check_block: hex(6000),
    last_input_check_block: hex(6000),
    last_output_check_block: hex(6000),
    last_tournament_check_block: hex(6000),
    processed_inputs: hex(7),
    created_at: now(30000),
    updated_at: now(1),
    execution_parameters: executionParameters,
  },
  {
    name: 'perp-dex',
    iapplication_address: addr(20),
    iconsensus_address: addr(21),
    iinputbox_address: addr(3),
    template_hash: hash(3),
    epoch_length: hex(720),
    claim_staging_period: hex(60),
    withdrawal_config: {
      guardian: addr(70),
      log2_leaves_per_account: hex(3),
      log2_max_num_of_accounts: hex(16),
      accounts_drive_start_index: hex(4096),
      withdrawal_output_builder: addr(71),
    },
    last_foreclose_check_block: hex(5000),
    last_accounts_drive_proved_check_block: hex(5000),
    last_withdrawal_check_block: hex(5000),
    consensus_type: 'AUTHORITY',
    enabled: true,
    status: 'OK',
    reason: null,
    foreclose_block: hex(0),
    foreclose_transaction: null,
    accounts_drive_proved_block: hex(0),
    accounts_drive_proved_transaction: null,
    accounts_drive_merkle_root: null,
    iinputbox_block: hex(100),
    last_epoch_check_block: hex(5000),
    last_input_check_block: hex(5000),
    last_output_check_block: hex(4990),
    last_tournament_check_block: hex(0),
    processed_inputs: hex(perpInputs.length),
    created_at: now(15000),
    updated_at: now(3),
    execution_parameters: executionParameters,
  },
]

const findApp = (nameOrAddress: string) =>
  apps.find(
    (a) =>
      a.name === nameOrAddress ||
      a.iapplication_address.toLowerCase() === nameOrAddress.toLowerCase(),
  )

const EPOCH_STATUSES = ['CLAIM_ACCEPTED', 'CLAIM_ACCEPTED', 'CLAIM_SUBMITTED', 'INPUTS_PROCESSED', 'OPEN']

const epochs = EPOCH_STATUSES.map((status, i) => ({
  index: hex(i),
  first_block: hex(100 + i * 720),
  last_block: hex(100 + (i + 1) * 720 - 1),
  input_index_lower_bound: hex(i * 8),
  input_index_upper_bound: hex(Math.min((i + 1) * 8, 42)),
  machine_hash: status === 'OPEN' ? null : hash(100 + i),
  tx_buffer_data_block: status === 'OPEN' ? null : hash(110 + i),
  tx_buffer_proof: status === 'OPEN' ? null : [hash(120 + i), hash(130 + i)],
  iflags_y_data_block: status === 'OPEN' ? null : hash(170 + i),
  iflags_y_proof: status === 'OPEN' ? null : [hash(175 + i), hash(180 + i)],
  htif_tohost_data_block: status === 'OPEN' ? null : hash(185 + i),
  htif_tohost_proof: status === 'OPEN' ? null : [hash(190 + i), hash(195 + i)],
  commitment: status === 'OPEN' ? null : hash(140 + i),
  commitment_proof: status === 'OPEN' ? null : [hash(150 + i)],
  claim_transaction_hash: status.startsWith('CLAIM') ? hash(160 + i) : null,
  tournament_address: i === 2 ? addr(30) : null,
  status,
  staged_at_block: null,
  virtual_index: hex(i),
  created_at: now(10000 - i * 1000),
  updated_at: now(100 - i * 10),
}))

const INPUT_STATUSES = ['ACCEPTED', 'ACCEPTED', 'REJECTED', 'ACCEPTED', 'EXCEPTION', 'ACCEPTED', 'OVERFLOW']

const inputStatus = (i: number) => INPUT_STATUSES[i % INPUT_STATUSES.length]

const inputs = Array.from({ length: 42 }, (_, i) => ({
  epoch_index: hex(Math.min(Math.floor(i / 8), 4)),
  index: hex(i),
  block_number: hex(105 + i * 90),
  raw_data: '0x415bf363' + 'ab'.repeat(64),
  decoded_data: {
    chain_id: hex(31337),
    application_contract: addr(1),
    sender: addr(40 + (i % 3)),
    block_number: hex(105 + i * 90),
    block_timestamp: hex(Math.floor(Date.now() / 1000) - (42 - i) * 3600),
    prev_randao: hash(200 + i),
    index: hex(i),
    payload: i % 4 === 0 ? utf8(`{"action":"transfer","amount":${i * 10}}`) : '0x' + 'fe'.repeat(20 + i),
  },
  status: inputStatus(i),
  // raw guest-provided CMIO exception payload, only for EXCEPTION inputs
  exception_data:
    inputStatus(i) === 'EXCEPTION' ? utf8(`assertion failed: balance >= amount (input ${i})`) : null,
  machine_hash: hash(300 + i),
  tx_buffer_data_block: hash(340 + i),
  transaction_hash: hash(400 + i),
  log_index: hex(i % 4),
  created_at: now(5000 - i * 100),
  updated_at: now(500 - i * 10),
}))

// The node reports decoded_data.type by NAME; the selector prefixes raw_data
// and is what the output_type list filter matches on the wire.
const OUTPUT_TYPES = [
  { selector: '0xc258d6e5', name: 'Notice' },
  { selector: '0x237a816f', name: 'Voucher' },
  { selector: '0x10321e8b', name: 'DelegateCallVoucher' },
]

const outputs = Array.from({ length: 30 }, (_, i) => {
  const { selector, name } = OUTPUT_TYPES[i % OUTPUT_TYPES.length]
  const decoded: Record<string, unknown> = { type: name, payload: utf8(`output payload ${i}`) }
  if (name === 'Voucher') {
    decoded.destination = addr(60 + i)
    decoded.value = hex(BigInt(i) * 10n ** 17n)
  } else if (name === 'DelegateCallVoucher') {
    decoded.destination = addr(80 + i)
  }
  return {
    epoch_index: hex(Math.min(Math.floor(i / 6), 4)),
    input_index: hex(i),
    index: hex(i),
    raw_data: selector + 'cd'.repeat(40),
    decoded_data: decoded,
    hash: hash(500 + i),
    output_hashes_siblings: [hash(520 + i), hash(540 + i), hash(560 + i)],
    execution_transaction_hash: i % 5 === 0 ? hash(580 + i) : null,
    created_at: now(4000 - i * 100),
    updated_at: now(400 - i * 10),
  }
})

const reports = Array.from({ length: 12 }, (_, i) => ({
  epoch_index: hex(Math.min(Math.floor(i / 3), 4)),
  input_index: hex(i * 2),
  index: hex(i),
  raw_data: i % 2 === 0 ? utf8(`error: insufficient balance for request ${i}`) : '0x' + 'ee'.repeat(32),
  created_at: now(3000 - i * 100),
  updated_at: now(300 - i * 10),
}))

// Withdrawals appear only after an application is foreclosed and its accounts
// drive is proved. `account` and `output` are app-defined raw bytes, opaque to
// the node — the mock uses a 20-byte address account and a Voucher-shaped
// output blob, which an app decoder can decode via its withdrawalAccount /
// withdrawalOutput methods.
const withdrawals = Array.from({ length: 6 }, (_, i) => ({
  account_index: hex(i),
  account: addr(90 + i),
  output: '0x237a816f' + 'cd'.repeat(64),
  block_number: hex(9000 + i * 3),
  transaction_hash: hash(900 + i),
  log_index: hex(i % 3),
  created_at: now(1000 - i * 50),
  updated_at: now(100 - i * 5),
}))

const zeroAddr = '0x' + '0'.repeat(40)

const tournaments = [
  {
    epoch_index: hex(2),
    address: addr(30),
    parent_tournament_address: null,
    parent_match_id_hash: null,
    max_level: hex(3),
    level: hex(0),
    log2step: hex(44),
    height: hex(48),
    created_at: now(900),
    updated_at: now(10),
    initial_hash: hash(690),
    base_cycle: hex(0),
    kind: 'NON_LEAF',
    start_instant: hex(5100),
    allowance: hex(7200),
    creation_event: { block_number: hex(5100), tx_hash: hash(691), log_index: hex(0) },
    snapshot: {
      as_of_block: hex(6000),
      standing: 'MATCHES_ACTIVE',
      accepts_joins: false,
      candidate: null,
      winner_commitment: null,
      final_state_hash: null,
      parent_commitment: null,
      finished_at_block: hex(0),
      winner_expires_at: hex(0),
      inner_result: null,
      bond_recovery: { disposition: 'TOURNAMENT_RUNNING', claimer: null, payment: null },
    },
  },
  {
    epoch_index: hex(2),
    address: addr(31),
    parent_tournament_address: addr(30),
    parent_match_id_hash: hash(700),
    max_level: hex(3),
    level: hex(1),
    log2step: hex(27),
    height: hex(17),
    created_at: now(800),
    updated_at: now(20),
    initial_hash: hash(692),
    base_cycle: hex(1n << 44n),
    kind: 'LEAF',
    start_instant: hex(5400),
    allowance: hex(3600),
    creation_event: { block_number: hex(5400), tx_hash: hash(752), log_index: hex(2) },
    snapshot: {
      as_of_block: hex(6000),
      standing: 'INNER_WINNER',
      accepts_joins: false,
      candidate: hash(710),
      winner_commitment: hash(710),
      final_state_hash: hash(711),
      parent_commitment: hash(720),
      finished_at_block: hex(5500),
      winner_expires_at: hex(5800),
      inner_result: { disposition: 'WINNER', parent_commitment: hash(720), paused_allowance: hex(120) },
      bond_recovery: { disposition: 'RECOVERABLE', claimer: addr(95), payment: hex(10n ** 16n) },
    },
  },
]

const commitments = Array.from({ length: 3 }, (_, i) => ({
  epoch_index: hex(2),
  tournament_address: addr(30),
  commitment: hash(720 + i),
  final_state_hash: hash(730 + i),
  submitter_address: addr(95 + i),
  block_number: hex(5200 + i * 10),
  tx_hash: hash(740 + i),
  created_at: now(850 - i * 10),
  updated_at: now(85 - i),
  log_index: hex(i),
  snapshot: {
    as_of_block: hex(6000),
    // the eliminated commitment loses its claimer
    claimer: i === 1 ? zeroAddr : addr(95 + i),
    clock_running: i === 2,
    clock_deadline: i === 2 ? hex(6300) : hex(0),
    clock_allowance: hex(i === 1 ? 0 : 3000 - i * 400),
  },
}))

const notDeleted = {
  winner_commitment: 'NONE',
  deletion_reason: 'NOT_DELETED',
  deletion_block_number: null,
  deletion_tx_hash: null,
  deletion_log_index: null,
}

// A deleted match is UNINITIALIZED and carries no phase payload.
const deletedSnapshot = {
  as_of_block: hex(6000),
  timeout_outcome: 'NONE',
  deferred_charge: hex(0),
  phase: 'UNINITIALIZED',
  bisection: null,
  sealed: null,
}

const matches = [
  {
    epoch_index: hex(2),
    tournament_address: addr(30),
    id_hash: hash(700),
    commitment_one: hash(720),
    commitment_two: hash(721),
    left_of_two: hash(750),
    block_number: hex(5250),
    tx_hash: hash(751),
    winner_commitment: 'NONE',
    deletion_reason: 'CHILD_TOURNAMENT',
    deletion_block_number: hex(5400),
    deletion_tx_hash: hash(752),
    deletion_log_index: hex(1),
    created_at: now(840),
    updated_at: now(30),
    log_index: hex(0),
    eliminable_at: hex(8850),
    leaf_seal: null,
    snapshot: deletedSnapshot,
  },
  {
    epoch_index: hex(2),
    tournament_address: addr(30),
    id_hash: hash(701),
    commitment_one: hash(721),
    commitment_two: hash(722),
    left_of_two: hash(753),
    block_number: hex(5260),
    tx_hash: hash(754),
    winner_commitment: 'ONE',
    deletion_reason: 'TIMEOUT',
    deletion_block_number: hex(5450),
    deletion_tx_hash: hash(755),
    deletion_log_index: hex(0),
    created_at: now(830),
    updated_at: now(25),
    log_index: hex(1),
    eliminable_at: hex(8860),
    leaf_seal: null,
    snapshot: deletedSnapshot,
  },
  {
    epoch_index: hex(2),
    tournament_address: addr(30),
    id_hash: hash(702),
    commitment_one: hash(720),
    commitment_two: hash(722),
    left_of_two: hash(756),
    block_number: hex(5470),
    tx_hash: hash(757),
    ...notDeleted,
    created_at: now(700),
    updated_at: now(5),
    log_index: hex(3),
    eliminable_at: hex(9070),
    leaf_seal: null,
    snapshot: {
      as_of_block: hex(6000),
      timeout_outcome: 'NONE',
      deferred_charge: hex(0),
      phase: 'BISECTING',
      bisection: {
        revealing_parent: hash(758),
        waiting_left: hash(759),
        waiting_right: hash(760),
        segment_start_position: hex(1n << 40n),
        segment_start_cycle: hex(1n << 41n),
        responder: 'TWO',
        current_height: hex(31),
      },
      sealed: null,
    },
  },
  {
    epoch_index: hex(2),
    tournament_address: addr(31),
    id_hash: hash(703),
    commitment_one: hash(710),
    commitment_two: hash(712),
    left_of_two: hash(761),
    block_number: hex(5420),
    tx_hash: hash(762),
    ...notDeleted,
    winner_commitment: 'ONE',
    created_at: now(780),
    updated_at: now(15),
    log_index: hex(0),
    eliminable_at: hex(9020),
    leaf_seal: { eliminable_at: hex(5980), block_number: hex(5480), tx_hash: hash(763), log_index: hex(4) },
    snapshot: {
      as_of_block: hex(6000),
      timeout_outcome: 'ONE_WINS',
      deferred_charge: hex(12),
      phase: 'SEALED',
      bisection: null,
      sealed: {
        agree_state: hash(764),
        divergence_position: hex(123456),
        divergence_cycle: hex((1n << 44n) + 123456n),
        final_state_one: hash(711),
        final_state_two: hash(765),
      },
    },
  },
]

const matchAdvances = Array.from({ length: 6 }, (_, i) => ({
  epoch_index: hex(2),
  tournament_address: addr(30),
  id_hash: hash(700),
  other_parent: hash(760 + i),
  left_node: hash(770 + i),
  block_number: hex(5300 + i * 5),
  tx_hash: hash(780 + i),
  created_at: now(820 - i * 5),
  updated_at: now(82 - i),
  log_index: hex(i % 2),
  segment_start_position: hex(BigInt(i) << 38n),
  eliminable_at: hex(8900 + i * 5),
}))

const bondEvents = [
  {
    epoch_index: hex(2),
    tournament_address: addr(31),
    block_number: hex(5490),
    tx_hash: hash(790),
    log_index: hex(1),
    created_at: now(760),
    updated_at: now(760),
    type: 'PARTIAL_BOND_REFUND',
    refund: { recipient: addr(95), value: hex(2n * 10n ** 15n), success: true },
    recovery: null,
  },
  {
    epoch_index: hex(2),
    tournament_address: addr(31),
    block_number: hex(5520),
    tx_hash: hash(791),
    log_index: hex(0),
    created_at: now(740),
    updated_at: now(740),
    type: 'BOND_RECOVERED',
    refund: null,
    recovery: { commitment: hash(710), claimer: addr(95), payment: hex(10n ** 16n), burned: hex(10n ** 15n) },
  },
]

type Params = Record<string, any>

function paginate<T>(items: T[], params: Params) {
  const limit = Math.max(1, Number(params.limit ?? 50))
  const offset = Math.max(0, Number(params.offset ?? 0))
  const sorted = params.descending ? [...items].reverse() : items
  return {
    data: sorted.slice(offset, offset + limit),
    pagination: { total_count: items.length, limit, offset },
  }
}

const eq = (a?: string | null, b?: string | null) =>
  a != null && b != null && a.toLowerCase() === b.toLowerCase()

// A filter is one value or a non-empty list of values (OR semantics).
const anyOf = (value: string, filter?: string | string[]) =>
  filter == null || (Array.isArray(filter) ? filter : [filter]).some((f) => eq(value, f))

// Inclusive `from`/`to` index range of the listing methods.
const inRange = (index: string, p: Params) =>
  (p.from == null || BigInt(index) >= BigInt(p.from)) &&
  (p.to == null || BigInt(index) <= BigInt(p.to))

function requireApp(params: Params) {
  const app = findApp(params.application)
  if (!app) throw { code: -32001, message: `application '${params.application}' not found` }
  return app
}

const appInputs = (app: { name: string }) => (app.name === 'perp-dex' ? perpInputs : inputs)

const methods: Record<string, (params: Params) => unknown> = {
  cartesi_listApplications: (p) => paginate(apps, p),
  cartesi_getApplication: (p) => ({ data: requireApp(p) }),
  cartesi_getProcessedInputCount: (p) => ({ data: requireApp(p).processed_inputs }),
  cartesi_getLastAcceptedEpochIndex: (p) => {
    requireApp(p)
    return { data: hex(1) }
  },
  cartesi_listEpochs: (p) => {
    requireApp(p)
    return paginate(epochs.filter((e) => anyOf(e.status, p.status) && inRange(e.index, p)), p)
  },
  cartesi_getEpoch: (p) => {
    requireApp(p)
    const epoch = epochs.find((e) => eq(e.index, p.epoch_index))
    if (!epoch) throw { code: -32001, message: 'epoch not found' }
    return { data: epoch }
  },
  cartesi_getEpochByVirtualIndex: (p) => {
    requireApp(p)
    const epoch = epochs.find((e) => eq(e.virtual_index, p.virtual_index))
    if (!epoch) throw { code: -32001, message: 'epoch not found' }
    return { data: epoch }
  },
  cartesi_listInputs: (p) => {
    const app = requireApp(p)
    return paginate(
      appInputs(app).filter(
        (i) =>
          (p.epoch_index == null || eq(i.epoch_index, p.epoch_index)) &&
          (p.sender == null || eq(i.decoded_data.sender, p.sender)) &&
          (p.transaction_hash == null || eq(i.transaction_hash, p.transaction_hash)) &&
          inRange(i.index, p),
      ),
      p,
    )
  },
  cartesi_getInput: (p) => {
    const app = requireApp(p)
    const input = appInputs(app).find((i) => eq(i.index, p.input_index))
    if (!input) throw { code: -32001, message: 'input not found' }
    return { data: input }
  },
  cartesi_listOutputs: (p) => {
    requireApp(p)
    return paginate(
      outputs.filter(
        (o) =>
          (p.epoch_index == null || eq(o.epoch_index, p.epoch_index)) &&
          (p.input_index == null || eq(o.input_index, p.input_index)) &&
          anyOf(o.raw_data.slice(0, 10), p.output_type) &&
          (p.voucher_address == null || eq(o.decoded_data.destination as string, p.voucher_address)) &&
          (p.executed == null || (o.execution_transaction_hash !== null) === p.executed) &&
          inRange(o.index, p),
      ),
      p,
    )
  },
  cartesi_getExecutedOutputCount: (p) => {
    requireApp(p)
    return { data: hex(outputs.filter((o) => o.execution_transaction_hash !== null).length) }
  },
  cartesi_getPendingExecutableOutputCount: (p) => {
    requireApp(p)
    return {
      data: hex(
        outputs.filter(
          (o) => o.decoded_data.type !== 'Notice' && o.execution_transaction_hash === null,
        ).length,
      ),
    }
  },
  cartesi_getOutput: (p) => {
    requireApp(p)
    const output = outputs.find((o) => eq(o.index, p.output_index))
    if (!output) throw { code: -32001, message: 'output not found' }
    return { data: output }
  },
  cartesi_listReports: (p) => {
    requireApp(p)
    return paginate(
      reports.filter(
        (r) =>
          (p.epoch_index == null || eq(r.epoch_index, p.epoch_index)) &&
          (p.input_index == null || eq(r.input_index, p.input_index)) &&
          inRange(r.index, p),
      ),
      p,
    )
  },
  cartesi_getReport: (p) => {
    requireApp(p)
    const report = reports.find((r) => eq(r.index, p.report_index))
    if (!report) throw { code: -32001, message: 'report not found' }
    return { data: report }
  },
  cartesi_listWithdrawals: (p) => {
    requireApp(p)
    return paginate(
      withdrawals.filter((w) => p.account_index == null || eq(w.account_index, p.account_index)),
      p,
    )
  },
  cartesi_getWithdrawal: (p) => {
    requireApp(p)
    const withdrawal = withdrawals.find((w) => eq(w.account_index, p.account_index))
    if (!withdrawal) throw { code: -32001, message: 'withdrawal not found' }
    return { data: withdrawal }
  },
  cartesi_listTournaments: (p) => {
    const app = requireApp(p)
    const rows = app.consensus_type === 'PRT' ? tournaments : []
    return paginate(
      rows.filter(
        (t) =>
          (p.epoch_index == null || eq(t.epoch_index, p.epoch_index)) &&
          (p.level == null || eq(t.level, p.level)) &&
          (p.parent_tournament_address == null ||
            eq(t.parent_tournament_address, p.parent_tournament_address)) &&
          (p.parent_match_id_hash == null || eq(t.parent_match_id_hash, p.parent_match_id_hash)),
      ),
      p,
    )
  },
  cartesi_getTournament: (p) => {
    requireApp(p)
    const tournament = tournaments.find((t) => eq(t.address, p.address))
    if (!tournament) throw { code: -32001, message: 'tournament not found' }
    return { data: tournament }
  },
  cartesi_listCommitments: (p) => {
    requireApp(p)
    return paginate(
      commitments.filter(
        (c) =>
          (p.epoch_index == null || eq(c.epoch_index, p.epoch_index)) &&
          (p.tournament_address == null || eq(c.tournament_address, p.tournament_address)),
      ),
      p,
    )
  },
  cartesi_getCommitment: (p) => {
    requireApp(p)
    const commitment = commitments.find(
      (c) => eq(c.commitment, p.commitment) && eq(c.tournament_address, p.tournament_address),
    )
    if (!commitment) throw { code: -32001, message: 'commitment not found' }
    return { data: commitment }
  },
  cartesi_listMatches: (p) => {
    requireApp(p)
    return paginate(
      matches.filter(
        (m) =>
          (p.epoch_index == null || eq(m.epoch_index, p.epoch_index)) &&
          (p.tournament_address == null || eq(m.tournament_address, p.tournament_address)),
      ),
      p,
    )
  },
  cartesi_getMatch: (p) => {
    requireApp(p)
    const match = matches.find(
      (m) =>
        eq(m.id_hash, p.id_hash) &&
        eq(m.tournament_address, p.tournament_address) &&
        eq(m.epoch_index, p.epoch_index),
    )
    if (!match) throw { code: -32001, message: 'match not found' }
    return { data: match }
  },
  cartesi_listMatchAdvances: (p) => {
    requireApp(p)
    return paginate(matchAdvances.filter((a) => eq(a.id_hash, p.id_hash)), p)
  },
  cartesi_getMatchAdvance: (p) => {
    requireApp(p)
    const advance = matchAdvances.find(
      (a) => eq(a.id_hash, p.id_hash) && eq(a.tx_hash, p.tx_hash) && eq(a.log_index, p.log_index),
    )
    if (!advance) throw { code: -32001, message: 'match advance not found' }
    return { data: advance }
  },
  cartesi_listBondEvents: (p) => {
    const app = requireApp(p)
    const rows = app.consensus_type === 'PRT' ? bondEvents : []
    return paginate(
      rows.filter(
        (b) =>
          (p.epoch_index == null || eq(b.epoch_index, p.epoch_index)) &&
          (p.tournament_address == null || eq(b.tournament_address, p.tournament_address)),
      ),
      p,
    )
  },
  cartesi_getBondEvent: (p) => {
    requireApp(p)
    const event = bondEvents.find((b) => eq(b.tx_hash, p.tx_hash) && eq(b.log_index, p.log_index))
    if (!event) throw { code: -32001, message: 'bond event not found' }
    return { data: event }
  },
  cartesi_getNodeInfo: () => ({
    data: { chain_id: hex(31337), version: '2.0.0-mock', default_block: 'FINALIZED' },
  }),
  // deprecated by the node in favor of cartesi_getNodeInfo
  cartesi_getChainId: () => ({ data: hex(31337) }),
  cartesi_getNodeVersion: () => ({ data: '2.0.0-mock' }),
}

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
}

// Payload decoders are no longer served here — they load straight from their
// GitHub source via esm.sh's /gh/ route (see the repo README).
Bun.serve({
  port: 10011,
  async fetch(req) {
    const url = new URL(req.url)
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
    if (url.pathname !== '/rpc' || req.method !== 'POST') {
      return new Response('not found', { status: 404, headers: CORS_HEADERS })
    }
    const body = (await req.json()) as { id: number; method: string; params?: Params }
    const respond = (payload: object) =>
      Response.json(
        { jsonrpc: '2.0', id: body.id, ...payload },
        { headers: CORS_HEADERS },
      )
    const handler = methods[body.method]
    if (!handler) {
      return respond({ error: { code: -32601, message: `method '${body.method}' not found` } })
    }
    try {
      return respond({ result: handler(body.params ?? {}) })
    } catch (err: any) {
      return respond({
        error: { code: err.code ?? -32603, message: err.message ?? 'internal error' },
      })
    }
  },
})

console.log('Mock Cartesi node JSON-RPC server listening on http://localhost:10011/rpc')
