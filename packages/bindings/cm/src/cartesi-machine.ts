import { NodeCartesiMachine } from "./node/cartesi-machine.js";
import type {
    AccessLog,
    AccessLogType,
    AddressRangeDescription,
    HashTreeStats,
    MachineConfig,
    MachineRuntimeConfig,
    McycleRootHashes,
    MemoryRangeConfig,
    Proof,
    UarchCycleRootHashes,
} from "./types.js";

// -----------------------------------------------------------------------------
// Constants and enums
// -----------------------------------------------------------------------------

/**
 * The maximum value for mcycle
 */
export const MAX_MCYCLE = 0xffffffffffffffffn;

/**
 * The maximum value for uarch_cycle
 */
export const MAX_UARCH_CYCLE = 1048576n;

/// Constants
export enum Constant {
    HashSize = 32,
    HashTreeLog2WordSize = 5,
    HashTreeLog2PageSize = 12,
    HashTreeLog2RootSize = 64,
}

/// Physical memory addresses (address ranges)
export const ArConstant = {
    CmioRxBufferStart: 0x60000000n,
    CmioRxBufferLog2Size: 21,
    CmioTxBufferStart: 0x60800000n,
    CmioTxBufferLog2Size: 21,
    ShadowRevertRootHashStart: 0xfe0n,
    RamStart: 0x80000000n,
    ShadowStateStart: 0x0n,
    ShadowStateLength: 0x8000n,
    ShadowTlbStart: 0x1000n,
    ShadowTlbLength: 0x6000n,
    PmasStart: 0x10000n,
    PmasLength: 0x1000n,
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
    ConsoleOutput,
    ConsoleInput,
}

/// Reasons for the machine to break from call to cm_run_uarch
export enum UarchBreakReason {
    ReachedTargetCycle,
    UarchHalted,
    CycleOverflow,
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

/// Sharing modes for backing stores
export enum SharingMode {
    None = 0, ///< No sharing, all machine changes will be in-memory
    Config = 1, ///< Share backing stores marked as shared in the machine configuration
    All = 2, ///< Share all backing stores, all machine changes will be on-disk
}

/// Hash function types
export enum HashFunction {
    Keccak256 = 0, ///< Keccak-256 (recommended for fraud proofs using microarchitecture)
    Sha256 = 1, ///< SHA-256 (recommended for fraud proofs using zkVMs)
}

/// Machine x, f, and control and status registers
export enum Reg {
    // Machine x registers
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
    // Machine f registers
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
    // Machine CSRs
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
        dir?: string,
    ): CartesiMachine;
    load(
        dir: string,
        runtimeConfig?: MachineRuntimeConfig,
        sharing?: SharingMode,
    ): CartesiMachine;
    cloneEmpty(): CartesiMachine;
    store(dir: string, sharing?: SharingMode): CartesiMachine;
    cloneStored(fromDir: string, toDir: string): void;
    removeStored(dir: string): void;
    destroy(): void;
    getDefaultConfig(): MachineConfig;
    setRuntimeConfig(runtimeConfig: MachineRuntimeConfig): void;
    getRuntimeConfig(): MachineRuntimeConfig;
    replaceMemoryRange(rangeConfig: MemoryRangeConfig): void;
    getInitialConfig(): MachineConfig;
    getAddressRanges(): AddressRangeDescription[];
    getRegAddress(reg: Reg): bigint;
    getRootHash(): Buffer;
    getNodeHash(address: bigint, log2Size: number): Buffer;
    getProof(
        address: bigint,
        log2TargetSize: number,
        log2RootSize?: number,
    ): Proof;
    readWord(address: bigint): bigint;
    writeWord(address: bigint, value: bigint): void;
    readReg(reg: Reg): bigint;
    writeReg(reg: Reg, value: bigint): void;
    readMemory(address: bigint, length: bigint): Buffer;
    writeMemory(address: bigint, data: Buffer): void;
    readVirtualMemory(address: bigint, length: bigint): Buffer;
    writeVirtualMemory(address: bigint, data: Buffer): void;
    translateVirtualAddress(vaddr: bigint): bigint;
    readConsoleOutput(maxLength?: bigint): Buffer;
    writeConsoleInput(data: Buffer): bigint;
    run(mcycleEnd?: bigint): BreakReason;
    collectMcycleRootHashes(
        mcycleEnd: bigint,
        mcyclePeriod: bigint,
        mcyclePhase?: bigint,
        log2BundleMcycleCount?: number,
        previousBackTree?: unknown,
    ): McycleRootHashes;
    runUarch(uarchCycleEnd: bigint): UarchBreakReason;
    collectUarchCycleRootHashes(
        mcycleEnd: bigint,
        log2BundleUarchCycleCount?: number,
    ): UarchCycleRootHashes;
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
    verifyHashTree(): boolean;
    getHashTreeStats(clear?: boolean): HashTreeStats;
}

export function empty(): CartesiMachine {
    return NodeCartesiMachine.new();
}

export function create(
    config: MachineConfig,
    runtimeConfig?: MachineRuntimeConfig,
    dir?: string,
): CartesiMachine {
    return NodeCartesiMachine.createNew(config, runtimeConfig, dir);
}

export function load(
    dir: string,
    runtimeConfig?: MachineRuntimeConfig,
    sharing?: SharingMode,
): CartesiMachine {
    return NodeCartesiMachine.loadNew(dir, runtimeConfig, sharing);
}

export function getVersion(): bigint {
    return NodeCartesiMachine.getVersion();
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

export function cloneStored(fromDir: string, toDir: string): void {
    NodeCartesiMachine.cloneStored(fromDir, toDir);
}

export function removeStored(dir: string): void {
    NodeCartesiMachine.removeStored(dir);
}

export function getHash(hashFunction: HashFunction, data: Buffer): Buffer {
    return NodeCartesiMachine.getHash(hashFunction, data);
}

export function getConcatHash(
    hashFunction: HashFunction,
    left: Buffer,
    right: Buffer,
): Buffer {
    return NodeCartesiMachine.getConcatHash(hashFunction, left, right);
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
