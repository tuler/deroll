type ScriptOptions = {
    entryPoint?: string;
    outfile?: string;
    target?: string;
    bindingPackage: string;
};

export const esbuildScript = (options: ScriptOptions) => {
    const entryPoint = options.entryPoint ?? "src/index.ts";
    const outfile = options.outfile ?? "dist/index.js";
    const target = options.target ?? "node22";
    const bindingPackage = options.bindingPackage;

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
