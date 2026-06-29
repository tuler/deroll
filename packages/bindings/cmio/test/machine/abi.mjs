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

// Minimal EVM-ABI helpers shared by encode-inputs.mjs and verify-outputs.mjs,
// enough to encode EvmAdvance inputs and decode Voucher/Notice outputs.
// Mirrors the encoder in test/rollup.test.mjs.

export const SELECTOR = {
    evmAdvance: '415bf363', // EvmAdvance(uint256,address,address,uint256,uint256,uint256,uint256,bytes)
    voucher: '237a816f', // Voucher(address,uint256,bytes)
    notice: 'c258d6e5', // Notice(bytes)
};

export function word(value) {
    let v = BigInt(value);
    const bytes = Buffer.alloc(32);
    for (let i = 31; i >= 0 && v > 0n; i--) {
        bytes[i] = Number(v & 0xffn);
        v >>= 8n;
    }
    return bytes;
}

export const addressWord = (hex) => Buffer.concat([Buffer.alloc(12), Buffer.from(hex.slice(2), 'hex')]);
export const pad32 = (bytes) => Buffer.concat([bytes, Buffer.alloc((32 - (bytes.length % 32)) % 32)]);

export function encodeEvmAdvance({ chainId, appContract, msgSender, blockNumber, blockTimestamp, prevRandao, index, payload }) {
    return Buffer.concat([
        Buffer.from(SELECTOR.evmAdvance, 'hex'),
        word(chainId),
        addressWord(appContract),
        addressWord(msgSender),
        word(blockNumber),
        word(blockTimestamp),
        word(prevRandao),
        word(index),
        word(8 * 32), // offset of the payload `bytes` field
        word(payload.length),
        pad32(payload),
    ]);
}

export function encodeNotice(payload) {
    return Buffer.concat([
        Buffer.from(SELECTOR.notice, 'hex'),
        word(32), // offset of the payload `bytes` field
        word(payload.length),
        pad32(payload),
    ]);
}

export function encodeVoucher({ destination, value, payload }) {
    return Buffer.concat([
        Buffer.from(SELECTOR.voucher, 'hex'),
        addressWord(destination),
        word(value),
        word(3 * 32), // offset of the payload `bytes` field
        word(payload.length),
        pad32(payload),
    ]);
}

// The advance inputs fed to the machine and the inspect query, shared between
// the encoder and the verifier so expectations stay in sync.
export const ADVANCES = [
    {
        chainId: 31337n,
        appContract: `0x${'02'.repeat(20)}`,
        msgSender: `0x${'03'.repeat(20)}`,
        blockNumber: 456n,
        blockTimestamp: 1700000000n,
        prevRandao: 0xdeadbeefn,
        index: 0n,
        payload: Buffer.from('hello from the chain'),
    },
    {
        chainId: 31337n,
        appContract: `0x${'02'.repeat(20)}`,
        msgSender: `0x${'aa'.repeat(20)}`,
        blockNumber: 457n,
        blockTimestamp: 1700000012n,
        prevRandao: 0xc0ffeen,
        index: 1n,
        payload: Buffer.from('second input'),
    },
];

export const QUERY = Buffer.from('inspect me');
