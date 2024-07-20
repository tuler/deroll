import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/cli.ts", "src/client.ts", "src/index.ts", "src/server.ts"],
    format: ["cjs", "esm"],
    dts: true,
});
