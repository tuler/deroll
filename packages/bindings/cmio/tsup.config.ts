import { defineConfig } from "tsup";

export default defineConfig({
    clean: true,
    dts: true,
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    sourcemap: true,
    // __dirname in the ESM output, used to locate the native addon relative to
    // the package root
    shims: true,
});
