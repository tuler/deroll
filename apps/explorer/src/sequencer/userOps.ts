// Sequencer batches as the explorer sees them: which inputs are batches, what
// they decode to, and the user operations they carry. The batch envelope is
// protocol-defined (the sequencer's SSZ `Batch`), so it is decoded here, like
// portal deposits are; only each operation's `data` is handed to the
// application's decoder (its `userOp` method).
//
// Everything shown is what was SUBMITTED. Whether the scheduler executed an
// operation also depends on the batch nonce sequence, staleness and the
// application's own validation, none of which is visible in one batch's bytes.

import { useQuery } from "@tanstack/react-query";
import type { DecodeResult, Input, Tag, UserOp } from "@deroll/decoder";
import { isAddressEqual, type Address } from "viem";
import { type Batch, type DecodeBatchResult, decodeBatch } from "./batch";
import { recoverUserOpSigner } from "./recover";
import { useSubmitter } from "./registry";

/** True when the input was sent by the application's batch submitter. */
export function isBatchInput(input: Input, submitter?: Address): boolean {
    const sender = input.decodedData?.sender;
    return !!submitter && !!sender && isAddressEqual(sender, submitter);
}

/**
 * Decodes a batch input, or returns null for an input that is not a batch.
 * Classification is by sender only; a submitter payload that fails to decode
 * is a malformed batch (the scheduler rejects it), never a direct input.
 */
export function decodeBatchInput(
    input: Input,
    submitter?: Address,
): DecodeBatchResult | null {
    if (!isBatchInput(input, submitter)) return null;
    return decodeBatch(input.decodedData?.payload ?? "0x");
}

/** Total number of user operations across a batch's frames. */
export function countUserOps(batch: Batch): number {
    return batch.frames.reduce((sum, frame) => sum + frame.userOps.length, 0);
}

const plural = (n: number, word: string) =>
    `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;

/** The explorer's own summary of a batch input, shown in place of a decoder's. */
export function describeBatch(result: DecodeBatchResult): DecodeResult {
    if (!result.ok) {
        const tags: Tag[] = [
            {
                label: "malformed batch",
                color: "red",
                title: "The scheduler rejects a batch that does not decode",
            },
        ];
        return { summary: result.reason, tags, data: result.reason };
    }
    const { batch } = result;
    return {
        summary: `Batch #${batch.nonce} · ${plural(batch.frames.length, "frame")} · ${plural(countUserOps(batch), "user op")}`,
        tags: [{ label: "batch", color: "violet" }],
        data: {
            nonce: batch.nonce,
            frames: batch.frames.map((frame) => ({
                safeBlock: frame.safeBlock,
                feePrice: frame.feePrice,
                userOps: frame.userOps.length,
            })),
        },
    };
}

/**
 * Flattens a decoded batch into user-op records, recovering each signer under
 * the EIP-712 domain the machine itself uses: the chain id and application
 * contract carried by the input's EvmAdvance, not the explorer's settings.
 */
export async function toUserOps(input: Input, batch: Batch): Promise<UserOp[]> {
    const decoded = input.decodedData;
    if (!decoded) return [];
    const application = decoded.applicationContract;
    const chainId = Number(decoded.chainId);
    const ops = batch.frames.flatMap((frame, frameIndex) =>
        frame.userOps.map((op, opIndex) => ({
            frame,
            frameIndex,
            op,
            opIndex,
        })),
    );
    return Promise.all(
        ops.map(
            async ({ frame, frameIndex, op, opIndex }): Promise<UserOp> => ({
                inputIndex: input.index,
                batchNonce: batch.nonce,
                frameIndex,
                opIndex,
                safeBlock: frame.safeBlock,
                feePrice: frame.feePrice,
                signer: await recoverUserOpSigner({
                    userOp: op,
                    application,
                    chainId,
                }),
                nonce: op.nonce,
                maxFee: op.maxFee,
                data: op.data,
                signature: op.signature,
            }),
        ),
    );
}

export interface BatchView {
    /** The decode verdict, or null when the input is not a batch. */
    batch: DecodeBatchResult | null;
    /** The batch's user operations with recovered signers, once ready. */
    userOps?: UserOp[];
    isLoading: boolean;
    error: Error | null;
}

/**
 * A batch input's decode verdict and user operations. Signer recovery is
 * async, so `userOps` arrives after `batch`; pass `enabled: false` to decode
 * the envelope only (e.g. for a collapsed table row).
 */
export function useBatch(
    input: Input | undefined,
    application: string,
    { enabled = true }: { enabled?: boolean } = {},
): BatchView {
    const submitter = useSubmitter(application);
    const batch = input ? decodeBatchInput(input, submitter) : null;
    const decoded = batch?.ok ? batch.batch : undefined;
    const query = useQuery({
        queryKey: [
            "sequencer-user-ops",
            application.toLowerCase(),
            input?.index.toString(),
            input?.decodedData?.payload,
        ],
        queryFn: () => toUserOps(input as Input, decoded as Batch),
        enabled: enabled && !!input && !!decoded,
        staleTime: Infinity,
        retry: false,
    });
    return {
        batch,
        userOps: query.data,
        isLoading: query.isLoading,
        error: query.error,
    };
}

/** Route path of a user operation's page, relative to the application. */
export function userOpPath(appParam: string, op: UserOp): string {
    return `/apps/${appParam}/inputs/${op.inputIndex}/ops/${op.frameIndex}/${op.opIndex}`;
}
