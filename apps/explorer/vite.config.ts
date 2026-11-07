import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cartesiIconDataUri } from "@cartesi/brand/logos";
import pkg from "./package.json";
import { handleShare, memoryStore } from "./src/share/handler.ts";

/**
 * Serves /api/share from the dev and preview servers with an in-memory store,
 * so share links work locally without Vercel or Redis. Links last until the
 * server restarts. On Vercel the same handler runs as api/share/*.
 */
function shareApi(): Plugin {
    const store = memoryStore();
    const middleware = async (
        req: IncomingMessage,
        res: ServerResponse,
        next: (error?: unknown) => void,
    ) => {
        if (!req.url?.startsWith("/api/share")) return next();
        try {
            const chunks: Buffer[] = [];
            for await (const chunk of req) chunks.push(chunk as Buffer);
            const headers = new Headers();
            for (const [name, value] of Object.entries(req.headers)) {
                if (typeof value === "string") headers.set(name, value);
            }
            const response = await handleShare(
                new Request(new URL(req.url, "http://localhost"), {
                    method: req.method,
                    headers,
                    body: chunks.length ? Buffer.concat(chunks) : undefined,
                }),
                store,
            );
            res.statusCode = response.status;
            for (const [name, value] of response.headers)
                res.setHeader(name, value);
            res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
            next(error);
        }
    };
    return {
        name: "share-api",
        configureServer: (server) => {
            server.middlewares.use(middleware);
        },
        configurePreviewServer: (server) => {
            server.middlewares.use(middleware);
        },
    };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "VITE_");

    // Base URL of the esm.sh that serves GitHub-hosted decoders — must match the
    // default in src/decoder/github.ts. Override with VITE_ESM_BASE.
    const esmBase = (env.VITE_ESM_BASE || "https://esm.sh").replace(/\/+$/, "");

    // A GitHub-hosted decoder imports the kit as a bare `@deroll/decoder` and
    // is served by esm.sh with that import left external (see github.ts). This
    // import map resolves that bare specifier to the kit's own GitHub source on
    // esm.sh, so a kit-using decoder needs nothing published to a registry.
    // Pinned to a commit — esm.sh resolves floating refs like a branch name at
    // request time and intermittently fails doing so, taking every kit-using
    // decoder down with it. Bump the sha when packages/explorer/decoder changes.
    // Relocate or re-pin with VITE_KIT_URL.
    const kitUrl =
        env.VITE_KIT_URL ||
        `${esmBase}/gh/tuler/deroll@6fa614d/packages/explorer/decoder/src/index.ts`;

    // viem (byte/ABI work) and @cartesi/codec (the protocol's on-chain
    // formats) are the blessed libraries for decoders: they import them bare
    // (esm.sh leaves them external, see src/decoder/github.ts) and this import
    // map resolves them — pinned to the versions the explorer itself depends
    // on, so authors bundle nothing and every decoder shares one vetted copy.
    // codec's own viem import stays external too, so it resolves through this
    // same map to the single pinned viem.
    const viemVersion = pkg.dependencies.viem.replace(/^[^\d]*/, "");
    const codecVersion = pkg.dependencies["@cartesi/codec"];
    const importMap = JSON.stringify({
        imports: {
            "@deroll/decoder": kitUrl,
            "@cartesi/codec": `${esmBase}/@cartesi/codec@${codecVersion}?external=viem`,
            viem: `${esmBase}/viem@${viemVersion}`,
            "viem/": `${esmBase}/viem@${viemVersion}/`,
        },
    });

    return {
        plugins: [
            react(),
            tailwindcss(),
            shareApi(),
            {
                // The Cartesi icon on a cyan tile, inlined from @cartesi/brand
                // so the favicon tracks the package instead of a copied file.
                name: "cartesi-favicon",
                transformIndexHtml: () => [
                    {
                        tag: "link",
                        attrs: {
                            rel: "icon",
                            type: "image/svg+xml",
                            href: cartesiIconDataUri,
                        },
                        injectTo: "head",
                    },
                ],
            },
            {
                name: "decoder-kit-import-map",
                transformIndexHtml: () => [
                    {
                        tag: "script",
                        attrs: { type: "importmap" },
                        children: importMap,
                        injectTo: "head-prepend",
                    },
                ],
            },
        ],
    };
});
