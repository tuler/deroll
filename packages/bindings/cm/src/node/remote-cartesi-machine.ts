import type { SharingMode } from "../cartesi-machine.js";
import { MachineError } from "../cartesi-machine.js";
import type { CleanupCall } from "../remote-cartesi-machine.js";
import type { MachineConfig, MachineRuntimeConfig } from "../types.js";
import { addon, ensureJsonrpcServerBinary } from "./addon.js";
import { NodeCartesiMachine } from "./cartesi-machine.js";

/**
 * Converts errors thrown by the native addon into MachineError.
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

export class NodeRemoteCartesiMachine extends NodeCartesiMachine {
    private serverAddress: string | null = null;
    private serverPid: number | null = null;

    static spawn(
        address: string = "127.0.0.1:0",
        spawnTimeoutMs: number = -1,
    ): NodeRemoteCartesiMachine {
        // Point cm_jsonrpc_spawn_server at the bundled server executable
        // unless the caller already chose one.
        ensureJsonrpcServerBinary();
        const { machine, boundAddress, pid } = call(() =>
            addon.jsonrpcSpawnServer(address, spawnTimeoutMs),
        );
        const instance = new NodeRemoteCartesiMachine(machine);
        instance.serverAddress = boundAddress;
        instance.serverPid = pid;
        return instance;
    }

    static connect(
        address: string,
        connectTimeoutMs: number = -1,
    ): NodeRemoteCartesiMachine {
        const machine = call(() =>
            addon.jsonrpcConnectServer(address, connectTimeoutMs),
        );
        const instance = new NodeRemoteCartesiMachine(machine);
        instance.serverAddress = address;
        return instance;
    }

    fork(): NodeRemoteCartesiMachine {
        const { machine, address, pid } = call(() =>
            this.machine.jsonrpcFork(),
        );
        const instance = new NodeRemoteCartesiMachine(machine);
        instance.serverAddress = address;
        instance.serverPid = pid;
        return instance;
    }

    shutdown(): void {
        call(() => this.machine.jsonrpcShutdownServer());
    }

    rebind(address: string): string {
        const addressBound = call(() =>
            this.machine.jsonrpcRebindServer(address),
        );
        this.serverAddress = addressBound;
        return addressBound;
    }

    getServerVersion(): string {
        return call(() => this.machine.jsonrpcGetServerVersion());
    }

    emancipate(): void {
        call(() => this.machine.jsonrpcEmancipateServer());
    }

    setTimeout(ms: number): void {
        call(() => this.machine.jsonrpcSetTimeout(ms));
    }

    getTimeout(): number {
        return call(() => this.machine.jsonrpcGetTimeout());
    }

    setCleanupCall(call_: CleanupCall): NodeRemoteCartesiMachine {
        call(() => this.machine.jsonrpcSetCleanupCall(call_));
        return this;
    }

    getCleanupCall(): CleanupCall {
        return call(() => this.machine.jsonrpcGetCleanupCall());
    }

    getServerAddress(): string {
        return call(() => this.machine.jsonrpcGetServerAddress());
    }

    delayNextRequest(ms: number): void {
        call(() => this.machine.jsonrpcDelayNextRequest(ms));
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
        sharing?: SharingMode,
    ): NodeRemoteCartesiMachine {
        super.load(dir, runtimeConfig, sharing);
        return this;
    }

    cloneEmpty(): NodeRemoteCartesiMachine {
        super.cloneEmpty();
        return this;
    }

    create(
        config: MachineConfig,
        runtimeConfig?: MachineRuntimeConfig,
        dir?: string,
    ): NodeRemoteCartesiMachine {
        super.create(config, runtimeConfig, dir);
        return this;
    }

    store(dir: string, sharing?: SharingMode): NodeRemoteCartesiMachine {
        super.store(dir, sharing);
        return this;
    }
}
