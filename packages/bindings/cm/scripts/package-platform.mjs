#!/usr/bin/env node
// Assembles the prebuilt package for the current platform under
// npm/<platform>-<arch>/: the N-API addon (cartesi_machine.node) and the
// cartesi-jsonrpc-machine server executable, stamped with the current
// @deroll/cm version. Reuses an existing build/Release (e.g. the one produced
// by the install script during `bun install`) and compiles one otherwise.
import { execFileSync } from "node:child_process";
import {
    chmodSync,
    copyFileSync,
    existsSync,
    readFileSync,
    readdirSync,
    writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");
const platform = `${process.platform}-${process.arch}`;
const outDir = path.join(root, "npm", platform);
const buildDir = path.join(root, "build", "Release");

if (!existsSync(path.join(outDir, "package.json"))) {
    console.error(`unsupported platform: no scaffold at npm/${platform}`);
    process.exit(1);
}

if (!existsSync(path.join(buildDir, "cartesi_machine.node"))) {
    execFileSync(
        process.execPath,
        [require.resolve("node-gyp/bin/node-gyp.js"), "rebuild"],
        { cwd: root, stdio: "inherit" },
    );
}

const artifacts = ["cartesi_machine.node", "cartesi-jsonrpc-machine"];
for (const artifact of artifacts) {
    copyFileSync(path.join(buildDir, artifact), path.join(outDir, artifact));
    chmodSync(path.join(outDir, artifact), 0o755);
}
const outputs = artifacts.map((artifact) => path.join(outDir, artifact));

// strip debug info; re-sign on macOS (stripping invalidates the ad-hoc
// signature the linker applied, and arm64 refuses to run unsigned binaries)
if (process.platform === "linux") {
    execFileSync("strip", ["--strip-all", ...outputs]);
} else if (process.platform === "darwin") {
    execFileSync("strip", ["-x", "-S", ...outputs]);
    execFileSync("codesign", ["--force", "--sign", "-", ...outputs]);
}

// Version lockstep with @deroll/cm. Every scaffold is stamped (not just the
// current platform's) so the npm/ trees uploaded by the per-platform CI jobs
// are identical except for the binaries and merge cleanly.
const version = JSON.parse(
    readFileSync(path.join(root, "package.json"), "utf8"),
).version;
for (const entry of readdirSync(path.join(root, "npm"), {
    withFileTypes: true,
})) {
    if (!entry.isDirectory()) {
        continue;
    }
    const pkgPath = path.join(root, "npm", entry.name, "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    pkg.version = version;
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 4)}\n`);
}

console.log(`assembled @deroll/cm-${platform}@${version} in npm/${platform}`);
