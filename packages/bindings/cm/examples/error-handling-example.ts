import { create, ErrorCode, MachineError } from "../src";

/**
 * Example demonstrating improved error handling with MachineError class
 */

async function demonstrateErrorHandling() {
    console.log("=== Cartesi Machine Error Handling Example ===\n");

    try {
        // Example 1: Invalid configuration (should trigger an error)
        console.log("1. Testing invalid configuration...");
        const invalidConfig = {
            ram: {
                length: -1, // Invalid negative length
            },
        };

        try {
            const _machine = create(invalidConfig);
            console.log("Unexpectedly created machine with invalid config");
        } catch (error) {
            if (error instanceof MachineError) {
                console.log("✅ Caught MachineError:");
                console.log(
                    `   Code: ${error.code} (${ErrorCode[error.code]})`,
                );
                console.log(`   Description: ${error.description}`);
                console.log(`   Message: ${error.message}`);
                console.log(
                    `   Stack trace available: ${error.stack ? "Yes" : "No"}`,
                );
            } else {
                console.log("❌ Caught generic error:", error);
            }
        }

        console.log();

        // Example 2: Valid configuration
        console.log("2. Testing valid configuration...");
        const validConfig = {
            ram: {
                length: 0x8000000, // 128MB RAM
            },
        };

        try {
            const machine = create(validConfig);
            console.log("✅ Successfully created machine with valid config");

            // Example 3: Testing register access
            console.log("\n3. Testing register access...");
            const pcValue = machine.readReg(0); // Read PC register
            console.log(`✅ Successfully read PC register: ${pcValue}`);
        } catch (error) {
            if (error instanceof MachineError) {
                console.log("❌ MachineError occurred:");
                console.log(
                    `   Code: ${error.code} (${ErrorCode[error.code]})`,
                );
                console.log(`   Description: ${error.description}`);
            } else {
                console.log("❌ Unexpected error:", error);
            }
        }

        console.log();

        // Example 4: Demonstrating error code comparison
        console.log("4. Demonstrating error code comparison...");
        try {
            // This will likely fail due to missing files
            const _machine = create({
                ram: {
                    length: 0x8000000,
                    image_filename: "nonexistent.bin",
                },
            });
        } catch (error) {
            if (error instanceof MachineError) {
                console.log("✅ Error code comparison examples:");
                console.log(
                    `   Is it an invalid argument? ${error.code === ErrorCode.InvalidArgument}`,
                );
                console.log(
                    `   Is it a system error? ${error.code === ErrorCode.SystemError}`,
                );
                console.log(
                    `   Is it a runtime error? ${error.code === ErrorCode.RuntimeError}`,
                );

                // Example of handling specific error types
                switch (error.code) {
                    case ErrorCode.InvalidArgument:
                        console.log("   → This is an invalid argument error");
                        break;
                    case ErrorCode.SystemError:
                        console.log(
                            "   → This is a system error (likely file not found)",
                        );
                        break;
                    case ErrorCode.RuntimeError:
                        console.log("   → This is a runtime error");
                        break;
                    default:
                        console.log(
                            `   → This is an unknown error type: ${error.code}`,
                        );
                }
            }
        }

        console.log();

        // Example 5: Creating custom MachineError
        console.log("5. Creating custom MachineError...");
        const customError = new MachineError(
            ErrorCode.InvalidArgument,
            "Custom error message for demonstration",
        );
        console.log("✅ Custom MachineError created:");
        console.log(`   Message: ${customError.message}`);
        console.log(`   Code: ${customError.code}`);
        console.log(`   Description: ${customError.description}`);
    } catch (error) {
        console.error("❌ Unexpected error in main function:", error);
    }
}

// Run the example
demonstrateErrorHandling().catch(console.error);
