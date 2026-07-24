// biome-ignore-all lint/correctness/useJsxKeyInIterable: KV/Crumbs tuples pass JSX as slot content rendered by the component, not as sibling list items
import type { Address } from "viem";
import { Link, useParams } from "react-router-dom";
import {
    useCommitments,
    useMatches,
    useTournament,
    useTournaments,
} from "@cartesi/wagmi";
import { DataTable } from "../components/table";
import {
    Collapsible,
    Crumbs,
    ErrorBox,
    Hex,
    JsonView,
    KV,
    Section,
    Spinner,
    StatusBadge,
} from "../components/ui";
import { TxHash } from "../components/TxHash";
import { formatDate, formatUint, shortHex, uintToDecimal } from "../lib/format";
import { useApp } from "./AppLayout";

export function TournamentPage() {
    const { appParam } = useApp();
    const { address = "" } = useParams();
    const tournament = useTournament({
        application: appParam,
        address: address as Address,
    });
    const commitments = useCommitments({
        application: appParam,
        tournamentAddress: address as Address,
        limit: 100,
    });
    const matches = useMatches({
        application: appParam,
        tournamentAddress: address as Address,
        limit: 100,
    });
    const children = useTournaments({
        application: appParam,
        parentTournamentAddress: address as Address,
        limit: 100,
    });

    if (tournament.isPending) return <Spinner />;
    if (tournament.isError) return <ErrorBox error={tournament.error} />;
    const t = tournament.data;
    const base = `/apps/${appParam}`;
    const finished = t.finishedAtBlock !== 0n;

    return (
        <div className="space-y-4">
            <Crumbs
                items={[
                    { label: "Tournaments", to: `${base}/tournaments` },
                    { label: shortHex(t.address) },
                ]}
            />

            <Section
                title={
                    <span className="flex items-center gap-3">
                        Tournament <Hex value={t.address} full />
                        <StatusBadge
                            status={finished ? "FINISHED" : "IN_PROGRESS"}
                        />
                    </span>
                }
            >
                <KV
                    rows={[
                        [
                            "Epoch",
                            <Link
                                className="text-sky-700 hover:underline dark:text-sky-400"
                                to={`${base}/epochs/${uintToDecimal(t.epochIndex)}`}
                            >
                                {formatUint(t.epochIndex)}
                            </Link>,
                        ],
                        [
                            "Level",
                            `${formatUint(t.level)} of ${formatUint(t.maxLevel)}`,
                        ],
                        ["log2 step", formatUint(t.log2step)],
                        ["Height", formatUint(t.height)],
                        t.parentTournamentAddress
                            ? [
                                  "Parent tournament",
                                  <Hex
                                      value={t.parentTournamentAddress}
                                      full
                                      to={`${base}/tournaments/${t.parentTournamentAddress}`}
                                  />,
                              ]
                            : ["Parent tournament", "none (root tournament)"],
                        t.parentMatchIdHash
                            ? [
                                  "Parent match",
                                  <Hex value={t.parentMatchIdHash} full />,
                              ]
                            : null,
                        [
                            "Winner commitment",
                            <Hex value={t.winnerCommitment} full />,
                        ],
                        [
                            "Final state hash",
                            <Hex value={t.finalStateHash} full />,
                        ],
                        [
                            "Finished at block",
                            finished
                                ? formatUint(t.finishedAtBlock)
                                : "in progress",
                        ],
                        ["Created", formatDate(t.createdAt)],
                        ["Updated", formatDate(t.updatedAt)],
                    ]}
                />
            </Section>

            <Section
                title={`Commitments (${commitments.data?.pagination.totalCount ?? "…"})`}
            >
                <DataTable
                    columns={[
                        {
                            header: "Commitment",
                            cell: (c) => <Hex value={c.commitment} />,
                        },
                        {
                            header: "Final state",
                            cell: (c) => <Hex value={c.finalStateHash} />,
                        },
                        {
                            header: "Submitter",
                            cell: (c) => <Hex value={c.submitterAddress} />,
                        },
                        {
                            header: "Block",
                            align: "right",
                            cell: (c) => formatUint(c.blockNumber),
                        },
                        {
                            header: "Tx",
                            cell: (c) => <TxHash value={c.txHash} />,
                        },
                    ]}
                    rows={commitments.data?.data}
                    rowKey={(c) => c.commitment}
                    isLoading={commitments.isLoading}
                    error={commitments.error}
                    empty="No commitments submitted to this tournament."
                />
            </Section>

            <Section
                title={`Matches (${matches.data?.pagination.totalCount ?? "…"})`}
            >
                <DataTable
                    columns={[
                        {
                            header: "Match ID",
                            cell: (m) => <Hex value={m.idHash} />,
                        },
                        {
                            header: "Commitment 1",
                            cell: (m) => <Hex value={m.commitmentOne} />,
                        },
                        {
                            header: "Commitment 2",
                            cell: (m) => <Hex value={m.commitmentTwo} />,
                        },
                        {
                            header: "Winner",
                            cell: (m) => (
                                <StatusBadge status={m.winnerCommitment} />
                            ),
                        },
                        {
                            header: "Resolution",
                            cell: (m) => (
                                <StatusBadge status={m.deletionReason} />
                            ),
                        },
                        {
                            header: "Block",
                            align: "right",
                            cell: (m) => formatUint(m.blockNumber),
                        },
                    ]}
                    rows={matches.data?.data}
                    rowKey={(m) => m.idHash}
                    rowLink={(m) =>
                        `${base}/tournaments/${t.address}/matches/${uintToDecimal(m.epochIndex)}/${m.idHash}`
                    }
                    isLoading={matches.isLoading}
                    error={matches.error}
                    empty="No matches in this tournament."
                />
            </Section>

            <Section
                title={`Child tournaments (${children.data?.pagination.totalCount ?? "…"})`}
            >
                <DataTable
                    columns={[
                        {
                            header: "Address",
                            cell: (c) => <Hex value={c.address} />,
                        },
                        {
                            header: "Level",
                            align: "right",
                            cell: (c) =>
                                `${formatUint(c.level)} / ${formatUint(c.maxLevel)}`,
                        },
                        {
                            header: "log2 step",
                            align: "right",
                            cell: (c) => formatUint(c.log2step),
                        },
                        {
                            header: "Parent match",
                            cell: (c) => <Hex value={c.parentMatchIdHash} />,
                        },
                        {
                            header: "Winner",
                            cell: (c) =>
                                c.winnerCommitment ? (
                                    <Hex value={c.winnerCommitment} />
                                ) : (
                                    <span className="text-slate-400 dark:text-slate-500">
                                        —
                                    </span>
                                ),
                        },
                    ]}
                    rows={children.data?.data}
                    rowKey={(c) => c.address}
                    rowLink={(c) => `${base}/tournaments/${c.address}`}
                    isLoading={children.isLoading}
                    error={children.error}
                    empty="No child tournaments spawned from this tournament."
                />
            </Section>

            <Collapsible label="Raw JSON">
                <JsonView value={t} />
            </Collapsible>
        </div>
    );
}
