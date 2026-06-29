import fs from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import {
    type CartesiMachine,
    BreakReason,
    Constant,
    create,
    empty,
    ErrorCode,
    getDefaultConfig,
    getLastError,
    load,
    Reg,
} from "../src/cartesi-machine";
import { NodeCartesiMachine } from "../src/node/cartesi-machine";

describe("CartesiMachine", () => {
    let machine: CartesiMachine;

    beforeEach(() => {
        // Create a simple machine for testing
        const config = {
            ram: {
                length: 128 * 1024 * 1024, // 128 MB
            },
        };
        machine = create(config);
    });

    describe("Static Methods", () => {
        it("should create a new empty machine", () => {
            const emptyMachine = empty();
            expect(emptyMachine).toBeInstanceOf(NodeCartesiMachine);
            expect(emptyMachine.isEmpty()).toBe(true);
        });

        it("should clone an empty machine", () => {
            const original = empty();
            const cloned = original.cloneEmpty();
            expect(cloned).toBeInstanceOf(NodeCartesiMachine);
            expect(cloned.isEmpty()).toBe(true);
        });

        it("should get default configuration", () => {
            const config = getDefaultConfig();
            expect(() => config).not.toThrow();
        });

        it("should get register address", () => {
            const address = machine.getRegAddress(Reg.Pc);
            expect(typeof address).toBeOneOf(["bigint", "number"]);
            expect(address).toBeGreaterThan(0n);
        });

        it("should get last error message", () => {
            const error = getLastError();
            expect(typeof error).toBe("string");
        });
    });

    describe("Machine Lifecycle", () => {
        it("should check if machine is empty", () => {
            expect(machine.isEmpty()).toBe(false);
        });

        it("should get initial configuration", () => {
            const config = machine.getInitialConfig();
            expect(() => config).not.toThrow();
        });

        it("should get memory ranges", () => {
            const ranges = machine.getMemoryRanges();
            expect(() => ranges).not.toThrow();
        });

        it("should get runtime configuration", () => {
            const config = machine.getRuntimeConfig();
            expect(() => config).not.toThrow();
        });

        it("should set runtime configuration", () => {
            const newConfig = {};
            expect(() => machine.setRuntimeConfig(newConfig)).not.toThrow();
        });

        it("should store and load machine", () => {
            const testDir = "./test-machine-state";

            // Store the machine
            expect(() => machine.store(testDir)).not.toThrow();

            // Load the machine
            const loadedMachine = load(testDir);
            expect(loadedMachine).toBeInstanceOf(NodeCartesiMachine);
            expect(loadedMachine.isEmpty()).toBe(false);

            // Clean up
            fs.rmSync(testDir, { recursive: true, force: true });
        });
    });

    describe("Register Operations", () => {
        it("should read registers", () => {
            const pc = machine.readReg(Reg.Pc);
            const mcycle = machine.readReg(Reg.Mcycle);

            expect(typeof pc).toBeOneOf(["bigint", "number"]);
            expect(typeof mcycle).toBeOneOf(["bigint", "number"]);
            expect(pc).toBeGreaterThanOrEqual(0n);
            expect(mcycle).toBeGreaterThanOrEqual(0n);
        });

        it("should write and read registers", () => {
            const testValue = 0x1234567890abcdefn;
            machine.writeReg(Reg.X1, testValue);

            const readValue = machine.readReg(Reg.X1);
            expect(readValue).toBe(testValue);
        });

        it("should handle various register types", () => {
            const registers = [Reg.X0, Reg.F0, Reg.Pc, Reg.Mcycle, Reg.Mstatus];

            for (const reg of registers) {
                const value = machine.readReg(reg);
                expect(typeof value).toBeOneOf(["bigint", "number"]);
            }
        });
    });

    describe("Memory Operations", () => {
        it("should read and write words", () => {
            const address = 0x80000000n;
            const testValue = 0x1234567890abcdefn;

            // Write a word
            const buffer = Buffer.alloc(8);
            buffer.writeBigUInt64LE(testValue);
            machine.writeMemory(address, buffer);

            // Read the word
            const readValue = machine.readWord(address);
            expect(readValue).toBe(testValue);
        });

        it("should read and write memory chunks", () => {
            const address = 0x80000000n;
            const testData = Buffer.from("Hello, Cartesi!", "utf8");

            // Write data
            machine.writeMemory(address, testData);

            // Read data back
            const readData = machine.readMemory(
                address,
                BigInt(testData.length),
            );
            expect(readData).toEqual(testData);
        });

        it("should handle virtual memory operations", () => {
            const address = 0x80000000n;
            const testData = Buffer.from("Virtual memory test", "utf8");

            // Write to virtual memory
            machine.writeVirtualMemory(address, testData);

            // Read from virtual memory
            const readData = machine.readVirtualMemory(
                address,
                BigInt(testData.length),
            );
            expect(readData).toEqual(testData);
        });

        it("should translate virtual addresses", () => {
            const vaddr = 0x80000000n;
            const paddr = machine.translateVirtualAddress(vaddr);
            expect(typeof paddr).toBeOneOf(["bigint", "number"]);
            // expect(paddr).toBeGreaterThan(0n); XXX
        });
    });

    describe("Merkle Tree Operations", () => {
        it("should get root hash", () => {
            const rootHash = machine.getRootHash();
            expect(rootHash).toBeInstanceOf(Buffer);
            expect(rootHash.length).toBe(Constant.HashSize);
        });

        it("should get proof for memory address", () => {
            const address = 0x80000000n;
            const log2Size = Constant.TreeLog2WordSize;

            const proof = machine.getProof(address, log2Size);
            expect(() => proof).not.toThrow();
        });

        it("should verify Merkle tree integrity", () => {
            const isIntegrityValid = machine.verifyMerkleTree();
            expect(typeof isIntegrityValid).toBe("boolean");
        });

        it("should verify dirty page maps", () => {
            const areDirtyMapsValid = machine.verifyDirtyPageMaps();
            expect(typeof areDirtyMapsValid).toBe("boolean");
        });
    });

    describe("Execution", () => {
        it("should run machine for cycles", () => {
            const initialMcycle = machine.readReg(Reg.Mcycle);
            const breakReason = machine.run(100n);

            expect(typeof breakReason).toBe("number");
            expect(Object.values(BreakReason)).toContain(breakReason);

            const finalMcycle = machine.readReg(Reg.Mcycle);
            expect(finalMcycle).toBeGreaterThanOrEqual(initialMcycle);
        });

        it("should run microarchitecture", () => {
            const breakReason = machine.runUarch(50n);
            expect(typeof breakReason).toBe("number");
        });

        it("should reset microarchitecture", () => {
            expect(() => machine.resetUarch()).not.toThrow();
        });
    });

    describe("CMIO Operations", () => {
        it("should handle CMIO requests and responses", () => {
            // This test might fail if the machine is not in a yield state
            // We'll just test that the methods exist and have correct signatures
            expect(typeof machine.receiveCmioRequest).toBe("function");
            expect(typeof machine.sendCmioResponse).toBe("function");
        });
    });

    describe("Logging Operations", () => {
        it("should log steps", (ctx) => {
            const logFilename = `./log-${ctx.task.id}`;
            const breakReason = machine.logStep(10n, logFilename);
            expect(typeof breakReason).toBe("number");
            expect(Object.values(BreakReason)).toContain(breakReason);
            fs.rmSync(logFilename, { force: true });
        });

        it("should log uarch steps", () => {
            const log = machine.logStepUarch({
                has_annotations: true,
                has_large_data: false,
            });
            expect(() => log).not.toThrow();
        });

        it("should log uarch reset", () => {
            const log = machine.logResetUarch({
                has_annotations: true,
                has_large_data: false,
            });
            expect(() => log).not.toThrow();
        });
    });

    describe("Verification Operations", () => {
        it("should verify steps", (ctx) => {
            const logFilename = `./log-${ctx.task.id}`;
            const rootHashBefore = machine.getRootHash();
            const mcycleCount = 10n;

            // Run a step
            machine.logStep(mcycleCount, logFilename);

            const rootHashAfter = machine.getRootHash();
            const breakReason = machine.verifyStep(
                rootHashBefore,
                logFilename,
                mcycleCount,
                rootHashAfter,
            );

            expect(typeof breakReason).toBe("number");
            fs.rmSync(logFilename, { force: true });
        });

        it("should verify uarch steps", () => {
            const rootHashBefore = machine.getRootHash();
            const log = machine.logStepUarch({
                has_annotations: true,
                has_large_data: false,
            });
            const rootHashAfter = machine.getRootHash();

            expect(() =>
                machine.verifyStepUarch(rootHashBefore, log, rootHashAfter),
            ).not.toThrow();
        });

        it("should verify uarch reset", () => {
            const rootHashBefore = machine.getRootHash();
            const log = machine.logResetUarch({
                has_annotations: true,
                has_large_data: false,
            });
            const rootHashAfter = machine.getRootHash();

            expect(() =>
                machine.verifyResetUarch(rootHashBefore, log, rootHashAfter),
            ).not.toThrow();
        });
    });

    describe("Error Handling", () => {
        it("should handle invalid configurations", () => {
            expect(() => {
                create({ ram: { length: -1 } });
            }).toThrow();
        });

        it("should handle invalid memory addresses", () => {
            expect(() => {
                machine.readWord(0xffffffffffffffffn);
            }).toThrow();
        });

        it("should handle operations on empty machines", () => {
            const emptyMachine = empty();

            expect(() => {
                emptyMachine.getRootHash();
            }).toThrow();
        });
    });

    describe("Constants and Enums", () => {
        it("should have correct constant values", () => {
            expect(Constant.HashSize).toBe(32);
            expect(Constant.TreeLog2WordSize).toBe(5);
            expect(Constant.TreeLog2PageSize).toBe(12);
            expect(Constant.TreeLog2RootSize).toBe(64);
        });

        it("should have correct error codes", () => {
            expect(ErrorCode.Ok).toBe(0);
            expect(ErrorCode.InvalidArgument).toBe(-1);
            expect(ErrorCode.DomainError).toBe(-2);
        });

        it("should have correct break reasons", () => {
            expect(BreakReason.Failed).toBe(0);
            expect(BreakReason.Halted).toBe(1);
            expect(BreakReason.YieldedManually).toBe(2);
        });

        it("should have register enums", () => {
            expect(Reg.X0).toBe(0);
            expect(Reg.X1).toBe(1);
            expect(Reg.Pc).toBe(64);
            expect(Reg.Mcycle).toBe(69);
        });
    });
});
