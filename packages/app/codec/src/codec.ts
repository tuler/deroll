import type {
    AbiParameter,
    AbiParameterToPrimitiveType,
    ExtractAbiFunction,
    ExtractAbiFunctionNames,
} from "abitype";
import { Abi, AbiFunction } from "ox";

/** 0x-prefixed hex string. Compatible with viem's `Hex` and `Address`. */
export type Hex = `0x${string}`;

/**
 * The rollup wire formats, one ABI entry per libcmt codec.h entry. The
 * selectors ox derives from these signatures match libcmt's hardcoded funsels
 * (codec.h stores them as little-endian uint32, so e.g. Notice's 0x53742add
 * there is wire bytes dd 2a 74 53 = ox's 0xdd2a7453).
 */
export const abi = Abi.from([
    "function EvmAdvance(uint64 chainId, address appContract, address msgSender, uint64 blockNumber, uint64 blockTimestamp, uint256 prevRandao, uint64 index, bytes payload)", // 0x233a0ebf
    "function Notice(bytes32 appContext, bytes payload)", // 0xdd2a7453
    "function CallVoucher(bytes32 appContext, address destination, uint256 value, bytes payload)", // 0x6062d5e2
    "function Erc20Transfer(bytes32 appContext, address recipient, address token, uint256 value)", // 0xcd5bd08c
    "function Erc721Transfer(bytes32 appContext, address recipient, address token, uint256 tokenId)", // 0xc48121fd
    "function Erc1155Transfer(bytes32 appContext, address recipient, address token, uint256 tokenId, uint256 value)", // 0xba112f83
    "function Erc1155BatchTransfer(bytes32 appContext, address recipient, address token, (uint256, uint256)[] items)", // 0x2d5a3c2e
]);

// Named-object type derived from a list of named ABI parameters.
type NamedArgs<T extends readonly AbiParameter[]> = {
    [P in T[number] as P extends { name: infer N extends string }
        ? N
        : never]: AbiParameterToPrimitiveType<P>;
};

// Argument object of one of the ABI's functions, derived from its inputs.
type Args<N extends ExtractAbiFunctionNames<typeof abi>> = NamedArgs<
    ExtractAbiFunction<typeof abi, N>["inputs"]
>;

/** The zero `bytes32`, the default output `appContext`. Same value as viem's `zeroHash`. */
export const zeroHash: Hex = `0x${"00".repeat(32)}`;

// Encoder arguments take appContext as optional; it defaults to zeroHash.
type OptionalAppContext<T extends { appContext: Hex }> = Omit<
    T,
    "appContext"
> & { appContext?: T["appContext"] };

/**
 * An `EvmAdvance` input: the fields of {@link decodeAdvance}'s result and
 * {@link encodeAdvance}'s argument. Numeric fields are `bigint`; addresses and
 * the payload are 0x-hex strings.
 */
export type Advance = Args<"EvmAdvance">;

/** Arguments for {@link encodeNotice}. */
export type Notice = OptionalAppContext<Args<"Notice">>;

/** Arguments for {@link encodeCallVoucher}. */
export type CallVoucher = OptionalAppContext<Args<"CallVoucher">>;

/** Arguments for {@link encodeErc20Transfer}. */
export type Erc20Transfer = OptionalAppContext<Args<"Erc20Transfer">>;

/** Arguments for {@link encodeErc721Transfer}. */
export type Erc721Transfer = OptionalAppContext<Args<"Erc721Transfer">>;

/** Arguments for {@link encodeErc1155Transfer}. */
export type Erc1155Transfer = OptionalAppContext<Args<"Erc1155Transfer">>;

/** Arguments for {@link encodeErc1155BatchTransfer}. */
export type Erc1155BatchTransfer = OptionalAppContext<
    Args<"Erc1155BatchTransfer">
>;

const evmAdvance = AbiFunction.fromAbi(abi, "EvmAdvance");
const notice = AbiFunction.fromAbi(abi, "Notice");
const callVoucher = AbiFunction.fromAbi(abi, "CallVoucher");
const erc20Transfer = AbiFunction.fromAbi(abi, "Erc20Transfer");
const erc721Transfer = AbiFunction.fromAbi(abi, "Erc721Transfer");
const erc1155Transfer = AbiFunction.fromAbi(abi, "Erc1155Transfer");
const erc1155BatchTransfer = AbiFunction.fromAbi(abi, "Erc1155BatchTransfer");

const evmAdvanceSelector = AbiFunction.getSelector(evmAdvance);

/**
 * Decode an `EvmAdvance` input (the raw payload of an advance request) into its
 * structured fields. Mirrors libcmt's `cmt_evm_advance_decode`.
 *
 * The result carries `chainId`, the `appContract` address, the input's
 * `msgSender`, `blockNumber` and `blockTimestamp` (UNIX epoch seconds),
 * `prevRandao` (the previous block's RANDAO mix), the input `index` among all
 * inputs ever sent to the application, and the application `payload`.
 */
export const decodeAdvance = (input: Hex): Advance => {
    if (!input.startsWith(evmAdvanceSelector)) {
        throw new TypeError("input is not an EvmAdvance (wrong selector)");
    }
    const [
        chainId,
        appContract,
        msgSender,
        blockNumber,
        blockTimestamp,
        prevRandao,
        index,
        payload,
    ] = AbiFunction.decodeData(evmAdvance, input);
    return {
        chainId,
        appContract,
        msgSender,
        blockNumber,
        blockTimestamp,
        prevRandao,
        index,
        payload,
    };
};

/**
 * Encode an `EvmAdvance` input from its structured fields, the inverse of
 * {@link decodeAdvance}. Mirrors libcmt's `cmt_evm_advance_encode`; useful for
 * crafting mock inputs (`CMT_INPUTS`) when testing on the host.
 */
export const encodeAdvance = (advance: Advance): Hex =>
    AbiFunction.encodeData(evmAdvance, [
        advance.chainId,
        advance.appContract,
        advance.msgSender,
        advance.blockNumber,
        advance.blockTimestamp,
        advance.prevRandao,
        advance.index,
        advance.payload,
    ]);

/**
 * Encode a `Notice(bytes32,bytes)` output attesting `payload`, optionally tagged
 * with an application-defined `appContext` (a free-form `bytes32` recipients
 * can filter outputs by; default zero). Mirrors libcmt's `cmt_notice_encode`.
 */
export const encodeNotice = (args: Notice): Hex =>
    AbiFunction.encodeData(notice, [args.appContext ?? zeroHash, args.payload]);

/**
 * Encode a `CallVoucher(bytes32,address,uint256,bytes)` output: an on-chain CALL to
 * `destination` (an EOA for transfers, a contract for calls) sending `value`
 * wei and executing `payload` calldata (`0x` for a plain transfer), optionally tagged
 * with an application-defined `appContext` (`bytes32`, default zero). Mirrors
 * libcmt's `cmt_call_voucher_encode`.
 */
export const encodeCallVoucher = (voucher: CallVoucher): Hex =>
    AbiFunction.encodeData(callVoucher, [
        voucher.appContext ?? zeroHash,
        voucher.destination,
        voucher.value,
        voucher.payload,
    ]);

/**
 * Encode an `Erc20Transfer(bytes32,address,address,uint256)` output: transfer
 * `value` of `token` to `recipient`, optionally tagged with an application-defined
 * `appContext` (`bytes32`, default zero). Mirrors libcmt's `cmt_erc20_transfer_encode`.
 */
export const encodeErc20Transfer = (transfer: Erc20Transfer): Hex =>
    AbiFunction.encodeData(erc20Transfer, [
        transfer.appContext ?? zeroHash,
        transfer.recipient,
        transfer.token,
        transfer.value,
    ]);

/**
 * Encode an `Erc721Transfer(bytes32,address,address,uint256)` output:
 * transfer `tokenId` of `token` to `recipient`, optionally tagged with
 * `appContext`. Mirrors libcmt's `cmt_erc721_transfer_encode`.
 */
export const encodeErc721Transfer = (transfer: Erc721Transfer): Hex =>
    AbiFunction.encodeData(erc721Transfer, [
        transfer.appContext ?? zeroHash,
        transfer.recipient,
        transfer.token,
        transfer.tokenId,
    ]);

/**
 * Encode an `Erc1155Transfer(bytes32,address,address,uint256,uint256)`
 * output: transfer `value` of `tokenId` of `token` to `recipient`, optionally
 * tagged with `appContext`. Mirrors libcmt's `cmt_erc1155_transfer_encode`.
 */
export const encodeErc1155Transfer = (transfer: Erc1155Transfer): Hex =>
    AbiFunction.encodeData(erc1155Transfer, [
        transfer.appContext ?? zeroHash,
        transfer.recipient,
        transfer.token,
        transfer.tokenId,
        transfer.value,
    ]);

/**
 * Encode an `Erc1155BatchTransfer(bytes32,address,address,(uint256,uint256)[])`
 * output: transfer several `[tokenId, value]` pairs (`items`) of `token` to
 * `recipient`, optionally tagged with `appContext`. Mirrors libcmt's
 * `cmt_erc1155_batch_transfer_encode`.
 */
export const encodeErc1155BatchTransfer = (
    transfer: Erc1155BatchTransfer,
): Hex =>
    AbiFunction.encodeData(erc1155BatchTransfer, [
        transfer.appContext ?? zeroHash,
        transfer.recipient,
        transfer.token,
        transfer.items,
    ]);
