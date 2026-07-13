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

// Echo dapp run inside the Cartesi Machine by test/machine/run.sh. For each
// advance it emits a notice and a call voucher echoing the payload plus a
// report; for each inspect it reports the query payload back.

import { Rollup } from '@deroll/rollup';
import { decodeAdvance, encodeCallVoucher, encodeNotice } from '@deroll/codec';
import { Hex } from 'ox';

// application-defined bytes32 output tag; must match test/machine/abi.mjs
const APP_CONTEXT = `0x${'00'.repeat(31)}42`;

const rollup = new Rollup();
await rollup.run({
    advance(request, rollup) {
        const advance = decodeAdvance(Hex.fromBytes(request.payload));
        rollup.emitOutput(encodeNotice({ appContext: APP_CONTEXT, payload: advance.payload }));
        rollup.emitOutput(
            encodeCallVoucher({
                destination: advance.msgSender,
                appContext: APP_CONTEXT,
                value: advance.index,
                payload: advance.payload,
            }),
        );
        rollup.emitReport(Buffer.from(`advance index=${advance.index} chainId=${advance.chainId}`));
        return true;
    },
    inspect(request, rollup) {
        rollup.emitReport(request.payload);
        return true;
    },
});
