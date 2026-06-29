import { describe, expect, test } from "vitest";
import { CleanupCall, connect, spawn } from "../src";

// These tests assume the Cartesi JSON-RPC native library is available and working
// If not, they will be skipped

describe("Cartesi JSON-RPC Machine API", () => {
    test("spawnServer: success", () => {
        const result = spawn();
        expect(result.getBoundAddress()).toBeDefined();
        expect(result.getServerPid()).toBeDefined();
    });

    test("spawnServer: error", () => {
        expect(() => {
            spawn("invalid-address", 1000);
        }).toThrow();
    });

    test("connectServer: error", () => {
        expect(() => {
            connect("invalid-address", 1000);
        }).toThrow();
    });

    test("connectServer: success", () => {
        // This requires a running server at TEST_ADDRESS
        // You may want to spawn one in a beforeAll hook for a real integration test
        expect(() => {
            const result = spawn();
            const address = result.getBoundAddress();
            connect(address as string, 2000);
        }).not.toThrow();
    });

    test("forkServer: success", () => {
        const machine = spawn();
        const forkResult = machine.fork();
        expect(forkResult.getBoundAddress()).toBeDefined();
        expect(forkResult.getServerPid()).toBeDefined();
    });

    test("getServerVersion: success", () => {
        const machine = spawn();
        const version = machine.getServerVersion();
        expect(typeof version).toBe("string");
        expect(version.length).toBeGreaterThan(0);
    });

    test("set/getTimeout: success", () => {
        const machine = spawn();
        machine.setTimeout(1234);
        const timeout = machine.getTimeout();
        expect(timeout).toBe(1234);
    });

    test("set/getCleanupCall: success", () => {
        const machine = spawn();
        machine.setCleanupCall(CleanupCall.Destroy);
        const call = machine.getCleanupCall();
        expect(call).toBe(CleanupCall.Destroy);
    });

    test("getServerAddress: success", () => {
        const machine = spawn();
        const address = machine.getServerAddress();
        expect(typeof address).toBe("string");
        expect(address.length).toBeGreaterThan(0);
    });

    test("delayNextRequest: success", () => {
        const machine = spawn();
        expect(() => machine.delayNextRequest(100)).not.toThrow();
    });
});
