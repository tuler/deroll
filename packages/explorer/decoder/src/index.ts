// @deroll/decoder — the typed toolkit for writing Cartesi Node Explorer
// payload decoders in TypeScript.
//
//   import type { InputDecoder, DepositDecoder } from '@deroll/decoder'
//   import { ByteReader, formatUnits } from '@deroll/decoder'
//
//   export const version = 1
//   export const name = 'My decoder'
//   export const input: InputDecoder = (input, context) => {
//     // …decode this application's own messages…
//     // (portal deposits never reach here — the explorer decodes those itself)
//   }
//   export const deposit: DepositDecoder = (deposit, context) => {
//     // …decode deposit.execLayerData, the app-specific attachment…
//   }
//
// A decoder exports one method per payload source it understands (input,
// deposit, output, report, withdrawalAccount, withdrawalOutput) — all
// optional. The API record types (Input, Output, Report, Withdrawal, …) are
// re-exported from @cartesi/rpc, the typed client for the node's JSON-RPC
// API — that package is the source of truth for everything the node serves.
//
// See README.md for the authoring and build/host workflow.

export type {
    // Decoder contract
    Decoder,
    InputDecoder,
    DepositDecoder,
    OutputDecoder,
    ReportDecoder,
    WithdrawalAccountDecoder,
    WithdrawalOutputDecoder,
    DecodeContext,
    DecodeResult,
    DecodeResultLike,
    Tag,
    TagColor,
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
    PORTAL_ADDRESSES,
    decodePortalInput,
    decodePortalDeposit,
    hasDepositAppData,
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
