import { NodeCartesiMachine } from "./node/cartesi-machine.js";
import type {
    AccessLog,
    AccessLogType,
    AddressRangeDescription,
    HashTreeStats,
    MachineConfig,
    MachineRuntimeConfig,
    MemoryRangeConfig,
    Proof,
} from "./types.js";

// -----------------------------------------------------------------------------
// Constants and enums
// -----------------------------------------------------------------------------

/**
 * The maximum value for mcycle (UINT64_MAX)
 */
export const MAX_MCYCLE = 0xffffffffffffffffn;

/**
 * The maximum value for uarch_cycle
 * ((1 << CM_ROLLUP_LOG2_MAX_UARCH_CYCLES_PER_MCYCLE) - 1)
 */
export const MAX_UARCH_CYCLE = (1n << 20n) - 1n;

/// Constants
export enum Constant {
    HashSize = 32,
    TreeLog2WordSize = 5,
    TreeLog2PageSize = 12,
    TreeLog2RootSize = 64,
    RollupLog2MaxMcyclesPerAdvanceState = 48,
    RollupLog2MaxUarchCyclesPerMcycle = 20,
    RollupLog2MaxOutputCount = 63,
    RollupLog2MaxAdvanceStatesPerEpoch = 24,
    FlashDriveMax = 8, ///< Maximum number of flash drives
    // biome-ignore lint/suspicious/noDuplicateEnumValues: mirrors cm_constant in cm.h
    NvramMax = 8, ///< Maximum number of NVRAMs
    MemoryRangeLabelMax = 31, ///< Maximum length of a memory range user label
    RtcFreqDiv = 8192, ///< mtime increments once per this many mcycle increments
}

/// Physical memory addresses
export const PmaConstant = {
    CmioRxBufferStart: 0x60000000n,
    CmioRxBufferLog2Size: 21,
    CmioRxBufferLength: 0x200000n,
    CmioTxBufferStart: 0x60800000n,
    CmioTxBufferLog2Size: 21,
    CmioTxBufferLength: 0x200000n,
    RamStart: 0x80000000n,
    ClintStart: 0x2000000n,
    ClintLength: 0xc0000n,
    HtifStart: 0x40008000n,
    HtifLength: 0x1000n,
    FirstVirtioStart: 0x40010000n,
    LastVirtioEnd: 0x40020000n,
    PlicStart: 0x40100000n,
    PlicLength: 0x00400000n,
    DtbStart: 0x7ff00000n,
    DtbLength: 0x100000n,
} as const;

/// Driver IDs for PMA entries
export enum PmaDriverId {
    Empty = 0,
    Memory = 1,
    ShadowState = 2,
    FlashDrive = 3,
    Clint = 4,
    Htif = 5,
    Plic = 6,
    CmioRxBuffer = 7,
    CmioTxBuffer = 8,
    ShadowUarchState = 9,
    Virtio = 10,
    Nvram = 11,
}

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
    BadTypeid = -10,
    BadCast = -11,
    BadAnyCast = -12,
    BadOptionalAccess = -13,
    BadWeakPtr = -14,
    BadFunctionCall = -15,
    BadAlloc = -16,
    BadArrayNewLength = -17,
    BadException = -18,
    BadVariantAccess = -19,
    Exception = -20,
    Unknown = -21,
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
    McycleOverflow,
}

/// Reasons for the machine to break from call to cm_run_uarch
export enum UarchBreakReason {
    ReachedTargetUarchCycle,
    UarchHalted,
    UarchCycleOverflow,
    Failed,
}

/// Backing stores sharing mode for load/store operations
export enum SharingMode {
    None = 0, ///< Machine state fully in-memory
    Config = 1, ///< On-disk for backing stores marked shared in the config
    All = 2, ///< Machine state fully on-disk
}

/// HTIF device identifiers (DEV field of tohost/fromhost)
export enum HtifDevice {
    Halt = 0, ///< Halts the machine
    Console = 1, ///< Console input and output
    Yield = 2, ///< Yield control back to the host
}

/// Yield device commands (CM_HTIF_YIELD_CMD_*, formerly CM_CMIO_YIELD_COMMAND_*)
export enum HtifYieldCommand {
    Automatic,
    Manual,
}

/// Yield reasons (CM_HTIF_YIELD_*_REASON_*, formerly CM_CMIO_YIELD_*_REASON_*)
export enum HtifYieldReason {
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
    Imcyclemax,
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
    UarchHalt,
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
    getAddressName(paddr: bigint): string;
    getRootHash(): Buffer;
    readRevertRootHash(): Buffer;
    writeRevertRootHash(hash: Buffer): void;
    getNodeHash(address: bigint, log2Size: number): Buffer;
    getProof(address: bigint, log2Size: number, log2RootSize?: number): Proof;
    readWord(address: bigint): bigint;
    writeWord(address: bigint, value: bigint): void;
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
        cmd: HtifYieldCommand;
        reason: HtifYieldReason;
        data: Buffer;
    };
    sendCmioResponse(
        reason: HtifYieldReason,
        data: Buffer,
        revertRootHash?: Buffer,
    ): void;
    logStep(mcycleCount: bigint, logFilename: string): BreakReason;
    logStepUarch(logType: AccessLogType): AccessLog;
    logResetUarch(logType: AccessLogType): AccessLog;
    logSendCmioResponse(
        reason: HtifYieldReason,
        data: Buffer,
        logType: AccessLogType,
        revertRootHash?: Buffer,
    ): string;
    verifyStepUarch(
        rootHashBefore: Buffer,
        log: AccessLog,
        rootHashAfter?: Buffer,
    ): Buffer;
    verifyResetUarch(
        rootHashBefore: Buffer,
        log: AccessLog,
        rootHashAfter?: Buffer,
    ): Buffer;
    verifyHashTree(): boolean;
    getHashTreeStats(clear?: boolean): HashTreeStats;
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

export function getVersion(): bigint {
    return NodeCartesiMachine.getVersion();
}

export function getDefaultConfig(): MachineConfig {
    return NodeCartesiMachine.getDefaultConfig();
}

export function getRegAddress(reg: Reg): bigint {
    return NodeCartesiMachine.getRegAddress(reg);
}

export function getAddressName(paddr: bigint): string {
    return NodeCartesiMachine.getAddressName(paddr);
}

export function verifyStep(
    rootHashBefore: Buffer,
    logFilename: string,
    mcycleCount: bigint,
    rootHashAfter?: Buffer,
): Buffer {
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
    rootHashAfter?: Buffer,
): Buffer {
    return NodeCartesiMachine.verifyStepUarch(
        rootHashBefore,
        log,
        rootHashAfter,
    );
}

export function verifyResetUarch(
    rootHashBefore: Buffer,
    log: AccessLog,
    rootHashAfter?: Buffer,
): Buffer {
    return NodeCartesiMachine.verifyResetUarch(
        rootHashBefore,
        log,
        rootHashAfter,
    );
}

export function verifySendCmioResponse(
    revertRootHash: Buffer,
    reason: HtifYieldReason,
    data: Buffer,
    rootHashBefore: Buffer,
    log: AccessLog,
    rootHashAfter?: Buffer,
): Buffer {
    return NodeCartesiMachine.verifySendCmioResponse(
        revertRootHash,
        reason,
        data,
        rootHashBefore,
        log,
        rootHashAfter,
    );
}
