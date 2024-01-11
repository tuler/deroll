const TypeDoc = require("typedoc");

async function main() {
    const entryPoints = [
        "app",
        // "router",
        "wallet",
    ].map((path) => `packages/${path}/src/index.ts`);

    const app = await TypeDoc.Application.bootstrapWithPlugins({
        entryPoints,
        name: "Deroll Cartesi",
        compilerOptions: {
            strict: true,
            target: "ES2022",
        },
    });

    const project = await app.convert();
    if (project) {
        const out = "docs";

        await app.generateDocs(project, out);
    }
}

main().catch(console.error);
