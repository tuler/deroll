/**
 * Recovers the signer of a user op the way the scheduler does when it executes
 * a batch (`Scheduler::recover_sender` in `sequencer-core`).
 *
 * The scheduler drops an op whose signer cannot be recovered without a trace,
 * so "unrecoverable" here means "the scheduler skipped it". The rules are
 * alloy's, mirrored exactly rather than delegated to viem, whose own parsing
 * differs at the edges:
 *
 * - the signature is exactly 65 bytes, `r || s || v`;
 * - `v` is 0/1, 27/28, or any EIP-155 value from 35 up, parity
 *   `v <= 1 ? v : 1 - v % 2`; every other `v` is unrecoverable;
 * - `r` and `s` are in `[1, n)`; a high `s` is accepted and normalized, so it
 *   recovers the same signer as its low-`s` twin.
 */

import {
    type Address,
    hashTypedData,
    hexToBigInt,
    isAddress,
    numberToHex,
    recoverAddress,
    size,
    slice,
} from "viem";
import type { WireUserOp } from "./batch";

/**
 * EIP-712 domain name. It names the sequencer protocol, not an application:
 * what binds a signature to one deployment is `verifyingContract`, the
 * application address.
 */
const SEQUENCER_DOMAIN_NAME = "CartesiAppSequencer";
const SEQUENCER_DOMAIN_VERSION = "1";

/** The EIP-712 struct the scheduler recovers a signer from. */
const USER_OP_TYPES = {
    UserOp: [
        { name: "nonce", type: "uint32" },
        { name: "max_fee", type: "uint16" },
        { name: "data", type: "bytes" },
    ],
} as const;

/** secp256k1 group order. */
const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

const SIGNATURE_BYTES = 65;

export interface RecoverUserOpSignerParameters {
    readonly userOp: Pick<
        WireUserOp,
        "nonce" | "maxFee" | "data" | "signature"
    >;
    /** The Cartesi application, the EIP-712 `verifyingContract`. */
    readonly application: Address;
    /** The L1 chain the application is deployed on. */
    readonly chainId: number;
}

/** The address the scheduler recovers for this op, or `null` if it recovers none. */
export async function recoverUserOpSigner({
    userOp,
    application,
    chainId,
}: RecoverUserOpSignerParameters): Promise<Address | null> {
    if (!isAddress(application, { strict: false })) {
        throw new TypeError(`invalid application address: ${application}`);
    }
    if (!Number.isSafeInteger(chainId) || chainId < 0) {
        throw new RangeError(`invalid chain id: ${chainId}`);
    }
    const { signature } = userOp;
    if (size(signature) !== SIGNATURE_BYTES) return null;

    const v = Number(hexToBigInt(slice(signature, 64, 65)));
    let yParity: 0 | 1;
    if (v === 0 || v === 1) yParity = v;
    else if (v === 27 || v === 28 || v >= 35) yParity = v % 2 === 0 ? 1 : 0;
    else return null;

    const r = hexToBigInt(slice(signature, 0, 32));
    let s = hexToBigInt(slice(signature, 32, 64));
    if (r === 0n || r >= N || s === 0n || s >= N) return null;
    if (s > N >> 1n) {
        s = N - s;
        yParity = yParity === 0 ? 1 : 0;
    }

    const hash = hashTypedData({
        domain: {
            chainId,
            name: SEQUENCER_DOMAIN_NAME,
            verifyingContract: application,
            version: SEQUENCER_DOMAIN_VERSION,
        },
        message: {
            data: userOp.data,
            max_fee: userOp.maxFee,
            nonce: userOp.nonce,
        },
        primaryType: "UserOp",
        types: USER_OP_TYPES,
    });
    try {
        return await recoverAddress({
            hash,
            signature: {
                r: numberToHex(r, { size: 32 }),
                s: numberToHex(s, { size: 32 }),
                yParity,
            },
        });
    } catch (error) {
        // No curve point has x = r, or the recovered key is the point at
        // infinity: the scheduler's recovery fails on both, and an attacker
        // can build either. A broken environment (say, viem failing to load
        // its curve) also lands here, and must not pass for a bad signature.
        await assertRecoveryWorks(error);
        return null;
    }
}

/**
 * A recovery that cannot fail: `r` is the generator's x coordinate, so it is
 * on the curve, and with a zero hash the recovered key is `(s / r) * R`, which
 * is never the point at infinity.
 */
const ALWAYS_RECOVERABLE = {
    hash: `0x${"00".repeat(32)}`,
    signature: {
        r: "0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
        s: `0x${"00".repeat(31)}01`,
        yParity: 0,
    },
} as const;

let recoveryWorks: Promise<boolean> | undefined;

async function assertRecoveryWorks(cause: unknown): Promise<void> {
    recoveryWorks ??= recoverAddress(ALWAYS_RECOVERABLE).then(
        () => true,
        () => false,
    );
    if (!(await recoveryWorks)) {
        throw new Error("signature recovery is unavailable", { cause });
    }
}
