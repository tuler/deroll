import {
    BreakReason,
    Constant,
    create,
    empty,
    getRegAddress,
    Reg,
} from "../src/cartesi-machine";

/**
 * Example demonstrating basic Cartesi Machine operations
 */
async function basicMachineExample() {
    console.log("=== Basic Cartesi Machine Example ===");

    try {
        // Create a new machine with configuration
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

        console.log("Creating machine with configuration...");
        const machine = create(config);
        console.log("Machine created successfully");

        // Check if machine is empty
        console.log(`Machine is empty: ${machine.isEmpty()}`);

        // Get initial configuration
        const initialConfig = machine.getInitialConfig();
        console.log("Initial configuration:", initialConfig);

        // Get memory ranges
        const memoryRanges = machine.getMemoryRanges();
        console.log("Memory ranges:", memoryRanges);

        // Get root hash
        const rootHash = machine.getRootHash();
        console.log("Root hash:", rootHash.toString("hex"));

        // Read some registers
        const pc = machine.readReg(Reg.Pc);
        console.log("Program counter:", pc.toString());

        const mcycle = machine.readReg(Reg.Mcycle);
        console.log("Machine cycle:", mcycle.toString());

        // Read a word from memory
        const word = machine.readWord(0x80000000n); // RAM start address
        console.log("Word at RAM start:", word.toString());

        // Run the machine for a few cycles
        console.log("Running machine for 1000 cycles...");
        const breakReason = machine.run(1000n);
        console.log("Break reason:", BreakReason[breakReason]);

        // Get new root hash after running
        const newRootHash = machine.getRootHash();
        console.log("New root hash:", newRootHash.toString("hex"));

        // Store the machine
        console.log("Storing machine...");
        machine.store("./machine-state");
        console.log("Machine stored successfully");
    } catch (error) {
        console.error("Error:", error);
    }
}

/**
 * Example demonstrating memory operations
 */
async function memoryOperationsExample() {
    console.log("\n=== Memory Operations Example ===");

    try {
        // Create a simple machine
        const config = {
            ram: {
                length: 1048576, // 1MB
            },
        };

        const machine = create(config);
        console.log("Machine created");

        // Write data to memory
        const data = Buffer.from("Hello, Cartesi!", "utf8");
        const address = 0x80000000n; // RAM start address

        console.log("Writing data to memory...");
        machine.writeMemory(address, data);

        // Read data back
        console.log("Reading data from memory...");
        const readData = machine.readMemory(address, BigInt(data.length));
        console.log("Read data:", readData.toString("utf8"));

        // Read individual words
        console.log("Reading individual words...");
        for (let i = 0; i < 4; i++) {
            const word = machine.readWord(address + BigInt(i * 8));
            console.log(`Word ${i}: 0x${word.toString(16).padStart(16, "0")}`);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

/**
 * Example demonstrating register operations
 */
async function registerOperationsExample() {
    console.log("\n=== Register Operations Example ===");

    try {
        // Create a machine
        const config = {
            ram: {
                length: 1048576,
            },
        };

        const machine = create(config);
        console.log("Machine created");

        // Read various registers
        console.log("Reading registers...");
        const registers = [
            { name: "PC", reg: Reg.Pc },
            { name: "MCYCLE", reg: Reg.Mcycle },
            { name: "X1", reg: Reg.X1 },
            { name: "MSTATUS", reg: Reg.Mstatus },
            { name: "MTVEC", reg: Reg.Mtvec },
        ];

        for (const { name, reg } of registers) {
            const value = machine.readReg(reg);
            console.log(`${name}: 0x${value.toString(16)}`);
        }

        // Write to a register
        console.log("\nWriting to register X1...");
        machine.writeReg(Reg.X1, 0x1234567890abcdefn);

        // Read it back
        const newValue = machine.readReg(Reg.X1);
        console.log(`X1 after write: 0x${newValue.toString(16)}`);

        // Get register addresses
        console.log("\nRegister addresses:");
        for (const { name, reg } of registers) {
            const address = getRegAddress(reg);
            console.log(`${name} address: 0x${address.toString(16)}`);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

/**
 * Example demonstrating Merkle tree operations
 */
async function merkleTreeExample() {
    console.log("\n=== Merkle Tree Example ===");

    try {
        // Create a machine
        const config = {
            ram: {
                length: 1048576,
            },
        };

        const machine = create(config);
        console.log("Machine created");

        // Get root hash
        const rootHash = machine.getRootHash();
        console.log("Root hash:", rootHash.toString("hex"));

        // Get proof for a memory address
        const address = 0x80000000n;
        const log2Size = Constant.TreeLog2WordSize; // Word size
        console.log(
            `Getting proof for address 0x${address.toString(16)} with log2_size ${log2Size}...`,
        );

        const proof = machine.getProof(address, log2Size);
        console.log("Proof:", proof);

        // Verify Merkle tree integrity
        console.log("Verifying Merkle tree integrity...");
        const isIntegrityValid = machine.verifyMerkleTree();
        console.log(
            "Merkle tree integrity:",
            isIntegrityValid ? "Valid" : "Invalid",
        );

        // Verify dirty page maps
        console.log("Verifying dirty page maps...");
        const areDirtyMapsValid = machine.verifyDirtyPageMaps();
        console.log(
            "Dirty page maps:",
            areDirtyMapsValid ? "Valid" : "Invalid",
        );
    } catch (error) {
        console.error("Error:", error);
    }
}

/**
 * Example demonstrating machine execution
 */
async function executionExample() {
    console.log("\n=== Machine Execution Example ===");

    try {
        // Create a machine
        const config = {
            ram: {
                length: 1048576,
            },
        };

        const machine = create(config);
        console.log("Machine created");

        // Get initial state
        const initialMcycle = machine.readReg(Reg.Mcycle);
        console.log("Initial mcycle:", initialMcycle.toString());

        // Run the machine for different cycle counts
        const cycleCounts = [100n, 500n, 1000n];

        for (const cycles of cycleCounts) {
            console.log(`\nRunning for ${cycles} cycles...`);
            const breakReason = machine.run(cycles);
            console.log("Break reason:", BreakReason[breakReason]);
            const currentMcycle = machine.readReg(Reg.Mcycle);
            console.log("Current mcycle:", currentMcycle.toString());
            const rootHash = machine.getRootHash();
            console.log("Root hash:", rootHash.toString("hex"));
        }

        // Run microarchitecture
        console.log("\nRunning microarchitecture...");
        const uarchBreakReason = machine.runUarch(100n);
        console.log("Uarch break reason:", uarchBreakReason);

        // Reset microarchitecture
        console.log("Resetting microarchitecture...");
        machine.resetUarch();
        console.log("Microarchitecture reset");
    } catch (error) {
        console.error("Error:", error);
    }
}

/**
 * Example demonstrating error handling
 */
async function errorHandlingExample() {
    console.log("\n=== Error Handling Example ===");

    try {
        // Try to create a machine with invalid config
        console.log("Trying to create machine with invalid config...");

        try {
            const machine = create({ ram: { length: -1 } });
            console.log("Unexpected: Machine created successfully");
        } catch (error) {
            console.log("Expected error caught:", (error as Error).message);
        }

        // Try to read from invalid address
        console.log("\nTrying to read from invalid address...");
        const machine = create({ ram: { length: 134217728 } });

        try {
            machine.readWord(0xffffffffffffffffn); // Invalid address
            console.log("Unexpected: Read successful");
        } catch (error) {
            console.log("Expected error caught:", (error as Error).message);
        }

        // Try to access empty machine
        console.log("\nTrying to access empty machine...");
        const emptyMachine = empty();

        try {
            emptyMachine.getRootHash();
            console.log("Unexpected: Got root hash from empty machine");
        } catch (error) {
            console.log("Expected error caught:", (error as Error).message);
        }
    } catch (error) {
        console.error("Unexpected error:", error);
    }
}

/**
 * Main function to run all examples
 */
async function main() {
    console.log("Cartesi Machine TypeScript API Examples\n");

    await basicMachineExample();
    await memoryOperationsExample();
    await registerOperationsExample();
    await merkleTreeExample();
    await executionExample();
    await errorHandlingExample();

    console.log("\nAll examples completed!");
}

main().catch(console.error);
