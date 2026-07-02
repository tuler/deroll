// Copyright Cartesi and individual authors (see AUTHORS)
// SPDX-License-Identifier: Apache-2.0
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

/// <reference types="node" />

/** 0x-prefixed hex string. Compatible with viem's `Hex` and `Address`. */
export type Hex = `0x${string}`;

/** Bytes input: 0x-prefixed hex string, Buffer or Uint8Array. */
export type BytesLike = Hex | Uint8Array;

/** EVM address: 0x-prefixed hex string (20 bytes), Buffer or Uint8Array. */
export type AddressLike = Hex | Uint8Array;

/** Unsigned 256-bit value: bigint, number, or 32 bytes (hex string/Uint8Array). */
export type U256Like = bigint | number | Hex | Uint8Array;

/** Unsigned 64-bit value: bigint or number. */
export type U64Like = bigint | number;

export const ADDRESS_LENGTH: 20;
export const U256_LENGTH: 32;

export interface AdvanceRequest {
    type: 'advance';
    /** Raw, undecoded EvmAdvance input. Parse it with {@link decodeAdvance}. */
    payload: Buffer;
}

export interface InspectRequest {
    type: 'inspect';
    /** Raw inspect query payload. */
    payload: Buffer;
}

export type RollupRequest = AdvanceRequest | InspectRequest;

/** Decoded `EvmAdvance` input, as produced by {@link decodeAdvance}. */
export interface Advance {
    /** Network chain id. */
    chainId: bigint;
    /** Application contract address (0x-prefixed hex). */
    appContract: Hex;
    /** Input sender address (0x-prefixed hex). */
    msgSender: Hex;
    /** Block number of this input. */
    blockNumber: bigint;
    /** Block timestamp of this input (UNIX epoch seconds). */
    blockTimestamp: bigint;
    /** RANDAO mix of the post beacon state of the previous block. */
    prevRandao: bigint;
    /** Input index relative to all inputs ever sent to the application. */
    index: bigint;
    /** Input payload. */
    payload: Buffer;
}

/** Arguments for {@link encodeAdvance}, the inverse of {@link decodeAdvance}. */
export interface AdvanceArgs {
    /** Network chain id. */
    chainId: U64Like;
    /** Application contract address (20 bytes). */
    appContract: AddressLike;
    /** Input sender address (20 bytes). */
    msgSender: AddressLike;
    /** Block number of this input. */
    blockNumber: U64Like;
    /** Block timestamp of this input (UNIX epoch seconds). */
    blockTimestamp: U64Like;
    /** RANDAO mix of the post beacon state of the previous block. */
    prevRandao: U256Like;
    /** Input index relative to all inputs ever sent to the application. */
    index: U64Like;
    /** Input payload. */
    payload: BytesLike;
}

/** Arguments for {@link encodeCallVoucher}. Executed on-chain as a CALL. */
export interface CallVoucher {
    /** Address the voucher executes against (20 bytes): an EOA for transfers, a contract for calls. */
    destination: AddressLike;
    /** Amount of wei sent with the execution. Default: `0n`. */
    value?: U256Like;
    /** EVM calldata to execute at `destination`. Default: empty (plain transfer). */
    payload?: BytesLike;
}

/** Arguments for {@link encodeERC20Transfer}. */
export interface ERC20Transfer {
    /** Address receiving the tokens (20 bytes). */
    recipient: AddressLike;
    /** ERC-20 token contract address (20 bytes). */
    token: AddressLike;
    /** Amount of tokens to transfer. */
    value: U256Like;
}

/** Arguments for {@link encodeERC721Transfer}. */
export interface ERC721Transfer {
    /** Address receiving the token (20 bytes). */
    recipient: AddressLike;
    /** ERC-721 token contract address (20 bytes). */
    token: AddressLike;
    /** Token id to transfer. */
    tokenId: U256Like;
    /** Extra data forwarded to the recipient. Default: empty. */
    data?: BytesLike;
}

/** Arguments for {@link encodeERC1155SingleTransfer}. */
export interface ERC1155SingleTransfer {
    /** Address receiving the tokens (20 bytes). */
    recipient: AddressLike;
    /** ERC-1155 token contract address (20 bytes). */
    token: AddressLike;
    /** Token id to transfer. */
    tokenId: U256Like;
    /** Amount of tokens to transfer. */
    value: U256Like;
    /** Extra data forwarded to the recipient. Default: empty. */
    data?: BytesLike;
}

/** Arguments for {@link encodeERC1155BatchTransfer}. */
export interface ERC1155BatchTransfer {
    /** Address receiving the tokens (20 bytes). */
    recipient: AddressLike;
    /** ERC-1155 token contract address (20 bytes). */
    token: AddressLike;
    /** `[tokenId, value]` pairs to transfer. */
    tokenIdsAndValues: readonly (readonly [U256Like, U256Like])[];
    /** Extra data forwarded to the recipient. Default: empty. */
    data?: BytesLike;
}

/**
 * Decode an `EvmAdvance` input (the raw payload of an advance request) into its
 * structured fields. Mirrors libcmt's `cmt_evmadvance_decode`.
 */
export function decodeAdvance(input: BytesLike): Advance;

/**
 * Encode an `EvmAdvance` input from its structured fields, the inverse of
 * {@link decodeAdvance}. Mirrors libcmt's `cmt_evmadvance_encode`; useful for
 * crafting mock inputs (`CMT_INPUTS`) when testing on the host.
 */
export function encodeAdvance(advance: AdvanceArgs): Buffer;

/** Encode a `Notice(bytes)` output. Mirrors libcmt's `cmt_notice_encode`. */
export function encodeNotice(payload: BytesLike): Buffer;

/** Encode a `CallVoucher(address,uint256,bytes)` output. Mirrors libcmt's `cmt_callvoucher_encode`. */
export function encodeCallVoucher(voucher: CallVoucher): Buffer;

/** Encode an `ERC20Transfer(address,address,uint256)` output. Mirrors libcmt's `cmt_erc20transfer_encode`. */
export function encodeERC20Transfer(transfer: ERC20Transfer): Buffer;

/** Encode an `ERC721Transfer(address,address,uint256,bytes)` output. Mirrors libcmt's `cmt_erc721transfer_encode`. */
export function encodeERC721Transfer(transfer: ERC721Transfer): Buffer;

/** Encode an `ERC1155SingleTransfer(address,address,uint256,uint256,bytes)` output. Mirrors libcmt's `cmt_erc1155singletransfer_encode`. */
export function encodeERC1155SingleTransfer(transfer: ERC1155SingleTransfer): Buffer;

/** Encode an `ERC1155BatchTransfer(address,address,uint256[2][],bytes)` output. Mirrors libcmt's `cmt_erc1155batchtransfer_encode`. */
export function encodeERC1155BatchTransfer(transfer: ERC1155BatchTransfer): Buffer;

/**
 * Error thrown when a libcmt binding call fails (e.g. a too-large output, or
 * constructing a second {@link Rollup} while one is open).
 *
 * Argument validation failures throw plain `TypeError`/`RangeError` instead,
 * before anything reaches the device.
 */
export class RollupError extends Error {
    readonly name: 'RollupError';
    /** Negative errno reported by libcmt (e.g. `-16` for `EBUSY`). */
    readonly errno: number;
    /** Name of the libcmt call that failed (e.g. `cmt_rollup_init`). */
    readonly syscall: string;
}

export interface RunHandlers {
    advance?: (request: AdvanceRequest, rollup: Rollup) => boolean | void | Promise<boolean | void>;
    inspect?: (request: InspectRequest, rollup: Rollup) => boolean | void | Promise<boolean | void>;
}

export class Rollup {
    /**
     * Opens the rollup device and initializes the outputs merkle tree.
     *
     * On riscv64 this talks to the real Cartesi Machine IO driver; on other
     * architectures it uses the libcmt mock, driven by the CMT_INPUTS and
     * CMT_DEBUG environment variables.
     */
    constructor();

    /**
     * Accept or reject the previous request and wait for the next one. Returns
     * the next request with its raw, undecoded payload; use {@link decodeAdvance}
     * to parse an advance input. Synchronous on purpose: the call yields the
     * machine, pausing the whole guest, so nothing else could run concurrently.
     */
    waitForInput(options?: { accept?: boolean }): RollupRequest;

    /** Emit a raw output (already EVM-ABI encoded). Returns the output index. */
    emitOutput(payload: BytesLike): number;

    /** Emit a report (raw bytes, not part of the outputs merkle tree). */
    emitReport(payload: BytesLike): void;

    /** Emit an exception, signaling that the request could not be processed. */
    emitException(payload: BytesLike): void;

    /** Report progress of the current request (raw uint32 value). */
    progress(value: number): void;

    /** Release the underlying device. Further calls throw. */
    close(): void;

    /**
     * Convenience request loop. Handlers receive (request, rollup) with the raw
     * request payload, may be async, and accept the request unless they return
     * false (exceptions reject and are reported). Runs until waitForInput fails,
     * rejecting with that error.
     */
    run(handlers?: RunHandlers): Promise<never>;
}
