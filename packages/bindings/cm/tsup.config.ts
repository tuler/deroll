import { defineConfig } from "tsup";

export default defineConfig({
    clean: true,
    dts: true,
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    minify: true,
    // __dirname in ESM output (used to locate the native addon and the
    // bundled cartesi-jsonrpc-machine executable relative to the package)
    shims: true,
    sourcemap: true,
});
