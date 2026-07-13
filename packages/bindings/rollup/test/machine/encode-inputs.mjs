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

// Writes the cmio input/query binaries consumed by cartesi-machine
// (--cmio-advance-state / --cmio-inspect-state) into the given directory.
//
//   node test/machine/encode-inputs.mjs test/machine/work

import fs from 'node:fs';
import path from 'node:path';

import { ADVANCES, QUERY, encodeEvmAdvance } from './abi.mjs';

const dir = process.argv[2];
if (!dir) {
    console.error('usage: node encode-inputs.mjs <output-dir>');
    process.exit(1);
}

ADVANCES.forEach((advance, i) => {
    const file = path.join(dir, `input-${i}.bin`);
    fs.writeFileSync(file, encodeEvmAdvance(advance));
    console.log(`wrote ${file} (${advance.payload.length}-byte payload)`);
});

const queryFile = path.join(dir, 'query.bin');
fs.writeFileSync(queryFile, QUERY);
console.log(`wrote ${queryFile}`);
