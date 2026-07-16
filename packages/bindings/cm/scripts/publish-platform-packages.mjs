#!/usr/bin/env node
// Publishes every npm/<platform> prebuilt package whose binaries are present
// (collected from the per-platform CI artifacts) and whose version is not on
// npm yet. Run right before `changeset publish` so the platform packages
// exist by the time the @deroll/cm version referencing them goes live.
// Idempotent: already-published versions and scaffolds without binaries are
// skipped, so re-runs and Version-PR builds are no-ops.
//
// The dist-tag mirrors what `changeset publish` uses for the workspace
// packages: the changesets pre-mode tag when active (npm also refuses to
// publish a prerelease version without an explicit --tag), "latest"
// otherwise.
//
// Auth follows the ambient npm configuration (OIDC trusted publishing in
// CI; all four platform packages have trusted publishers configured).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(root, "..", "..", "..");
const version = JSON.parse(
    readFileSync(path.join(root, "package.json"), "utf8"),
).version;

const distTag = () => {
    try {
        const pre = JSON.parse(
            readFileSync(path.join(repoRoot, ".changeset", "pre.json"), "utf8"),
        );
        if (pre.mode === "pre" && pre.tag) {
            return pre.tag;
        }
    } catch {
        // not in pre mode
    }
    // fallback: derive from the version's prerelease identifier
    return version.split("-")[1]?.split(".")[0] ?? "latest";
};
const tag = distTag();

for (const entry of readdirSync(path.join(root, "npm"), {
    withFileTypes: true,
})) {
    if (!entry.isDirectory()) {
        continue;
    }
    const dir = path.join(root, "npm", entry.name);
    const pkgPath = path.join(dir, "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    if (!existsSync(path.join(dir, "cartesi_machine.node"))) {
        console.log(`skip ${pkg.name}: no binaries collected`);
        continue;
    }
    // version lockstep with @deroll/cm (idempotent re-stamp)
    pkg.version = version;
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 4)}\n`);
    try {
        execFileSync("npm", ["view", `${pkg.name}@${version}`, "version"], {
            stdio: "pipe",
        });
        console.log(`skip ${pkg.name}@${version}: already published`);
        continue;
    } catch {
        // not published yet
    }
    console.log(`publishing ${pkg.name}@${version} (tag: ${tag})`);
    execFileSync("npm", ["publish", "--access", "public", "--tag", tag], {
        cwd: dir,
        stdio: "inherit",
    });
}
