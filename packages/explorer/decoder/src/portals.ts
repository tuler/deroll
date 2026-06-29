// Standard Cartesi portal deposit decoding — shared across all applications.
//
// Asset deposits are not application-specific: every Cartesi app receives the
// same portal message, defined by the canonical InputEncoding library in
// cartesi/rollups-contracts (src/common/InputEncoding.sol). A decoder should
// recognize a deposit by its *sender* (a known portal contract) and decode it
// with this module rather than reimplementing the layout per app.

import { ByteReader, formatUnits, isHex, shortHex } from './bytes'
import type { DecodeContext, DecodeResult } from './types'

/** The Cartesi portal contracts that produce deposit inputs. */
export type PortalKind =
  | 'EtherPortal'
  | 'ERC20Portal'
  | 'ERC721Portal'
  | 'ERC1155SinglePortal'
  | 'ERC1155BatchPortal'

/**
 * Deterministic Cartesi Rollups v2 portal addresses (lowercase), as published
 * by @cartesi/viem and the rollups-node address book. Identical across chains
 * for a given Rollups version. Map an input's lowercase sender through this to
 * decide whether it is a deposit.
 */
export const PORTAL_ADDRESSES: Readonly<Record<string, PortalKind>> = {
  '0xa632c5c05812c6a6149b7af5c56117d1d2603828': 'EtherPortal',
  '0xaca6586a0cf05bd831f2501e7b4aea550da6562d': 'ERC20Portal',
  '0x9e8851dadb2b77103928518846c4678d48b5e371': 'ERC721Portal',
  '0x18558398dd1a8ce20956287a4da7b76ae7a96662': 'ERC1155SinglePortal',
  '0xe246abb974b307490d9c6932f48ebe79de72338a': 'ERC1155BatchPortal',
}

const ETHER_DECIMALS = 18 // wei → ETH is a protocol constant, safe to format

/** Common fields decoded from a portal deposit. `portal` identifies the source. */
interface PortalDepositBase {
  portal: PortalKind
  /** The depositing account (encoded in the payload, distinct from the input sender). */
  sender: string
}

export interface EtherDeposit extends PortalDepositBase {
  portal: 'EtherPortal'
  /** Deposited amount formatted as ETH. */
  ether: string
  /** Deposited amount in wei (decimal string). */
  wei: string
  execLayerData?: string
}

export interface ERC20Deposit extends PortalDepositBase {
  portal: 'ERC20Portal'
  token: string
  /** Raw on-chain token amount (decimal string); the portal carries no token decimals. */
  amount: string
  execLayerData?: string
}

export interface ERC721Deposit extends PortalDepositBase {
  portal: 'ERC721Portal'
  token: string
  tokenId: string
  /** abi.encode(baseLayerData, execLayerData), as raw hex. */
  data?: string
}

export interface ERC1155SingleDeposit extends PortalDepositBase {
  portal: 'ERC1155SinglePortal'
  token: string
  tokenId: string
  value: string
  /** abi.encode(baseLayerData, execLayerData), as raw hex. */
  data?: string
}

export interface ERC1155BatchDeposit extends PortalDepositBase {
  portal: 'ERC1155BatchPortal'
  token: string
  /** abi.encode(tokenIds, values, baseLayerData, execLayerData), as raw hex. */
  data?: string
}

export type PortalDeposit =
  | EtherDeposit
  | ERC20Deposit
  | ERC721Deposit
  | ERC1155SingleDeposit
  | ERC1155BatchDeposit

/**
 * Decode a payload as a deposit from the given portal, following the canonical
 * InputEncoding layout. Returns the structured deposit, or null when the
 * payload is too short to be valid for that portal.
 */
export function decodePortalDeposit(payload: string, portal: PortalKind): PortalDeposit | null {
  if (!isHex(payload)) return null
  const r = new ByteReader(payload)
  const len = r.bytes.length
  switch (portal) {
    case 'EtherPortal': {
      if (len < 52) return null // sender(20) + value(32)
      const sender = r.address()
      const wei = r.u256()
      return { portal, sender, ether: formatUnits(wei, ETHER_DECIMALS), wei: wei.toString(), execLayerData: r.rest() }
    }
    case 'ERC20Portal': {
      if (len < 72) return null // token(20) + sender(20) + value(32)
      const token = r.address()
      const sender = r.address()
      return { portal, token, sender, amount: r.u256().toString(), execLayerData: r.rest() }
    }
    case 'ERC721Portal': {
      if (len < 72) return null // token(20) + sender(20) + tokenId(32)
      const token = r.address()
      const sender = r.address()
      return { portal, token, sender, tokenId: r.u256().toString(), data: r.rest() }
    }
    case 'ERC1155SinglePortal': {
      if (len < 104) return null // token(20) + sender(20) + tokenId(32) + value(32)
      const token = r.address()
      const sender = r.address()
      const tokenId = r.u256().toString()
      return { portal, token, sender, tokenId, value: r.u256().toString(), data: r.rest() }
    }
    case 'ERC1155BatchPortal': {
      if (len < 40) return null // token(20) + sender(20) + abi.encode(...)
      const token = r.address()
      const sender = r.address()
      return { portal, token, sender, data: r.rest() }
    }
  }
}

/** Build a one-line summary for a decoded deposit. */
export function summarizePortalDeposit(d: PortalDeposit): string {
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
      return `ERC-1155 batch deposit · ${shortHex(d.token)} ${from}`
  }
}

/**
 * If this input was sent by a known Cartesi portal, decode it as a deposit and
 * return a ready-to-use DecodeResult; otherwise return null so the caller can
 * try application-specific decoding. This is the standard, app-independent
 * branch every decoder can reuse:
 *
 *   const deposit = decodePortalInput(payload, context)
 *   if (deposit) return deposit
 *   // …decode application messages…
 */
export function decodePortalInput(payload: string, context: DecodeContext): DecodeResult | null {
  if (context.kind !== 'input') return null
  const sender = context.record?.decoded_data?.sender?.toLowerCase()
  const portal = sender ? PORTAL_ADDRESSES[sender] : undefined
  if (!portal) return null
  const deposit = decodePortalDeposit(payload, portal)
  if (!deposit) return null
  return { summary: summarizePortalDeposit(deposit), data: deposit }
}
