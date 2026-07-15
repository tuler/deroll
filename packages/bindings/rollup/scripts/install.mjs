// Install hook: the native shim is only needed to talk to /dev/cmio inside a
// Cartesi Machine (riscv64). Everywhere else the package is pure JS (the mock
// driver), so skip the native build entirely instead of requiring a
// toolchain. Force with DEROLL_ROLLUP_BUILD_SHIM=1.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const wanted =
    process.arch === "riscv64" || process.env.DEROLL_ROLLUP_BUILD_SHIM === "1";

if (!wanted) {
    process.exit(0);
}

// node-gyp-build: use a prebuild when one matches, compile otherwise
const require = createRequire(import.meta.url);
const bin = require.resolve("node-gyp-build/bin.js");
const result = spawnSync(process.execPath, [bin], { stdio: "inherit" });
process.exit(result.status ?? 1);
