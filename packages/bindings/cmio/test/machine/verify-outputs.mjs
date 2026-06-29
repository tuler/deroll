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

// Verifies the outputs/reports produced by the cartesi-machine run against
// what test/machine/app.mjs is expected to emit for the inputs from abi.mjs.
//
//   node test/machine/verify-outputs.mjs test/machine/work

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { ADVANCES, QUERY, encodeNotice, encodeVoucher } from './abi.mjs';

const dir = process.argv[2];
if (!dir) {
    console.error('usage: node verify-outputs.mjs <work-dir>');
    process.exit(1);
}

const read = (name) => fs.readFileSync(path.join(dir, name));

ADVANCES.forEach((advance, i) => {
    // app.mjs emits, in order: notice (output 0), voucher (output 1), report 0
    assert.deepEqual(read(`input-${i}-output-0.bin`), encodeNotice(advance.payload), `input ${i}: notice mismatch`);
    assert.deepEqual(
        read(`input-${i}-output-1.bin`),
        encodeVoucher({ destination: advance.msgSender, value: advance.index, payload: advance.payload }),
        `input ${i}: voucher mismatch`,
    );
    assert.equal(
        read(`input-${i}-report-0.bin`).toString(),
        `advance index=${advance.index} chainId=${advance.chainId}`,
        `input ${i}: report mismatch`,
    );
    console.log(`input ${i}: notice, voucher and report OK`);
});

assert.deepEqual(read('query-report-0.bin'), QUERY, 'inspect: query report mismatch');
console.log('inspect: query report OK');

console.log('all machine outputs verified');
