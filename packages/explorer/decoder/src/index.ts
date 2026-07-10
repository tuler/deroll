// @deroll/decoder — the typed toolkit for writing Cartesi Node Explorer
// payload decoders in TypeScript.
//
//   import type { Decoder } from '@deroll/decoder'
//   import { decodePortalInput, ByteReader, formatUnits } from '@deroll/decoder'
//
//   export const version = 2
//   export const name = 'My decoder'
//   export const input: Decoder['input'] = (input, context) => {
//     const deposit = decodePortalInput(input) // standard, shared
//     if (deposit) return deposit
//     // …decode this application's own messages…
//   }
//   export const report: Decoder['report'] = (report) => { … }
//
// A decoder exports one method per payload source it understands (input,
// output, report, withdrawalAccount, withdrawalOutput) — all optional. The
// API record types (Input, Output, Report, Withdrawal, …) are re-exported
// from @cartesi/rpc, the typed client for the node's JSON-RPC API — that
// package is the source of truth for everything the node serves.
//
// See README.md for the authoring and build/host workflow.

export type {
    // Decoder contract
    Decoder,
    DecodeMethod,
    DecodeContext,
    DecodeResult,
    DecodeResultLike,
    PayloadKind,
    Tag,
    TagColor,
    // Version 1 (legacy) contract
    AnyDecoder,
    LegacyDecoder,
    LegacyDecodeContext,
    // API records (from @cartesi/rpc)
    Input,
    Output,
    Report,
    Withdrawal,
    Notice,
    Voucher,
    DelegateCallVoucher,
    Address,
    Hash,
    Hex,
    HexNumber,
    // Deprecated aliases of the pre-@cartesi/rpc names
    EvmAdvance,
    DecodedOutput,
    HexUint,
    ByteArray,
    FunctionSelector,
} from "./types";

export {
    ByteReader,
    toBytes,
    isHex,
    toUtf8,
    formatUnits,
    shortHex,
} from "./bytes";

export {
    PORTAL_ADDRESSES_V2,
    PORTAL_ADDRESSES_V3,
    decodePortalInput,
    decodePortalDeposit,
    portalDepositTags,
    summarizePortalDeposit,
} from "./portals";
export type {
    PortalKind,
    PortalDeposit,
    EtherDeposit,
    ERC20Deposit,
    ERC721Deposit,
    ERC1155SingleDeposit,
    ERC1155BatchDeposit,
} from "./portals";
