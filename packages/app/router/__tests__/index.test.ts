import type { InspectRequest, Rollup } from "@cartesi/rollup";
import { stringToHex } from "viem";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { type Handler, type Router, createRouter } from "../src/index.js";

// build a libcmt-shaped inspect request from a query string
const inspect = (url: string): InspectRequest => ({
    type: "inspect",
    payload: Buffer.from(url, "utf8"),
});

describe("Router", () => {
    let rollup: Pick<Rollup, "emitReport">;
    let router: Router;

    beforeEach(() => {
        // the handler narrows its rollup parameter to what it uses, so a plain
        // fake is assignable — Rollup itself carries a #private brand
        rollup = { emitReport: vi.fn() };
        router = createRouter();
    });

    test("no routes", () => {
        expect(router.handler(inspect("test"), rollup)).toBe(false);
        expect(rollup.emitReport).toHaveBeenCalledTimes(0);
    });

    test("no matching route declines, so chain can fall through", () => {
        router.add("ping", () => "pong");
        expect(router.handler(inspect("nope"), rollup)).toBe(false);
        expect(rollup.emitReport).toHaveBeenCalledTimes(0);
    });

    test("simple route", () => {
        router.add("ping", (_a, _b) => "pong");
        expect(router.handler(inspect("ping"), rollup)).toBe(true);
        expect(rollup.emitReport).toHaveBeenCalledWith(stringToHex("pong"));
    });

    test("single param", () => {
        router.add("tests/:id", () => "pong");
        expect(router.handler(inspect("tests/123"), rollup)).toBe(true);
        expect(rollup.emitReport).toHaveBeenCalledWith(stringToHex("pong"));
    });

    test("two params", () => {
        router.add("tests/:id/second/:name", () => "pong");
        expect(router.handler(inspect("tests/123/second/cool"), rollup)).toBe(
            true,
        );
        expect(rollup.emitReport).toHaveBeenCalledWith(stringToHex("pong"));
    });

    test("typed params", () => {
        const handler: Handler<{ id: string }> = (a, _b) => a.params.id;
        router.add("tests/:id", handler);
        expect(router.handler(inspect("tests/123"), rollup)).toBe(true);
        expect(rollup.emitReport).toHaveBeenCalledWith(stringToHex("123"));
    });
});
