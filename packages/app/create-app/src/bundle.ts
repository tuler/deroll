import type { PackageManager } from "./index.js";

type ScriptOptions = {
    entryPoint: string;
    outfile: string;
    packageManager: PackageManager;
    target: string;
};

export const esbuildScript = (options: ScriptOptions) => {
    const { entryPoint, outfile, target } = options;

    return `import { build, type BuildOptions } from "esbuild";

const options: BuildOptions = {
    entryPoints: ["${entryPoint}"],
    bundle: true,
    outfile: "${outfile}",
    platform: "node",
    target: "${target}",
    // @cartesi/rollup is a native addon (.node): it cannot be inlined into
    // the bundle and must be required at runtime from node_modules. The
    // Dockerfile copies it (and its node-gyp-build loader) next to the bundle.
    external: ["@cartesi/rollup"],
};

await build(options);
`;
};
