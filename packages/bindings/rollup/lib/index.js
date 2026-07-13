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

class Rollup {
    #native;

    constructor() {
        this.#native = bindingCall(() => new binding.Rollup());
    }

    /**
     * Accept or reject the previous request and wait for the next one. Returns
     * the next request with its raw, undecoded payload; use `@deroll/codec`'s
     * `decodeAdvance` to parse an advance input. Synchronous on purpose: the
     * call yields the machine, pausing the whole guest, so nothing else could
     * run concurrently.
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
};
