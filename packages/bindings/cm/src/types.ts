/**
 * TypeScript type definitions for Cartesi Machine
 * Based on the JSON-RPC schema from jsonrpc-discover.json (machine-emulator 0.20)
 */

// Base types
export type UnsignedInteger = number; // integer with minimum 0
export type Base64String = string; // string with contentEncoding: "base64"
export type Base64Hash = string; // 32-byte hash encoded in base64 (45 chars)

// VirtIO Device Types
export type VirtIODeviceType = "console" | "p9fs" | "net-user" | "net-tuntap";

// Hash function used by the hash tree
export type HashFunctionType = "keccak256" | "sha256";

// Concurrency Runtime Configuration
export interface ConcurrencyRuntimeConfig {
    update_hash_tree?: UnsignedInteger;
}

// Console output destinations
export type ConsoleOutputDestination =
    | "to_null"
    | "to_stdout"
    | "to_stderr"
    | "to_fd"
    | "to_file"
    | "to_buffer";

// Console input sources
export type ConsoleInputSource =
    | "from_null"
    | "from_stdin"
    | "from_fd"
    | "from_file"
    | "from_buffer";

// Console output flush modes
export type ConsoleFlushMode = "when_full" | "every_char" | "every_line";

// Console Runtime Configuration
export interface ConsoleRuntimeConfig {
    output_destination?: ConsoleOutputDestination;
    output_flush_mode?: ConsoleFlushMode;
    output_buffer_size?: UnsignedInteger;
    output_fd?: number;
    output_filename?: string;
    input_source?: ConsoleInputSource;
    input_buffer_size?: UnsignedInteger;
    input_fd?: number;
    input_filename?: string;
    tty_cols?: number;
    tty_rows?: number;
}

// Main Machine Runtime Configuration
export interface MachineRuntimeConfig {
    console?: ConsoleRuntimeConfig;
    concurrency?: ConcurrencyRuntimeConfig;
    skip_version_check?: boolean;
    soft_yield?: boolean;
    no_reserve?: boolean;
}

// Backing Store Configuration
export interface BackingStoreConfig {
    data_filename?: string; // Backing store for the associated address range
    dht_filename?: string; // Backing store for the corresponding dense hash-tree
    dpt_filename?: string; // Backing store for the corresponding dirty-page tree
    shared?: boolean;
    create?: boolean;
    truncate?: boolean;
}

// Machine Registers Configuration
export interface RegistersConfig {
    // General purpose registers (x0-x31)
    x0?: UnsignedInteger;
    x1?: UnsignedInteger;
    x2?: UnsignedInteger;
    x3?: UnsignedInteger;
    x4?: UnsignedInteger;
    x5?: UnsignedInteger;
    x6?: UnsignedInteger;
    x7?: UnsignedInteger;
    x8?: UnsignedInteger;
    x9?: UnsignedInteger;
    x10?: UnsignedInteger;
    x11?: UnsignedInteger;
    x12?: UnsignedInteger;
    x13?: UnsignedInteger;
    x14?: UnsignedInteger;
    x15?: UnsignedInteger;
    x16?: UnsignedInteger;
    x17?: UnsignedInteger;
    x18?: UnsignedInteger;
    x19?: UnsignedInteger;
    x20?: UnsignedInteger;
    x21?: UnsignedInteger;
    x22?: UnsignedInteger;
    x23?: UnsignedInteger;
    x24?: UnsignedInteger;
    x25?: UnsignedInteger;
    x26?: UnsignedInteger;
    x27?: UnsignedInteger;
    x28?: UnsignedInteger;
    x29?: UnsignedInteger;
    x30?: UnsignedInteger;
    x31?: UnsignedInteger;

    // Floating point registers (f0-f31)
    f0?: UnsignedInteger;
    f1?: UnsignedInteger;
    f2?: UnsignedInteger;
    f3?: UnsignedInteger;
    f4?: UnsignedInteger;
    f5?: UnsignedInteger;
    f6?: UnsignedInteger;
    f7?: UnsignedInteger;
    f8?: UnsignedInteger;
    f9?: UnsignedInteger;
    f10?: UnsignedInteger;
    f11?: UnsignedInteger;
    f12?: UnsignedInteger;
    f13?: UnsignedInteger;
    f14?: UnsignedInteger;
    f15?: UnsignedInteger;
    f16?: UnsignedInteger;
    f17?: UnsignedInteger;
    f18?: UnsignedInteger;
    f19?: UnsignedInteger;
    f20?: UnsignedInteger;
    f21?: UnsignedInteger;
    f22?: UnsignedInteger;
    f23?: UnsignedInteger;
    f24?: UnsignedInteger;
    f25?: UnsignedInteger;
    f26?: UnsignedInteger;
    f27?: UnsignedInteger;
    f28?: UnsignedInteger;
    f29?: UnsignedInteger;
    f30?: UnsignedInteger;
    f31?: UnsignedInteger;

    // Program counter and control registers
    pc?: UnsignedInteger;
    fcsr?: UnsignedInteger;
    mvendorid?: UnsignedInteger;
    marchid?: UnsignedInteger;
    mimpid?: UnsignedInteger;
    mcycle?: UnsignedInteger;
    icycleinstret?: UnsignedInteger;
    mstatus?: UnsignedInteger;
    mtvec?: UnsignedInteger;
    mscratch?: UnsignedInteger;
    mepc?: UnsignedInteger;
    mcause?: UnsignedInteger;
    mtval?: UnsignedInteger;
    misa?: UnsignedInteger;
    mie?: UnsignedInteger;
    mip?: UnsignedInteger;
    medeleg?: UnsignedInteger;
    mideleg?: UnsignedInteger;
    mcounteren?: UnsignedInteger;
    menvcfg?: UnsignedInteger;
    stvec?: UnsignedInteger;
    sscratch?: UnsignedInteger;
    sepc?: UnsignedInteger;
    scause?: UnsignedInteger;
    stval?: UnsignedInteger;
    satp?: UnsignedInteger;
    scounteren?: UnsignedInteger;
    senvcfg?: UnsignedInteger;
    ilrsc?: UnsignedInteger;
    iprv?: UnsignedInteger;
    iflags_X?: UnsignedInteger;
    iflags_Y?: UnsignedInteger;
    iflags_H?: UnsignedInteger;
    iunrep?: UnsignedInteger;
}

// Processor Configuration
export interface ProcessorConfig {
    registers?: RegistersConfig;
    backing_store?: BackingStoreConfig;
}

// RAM Configuration
export interface RAMConfig {
    length: UnsignedInteger; // Required
    backing_store?: BackingStoreConfig;
}

// Device Tree Blob Configuration
export interface DTBConfig {
    bootargs?: string;
    init?: string;
    entrypoint?: string;
    backing_store?: BackingStoreConfig;
}

// Memory Range Configuration
export interface MemoryRangeConfig {
    start?: UnsignedInteger;
    length?: UnsignedInteger;
    read_only?: boolean;
    backing_store?: BackingStoreConfig;
}

// Address Range Description
export interface AddressRangeDescription {
    start?: UnsignedInteger;
    length?: UnsignedInteger;
    description?: string;
}

// Proof
export interface Proof {
    target_address: UnsignedInteger;
    log2_target_size: UnsignedInteger;
    target_hash: Base64Hash;
    log2_root_size: UnsignedInteger;
    root_hash: Base64Hash;
    sibling_hashes: Base64Hash[];
}

// Access Type
export type AccessType = "read" | "write";

// Access Log Type
export interface AccessLogType {
    has_annotations: boolean;
    has_large_data: boolean;
}

// Access
export interface Access {
    type: AccessType;
    address: UnsignedInteger;
    log2_size: UnsignedInteger;
    read_hash: Base64Hash;
    read?: Base64String;
    written_hash?: Base64Hash;
    written?: Base64String;
    sibling_hashes?: Base64Hash[];
}

// Bracket Type
export type BracketType = "begin" | "end";

// Bracket
export interface Bracket {
    type: BracketType;
    where: UnsignedInteger;
    text: string;
}

// Access Log
export interface AccessLog {
    log_type: AccessLogType;
    accesses: Access[];
    notes?: string[];
    brackets?: Bracket[];
}

// Flash Drive Configurations (array of memory ranges)
export type FlashDriveConfigs = MemoryRangeConfig[];

// Microarchitecture Registers Configuration
export interface UarchRegistersConfig {
    // General purpose registers (x0-x31)
    x0?: UnsignedInteger;
    x1?: UnsignedInteger;
    x2?: UnsignedInteger;
    x3?: UnsignedInteger;
    x4?: UnsignedInteger;
    x5?: UnsignedInteger;
    x6?: UnsignedInteger;
    x7?: UnsignedInteger;
    x8?: UnsignedInteger;
    x9?: UnsignedInteger;
    x10?: UnsignedInteger;
    x11?: UnsignedInteger;
    x12?: UnsignedInteger;
    x13?: UnsignedInteger;
    x14?: UnsignedInteger;
    x15?: UnsignedInteger;
    x16?: UnsignedInteger;
    x17?: UnsignedInteger;
    x18?: UnsignedInteger;
    x19?: UnsignedInteger;
    x20?: UnsignedInteger;
    x21?: UnsignedInteger;
    x22?: UnsignedInteger;
    x23?: UnsignedInteger;
    x24?: UnsignedInteger;
    x25?: UnsignedInteger;
    x26?: UnsignedInteger;
    x27?: UnsignedInteger;
    x28?: UnsignedInteger;
    x29?: UnsignedInteger;
    x30?: UnsignedInteger;
    x31?: UnsignedInteger;

    // Program counter and control
    pc?: UnsignedInteger;
    cycle?: UnsignedInteger;
    halt_flag?: boolean;
}

// Microarchitecture Processor Configuration
export interface UarchProcessorConfig {
    registers?: UarchRegistersConfig;
    backing_store?: BackingStoreConfig;
}

// Microarchitecture RAM Configuration
export interface UarchRAMConfig {
    length?: UnsignedInteger;
    backing_store?: BackingStoreConfig;
}

// Microarchitecture Configuration
export interface UarchConfig {
    processor?: UarchProcessorConfig;
    ram?: UarchRAMConfig;
}

// CMIO Buffer Configuration
export interface CmioBufferConfig {
    backing_store?: BackingStoreConfig;
}

// CMIO Configuration
export interface CmioConfig {
    rx_buffer?: CmioBufferConfig;
    tx_buffer?: CmioBufferConfig;
}

// PMAs Configuration
export interface PMAsConfig {
    backing_store?: BackingStoreConfig;
}

// Hash Tree Configuration
export interface HashTreeConfig {
    shared?: boolean;
    create?: boolean;
    sht_filename?: string; // Backing storage for sparse hash-tree
    phtc_filename?: string; // Backing storage for page hash-tree cache
    phtc_size?: UnsignedInteger;
    hash_function?: HashFunctionType;
}

// VirtIO Host Forwarding
export interface VirtIOHostfwd {
    is_udp?: boolean;
    host_ip?: UnsignedInteger;
    guest_ip?: UnsignedInteger;
    host_port?: UnsignedInteger;
    guest_port?: UnsignedInteger;
}

// VirtIO Device Configuration
export interface VirtIODeviceConfig {
    type: VirtIODeviceType; // Required
    tag?: string;
    host_directory?: string;
    hostfwd?: VirtIOHostfwd[];
    iface?: string;
}

// VirtIO Configurations
export type VirtIOConfigs = VirtIODeviceConfig[];

// Main Machine Configuration
export interface MachineConfig {
    processor?: ProcessorConfig;
    ram: RAMConfig; // Required
    dtb?: DTBConfig;
    flash_drive?: FlashDriveConfigs;
    virtio?: VirtIOConfigs;
    cmio?: CmioConfig;
    pmas?: PMAsConfig;
    uarch?: UarchConfig;
    hash_tree?: HashTreeConfig;
}

// Page Hash Tree Cache Statistics
export interface PageHashTreeCacheStats {
    page_hits?: UnsignedInteger;
    page_misses?: UnsignedInteger;
    word_hits?: UnsignedInteger;
    word_misses?: UnsignedInteger;
    page_changes?: UnsignedInteger;
    inner_page_hashes?: UnsignedInteger;
    pristine_pages?: UnsignedInteger;
    non_pristine_pages?: UnsignedInteger;
}

// Hash Tree Statistics
export interface HashTreeStats {
    phtc?: PageHashTreeCacheStats;
    sparse_node_hashes?: UnsignedInteger;
    dense_node_hashes?: UnsignedInteger[];
}

// Interpreter break reason (JSON string representation)
export type InterpreterBreakReason =
    | "failed"
    | "halted"
    | "yielded_manually"
    | "yielded_automatically"
    | "yielded_softly"
    | "reached_target_mcycle"
    | "console_output"
    | "console_input";

// Result of collectMcycleRootHashes
export interface McycleRootHashes {
    hashes: Base64Hash[];
    mcycle_phase: UnsignedInteger;
    break_reason: InterpreterBreakReason;
    back_tree?: unknown;
    console_io_error?: string;
}

// Result of collectUarchCycleRootHashes
export interface UarchCycleRootHashes {
    hashes: Base64Hash[];
    reset_indices: UnsignedInteger[];
    break_reason: InterpreterBreakReason;
}
