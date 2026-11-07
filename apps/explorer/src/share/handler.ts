// The /api/share endpoint, written against the Fetch API's Request and
// Response so the same code runs as a Vercel function and inside the Vite dev
// server. Storage is injected: Upstash Redis on Vercel, memory in development.
//
//   POST /api/share        snapshot JSON  ->  201 { "key": "Xy7kQ2" }
//   GET  /api/share/:key                  ->  200 snapshot JSON

import {
    DIGEST_LENGTH,
    KEY_LENGTH,
    KEY_PATTERN,
    MAX_SNAPSHOT_BYTES,
    parseSnapshot,
    serializeSnapshot,
    SnapshotError,
    digest,
} from "./snapshot.js";

export interface ShareStore {
    get(key: string): Promise<string | null>;
    /** Stores the value unless the key exists; true when it was stored. */
    setIfAbsent(key: string, value: string): Promise<boolean>;
}

/** A store that lives as long as the process: enough for local development. */
export function memoryStore(): ShareStore {
    const map = new Map<string, string>();
    return {
        get: async (key) => map.get(key) ?? null,
        setIfAbsent: async (key, value) => {
            if (map.has(key)) return false;
            map.set(key, value);
            return true;
        },
    };
}

function json(status: number, body: unknown, headers?: Record<string, string>) {
    return Response.json(body, { status, headers });
}

function error(status: number, message: string) {
    return json(status, { error: message }, { "Cache-Control": "no-store" });
}

/**
 * Stores the snapshot under the shortest prefix of its digest that is free or
 * already holds it. Keys derive from content, so sharing the same
 * configuration twice yields the same link, and no key is ever overwritten.
 */
async function publish(request: Request, store: ShareStore) {
    const text = await request.text();
    if (new TextEncoder().encode(text).length > MAX_SNAPSHOT_BYTES)
        return error(413, "snapshot is too large");

    let canonical: string;
    try {
        canonical = serializeSnapshot(parseSnapshot(JSON.parse(text)));
    } catch (e) {
        if (e instanceof SnapshotError) return error(400, e.message);
        return error(400, "body must be JSON");
    }

    const hash = await digest(canonical);
    for (let length = KEY_LENGTH; length <= DIGEST_LENGTH; length++) {
        const key = hash.slice(0, length);
        if (
            (await store.setIfAbsent(key, canonical)) ||
            (await store.get(key)) === canonical
        )
            return json(201, { key }, { "Cache-Control": "no-store" });
    }
    // Only reachable if two snapshots share a full SHA-256.
    return error(500, "no free key");
}

async function resolve(key: string, store: ShareStore) {
    if (!KEY_PATTERN.test(key)) return error(404, "no such link");
    const value = await store.get(key);
    if (value === null) return error(404, "no such link");
    // A key never changes what it names, so CDNs and browsers may keep it.
    return new Response(value, {
        headers: {
            "Content-Type": "application/json",
            "Cache-Control":
                "public, max-age=31536000, s-maxage=31536000, immutable",
        },
    });
}

export async function handleShare(
    request: Request,
    store: ShareStore,
): Promise<Response> {
    const path = new URL(request.url).pathname.replace(/\/+$/, "");
    const match = /^\/api\/share(?:\/([^/]+))?$/.exec(path);
    if (!match) return error(404, "not found");
    const key = match[1];

    if (key === undefined) {
        if (request.method !== "POST")
            return error(405, "use POST to create a link");
        return publish(request, store);
    }
    if (request.method !== "GET" && request.method !== "HEAD")
        return error(405, "use GET to resolve a link");
    return resolve(key, store);
}
