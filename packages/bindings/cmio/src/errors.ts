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

export interface RollupErrorOptions {
    /** Negative errno reported by libcmt (e.g. `-16` for `EBUSY`). */
    errno: number;
    /** Name of the libcmt call that failed (e.g. `cmt_rollup_init`). */
    syscall: string;
    /** The original error raised by the native addon. */
    cause?: unknown;
}

/**
 * Error thrown when a libcmt binding call fails (e.g. a too-large output, or
 * constructing a second `Rollup` while one is open). Carries the negative errno
 * reported by libcmt in {@link RollupError.errno} and the name of the libcmt
 * call that failed in {@link RollupError.syscall}.
 *
 * Argument validation failures throw plain `TypeError`/`RangeError` instead,
 * before anything reaches the device.
 */
export class RollupError extends Error {
    readonly name = "RollupError";
    /** Negative errno reported by libcmt (e.g. `-16` for `EBUSY`). */
    readonly errno: number;
    /** Name of the libcmt call that failed (e.g. `cmt_rollup_init`). */
    readonly syscall: string;

    constructor(message: string, options: RollupErrorOptions) {
        const { errno, syscall, cause } = options;
        super(message, cause === undefined ? undefined : { cause });
        this.errno = errno;
        this.syscall = syscall;
    }

    /**
     * `instanceof` that also matches errors produced by another copy of this
     * class. The package ships a CJS and an ESM bundle; a process that ends up
     * loading both would otherwise have two unrelated `RollupError` classes,
     * and a plain prototype check would depend on which one raised the error.
     */
    static [Symbol.hasInstance](value: unknown): boolean {
        return (
            typeof value === "object" &&
            value !== null &&
            (value as { name?: unknown }).name === "RollupError"
        );
    }

    /**
     * Normalize an error thrown by the native addon. libcmt failures carry a
     * numeric `errno` and the failed call name in `syscall`; those become a
     * RollupError. Anything else (validation errors, "rollup is closed") is
     * returned unchanged.
     */
    static from(error: unknown): unknown {
        if (error instanceof RollupError) {
            return error;
        }
        const candidate = error as
            | { message?: string; errno?: unknown; syscall?: unknown }
            | null
            | undefined;
        if (
            candidate != null &&
            typeof candidate.errno === "number" &&
            typeof candidate.syscall === "string"
        ) {
            return new RollupError(candidate.message ?? "", {
                errno: candidate.errno,
                syscall: candidate.syscall,
                cause: error,
            });
        }
        return error;
    }
}

/** Run a libcmt binding call, normalizing its failures into a RollupError. */
export const bindingCall = <T>(fn: () => T): T => {
    try {
        return fn();
    } catch (error) {
        throw RollupError.from(error);
    }
};
