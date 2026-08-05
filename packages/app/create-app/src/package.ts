import latestVersion from "latest-version";
import type { CreateAppOptions } from "./index.js";

/**
 * package.json generator based on user options
 * @param options application options
 * @returns package.json
 */
export const packageJson = async (
    options: CreateAppOptions & { bindingPackage: string },
) => {
    const { bindingPackage, packageManager, packageName } = options;
    const dependencies: Record<string, string> = {};
    const derollVersion = "alpha"; // or "latest"
    const bindingVersion = bindingPackage.startsWith("@deroll/")
        ? derollVersion
        : "alpha";

    dependencies["@deroll/app"] =
        `^${await latestVersion("@deroll/app", { version: derollVersion })}`;
    if (options.libraries.includes("router")) {
        dependencies["@deroll/router"] =
            `^${await latestVersion("@deroll/router", { version: derollVersion })}`;
    }
    if (options.libraries.includes("wallet")) {
        dependencies["@deroll/wallet"] =
            `^${await latestVersion("@deroll/wallet", { version: derollVersion })}`;
    }
    dependencies.viem = `^${await latestVersion("viem")}`;

    // binding package needs to be a direct dependency, because we are using bundling with esbuild
    dependencies[bindingPackage] =
        `^${await latestVersion(bindingPackage, { version: bindingVersion })}`;

    const devDependencies = {
        "@types/node": `^${await latestVersion("@types/node")}`,
        esbuild: `^${await latestVersion("esbuild")}`,
        typescript: `^${await latestVersion("typescript")}`,
        vitest: `^${await latestVersion("vitest")}`,
    };

    // fetch latest version of selected package manager
    const packageManagerVersion = await latestVersion(packageManager);

    return {
        name: packageName,
        version: "0.0.0",
        description: "Deroll application template",
        main: "src/index.ts",
        dependencies,
        devDependencies,
        scripts: {
            build: `node esbuild.mts`,
            clean: "rm -rf node_modules && rm -rf dist",
            test: "vitest",
        },
        keywords: ["cartesi", "deroll"],
        packageManager: `${packageManager}@${packageManagerVersion}`,
        trustedDependencies: [bindingPackage, "esbuild"],
    };
};
