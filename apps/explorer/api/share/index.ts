// POST /api/share — see src/share/handler.ts.

import { handleShare } from "../../src/share/handler.js";
import { upstashStore } from "../_store.js";

const store = upstashStore();

export function POST(request: Request): Promise<Response> {
    return handleShare(request, store);
}
