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

import type { AddressLike, BytesLike, Hex, U256Like } from "./types.js";

/** Length of an EVM address, in bytes. */
export const ADDRESS_LENGTH = 20;

/** Length of an EVM word, in bytes. */
export const U256_LENGTH = 32;

const HEX = /^0x(?:[0-9a-fA-F]{2})*$/;

/**
 * Coerce a bytes argument to a Buffer the addon can read directly. Buffers are
 * passed through, other Uint8Arrays are wrapped without copying.
 */
export const toBytes = (value: BytesLike, name: string): Buffer => {
    if (typeof value === "string") {
        if (!HEX.test(value)) {
            throw new TypeError(
                `${name} must be a 0x-prefixed hex string, Buffer or Uint8Array`,
            );
        }
        return Buffer.from(value.slice(2), "hex");
    }
    if (value instanceof Uint8Array) {
        return Buffer.isBuffer(value)
            ? value
            : Buffer.from(value.buffer, value.byteOffset, value.byteLength);
    }
    throw new TypeError(
        `${name} must be a 0x-prefixed hex string, Buffer or Uint8Array`,
    );
};

/** Coerce an address argument to exactly {@link ADDRESS_LENGTH} bytes. */
export const toAddress = (value: AddressLike, name: string): Buffer => {
    const bytes = toBytes(value, name);
    if (bytes.length !== ADDRESS_LENGTH) {
        throw new TypeError(`${name} must be ${ADDRESS_LENGTH} bytes long`);
    }
    return bytes;
};

/**
 * Coerce an unsigned 256-bit argument to exactly {@link U256_LENGTH} bytes.
 * Numeric values are encoded big-endian, matching the EVM word layout.
 */
export const toU256 = (value: U256Like, name: string): Buffer => {
    if (typeof value === "bigint" || typeof value === "number") {
        let v = BigInt(value);
        if (v < 0n || v >= 1n << 256n) {
            throw new RangeError(
                `${name} must fit in an unsigned 256-bit integer`,
            );
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
};

/** Render raw bytes coming from the addon as a 0x-prefixed hex string. */
export const toHex = (bytes: Buffer): Hex => `0x${bytes.toString("hex")}`;
