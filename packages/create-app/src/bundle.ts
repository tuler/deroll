import type { PackageManager } from "./index.js";

type ScriptOptions = {
    bindingPackage: string;
    entryPoint: string;
    outfile: string;
    packageManager: PackageManager;
    target: string;
};

export const esbuildScript = (options: ScriptOptions) => {
    const { bindingPackage, entryPoint, outfile, target } = options;

    return `import { build, type BuildOptions } from "esbuild";

const options: BuildOptions = {
    entryPoints: ["${entryPoint}"],
    bundle: true,
    outfile: "${outfile}",
    platform: "node",
    target: "${target}",
    // @tuler/node-libcmt is a native addon (.node): it cannot be inlined into
    // the bundle and must be required at runtime from node_modules. The
    // Dockerfile copies it (and its node-gyp-build loader) next to the bundle.
    external: ["${bindingPackage}"],
};

await build(options);
`;
};
