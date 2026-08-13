import type { InspectRequest, RollupContext } from "@deroll/core";
import { stringToHex } from "viem";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { type Handler, type Router, createRouter } from "../src/index.js";

// build a libcmt-shaped inspect request from a query string
const inspect = (url: string): InspectRequest => ({
    type: "inspect",
    payload: Buffer.from(url, "utf8"),
});

describe("Router", () => {
    let rollup: RollupContext;
    let router: Router;

    beforeEach(() => {
        // RollupContext is a structural slice of Rollup, so a plain fake is
        // assignable — no mocking library needed
        rollup = {
            emitNotice: vi.fn(),
            emitReport: vi.fn(),
            emitVoucher: vi.fn(),
            emitDelegateCallVoucher: vi.fn(),
            emitException: vi.fn(),
            progress: vi.fn(),
            gio: vi.fn(),
        };
        router = createRouter();
    });

    test("no routes", () => {
        router.handler(inspect("test"), rollup);
        expect(rollup.emitReport).toHaveBeenCalledTimes(0);
    });

    test("simple route", () => {
        router.add("ping", (_a, _b) => "pong");
        router.handler(inspect("ping"), rollup);
        expect(rollup.emitReport).toHaveBeenCalledWith(stringToHex("pong"));
    });

    test("single param", () => {
        router.add("tests/:id", () => "pong");
        router.handler(inspect("tests/123"), rollup);
        expect(rollup.emitReport).toHaveBeenCalledWith(stringToHex("pong"));
    });

    test("two params", () => {
        router.add("tests/:id/second/:name", () => "pong");
        router.handler(inspect("tests/123/second/cool"), rollup);
        expect(rollup.emitReport).toHaveBeenCalledWith(stringToHex("pong"));
    });

    test("typed params", () => {
        const handler: Handler<{ id: string }> = (a, _b) => a.params.id;
        router.add("tests/:id", handler);
        router.handler(inspect("tests/123"), rollup);
        expect(rollup.emitReport).toHaveBeenCalledWith(stringToHex("123"));
    });
});
