import { defineConfig } from "tsdown";

export default defineConfig({
    entry: ["src/cli.ts"],
    format: ["cjs", "esm"],
    dts: true,
});
