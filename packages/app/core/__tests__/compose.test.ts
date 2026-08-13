import { describe, expect, test, vi } from "vitest";

import { all, broadcast, chain } from "../src/compose.js";
import type {
    AdvanceRequest,
    InspectRequest,
    RollupContext,
} from "../src/types.js";

const advance: AdvanceRequest = {
    type: "advance",
    chainId: 1n,
    appContract: "0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e",
    msgSender: "0x18930e8a66a1DbE21D00581216789AAB7460Afd0",
    blockNumber: 0n,
    blockTimestamp: 0n,
    prevRandao: 0n,
    index: 0n,
    payload: Buffer.from("deadbeef", "hex"),
};

const inspect: InspectRequest = {
    type: "inspect",
    payload: Buffer.from("query", "utf8"),
};

// RollupContext is a structural slice of Rollup, so a plain fake is assignable
const rollup = (): RollupContext => ({
    emitNotice: vi.fn(() => 0n),
    emitReport: vi.fn(),
    emitVoucher: vi.fn(() => 0n),
    emitDelegateCallVoucher: vi.fn(() => 0n),
    emitException: vi.fn(),
    progress: vi.fn(),
    gio: vi.fn(() => ({ responseCode: 0, responseData: Buffer.alloc(0) })),
});

describe("chain", () => {
    test("declines when there are no handlers", async () => {
        expect(await chain()(advance, rollup())).toBe(false);
    });

    test("declines when every handler declines", async () => {
        const a = vi.fn(() => false);
        const b = vi.fn(() => false);
        expect(await chain(a, b)(advance, rollup())).toBe(false);
        expect(a).toHaveBeenCalledTimes(1);
        expect(b).toHaveBeenCalledTimes(1);
    });

    test("stops at the first handler that accepts", async () => {
        const a = vi.fn(() => false);
        const b = vi.fn(() => true);
        const c = vi.fn(() => true);
        expect(await chain(a, b, c)(advance, rollup())).toBe(true);
        expect(a).toHaveBeenCalledTimes(1);
        expect(b).toHaveBeenCalledTimes(1);
        expect(c).not.toHaveBeenCalled();
    });

    test("awaits async handlers", async () => {
        const a = vi.fn(async () => false);
        const b = vi.fn(async () => true);
        expect(await chain(a, b)(advance, rollup())).toBe(true);
    });

    test("passes the request and rollup through", async () => {
        const ctx = rollup();
        const handler = vi.fn(() => true);
        await chain(handler)(advance, ctx);
        expect(handler).toHaveBeenCalledWith(advance, ctx);
    });

    test("lets a handler exception propagate to the loop", async () => {
        const boom = () => {
            throw new Error("boom");
        };
        const after = vi.fn(() => true);
        await expect(chain(boom, after)(advance, rollup())).rejects.toThrow(
            "boom",
        );
        // the loop rejects the request; later handlers must not run
        expect(after).not.toHaveBeenCalled();
    });
});

describe("broadcast", () => {
    test("runs every handler even after one accepts", async () => {
        const a = vi.fn(() => true);
        const b = vi.fn(() => false);
        const c = vi.fn(() => false);
        expect(await broadcast(a, b, c)(advance, rollup())).toBe(true);
        expect(b).toHaveBeenCalledTimes(1);
        expect(c).toHaveBeenCalledTimes(1);
    });

    test("declines when every handler declines", async () => {
        expect(
            await broadcast(
                () => false,
                () => false,
            )(advance, rollup()),
        ).toBe(false);
    });
});

describe("all", () => {
    test("runs every inspect handler in order", async () => {
        const seen: number[] = [];
        await all(
            () => {
                seen.push(1);
            },
            async () => {
                seen.push(2);
            },
        )(inspect, rollup());
        expect(seen).toEqual([1, 2]);
    });
});
