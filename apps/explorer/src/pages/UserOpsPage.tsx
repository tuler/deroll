import { useCartesiClient } from "@cartesi/react";
import type { Input, UserOp } from "@deroll/decoder";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getAddress, isAddress, isAddressEqual } from "viem";
import { Link } from "react-router-dom";
import {
    Filter,
    filterInputClass,
    SortToggle,
    useListControls,
} from "../components/table";
import { ErrorBox, linkClass, Section } from "../components/ui";
import { SubmittedNote } from "../sequencer/BatchSection";
import { useSubmitter } from "../sequencer/registry";
import { decodeBatchInput, toUserOps } from "../sequencer/userOps";
import { UserOpsTable } from "../sequencer/UserOpsTable";
import { useApp } from "./AppLayout";

/** Batch inputs fetched per page; their operations are flattened in order. */
const BATCHES_PER_PAGE = 25;

interface Page {
    ops: UserOp[];
    /** Batch inputs scanned in this page, malformed ones included. */
    scanned: number;
    malformed: number;
    total: number;
    nextOffset?: number;
}

/**
 * Every user operation the batch submitter posted, newest or oldest first.
 * The node lists inputs, not operations, so this scans the submitter's inputs
 * a page of batches at a time and filters by signer client-side: a signer
 * filter only covers the batches scanned so far, and the page says so.
 */
export function UserOpsPage() {
    const { searchParams, descending, update } = useListControls();
    const { appParam, application } = useApp();
    const address = application.applicationAddress;
    const submitter = useSubmitter(address);
    const client = useCartesiClient();
    const signerParam = searchParams.get("signer") ?? "";
    const signer = isAddress(signerParam) ? getAddress(signerParam) : undefined;

    const pages = useInfiniteQuery({
        queryKey: ["sequencer-user-op-scan", appParam, submitter, descending],
        enabled: !!submitter,
        initialPageParam: 0,
        queryFn: async ({ pageParam }): Promise<Page> => {
            const result = await client.listInputs({
                application: appParam,
                sender: submitter,
                limit: BATCHES_PER_PAGE,
                offset: pageParam,
                descending,
            });
            let malformed = 0;
            const ops: UserOp[] = [];
            for (const input of result.data as Input[]) {
                const batch = decodeBatchInput(input, submitter);
                if (!batch?.ok) {
                    malformed++;
                    continue;
                }
                const batchOps = await toUserOps(input, batch.batch);
                // Within a batch, operations keep their execution order;
                // a descending scan reverses it so the newest come first.
                ops.push(...(descending ? batchOps.reverse() : batchOps));
            }
            const scanned = pageParam + result.data.length;
            return {
                ops,
                scanned: result.data.length,
                malformed,
                total: result.pagination.totalCount,
                nextOffset:
                    scanned < result.pagination.totalCount
                        ? scanned
                        : undefined,
            };
        },
        getNextPageParam: (last) => last.nextOffset,
        staleTime: 30_000,
    });

    if (!submitter) {
        return (
            <Section title="User operations">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Set this application's sequencer batch submitter on its{" "}
                    <Link to={`/apps/${appParam}`} className={linkClass}>
                        Overview
                    </Link>{" "}
                    page to list the user operations it posted.
                </p>
            </Section>
        );
    }

    const loaded = pages.data?.pages ?? [];
    const all = loaded.flatMap((p) => p.ops);
    const ops = signer
        ? all.filter((op) => op.signer && isAddressEqual(op.signer, signer))
        : all;
    const scanned = loaded.reduce((sum, p) => sum + p.scanned, 0);
    const malformed = loaded.reduce((sum, p) => sum + p.malformed, 0);
    const total = loaded.at(-1)?.total ?? 0;

    return (
        <Section
            title="User operations"
            actions={
                <div className="flex flex-wrap items-center gap-3">
                    <Filter label="Signer">
                        <input
                            type="text"
                            value={signerParam}
                            onChange={(e) => update({ signer: e.target.value })}
                            placeholder="0x…"
                            className={`${filterInputClass} w-40 ${
                                signerParam && !signer
                                    ? "outline-2 outline-red-500"
                                    : ""
                            }`}
                        />
                    </Filter>
                    <SortToggle
                        descending={descending}
                        onChange={(desc) => update({ desc })}
                    />
                </div>
            }
        >
            <div className="space-y-3">
                <SubmittedNote />
                {pages.error ? (
                    <ErrorBox error={pages.error} />
                ) : (
                    <UserOpsTable
                        ops={pages.isPending ? undefined : ops}
                        appParam={appParam}
                        application={address}
                        showInput
                        empty={
                            signer
                                ? "No user operations by this signer in the batches scanned so far."
                                : "No user operations."
                        }
                    />
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <span>
                        {ops.length.toLocaleString()} operations from{" "}
                        {scanned.toLocaleString()} of {total.toLocaleString()}{" "}
                        batches
                        {malformed > 0 &&
                            ` (${malformed.toLocaleString()} malformed)`}
                    </span>
                    {pages.hasNextPage && (
                        <button
                            type="button"
                            disabled={pages.isFetchingNextPage}
                            onClick={() => pages.fetchNextPage()}
                            className="rounded-md border border-slate-300 bg-white px-3 py-1 disabled:opacity-40 enabled:cursor-pointer enabled:hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:enabled:hover:bg-slate-800"
                        >
                            {pages.isFetchingNextPage
                                ? "Scanning…"
                                : `Scan ${BATCHES_PER_PAGE} more batches`}
                        </button>
                    )}
                </div>
            </div>
        </Section>
    );
}
