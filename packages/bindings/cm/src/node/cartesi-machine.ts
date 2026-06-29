import koffi from "koffi";
import type {
    BreakReason,
    CartesiMachine,
    CmioYieldCommand,
    CmioYieldReason,
    Reg,
    UarchBreakReason,
} from "../cartesi-machine";
import {
    Constant,
    ErrorCode,
    MachineError,
    MAX_MCYCLE,
} from "../cartesi-machine";
import type {
    AccessLog,
    AccessLogType,
    MachineConfig,
    MachineRuntimeConfig,
    MemoryRangeDescription,
    Proof,
} from "../types";
import { loadLibrary } from "./lib-loader";

// Load the Cartesi Machine library
const lib = loadLibrary("cartesi");

// -----------------------------------------------------------------------------
// Opaque types
// -----------------------------------------------------------------------------

/// Machine object handle (opaque type)
koffi.opaque("cm_machine");

// -----------------------------------------------------------------------------
// Function signatures
// -----------------------------------------------------------------------------

/// Returns the error message set by the very last C API call
const cm_get_last_error_message = lib.func(
    "const char* cm_get_last_error_message()",
);

/// Obtains a JSON object with the default machine config as a string
const cm_get_default_config = lib.func(
    "int cm_get_default_config(const cm_machine* m, _Out_ const char** config)",
);

/// Gets the address of any x, f, or control state register
const cm_get_reg_address = lib.func(
    "int cm_get_reg_address(const cm_machine* m, int reg, _Out_ uint64_t* val)",
);

/// Creates a new local machine object
const cm_new = lib.func("int cm_new(_Out_ cm_machine** new_m)");

/// Clones an empty machine object from an existing one
const cm_clone_empty = lib.func(
    "int cm_clone_empty(const cm_machine* m, _Out_ cm_machine** new_m)",
);

/// Checks if an object is empty (does not hold a machine instance)
const cm_is_empty = lib.func(
    "int cm_is_empty(const cm_machine* m, _Out_ bool* yes)",
);

/// Deletes a machine object
const cm_delete = lib.func("void cm_delete(cm_machine* m)");

/// Creates a new machine instance from configuration
const cm_create = lib.func(
    "int cm_create(cm_machine* m, const char* config, const char* runtime_config)",
);

/// Combines cm_new() and cm_create() for convenience
const cm_create_new = lib.func(
    "int cm_create_new(const char* config, const char* runtime_config, _Out_ cm_machine** new_m)",
);

/// Loads a new machine instance from a previously stored directory
const cm_load = lib.func(
    "int cm_load(cm_machine* m, const char* dir, const char* runtime_config)",
);

/// Combines cm_new() and cm_load() for convenience
const cm_load_new = lib.func(
    "int cm_load_new(const char* dir, const char* runtime_config, _Out_ cm_machine** new_m)",
);

/// Stores a machine instance to a directory, serializing its entire state
const cm_store = lib.func("int cm_store(const cm_machine* m, const char* dir)");

/// Destroy a machine instance and remove it from the object
const cm_destroy = lib.func("int cm_destroy(cm_machine* m)");

/// Changes the machine runtime configuration
const cm_set_runtime_config = lib.func(
    "int cm_set_runtime_config(cm_machine* m, const char* runtime_config)",
);

/// Gets the machine runtime configuration
const cm_get_runtime_config = lib.func(
    "int cm_get_runtime_config(const cm_machine* m, _Out_ const char** runtime_config)",
);

/// Replaces a memory range
const cm_replace_memory_range = lib.func(
    "int cm_replace_memory_range(cm_machine* m, uint64_t start, uint64_t length, bool shared, const char* image_filename)",
);

/// Returns a JSON object with the machine config used to initialize the machine
const cm_get_initial_config = lib.func(
    "int cm_get_initial_config(const cm_machine* m, _Out_ const char** config)",
);

/// Returns a list with all memory ranges in the machine
const cm_get_memory_ranges = lib.func(
    "int cm_get_memory_ranges(const cm_machine* m, _Out_ const char** ranges)",
);

/// Obtains the root hash of the Merkle tree
const cm_get_root_hash = lib.func(
    "int cm_get_root_hash(const cm_machine* m, _Out_ uint8_t* hash)",
);

/// Obtains the proof for a node in the machine state Merkle tree
const cm_get_proof = lib.func(
    "int cm_get_proof(const cm_machine* m, uint64_t address, int32_t log2_size, _Out_ const char** proof)",
);

/// Reads the value of a word in the machine state, by its physical address
const cm_read_word = lib.func(
    "int cm_read_word(const cm_machine* m, uint64_t address, _Out_ uint64_t* val)",
);

/// Reads the value of a register
const cm_read_reg = lib.func(
    "int cm_read_reg(const cm_machine* m, int reg, _Out_ uint64_t* val)",
);

/// Writes the value of a register
const cm_write_reg = lib.func(
    "int cm_write_reg(cm_machine* m, int reg, uint64_t val)",
);

/// Reads a chunk of data from a machine memory range, by its physical address
const cm_read_memory = lib.func(
    "int cm_read_memory(const cm_machine* m, uint64_t address, uint8_t* data, uint64_t length)",
);

/// Writes a chunk of data to a machine memory range, by its physical address
const cm_write_memory = lib.func(
    "int cm_write_memory(cm_machine* m, uint64_t address, const uint8_t* data, uint64_t length)",
);

/// Reads a chunk of data from a machine memory range, by its virtual address
const cm_read_virtual_memory = lib.func(
    "int cm_read_virtual_memory(const cm_machine* m, uint64_t address, uint8_t* data, uint64_t length)",
);

/// Writes a chunk of data to a machine memory range, by its virtual address
const cm_write_virtual_memory = lib.func(
    "int cm_write_virtual_memory(cm_machine* m, uint64_t address, const uint8_t* data, uint64_t length)",
);

/// Translates a virtual memory address to its corresponding physical memory address
const cm_translate_virtual_address = lib.func(
    "int cm_translate_virtual_address(const cm_machine* m, uint64_t vaddr, uint64_t* paddr)",
);

/// Runs the machine until CM_REG_MCYCLE reaches mcycle_end, the machine yields, or halts
const cm_run = lib.func(
    "int cm_run(cm_machine* m, uint64_t mcycle_end, _Out_ int* break_reason)",
);

/// Runs the machine microarchitecture until CM_REG_UARCH_CYCLE reaches uarch_cycle_end or it halts
const cm_run_uarch = lib.func(
    "int cm_run_uarch(cm_machine* m, uint64_t uarch_cycle_end, _Out_ int* uarch_break_reason)",
);

/// Resets the entire microarchitecture state to pristine values
const cm_reset_uarch = lib.func("int cm_reset_uarch(cm_machine* m)");

/// Receives a cmio request
const cm_receive_cmio_request = lib.func(
    "int cm_receive_cmio_request(const cm_machine* m, _Out_ uint8_t* cmd, _Out_ uint16_t* reason, _Inout_ uint8_t* data, _Inout_ uint64_t* length)",
);

/// Sends a cmio response
const cm_send_cmio_response = lib.func(
    "int cm_send_cmio_response(cm_machine* m, uint16_t reason, const uint8_t* data, uint64_t length)",
);

/// Runs the machine for the given mcycle count and generates a log of accessed pages and proof data
const cm_log_step = lib.func(
    "int cm_log_step(cm_machine* m, uint64_t mcycle_count, const char* log_filename, _Out_ int* break_reason)",
);

/// Runs the machine in the microarchitecture for one micro cycle logging all accesses to the state
const cm_log_step_uarch = lib.func(
    "int cm_log_step_uarch(cm_machine* m, int32_t log_type, _Out_ const char** log)",
);

/// Resets the entire microarchitecture state to pristine values logging all accesses to the state
const cm_log_reset_uarch = lib.func(
    "int cm_log_reset_uarch(cm_machine* m, int32_t log_type, _Out_ const char** log)",
);

/// Sends a cmio response logging all accesses to the state
const cm_log_send_cmio_response = lib.func(
    "int cm_log_send_cmio_response(cm_machine* m, uint16_t reason, const uint8_t* data, uint64_t length, int32_t log_type, _Out_ const char** log)",
);

/// Checks the validity of a step log file
const cm_verify_step = lib.func(
    "int cm_verify_step(const cm_machine* m, const uint8_t* root_hash_before, const char* log_filename, uint64_t mcycle_count, const uint8_t* root_hash_after, _Out_ int* break_reason)",
);

/// Checks the validity of a state transition produced by cm_log_step_uarch
const cm_verify_step_uarch = lib.func(
    "int cm_verify_step_uarch(const cm_machine* m, const uint8_t* root_hash_before, const char* log, const uint8_t* root_hash_after)",
);

/// Checks the validity of a state transition produced by cm_log_reset_uarch
const cm_verify_reset_uarch = lib.func(
    "int cm_verify_reset_uarch(const cm_machine* m, const uint8_t* root_hash_before, const char* log, const uint8_t* root_hash_after)",
);

/// Checks the validity of a state transition produced by cm_log_send_cmio_response
const cm_verify_send_cmio_response = lib.func(
    "int cm_verify_send_cmio_response(const cm_machine* m, uint16_t reason, const uint8_t* data, uint64_t length, const uint8_t* root_hash_before, const char* log, const uint8_t* root_hash_after)",
);

/// Verifies integrity of Merkle tree against current machine state
const cm_verify_merkle_tree = lib.func(
    "int cm_verify_merkle_tree(cm_machine* m, _Out_ bool* result)",
);

/// Verifies integrity of dirty page maps
const cm_verify_dirty_page_maps = lib.func(
    "int cm_verify_dirty_page_maps(cm_machine* m, _Out_ bool* result)",
);

/// Access log types
enum AccessLogTypeEnum {
    Annotations = 1, ///< Includes annotations
    LargeData = 2, ///< Includes data larger than 8 bytes
}

// -----------------------------------------------------------------------------
// High-level wrapper class
// -----------------------------------------------------------------------------

/**
 * High-level wrapper for the Cartesi Machine C API
 */
const machineFinalizer = new FinalizationRegistry((machineHandle: any) => {
    if (machineHandle) {
        cm_delete(machineHandle);
    }
});

export class NodeCartesiMachine {
    protected machine: any = null;

    /**
     * Creates a new local machine object
     */
    static new(): CartesiMachine {
        const machine = [null];
        const result = cm_new(machine);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return new NodeCartesiMachine(machine[0]);
    }

    /**
     * Clones an empty machine object from an existing one
     */
    cloneEmpty(): CartesiMachine {
        // Cast to NodeCartesiMachine to access .machine (safe in this context)
        const machine = [null];
        const result = cm_clone_empty(this.machine, machine);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return new NodeCartesiMachine(machine[0]);
    }

    /**
     * Creates a new machine with configuration
     */
    static createNew(
        config: MachineConfig,
        runtimeConfig?: MachineRuntimeConfig,
    ): CartesiMachine {
        const machine = [null];
        const result = cm_create_new(
            JSON.stringify(config),
            runtimeConfig ? JSON.stringify(runtimeConfig) : null,
            machine,
        );
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return new NodeCartesiMachine(machine[0]);
    }

    /**
     * Loads a machine from a directory
     */
    static loadNew(
        dir: string,
        runtimeConfig?: MachineRuntimeConfig,
    ): CartesiMachine {
        const machine = [null];
        const result = cm_load_new(
            dir,
            runtimeConfig ? JSON.stringify(runtimeConfig) : null,
            machine,
        );
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return new NodeCartesiMachine(machine[0]);
    }

    constructor(machine: any) {
        this.machine = machine;
        machineFinalizer.register(this, machine);
    }

    /**
     * Gets the last error message
     */
    static getLastError(): string {
        return cm_get_last_error_message();
    }

    /**
     * Gets the default configuration
     */
    getDefaultConfig(): MachineConfig {
        const config: [string | null] = [null];
        const result = cm_get_default_config(this.machine, config);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return JSON.parse(config[0] as string) as MachineConfig;
    }

    /**
     * Gets the default configuration
     */
    static getDefaultConfig(): MachineConfig {
        const config: [string | null] = [null];
        const result = cm_get_default_config(null, config);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return JSON.parse(config[0] as string) as MachineConfig;
    }

    /**
     * Gets the address of a register
     */
    getRegAddress(reg: Reg): bigint {
        const address = [0n];
        const result = cm_get_reg_address(this.machine, reg, address);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return address[0];
    }

    /**
     * Gets the address of a register
     */
    static getRegAddress(reg: Reg): bigint {
        const address = [0n];
        const result = cm_get_reg_address(null, reg, address);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return address[0];
    }

    /**
     * Checks if the machine is empty
     */
    isEmpty(): boolean {
        const empty = [false];
        const result = cm_is_empty(this.machine, empty);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return empty[0];
    }

    /**
     * Creates a new machine instance from configuration
     */
    create(
        config: MachineConfig,
        runtimeConfig?: MachineRuntimeConfig,
    ): CartesiMachine {
        const result = cm_create(
            this.machine,
            JSON.stringify(config),
            runtimeConfig ? JSON.stringify(runtimeConfig) : null,
        );
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return this;
    }

    /**
     * Loads a machine instance from a directory
     */
    load(dir: string, runtimeConfig?: MachineRuntimeConfig): CartesiMachine {
        const result = cm_load(
            this.machine,
            dir,
            runtimeConfig ? JSON.stringify(runtimeConfig) : null,
        );
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return this;
    }

    /**
     * Stores the machine instance to a directory
     */
    store(dir: string): CartesiMachine {
        const result = cm_store(this.machine, dir);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return this;
    }

    /**
     * Destroys the machine instance
     */
    destroy(): void {
        const result = cm_destroy(this.machine);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
    }

    /**
     * Sets the runtime configuration
     */
    setRuntimeConfig(runtimeConfig: MachineRuntimeConfig): void {
        const result = cm_set_runtime_config(
            this.machine,
            JSON.stringify(runtimeConfig),
        );
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
    }

    /**
     * Gets the runtime configuration
     */
    getRuntimeConfig(): MachineRuntimeConfig {
        const config: [string | null] = [null];
        const result = cm_get_runtime_config(this.machine, config);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return JSON.parse(config[0] as string) as MachineRuntimeConfig;
    }

    /**
     * Replaces a memory range
     */
    replaceMemoryRange(
        start: bigint,
        length: bigint,
        shared: boolean,
        imageFilename?: string,
    ): void {
        const result = cm_replace_memory_range(
            this.machine,
            start,
            length,
            shared,
            imageFilename || null,
        );
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
    }

    /**
     * Gets the initial configuration
     */
    getInitialConfig(): MachineConfig {
        const config: [string | null] = [null];
        const result = cm_get_initial_config(this.machine, config);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return JSON.parse(config[0] as string) as MachineConfig;
    }

    /**
     * Gets memory ranges
     */
    getMemoryRanges(): MemoryRangeDescription[] {
        const ranges: [string | null] = [null];
        const result = cm_get_memory_ranges(this.machine, ranges);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return JSON.parse(ranges[0] as string) as MemoryRangeDescription[];
    }

    /**
     * Gets the root hash
     */
    getRootHash(): Buffer {
        const hash = Buffer.alloc(Constant.HashSize);
        const result = cm_get_root_hash(this.machine, hash);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return hash;
    }

    /**
     * Gets a proof for a node in the Merkle tree
     */
    getProof(address: bigint, log2Size: number): Proof {
        const proof: [string | null] = [null];
        const result = cm_get_proof(this.machine, address, log2Size, proof);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return JSON.parse(proof[0] as string) as Proof;
    }

    /**
     * Reads a word from memory
     */
    readWord(address: bigint): bigint {
        const value = [0n];
        const result = cm_read_word(this.machine, address, value);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return value[0];
    }

    /**
     * Reads a register
     */
    readReg(reg: Reg): bigint {
        const value = [0n];
        const result = cm_read_reg(this.machine, reg, value);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return value[0];
    }

    /**
     * Writes a register
     */
    writeReg(reg: Reg, value: bigint): void {
        const result = cm_write_reg(this.machine, reg, value);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
    }

    /**
     * Reads memory
     */
    readMemory(address: bigint, length: bigint): Buffer {
        const data = Buffer.alloc(Number(length));
        const result = cm_read_memory(this.machine, address, data, length);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return data;
    }

    /**
     * Writes memory
     */
    writeMemory(address: bigint, data: Buffer): void {
        const result = cm_write_memory(
            this.machine,
            address,
            data,
            BigInt(data.length),
        );
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
    }

    /**
     * Reads virtual memory
     */
    readVirtualMemory(address: bigint, length: bigint): Buffer {
        const data = Buffer.alloc(Number(length));
        const result = cm_read_virtual_memory(
            this.machine,
            address,
            data,
            length,
        );
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return data;
    }

    /**
     * Writes virtual memory
     */
    writeVirtualMemory(address: bigint, data: Buffer): void {
        const result = cm_write_virtual_memory(
            this.machine,
            address,
            data,
            BigInt(data.length),
        );
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
    }

    /**
     * Translates a virtual address to physical address
     */
    translateVirtualAddress(vaddr: bigint): bigint {
        const paddr = [0n];
        const result = cm_translate_virtual_address(this.machine, vaddr, paddr);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return paddr[0];
    }

    /**
     * Runs the machine
     */
    run(mcycleEnd: bigint = MAX_MCYCLE): BreakReason {
        const breakReason = [0];
        const result = cm_run(this.machine, mcycleEnd, breakReason);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return breakReason[0];
    }

    /**
     * Runs the microarchitecture
     */
    runUarch(uarchCycleEnd: bigint): UarchBreakReason {
        const breakReason = [0];
        const result = cm_run_uarch(this.machine, uarchCycleEnd, breakReason);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return breakReason[0];
    }

    /**
     * Resets the microarchitecture
     */
    resetUarch(): void {
        const result = cm_reset_uarch(this.machine);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
    }

    /**
     * Receives a CMIO request
     */
    receiveCmioRequest(): {
        cmd: CmioYieldCommand;
        reason: CmioYieldReason;
        data: Buffer;
    } {
        const cmd = [0];
        const reason = [0];
        const data = Buffer.allocUnsafe(2 * 1024 * 1024); // 2MB buffer
        const length = [data.length];

        const result = cm_receive_cmio_request(
            this.machine,
            cmd,
            reason,
            data,
            length,
        );
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }

        return {
            cmd: cmd[0],
            reason: reason[0],
            data: data.subarray(0, length[0]),
        };
    }

    /**
     * Sends a CMIO response
     */
    sendCmioResponse(reason: CmioYieldReason, data: Buffer): void {
        const result = cm_send_cmio_response(
            this.machine,
            reason,
            data,
            BigInt(data.length),
        );
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
    }

    /**
     * Logs a step
     */
    logStep(mcycleCount: bigint, logFilename: string): BreakReason {
        const breakReason = [0];
        const result = cm_log_step(
            this.machine,
            mcycleCount,
            logFilename,
            breakReason,
        );
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return breakReason[0];
    }

    /**
     * Logs a uarch step
     */
    logStepUarch(logType: AccessLogType): AccessLog {
        const log: [string | null] = [null];
        let type = 0;
        type |= logType.has_annotations ? AccessLogTypeEnum.Annotations : 0;
        type |= logType.has_large_data ? AccessLogTypeEnum.LargeData : 0;

        const result = cm_log_step_uarch(this.machine, type, log);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return JSON.parse(log[0] as string) as AccessLog;
    }

    /**
     * Logs uarch reset
     */
    logResetUarch(logType: AccessLogType): AccessLog {
        const log: [string | null] = [null];
        let type = 0;
        type |= logType.has_annotations ? AccessLogTypeEnum.Annotations : 0;
        type |= logType.has_large_data ? AccessLogTypeEnum.LargeData : 0;

        const result = cm_log_reset_uarch(this.machine, type, log);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return JSON.parse(log[0] as string) as AccessLog;
    }

    /**
     * Logs CMIO response
     */
    logSendCmioResponse(
        reason: CmioYieldReason,
        data: Buffer,
        logType: AccessLogType,
    ): string {
        const log: [string | null] = [null];
        let type = 0;
        type |= logType.has_annotations ? AccessLogTypeEnum.Annotations : 0;
        type |= logType.has_large_data ? AccessLogTypeEnum.LargeData : 0;

        const result = cm_log_send_cmio_response(
            this.machine,
            reason,
            data,
            BigInt(data.length),
            type,
            log,
        );
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return log[0] as string;
    }

    /**
     * Verifies a step
     */
    verifyStep(
        rootHashBefore: Buffer,
        logFilename: string,
        mcycleCount: bigint,
        rootHashAfter: Buffer,
    ): BreakReason {
        const breakReason = [0];
        const result = cm_verify_step(
            this.machine,
            rootHashBefore,
            logFilename,
            mcycleCount,
            rootHashAfter,
            breakReason,
        );
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return breakReason[0];
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
        const breakReason = [0];
        const result = cm_verify_step(
            null,
            rootHashBefore,
            logFilename,
            mcycleCount,
            rootHashAfter,
            breakReason,
        );
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return breakReason[0];
    }

    /**
     * Verifies a uarch step
     */
    verifyStepUarch(
        rootHashBefore: Buffer,
        log: AccessLog,
        rootHashAfter: Buffer,
    ): void {
        const result = cm_verify_step_uarch(
            this.machine,
            rootHashBefore,
            JSON.stringify(log),
            rootHashAfter,
        );
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
    }

    /**
     * Verifies a uarch step
     */
    static verifyStepUarch(
        rootHashBefore: Buffer,
        log: AccessLog,
        rootHashAfter: Buffer,
    ): void {
        const result = cm_verify_step_uarch(
            null,
            rootHashBefore,
            JSON.stringify(log),
            rootHashAfter,
        );
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
    }

    /**
     * Verifies uarch reset
     */
    verifyResetUarch(
        rootHashBefore: Buffer,
        log: AccessLog,
        rootHashAfter: Buffer,
    ): void {
        const result = cm_verify_reset_uarch(
            this.machine,
            rootHashBefore,
            JSON.stringify(log),
            rootHashAfter,
        );
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
    }

    /**
     * Verifies uarch reset
     */
    static verifyResetUarch(
        rootHashBefore: Buffer,
        log: AccessLog,
        rootHashAfter: Buffer,
    ): void {
        const result = cm_verify_reset_uarch(
            null,
            rootHashBefore,
            JSON.stringify(log),
            rootHashAfter,
        );
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
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
        const result = cm_verify_send_cmio_response(
            this.machine,
            reason,
            data,
            BigInt(data.length),
            rootHashBefore,
            JSON.stringify(log),
            rootHashAfter,
        );
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
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
        const result = cm_verify_send_cmio_response(
            null,
            reason,
            data,
            BigInt(data.length),
            rootHashBefore,
            JSON.stringify(log),
            rootHashAfter,
        );
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
    }

    /**
     * Verifies Merkle tree integrity
     */
    verifyMerkleTree(): boolean {
        const result = [false];
        const error = cm_verify_merkle_tree(this.machine, result);
        if (error !== ErrorCode.Ok) {
            throw MachineError.fromCode(error);
        }
        return result[0];
    }

    /**
     * Verifies dirty page maps integrity
     */
    verifyDirtyPageMaps(): boolean {
        const result = [false];
        const error = cm_verify_dirty_page_maps(this.machine, result);
        if (error !== ErrorCode.Ok) {
            throw MachineError.fromCode(error);
        }
        return result[0];
    }
}
