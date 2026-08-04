import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import nodeGypBuild from "node-gyp-build";

/**
 * Raw N-API surface (see src/addon.cc). Both entry points take the xgenext2fs
 * argv *without* the program name, and reject/throw an Error carrying `status`,
 * `stdout` and `stderr` when the tool fails.
 */
export interface NativeAddon {
    run(args: string[]): Promise<NativeResult>;
    runSync(args: string[]): NativeResult;
    /** version of the vendored xgenext2fs, e.g. "1.5.6" */
    version: string;
}

export interface NativeResult {
    stdout: string;
    stderr: string;
}

// Package root: walk up from this file (dist/ when bundled, src/ when executed
// from sources) until the directory containing binding.gyp.
const findPackageRoot = (dir: string): string => {
    let current = dir;
    while (true) {
        if (existsSync(join(current, "binding.gyp"))) {
            return current;
        }
        const parent = dirname(current);
        if (parent === current) {
            throw new Error(`could not find package root from ${dir}`);
        }
        current = parent;
    }
};

export const addon = nodeGypBuild(findPackageRoot(__dirname)) as NativeAddon;
