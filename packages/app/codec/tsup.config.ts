import { defineConfig } from "tsup";

// Pure JS with no Node.js dependencies: the ESM build runs in Node and
// browsers alike, the CJS build serves require() consumers.
export default defineConfig({
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
});
