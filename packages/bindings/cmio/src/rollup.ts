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

import { type NativeRollup, addon } from "./addon.js";
import { toAddress, toBytes, toHex, toU256 } from "./convert.js";
import { bindingCall } from "./errors.js";
import type {
    BytesLike,
    DelegateCallVoucher,
    FinishOptions,
    GioRequest,
    GioResponse,
    RollupRequest,
    RunHandlers,
    Voucher,
} from "./types.js";

const EMPTY = Buffer.alloc(0);

export class Rollup {
    #native: NativeRollup;

    /**
     * Opens the rollup device and initializes the outputs merkle tree.
     *
     * On riscv64 this talks to the real Cartesi Machine IO driver; on other
     * architectures it uses the libcmt mock, driven by the CMT_INPUTS and
     * CMT_DEBUG environment variables.
     */
    constructor() {
        this.#native = bindingCall(() => new addon.Rollup());
    }

    /**
     * Accept or reject the previous request and wait for the next one.
     * Synchronous on purpose: the call yields the machine, pausing the whole
     * guest, so nothing else could run concurrently anyway.
     */
    finish({ accept = true }: FinishOptions = {}): RollupRequest {
        const request = bindingCall(() => this.#native.finish(accept));
        if (request.type === "advance") {
            return {
                type: "advance",
                chainId: request.chainId,
                appContract: toHex(request.appContract),
                msgSender: toHex(request.msgSender),
                blockNumber: request.blockNumber,
                blockTimestamp: request.blockTimestamp,
                prevRandao: BigInt(toHex(request.prevRandao)),
                index: request.index,
                payload: request.payload,
            };
        }
        return { type: "inspect", payload: request.payload };
    }

    /** Emit a voucher (Voucher(address,uint256,bytes)). Returns the output index. */
    emitVoucher({ destination, value = 0n, payload = EMPTY }: Voucher): number {
        return Number(
            bindingCall(() =>
                this.#native.emitVoucher(
                    toAddress(destination, "destination"),
                    toU256(value, "value"),
                    toBytes(payload, "payload"),
                ),
            ),
        );
    }

    /** Emit a delegate call voucher (DelegateCallVoucher(address,bytes)). Returns the output index. */
    emitDelegateCallVoucher({
        destination,
        payload = EMPTY,
    }: DelegateCallVoucher): number {
        return Number(
            bindingCall(() =>
                this.#native.emitDelegateCallVoucher(
                    toAddress(destination, "destination"),
                    toBytes(payload, "payload"),
                ),
            ),
        );
    }

    /** Emit a notice (Notice(bytes)). Returns the output index. */
    emitNotice(payload: BytesLike): number {
        return Number(
            bindingCall(() =>
                this.#native.emitNotice(toBytes(payload, "payload")),
            ),
        );
    }

    /** Emit a report (raw bytes, not part of the outputs merkle tree). */
    emitReport(payload: BytesLike): void {
        bindingCall(() => this.#native.emitReport(toBytes(payload, "payload")));
    }

    /** Emit an exception, signaling that the request could not be processed. */
    emitException(payload: BytesLike): void {
        bindingCall(() =>
            this.#native.emitException(toBytes(payload, "payload")),
        );
    }

    /** Report progress of the current request (raw uint32 value). */
    progress(value: number): void {
        bindingCall(() => this.#native.progress(value));
    }

    /** Perform a generic IO request to the given domain. */
    gio({ domain, id }: GioRequest): GioResponse {
        return bindingCall(() => this.#native.gio(domain, toBytes(id, "id")));
    }

    /** Load the outputs merkle tree state from a file. */
    loadMerkle(file: string): void {
        bindingCall(() => this.#native.loadMerkle(String(file)));
    }

    /** Store the outputs merkle tree state to a file. */
    saveMerkle(file: string): void {
        bindingCall(() => this.#native.saveMerkle(String(file)));
    }

    /** Reset the outputs merkle tree to pristine state. */
    resetMerkle(): void {
        bindingCall(() => this.#native.resetMerkle());
    }

    /** Release the underlying device. Further calls throw. */
    close(): void {
        bindingCall(() => this.#native.close());
    }

    /**
     * Convenience request loop. Handlers receive (request, rollup), may be
     * async, and accept the request unless they return false (exceptions
     * reject and are reported). Runs until finish fails (e.g. mock inputs are
     * exhausted, or the device is closed), which rejects with that error.
     */
    async run(handlers: RunHandlers = {}): Promise<never> {
        let accept = true;
        for (;;) {
            const request = this.finish({ accept });
            try {
                if (request.type === "advance") {
                    accept = handlers.advance
                        ? (await handlers.advance(request, this)) !== false
                        : false;
                } else {
                    accept = handlers.inspect
                        ? (await handlers.inspect(request, this)) !== false
                        : false;
                }
            } catch (error) {
                accept = false;
                this.emitReport(
                    Buffer.from(String((error as Error)?.stack ?? error)),
                );
            }
        }
    }
}
