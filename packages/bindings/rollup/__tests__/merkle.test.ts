import { describe, expect, it } from "vitest";
import { keccak256 } from "../src/keccak.js";
import {
    MERKLE_STATE_LENGTH,
    MERKLE_TREE_HEIGHT,
    Merkle,
    pristineHash,
} from "../src/merkle.js";

// first pristine levels from libcmt's precomputed table (merkle.c)
const PRISTINE = [
    "0000000000000000000000000000000000000000000000000000000000000000",
    "ad3228b676f7d3cd4284a5443f17f1962b36e491b30a40b2405849e597ba5fb5",
    "b4c11951957c6f8f642c4af61cd6b24640fec6dc7fc607ee8206a99e92410d30",
    "21ddb9a356815c3fac1026b6dec5df3124afbadb485c9ba5a3e3398a04b7ba85",
];

// independent reference: recursive root over a left-packed leaf list, using
// only keccak and the empty-subtree shortcut
function referenceRoot(level: number, leaves: Buffer[]): Buffer {
    if (leaves.length === 0) {
        return pristineHash(level);
    }
    if (level === 0) {
        return leaves[0] as Buffer;
    }
    const capacity = 2n ** BigInt(level - 1);
    const split =
        capacity > BigInt(leaves.length) ? leaves.length : Number(capacity);
    return keccak256(
        referenceRoot(level - 1, leaves.slice(0, split)),
        referenceRoot(level - 1, leaves.slice(split)),
    );
}

describe("merkle", () => {
    it("computes the pristine hashes from libcmt's table", () => {
        for (const [level, hash] of PRISTINE.entries()) {
            expect(pristineHash(level).toString("hex")).toBe(hash);
        }
    });

    it("empty tree root is the pristine root", () => {
        expect(new Merkle().getRootHash()).toEqual(
            pristineHash(MERKLE_TREE_HEIGHT),
        );
    });

    it.each([
        1, 2, 3, 4, 5, 8, 9,
    ])("root with %d leaves matches the reference implementation", (count) => {
        const merkle = new Merkle();
        const leaves: Buffer[] = [];
        for (let i = 0; i < count; i++) {
            const data = Buffer.from(`leaf-${i}`);
            merkle.pushBackData(data);
            leaves.push(keccak256(data));
        }
        expect(merkle.leafCount).toBe(BigInt(count));
        expect(merkle.getRootHash()).toEqual(
            referenceRoot(MERKLE_TREE_HEIGHT, leaves),
        );
    });

    it("save/load roundtrips through the cmt_merkle_t layout", () => {
        const merkle = new Merkle();
        merkle.pushBackData(Buffer.from("a"));
        merkle.pushBackData(Buffer.from("b"));
        merkle.pushBackData(Buffer.from("c"));
        const root = merkle.getRootHash();

        const state = merkle.save();
        expect(state.length).toBe(MERKLE_STATE_LENGTH);
        expect(state.readBigUInt64LE(0)).toBe(3n);

        const restored = new Merkle();
        restored.load(state);
        expect(restored.leafCount).toBe(3n);
        expect(restored.getRootHash()).toEqual(root);

        merkle.reset();
        expect(merkle.leafCount).toBe(0n);
        expect(merkle.getRootHash()).toEqual(pristineHash(MERKLE_TREE_HEIGHT));
    });

    it("rejects a state blob of the wrong size", () => {
        expect(() => new Merkle().load(Buffer.alloc(10))).toThrow();
    });
});
