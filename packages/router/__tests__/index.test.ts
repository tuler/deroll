import { App } from "@deroll/core";
import { stringToHex } from "viem";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import { mock, mockClear } from "vitest-mock-extended";

import { Router, Handler, createRouter } from "../src";

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

    test("no routes", async () => {
        await router.handler({ payload: stringToHex("test") });
        expect(app.createReport).toHaveBeenCalledTimes(0);
    });

    test("simple route", async () => {
        router.add("ping", (_a, _b) => "pong");
        await router.handler({ payload: stringToHex("ping") });
        expect(app.createReport).toHaveBeenCalledWith({
            payload: stringToHex("pong"),
        });
    });

    test("single param", async () => {
        router.add("tests/:id", () => "pong");
        await router.handler({ payload: stringToHex("tests/123") });
        expect(app.createReport).toHaveBeenCalledWith({
            payload: stringToHex("pong"),
        });
    });

    test("two params", async () => {
        router.add("tests/:id/second/:name", () => "pong");
        await router.handler({ payload: stringToHex("tests/123/second/cool") });
        expect(app.createReport).toHaveBeenCalledWith({
            payload: stringToHex("pong"),
        });
    });

    test("typed params", async () => {
        const handler: Handler<{ id: string }> = (a, _b) => a.params.id;
        router.add("tests/:id", handler);
        await router.handler({ payload: stringToHex("tests/123") });
        expect(app.createReport).toHaveBeenCalledWith({
            payload: stringToHex("123"),
        });
    });
});
