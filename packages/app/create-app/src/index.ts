import fsExtra from "fs-extra";
import got from "got";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream";
import { promisify } from "node:util";
import { packageJson } from "./package.js";
import { dockerfile } from "./dockerfile.js";
import { pnpmWorkspace } from "./pnpm.js";
import { readme } from "./doc.js";
import { tsConfig } from "./typescript.js";
import { esbuildScript } from "./bundle.js";
import { dockerIgnore, gitIgnore } from "./ignore.js";
import { bunfig } from "./bun.js";

// Promisify the pipeline function for easier async/await usage
const streamPipeline = promisify(pipeline);

export type Library = "wallet" | "router";
export type PackageManager = "npm" | "pnpm" | "bun";
export type CreateAppOptions = {
    directory: string;
    libraries: Library[];
    packageManager: PackageManager;
    packageName: string;
    templateBranch?: string;
};

export const download = async (url: string, outputPath: string) => {
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
    const { directory, libraries, packageManager } = options;

    // choose one of the examples based on the selected libraries
    let example = "minimal";
    if (libraries.includes("wallet") && libraries.includes("router")) {
        example = "walletRouter";
    } else if (libraries.includes("wallet")) {
        example = "wallet";
    } else if (libraries.includes("router")) {
        example = "router";
    }

    // allow to override the used branch, especialy for the alpha phase
    const branch = options.templateBranch ?? "prerelease/v2"; // change to "main" when we are ready to release v2

    // create destination directory if not exists
    fsExtra.ensureDirSync(directory);
    fsExtra.ensureDirSync(path.join(directory, "src"));

    const source = gh({
        owner: "tuler",
        repo: "deroll",
        branch,
        path: `apps/examples/src/${example}.ts`,
    });

    const spaces = 4;
    const tasks = [
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
            "esbuild",
            fs.promises.writeFile(
                path.join(directory, "esbuild.mts"),
                esbuildScript({
                    entryPoint: "src/index.ts",
                    outfile: "dist/index.js",
                    packageManager,
                    target: "node22",
                }),
            ),
        ),
        fileCreator(
            ".dockerignore",
            fs.promises.writeFile(
                path.join(directory, ".dockerignore"),
                dockerIgnore(),
            ),
        ),
        fileCreator(
            ".gitignore",
            fs.promises.writeFile(
                path.join(directory, ".gitignore"),
                gitIgnore(),
            ),
        ),
        fileCreator(
            "README.md",
            fs.promises.writeFile(path.join(directory, "README.md"), readme),
        ),
        fileCreator(
            "Dockerfile",
            fs.promises.writeFile(
                path.join(directory, "Dockerfile"),
                dockerfile({
                    packageManager,
                    nodeVersion: "24.17.0",
                }),
            ),
        ),
        {
            startText: `downloading ${source}`,
            stopText: `downloaded ${source}`,
            result: download(source, path.join(directory, "src", "index.ts")),
        },
    ];

    if (packageManager === "pnpm") {
        // pnpm-workspace.yaml, to override age exclusion for deroll itself, and allow native build
        tasks.push(
            fileCreator(
                "pnpm-workspace.yaml",
                fs.promises.writeFile(
                    path.join(directory, "pnpm-workspace.yaml"),
                    pnpmWorkspace(),
                ),
            ),
        );
    } else if (packageManager === "bun") {
        // bunfig.toml, to override age exclusion for deroll itself
        tasks.push(
            fileCreator(
                "bunfig.toml",
                fs.promises.writeFile(
                    path.join(directory, "bunfig.toml"),
                    bunfig(),
                ),
            ),
        );
    }

    return tasks;
};
