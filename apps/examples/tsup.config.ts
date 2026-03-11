import { defineConfig } from "tsup";

export default defineConfig({
    entry: [
        "src/abi.ts",
        "src/echo.ts",
        "src/minimal.ts",
        "src/router.ts",
        "src/walletRouter.ts",
        "src/withdraw.ts",
    ],
    dts: true,
});
