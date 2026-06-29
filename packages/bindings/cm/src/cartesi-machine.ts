import { NodeCartesiMachine } from "./node/cartesi-machine";
import type {
    AccessLog,
    AccessLogType,
    MachineConfig,
    MachineRuntimeConfig,
    MemoryRangeDescription,
    Proof,
} from "./types";

// -----------------------------------------------------------------------------
// Constants and enums
// -----------------------------------------------------------------------------

/**
 * The maximum value for mcycle
 */
export const MAX_MCYCLE = 0xffffffffffffffffffn;

/// Constants
export enum Constant {
    HashSize = 32,
    TreeLog2WordSize = 5,
    TreeLog2PageSize = 12,
    TreeLog2RootSize = 64,
}

/// Physical memory addresses
export const PmaConstant = {
    CmioRxBufferStart: 0x60000000n,
    CmioRxBufferLog2Size: 21,
    CmioTxBufferStart: 0x60800000n,
    CmioTxBufferLog2Size: 21,
    RamStart: 0x80000000n,
} as const;

/// Error codes returned from the C API
export enum ErrorCode {
    Ok = 0,
    InvalidArgument = -1,
    DomainError = -2,
    LengthError = -3,
    OutOfRange = -4,
    LogicError = -5,
    RuntimeError = -6,
    RangeError = -7,
    OverflowError = -8,
    UnderflowError = -9,
    RegexError = -10,
    SystemError = -11,
    BadTypeid = -12,
    BadCast = -13,
    BadAnyCast = -14,
    BadOptionalAccess = -15,
    BadWeakPtr = -16,
    BadFunctionCall = -17,
    BadAlloc = -18,
    BadArrayNewLength = -19,
    BadException = -20,
    BadVariantAccess = -21,
    Exception = -22,
    Unknown = -23,
}

/**
 * Custom error class for Cartesi Machine operations
 * Contains both the error code and a human-readable description
 */
export class MachineError extends Error {
    public readonly code: ErrorCode;
    public readonly description: string;

    constructor(code: ErrorCode, description: string) {
        const message = `Cartesi Machine Error: ${description} (code: ${code})`;

        super(message);

        this.name = "MachineError";
        this.code = code;
        this.description = description;

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, MachineError);
        }
    }

    /**
     * Creates a MachineError from an error code, automatically fetching the description
     */
    static fromCode(code: ErrorCode): MachineError {
        const description = NodeCartesiMachine.getLastError();
        return new MachineError(code, description);
    }
}

/// Reasons for the machine to break from call to cm_run
export enum BreakReason {
    Failed,
    Halted,
    YieldedManually,
    YieldedAutomatically,
    YieldedSoftly,
    ReachedTargetMcycle,
}

/// Reasons for the machine to break from call to cm_run_uarch
export enum UarchBreakReason {
    ReachedTargetCycle,
    UarchHalted,
    Failed,
}

/// Yield device commands
export enum CmioYieldCommand {
    Automatic,
    Manual,
}

/// Yield reasons
export enum CmioYieldReason {
    AutomaticProgress = 1, ///< Progress is available
    AutomaticTxOutput = 2, ///< Output is available in tx buffer
    AutomaticTxReport = 4, ///< Report is available in tx buffer
    ManualRxAccepted = 1, ///< Input in rx buffer was accepted
    ManualRxRejected = 2, ///< Input in rx buffer was rejected
    ManualTxException = 4, ///< Exception happened
    AdvanceState = 0, ///< Input in rx buffer is an advance state
    InspectState = 1, ///< Input in rx buffer is an inspect state
}

/// Machine x, f, and control and status registers
export enum Reg {
    // Processor x registers
    X0,
    X1,
    X2,
    X3,
    X4,
    X5,
    X6,
    X7,
    X8,
    X9,
    X10,
    X11,
    X12,
    X13,
    X14,
    X15,
    X16,
    X17,
    X18,
    X19,
    X20,
    X21,
    X22,
    X23,
    X24,
    X25,
    X26,
    X27,
    X28,
    X29,
    X30,
    X31,
    // Processor f registers
    F0,
    F1,
    F2,
    F3,
    F4,
    F5,
    F6,
    F7,
    F8,
    F9,
    F10,
    F11,
    F12,
    F13,
    F14,
    F15,
    F16,
    F17,
    F18,
    F19,
    F20,
    F21,
    F22,
    F23,
    F24,
    F25,
    F26,
    F27,
    F28,
    F29,
    F30,
    F31,
    // Processor CSRs
    Pc,
    Fcsr,
    Mvendorid,
    Marchid,
    Mimpid,
    Mcycle,
    Icycleinstret,
    Mstatus,
    Mtvec,
    Mscratch,
    Mepc,
    Mcause,
    Mtval,
    Misa,
    Mie,
    Mip,
    Medeleg,
    Mideleg,
    Mcounteren,
    Menvcfg,
    Stvec,
    Sscratch,
    Sepc,
    Scause,
    Stval,
    Satp,
    Scounteren,
    Senvcfg,
    Ilrsc,
    Iprv,
    IflagsX,
    IflagsY,
    IflagsH,
    Iunrep,
    // Device registers
    ClintMtimecmp,
    PlicGirqpend,
    PlicGirqsrvd,
    HtifToHost,
    HtifFromHost,
    HtifIhalt,
    HtifIconsole,
    HtifIyield,
    // Microarchitecture registers
    UarchX0,
    UarchX1,
    UarchX2,
    UarchX3,
    UarchX4,
    UarchX5,
    UarchX6,
    UarchX7,
    UarchX8,
    UarchX9,
    UarchX10,
    UarchX11,
    UarchX12,
    UarchX13,
    UarchX14,
    UarchX15,
    UarchX16,
    UarchX17,
    UarchX18,
    UarchX19,
    UarchX20,
    UarchX21,
    UarchX22,
    UarchX23,
    UarchX24,
    UarchX25,
    UarchX26,
    UarchX27,
    UarchX28,
    UarchX29,
    UarchX30,
    UarchX31,
    UarchPc,
    UarchCycle,
    UarchHaltFlag,
    // Views of registers
    HtifToHostDev,
    HtifToHostCmd,
    HtifToHostReason,
    HtifToHostData,
    HtifFromHostDev,
    HtifFromHostCmd,
    HtifFromHostReason,
    HtifFromHostData,
    // Enumeration helpers
    Unknown_,
    First_,
    Last_,
}

export interface CartesiMachine {
    isEmpty(): boolean;
    create(
        config: MachineConfig,
        runtimeConfig?: MachineRuntimeConfig,
    ): CartesiMachine;
    load(dir: string, runtimeConfig?: MachineRuntimeConfig): CartesiMachine;
    cloneEmpty(): CartesiMachine;
    store(dir: string): CartesiMachine;
    destroy(): void;
    getDefaultConfig(): MachineConfig;
    setRuntimeConfig(runtimeConfig: MachineRuntimeConfig): void;
    getRuntimeConfig(): MachineRuntimeConfig;
    replaceMemoryRange(
        start: bigint,
        length: bigint,
        shared: boolean,
        imageFilename?: string,
    ): void;
    getInitialConfig(): MachineConfig;
    getMemoryRanges(): MemoryRangeDescription[];
    getRegAddress(reg: Reg): bigint;
    getRootHash(): Buffer;
    getProof(address: bigint, log2Size: number): Proof;
    readWord(address: bigint): bigint;
    readReg(reg: Reg): bigint;
    writeReg(reg: Reg, value: bigint): void;
    readMemory(address: bigint, length: bigint): Buffer;
    writeMemory(address: bigint, data: Buffer): void;
    readVirtualMemory(address: bigint, length: bigint): Buffer;
    writeVirtualMemory(address: bigint, data: Buffer): void;
    translateVirtualAddress(vaddr: bigint): bigint;
    run(mcycleEnd?: bigint): BreakReason;
    runUarch(uarchCycleEnd: bigint): UarchBreakReason;
    resetUarch(): void;
    receiveCmioRequest(): {
        cmd: CmioYieldCommand;
        reason: CmioYieldReason;
        data: Buffer;
    };
    sendCmioResponse(reason: CmioYieldReason, data: Buffer): void;
    logStep(mcycleCount: bigint, logFilename: string): BreakReason;
    logStepUarch(logType: AccessLogType): AccessLog;
    logResetUarch(logType: AccessLogType): AccessLog;
    logSendCmioResponse(
        reason: CmioYieldReason,
        data: Buffer,
        logType: AccessLogType,
    ): string;
    verifyStep(
        rootHashBefore: Buffer,
        logFilename: string,
        mcycleCount: bigint,
        rootHashAfter: Buffer,
    ): BreakReason;
    verifyStepUarch(
        rootHashBefore: Buffer,
        log: AccessLog,
        rootHashAfter: Buffer,
    ): void;
    verifyResetUarch(
        rootHashBefore: Buffer,
        log: AccessLog,
        rootHashAfter: Buffer,
    ): void;
    verifyMerkleTree(): boolean;
    verifyDirtyPageMaps(): boolean;
}

export function empty(): CartesiMachine {
    return NodeCartesiMachine.new();
}

export function create(
    config: MachineConfig,
    runtimeConfig?: MachineRuntimeConfig,
): CartesiMachine {
    return NodeCartesiMachine.createNew(config, runtimeConfig);
}

export function load(
    dir: string,
    runtimeConfig?: MachineRuntimeConfig,
): CartesiMachine {
    return NodeCartesiMachine.loadNew(dir, runtimeConfig);
}

export function getLastError(): string {
    return NodeCartesiMachine.getLastError();
}

export function getDefaultConfig(): MachineConfig {
    return NodeCartesiMachine.getDefaultConfig();
}

export function getRegAddress(reg: Reg): bigint {
    return NodeCartesiMachine.getRegAddress(reg);
}

export function verifyStep(
    rootHashBefore: Buffer,
    logFilename: string,
    mcycleCount: bigint,
    rootHashAfter: Buffer,
): BreakReason {
    return NodeCartesiMachine.verifyStep(
        rootHashBefore,
        logFilename,
        mcycleCount,
        rootHashAfter,
    );
}

export function verifyStepUarch(
    rootHashBefore: Buffer,
    log: AccessLog,
    rootHashAfter: Buffer,
) {
    NodeCartesiMachine.verifyStepUarch(rootHashBefore, log, rootHashAfter);
}

export function verifyResetUarch(
    rootHashBefore: Buffer,
    log: AccessLog,
    rootHashAfter: Buffer,
): void {
    NodeCartesiMachine.verifyResetUarch(rootHashBefore, log, rootHashAfter);
}

export function verifySendCmioResponse(
    reason: CmioYieldReason,
    data: Buffer,
    rootHashBefore: Buffer,
    log: AccessLog,
    rootHashAfter: Buffer,
) {
    NodeCartesiMachine.verifySendCmioResponse(
        reason,
        data,
        rootHashBefore,
        log,
        rootHashAfter,
    );
}
