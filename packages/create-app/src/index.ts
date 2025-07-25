import fsExtra from "fs-extra";
import got from "got";
import latestVersion from "latest-version";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream";
import { promisify } from "node:util";

// Promisify the pipeline function for easier async/await usage
const streamPipeline = promisify(pipeline);

export type Library = "wallet" | "router";
export type PackageManager = "npm" | "yarn" | "pnpm";
export type CreateAppOptions = {
    libraries: Library[];
    packageManager: PackageManager;
    packageName: string;
    directory: string;
};

const packageJson = async (options: CreateAppOptions) => {
    const name = options.packageName;
    const dependencies: Record<string, string> = {};

    dependencies["@deroll/app"] =
        `^${await latestVersion("@deroll/app", { version: "alpha" })}`;
    if (options.libraries.includes("router")) {
        dependencies["@deroll/router"] =
            `^${await latestVersion("@deroll/router", { version: "alpha" })}`;
    }
    if (options.libraries.includes("wallet")) {
        dependencies["@deroll/wallet"] =
            `^${await latestVersion("@deroll/wallet", { version: "alpha" })}`;
    }
    dependencies.abitype = `^${await latestVersion("abitype")}`;
    dependencies.viem = `^${await latestVersion("viem")}`;

    const devDependencies = {
        "@types/node": `^${await latestVersion("@types/node")}`,
        esbuild: `^${await latestVersion("esbuild")}`,
        prettier: `^${await latestVersion("prettier")}`,
        "ts-node": `^${await latestVersion("ts-node")}`,
        typescript: `^${await latestVersion("typescript")}`,
        vitest: `^${await latestVersion("vitest")}`,
    };

    return {
        name,
        version: "0.0.0",
        description: "Deroll application template",
        main: "src/index.ts",
        dependencies,
        devDependencies,
        scripts: {
            build: "esbuild ./src/index.ts --bundle --outfile=dist/index.js --platform=node --target=node20",
            clean: "rm -rf node_modules && rm -rf dist",
            test: "vitest",
        },
        keywords: ["cartesi", "deroll"],
    };
};

const tsConfig = {
    $schema: "https://json.schemastore.org/tsconfig",
    compilerOptions: {
        composite: false,
        declaration: true,
        declarationMap: true,
        esModuleInterop: true,
        forceConsistentCasingInFileNames: true,
        inlineSources: false,
        isolatedModules: true,
        moduleResolution: "node",
        noUncheckedIndexedAccess: true,
        noUnusedLocals: false,
        noUnusedParameters: false,
        outDir: "dist",
        preserveWatchOutput: true,
        skipLibCheck: true,
        strict: true,
        target: "ES2022",
    },
    include: ["src"],
    exclude: ["dist", "node_modules"],
};

const ignore = `.cartesi
/dist
/node_modules
`;

const readme = `# deroll template

This is a template for [Cartesi](https://cartesi.io) applications that use the [Deroll](https://github.com/tuler/deroll) framework.

For documentation on how to develop Cartesi applications refer to https://docs.cartesi.io

For documentation on how to use Deroll refer to https://deroll.dev

Application logic should go in \`src/index.ts\`.
`;

const download = async (url: string, outputPath: string) => {
    const stream = got.stream.get(url, { responseType: "text" });
    const fileStream = fs.createWriteStream(outputPath);
    return streamPipeline(stream, fileStream);
};

const gh = (info: {
    owner: string;
    repo: string;
    branch: string;
    path: string;
}): string =>
    `https://raw.githubusercontent.com/${info.owner}/${info.repo}/${info.branch}/${info.path}`;

export type Task = {
    startText: string;
    stopText: string;
    result: Promise<void>;
};

const fileCreator = (filename: string, result: Promise<void>): Task => ({
    startText: `creating ${filename}`,
    stopText: `created ${filename}`,
    result,
});

/**
 * Patches a file in-place, replacing all occurrences of oldString with newString.
 * @param filename Path to the file to patch
 * @param oldString String to be replaced
 * @param newString Replacement string
 */
const patch = (filename: string, oldString: string, newString: string) => {
    const content = fs.readFileSync(filename, "utf8");
    const patched = content.split(oldString).join(newString);
    fs.writeFileSync(filename, patched, "utf8");
};

const buildBlocks = {
    yarn: `COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build`,
    npm: `COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile
COPY . .
RUN npm run build`,
    pnpm: `RUN corepack enable pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build`,
};

const dockerfile = async (
    dockerfileUrl: string,
    outputPath: string,
    packageManager: PackageManager,
): Promise<void> => {
    // download Dockerfile from application-templates
    await download(dockerfileUrl, outputPath);

    // patch file according to selected package manager, as the template is for yarn
    if (packageManager !== "yarn") {
        patch(outputPath, buildBlocks.yarn, buildBlocks[packageManager]);
    }
};

export const createApp = (options: CreateAppOptions): Task[] => {
    const { directory, libraries } = options;

    let example = "minimal";
    if (libraries.includes("wallet") && libraries.includes("router")) {
        example = "walletRouter";
    } else if (libraries.includes("wallet")) {
        example = "wallet";
    } else if (libraries.includes("router")) {
        example = "router";
    }

    // create destination directory if not exists
    fsExtra.ensureDirSync(directory);
    fsExtra.ensureDirSync(path.join(directory, "src"));

    const source = gh({
        owner: "tuler",
        repo: "deroll",
        branch: "main",
        path: `apps/examples/src/${example}.ts`,
    });

    const dockerfileUrl = gh({
        owner: "cartesi",
        repo: "application-templates",
        branch: "prerelease/sdk-12",
        path: "typescript/Dockerfile",
    });

    const spaces = 4;
    return [
        fileCreator(
            "package.json",
            (async () => {
                await fsExtra.writeJSON(
                    path.join(directory, "package.json"),
                    await packageJson(options),
                    { spaces },
                );
            })(),
        ),
        fileCreator(
            "tsconfig.json",
            (async () => {
                await fsExtra.writeJSON(
                    path.join(directory, "tsconfig.json"),
                    tsConfig,
                    {
                        spaces,
                    },
                );
            })(),
        ),
        fileCreator(
            ".dockerignore",
            fs.promises.writeFile(
                path.join(directory, ".dockerignore"),
                ignore,
            ),
        ),
        fileCreator(
            ".gitignore",
            fs.promises.writeFile(path.join(directory, ".gitignore"), ignore),
        ),
        fileCreator(
            "README.md",
            fs.promises.writeFile(path.join(directory, "README.md"), readme),
        ),
        {
            startText: `downloading ${source}`,
            stopText: `downloaded ${source}`,
            result: download(source, path.join(directory, "src", "index.ts")),
        },
        {
            startText: `downloading ${dockerfile}`,
            stopText: `downloaded ${dockerfile}`,
            result: dockerfile(
                dockerfileUrl,
                path.join(directory, "Dockerfile"),
                options.packageManager,
            ),
        },
    ];
};
