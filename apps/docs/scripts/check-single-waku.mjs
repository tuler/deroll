// Fails the build when `waku` resolves to more than one physical copy.
//
// vocs declares `waku` as a peer dependency and this app satisfies it, so the
// two resolve `waku` independently. Under bun's isolated linker a package gets
// a separate copy per distinct dependency graph, so any divergence between the
// two graphs — even in an unrelated optional peer such as `tsx`, which changes
// which `vite` copy `waku` gets — silently yields two `waku` instances.
//
// Both then end up in the client bundle: vocs' components read waku's router
// context from one copy while the `Router` provider comes from the other, and
// hydration dies with "Missing Router". Nothing fails at build time and SSR
// still renders, so the only symptom is the page painting and then vanishing
// in the browser. Catch it here instead.

import { createRequire } from "node:module";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const requireFromApp = createRequire(path.join(appDir, "package.json"));

// vocs does not export "./package.json", so resolve its main entry instead —
// that is enough to anchor a require() at vocs' own copy of node_modules.
const vocsEntry = requireFromApp.resolve("vocs");
const requireFromVocs = createRequire(vocsEntry);

const fromApp = requireFromApp.resolve("waku/package.json");
const fromVocs = requireFromVocs.resolve("waku/package.json");

if (fromApp !== fromVocs) {
    console.error(
        [
            "",
            "[docs] `waku` resolves to two different copies:",
            `  from this app: ${fromApp}`,
            `  from vocs:     ${fromVocs}`,
            "",
            "The client bundle would contain two waku router instances and every page",
            'would blank out on hydration with "Missing Router".',
            "",
            "Two causes, in order of likelihood:",
            "",
            "1. A stale node_modules. `bun install` does not re-link packages it already",
            "   considers satisfied, so a tree built before the dedupe keeps both copies",
            "   even once the lockfile is correct. Re-run the install with --force, or",
            "   delete node_modules. This is why apps/docs/vercel.json passes --force:",
            "   Vercel restores node_modules from its build cache.",
            "",
            "2. A dependency shared with vocs resolved to two versions. Diff the two",
            "   copies' node_modules to find it, then pin it with an `overrides` entry",
            "   in the root package.json.",
            "",
        ].join("\n"),
    );
    process.exit(1);
}
