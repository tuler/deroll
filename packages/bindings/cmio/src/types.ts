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

import type { Rollup } from "./rollup.js";

/** 0x-prefixed hex string. Compatible with viem's `Hex` and `Address`. */
export type Hex = `0x${string}`;

/** Bytes input: 0x-prefixed hex string, Buffer or Uint8Array. */
export type BytesLike = Hex | Uint8Array;

/** EVM address: 0x-prefixed hex string (20 bytes), Buffer or Uint8Array. */
export type AddressLike = Hex | Uint8Array;

/** Unsigned 256-bit value: bigint, number, or 32 bytes (hex string/Uint8Array). */
export type U256Like = bigint | number | Hex | Uint8Array;

export interface AdvanceRequest {
    type: "advance";
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
    type: "inspect";
    /** Inspect query payload. */
    payload: Buffer;
}

export type RollupRequest = AdvanceRequest | InspectRequest;

export interface GioRequest {
    /** Domain of the generic IO request (16 bits). */
    domain: number;
    /** Request identifier, forwarded to the domain handler. */
    id: BytesLike;
}

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

/** Options for {@link Rollup.finish}. */
export interface FinishOptions {
    /** Accept (default) or reject the previous request. */
    accept?: boolean;
}

/**
 * Handlers for {@link Rollup.run}. A handler accepts the request unless it
 * returns `false`.
 */
export interface RunHandlers {
    advance?: (
        request: AdvanceRequest,
        rollup: Rollup,
        // biome-ignore lint/suspicious/noConfusingVoidType: `void` is what makes a handler with no return statement assignable
    ) => boolean | void | Promise<boolean | void>;
    inspect?: (
        request: InspectRequest,
        rollup: Rollup,
        // biome-ignore lint/suspicious/noConfusingVoidType: `void` is what makes a handler with no return statement assignable
    ) => boolean | void | Promise<boolean | void>;
}
