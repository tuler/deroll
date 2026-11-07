import { getAddress } from "viem";
import { afterEach, describe, expect, test, vi } from "vitest";
import { fetchSnapshot, publishSnapshot } from "../src/share/client";
import {
    handleShare,
    memoryStore,
    type ShareStore,
} from "../src/share/handler";
import {
    digest,
    KEY_LENGTH,
    parseSnapshot,
    serializeSnapshot,
    SnapshotError,
} from "../src/share/snapshot";

const APP_A = "0x1111111111111111111111111111111111111111";
const APP_B = getAddress("0xabcdefabcdefabcdefabcdefabcdefabcdefabcd");
const SUBMITTER = "0x2222222222222222222222222222222222222222";

const snapshot = {
    v: 1,
    server: " https://node.example/rpc ",
    apps: {
        [APP_B]: { decoder: "gh:owner/repo@main/decoder.ts" },
        [APP_A]: { submitter: SUBMITTER, decoder: "https://x.example/d.js" },
    },
};

function post(body: string) {
    return new Request("http://test/api/share", { method: "POST", body });
}

describe("parseSnapshot", () => {
    test("canonicalizes order, case and whitespace", () => {
        const parsed = parseSnapshot(snapshot);
        expect(serializeSnapshot(parsed)).toBe(
            JSON.stringify({
                v: 1,
                server: "https://node.example/rpc",
                apps: {
                    [APP_A]: {
                        decoder: "https://x.example/d.js",
                        submitter: SUBMITTER,
                    },
                    [APP_B.toLowerCase()]: {
                        decoder: "gh:owner/repo@main/decoder.ts",
                    },
                },
            }),
        );
        // Idempotent: parsing the canonical form changes nothing.
        expect(parseSnapshot(JSON.parse(serializeSnapshot(parsed)))).toEqual(
            parsed,
        );
    });

    test("drops applications with nothing configured", () => {
        const parsed = parseSnapshot({
            v: 1,
            server: "http://localhost:10011/rpc",
            apps: { [APP_A]: { decoder: "  " } },
        });
        expect(parsed.apps).toEqual({});
    });

    test.each([
        [{ v: 2, server: "http://a", apps: {} }],
        [{ v: 1, server: "ftp://a", apps: {} }],
        [{ v: 1, server: "http://a", apps: { nope: { decoder: "x" } } }],
        [{ v: 1, server: "http://a", apps: { [APP_A]: { submitter: "0x1" } } }],
        [
            {
                v: 1,
                server: "http://a",
                apps: {
                    [APP_B]: { decoder: "x" },
                    [APP_B.toLowerCase()]: { decoder: "y" },
                },
            },
        ],
    ])("rejects %j", (value) => {
        expect(() => parseSnapshot(value)).toThrow(SnapshotError);
    });
});

describe("digest", () => {
    test("is 43 base62 digits and stable", async () => {
        const hash = await digest("hello");
        expect(hash).toMatch(/^[0-9A-Za-z]{43}$/);
        expect(await digest("hello")).toBe(hash);
        expect(await digest("hello!")).not.toBe(hash);
    });
});

describe("handleShare", () => {
    test("round-trips a snapshot under a short, content-derived key", async () => {
        const store = memoryStore();
        const created = await handleShare(
            post(JSON.stringify(snapshot)),
            store,
        );
        expect(created.status).toBe(201);
        const { key } = (await created.json()) as { key: string };
        expect(key).toHaveLength(KEY_LENGTH);

        // Same content, different spelling: same key.
        const again = await handleShare(
            post(JSON.stringify(parseSnapshot(snapshot))),
            store,
        );
        expect(((await again.json()) as { key: string }).key).toBe(key);

        const fetched = await handleShare(
            new Request(`http://test/api/share/${key}`),
            store,
        );
        expect(fetched.status).toBe(200);
        expect(fetched.headers.get("Cache-Control")).toContain("immutable");
        expect(await fetched.text()).toBe(
            serializeSnapshot(parseSnapshot(snapshot)),
        );
    });

    test("lengthens the key on a collision instead of overwriting", async () => {
        const canonical = serializeSnapshot(parseSnapshot(snapshot));
        const hash = await digest(canonical);
        const store = memoryStore();
        await store.setIfAbsent(hash.slice(0, KEY_LENGTH), "someone else");

        const response = await handleShare(post(canonical), store);
        const { key } = (await response.json()) as { key: string };
        expect(key).toBe(hash.slice(0, KEY_LENGTH + 1));
        expect(await store.get(hash.slice(0, KEY_LENGTH))).toBe("someone else");
    });

    test("rejects bad input and unknown keys", async () => {
        const store = memoryStore();
        expect((await handleShare(post("not json"), store)).status).toBe(400);
        expect(
            (await handleShare(post(JSON.stringify({ v: 1 })), store)).status,
        ).toBe(400);
        expect(
            (await handleShare(post("x".repeat(17 * 1024)), store)).status,
        ).toBe(413);
        expect(
            (
                await handleShare(
                    new Request("http://test/api/share/zzzzzz"),
                    store,
                )
            ).status,
        ).toBe(404);
        expect(
            (await handleShare(new Request("http://test/api/share"), store))
                .status,
        ).toBe(405);
    });
});

describe("client", () => {
    let store: ShareStore;

    function serve() {
        store = memoryStore();
        vi.stubGlobal("fetch", (input: string, init?: RequestInit) =>
            handleShare(
                new Request(new URL(input, "http://test"), init),
                store,
            ),
        );
    }

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test("publishes and fetches back the canonical snapshot", async () => {
        serve();
        const key = await publishSnapshot(parseSnapshot(snapshot));
        expect(await fetchSnapshot(key)).toEqual(parseSnapshot(snapshot));
    });

    test("refuses a snapshot that does not hash to its key", async () => {
        serve();
        const key = await publishSnapshot(parseSnapshot(snapshot));
        const tampered = parseSnapshot({ ...snapshot, server: "http://evil" });
        store.get = async () => serializeSnapshot(tampered);
        await expect(fetchSnapshot(key)).rejects.toThrow(/does not match/);
    });
});
