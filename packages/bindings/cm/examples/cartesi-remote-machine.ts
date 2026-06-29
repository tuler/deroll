import { connect, spawn } from "../src/remote-cartesi-machine";

async function example() {
    try {
        // Spawn a new remote machine server with default address
        console.log("Spawning remote machine server...");
        const remoteMachine = spawn();

        // Get server information from the spawned instance
        console.log("Server bound address:", remoteMachine.getBoundAddress());
        console.log("Server PID:", remoteMachine.getServerPid());

        // Rebind the server to a new address
        const newAddress = remoteMachine.rebind("127.0.0.1:0");
        console.log("Server rebound to:", newAddress);
        console.log("Updated bound address:", remoteMachine.getBoundAddress());

        // Connect to an existing server (example)
        console.log("Connecting to existing server...");
        const connectedMachine = connect(
            remoteMachine.getBoundAddress() as string,
            5000,
        );
        console.log(
            "Connected to address:",
            connectedMachine.getBoundAddress(),
        );
        console.log("Connected server PID:", connectedMachine.getServerPid()); // Will be null for connections

        // Get server information from the spawned instance
        console.log("Server bound address:", remoteMachine.getBoundAddress());
        console.log("Server PID:", remoteMachine.getServerPid());

        // Use inherited methods from CartesiMachine
        console.log("Using inherited CartesiMachine methods:");

        // Check if machine is empty
        const isEmpty = remoteMachine.isEmpty();
        console.log("Is machine empty?", isEmpty);

        // create remote machine
        const config = {
            ram: {
                length: 0x8000000,
                image_filename: "linux.bin",
            },
            flash_drive: [
                {
                    image_filename: "rootfs.ext2",
                },
            ],
            dtb: {
                entrypoint: "echo Hello world!",
            },
        };
        remoteMachine.create(config);

        // Get runtime configuration
        const runtimeConfig = remoteMachine.getRuntimeConfig();
        console.log("Runtime config:", runtimeConfig);

        // Get root hash (inherited from CartesiMachine)
        const rootHash = remoteMachine.getRootHash();
        console.log("Root hash:", rootHash.toString("hex"));

        // Use remote-specific methods
        console.log("Using remote-specific methods:");

        // Fork the server
        const forkedMachine = remoteMachine.fork();
        console.log("Forked server address:", forkedMachine.getBoundAddress());
        console.log("Forked server PID:", forkedMachine.getServerPid());

        // Use inherited methods on the forked machine too
        const forkedRootHash = forkedMachine.getRootHash();
        console.log(
            "Forked machine root hash:",
            forkedRootHash.toString("hex"),
        );

        // Shutdown the forked server
        forkedMachine.shutdown();

        // Shutdown the original server
        remoteMachine.shutdown();

        console.log("Example completed successfully!");
    } catch (error) {
        console.error("Error:", error);
    }
}

// Run the example
example();
