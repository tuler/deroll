#!/usr/bin/env node
// Publishes every npm/<platform> prebuilt package whose binaries are present
// (collected from the per-platform CI artifacts) and whose version is not on
// npm yet. Run right before `changeset publish` so the platform packages
// exist by the time the @deroll/cm version referencing them goes live.
// Idempotent: already-published versions and scaffolds without binaries are
// skipped, so re-runs and Version-PR builds are no-ops.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const version = JSON.parse(
    readFileSync(path.join(root, "package.json"), "utf8"),
).version;

const isPublished = (name) => {
    try {
        execFileSync("npm", ["view", `${name}@${version}`, "version"], {
            stdio: "pipe",
        });
        return true;
    } catch {
        return false;
    }
};

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
    if (isPublished(pkg.name)) {
        console.log(`skip ${pkg.name}@${version}: already published`);
        continue;
    }
    console.log(`publishing ${pkg.name}@${version}`);
    execFileSync("npm", ["publish", "--access", "public"], {
        cwd: dir,
        stdio: "inherit",
    });
}
