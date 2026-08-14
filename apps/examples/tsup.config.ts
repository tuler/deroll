import { defineConfig } from "tsup";

export default defineConfig({
    entry: [
        "src/abi.ts",
        "src/echo.ts",
        "src/inspect.ts",
        "src/minimal.ts",
        "src/withdraw.ts",
    ],
    dts: true,
});
