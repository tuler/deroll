import {
    digest,
    KEY_PATTERN,
    parseSnapshot,
    serializeSnapshot,
    type Snapshot,
} from "./snapshot.js";

async function failure(response: Response): Promise<Error> {
    const body = (await response.json().catch(() => null)) as {
        error?: string;
    } | null;
    return new Error(body?.error ?? `HTTP ${response.status}`);
}

/** Stores a snapshot and returns the key that names it. */
export async function publishSnapshot(snapshot: Snapshot): Promise<string> {
    const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: serializeSnapshot(parseSnapshot(snapshot)),
    });
    if (!response.ok) throw await failure(response);
    const { key } = (await response.json()) as { key: string };
    return key;
}

/**
 * Fetches the snapshot a key names, and checks that it hashes to that key.
 * The check makes a link tamper-evident: whatever serves it cannot swap in a
 * different snapshot (a decoder is code), only fail to answer.
 */
export async function fetchSnapshot(key: string): Promise<Snapshot> {
    if (!KEY_PATTERN.test(key)) throw new Error("malformed share link");
    const response = await fetch(`/api/share/${key}`);
    if (response.status === 404)
        throw new Error("this share link does not exist");
    if (!response.ok) throw await failure(response);
    const snapshot = parseSnapshot(await response.json());
    if (!(await digest(serializeSnapshot(snapshot))).startsWith(key))
        throw new Error("the shared configuration does not match its link");
    return snapshot;
}
