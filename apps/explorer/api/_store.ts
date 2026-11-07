// Upstash Redis behind the share endpoint. Files whose names start with an
// underscore are not deployed as functions; this one is only imported.
//
// Credentials come from UPSTASH_REDIS_REST_URL/_TOKEN, or the KV_REST_API_URL
// and KV_REST_API_TOKEN that the Vercel Marketplace integration injects.

import { Redis } from "@upstash/redis";
import type { ShareStore } from "../src/share/handler.js";

const PREFIX = "share:";

export function upstashStore(): ShareStore {
    // Snapshots are stored as their canonical text and served verbatim, so
    // the client must not parse them into objects on the way in or out.
    const redis = Redis.fromEnv({ automaticDeserialization: false });
    return {
        get: (key) => redis.get<string>(PREFIX + key),
        setIfAbsent: async (key, value) =>
            (await redis.set(PREFIX + key, value, { nx: true })) === "OK",
    };
}
