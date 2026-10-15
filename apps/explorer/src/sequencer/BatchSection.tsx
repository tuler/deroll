// biome-ignore-all lint/correctness/useJsxKeyInIterable: KV tuples pass JSX as slot content rendered by the component, not as sibling list items
import type { Input } from "@deroll/decoder";
import { ErrorBox, Hex, KV, Section, Spinner } from "../components/ui";
import { formatUint } from "../lib/format";
import { useSubmitter } from "./registry";
import { countUserOps, useBatch } from "./userOps";
import { Fee, UserOpsTable } from "./UserOpsTable";

/** What a decoded batch does and does not tell, stated once per batch view. */
export function SubmittedNote() {
    return (
        <p className="text-xs text-slate-500 dark:text-slate-400">
            Operations are shown as submitted. The scheduler skips a stale or
            out-of-sequence batch and drops operations that fail signature, fee
            or application validation; only the application's own outputs and
            reports can tell what was executed.
        </p>
    );
}

/** The sequencer batch carried by an input, frame by frame. */
export function BatchSection({
    input,
    appParam,
    application,
}: {
    input: Input;
    appParam: string;
    application: string;
}) {
    const submitter = useSubmitter(application);
    const { batch, userOps, isLoading, error } = useBatch(input, application);
    if (!batch) return null;

    if (!batch.ok) {
        return (
            <Section title="Sequencer batch">
                <div className="space-y-2 text-sm">
                    <p className="rounded-md bg-red-50 px-3 py-2 text-red-800 dark:bg-red-950/50 dark:text-red-300">
                        Malformed batch: {batch.reason}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">
                        This input was sent by the batch submitter but does not
                        decode as a batch. The scheduler rejects it without
                        executing anything.
                    </p>
                </div>
            </Section>
        );
    }

    const { frames, nonce } = batch.batch;
    return (
        <Section title="Sequencer batch">
            <div className="space-y-4">
                <KV
                    rows={[
                        ["Batch nonce", formatUint(nonce)],
                        ["Submitter", <Hex value={submitter} full />],
                        ["Frames", frames.length.toLocaleString()],
                        [
                            "User operations",
                            countUserOps(batch.batch).toLocaleString(),
                        ],
                    ]}
                />
                <SubmittedNote />
                {error ? (
                    <ErrorBox error={error} />
                ) : isLoading ? (
                    <Spinner label="Recovering signers…" />
                ) : (
                    frames.map((frame, frameIndex) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: frames are positional and never reordered
                        <div key={frameIndex} className="space-y-1">
                            <h3 className="flex flex-wrap gap-x-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                <span>Frame {frameIndex}</span>
                                <span className="font-normal">
                                    safe block {formatUint(frame.safeBlock)}
                                </span>
                                <span className="font-normal">
                                    fee price <Fee exponent={frame.feePrice} />
                                </span>
                            </h3>
                            <UserOpsTable
                                ops={userOps?.filter(
                                    (op) => op.frameIndex === frameIndex,
                                )}
                                appParam={appParam}
                                application={application}
                                empty="No user operations in this frame."
                            />
                        </div>
                    ))
                )}
            </div>
        </Section>
    );
}
