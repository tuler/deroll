#!/usr/bin/env node
import path from "node:path";
import fs from "fs-extra";
import {
    cancel,
    intro,
    isCancel,
    multiselect,
    note,
    outro,
    spinner,
    text,
} from "@clack/prompts";
import { Option, program } from "@commander-js/extra-typings";
import figlet from "figlet";
import validatePackageName from "validate-npm-package-name";
import { createApp, Library, PackageManager } from "./index.js";

const cancelMessage = "Application creation cancelled";

const getLocation = async (pathArg: string | undefined): Promise<string> => {
    const pathValidator = (value: string) => {
        if (value === "") {
            return "Path required";
        }
        if (fs.existsSync(value)) {
            if (fs.readdirSync(value).length !== 0) {
                return "Directory not empty";
            }
        }
    };

    if (pathArg !== undefined && pathValidator(pathArg) === undefined) {
        return pathArg;
    }

    const directory = await text({
        message: "Where should we create your project",
        initialValue: pathArg,
        validate: pathValidator,
    });

    if (isCancel(directory)) {
        cancel(cancelMessage);
        process.exit(0);
    }

    return directory;
};

const getPackageManager = async (
    arg?: PackageManager,
): Promise<PackageManager> => {
    // TODO: implement package manager selection
    return arg || "pnpm";
};

const getPackageName = async (options: {
    packageName?: string;
    directory: string;
}): Promise<string> => {
    const { directory } = options;

    // if value passed is valid, return it
    if (
        options.packageName &&
        validatePackageName(options.packageName).validForNewPackages
    ) {
        return options.packageName;
    }

    // otherwise ask for the package name
    // use as initial value the value passed (invalid) or the name of the directory
    const initialValue = options.packageName || path.basename(directory);

    const packageName = await text({
        message: "What is the name of the npm package",
        initialValue,
        validate: (value) =>
            validatePackageName(value).validForNewPackages
                ? undefined
                : "Invalid package name",
    });

    if (isCancel(packageName)) {
        cancel(cancelMessage);
        process.exit(0);
    }

    return packageName;
};

const getLibraries = async (options: {
    useWallet?: boolean;
    useRouter?: boolean;
}): Promise<Library[]> => {
    const { useWallet, useRouter } = options;
    const initialValues: Library[] = [];
    if (options.useRouter) {
        initialValues.push("router");
    }
    if (options.useWallet) {
        initialValues.push("wallet");
    }

    // don't show options if --use-wallet and --use-router are passed
    if (useWallet !== undefined && useRouter !== undefined) {
        return initialValues;
    }

    type LibraryOption = {
        value: Library;
        label?: string;
        hint?: string;
    };

    const packages = await multiselect<LibraryOption[], Library>({
        message: "Select the optional packages to use",
        options: [
            {
                value: "wallet",
                label: "@deroll/wallet",
                hint: "select if your application will handle assets",
            },
            {
                value: "router",
                label: "@deroll/router",
                hint: "select if your application will use inspect requests using URLs",
            },
        ],
        initialValues,
    });

    if (isCancel(packages)) {
        cancel(cancelMessage);
        process.exit(0);
    }

    return packages;
};

program
    .argument("[path]")
    .addOption(new Option("--use-router", "use router package"))
    .addOption(new Option("--use-wallet", "use wallet package"))
    .addOption(new Option("--package-name <package-name>", "npm package name"))
    .addOption(
        new Option(
            "--package-manager <package-manager>",
            "package manager to use",
        ).choices<PackageManager[]>(["npm", "yarn", "pnpm"]),
    )
    .action(async (pathArg, options) => {
        console.log(figlet.textSync("deroll", { font: "Big" }));
        intro("Creating a new deroll application");
        const directory = await getLocation(pathArg);
        const packageName = await getPackageName({ ...options, directory });
        const packageManager = await getPackageManager(options.packageManager);
        const libraries = await getLibraries(options);

        const tasks = createApp({
            directory,
            libraries,
            packageManager,
            packageName,
        });

        const spin = spinner();
        spin.start("Creating application");
        for await (const { startText, result } of tasks) {
            spin.message(startText);
            await result;
        }
        spin.stop("Application created");

        const instructions = [
            `cd ${directory}`,
            "pnpm i",
            "cartesi build",
            "cartesi run",
        ];
        note(instructions.join("\n"), "Next steps");
        outro("Happy building! Thanks for choosing deroll!");
    });

program.parse();
