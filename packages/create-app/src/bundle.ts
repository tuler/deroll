import type { PackageManager } from "./index.js";

type ScriptOptions = {
    bindingPackage: string;
    entryPoint: string;
    outfile: string;
    packageManager: PackageManager;
    target: string;
};

const cjsScript = (options: ScriptOptions) => {
    const { bindingPackage, entryPoint, outfile, target } = options;

    return `const { build } = require("esbuild");

// CommonJS so it runs under Yarn PnP (an ESM .mts entry trips
// ERR_REQUIRE_CYCLE_MODULE when Yarn injects --require .pnp.cjs).
build({
    entryPoints: ["${entryPoint}"],
    bundle: true,
    outfile: "${outfile}",
    platform: "node",
    target: "${target}",
    // @tuler/node-libcmt is a native addon (.node): it cannot be inlined into
    // the bundle and is required at runtime. Under PnP it (and its node-gyp-build
    // loader) resolve via .pnp.cjs from .yarn/unplugged.
    external: ["${bindingPackage}"],
}).catch((e) => {
    console.error(e);
    process.exit(1);
});
`;
};

const mtsScript = (options: ScriptOptions) => {
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

export const esbuildScript = (options: ScriptOptions) => {
    if (options.packageManager === "yarn") {
        return cjsScript(options);
    } else {
        return mtsScript(options);
    }
};
