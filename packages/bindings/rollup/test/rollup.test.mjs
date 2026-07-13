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

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { Hex } from 'ox';

import {
    decodeAdvance,
    encodeAdvance,
    encodeCallVoucher,
    encodeErc20Transfer,
    encodeErc721Transfer,
    encodeErc1155BatchTransfer,
    encodeErc1155Transfer,
    encodeNotice,
} from '@deroll/codec';
import { Rollup, RollupError } from '../lib/index.mjs';

// keep the mock by-product files (advance.output-0.bin etc.) out of the repo
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'libcmt-node-'));
process.chdir(tmp);

// EVM-ABI function selectors, mirroring libcmt's codec.h funsels (which are
// stored there as little-endian uint32, so the byte order here is reversed).
const FUNSEL = {
    evmAdvance: '233a0ebf', // EvmAdvance(uint64,address,address,uint64,uint64,uint256,uint64,bytes)
    notice: 'dd2a7453', // Notice(bytes32,bytes)
    callVoucher: '6062d5e2', // CallVoucher(bytes32,address,uint256,bytes)
    erc20Transfer: 'cd5bd08c', // Erc20Transfer(bytes32,address,address,uint256)
    erc721Transfer: 'c48121fd', // Erc721Transfer(bytes32,address,address,uint256)
    erc1155Transfer: 'ba112f83', // Erc1155Transfer(bytes32,address,address,uint256,uint256)
    erc1155BatchTransfer: '2d5a3c2e', // Erc1155BatchTransfer(bytes32,address,address,(uint256,uint256)[])
};

// application-defined bytes32 tag carried by every output
const APP_CONTEXT = `0x${'00'.repeat(31)}ff`;
const appContextWord = Buffer.from(APP_CONTEXT.slice(2), 'hex');

function word(value) {
    let v = BigInt(value);
    const bytes = Buffer.alloc(32);
    for (let i = 31; i >= 0 && v > 0n; i--) {
        bytes[i] = Number(v & 0xffn);
        v >>= 8n;
    }
    return bytes;
}

const addressWord = (hex) => Buffer.concat([Buffer.alloc(12), Buffer.from(hex.slice(2), 'hex')]);
const pad32 = (bytes) => Buffer.concat([bytes, Buffer.alloc((32 - (bytes.length % 32)) % 32)]);

// Hand-rolled EvmAdvance encoder, independent of the library's encodeAdvance
// so the two implementations cross-check each other. All heads are 32-byte
// words regardless of the field's declared width (uint64 fields included).
function encodeEvmAdvance({ chainId, appContract, msgSender, blockNumber, blockTimestamp, prevRandao, index, payload }) {
    return Buffer.concat([
        Buffer.from(FUNSEL.evmAdvance, 'hex'),
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

const ADVANCE = {
    chainId: 31337n,
    appContract: `0x${'02'.repeat(20)}`,
    msgSender: `0x${'03'.repeat(20)}`,
    blockNumber: 456n,
    blockTimestamp: 1700000000n,
    prevRandao: 0xdeadbeefn,
    index: 7n,
    payload: Buffer.from('hello from the chain'),
};

function writeInputs(name, inputs) {
    const dir = path.join(tmp, name);
    fs.mkdirSync(dir, { recursive: true });
    const spec = inputs
        .map(([reason, filename, data]) => {
            const file = path.join(dir, filename);
            fs.writeFileSync(file, data);
            return `${reason}:${file}`;
        })
        .join(',');
    process.env.CMT_INPUTS = spec;
    return dir;
}

const hex = (bytes) => bytes.toString('hex');

test('advance request, outputs and reports', async () => {
    const dir = writeInputs('advance', [[0, 'advance.bin', encodeEvmAdvance(ADVANCE)]]);
    const rollup = new Rollup();

    const request = rollup.waitForInput();
    assert.equal(request.type, 'advance');

    // the codec encoder and the hand-rolled one above must agree
    assert.equal(
        encodeAdvance({ ...ADVANCE, payload: Hex.fromBytes(ADVANCE.payload) }),
        Hex.fromBytes(encodeEvmAdvance(ADVANCE)),
    );

    const advance = decodeAdvance(Hex.fromBytes(request.payload));
    assert.equal(advance.chainId, ADVANCE.chainId);
    assert.equal(advance.appContract, ADVANCE.appContract);
    assert.equal(advance.msgSender, ADVANCE.msgSender);
    assert.equal(advance.blockNumber, ADVANCE.blockNumber);
    assert.equal(advance.blockTimestamp, ADVANCE.blockTimestamp);
    assert.equal(advance.prevRandao, ADVANCE.prevRandao);
    assert.equal(advance.index, ADVANCE.index);
    assert.equal(advance.payload, Hex.fromBytes(ADVANCE.payload));

    const destination = `0x${'aa'.repeat(20)}`;
    const voucherPayload = Buffer.from('voucher-payload');
    const noticePayload = Buffer.from('notice-payload');
    const reportPayload = Buffer.from('report-payload');

    // outputs are EVM-ABI encoded in JS and emitted as raw bytes; the index is
    // the position in the outputs merkle tree.
    assert.equal(rollup.emitOutput(encodeNotice({ appContext: APP_CONTEXT, payload: Hex.fromBytes(noticePayload) })), 0);
    assert.equal(
        rollup.emitOutput(
            encodeCallVoucher({
                destination,
                appContext: APP_CONTEXT,
                value: 1000n,
                payload: Hex.fromBytes(voucherPayload),
            }),
        ),
        1,
    );
    rollup.emitReport(reportPayload);
    rollup.progress(500);

    // notice: Notice(bytes32,bytes) = funsel | appContext | offset | length | payload
    const notice = fs.readFileSync(path.join(dir, 'advance.output-0.bin'));
    assert.equal(hex(notice.subarray(0, 4)), FUNSEL.notice);
    assert.deepEqual(notice.subarray(4, 36), appContextWord);
    assert.deepEqual(notice.subarray(36, 68), word(0x40));
    assert.deepEqual(notice.subarray(68, 100), word(noticePayload.length));
    assert.deepEqual(notice.subarray(100, 100 + noticePayload.length), noticePayload);

    // call voucher: CallVoucher(bytes32,address,uint256,bytes) =
    //   funsel | appContext | destination | value | offset | length | payload
    const voucher = fs.readFileSync(path.join(dir, 'advance.output-1.bin'));
    assert.equal(hex(voucher.subarray(0, 4)), FUNSEL.callVoucher);
    assert.deepEqual(voucher.subarray(4, 36), appContextWord);
    assert.deepEqual(voucher.subarray(36, 68), addressWord(destination));
    assert.deepEqual(voucher.subarray(68, 100), word(1000n)); // value
    assert.deepEqual(voucher.subarray(100, 132), word(0x80));
    assert.deepEqual(voucher.subarray(132, 164), word(voucherPayload.length));
    assert.deepEqual(voucher.subarray(164, 164 + voucherPayload.length), voucherPayload);

    // reports are raw
    assert.deepEqual(fs.readFileSync(path.join(dir, 'advance.report-0.bin')), reportPayload);

    // no more inputs: waitForInput throws a RollupError carrying the libcmt errno
    assert.throws(
        () => rollup.waitForInput(),
        (error) =>
            error instanceof RollupError &&
            /cmt_rollup_wait_for_input failed/.test(error.message) &&
            typeof error.errno === 'number' &&
            error.errno < 0 &&
            error.syscall === 'cmt_rollup_wait_for_input',
    );

    rollup.close();
    assert.throws(
        () => rollup.emitOutput(encodeNotice({ appContext: APP_CONTEXT, payload: Hex.fromBytes(noticePayload) })),
        /closed/,
    );
    rollup.close(); // idempotent
});

test('inspect request', async () => {
    const payload = Buffer.from('inspect-query');
    writeInputs('inspect', [[1, 'inspect.bin', payload]]);
    const rollup = new Rollup();

    const request = rollup.waitForInput();
    assert.equal(request.type, 'inspect');
    assert.deepEqual(request.payload, payload);

    rollup.emitReport(Buffer.from('inspect-response'));
    rollup.close();
});

test('asset transfer outputs', async () => {
    const dir = writeInputs('transfers', [[0, 'advance.bin', encodeEvmAdvance(ADVANCE)]]);
    const rollup = new Rollup();
    rollup.waitForInput();

    const recipient = `0x${'bb'.repeat(20)}`;
    const token = `0x${'cc'.repeat(20)}`;

    assert.equal(
        rollup.emitOutput(encodeErc20Transfer({ recipient, token, appContext: APP_CONTEXT, value: 1000n })),
        0,
    );
    assert.equal(
        rollup.emitOutput(encodeErc721Transfer({ recipient, token, tokenId: 7n, appContext: APP_CONTEXT })),
        1,
    );
    assert.equal(
        rollup.emitOutput(
            encodeErc1155Transfer({
                recipient,
                token,
                tokenId: 7n,
                appContext: APP_CONTEXT,
                value: 3n,
            }),
        ),
        2,
    );
    assert.equal(
        rollup.emitOutput(
            encodeErc1155BatchTransfer({
                recipient,
                token,
                appContext: APP_CONTEXT,
                items: [
                    [1n, 2n],
                    [3n, 4n],
                ],
            }),
        ),
        3,
    );

    // Erc20Transfer(bytes32,address,address,uint256): static, funsel + 4 words
    const erc20 = fs.readFileSync(path.join(dir, 'advance.output-0.bin'));
    assert.equal(hex(erc20.subarray(0, 4)), FUNSEL.erc20Transfer);
    assert.deepEqual(erc20.subarray(4, 36), appContextWord);
    assert.deepEqual(erc20.subarray(36, 68), addressWord(recipient));
    assert.deepEqual(erc20.subarray(68, 100), addressWord(token));
    assert.deepEqual(erc20.subarray(100, 132), word(1000n));
    assert.equal(erc20.length, 132);

    // Erc721Transfer(bytes32,address,address,uint256): static, funsel + 4 words
    const erc721 = fs.readFileSync(path.join(dir, 'advance.output-1.bin'));
    assert.equal(hex(erc721.subarray(0, 4)), FUNSEL.erc721Transfer);
    assert.deepEqual(erc721.subarray(4, 36), appContextWord);
    assert.deepEqual(erc721.subarray(36, 68), addressWord(recipient));
    assert.deepEqual(erc721.subarray(68, 100), addressWord(token));
    assert.deepEqual(erc721.subarray(100, 132), word(7n)); // tokenId
    assert.equal(erc721.length, 132);

    // Erc1155Transfer(bytes32,address,address,uint256,uint256): static, funsel + 5 words
    const single = fs.readFileSync(path.join(dir, 'advance.output-2.bin'));
    assert.equal(hex(single.subarray(0, 4)), FUNSEL.erc1155Transfer);
    assert.deepEqual(single.subarray(4, 36), appContextWord);
    assert.deepEqual(single.subarray(100, 132), word(7n)); // tokenId
    assert.deepEqual(single.subarray(132, 164), word(3n)); // value
    assert.equal(single.length, 164);

    // Erc1155BatchTransfer(bytes32,address,address,(uint256,uint256)[]): pairs
    // are encoded as a dynamic array of static (tokenId, value) tuples
    const batch = fs.readFileSync(path.join(dir, 'advance.output-3.bin'));
    assert.equal(hex(batch.subarray(0, 4)), FUNSEL.erc1155BatchTransfer);
    assert.deepEqual(batch.subarray(4, 36), appContextWord);
    assert.deepEqual(batch.subarray(100, 132), word(0x80)); // pairs offset
    assert.deepEqual(batch.subarray(132, 164), word(2)); // pair count
    assert.deepEqual(batch.subarray(164, 196), word(1n));
    assert.deepEqual(batch.subarray(196, 228), word(2n));
    assert.deepEqual(batch.subarray(228, 260), word(3n));
    assert.deepEqual(batch.subarray(260, 292), word(4n));
    assert.equal(batch.length, 292);
    rollup.close();
});

test('exception', async () => {
    const dir = writeInputs('exception', [[0, 'advance.bin', encodeEvmAdvance(ADVANCE)]]);
    const rollup = new Rollup();
    rollup.waitForInput();

    const payload = Buffer.from('something went wrong');
    rollup.emitException(payload);
    assert.deepEqual(fs.readFileSync(path.join(dir, 'advance.exception-0.bin')), payload);
    rollup.close();
});

test('only one instance may be open at a time', async () => {
    writeInputs('busy', [[0, 'advance.bin', encodeEvmAdvance(ADVANCE)]]);
    const rollup = new Rollup();

    // a second instance fails to open: libcmt returns -EBUSY
    assert.throws(
        () => new Rollup(),
        (error) => error instanceof RollupError && error.syscall === 'cmt_rollup_init' && error.errno === -16,
    );

    // once the first is closed, a new one can be opened
    rollup.close();
    const another = new Rollup();
    another.close();
});

test('run loop drives handlers until inputs are exhausted', async () => {
    const payloads = [Buffer.from('input-0'), Buffer.from('input-1')];
    writeInputs('run', [
        [0, 'a.bin', encodeEvmAdvance({ ...ADVANCE, payload: payloads[0] })],
        [0, 'b.bin', encodeEvmAdvance({ ...ADVANCE, payload: payloads[1] })],
    ]);
    const rollup = new Rollup();

    const seen = [];
    await assert.rejects(
        rollup.run({
            advance: (request) => {
                seen.push(decodeAdvance(Hex.fromBytes(request.payload)).payload);
            },
        }),
        /cmt_rollup_wait_for_input failed/,
    );
    assert.deepEqual(seen, payloads.map((payload) => Hex.fromBytes(payload)));
    rollup.close();
});

test('input validation', async () => {
    writeInputs('validation', [[0, 'advance.bin', encodeEvmAdvance(ADVANCE)]]);
    const rollup = new Rollup();
    rollup.waitForInput();

    // codec argument validation is covered by @deroll/codec's own test suite;
    // here only the binding's byte validation matters.
    assert.throws(() => rollup.emitOutput(42), TypeError);
    assert.throws(() => rollup.emitOutput('not-hex'), TypeError);
    assert.throws(() => decodeAdvance(Hex.fromBytes(Buffer.alloc(300))), /not an EvmAdvance/);
    rollup.close();
});
