import type { CartesiMachine } from "./cartesi-machine";
import { NodeRemoteCartesiMachine } from "./node/remote-cartesi-machine";
import type { MachineConfig, MachineRuntimeConfig } from "./types";

// -----------------------------------------------------------------------------
// Type definitions
// -----------------------------------------------------------------------------

export enum CleanupCall {
    Nothing = 0, // CM_JSONRPC_NOTHING
    Destroy = 1, // CM_JSONRPC_DESTROY
    Shutdown = 2, // CM_JSONRPC_SHUTDOWN
}

// -----------------------------------------------------------------------------
// High-level TypeScript wrapper classes
// -----------------------------------------------------------------------------

export interface RemoteCartesiMachine extends CartesiMachine {
    getServerAddress(): string;
    getServerPid(): number | null;
    shutdown(): void;
    rebind(address: string): string;
    emancipate(): void;
    setTimeout(ms: number): void;
    getTimeout(): number;
    setCleanupCall(call: CleanupCall): RemoteCartesiMachine;
    getCleanupCall(): CleanupCall;
    getServerVersion(): string;
    delayNextRequest(ms: number): void;
    getBoundAddress(): string | null;
    fork(): RemoteCartesiMachine;
    load(
        dir: string,
        runtimeConfig?: MachineRuntimeConfig,
    ): RemoteCartesiMachine;
    cloneEmpty(): RemoteCartesiMachine;
    create(
        config: MachineConfig,
        runtimeConfig?: MachineRuntimeConfig,
    ): RemoteCartesiMachine;
    store(dir: string): RemoteCartesiMachine;
}

// -----------------------------------------------------------------------------
// Utility functions
// -----------------------------------------------------------------------------

export function spawn(
    address: string = "127.0.0.1:0",
    timeout: number = -1,
): RemoteCartesiMachine {
    return NodeRemoteCartesiMachine.spawn(address, timeout);
}

export function connect(
    address: string,
    timeout: number = -1,
): RemoteCartesiMachine {
    return NodeRemoteCartesiMachine.connect(address, timeout);
}
