// The explorer configuration a share link carries, and the content-derived key
// that names it. Shared by the browser and the /api/share function, so both
// sides agree byte for byte on what a snapshot is and which key it gets.

import { type Address, getAddress, isAddress } from "viem";

/** Query param of a share link: `?c=<key>`. */
export const SHARE_PARAM = "c";

/** Characters of the digest a key starts with; longer only on a collision. */
export const KEY_LENGTH = 6;

/** Characters in a full digest: the fewest base62 digits that hold 256 bits. */
export const DIGEST_LENGTH = 43;

/** Anything shaped like a key; whether one exists is the store's business. */
export const KEY_PATTERN = new RegExp(
    `^[0-9A-Za-z]{${KEY_LENGTH},${DIGEST_LENGTH}}$`,
);

/** Upper bound on a serialized snapshot, so the store is not a free paste bin. */
export const MAX_SNAPSHOT_BYTES = 16 * 1024;

const MAX_URL_LENGTH = 2048;
const MAX_APPS = 100;

/** One application's configuration, keyed by its contract address. */
export interface AppConfig {
    decoder?: string;
    submitter?: Address;
}

export interface Snapshot {
    v: 1;
    /** JSON-RPC URL of the node. */
    server: string;
    /** Keyed by lowercase application contract address. */
    apps: Record<string, AppConfig>;
}

export class SnapshotError extends Error {}

function fail(message: string): never {
    throw new SnapshotError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseServer(value: unknown): string {
    if (typeof value !== "string") fail("server must be a string");
    const server = value.trim();
    if (server.length > MAX_URL_LENGTH) fail("server URL is too long");
    let url: URL;
    try {
        url = new URL(server);
    } catch {
        fail("server must be a URL");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:")
        fail("server must be an http(s) URL");
    return server;
}

function parseApp(value: unknown): AppConfig {
    if (!isRecord(value)) fail("each application must be an object");
    const app: AppConfig = {};
    // Decoders are not only URLs: the gh:owner/repo@ref/path.ts shorthand is
    // accepted too, so this only bounds the string.
    if (value.decoder !== undefined) {
        if (typeof value.decoder !== "string") fail("decoder must be a string");
        const decoder = value.decoder.trim();
        if (decoder.length > MAX_URL_LENGTH) fail("decoder URL is too long");
        if (decoder) app.decoder = decoder;
    }
    if (value.submitter !== undefined) {
        if (typeof value.submitter !== "string" || !isAddress(value.submitter))
            fail("submitter must be an address");
        app.submitter = getAddress(value.submitter);
    }
    return app;
}

/**
 * Validates a snapshot and returns it in canonical form: trimmed strings,
 * lowercase application keys in sorted order, checksummed submitters, and
 * applications with nothing configured dropped. Built in a fixed key order,
 * so `JSON.stringify` of the result is the canonical serialization.
 */
export function parseSnapshot(value: unknown): Snapshot {
    if (!isRecord(value)) fail("snapshot must be an object");
    if (value.v !== 1) fail("unsupported snapshot version");
    const server = parseServer(value.server);
    if (!isRecord(value.apps)) fail("apps must be an object");

    const entries: [string, AppConfig][] = [];
    for (const [address, config] of Object.entries(value.apps)) {
        if (!isAddress(address)) fail(`${address} is not an address`);
        const app = parseApp(config);
        if (app.decoder || app.submitter)
            entries.push([address.toLowerCase(), app]);
    }
    if (entries.length > MAX_APPS) fail("too many applications");
    entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    if (new Set(entries.map(([a]) => a)).size !== entries.length)
        fail("an application is listed twice");

    const apps: Record<string, AppConfig> = {};
    for (const [address, app] of entries) {
        // Rebuilt so the property order is fixed whatever the input's was.
        apps[address] = {
            ...(app.decoder && { decoder: app.decoder }),
            ...(app.submitter && { submitter: app.submitter }),
        };
    }
    return { v: 1, server, apps };
}

/** The canonical serialization of an already-parsed snapshot. */
export function serializeSnapshot(snapshot: Snapshot): string {
    return JSON.stringify(snapshot);
}

const ALPHABET =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/**
 * SHA-256 of the text as 43 base62 digits, least significant first, so any
 * prefix is uniformly distributed. A key is the shortest free prefix.
 */
export async function digest(text: string): Promise<string> {
    const bytes = new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
    );
    let n = 0n;
    for (const byte of bytes) n = (n << 8n) | BigInt(byte);
    let out = "";
    for (let i = 0; i < DIGEST_LENGTH; i++) {
        out += ALPHABET[Number(n % 62n)];
        n /= 62n;
    }
    return out;
}
