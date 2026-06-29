// @tuler/luke-decoder — the typed toolkit for writing Cartesi Node Explorer
// payload decoders in TypeScript.
//
//   import type { Decoder } from '@tuler/luke-decoder'
//   import { decodePortalInput, ByteReader, formatUnits } from '@tuler/luke-decoder'
//
//   export const version = 1
//   export const name = 'My decoder'
//   export const decode: Decoder['decode'] = (payload, context) => {
//     const deposit = decodePortalInput(payload, context) // standard, shared
//     if (deposit) return deposit
//     // …decode this application's own messages…
//   }
//
// See README.md for the authoring and build/host workflow.

export type {
  Decoder,
  DecodeContext,
  InputContext,
  OutputContext,
  ReportContext,
  DecodeResult,
  DecodeResultLike,
  PayloadKind,
  Input,
  Output,
  Report,
  EvmAdvance,
  DecodedOutput,
  HexUint,
  Address,
  Hash,
  ByteArray,
  FunctionSelector,
} from './types'

export { ByteReader, toBytes, isHex, toUtf8, formatUnits, shortHex } from './bytes'

export {
  PORTAL_ADDRESSES,
  decodePortalInput,
  decodePortalDeposit,
  summarizePortalDeposit,
} from './portals'
export type {
  PortalKind,
  PortalDeposit,
  EtherDeposit,
  ERC20Deposit,
  ERC721Deposit,
  ERC1155SingleDeposit,
  ERC1155BatchDeposit,
} from './portals'
