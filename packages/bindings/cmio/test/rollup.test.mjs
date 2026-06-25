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

import {
    Rollup,
    RollupError,
    decodeAdvance,
    encodeNotice,
    encodeVoucher,
    encodeDelegateCallVoucher,
} from '../lib/index.mjs';

// keep the mock by-product files (advance.output-0.bin etc.) out of the repo
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'libcmt-node-'));
process.chdir(tmp);

// EVM-ABI function selectors / output type tags, mirroring libcmt's codec.c.
const EVM_ADVANCE = '415bf363'; // EvmAdvance(uint256,address,address,...,bytes)
const FUNSEL = { output1: 'aed682a1', output2: '50b41f12' };
const TAG = {
    notice: 'e4f5829fb698a59fba2cf6128b6bf1e8ce1dc09d271c55b787781bd415db8eed',
    callVoucher: 'd515b20044ba3bb84cfce3004f8b64ee11fb8ca22f936e4bc25a65e4b2133120',
    delegateCallVoucher: 'e166d466bf2d7d71d7f3f69e4c68f516330d8073b6ddb408c507548b64a1f3bb',
};

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

function encodeEvmAdvance({ chainId, appContract, msgSender, blockNumber, blockTimestamp, prevRandao, index, payload }) {
    return Buffer.concat([
        Buffer.from(EVM_ADVANCE, 'hex'),
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

    const advance = decodeAdvance(request.payload);
    assert.equal(advance.chainId, ADVANCE.chainId);
    assert.equal(advance.appContract, ADVANCE.appContract);
    assert.equal(advance.msgSender, ADVANCE.msgSender);
    assert.equal(advance.blockNumber, ADVANCE.blockNumber);
    assert.equal(advance.blockTimestamp, ADVANCE.blockTimestamp);
    assert.equal(advance.prevRandao, ADVANCE.prevRandao);
    assert.equal(advance.index, ADVANCE.index);
    assert.deepEqual(advance.payload, ADVANCE.payload);

    const destination = `0x${'aa'.repeat(20)}`;
    const voucherPayload = Buffer.from('voucher-payload');
    const noticePayload = Buffer.from('notice-payload');
    const reportPayload = Buffer.from('report-payload');

    // outputs are EVM-ABI encoded in JS and emitted as raw bytes; the index is
    // the position in the outputs merkle tree.
    assert.equal(rollup.emitOutput(encodeNotice(noticePayload)), 0);
    assert.equal(rollup.emitOutput(encodeVoucher({ destination, value: 1000n, payload: voucherPayload })), 1);
    rollup.emitReport(reportPayload);
    rollup.progress(500);

    // notice: Output1 envelope (funsel | NOTICE tag | offset | length | payload)
    const notice = fs.readFileSync(path.join(dir, 'advance.output-0.bin'));
    assert.equal(hex(notice.subarray(0, 4)), FUNSEL.output1);
    assert.equal(hex(notice.subarray(4, 36)), TAG.notice);
    assert.deepEqual(notice.subarray(36, 68), word(0x40));
    assert.deepEqual(notice.subarray(68, 100), word(noticePayload.length));
    assert.deepEqual(notice.subarray(100, 100 + noticePayload.length), noticePayload);

    // call voucher: Output2 envelope; dynamic content is abi.encode(value, payload)
    const voucher = fs.readFileSync(path.join(dir, 'advance.output-1.bin'));
    assert.equal(hex(voucher.subarray(0, 4)), FUNSEL.output2);
    assert.equal(hex(voucher.subarray(4, 36)), TAG.callVoucher);
    assert.deepEqual(voucher.subarray(36, 68), addressWord(destination));
    assert.deepEqual(voucher.subarray(68, 100), word(0x60));
    const used = 96 + pad32(voucherPayload).length;
    assert.deepEqual(voucher.subarray(100, 132), word(used));
    assert.deepEqual(voucher.subarray(132, 164), word(1000n)); // value
    assert.deepEqual(voucher.subarray(164, 196), word(0x40)); // inner offset
    assert.deepEqual(voucher.subarray(196, 228), word(voucherPayload.length));
    assert.deepEqual(voucher.subarray(228, 228 + voucherPayload.length), voucherPayload);

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
    assert.throws(() => rollup.emitOutput(encodeNotice(noticePayload)), /closed/);
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

test('delegate call voucher', async () => {
    const dir = writeInputs('dcv', [[0, 'advance.bin', encodeEvmAdvance(ADVANCE)]]);
    const rollup = new Rollup();
    rollup.waitForInput();

    const destination = `0x${'bb'.repeat(20)}`;
    const payload = Buffer.from('delegate-payload');
    assert.equal(rollup.emitOutput(encodeDelegateCallVoucher({ destination, payload })), 0);

    // Output2 envelope: funsel | DELEGATECALL tag | destination | offset | length | payload
    const output = fs.readFileSync(path.join(dir, 'advance.output-0.bin'));
    assert.equal(hex(output.subarray(0, 4)), FUNSEL.output2);
    assert.equal(hex(output.subarray(4, 36)), TAG.delegateCallVoucher);
    assert.deepEqual(output.subarray(36, 68), addressWord(destination));
    assert.deepEqual(output.subarray(68, 100), word(0x60));
    assert.deepEqual(output.subarray(100, 132), word(payload.length));
    assert.deepEqual(output.subarray(132, 132 + payload.length), payload);
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
                seen.push(decodeAdvance(request.payload).payload);
            },
        }),
        /cmt_rollup_wait_for_input failed/,
    );
    assert.deepEqual(seen, payloads);
    rollup.close();
});

test('input validation', async () => {
    writeInputs('validation', [[0, 'advance.bin', encodeEvmAdvance(ADVANCE)]]);
    const rollup = new Rollup();
    rollup.waitForInput();

    assert.throws(() => encodeVoucher({ destination: '0x1234' }), /destination must be 20 bytes/);
    assert.throws(() => encodeVoucher({ destination: 'not-hex' }), TypeError);
    assert.throws(() => encodeVoucher({ destination: `0x${'aa'.repeat(20)}`, value: -1n }), RangeError);
    assert.throws(() => rollup.emitOutput(42), TypeError);
    assert.throws(() => decodeAdvance(Buffer.from('too short')), RangeError);
    assert.throws(() => decodeAdvance(Buffer.alloc(300)), TypeError); // long enough, wrong selector
    rollup.close();
});
