import { ErrorCode, MachineError } from "../cartesi-machine";
import type { CleanupCall } from "../remote-cartesi-machine";
import type { MachineConfig, MachineRuntimeConfig } from "../types";
import { NodeCartesiMachine } from "./cartesi-machine";
import { loadLibrary } from "./lib-loader";

// Load the Cartesi Machine JSON-RPC library
const lib = loadLibrary("cartesi_jsonrpc");
const libc = loadLibrary("c");

const cm_jsonrpc_spawn_server = lib.func(
    "int cm_jsonrpc_spawn_server(const char *address, int64_t spawn_timeout_ms, _Out_ cm_machine **new_m, _Out_ const char **bound_address, _Out_ uint32_t *pid)",
);
const cm_jsonrpc_connect_server = lib.func(
    "int cm_jsonrpc_connect_server(const char *address, int64_t connect_timeout_ms, _Out_ cm_machine **new_m)",
);
const cm_jsonrpc_fork_server = lib.func(
    "int cm_jsonrpc_fork_server(const cm_machine *m, _Out_ cm_machine **forked_m, _Out_ const char **address, _Out_ uint32_t *pid)",
);
const cm_jsonrpc_shutdown_server = lib.func(
    "int cm_jsonrpc_shutdown_server(cm_machine *m)",
);
const cm_jsonrpc_rebind_server = lib.func(
    "int cm_jsonrpc_rebind_server(cm_machine *m, const char *address, _Out_ const char **address_bound)",
);
const cm_jsonrpc_get_server_version = lib.func(
    "int cm_jsonrpc_get_server_version(const cm_machine *m, _Out_ const char **version)",
);
const cm_jsonrpc_emancipate_server = lib.func(
    "int cm_jsonrpc_emancipate_server(cm_machine *m)",
);
const cm_jsonrpc_set_timeout = lib.func(
    "int cm_jsonrpc_set_timeout(cm_machine *m, int64_t ms)",
);
const cm_jsonrpc_get_timeout = lib.func(
    "int cm_jsonrpc_get_timeout(cm_machine *m, _Out_ int64_t *ms)",
);
const cm_jsonrpc_set_cleanup_call = lib.func(
    "int cm_jsonrpc_set_cleanup_call(cm_machine *m, int call)",
);
const cm_jsonrpc_get_cleanup_call = lib.func(
    "int cm_jsonrpc_get_cleanup_call(cm_machine *m, _Out_ int *call)",
);
const cm_jsonrpc_get_server_address = lib.func(
    "int cm_jsonrpc_get_server_address(cm_machine *m, _Out_ const char **address)",
);
const cm_jsonrpc_delay_next_request = lib.func(
    "int cm_jsonrpc_delay_next_request(cm_machine *m, uint64_t ms)",
);

const fcntl = libc.func("int fcntl(int fd, int cmd, int arg)");

const F_GETFD = 1; // Get file descriptor flags
const F_SETFD = 2; // Set file descriptor flags
const FD_CLOEXEC = 1; // Close-on-exec flag

function clearCloexec(fd: number): number {
    // Get current flags
    const flags = fcntl(fd, F_GETFD, 0);
    if (flags === -1) {
        throw new Error(`Failed to get flags for fd ${fd}`);
    }

    // Clear the FD_CLOEXEC bit
    const newFlags = flags & ~FD_CLOEXEC;

    // Set the new flags
    const result = fcntl(fd, F_SETFD, newFlags);
    if (result === -1) {
        throw new Error(`Failed to set flags for fd ${fd}`);
    }

    return flags;
}

function setCloexec(fd: number, value: number): void {
    // Set the flags value
    const result = fcntl(fd, F_SETFD, value);
    if (result === -1) {
        throw new Error(`Failed to set flags for fd ${fd}`);
    }
}

export class NodeRemoteCartesiMachine extends NodeCartesiMachine {
    private serverAddress: string | null = null;
    private serverPid: number | null = null;

    static spawn(
        address: string = "127.0.0.1:0",
        spawnTimeoutMs: number = -1,
    ): NodeRemoteCartesiMachine {
        // Disable close-on-exec for stdout
        const flags = clearCloexec(1);
        try {
            const newMachinePtr: [any] = [null];
            const boundAddressPtr: [string | null] = [null];
            const pidPtr: [number | null] = [null];
            const result = cm_jsonrpc_spawn_server(
                address,
                spawnTimeoutMs,
                newMachinePtr,
                boundAddressPtr,
                pidPtr,
            );
            if (result !== ErrorCode.Ok) {
                throw MachineError.fromCode(result);
            }
            if (boundAddressPtr[0] === null || pidPtr[0] === null) {
                throw new Error(
                    "Failed to get output parameters from spawn server",
                );
            }
            const instance = new NodeRemoteCartesiMachine(newMachinePtr[0]);
            instance.serverAddress = boundAddressPtr[0];
            instance.serverPid = pidPtr[0];
            return instance;
        } finally {
            setCloexec(1, flags);
        }
    }

    static connect(
        address: string,
        connectTimeoutMs: number = -1,
    ): NodeRemoteCartesiMachine {
        const newMachinePtr: [any] = [null];
        const result = cm_jsonrpc_connect_server(
            address,
            connectTimeoutMs,
            newMachinePtr,
        );
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        const instance = new NodeRemoteCartesiMachine(newMachinePtr[0]);
        instance.serverAddress = address;
        return instance;
    }

    fork(): NodeRemoteCartesiMachine {
        const forkedMachinePtr: [any] = [null];
        const addressPtr: [string | null] = [null];
        const pidPtr: [number | null] = [null];
        const result = cm_jsonrpc_fork_server(
            this.machine,
            forkedMachinePtr,
            addressPtr,
            pidPtr,
        );
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        if (addressPtr[0] === null || pidPtr[0] === null) {
            throw new Error("Failed to get output parameters from fork server");
        }
        const instance = new NodeRemoteCartesiMachine(forkedMachinePtr[0]);
        instance.serverAddress = addressPtr[0];
        instance.serverPid = pidPtr[0];
        return instance;
    }

    shutdown(): void {
        const result = cm_jsonrpc_shutdown_server(this.machine);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
    }

    rebind(address: string): string {
        const addressBoundPtr: [string | null] = [null];
        const result = cm_jsonrpc_rebind_server(
            this.machine,
            address,
            addressBoundPtr,
        );
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        if (addressBoundPtr[0] === null) {
            throw new Error("Failed to get bound address from rebind server");
        }
        this.serverAddress = addressBoundPtr[0];
        return addressBoundPtr[0];
    }

    getServerVersion(): string {
        const versionPtr: [string | null] = [null];
        const result = cm_jsonrpc_get_server_version(this.machine, versionPtr);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        if (versionPtr[0] === null) {
            throw new Error("Failed to get server version");
        }
        return versionPtr[0];
    }

    emancipate(): void {
        const result = cm_jsonrpc_emancipate_server(this.machine);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
    }

    setTimeout(ms: number): void {
        const result = cm_jsonrpc_set_timeout(this.machine, ms);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
    }

    getTimeout(): number {
        const msPtr: [number | null] = [null];
        const result = cm_jsonrpc_get_timeout(this.machine, msPtr);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        if (msPtr[0] === null) {
            throw new Error("Failed to get timeout");
        }
        return msPtr[0];
    }

    setCleanupCall(call: CleanupCall): NodeRemoteCartesiMachine {
        const result = cm_jsonrpc_set_cleanup_call(this.machine, call);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        return this;
    }

    getCleanupCall(): CleanupCall {
        const callPtr: [number | null] = [null];
        const result = cm_jsonrpc_get_cleanup_call(this.machine, callPtr);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        if (callPtr[0] === null) {
            throw new Error("Failed to get cleanup call");
        }
        return callPtr[0];
    }

    getServerAddress(): string {
        const addressPtr: [string | null] = [null];
        const result = cm_jsonrpc_get_server_address(this.machine, addressPtr);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
        if (addressPtr[0] === null) {
            throw new Error("Failed to get server address");
        }
        return addressPtr[0];
    }

    delayNextRequest(ms: number): void {
        const result = cm_jsonrpc_delay_next_request(this.machine, ms);
        if (result !== ErrorCode.Ok) {
            throw MachineError.fromCode(result);
        }
    }

    getBoundAddress(): string | null {
        return this.serverAddress;
    }

    getServerPid(): number | null {
        return this.serverPid;
    }

    load(
        dir: string,
        runtimeConfig?: MachineRuntimeConfig,
    ): NodeRemoteCartesiMachine {
        super.load(dir, runtimeConfig);
        return this;
    }

    cloneEmpty(): NodeRemoteCartesiMachine {
        super.cloneEmpty();
        return this;
    }

    create(
        config: MachineConfig,
        runtimeConfig?: MachineRuntimeConfig,
    ): NodeRemoteCartesiMachine {
        super.create(config, runtimeConfig);
        return this;
    }

    store(dir: string): NodeRemoteCartesiMachine {
        super.store(dir);
        return this;
    }
}
