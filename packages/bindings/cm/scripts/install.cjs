#!/usr/bin/env node
// Install-time native binding resolution:
// 1. If the platform-specific prebuilt package (an optionalDependency of the
//    published @deroll/cm) is installed, there is nothing to build.
// 2. Otherwise defer to node-gyp-build, which reuses a local prebuilds/ or
//    build/ directory if present and compiles from source as a last resort
//    (requires a C++20 compiler and boost headers).
"use strict";

const { execFileSync } = require("node:child_process");

const platformPackage = `@deroll/cm-${process.platform}-${process.arch}`;
try {
    require.resolve(`${platformPackage}/cartesi_machine.node`);
    process.exit(0);
} catch {
    // not installed: fall through to node-gyp-build
}

execFileSync(process.execPath, [require.resolve("node-gyp-build/bin.js")], {
    stdio: "inherit",
});
