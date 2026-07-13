#!/usr/bin/env node
// Adds the per-platform prebuilt packages to @deroll/cm's
// optionalDependencies, pinned to the exact version being published.
//
// This is a CI-only, uncommitted mutation (like scripts/resolve-workspace-deps
// at the repo root), run right before `changeset publish`. The entries are not
// kept in the source package.json on purpose: before a version is published
// the platform packages do not exist on npm at that version, which would break
// plain installs of a repo checkout.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const pkgPath = path.join(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

const platformPackages = readdirSync(path.join(root, "npm"), {
    withFileTypes: true,
})
    .filter((entry) => entry.isDirectory())
    .map((entry) =>
        JSON.parse(
            readFileSync(
                path.join(root, "npm", entry.name, "package.json"),
                "utf8",
            ),
        ),
    );

pkg.optionalDependencies = Object.fromEntries(
    platformPackages.map((platformPkg) => [platformPkg.name, pkg.version]),
);
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 4)}\n`);

console.log(
    `injected optionalDependencies into @deroll/cm@${pkg.version}:`,
    Object.keys(pkg.optionalDependencies).join(", "),
);
