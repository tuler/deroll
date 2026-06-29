import { CleanupCall, connect, spawn } from "../src/remote-cartesi-machine";

/**
 * Example usage of the Cartesi JSON-RPC Machine API
 */

async function exampleSpawnServer() {
    console.log("=== Spawning a new JSON-RPC server ===");

    try {
        // Spawn a new server with default address (127.0.0.1:0)
        const machine = spawn();

        console.log("Server spawned successfully");
        console.log("Server version:", machine.getServerVersion());

        // Set timeout to 10 seconds
        machine.setTimeout(10000);
        console.log("Timeout set to 10 seconds");

        // Configure cleanup to shutdown server when machine is deleted
        machine.setCleanupCall(CleanupCall.Shutdown);
        console.log("Cleanup configured to shutdown server");

        return machine;
    } catch (error) {
        console.error("Failed to spawn server:", error);
        throw error;
    }
}

async function exampleConnectToServer() {
    console.log("=== Connecting to existing server ===");

    try {
        // Spawn a new server with default address (127.0.0.1:0)
        const server = spawn();
        console.log("Server spawned successfully");
        console.log("Server version:", server.getServerVersion());

        // Connect to an existing server
        const machine = connect(server.getServerAddress(), 5000);

        console.log("Connected to server successfully");
        console.log("Server version:", machine.getServerVersion());
        console.log("Server address:", machine.getServerAddress());

        return machine;
    } catch (error) {
        console.error("Failed to connect to server:", error);
        throw error;
    }
}

async function exampleForkServer() {
    console.log("=== Forking server ===");

    try {
        // First create or connect to a server
        const originalMachine = spawn();

        // Fork the server
        const forkedMachine = originalMachine.fork();

        console.log("Server forked successfully");
        console.log("Forked server address:", forkedMachine.getBoundAddress());
        console.log("Forked server PID:", forkedMachine.getServerPid());

        // Emancipate the forked server (make it leader of its own process group)
        forkedMachine.emancipate();
        console.log("Forked server emancipated");

        return { originalMachine, forkedMachine };
    } catch (error) {
        console.error("Failed to fork server:", error);
        throw error;
    }
}

async function exampleRebindServer() {
    console.log("=== Rebinding server ===");

    try {
        const machine = spawn();

        console.log("Original server address:", machine.getServerAddress());
        console.log("Original bound address:", machine.getBoundAddress());

        // Rebind to a different address
        const newAddress = machine.rebind("127.0.0.1:0");

        console.log("Server rebound successfully");
        console.log("New server address:", newAddress);

        return machine;
    } catch (error) {
        console.error("Failed to rebind server:", error);
        throw error;
    }
}

async function exampleServerManagement() {
    console.log("=== Server management example ===");

    try {
        // Create a server
        const machine = spawn();

        // Get comprehensive server information
        const serverVersion = machine.getServerVersion();
        console.log("Server version:", serverVersion);

        // Set different timeout values
        machine.setTimeout(5000); // 5 seconds
        console.log("Timeout set to 5 seconds");

        machine.setTimeout(-1); // No timeout (block indefinitely)
        console.log("Timeout set to block indefinitely");

        // Configure different cleanup behaviors
        machine.setCleanupCall(CleanupCall.Nothing);
        console.log("Cleanup set to do nothing");

        machine.setCleanupCall(CleanupCall.Destroy);
        console.log("Cleanup set to destroy machine");

        machine.setCleanupCall(CleanupCall.Shutdown);
        console.log("Cleanup set to shutdown server");

        // Test delay functionality (useful for debugging)
        machine.delayNextRequest(1000); // Delay next request by 1 second
        console.log("Next request will be delayed by 1 second");

        return machine;
    } catch (error) {
        console.error("Failed to manage server:", error);
        throw error;
    }
}

async function exampleErrorHandling() {
    console.log("=== Error handling example ===");

    try {
        // Try to connect to a non-existent server
        connect("localhost:9999", 1000);
        console.log("Unexpectedly connected to non-existent server");
    } catch (error) {
        console.log(
            "Expected error caught:",
            error instanceof Error ? error.message : String(error),
        );
    }

    try {
        // Try to spawn server with invalid address
        spawn("invalid-address", 1000);
        console.log("Unexpectedly spawned server with invalid address");
    } catch (error) {
        console.log(
            "Expected error caught:",
            error instanceof Error ? error.message : String(error),
        );
    }
}

async function exampleCleanup() {
    console.log("=== Cleanup example ===");

    try {
        const machine = spawn();

        console.log("Server created, will be cleaned up automatically");

        // The machine will be automatically cleaned up when it goes out of scope
        // If cleanup is set to SHUTDOWN, the server will also be shut down

        return machine;
    } catch (error) {
        console.error("Failed to create server for cleanup example:", error);
        throw error;
    }
}

// Main example function
async function main() {
    console.log("Cartesi JSON-RPC Machine API Examples");
    console.log("=====================================\n");

    try {
        // Run examples
        await exampleSpawnServer();
        console.log();

        await exampleConnectToServer();
        console.log();

        await exampleForkServer();
        console.log();

        await exampleRebindServer();
        console.log();

        await exampleServerManagement();
        console.log();

        await exampleErrorHandling();
        console.log();

        await exampleCleanup();
        console.log();

        console.log("All examples completed successfully!");
    } catch (error) {
        console.error("Example failed:", error);
    }
}

main().catch(console.error);
