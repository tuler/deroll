/**
 * TypeScript type definitions for Cartesi Machine
 * Based on the JSON-RPC schema from jsonrpc-discover.json
 */

// Base types
export type UnsignedInteger = number; // integer with minimum 0
export type Base64String = string; // string with contentEncoding: "base64"
export type Base64Hash = string; // 32-byte hash encoded in base64 (45 chars)

// VirtIO Device Types
export type VirtIODeviceType = "console" | "p9fs" | "net-user" | "net-tuntap";

// Concurrency Runtime Configuration
export interface ConcurrencyRuntimeConfig {
    update_merkle_tree?: UnsignedInteger;
}

// HTIF Runtime Configuration
export interface HTIFRuntimeConfig {
    no_console_putchar?: boolean;
}

// Main Machine Runtime Configuration
export interface MachineRuntimeConfig {
    concurrency?: ConcurrencyRuntimeConfig;
    htif?: HTIFRuntimeConfig;
    skip_root_hash_check?: boolean;
    skip_root_hash_store?: boolean;
    skip_version_check?: boolean;
    soft_yield?: boolean;
}

// Processor Configuration
export interface ProcessorConfig {
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

// RAM Configuration
export interface RAMConfig {
    length: UnsignedInteger; // Required
    image_filename?: string;
}

// Device Tree Blob Configuration
export interface DTBConfig {
    bootargs?: string;
    init?: string;
    entrypoint?: string;
    image_filename?: string;
}

// Memory Range Configuration
export interface MemoryRangeConfig {
    start?: UnsignedInteger;
    length?: UnsignedInteger;
    image_filename?: string;
    shared?: boolean;
}

// Memory Range Description
export interface MemoryRangeDescription {
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

// TLB Configuration
export interface TLBConfig {
    image_filename?: string;
}

// CLINT Configuration
export interface CLINTConfig {
    mtimecmp?: UnsignedInteger;
}

// PLIC Configuration
export interface PLICConfig {
    girqpend?: UnsignedInteger;
    girqsrvd?: UnsignedInteger;
}

// HTIF Configuration
export interface HTIFConfig {
    fromhost?: UnsignedInteger;
    tohost?: UnsignedInteger;
    console_getchar?: boolean;
    yield_manual?: boolean;
    yield_automatic?: boolean;
}

// Microarchitecture Processor Configuration
export interface UarchProcessorConfig {
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

// Microarchitecture RAM Configuration
export interface UarchRAMConfig {
    length?: UnsignedInteger;
    image_filename?: string;
}

// Microarchitecture Configuration
export interface UarchConfig {
    processor?: UarchProcessorConfig;
    ram?: UarchRAMConfig;
}

// CMIO Buffer Configuration
export interface CmioBufferConfig {
    image_filename?: string;
    shared?: boolean;
}

// CMIO Configuration
export interface CmioConfig {
    rx_buffer?: CmioBufferConfig;
    tx_buffer?: CmioBufferConfig;
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
    tlb?: TLBConfig;
    clint?: CLINTConfig;
    plic?: PLICConfig;
    htif?: HTIFConfig;
    uarch?: UarchConfig;
    cmio?: CmioConfig;
    virtio?: VirtIOConfigs;
}
