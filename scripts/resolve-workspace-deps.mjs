#!/usr/bin/env node
// Rewrites bun-specific dependency protocols (`workspace:`, `catalog:`) in
// every workspace package.json to concrete versions, in place.
//
// `changeset publish` shells out to `npm publish`, which packs package.json
// verbatim — unlike `pnpm publish`/`bun publish` it does not resolve these
// protocols. This is how @deroll/app 2.0.0-alpha.7/.8 shipped with
// `workspace:*` dependencies after the repo moved from pnpm to bun. The root
// `release` script runs this right before `changeset publish`; the CI checkout
// is ephemeral, so the mutated files are never committed.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const rootPkg = readJson(path.join(root, "package.json"));

// expand a workspace glob like "apps/*" or "packages/*/*" (only `*` segments)
const expand = (pattern) =>
    pattern.split("/").reduce(
        (dirs, segment) =>
            segment === "*"
                ? dirs.flatMap((dir) =>
                      readdirSync(dir, { withFileTypes: true })
                          .filter((entry) => entry.isDirectory())
                          .map((entry) => path.join(dir, entry.name)),
                  )
                : dirs
                      .map((dir) => path.join(dir, segment))
                      .filter(existsSync),
        [root],
    );

const packageDirs = (rootPkg.workspaces ?? [])
    .flatMap(expand)
    .filter((dir) => existsSync(path.join(dir, "package.json")));

const workspaceVersions = new Map(
    packageDirs
        .map((dir) => readJson(path.join(dir, "package.json")))
        .filter((pkg) => pkg.name)
        .map((pkg) => [pkg.name, pkg.version]),
);

const resolve = (name, range) => {
    if (range.startsWith("workspace:")) {
        const version = workspaceVersions.get(name);
        if (!version) {
            throw new Error(`${name}@${range}: not a workspace package`);
        }
        const spec = range.slice("workspace:".length);
        if (spec === "*") return version; // same as pnpm/bun: exact pin
        if (spec === "^" || spec === "~") return spec + version;
        return spec; // workspace:^1.2.3 -> ^1.2.3
    }
    if (range.startsWith("catalog:")) {
        const catalogName = range.slice("catalog:".length);
        const catalog =
            catalogName === ""
                ? rootPkg.catalog
                : rootPkg.catalogs?.[catalogName];
        const version = catalog?.[name];
        if (!version) {
            throw new Error(`${name}@${range}: not in catalog`);
        }
        return version;
    }
    return undefined;
};

const depFields = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
];

for (const dir of packageDirs) {
    const file = path.join(dir, "package.json");
    const pkg = readJson(file);
    let changed = false;
    for (const field of depFields) {
        for (const [name, range] of Object.entries(pkg[field] ?? {})) {
            const version = resolve(name, range);
            if (version !== undefined && version !== range) {
                pkg[field][name] = version;
                changed = true;
                console.log(`${pkg.name}: ${name} ${range} -> ${version}`);
            }
        }
    }
    if (changed) {
        writeFileSync(file, `${JSON.stringify(pkg, null, 4)}\n`);
    }
}
