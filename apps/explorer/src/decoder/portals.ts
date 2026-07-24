// Portal deposit decoding — protocol-defined data, decoded by the explorer
// itself. Every Cartesi app receives the same deposit message, defined by the
// canonical InputEncoding library in cartesi/rollups-contracts
// (src/common/InputEncoding.sol): the explorer recognizes a deposit by its
// sender (a known portal contract), decodes and renders it natively, and only
// hands a registered decoder's `deposit` method the app-specific data
// attached to it (execLayerData / baseLayerData) via the PortalDeposit types
// from @deroll/decoder.

import type { DecodeResult, Input, PortalDeposit, PortalKind, Tag } from '@deroll/decoder'
import { decodeAbiParameters, formatEther, hexToBigInt, isHex, size, slice, type Hex } from 'viem'
import { shortHex } from '../lib/format'

/**
 * Deterministic Cartesi portal addresses (lowercase), as published by
 * @cartesi/viem and the rollups-node address book. Identical across chains
 * for a given Rollups version. An input whose sender maps through this is a
 * deposit.
 */
export const PORTAL_ADDRESSES: Readonly<Record<string, PortalKind>> = {
  '0x8b53327575ac999bdfa8003f4b5134dff9027516': 'EtherPortal',
  '0x22e57511c30cce6cdaa742e13ce3b774fdc663b1': 'ERC20Portal',
  '0xca3a0a47915c12f020cf70b938acc8e744414cb8': 'ERC721Portal',
  '0x13663e193673756a02e84b724b8a3422a9a7aab4': 'ERC1155SinglePortal',
  '0x3649c5e2de91c69a7bb80d864f0039da5e511096': 'ERC1155BatchPortal',
}

const address = (payload: Hex, start: number) =>
  slice(payload, start, start + 20).toLowerCase() as Hex
const uint256 = (payload: Hex, start: number) => hexToBigInt(slice(payload, start, start + 32))
/** The payload tail from `start`, or undefined when nothing is left. */
const tail = (payload: Hex, start: number): Hex | undefined =>
  size(payload) > start ? slice(payload, start) : undefined

/** Empty bytes → undefined, so optional app-data fields disappear when absent. */
const orUndefined = (data: Hex): Hex | undefined => (data === '0x' ? undefined : data)

const BYTES_PAIR = [{ type: 'bytes' }, { type: 'bytes' }] as const
const BATCH_DATA = [
  { type: 'uint256[]' },
  { type: 'uint256[]' },
  { type: 'bytes' },
  { type: 'bytes' },
] as const

/**
 * Decode a payload as a deposit from the given portal, following the canonical
 * InputEncoding layout. Returns the structured deposit, or null when the
 * payload is too short to be valid for that portal. The abi-encoded trailing
 * blobs of the NFT portals are decoded into baseLayerData/execLayerData; when
 * a blob is malformed it is kept raw under `data` instead.
 */
export function decodePortalDeposit(payload: string, portal: PortalKind): PortalDeposit | null {
  if (!isHex(payload) || payload.length % 2 !== 0) return null
  const len = size(payload)
  switch (portal) {
    case 'EtherPortal': {
      if (len < 52) return null // sender(20) + value(32)
      const wei = uint256(payload, 20)
      return {
        portal,
        sender: address(payload, 0),
        ether: formatEther(wei),
        wei: wei.toString(),
        execLayerData: tail(payload, 52),
      }
    }
    case 'ERC20Portal': {
      if (len < 72) return null // token(20) + sender(20) + value(32)
      return {
        portal,
        token: address(payload, 0),
        sender: address(payload, 20),
        amount: uint256(payload, 40).toString(),
        execLayerData: tail(payload, 72),
      }
    }
    case 'ERC721Portal': {
      if (len < 72) return null // token(20) + sender(20) + tokenId(32) + abi.encode(base, exec)
      const common = {
        portal,
        token: address(payload, 0),
        sender: address(payload, 20),
        tokenId: uint256(payload, 40).toString(),
      }
      try {
        const [base, exec] = decodeAbiParameters(BYTES_PAIR, tail(payload, 72) ?? '0x')
        return { ...common, baseLayerData: orUndefined(base), execLayerData: orUndefined(exec) }
      } catch {
        return { ...common, data: tail(payload, 72) }
      }
    }
    case 'ERC1155SinglePortal': {
      if (len < 104) return null // token(20) + sender(20) + tokenId(32) + value(32) + abi.encode(base, exec)
      const common = {
        portal,
        token: address(payload, 0),
        sender: address(payload, 20),
        tokenId: uint256(payload, 40).toString(),
        value: uint256(payload, 72).toString(),
      }
      try {
        const [base, exec] = decodeAbiParameters(BYTES_PAIR, tail(payload, 104) ?? '0x')
        return { ...common, baseLayerData: orUndefined(base), execLayerData: orUndefined(exec) }
      } catch {
        return { ...common, data: tail(payload, 104) }
      }
    }
    case 'ERC1155BatchPortal': {
      if (len < 40) return null // token(20) + sender(20) + abi.encode(ids, values, base, exec)
      const common = {
        portal,
        token: address(payload, 0),
        sender: address(payload, 20),
      }
      try {
        const [ids, values, base, exec] = decodeAbiParameters(BATCH_DATA, tail(payload, 40) ?? '0x')
        return {
          ...common,
          tokenIds: ids.map(String),
          values: values.map(String),
          baseLayerData: orUndefined(base),
          execLayerData: orUndefined(exec),
        }
      } catch {
        return { ...common, data: tail(payload, 40) }
      }
    }
  }
}

/** True when the deposit carries app-specific bytes for the `deposit` method to decode. */
export function hasDepositAppData(d: PortalDeposit): boolean {
  switch (d.portal) {
    case 'EtherPortal':
    case 'ERC20Portal':
      return !!d.execLayerData
    default:
      return !!(d.execLayerData || d.baseLayerData || d.data)
  }
}

const ASSET_LABELS: Record<PortalKind, string> = {
  EtherPortal: 'Ether',
  ERC20Portal: 'ERC-20',
  ERC721Portal: 'ERC-721',
  ERC1155SinglePortal: 'ERC-1155',
  ERC1155BatchPortal: 'ERC-1155 batch',
}

/** Build the tags/pills for a decoded deposit: `deposit` plus the asset kind. */
function portalDepositTags(d: PortalDeposit): Tag[] {
  return [
    { label: 'deposit', color: 'green' },
    { label: ASSET_LABELS[d.portal], color: 'blue', title: d.portal },
  ]
}

/** Build a one-line summary for a decoded deposit. */
function summarizePortalDeposit(d: PortalDeposit): string {
  const from = `from ${shortHex(d.sender)}`
  switch (d.portal) {
    case 'EtherPortal':
      return `Ether deposit · ${d.ether} ETH ${from}`
    case 'ERC20Portal':
      return `ERC-20 deposit · ${d.amount} of ${shortHex(d.token)} ${from}`
    case 'ERC721Portal':
      return `ERC-721 deposit · #${d.tokenId} of ${shortHex(d.token)} ${from}`
    case 'ERC1155SinglePortal':
      return `ERC-1155 deposit · ${d.value}× #${d.tokenId} of ${shortHex(d.token)} ${from}`
    case 'ERC1155BatchPortal':
      return d.tokenIds
        ? `ERC-1155 batch deposit · ${d.tokenIds.length} ids of ${shortHex(d.token)} ${from}`
        : `ERC-1155 batch deposit · ${shortHex(d.token)} ${from}`
  }
}

/**
 * If this input was sent by a known Cartesi portal, decode it as a deposit
 * and return a ready-to-use DecodeResult (summary, tags and the structured
 * PortalDeposit as data); otherwise return null.
 */
export function decodePortalInput(input: Input): DecodeResult | null {
  const sender = input.decodedData?.sender?.toLowerCase()
  const payload = input.decodedData?.payload
  if (!sender || !payload) return null
  const portal = PORTAL_ADDRESSES[sender]
  if (!portal) return null
  const deposit = decodePortalDeposit(payload, portal)
  if (!deposit) return null
  return {
    summary: summarizePortalDeposit(deposit),
    tags: portalDepositTags(deposit),
    data: deposit,
  }
}
