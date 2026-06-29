import {
    BreakReason,
    CmioYieldReason,
    type CartesiMachine,
} from "./cartesi-machine";
import { NodeRemoteCartesiMachine } from "./node/remote-cartesi-machine";
import { spawn, type RemoteCartesiMachine } from "./remote-cartesi-machine";
import type { MachineRuntimeConfig } from "./types";

/**
 * Custom error class to signal the rollup has entered an invalid state
 */
export class RollupsFatalError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "RollupsFatalError";
    }
}

/**
 * Custom error class to signal an input was rejected
 */
export class RollupsInputRejectedError extends Error {
    constructor() {
        super("Input rejected");
        this.name = "RollupsInputRejectedError";
    }
}

/**
 * Advance requests can yield either an output or a report, indicated by the type field.
 * The data field contains the output or report data.
 */
export type AdvanceYield =
    | { type: "output"; data: Buffer }
    | { type: "report"; data: Buffer }
    | { type: "progress"; data: number };

export type AdvanceReturn = Buffer;

export type AdvanceResult = {
    outputs: Buffer[];
    reports: Buffer[];
    outputsMerkleRoot: Buffer;
};

export interface RollupsMachine {
    advance(input: Buffer): IterableIterator<AdvanceYield, AdvanceReturn>;
    advance(input: Buffer, options: { collect: true }): AdvanceResult;
    inspect(query: Buffer): IterableIterator<Buffer>;
    inspect(query: Buffer, options: { collect: true }): Buffer[];
    shutdown(): void;
    store(dir: string): RollupsMachine;
}

/**
 * Create a rollups machine from a local machine.
 * @param machine - The local machine.
 * @returns A rollups machine.
 */
function rollupsFromLocal(machine: CartesiMachine): RollupsMachine {
    return new LocalRollupsMachineImpl(machine);
}

/**
 * Create a rollups machine from a remote machine.
 * @param machine - The remote machine.
 * @returns A rollups machine.
 */
function rollupsFromRemote(
    machine: RemoteCartesiMachine,
    options?: { noRollback?: boolean },
): RollupsMachine {
    return new RemoteRollupsMachineImpl(machine, options?.noRollback ?? false);
}

const DEFAULT_ADDRESS = "127.0.0.1:0";
const DEFAULT_TIMEOUT = -1;

/**
 * Create a rollups machine from a store directory.
 * @param dir - The directory containing the store.
 * @param runtimeConfig - The runtime configuration.
 * @param address - The address of the remote machine.
 * @param timeout - The timeout for the remote machine.
 * @description This function spawns a new machine, and loads the stored snapshot on it.
 * @returns A rollups machine.
 */
function rollupsFromStore(
    dir: string,
    options?: {
        noRollback?: boolean;
        runtimeConfig?: MachineRuntimeConfig;
        address?: string;
        timeout?: number;
    },
): RollupsMachine {
    const { runtimeConfig } = options ?? {
        address: DEFAULT_ADDRESS,
        timeout: DEFAULT_TIMEOUT,
        runtimeConfig: undefined,
    };
    const address = options?.address ?? DEFAULT_ADDRESS;
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
    const machine = spawn(address, timeout).load(dir, runtimeConfig);
    return rollupsFromRemote(machine, options);
}

/**
 * Create a rollups machine from a remote machine.
 * @param machine - The remote machine.
 * @returns A rollups machine.
 */
export function rollups(
    machine: RemoteCartesiMachine,
    options?: { noRollback: boolean },
): RollupsMachine;

/**
 * Create a rollups machine from a local machine.
 * @param machine - The local machine.
 * @returns A rollups machine.
 */
export function rollups(machine: CartesiMachine): RollupsMachine;

/**
 * Create a rollups machine from a store directory.
 * @param dir - The directory containing the store.
 * @param runtimeConfig - The runtime configuration.
 * @param address - The address of the remote machine.
 * @param timeout - The timeout for the remote machine.
 * @description This function spawns a new machine, and loads the stored snapshot on it.
 * @returns A rollups machine.
 */
export function rollups(
    dir: string,
    options?: {
        noRollback?: boolean;
        runtimeConfig?: MachineRuntimeConfig;
        address?: string;
        timeout?: number;
    },
): RollupsMachine;

export function rollups(
    arg1: RemoteCartesiMachine | CartesiMachine | string,
    options?: {
        noRollback?: boolean;
        runtimeConfig?: MachineRuntimeConfig;
        address?: string;
        timeout?: number;
    },
): RollupsMachine {
    options = options ?? {
        noRollback: false,
        address: DEFAULT_ADDRESS,
        timeout: DEFAULT_TIMEOUT,
    };

    if (typeof arg1 === "string") {
        return rollupsFromStore(arg1, options);
    } else if (arg1 instanceof NodeRemoteCartesiMachine) {
        return rollupsFromRemote(arg1, options);
    } else {
        return rollupsFromLocal(arg1);
    }
}

abstract class RollupsMachineImpl implements RollupsMachine {
    abstract shutdown(): void;
    abstract store(dir: string): RollupsMachine;

    abstract startTransaction(): CartesiMachine;
    abstract commitTransaction(machine: CartesiMachine): void;
    abstract rollbackTransaction(machine: CartesiMachine): void;

    advance(input: Buffer, options?: { collect: true }): any {
        const generator = function* (
            this: RollupsMachineImpl,
        ): IterableIterator<AdvanceYield, AdvanceReturn> {
            // start a machine "transaction"
            const machine = this.startTransaction();

            // write input
            machine.sendCmioResponse(CmioYieldReason.AdvanceState, input);

            while (true) {
                // run machine until it yields or halts
                const breakReason = machine.run();

                switch (breakReason) {
                    case BreakReason.YieldedManually: {
                        const { reason, data } = machine.receiveCmioRequest();
                        switch (reason) {
                            case CmioYieldReason.ManualRxAccepted: {
                                // input was accepted
                                // shutdown the backup fork if it exists
                                this.commitTransaction(machine);
                                return data;
                            }
                            case CmioYieldReason.ManualRxRejected: {
                                // input was rejected
                                this.rollbackTransaction(machine);
                                throw new RollupsInputRejectedError();
                            }
                            case CmioYieldReason.ManualTxException: {
                                // exception
                                this.rollbackTransaction(machine);

                                const description = data.toString("utf-8"); // XXX: is this correct?
                                throw new RollupsFatalError(description);
                            }
                            default: {
                                this.rollbackTransaction(machine);
                                throw new RollupsFatalError(
                                    `Unexpected yield reason: ${reason}`,
                                );
                            }
                        }
                    }
                    case BreakReason.YieldedAutomatically: {
                        const { reason, data } = machine.receiveCmioRequest();
                        switch (reason) {
                            case CmioYieldReason.AutomaticProgress: {
                                try {
                                    const progress = data.readUInt32LE();
                                    yield {
                                        type: "progress",
                                        data: progress,
                                    };
                                } catch {
                                    // just ignore the progress in case cannot read it
                                }
                                break;
                            }
                            case CmioYieldReason.AutomaticTxOutput: {
                                yield { type: "output", data };
                                break;
                            }
                            case CmioYieldReason.AutomaticTxReport: {
                                yield { type: "report", data };
                                break;
                            }
                        }
                        continue; // run again
                    }
                    default: {
                        this.rollbackTransaction(machine);
                        throw new RollupsFatalError(
                            `Unexpected break reason: ${breakReason}`,
                        );
                    }
                }
            }
        }.bind(this);

        if (options?.collect) {
            const outputs: Buffer[] = [];
            const reports: Buffer[] = [];
            const rollups = generator();
            while (true) {
                const event = rollups.next();
                if (event.done) {
                    return { outputs, reports, outputsMerkleRoot: event.value };
                }
                switch (event.value.type) {
                    case "output":
                        outputs.push(event.value.data);
                        break;
                    case "report":
                        reports.push(event.value.data);
                        break;
                    case "progress":
                        break;
                }
            }
        }

        return generator();
    }

    inspect(query: Buffer, options?: { collect: true }): any {
        const generator = function* (
            this: RollupsMachineImpl,
        ): IterableIterator<Buffer> {
            const machine = this.startTransaction();

            // write query
            machine.sendCmioResponse(CmioYieldReason.InspectState, query);

            while (true) {
                // run machine until it yields or halts
                const breakReason = machine.run();

                switch (breakReason) {
                    case BreakReason.YieldedManually: {
                        const { reason, data } = machine.receiveCmioRequest();
                        switch (reason) {
                            case CmioYieldReason.ManualRxAccepted: {
                                // input was accepted
                                this.rollbackTransaction(machine);
                                return;
                            }
                            case CmioYieldReason.ManualRxRejected: {
                                // input was rejected
                                this.rollbackTransaction(machine);
                                throw new RollupsInputRejectedError();
                            }
                            case CmioYieldReason.ManualTxException: {
                                // exception
                                this.rollbackTransaction(machine);
                                const description = data.toString("utf-8"); // XXX: is this correct?
                                throw new RollupsFatalError(description);
                            }
                            default: {
                                this.rollbackTransaction(machine);
                                throw new RollupsFatalError(
                                    `Unexpected yield reason: ${reason}`,
                                );
                            }
                        }
                    }
                    case BreakReason.YieldedAutomatically: {
                        const { reason, data } = machine.receiveCmioRequest();
                        switch (reason) {
                            case CmioYieldReason.AutomaticProgress: {
                                // ignore progress
                                break;
                            }
                            case CmioYieldReason.AutomaticTxOutput: {
                                // ignore output
                                break;
                            }
                            case CmioYieldReason.AutomaticTxReport: {
                                // yield report
                                yield data;
                                break;
                            }
                        }
                        continue; // run again
                    }
                    default: {
                        this.rollbackTransaction(machine);
                        throw new RollupsFatalError(
                            `Unexpected break reason: ${breakReason}`,
                        );
                    }
                }
            }
        }.bind(this);

        if (options?.collect) {
            return [...generator()];
        }

        return generator();
    }
}

class RemoteRollupsMachineImpl extends RollupsMachineImpl {
    private machine: RemoteCartesiMachine;
    private noRollback: boolean;

    constructor(machine: RemoteCartesiMachine, noRollback: boolean = false) {
        super();
        this.machine = machine;
        this.noRollback = noRollback;
    }

    startTransaction(): CartesiMachine {
        if (this.noRollback) {
            // do not fork
            return this.machine;
        } else {
            return this.machine.fork();
        }
    }

    commitTransaction(machine: CartesiMachine): void {
        if (this.noRollback) {
            // do nothing
        } else {
            // shut down current machine
            this.machine.shutdown();

            // replace by fork
            this.machine = machine as RemoteCartesiMachine;
        }
    }

    rollbackTransaction(machine: CartesiMachine): void {
        if (this.noRollback) {
            // do nothing
        } else {
            // shutdown fork
            (machine as RemoteCartesiMachine).shutdown();
        }
    }

    shutdown(): void {
        this.machine.shutdown();
    }

    store(dir: string): RollupsMachine {
        this.machine.store(dir);
        return this;
    }
}

class LocalRollupsMachineImpl extends RollupsMachineImpl {
    private machine: CartesiMachine;

    constructor(machine: CartesiMachine) {
        super();
        this.machine = machine;
    }

    startTransaction(): CartesiMachine {
        return this.machine;
    }

    commitTransaction(machine: CartesiMachine): void {
        this.machine = machine;
    }

    rollbackTransaction(machine: CartesiMachine): void {
        this.machine = machine;
    }

    shutdown(): void {
        // no-op
    }

    store(dir: string): RollupsMachine {
        this.machine.store(dir);
        return this;
    }
}
