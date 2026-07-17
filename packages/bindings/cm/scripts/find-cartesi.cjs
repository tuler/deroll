#!/usr/bin/env node
// Locates the installed cartesi-machine emulator distribution, which provides
// the C API headers (cm.h, cm-jsonrpc.h), the static libraries (libcartesi.a,
// libcartesi_jsonrpc.a) and the cartesi-jsonrpc-machine server executable.
//
// Usage: node find-cartesi.cjs include|lib|omp
//   include -> directory containing cm.h (override: CARTESI_INC)
//   lib     -> directory containing libcartesi.a (override: CARTESI_LIB)
//   omp     -> extra OpenMP linker flags for macOS (brew libomp), or nothing
"use strict";

const { execSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");

const brewPrefix = (formula) => {
    try {
        return execSync(`brew --prefix ${formula ?? ""}`, {
            stdio: ["ignore", "pipe", "ignore"],
        })
            .toString()
            .trim();
    } catch {
        return null;
    }
};

const firstExisting = (candidates, marker) =>
    candidates.find((dir) => dir && existsSync(path.join(dir, marker))) ??
    candidates.find(Boolean);

const kind = process.argv[2];
switch (kind) {
    case "include": {
        if (process.env.CARTESI_INC) {
            console.log(process.env.CARTESI_INC);
            break;
        }
        const brew = brewPrefix();
        console.log(
            firstExisting(
                [
                    brew && path.join(brew, "include", "cartesi-machine"),
                    "/usr/local/include/cartesi-machine",
                    "/usr/include/cartesi-machine",
                    "/opt/local/include/cartesi-machine",
                ],
                "cm.h",
            ),
        );
        break;
    }
    case "lib": {
        if (process.env.CARTESI_LIB) {
            console.log(process.env.CARTESI_LIB);
            break;
        }
        const brew = brewPrefix();
        console.log(
            firstExisting(
                [
                    brew && path.join(brew, "lib"),
                    "/usr/local/lib",
                    "/usr/lib",
                    "/opt/local/lib",
                ],
                "libcartesi.a",
            ),
        );
        break;
    }
    case "omp": {
        // libcartesi.a is built with OpenMP. On Linux -fopenmp covers it; on
        // macOS the brew build uses libomp, which is keg-only.
        if (process.platform === "darwin") {
            const libomp = brewPrefix("libomp");
            if (libomp && existsSync(path.join(libomp, "lib"))) {
                console.log(`-L${path.join(libomp, "lib")} -lomp`);
            }
        }
        break;
    }
    default:
        console.error(`unknown query: ${kind}`);
        process.exit(1);
}
