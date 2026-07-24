// @deroll/decoder — the typed contract for writing Cartesi Node Explorer
// payload decoders in TypeScript. This package is types-only: it defines what
// a decoder module looks like and what its methods receive and return —
// nothing else.
//
//   import type { InputDecoder, DepositDecoder } from '@deroll/decoder'
//   import { decodeAbiParameters, hexToString } from 'viem'
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
// For the byte/ABI work itself, import viem — and @cartesi/codec for the
// protocol's own on-chain formats (inputs, outputs, deposits): the explorer
// provides both to every decoder through its import map (pinned to the
// versions the explorer uses), so `import { … } from 'viem'` just works —
// nothing to bundle.
//
// A decoder exports one method per payload source it understands (input,
// deposit, output, report, withdrawalAccount, withdrawalOutput) — all
// optional. The API record types (Input, Output, Report, Withdrawal, …) are
// re-exported from @cartesi/viem, the typed toolkit for the node that the
// explorer's data layer is built on, and the deposit envelope (Deposit) from
// @cartesi/codec — each the source of truth for what it describes.
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
    // Portal deposit records (what the deposit method receives, from @cartesi/codec)
    Deposit,
    EtherDeposit,
    Erc20Deposit,
    Erc721Deposit,
    Erc1155SingleDeposit,
    Erc1155BatchDeposit,
    // API records (from @cartesi/viem)
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
} from "./types";
