import koffi from "koffi";
import { platform } from "node:os";
import { join } from "node:path";

// -----------------------------------------------------------------------------
// Cross-platform library loading
// -----------------------------------------------------------------------------

/**
 * Get platform-specific library search paths from environment variables
 */
function getLibrarySearchPaths(): string[] {
    const os = platform();
    const paths: string[] = [];

    switch (os) {
        case "linux":
            // Linux: LD_LIBRARY_PATH
            if (process.env.LD_LIBRARY_PATH) {
                paths.push(...process.env.LD_LIBRARY_PATH.split(":"));
            }
            break;
        case "darwin":
            // macOS: DYLD_LIBRARY_PATH and DYLD_FALLBACK_LIBRARY_PATH
            if (process.env.DYLD_LIBRARY_PATH) {
                paths.push(...process.env.DYLD_LIBRARY_PATH.split(":"));
            }
            if (process.env.DYLD_FALLBACK_LIBRARY_PATH) {
                paths.push(
                    ...process.env.DYLD_FALLBACK_LIBRARY_PATH.split(":"),
                );
            }
            break;
        case "win32":
            // Windows: PATH (libraries are typically in PATH)
            if (process.env.PATH) {
                paths.push(...process.env.PATH.split(";"));
            }
            break;
    }

    return paths;
}

/**
 * Get the appropriate library filename for the current platform
 */
export function getLibraryFilename(baseName: string): string {
    const os = platform();
    switch (os) {
        case "darwin":
            return `lib${baseName}.dylib`;
        case "linux":
            return `lib${baseName}.so`;
        case "win32":
            return `${baseName}.dll`;
        default:
            throw new Error(`Unsupported platform: ${os}`);
    }
}

/**
 * Load a library with cross-platform support and customizable search paths
 * @param baseName Base name of the library (e.g., "cartesi", "cartesi_jsonrpc")
 * @param searchPaths Array of directories to search for the library
 * @returns Loaded library object
 */
export function loadLibrary(baseName: string, searchPaths: string[] = []): any {
    const filename = getLibraryFilename(baseName);

    // Get paths from environment variables
    const envPaths = getLibrarySearchPaths();

    // Default search paths based on platform
    const defaultPaths = [
        // System library paths
        "/usr/lib",
        "/usr/local/lib",
        "/opt/homebrew/lib", // macOS Homebrew
        "/opt/local/lib", // macOS MacPorts
        // Current directory
        ".",
        // Relative to current working directory
        join(process.cwd(), "lib"),
        join(process.cwd(), "build"),
    ];

    // Priority order: custom search paths -> environment paths -> default paths
    const allPaths = [...searchPaths, ...envPaths, ...defaultPaths];

    // Try to load from each path
    for (const path of allPaths) {
        try {
            const fullPath = join(path, filename);
            return koffi.load(fullPath);
        } catch (_error) {}
    }

    // If we get here, none of the paths worked
    throw new Error(
        `Failed to load library '${filename}'. Tried paths: ${allPaths.join(", ")}`,
    );
}
