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

'use strict';

const path = require('node:path');
const { AbiFunction, AbiParameters } = require('ox');
const binding = require('node-gyp-build')(path.join(__dirname, '..'));

const ADDRESS_LENGTH = 20;
const U256_LENGTH = 32;
const EMPTY = Buffer.alloc(0);

// EVM-ABI codecs for libcmt's wire formats, expressed with ox so the low-level
// word packing/padding stays battle-tested. One AbiFunction per codec.h entry;
// the selectors ox derives from these signatures match libcmt's hardcoded
// funsels (codec.h stores them as little-endian uint32, so e.g. Notice's
// 0xe5d658c2 there is wire bytes c2 58 d6 e5 = ox's 0xc258d6e5).
const NOTICE = AbiFunction.from('function Notice(bytes payload)'); // 0xc258d6e5
const CALL_VOUCHER = AbiFunction.from('function CallVoucher(address destination, uint256 value, bytes payload)'); // 0x4691c2bc
const ERC20_TRANSFER = AbiFunction.from('function ERC20Transfer(address recipient, address token, uint256 value)'); // 0xe59fdd36
const ERC721_TRANSFER = AbiFunction.from(
    'function ERC721Transfer(address recipient, address token, uint256 tokenId, bytes data)',
); // 0x2b0e47a0
const ERC1155_SINGLE_TRANSFER = AbiFunction.from(
    'function ERC1155SingleTransfer(address recipient, address token, uint256 tokenId, uint256 value, bytes data)',
); // 0x8c76b598
const ERC1155_BATCH_TRANSFER = AbiFunction.from(
    'function ERC1155BatchTransfer(address recipient, address token, uint256[2][] tokenIdsAndValues, bytes data)',
); // 0x2c38972f
const EVM_ADVANCE = AbiFunction.from(
    'function EvmAdvance(uint64 chainId, address appContract, address msgSender, ' +
        'uint64 blockNumber, uint64 blockTimestamp, uint256 prevRandao, uint64 index, bytes payload)',
); // 0x233a0ebf
const EVM_ADVANCE_SELECTOR = EVM_ADVANCE.hash.slice(0, 10); // 0x + 4 bytes

/**
 * Error thrown when a libcmt binding call fails. Carries the negative errno
 * reported by libcmt (e.g. `-16` for `EBUSY`) in {@link RollupError.errno} and
 * the name of the libcmt call that failed in {@link RollupError.syscall}.
 *
 * Argument validation failures throw plain `TypeError`/`RangeError` instead,
 * before anything reaches the device.
 */
class RollupError extends Error {
    constructor(message, { errno, syscall, cause } = {}) {
        super(message, cause === undefined ? undefined : { cause });
        this.name = 'RollupError';
        /** Negative errno reported by libcmt (e.g. `-16` for `EBUSY`). */
        this.errno = errno;
        /** Name of the libcmt call that failed (e.g. `cmt_rollup_init`). */
        this.syscall = syscall;
    }

    /**
     * Normalize an error thrown by the native addon. libcmt failures carry a
     * numeric `errno` and the failed call name in `syscall`; those become a
     * RollupError. Anything else (validation errors, "rollup is closed") is
     * returned unchanged.
     */
    static from(error) {
        if (error instanceof RollupError) {
            return error;
        }
        if (error != null && typeof error.errno === 'number' && typeof error.syscall === 'string') {
            return new RollupError(error.message, { errno: error.errno, syscall: error.syscall, cause: error });
        }
        return error;
    }
}

// Run a libcmt binding call, normalizing its failures into RollupError.
function bindingCall(fn) {
    try {
        return fn();
    } catch (error) {
        throw RollupError.from(error);
    }
}

function toBytes(value, name) {
    if (typeof value === 'string') {
        if (!/^0x(?:[0-9a-fA-F]{2})*$/.test(value)) {
            throw new TypeError(`${name} must be a 0x-prefixed hex string, Buffer or Uint8Array`);
        }
        return Buffer.from(value.slice(2), 'hex');
    }
    if (value instanceof Uint8Array) {
        return Buffer.isBuffer(value) ? value : Buffer.from(value.buffer, value.byteOffset, value.byteLength);
    }
    throw new TypeError(`${name} must be a 0x-prefixed hex string, Buffer or Uint8Array`);
}

function toAddress(value, name) {
    const bytes = toBytes(value, name);
    if (bytes.length !== ADDRESS_LENGTH) {
        throw new TypeError(`${name} must be ${ADDRESS_LENGTH} bytes long`);
    }
    return bytes;
}

// Validate an unsigned integer of `bits` width and return it as a bigint for
// ox. 256-bit values also accept a 32-byte big-endian buffer/hex string.
function toUint(value, name, bits) {
    let v;
    if (typeof value === 'bigint' || typeof value === 'number') {
        v = BigInt(value);
    } else if (bits === 256) {
        const bytes = toBytes(value, name);
        if (bytes.length !== U256_LENGTH) {
            throw new TypeError(`${name} must be ${U256_LENGTH} bytes long`);
        }
        v = bytes.length === 0 ? 0n : BigInt(toHex(bytes));
    } else {
        throw new TypeError(`${name} must be a bigint or number`);
    }
    if (v < 0n || v >= 1n << BigInt(bits)) {
        throw new RangeError(`${name} must fit in an unsigned ${bits}-bit integer`);
    }
    return v;
}

const toU256 = (value, name) => toUint(value, name, 256);
const toU64 = (value, name) => toUint(value, name, 64);

function toHex(bytes) {
    return `0x${bytes.toString('hex')}`;
}

// Validate a 20-byte address argument and return it as 0x-hex for ox.
function toAddressHex(value, name) {
    return toHex(toAddress(value, name));
}

// Encode a call to `fn` with `args` and return the calldata as a Buffer.
function encodeData(fn, args) {
    return Buffer.from(AbiFunction.encodeData(fn, args).slice(2), 'hex');
}

/**
 * Decode an `EvmAdvance` input (the raw payload of an advance request) into its
 * structured fields. Mirrors libcmt's `cmt_evmadvance_decode`.
 */
function decodeAdvance(input) {
    const bytes = toBytes(input, 'input');
    if (bytes.length < 4) {
        throw new RangeError('input is too short to be an EvmAdvance');
    }
    if (toHex(bytes.subarray(0, 4)) !== EVM_ADVANCE_SELECTOR) {
        throw new TypeError('input is not an EvmAdvance (wrong selector)');
    }
    const [chainId, appContract, msgSender, blockNumber, blockTimestamp, prevRandao, index, payload] =
        AbiParameters.decode(EVM_ADVANCE.inputs, toHex(bytes.subarray(4)));
    return {
        chainId,
        appContract,
        msgSender,
        blockNumber,
        blockTimestamp,
        prevRandao,
        index,
        payload: Buffer.from(payload.slice(2), 'hex'),
    };
}

/**
 * Encode an `EvmAdvance` input from its structured fields, the inverse of
 * {@link decodeAdvance}. Mirrors libcmt's `cmt_evmadvance_encode`; useful for
 * crafting mock inputs (`CMT_INPUTS`) when testing on the host.
 */
function encodeAdvance({ chainId, appContract, msgSender, blockNumber, blockTimestamp, prevRandao, index, payload }) {
    return encodeData(EVM_ADVANCE, [
        toU64(chainId, 'chainId'),
        toAddressHex(appContract, 'appContract'),
        toAddressHex(msgSender, 'msgSender'),
        toU64(blockNumber, 'blockNumber'),
        toU64(blockTimestamp, 'blockTimestamp'),
        toU256(prevRandao, 'prevRandao'),
        toU64(index, 'index'),
        toHex(toBytes(payload, 'payload')),
    ]);
}

/** Encode a `Notice(bytes)` output. Mirrors libcmt's `cmt_notice_encode`. */
function encodeNotice(payload) {
    return encodeData(NOTICE, [toHex(toBytes(payload, 'payload'))]);
}

/**
 * Encode a `CallVoucher(address,uint256,bytes)` output: an on-chain CALL to
 * `destination` with `value` wei and `payload` calldata. Mirrors libcmt's
 * `cmt_callvoucher_encode`.
 */
function encodeCallVoucher({ destination, value = 0n, payload = EMPTY }) {
    return encodeData(CALL_VOUCHER, [
        toAddressHex(destination, 'destination'),
        toU256(value, 'value'),
        toHex(toBytes(payload, 'payload')),
    ]);
}

/**
 * Encode an `ERC20Transfer(address,address,uint256)` output: transfer `value`
 * of `token` to `recipient`. Mirrors libcmt's `cmt_erc20transfer_encode`.
 */
function encodeERC20Transfer({ recipient, token, value }) {
    return encodeData(ERC20_TRANSFER, [
        toAddressHex(recipient, 'recipient'),
        toAddressHex(token, 'token'),
        toU256(value, 'value'),
    ]);
}

/**
 * Encode an `ERC721Transfer(address,address,uint256,bytes)` output: transfer
 * `tokenId` of `token` to `recipient`. Mirrors libcmt's `cmt_erc721transfer_encode`.
 */
function encodeERC721Transfer({ recipient, token, tokenId, data = EMPTY }) {
    return encodeData(ERC721_TRANSFER, [
        toAddressHex(recipient, 'recipient'),
        toAddressHex(token, 'token'),
        toU256(tokenId, 'tokenId'),
        toHex(toBytes(data, 'data')),
    ]);
}

/**
 * Encode an `ERC1155SingleTransfer(address,address,uint256,uint256,bytes)`
 * output: transfer `value` of `tokenId` of `token` to `recipient`. Mirrors
 * libcmt's `cmt_erc1155singletransfer_encode`.
 */
function encodeERC1155SingleTransfer({ recipient, token, tokenId, value, data = EMPTY }) {
    return encodeData(ERC1155_SINGLE_TRANSFER, [
        toAddressHex(recipient, 'recipient'),
        toAddressHex(token, 'token'),
        toU256(tokenId, 'tokenId'),
        toU256(value, 'value'),
        toHex(toBytes(data, 'data')),
    ]);
}

/**
 * Encode an `ERC1155BatchTransfer(address,address,uint256[2][],bytes)` output:
 * transfer several `[tokenId, value]` pairs of `token` to `recipient`. Mirrors
 * libcmt's `cmt_erc1155batchtransfer_encode`.
 */
function encodeERC1155BatchTransfer({ recipient, token, tokenIdsAndValues, data = EMPTY }) {
    if (!Array.isArray(tokenIdsAndValues)) {
        throw new TypeError('tokenIdsAndValues must be an array of [tokenId, value] pairs');
    }
    const pairs = tokenIdsAndValues.map((pair, i) => {
        if (!Array.isArray(pair) || pair.length !== 2) {
            throw new TypeError(`tokenIdsAndValues[${i}] must be a [tokenId, value] pair`);
        }
        return [toU256(pair[0], `tokenIdsAndValues[${i}][0]`), toU256(pair[1], `tokenIdsAndValues[${i}][1]`)];
    });
    return encodeData(ERC1155_BATCH_TRANSFER, [
        toAddressHex(recipient, 'recipient'),
        toAddressHex(token, 'token'),
        pairs,
        toHex(toBytes(data, 'data')),
    ]);
}

class Rollup {
    #native;

    constructor() {
        this.#native = bindingCall(() => new binding.Rollup());
    }

    /**
     * Accept or reject the previous request and wait for the next one. Returns
     * the next request with its raw, undecoded payload; use {@link decodeAdvance}
     * to parse an advance input. Synchronous on purpose: the call yields the
     * machine, pausing the whole guest, so nothing else could run concurrently.
     */
    waitForInput({ accept = true } = {}) {
        return bindingCall(() => this.#native.waitForInput(accept));
    }

    /** Emit a raw output (already EVM-ABI encoded). Returns the output index. */
    emitOutput(payload) {
        return Number(bindingCall(() => this.#native.emitOutput(toBytes(payload, 'payload'))));
    }

    /** Emit a report (raw bytes, not part of the outputs merkle tree). */
    emitReport(payload) {
        bindingCall(() => this.#native.emitReport(toBytes(payload, 'payload')));
    }

    /** Emit an exception, signaling that the request could not be processed. */
    emitException(payload) {
        bindingCall(() => this.#native.emitException(toBytes(payload, 'payload')));
    }

    /** Report progress of the current request (raw uint32 value). */
    progress(value) {
        bindingCall(() => this.#native.progress(value));
    }

    /** Release the underlying device. Further calls throw. */
    close() {
        bindingCall(() => this.#native.close());
    }

    /**
     * Convenience request loop. Handlers receive (request, rollup) with the raw
     * request payload, may be async, and accept the request unless they return
     * false (exceptions reject and are reported). Runs until waitForInput fails
     * (e.g. mock inputs are exhausted, or the device is closed), which rejects
     * with that error.
     */
    async run(handlers = {}) {
        let accept = true;
        for (;;) {
            const request = this.waitForInput({ accept });
            const handler = handlers[request.type];
            try {
                accept = handler ? (await handler(request, this)) !== false : false;
            } catch (error) {
                accept = false;
                this.emitReport(Buffer.from(String(error?.stack ?? error)));
            }
        }
    }
}

module.exports = {
    Rollup,
    RollupError,
    decodeAdvance,
    encodeAdvance,
    encodeNotice,
    encodeCallVoucher,
    encodeERC20Transfer,
    encodeERC721Transfer,
    encodeERC1155SingleTransfer,
    encodeERC1155BatchTransfer,
    ADDRESS_LENGTH,
    U256_LENGTH,
};
