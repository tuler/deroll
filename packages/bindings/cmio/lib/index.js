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
const binding = require('node-gyp-build')(path.join(__dirname, '..'));

const ADDRESS_LENGTH = 20;
const U256_LENGTH = 32;
const EMPTY = Buffer.alloc(0);

// EVM-ABI function selectors and output type tags, mirroring libcmt's codec.c.
// Output1(bytes32[1],bytes), Output2(bytes32[2],bytes)
const FUNSEL_OUTPUT1 = Buffer.from('aed682a1', 'hex');
const FUNSEL_OUTPUT2 = Buffer.from('50b41f12', 'hex');
const EVM_ADVANCE = Buffer.from('415bf363', 'hex');
// keccak-derived type tags (cartesi.output.v1.*)
const TAG_NOTICE = Buffer.from('e4f5829fb698a59fba2cf6128b6bf1e8ce1dc09d271c55b787781bd415db8eed', 'hex');
const TAG_CALL_VOUCHER = Buffer.from('d515b20044ba3bb84cfce3004f8b64ee11fb8ca22f936e4bc25a65e4b2133120', 'hex');
const TAG_DELEGATECALL_VOUCHER = Buffer.from('e166d466bf2d7d71d7f3f69e4c68f516330d8073b6ddb408c507548b64a1f3bb', 'hex');

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

function toU256(value, name) {
    if (typeof value === 'bigint' || typeof value === 'number') {
        let v = BigInt(value);
        if (v < 0n || v >= 1n << 256n) {
            throw new RangeError(`${name} must fit in an unsigned 256-bit integer`);
        }
        const bytes = Buffer.alloc(U256_LENGTH);
        for (let i = U256_LENGTH - 1; i >= 0 && v > 0n; i--) {
            bytes[i] = Number(v & 0xffn);
            v >>= 8n;
        }
        return bytes;
    }
    const bytes = toBytes(value, name);
    if (bytes.length !== U256_LENGTH) {
        throw new TypeError(`${name} must be ${U256_LENGTH} bytes long`);
    }
    return bytes;
}

function toHex(bytes) {
    return `0x${bytes.toString('hex')}`;
}

// A 32-byte big-endian word from a non-negative integer (offsets and lengths).
function word(value) {
    const v = BigInt(value);
    const bytes = Buffer.alloc(U256_LENGTH);
    let n = v;
    for (let i = U256_LENGTH - 1; i >= 0 && n > 0n; i--) {
        bytes[i] = Number(n & 0xffn);
        n >>= 8n;
    }
    return bytes;
}

// A bigint read from a 32-byte big-endian word.
function wordToBigInt(bytes) {
    return bytes.length === 0 ? 0n : BigInt(`0x${bytes.toString('hex')}`);
}

// Left-pad a 20-byte address into a 32-byte ABI word.
function addressWord(bytes) {
    return Buffer.concat([Buffer.alloc(U256_LENGTH - ADDRESS_LENGTH), bytes]);
}

// Pad a byte string to a multiple of 32 bytes (ABI tail padding).
function pad32(bytes) {
    return Buffer.concat([bytes, Buffer.alloc((U256_LENGTH - (bytes.length % U256_LENGTH)) % U256_LENGTH)]);
}

/**
 * Decode an `EvmAdvance` input (the raw payload of an advance request) into its
 * structured fields. Mirrors libcmt's `cmt_decode_advance_state`.
 */
function decodeAdvance(input) {
    const bytes = toBytes(input, 'input');
    if (bytes.length < 4 + 8 * U256_LENGTH) {
        throw new RangeError('input is too short to be an EvmAdvance');
    }
    if (!bytes.subarray(0, 4).equals(EVM_ADVANCE)) {
        throw new TypeError('input is not an EvmAdvance (wrong selector)');
    }
    const wordAt = (i) => bytes.subarray(4 + i * U256_LENGTH, 4 + (i + 1) * U256_LENGTH);
    const offset = Number(wordToBigInt(wordAt(7)));
    const lengthPos = 4 + offset;
    const length = Number(wordToBigInt(bytes.subarray(lengthPos, lengthPos + U256_LENGTH)));
    const payloadPos = lengthPos + U256_LENGTH;
    return {
        chainId: wordToBigInt(wordAt(0)),
        appContract: toHex(wordAt(1).subarray(U256_LENGTH - ADDRESS_LENGTH)),
        msgSender: toHex(wordAt(2).subarray(U256_LENGTH - ADDRESS_LENGTH)),
        blockNumber: wordToBigInt(wordAt(3)),
        blockTimestamp: wordToBigInt(wordAt(4)),
        prevRandao: wordToBigInt(wordAt(5)),
        index: wordToBigInt(wordAt(6)),
        payload: Buffer.from(bytes.subarray(payloadPos, payloadPos + length)),
    };
}

/**
 * Encode a notice into an `Output1(bytes32[1],bytes)` envelope.
 * Mirrors libcmt's `cmt_encode_notice`.
 */
function encodeNotice(payload) {
    const data = toBytes(payload, 'payload');
    return Buffer.concat([
        FUNSEL_OUTPUT1,
        TAG_NOTICE,
        word(2 * U256_LENGTH), // offset to the dynamic tail (frame-relative)
        word(data.length),
        pad32(data),
    ]);
}

/**
 * Encode a CALL voucher into an `Output2(bytes32[2],bytes)` envelope, whose
 * dynamic content is `abi.encode(uint256 value, bytes payload)`.
 * Mirrors libcmt's `cmt_encode_call_voucher`.
 */
function encodeVoucher({ destination, value = 0n, payload = EMPTY }) {
    const dest = toAddress(destination, 'destination');
    const val = toU256(value, 'value');
    const data = toBytes(payload, 'payload');
    const inner = Buffer.concat([
        val,
        word(2 * U256_LENGTH), // offset to the inner bytes
        word(data.length),
        pad32(data),
    ]);
    return Buffer.concat([
        FUNSEL_OUTPUT2,
        TAG_CALL_VOUCHER,
        addressWord(dest),
        word(3 * U256_LENGTH), // offset to the dynamic tail (frame-relative)
        word(inner.length),
        inner,
    ]);
}

/**
 * Encode a DELEGATECALL voucher into an `Output2(bytes32[2],bytes)` envelope.
 * Mirrors libcmt's `cmt_encode_delegatecall_voucher`. There is no `value` —
 * `DELEGATECALL` cannot transfer ether.
 */
function encodeDelegateCallVoucher({ destination, payload = EMPTY }) {
    const dest = toAddress(destination, 'destination');
    const data = toBytes(payload, 'payload');
    return Buffer.concat([
        FUNSEL_OUTPUT2,
        TAG_DELEGATECALL_VOUCHER,
        addressWord(dest),
        word(3 * U256_LENGTH), // offset to the dynamic tail (frame-relative)
        word(data.length),
        pad32(data),
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
    encodeNotice,
    encodeVoucher,
    encodeDelegateCallVoucher,
    ADDRESS_LENGTH,
    U256_LENGTH,
};
