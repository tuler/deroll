import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    // __dirname is used to locate the native shim relative to dist/ in both
    // output formats
    shims: true,
});
