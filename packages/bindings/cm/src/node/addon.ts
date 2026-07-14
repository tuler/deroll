import { chmodSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import nodeGypBuild from "node-gyp-build";

// -----------------------------------------------------------------------------
// Native addon loading
// -----------------------------------------------------------------------------

/**
 * Native machine object exposed by the N-API addon. uint64 values cross the
 * boundary as bigint, configs/proofs/access logs as JSON strings, and byte
 * blobs as Buffers. Failed calls throw an Error carrying `code` (cm_error)
 * and `description` (cm_get_last_error_message()).
 */
export interface NativeMachine {
    isEmpty(): boolean;
    create(
        config: string,
        runtimeConfig: string | null,
        dir: string | null,
    ): void;
    load(dir: string, runtimeConfig: string | null, sharing?: number): void;
    cloneEmpty(): NativeMachine;
    store(dir: string, sharing?: number): void;
    cloneStored(fromDir: string, toDir: string): void;
    removeStored(dir: string): void;
    destroy(): void;
    getDefaultConfig(): string;
    getRegAddress(reg: number): bigint;
    setRuntimeConfig(runtimeConfig: string): void;
    getRuntimeConfig(): string;
    replaceMemoryRange(rangeConfig: string): void;
    getInitialConfig(): string;
    getAddressRanges(): string;
    getRootHash(): Buffer;
    getNodeHash(address: bigint, log2Size: number): Buffer;
    getProof(address: bigint, log2Size: number, log2RootSize?: number): string;
    readWord(address: bigint): bigint;
    writeWord(address: bigint, value: bigint): void;
    readReg(reg: number): bigint;
    writeReg(reg: number, value: bigint): void;
    readMemory(address: bigint, length: bigint): Buffer;
    writeMemory(address: bigint, data: Uint8Array): void;
    readVirtualMemory(address: bigint, length: bigint): Buffer;
    writeVirtualMemory(address: bigint, data: Uint8Array): void;
    translateVirtualAddress(vaddr: bigint): bigint;
    run(mcycleEnd: bigint): number;
    runUarch(uarchCycleEnd: bigint): number;
    resetUarch(): void;
    receiveCmioRequest(): { cmd: number; reason: number; data: Buffer };
    sendCmioResponse(reason: number, data: Uint8Array): void;
    logStep(mcycleCount: bigint, logFilename: string): number;
    logStepUarch(logType: number): string;
    logResetUarch(logType: number): string;
    logSendCmioResponse(
        reason: number,
        data: Uint8Array,
        logType: number,
    ): string;
    verifyStepUarch(
        rootHashBefore: Uint8Array,
        log: string,
        rootHashAfter: Uint8Array,
    ): void;
    verifyResetUarch(
        rootHashBefore: Uint8Array,
        log: string,
        rootHashAfter: Uint8Array,
    ): void;
    verifySendCmioResponse(
        reason: number,
        data: Uint8Array,
        rootHashBefore: Uint8Array,
        log: string,
        rootHashAfter: Uint8Array,
    ): void;
    verifyHashTree(): boolean;
    getHashTreeStats(clear: boolean): string;
    jsonrpcFork(): { machine: NativeMachine; address: string; pid: number };
    jsonrpcShutdownServer(): void;
    jsonrpcRebindServer(address: string): string;
    jsonrpcGetServerVersion(): string;
    jsonrpcEmancipateServer(): void;
    jsonrpcSetTimeout(ms: number): void;
    jsonrpcGetTimeout(): number;
    jsonrpcSetCleanupCall(call: number): void;
    jsonrpcGetCleanupCall(): number;
    jsonrpcGetServerAddress(): string;
    jsonrpcDelayNextRequest(ms: number): void;
}

export interface NativeAddon {
    getLastErrorMessage(): string;
    getVersion(): bigint;
    machineNew(): NativeMachine;
    machineCreateNew(
        config: string,
        runtimeConfig: string | null,
        dir: string | null,
    ): NativeMachine;
    machineLoadNew(
        dir: string,
        runtimeConfig: string | null,
        sharing?: number,
    ): NativeMachine;
    getDefaultConfig(): string;
    getRegAddress(reg: number): bigint;
    verifyStep(
        rootHashBefore: Uint8Array,
        logFilename: string,
        mcycleCount: bigint,
        rootHashAfter: Uint8Array,
    ): number;
    verifyStepUarch(
        rootHashBefore: Uint8Array,
        log: string,
        rootHashAfter: Uint8Array,
    ): void;
    verifyResetUarch(
        rootHashBefore: Uint8Array,
        log: string,
        rootHashAfter: Uint8Array,
    ): void;
    verifySendCmioResponse(
        reason: number,
        data: Uint8Array,
        rootHashBefore: Uint8Array,
        log: string,
        rootHashAfter: Uint8Array,
    ): void;
    jsonrpcSpawnServer(
        address: string,
        spawnTimeoutMs: number,
    ): { machine: NativeMachine; boundAddress: string; pid: number };
    jsonrpcConnectServer(
        address: string,
        connectTimeoutMs: number,
    ): NativeMachine;
}

// Package root: walk up from this file (dist/ when bundled, src/node/ when
// executed from sources) until the directory containing binding.gyp.
const findPackageRoot = (dir: string): string => {
    let current = dir;
    while (true) {
        if (existsSync(join(current, "binding.gyp"))) {
            return current;
        }
        const parent = dirname(current);
        if (parent === current) {
            throw new Error(`could not find package root from ${dir}`);
        }
        current = parent;
    }
};
const packageRoot = findPackageRoot(__dirname);

/**
 * Prebuilt binaries ship in per-platform packages (esbuild-style), declared
 * as optionalDependencies of the published @deroll/cm so only the matching
 * one is installed.
 */
const platformPackage = `@deroll/cm-${process.platform}-${process.arch}`;

// works in both output formats (require is not defined in the ESM bundle)
const require_ = createRequire(join(__dirname, "index.js"));

const loadAddon = (): NativeAddon => {
    // A local build wins: node-gyp-build resolves build/ (and prebuilds/)
    // under the package root, present when the addon was compiled from source
    // (repo checkout, or the install-time fallback compile).
    try {
        return nodeGypBuild(packageRoot) as NativeAddon;
    } catch (buildError) {
        // Published installs resolve the platform-specific prebuilt package,
        // whose main is the addon itself.
        try {
            return require_(platformPackage) as NativeAddon;
        } catch {
            throw new Error(
                `@deroll/cm: no native binding available; expected the ${platformPackage} package (unsupported platform?) or a source build (requires a C++23 compiler and boost headers)`,
                { cause: buildError },
            );
        }
    }
};

export const addon = loadAddon();

// -----------------------------------------------------------------------------
// Bundled JSON-RPC server binary
// -----------------------------------------------------------------------------

/**
 * cm_jsonrpc_spawn_server() launches the executable named by the
 * CARTESI_JSONRPC_MACHINE environment variable, falling back to
 * `cartesi-jsonrpc-machine` on the PATH. Both a source build and the
 * platform-specific prebuilt package bundle the server executable; point the
 * environment variable at it so spawn works out of the box.
 */
export function ensureJsonrpcServerBinary(): void {
    if (process.env.CARTESI_JSONRPC_MACHINE) {
        return;
    }
    const candidates = [
        join(packageRoot, "build", "Release", "cartesi-jsonrpc-machine"),
    ];
    try {
        const platformPackageDir = dirname(
            require_.resolve(`${platformPackage}/package.json`),
        );
        candidates.push(join(platformPackageDir, "cartesi-jsonrpc-machine"));
    } catch {
        // platform package not installed
    }
    for (const candidate of candidates) {
        if (existsSync(candidate)) {
            try {
                // some installers do not preserve the executable bit
                chmodSync(candidate, 0o755);
            } catch {
                // best effort: spawn fails later with a clearer error
            }
            process.env.CARTESI_JSONRPC_MACHINE = candidate;
            return;
        }
    }
    // fall through: cm_jsonrpc_spawn_server searches the PATH
}
