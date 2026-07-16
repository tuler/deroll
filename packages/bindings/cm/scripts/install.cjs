#!/usr/bin/env node
// Install-time native binding resolution:
// 1. If the platform-specific prebuilt package (an optionalDependency of the
//    published @deroll/cm) is installed, there is nothing to build.
// 2. Otherwise defer to node-gyp-build, which reuses a local prebuilds/ or
//    build/ directory if present and compiles the addon as a last resort,
//    linking against the static libraries of an installed cartesi-machine
//    emulator distribution.
"use strict";

const { execFileSync } = require("node:child_process");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");

// emulator version series the binding targets
const CARTESI_MACHINE_SERIES = "0.20";

const platformPackage = `@deroll/cm-${process.platform}-${process.arch}`;
try {
    require.resolve(`${platformPackage}/cartesi_machine.node`);
    process.exit(0);
} catch {
    // not installed: fall through to node-gyp-build
}

const root = path.resolve(__dirname, "..");

// already compiled (or a local prebuild is present): node-gyp-build loads it
const compiled =
    existsSync(path.join(root, "build", "Release", "cartesi_machine.node")) ||
    existsSync(path.join(root, "build", "Debug", "cartesi_machine.node")) ||
    existsSync(path.join(root, "prebuilds"));

if (!compiled) {
    // Preflight the most common source-build failure — no emulator
    // installation — with an actionable error instead of compiler output.
    const run = (kind) =>
        execFileSync(
            process.execPath,
            [path.join(__dirname, "find-cartesi.cjs"), kind],
            { stdio: ["ignore", "pipe", "inherit"] },
        )
            .toString()
            .trim();
    const inc = run("include");
    const lib = run("lib");
    if (
        !existsSync(path.join(inc, "machine-c-api.h")) ||
        !existsSync(path.join(lib, "libcartesi.a"))
    ) {
        console.error(
            "@deroll/cm: cartesi-machine emulator installation not found " +
                `(looked for headers in ${inc} and libcartesi.a in ${lib}).\n` +
                "Install the emulator first:\n" +
                "  Debian/Ubuntu: the machine-emulator .deb from " +
                "https://github.com/cartesi/machine-emulator/releases\n" +
                "  macOS: brew install cartesi/tap/cartesi-machine-emulator\n" +
                "or point CARTESI_INC / CARTESI_LIB at the installation.",
        );
        process.exit(1);
    }

    // The binding targets a specific emulator series; catch mismatched
    // installations (e.g. an older brew formula) before the compiler does.
    const versionHeader = path.join(inc, "machine-c-version.h");
    if (existsSync(versionHeader)) {
        const header = readFileSync(versionHeader, "utf8");
        const major = header.match(/#define CM_VERSION_MAJOR (\d+)/)?.[1];
        const minor = header.match(/#define CM_VERSION_MINOR (\d+)/)?.[1];
        const series = `${major}.${minor}`;
        if (major !== undefined && series !== CARTESI_MACHINE_SERIES) {
            console.error(
                `@deroll/cm: found cartesi-machine emulator ${series}.x in ${inc}, ` +
                    `but this version of the binding requires ${CARTESI_MACHINE_SERIES}.x.\n` +
                    "Upgrade the emulator installation, or point CARTESI_INC / " +
                    "CARTESI_LIB at a matching one.",
            );
            process.exit(1);
        }
    }
}

execFileSync(process.execPath, [require.resolve("node-gyp-build/bin.js")], {
    stdio: "inherit",
});
