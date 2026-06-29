import { defineConfig } from "vocs";

export default defineConfig({
    basePath: "/node-cartesi-machine",
    baseUrl: "https://tuler.github.io",
    description: "Cartesi Machine Node.js bindings",
    editLink: {
        pattern:
            "https://github.com/tuler/node-cartesi-machine/edit/main/docs/pages/:path",
        text: "Edit on GitHub",
    },
    iconUrl: "/favicon.png",
    vite: {
        base: "/node-cartesi-machine",
    },
    sidebar: [
        {
            text: "Introduction",
            link: "/",
        },
        {
            text: "Local Machine",
            link: "/local",
        },
        {
            text: "Remote Machine",
            link: "/remote",
        },
        {
            text: "Rollups Machine",
            link: "/rollups",
        },
        {
            text: "Error Handling",
            link: "/error-handling",
        },
        {
            text: "API",
            items: [
                {
                    text: "create",
                    link: "/api/create",
                },
                {
                    text: "load",
                    link: "/api/load",
                },
                {
                    text: "empty",
                    link: "/empty",
                },
                {
                    text: "spawn",
                    link: "/api/spawn",
                },
                {
                    text: "connect",
                    link: "/api/connect",
                },
                {
                    text: "rollups",
                    link: "/api/rollups",
                },
                {
                    text: "CartesiMachine",
                    link: "/api/cartesi-machine",
                },
                {
                    text: "RemoteCartesiMachine",
                    link: "/api/remote-cartesi-machine",
                },
                {
                    text: "RollupsMachine",
                    link: "/api/rollups-machine",
                },
            ],
        },
        {
            text: "Troubleshooting",
            link: "/troubleshooting",
        },
    ],
    title: "Docs",
    twoslash: {
        compilerOptions: {
            paths: {
                "@tuler/node-cartesi-machine": ["./src/index.ts"],
            },
        },
    },
});
