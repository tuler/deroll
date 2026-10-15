/**
 * The sequencer's log-space fee encoding, base 129/128.
 *
 * Every fee on the wire (a frame's `fee_price`, a user op's `max_fee`) is an
 * exponent `n` that nominally stands for `(129/128)^n` smallest fee-token
 * units. This is a bit-for-bit port of `fee_to_linear` in
 * `sequencer-core/src/fee.rs`, whose contract includes the intermediate
 * flooring and the order of the multiplications: computing the exact power
 * and flooring once is not a compatible replacement.
 */

/** Fractional bits of the fixed-point table. */
const FRAC_BITS = 64n;

/**
 * `TABLE[i]` is `(129/128)^(2^i)` with 64 fractional bits: `TABLE[0]` is
 * `129 * 2^57`, and each entry is the floored fixed-point square of the
 * previous one, as `build.rs` generates it.
 */
const TABLE: readonly bigint[] = Array.from({ length: 14 }).reduce<bigint[]>(
    (table) => {
        const previous = table[table.length - 1] as bigint;
        table.push((previous * previous) >> FRAC_BITS);
        return table;
    },
    [129n << 57n],
);

/**
 * Largest exponent whose fixed-point value fits in 256 bits. `fee_to_linear`
 * panics above it, so no frame or op carrying a larger one is ever priced.
 */
export const FEE_MAX_EXPONENT = 17101;

/** Converts a log-space fee exponent to smallest fee-token units. */
export function feeToLinear(exponent: number): bigint {
    if (
        !Number.isInteger(exponent) ||
        exponent < 0 ||
        exponent > FEE_MAX_EXPONENT
    ) {
        throw new RangeError(
            `fee exponent must be an integer between 0 and ${FEE_MAX_EXPONENT}, got ${exponent}`,
        );
    }
    let result = 1n << FRAC_BITS;
    for (const [bit, entry] of TABLE.entries()) {
        if (exponent & (1 << bit)) {
            result = (result * entry) >> FRAC_BITS;
        }
    }
    return result >> FRAC_BITS;
}
