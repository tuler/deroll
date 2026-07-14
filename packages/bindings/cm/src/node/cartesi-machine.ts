import type {
    BreakReason,
    CartesiMachine,
    CmioYieldCommand,
    CmioYieldReason,
    Reg,
    SharingMode,
    UarchBreakReason,
} from "../cartesi-machine.js";
import { MachineError, MAX_MCYCLE } from "../cartesi-machine.js";
import type {
    AccessLog,
    AccessLogType,
    AddressRangeDescription,
    HashTreeStats,
    MachineConfig,
    MachineRuntimeConfig,
    MemoryRangeConfig,
    Proof,
} from "../types.js";
import { addon, type NativeMachine } from "./addon.js";

/// Access log types
enum AccessLogTypeEnum {
    Annotations = 1, ///< Includes annotations
    LargeData = 2, ///< Includes data larger than 8 bytes
}

const accessLogType = (logType: AccessLogType): number => {
    let type = 0;
    type |= logType.has_annotations ? AccessLogTypeEnum.Annotations : 0;
    type |= logType.has_large_data ? AccessLogTypeEnum.LargeData : 0;
    return type;
};

/**
 * Converts errors thrown by the native addon (which carry the cm_error code
 * and the emulator's error description) into MachineError.
 */
const call = <T>(fn: () => T): T => {
    try {
        return fn();
    } catch (error) {
        const e = error as { code?: unknown; description?: unknown };
        if (typeof e.code === "number" && typeof e.description === "string") {
            throw new MachineError(e.code, e.description);
        }
        throw error;
    }
};

// -----------------------------------------------------------------------------
// High-level wrapper class
// -----------------------------------------------------------------------------

/**
 * High-level wrapper for the Cartesi Machine C API
 */
export class NodeCartesiMachine implements CartesiMachine {
    protected machine: NativeMachine;

    /**
     * Creates a new local machine object
     */
    static new(): CartesiMachine {
        return new NodeCartesiMachine(call(() => addon.machineNew()));
    }

    /**
     * Clones an empty machine object from an existing one
     */
    cloneEmpty(): CartesiMachine {
        return new NodeCartesiMachine(call(() => this.machine.cloneEmpty()));
    }

    /**
     * Creates a new machine with configuration
     */
    static createNew(
        config: MachineConfig,
        runtimeConfig?: MachineRuntimeConfig,
        dir?: string,
    ): CartesiMachine {
        return new NodeCartesiMachine(
            call(() =>
                addon.machineCreateNew(
                    JSON.stringify(config),
                    runtimeConfig ? JSON.stringify(runtimeConfig) : null,
                    dir ?? null,
                ),
            ),
        );
    }

    /**
     * Loads a machine from a directory
     */
    static loadNew(
        dir: string,
        runtimeConfig?: MachineRuntimeConfig,
        sharing?: SharingMode,
    ): CartesiMachine {
        return new NodeCartesiMachine(
            call(() =>
                addon.machineLoadNew(
                    dir,
                    runtimeConfig ? JSON.stringify(runtimeConfig) : null,
                    sharing,
                ),
            ),
        );
    }

    constructor(machine: NativeMachine) {
        this.machine = machine;
    }

    /**
     * Gets the last error message
     */
    static getLastError(): string {
        return addon.getLastErrorMessage();
    }

    /**
     * Gets the emulator version as a number (major * 1000000 + minor * 1000 + patch)
     */
    static getVersion(): bigint {
        return call(() => addon.getVersion());
    }

    /**
     * Gets the default configuration
     */
    getDefaultConfig(): MachineConfig {
        return JSON.parse(
            call(() => this.machine.getDefaultConfig()),
        ) as MachineConfig;
    }

    /**
     * Gets the default configuration
     */
    static getDefaultConfig(): MachineConfig {
        return JSON.parse(
            call(() => addon.getDefaultConfig()),
        ) as MachineConfig;
    }

    /**
     * Gets the address of a register
     */
    getRegAddress(reg: Reg): bigint {
        return call(() => this.machine.getRegAddress(reg));
    }

    /**
     * Gets the address of a register
     */
    static getRegAddress(reg: Reg): bigint {
        return call(() => addon.getRegAddress(reg));
    }

    /**
     * Checks if the machine is empty
     */
    isEmpty(): boolean {
        return call(() => this.machine.isEmpty());
    }

    /**
     * Creates a new machine instance from configuration
     */
    create(
        config: MachineConfig,
        runtimeConfig?: MachineRuntimeConfig,
        dir?: string,
    ): CartesiMachine {
        call(() =>
            this.machine.create(
                JSON.stringify(config),
                runtimeConfig ? JSON.stringify(runtimeConfig) : null,
                dir ?? null,
            ),
        );
        return this;
    }

    /**
     * Loads a machine instance from a directory
     */
    load(
        dir: string,
        runtimeConfig?: MachineRuntimeConfig,
        sharing?: SharingMode,
    ): CartesiMachine {
        call(() =>
            this.machine.load(
                dir,
                runtimeConfig ? JSON.stringify(runtimeConfig) : null,
                sharing,
            ),
        );
        return this;
    }

    /**
     * Stores the machine instance to a directory
     */
    store(dir: string, sharing?: SharingMode): CartesiMachine {
        call(() => this.machine.store(dir, sharing));
        return this;
    }

    /**
     * Clones a stored machine directory
     */
    cloneStored(fromDir: string, toDir: string): void {
        call(() => this.machine.cloneStored(fromDir, toDir));
    }

    /**
     * Removes a stored machine directory
     */
    removeStored(dir: string): void {
        call(() => this.machine.removeStored(dir));
    }

    /**
     * Destroys the machine instance
     */
    destroy(): void {
        call(() => this.machine.destroy());
    }

    /**
     * Sets the runtime configuration
     */
    setRuntimeConfig(runtimeConfig: MachineRuntimeConfig): void {
        call(() =>
            this.machine.setRuntimeConfig(JSON.stringify(runtimeConfig)),
        );
    }

    /**
     * Gets the runtime configuration
     */
    getRuntimeConfig(): MachineRuntimeConfig {
        return JSON.parse(
            call(() => this.machine.getRuntimeConfig()),
        ) as MachineRuntimeConfig;
    }

    /**
     * Replaces a memory range
     */
    replaceMemoryRange(rangeConfig: MemoryRangeConfig): void {
        call(() =>
            this.machine.replaceMemoryRange(JSON.stringify(rangeConfig)),
        );
    }

    /**
     * Gets the initial configuration
     */
    getInitialConfig(): MachineConfig {
        return JSON.parse(
            call(() => this.machine.getInitialConfig()),
        ) as MachineConfig;
    }

    /**
     * Gets address ranges
     */
    getAddressRanges(): AddressRangeDescription[] {
        return JSON.parse(
            call(() => this.machine.getAddressRanges()),
        ) as AddressRangeDescription[];
    }

    /**
     * Gets the root hash
     */
    getRootHash(): Buffer {
        return call(() => this.machine.getRootHash());
    }

    /**
     * Gets a proof for a node in the hash tree
     */
    getProof(address: bigint, log2Size: number, log2RootSize?: number): Proof {
        return JSON.parse(
            call(() => this.machine.getProof(address, log2Size, log2RootSize)),
        ) as Proof;
    }

    /**
     * Gets the hash of a node in the hash tree
     */
    getNodeHash(address: bigint, log2Size: number): Buffer {
        return call(() => this.machine.getNodeHash(address, log2Size));
    }

    /**
     * Reads a word from memory
     */
    readWord(address: bigint): bigint {
        return call(() => this.machine.readWord(address));
    }

    /**
     * Writes a word to memory
     */
    writeWord(address: bigint, value: bigint): void {
        call(() => this.machine.writeWord(address, value));
    }

    /**
     * Reads a register
     */
    readReg(reg: Reg): bigint {
        return call(() => this.machine.readReg(reg));
    }

    /**
     * Writes a register
     */
    writeReg(reg: Reg, value: bigint): void {
        call(() => this.machine.writeReg(reg, value));
    }

    /**
     * Reads memory
     */
    readMemory(address: bigint, length: bigint): Buffer {
        return call(() => this.machine.readMemory(address, length));
    }

    /**
     * Writes memory
     */
    writeMemory(address: bigint, data: Buffer): void {
        call(() => this.machine.writeMemory(address, data));
    }

    /**
     * Reads virtual memory
     */
    readVirtualMemory(address: bigint, length: bigint): Buffer {
        return call(() => this.machine.readVirtualMemory(address, length));
    }

    /**
     * Writes virtual memory
     */
    writeVirtualMemory(address: bigint, data: Buffer): void {
        call(() => this.machine.writeVirtualMemory(address, data));
    }

    /**
     * Translates a virtual address to physical address
     */
    translateVirtualAddress(vaddr: bigint): bigint {
        return call(() => this.machine.translateVirtualAddress(vaddr));
    }

    /**
     * Runs the machine
     */
    run(mcycleEnd: bigint = MAX_MCYCLE): BreakReason {
        return call(() => this.machine.run(mcycleEnd));
    }

    /**
     * Runs the microarchitecture
     */
    runUarch(uarchCycleEnd: bigint): UarchBreakReason {
        return call(() => this.machine.runUarch(uarchCycleEnd));
    }

    /**
     * Resets the microarchitecture
     */
    resetUarch(): void {
        call(() => this.machine.resetUarch());
    }

    /**
     * Receives a CMIO request
     */
    receiveCmioRequest(): {
        cmd: CmioYieldCommand;
        reason: CmioYieldReason;
        data: Buffer;
    } {
        return call(() => this.machine.receiveCmioRequest());
    }

    /**
     * Sends a CMIO response
     */
    sendCmioResponse(reason: CmioYieldReason, data: Buffer): void {
        call(() => this.machine.sendCmioResponse(reason, data));
    }

    /**
     * Logs a step
     */
    logStep(mcycleCount: bigint, logFilename: string): BreakReason {
        return call(() => this.machine.logStep(mcycleCount, logFilename));
    }

    /**
     * Logs a uarch step
     */
    logStepUarch(logType: AccessLogType): AccessLog {
        return JSON.parse(
            call(() => this.machine.logStepUarch(accessLogType(logType))),
        ) as AccessLog;
    }

    /**
     * Logs uarch reset
     */
    logResetUarch(logType: AccessLogType): AccessLog {
        return JSON.parse(
            call(() => this.machine.logResetUarch(accessLogType(logType))),
        ) as AccessLog;
    }

    /**
     * Logs CMIO response
     */
    logSendCmioResponse(
        reason: CmioYieldReason,
        data: Buffer,
        logType: AccessLogType,
    ): string {
        return call(() =>
            this.machine.logSendCmioResponse(
                reason,
                data,
                accessLogType(logType),
            ),
        );
    }

    /**
     * Verifies a step
     */
    static verifyStep(
        rootHashBefore: Buffer,
        logFilename: string,
        mcycleCount: bigint,
        rootHashAfter: Buffer,
    ): BreakReason {
        return call(() =>
            addon.verifyStep(
                rootHashBefore,
                logFilename,
                mcycleCount,
                rootHashAfter,
            ),
        );
    }

    /**
     * Verifies a uarch step
     */
    verifyStepUarch(
        rootHashBefore: Buffer,
        log: AccessLog,
        rootHashAfter: Buffer,
    ): void {
        call(() =>
            this.machine.verifyStepUarch(
                rootHashBefore,
                JSON.stringify(log),
                rootHashAfter,
            ),
        );
    }

    /**
     * Verifies a uarch step
     */
    static verifyStepUarch(
        rootHashBefore: Buffer,
        log: AccessLog,
        rootHashAfter: Buffer,
    ): void {
        call(() =>
            addon.verifyStepUarch(
                rootHashBefore,
                JSON.stringify(log),
                rootHashAfter,
            ),
        );
    }

    /**
     * Verifies uarch reset
     */
    verifyResetUarch(
        rootHashBefore: Buffer,
        log: AccessLog,
        rootHashAfter: Buffer,
    ): void {
        call(() =>
            this.machine.verifyResetUarch(
                rootHashBefore,
                JSON.stringify(log),
                rootHashAfter,
            ),
        );
    }

    /**
     * Verifies uarch reset
     */
    static verifyResetUarch(
        rootHashBefore: Buffer,
        log: AccessLog,
        rootHashAfter: Buffer,
    ): void {
        call(() =>
            addon.verifyResetUarch(
                rootHashBefore,
                JSON.stringify(log),
                rootHashAfter,
            ),
        );
    }

    /**
     * Verifies CMIO response
     */
    verifySendCmioResponse(
        reason: CmioYieldReason,
        data: Buffer,
        rootHashBefore: Buffer,
        log: AccessLog,
        rootHashAfter: Buffer,
    ): void {
        call(() =>
            this.machine.verifySendCmioResponse(
                reason,
                data,
                rootHashBefore,
                JSON.stringify(log),
                rootHashAfter,
            ),
        );
    }

    /**
     * Verifies CMIO response
     */
    static verifySendCmioResponse(
        reason: CmioYieldReason,
        data: Buffer,
        rootHashBefore: Buffer,
        log: AccessLog,
        rootHashAfter: Buffer,
    ): void {
        call(() =>
            addon.verifySendCmioResponse(
                reason,
                data,
                rootHashBefore,
                JSON.stringify(log),
                rootHashAfter,
            ),
        );
    }

    /**
     * Verifies hash tree integrity
     */
    verifyHashTree(): boolean {
        return call(() => this.machine.verifyHashTree());
    }

    /**
     * Gets hash tree statistics
     */
    getHashTreeStats(clear: boolean = false): HashTreeStats {
        return JSON.parse(
            call(() => this.machine.getHashTreeStats(clear)),
        ) as HashTreeStats;
    }
}
