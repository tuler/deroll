// errno values (linux) used by the libcmt protocol, kept numerically
// identical to the native binding so callers can match on error.errno
export const EIO = 5;
export const EBUSY = 16;
export const EINVAL = 22;
export const EDOM = 33;
export const ENODATA = 61;
export const EBADMSG = 74;
export const ENOBUFS = 105;
export const ENOSYS = 38;

const STRERROR: Record<number, string> = {
    [EIO]: "Input/output error",
    [EBUSY]: "Device or resource busy",
    [EINVAL]: "Invalid argument",
    [EDOM]: "Numerical argument out of domain",
    [ENODATA]: "No data available",
    [EBADMSG]: "Bad message",
    [ENOBUFS]: "No buffer space available",
    [ENOSYS]: "Function not implemented",
    2: "No such file or directory",
    13: "Permission denied",
    21: "Is a directory",
};

const strerror = (errno: number): string =>
    STRERROR[Math.abs(errno)] ?? `Unknown error ${Math.abs(errno)}`;

/**
 * Error thrown when a rollup call fails (e.g. a too-large output, exhausted
 * mock inputs, or constructing a second {@link Rollup} while one is open).
 * Carries the negative errno in {@link RollupError.errno} and the name of the
 * libcmt-equivalent call that failed in {@link RollupError.syscall}.
 *
 * Argument validation failures throw plain `TypeError`/`RangeError` instead,
 * before anything reaches the driver.
 */
export class RollupError extends Error {
    override readonly name = "RollupError";
    /** Negative errno (e.g. `-16` for `EBUSY`). */
    readonly errno: number;
    /** Name of the call that failed (e.g. `cmt_rollup_init`). */
    readonly syscall: string;

    constructor(syscall: string, errno: number, cause?: unknown) {
        const rc = -Math.abs(errno);
        super(
            `${syscall} failed: ${strerror(rc)} (${rc})`,
            cause === undefined ? undefined : { cause },
        );
        this.errno = rc;
        this.syscall = syscall;
    }
}

/**
 * Internal failure of a driver or codec operation, carrying only the negative
 * errno. The public API layer wraps it in a {@link RollupError} with the name
 * of the entry point that failed.
 */
export class ErrnoError extends Error {
    readonly errno: number;

    constructor(errno: number, message?: string) {
        const rc = -Math.abs(errno);
        super(message ?? `${strerror(rc)} (${rc})`);
        this.errno = rc;
    }
}

/** Extract a negative errno from any thrown value (fs errors, ErrnoError). */
export const errnoOf = (error: unknown, fallback = EIO): number => {
    if (error !== null && typeof error === "object" && "errno" in error) {
        const errno = (error as { errno: unknown }).errno;
        if (typeof errno === "number" && Number.isInteger(errno)) {
            return -Math.abs(errno);
        }
    }
    return -Math.abs(fallback);
};
