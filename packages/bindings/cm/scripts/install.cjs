#!/usr/bin/env node
// Install-time native binding resolution:
// 1. If the platform-specific prebuilt package (an optionalDependency of the
//    published @deroll/cm) is installed, there is nothing to build.
// 2. Otherwise defer to node-gyp-build, which reuses a local prebuilds/ or
//    build/ directory if present and compiles from source as a last resort
//    (requires a C++23 compiler and boost headers).
"use strict";

const { execFileSync, execSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");

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
    // Preflight the two most common source-build failures with actionable
    // errors instead of a wall of compiler output.
    const emulatorDir =
        process.env.MACHINE_EMULATOR_DIR ||
        path.join(root, "deps", "machine-emulator");
    if (!existsSync(path.join(emulatorDir, "src", "machine.cpp"))) {
        console.error(
            `@deroll/cm: machine-emulator sources not found at ${emulatorDir}.\n` +
                "If this is a git checkout, run: git submodule update --init",
        );
        process.exit(1);
    }

    const boostCandidates = [
        process.env.BOOST_INC,
        "/usr/include",
        "/usr/local/include",
        "/opt/homebrew/include",
        "/opt/local/include",
    ].filter(Boolean);
    if (process.platform === "darwin") {
        try {
            const brewPrefix = execSync("brew --prefix", {
                stdio: ["ignore", "pipe", "ignore"],
            })
                .toString()
                .trim();
            boostCandidates.push(path.join(brewPrefix, "include"));
        } catch {
            // no homebrew
        }
    }
    const hasBoost = boostCandidates.some((dir) =>
        existsSync(path.join(dir, "boost", "version.hpp")),
    );
    if (!hasBoost) {
        console.error(
            "@deroll/cm: boost headers not found (looked in: " +
                `${boostCandidates.join(", ")}).\n` +
                "Install them (Debian/Ubuntu: apt install libboost-dev; " +
                "macOS: brew install boost) or set BOOST_INC to the include directory.",
        );
        process.exit(1);
    }
}

execFileSync(process.execPath, [require.resolve("node-gyp-build/bin.js")], {
    stdio: "inherit",
});
