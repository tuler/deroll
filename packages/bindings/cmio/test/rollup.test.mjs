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

import { Rollup, RollupError } from '../lib/index.mjs';

// keep mock by-product files (none.gio-0.bin etc.) out of the repo
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'libcmt-node-'));
process.chdir(tmp);

// minimal EVM-ABI helpers, enough to encode the EvmAdvance input and decode
// the Voucher/Notice outputs produced by libcmt
const SELECTOR = {
    evmAdvance: '415bf363', // EvmAdvance(uint256,address,address,uint256,uint256,uint256,uint256,bytes)
    voucher: '237a816f', // Voucher(address,uint256,bytes)
    delegateCallVoucher: '10321e8b', // DelegateCallVoucher(address,bytes)
    notice: 'c258d6e5', // Notice(bytes)
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

test('advance request, outputs and reports', async () => {
    const dir = writeInputs('advance', [[0, 'advance.bin', encodeEvmAdvance(ADVANCE)]]);
    const rollup = new Rollup();

    const request = rollup.finish();
    assert.equal(request.type, 'advance');
    assert.equal(request.chainId, ADVANCE.chainId);
    assert.equal(request.appContract, ADVANCE.appContract);
    assert.equal(request.msgSender, ADVANCE.msgSender);
    assert.equal(request.blockNumber, ADVANCE.blockNumber);
    assert.equal(request.blockTimestamp, ADVANCE.blockTimestamp);
    assert.equal(request.prevRandao, ADVANCE.prevRandao);
    assert.equal(request.index, ADVANCE.index);
    assert.deepEqual(request.payload, ADVANCE.payload);

    const destination = `0x${'aa'.repeat(20)}`;
    const voucherPayload = Buffer.from('voucher-payload');
    const noticePayload = Buffer.from('notice-payload');
    const reportPayload = Buffer.from('report-payload');

    assert.equal(rollup.emitVoucher({ destination, value: 1000n, payload: voucherPayload }), 0);
    assert.equal(rollup.emitNotice(noticePayload), 1);
    rollup.emitReport(reportPayload);
    rollup.progress(500);

    // outputs are EVM-ABI encoded by libcmt and stored next to the input file
    const voucher = fs.readFileSync(path.join(dir, 'advance.output-0.bin'));
    assert.equal(voucher.subarray(0, 4).toString('hex'), SELECTOR.voucher);
    assert.ok(voucher.includes(addressWord(destination)), 'voucher contains destination');
    assert.ok(voucher.includes(word(1000n)), 'voucher contains value');
    assert.ok(voucher.includes(voucherPayload), 'voucher contains payload');

    const notice = fs.readFileSync(path.join(dir, 'advance.output-1.bin'));
    assert.equal(notice.subarray(0, 4).toString('hex'), SELECTOR.notice);
    assert.ok(notice.includes(noticePayload), 'notice contains payload');

    // reports are raw
    assert.deepEqual(fs.readFileSync(path.join(dir, 'advance.report-0.bin')), reportPayload);

    // no more inputs: finish throws a RollupError carrying the libcmt errno
    assert.throws(
        () => rollup.finish(),
        (error) =>
            error instanceof RollupError &&
            /cmt_rollup_finish failed/.test(error.message) &&
            typeof error.errno === 'number' &&
            error.errno < 0 &&
            error.syscall === 'cmt_rollup_finish',
    );

    rollup.close();
    assert.throws(() => rollup.emitNotice(noticePayload), /closed/);
    rollup.close(); // idempotent
});

test('inspect request', async () => {
    const payload = Buffer.from('inspect-query');
    writeInputs('inspect', [[1, 'inspect.bin', payload]]);
    const rollup = new Rollup();

    const request = rollup.finish();
    assert.equal(request.type, 'inspect');
    assert.deepEqual(request.payload, payload);

    rollup.emitReport(Buffer.from('inspect-response'));
    rollup.close();
});

test('delegate call voucher', async () => {
    const dir = writeInputs('dcv', [[0, 'advance.bin', encodeEvmAdvance(ADVANCE)]]);
    const rollup = new Rollup();
    rollup.finish();

    const destination = `0x${'bb'.repeat(20)}`;
    const payload = Buffer.from('delegate-payload');
    assert.equal(rollup.emitDelegateCallVoucher({ destination, payload }), 0);

    const output = fs.readFileSync(path.join(dir, 'advance.output-0.bin'));
    assert.equal(output.subarray(0, 4).toString('hex'), SELECTOR.delegateCallVoucher);
    assert.ok(output.includes(addressWord(destination)));
    assert.ok(output.includes(payload));
    rollup.close();
});

test('exception', async () => {
    const dir = writeInputs('exception', [[0, 'advance.bin', encodeEvmAdvance(ADVANCE)]]);
    const rollup = new Rollup();
    rollup.finish();

    const payload = Buffer.from('something went wrong');
    rollup.emitException(payload);
    assert.deepEqual(fs.readFileSync(path.join(dir, 'advance.exception-0.bin')), payload);
    rollup.close();
});

test('gio request', async () => {
    const reply = Buffer.from('gio-reply-data');
    writeInputs('gio', [[42, 'gio-reply.bin', reply]]);
    const rollup = new Rollup();

    const response = rollup.gio({ domain: 0xfefe, id: Buffer.from('gio-request-id') });
    assert.equal(response.responseCode, 42);
    assert.deepEqual(response.responseData, reply);
    rollup.close();
});

test('merkle save, reset and load', async () => {
    writeInputs('merkle', [[0, 'advance.bin', encodeEvmAdvance(ADVANCE)]]);
    const rollup = new Rollup();
    rollup.finish();
    rollup.emitNotice(Buffer.from('leaf'));

    const file = path.join(tmp, 'merkle.bin');
    rollup.saveMerkle(file);
    assert.ok(fs.statSync(file).size > 0);
    rollup.resetMerkle();
    rollup.loadMerkle(file);
    rollup.close();

    // only one instance may be open at a time: libcmt returns -EBUSY otherwise
    const another = new Rollup();
    assert.throws(
        () => new Rollup(),
        (error) => error instanceof RollupError && error.syscall === 'cmt_rollup_init' && error.errno === -16,
    );
    assert.throws(
        () => another.loadMerkle(path.join(tmp, 'missing', 'merkle.bin')),
        (error) => error instanceof RollupError && error.syscall === 'cmt_rollup_load_merkle',
    );
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
                seen.push(request.payload);
            },
        }),
        /cmt_rollup_finish failed/,
    );
    assert.deepEqual(seen, payloads);
    rollup.close();
});

test('input validation', async () => {
    writeInputs('validation', [[0, 'advance.bin', encodeEvmAdvance(ADVANCE)]]);
    const rollup = new Rollup();
    rollup.finish();

    assert.throws(() => rollup.emitVoucher({ destination: '0x1234' }), /destination must be 20 bytes/);
    assert.throws(() => rollup.emitVoucher({ destination: 'not-hex' }), TypeError);
    assert.throws(() => rollup.emitVoucher({ destination: `0x${'aa'.repeat(20)}`, value: -1n }), RangeError);
    assert.throws(() => rollup.emitNotice(42), TypeError);
    rollup.close();
});
