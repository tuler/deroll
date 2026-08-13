import type { App, InspectRequest } from "@deroll/core";
import { stringToHex } from "viem";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import { mock, mockClear } from "vitest-mock-extended";

import { type Handler, type Router, createRouter } from "../src/index.js";

// build a libcmt-shaped inspect request from a query string
const inspect = (url: string): InspectRequest => ({
    type: "inspect",
    payload: Buffer.from(url, "utf8"),
});

describe("Router", () => {
    let app: App;
    let router: Router;

    beforeAll(() => {
        app = mock<App>();
    });

    beforeEach(() => {
        mockClear(app);
        router = createRouter({ app });
    });

    test("no routes", () => {
        router.handler(inspect("test"));
        expect(app.createReport).toHaveBeenCalledTimes(0);
    });

    test("simple route", () => {
        router.add("ping", (_a, _b) => "pong");
        router.handler(inspect("ping"));
        expect(app.createReport).toHaveBeenCalledWith(stringToHex("pong"));
    });

    test("single param", () => {
        router.add("tests/:id", () => "pong");
        router.handler(inspect("tests/123"));
        expect(app.createReport).toHaveBeenCalledWith(stringToHex("pong"));
    });

    test("two params", () => {
        router.add("tests/:id/second/:name", () => "pong");
        router.handler(inspect("tests/123/second/cool"));
        expect(app.createReport).toHaveBeenCalledWith(stringToHex("pong"));
    });

    test("typed params", () => {
        const handler: Handler<{ id: string }> = (a, _b) => a.params.id;
        router.add("tests/:id", handler);
        router.handler(inspect("tests/123"));
        expect(app.createReport).toHaveBeenCalledWith(stringToHex("123"));
    });
});
