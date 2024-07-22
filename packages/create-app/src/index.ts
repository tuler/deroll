import path from "node:path";
import { pipeline } from "node:stream";
import { promisify } from "node:util";
import fs from "fs-extra";
import got from "got";

// Promisify the pipeline function for easier async/await usage
const streamPipeline = promisify(pipeline);

export type Library = "wallet" | "router";
export type PackageManager = "npm" | "yarn" | "pnpm";
export type CreateAppOptions = {
    libraries: Library[];
    packageManager?: PackageManager;
    packageName: string;
    directory: string;
};

const packageJson = (options: CreateAppOptions) => {
    const name = options.packageName;
    const dependencies: Record<string, string> = {};

    dependencies["@deroll/app"] = "^0.7.0";
    if (options.libraries.includes("router")) {
        dependencies["@deroll/router"] = "^0.5.0";
    }
    if (options.libraries.includes("wallet")) {
        dependencies["@deroll/wallet"] = "^0.8.0";
    }
    dependencies["abitype"] = "^1.0.5";
    dependencies["viem"] = "^2.17.9";

    return {
        name,
        version: "0.0.0",
        description: "Deroll application template",
        main: "src/index.ts",
        dependencies,
        devDependencies: {
            "@types/node": "^20.14.11",
            esbuild: "^0.23.0",
            prettier: "^3.3.3",
            "ts-node": "^10.9.2",
            typescript: "^5.5.3",
            vitest: "^2.0.4",
        },
        scripts: {
            build: "esbuild ./src/index.ts --bundle --outfile=dist/index.js --platform=node --target=node20",
            clean: "rm -rf node_modules && rm -rf dist",
            dev: 'ROLLUP_HTTP_SERVER_URL="http://127.0.0.1:8080/host-runner" ts-node src/index.ts',
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

const readme = `# Deroll template

This is a template for [Cartesi](https://cartesi.io) applications that use the [Deroll](https://github.com/tuler/deroll) framework.

For documentation on how to develop Cartesi applications refer to https://docs.cartesi.io

For documentation on how to use Deroll refer to https://github.com/tuler/deroll

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
    fs.ensureDirSync(directory);
    fs.ensureDirSync(path.join(directory, "src"));

    const source = gh({
        owner: "tuler",
        repo: "deroll",
        branch: "main",
        path: `apps/examples/src/${example}.ts`,
    });

    const dockerfile = gh({
        owner: "cartesi",
        repo: "application-templates",
        branch: "main",
        path: "typescript/Dockerfile",
    });

    const spaces = 4;
    return [
        fileCreator(
            "package.json",
            fs.writeJSON(
                path.join(directory, "package.json"),
                packageJson(options),
                { spaces },
            ),
        ),
        fileCreator(
            "tsconfig.json",
            fs.writeJSON(path.join(directory, "tsconfig.json"), tsConfig, {
                spaces,
            }),
        ),
        fileCreator(
            ".dockerignore",
            fs.writeFile(path.join(directory, ".dockerignore"), ignore),
        ),
        fileCreator(
            ".gitignore",
            fs.writeFile(path.join(directory, ".gitignore"), ignore),
        ),
        fileCreator(
            "README.md",
            fs.writeFile(path.join(directory, "README.md"), readme),
        ),
        {
            startText: `downloading ${source}`,
            stopText: `downloaded ${source}`,
            result: download(source, path.join(directory, "src", "index.ts")),
        },
        {
            startText: `downloading ${dockerfile}`,
            stopText: `downloaded ${dockerfile}`,
            result: download(dockerfile, path.join(directory, "Dockerfile")),
        },
    ];
};
