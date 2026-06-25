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

// EVM-ABI encoders/decoders for libcmt's output envelopes, expressed with ox so
// the low-level word packing/padding stays battle-tested. The Output1/Output2
// selectors ox derives from these signatures match libcmt's hardcoded funsels
// (0xaed682a1 / 0x50b41f12), and the 32-byte type tags below are the
// cartesi.output.v1.* keccak constants from codec.c.
const OUTPUT1 = AbiFunction.from('function Output1(bytes32[1], bytes)');
const OUTPUT2 = AbiFunction.from('function Output2(bytes32[2], bytes)');
const EVM_ADVANCE = AbiFunction.from(
    'function EvmAdvance(uint256 chainId, address appContract, address msgSender, ' +
        'uint256 blockNumber, uint256 blockTimestamp, uint256 prevRandao, uint256 index, bytes payload)',
);
const EVM_ADVANCE_SELECTOR = EVM_ADVANCE.hash.slice(0, 10); // 0x + 4 bytes
// CALL voucher dynamic content: abi.encode(uint256 value, bytes payload)
const CALL_VOUCHER_DATA = AbiParameters.from('uint256 value, bytes payload');
const TAG_NOTICE = '0xe4f5829fb698a59fba2cf6128b6bf1e8ce1dc09d271c55b787781bd415db8eed';
const TAG_CALL_VOUCHER = '0xd515b20044ba3bb84cfce3004f8b64ee11fb8ca22f936e4bc25a65e4b2133120';
const TAG_DELEGATECALL_VOUCHER = '0xe166d466bf2d7d71d7f3f69e4c68f516330d8073b6ddb408c507548b64a1f3bb';

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

// Validate an unsigned 256-bit value and return it as a bigint for ox.
function toU256(value, name) {
    let v;
    if (typeof value === 'bigint' || typeof value === 'number') {
        v = BigInt(value);
    } else {
        const bytes = toBytes(value, name);
        if (bytes.length !== U256_LENGTH) {
            throw new TypeError(`${name} must be ${U256_LENGTH} bytes long`);
        }
        v = bytes.length === 0 ? 0n : BigInt(toHex(bytes));
    }
    if (v < 0n || v >= 1n << 256n) {
        throw new RangeError(`${name} must fit in an unsigned 256-bit integer`);
    }
    return v;
}

function toHex(bytes) {
    return `0x${bytes.toString('hex')}`;
}

// Left-pad a validated 20-byte address into a 32-byte ABI word (0x-hex).
function addressToWord(bytes) {
    return `0x${bytes.toString('hex').padStart(2 * U256_LENGTH, '0')}`;
}

/**
 * Decode an `EvmAdvance` input (the raw payload of an advance request) into its
 * structured fields. Mirrors libcmt's `cmt_decode_advance_state`.
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

/** Encode a notice into an `Output1(bytes32[1],bytes)` envelope. */
function encodeNotice(payload) {
    const data = toHex(toBytes(payload, 'payload'));
    return Buffer.from(AbiFunction.encodeData(OUTPUT1, [[TAG_NOTICE], data]).slice(2), 'hex');
}

/**
 * Encode a CALL voucher into an `Output2(bytes32[2],bytes)` envelope, whose
 * dynamic content is `abi.encode(uint256 value, bytes payload)`.
 */
function encodeVoucher({ destination, value = 0n, payload = EMPTY }) {
    const dest = addressToWord(toAddress(destination, 'destination'));
    const val = toU256(value, 'value');
    const data = toHex(toBytes(payload, 'payload'));
    const inner = AbiParameters.encode(CALL_VOUCHER_DATA, [val, data]);
    return Buffer.from(AbiFunction.encodeData(OUTPUT2, [[TAG_CALL_VOUCHER, dest], inner]).slice(2), 'hex');
}

/**
 * Encode a DELEGATECALL voucher into an `Output2(bytes32[2],bytes)` envelope.
 * There is no `value` — `DELEGATECALL` cannot transfer ether.
 */
function encodeDelegateCallVoucher({ destination, payload = EMPTY }) {
    const dest = addressToWord(toAddress(destination, 'destination'));
    const data = toHex(toBytes(payload, 'payload'));
    return Buffer.from(AbiFunction.encodeData(OUTPUT2, [[TAG_DELEGATECALL_VOUCHER, dest], data]).slice(2), 'hex');
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
