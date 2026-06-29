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

class Rollup {
    #native;

    constructor() {
        this.#native = bindingCall(() => new binding.Rollup());
    }

    /**
     * Accept or reject the previous request and wait for the next one.
     * Synchronous on purpose: the call yields the machine, pausing the whole
     * guest, so nothing else could run concurrently anyway.
     */
    finish({ accept = true } = {}) {
        const request = bindingCall(() => this.#native.finish(accept));
        if (request.type === 'advance') {
            return {
                type: 'advance',
                chainId: request.chainId,
                appContract: toHex(request.appContract),
                msgSender: toHex(request.msgSender),
                blockNumber: request.blockNumber,
                blockTimestamp: request.blockTimestamp,
                prevRandao: BigInt(toHex(request.prevRandao)),
                index: request.index,
                payload: request.payload,
            };
        }
        return { type: 'inspect', payload: request.payload };
    }

    /** Emit a voucher (Voucher(address,uint256,bytes)). Returns the output index. */
    emitVoucher({ destination, value = 0n, payload = EMPTY }) {
        return Number(
            bindingCall(() =>
                this.#native.emitVoucher(
                    toAddress(destination, 'destination'),
                    toU256(value, 'value'),
                    toBytes(payload, 'payload'),
                ),
            ),
        );
    }

    /** Emit a delegate call voucher (DelegateCallVoucher(address,bytes)). Returns the output index. */
    emitDelegateCallVoucher({ destination, payload = EMPTY }) {
        return Number(
            bindingCall(() =>
                this.#native.emitDelegateCallVoucher(toAddress(destination, 'destination'), toBytes(payload, 'payload')),
            ),
        );
    }

    /** Emit a notice (Notice(bytes)). Returns the output index. */
    emitNotice(payload) {
        return Number(bindingCall(() => this.#native.emitNotice(toBytes(payload, 'payload'))));
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

    /** Perform a generic IO request to the given domain. */
    gio({ domain, id }) {
        return bindingCall(() => this.#native.gio(domain, toBytes(id, 'id')));
    }

    loadMerkle(file) {
        bindingCall(() => this.#native.loadMerkle(String(file)));
    }

    saveMerkle(file) {
        bindingCall(() => this.#native.saveMerkle(String(file)));
    }

    resetMerkle() {
        bindingCall(() => this.#native.resetMerkle());
    }

    /** Release the underlying device. Further calls throw. */
    close() {
        bindingCall(() => this.#native.close());
    }

    /**
     * Convenience request loop. Handlers receive (request, rollup), may be
     * async, and accept the request unless they return false (exceptions
     * reject and are reported). Runs until finish fails (e.g. mock inputs are
     * exhausted, or the device is closed), which rejects with that error.
     */
    async run(handlers = {}) {
        let accept = true;
        for (;;) {
            const request = this.finish({ accept });
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

module.exports = { Rollup, RollupError, ADDRESS_LENGTH, U256_LENGTH };
