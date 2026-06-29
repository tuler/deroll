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

export const ADDRESS_LENGTH: 20;
export const U256_LENGTH: 32;

export interface AdvanceRequest {
    type: 'advance';
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

export interface InspectRequest {
    type: 'inspect';
    /** Inspect query payload. */
    payload: Buffer;
}

export type RollupRequest = AdvanceRequest | InspectRequest;

export interface GioResponse {
    responseCode: number;
    responseData: Buffer;
}

/** Arguments for {@link Rollup.emitVoucher}. Encoded on-chain as `Voucher(address,uint256,bytes)`. */
export interface Voucher {
    /** Address the voucher executes against (20 bytes): an EOA for transfers, a contract for calls. */
    destination: AddressLike;
    /** Amount of wei sent with the execution. Default: `0n`. */
    value?: U256Like;
    /** EVM calldata to execute at `destination`. Default: empty (plain transfer). */
    payload?: BytesLike;
}

/** Arguments for {@link Rollup.emitDelegateCallVoucher}. Encoded on-chain as `DelegateCallVoucher(address,bytes)`. */
export interface DelegateCallVoucher {
    /** Contract whose code runs in the application contract's storage context (20 bytes). */
    destination: AddressLike;
    /** Calldata for the delegate call. Default: empty. There is no `value` — `DELEGATECALL` cannot transfer ether. */
    payload?: BytesLike;
}

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
     * Accept or reject the previous request and wait for the next one.
     * Synchronous on purpose: the call yields the machine, pausing the whole
     * guest, so nothing else could run concurrently anyway.
     */
    finish(options?: { accept?: boolean }): RollupRequest;

    /** Emit a voucher (Voucher(address,uint256,bytes)). Returns the output index. */
    emitVoucher(voucher: Voucher): number;

    /** Emit a delegate call voucher (DelegateCallVoucher(address,bytes)). Returns the output index. */
    emitDelegateCallVoucher(voucher: DelegateCallVoucher): number;

    /** Emit a notice (Notice(bytes)). Returns the output index. */
    emitNotice(payload: BytesLike): number;

    /** Emit a report (raw bytes, not part of the outputs merkle tree). */
    emitReport(payload: BytesLike): void;

    /** Emit an exception, signaling that the request could not be processed. */
    emitException(payload: BytesLike): void;

    /** Report progress of the current request (raw uint32 value). */
    progress(value: number): void;

    /** Perform a generic IO request to the given domain. */
    gio(request: { domain: number; id: BytesLike }): GioResponse;

    /** Load the outputs merkle tree state from a file. */
    loadMerkle(file: string): void;

    /** Store the outputs merkle tree state to a file. */
    saveMerkle(file: string): void;

    /** Reset the outputs merkle tree to pristine state. */
    resetMerkle(): void;

    /** Release the underlying device. Further calls throw. */
    close(): void;

    /**
     * Convenience request loop. Handlers receive (request, rollup), may be
     * async, and accept the request unless they return false (exceptions
     * reject and are reported). Runs until finish fails, rejecting with that
     * error.
     */
    run(handlers?: RunHandlers): Promise<never>;
}
