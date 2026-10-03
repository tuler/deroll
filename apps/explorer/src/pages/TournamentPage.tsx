// biome-ignore-all lint/correctness/useJsxKeyInIterable: KV/Crumbs tuples pass JSX as slot content rendered by the component, not as sibling list items
import { type Address, formatEther } from "viem";
import { Link, useParams } from "react-router-dom";
import {
    useBondEvents,
    useCommitments,
    useMatches,
    useTournament,
    useTournaments,
} from "@cartesi/react";
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
import {
    formatDate,
    formatUint,
    formatWei,
    shortHex,
    uintToDecimal,
} from "../lib/format";
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
    const bondEvents = useBondEvents({
        application: appParam,
        tournamentAddress: address as Address,
        limit: 100,
    });

    if (tournament.isPending) return <Spinner />;
    if (tournament.isError) return <ErrorBox error={tournament.error} />;
    const t = tournament.data;
    const base = `/apps/${appParam}`;
    const snap = t.snapshot;
    const finished = snap.finishedAtBlock !== 0n;

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
                        <StatusBadge status={snap.standing} />
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
                        ["Kind", <StatusBadge status={t.kind} />],
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
                        ["Initial hash", <Hex value={t.initialHash} full />],
                        ["Base cycle", formatUint(t.baseCycle)],
                        ["Created at block", formatUint(t.startInstant)],
                        t.creationEvent
                            ? [
                                  "Creation tx",
                                  <TxHash
                                      value={t.creationEvent.txHash}
                                      full
                                  />,
                              ]
                            : null,
                        [
                            "Clock allowance",
                            `${formatUint(t.allowance)} blocks`,
                        ],
                        ["Created", formatDate(t.createdAt)],
                        ["Updated", formatDate(t.updatedAt)],
                    ]}
                />
            </Section>

            <Section
                title={`Current state (as of block ${formatUint(snap.asOfBlock)})`}
            >
                <KV
                    rows={[
                        ["Standing", <StatusBadge status={snap.standing} />],
                        ["Accepts joins", snap.acceptsJoins ? "yes" : "no"],
                        ["Candidate", <Hex value={snap.candidate} full />],
                        [
                            "Winner commitment",
                            <Hex value={snap.winnerCommitment} full />,
                        ],
                        [
                            "Final state hash",
                            <Hex value={snap.finalStateHash} full />,
                        ],
                        snap.parentCommitment
                            ? [
                                  "Parent commitment",
                                  <Hex value={snap.parentCommitment} full />,
                              ]
                            : null,
                        [
                            "Finished at block",
                            finished
                                ? formatUint(snap.finishedAtBlock)
                                : "in progress",
                        ],
                        snap.winnerExpiresAt !== 0n
                            ? [
                                  "Winner expires at block",
                                  formatUint(snap.winnerExpiresAt),
                              ]
                            : null,
                        snap.innerResult
                            ? [
                                  "Inner result",
                                  <span className="inline-flex flex-wrap items-center gap-2">
                                      <StatusBadge
                                          status={snap.innerResult.disposition}
                                      />
                                      <Hex
                                          value={
                                              snap.innerResult.parentCommitment
                                          }
                                      />
                                      <span className="text-xs text-slate-500 dark:text-slate-400">
                                          paused allowance{" "}
                                          {formatUint(
                                              snap.innerResult.pausedAllowance,
                                          )}{" "}
                                          blocks
                                      </span>
                                  </span>,
                              ]
                            : null,
                        [
                            "Bond recovery",
                            <span className="inline-flex flex-wrap items-center gap-2">
                                <StatusBadge
                                    status={snap.bondRecovery.disposition}
                                />
                                {snap.bondRecovery.claimer && (
                                    <Hex value={snap.bondRecovery.claimer} />
                                )}
                                {snap.bondRecovery.payment !== null && (
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        {formatWei(snap.bondRecovery.payment)}
                                    </span>
                                )}
                            </span>,
                        ],
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
                            header: "Claimer",
                            cell: (c) => <Hex value={c.snapshot.claimer} />,
                        },
                        {
                            header: "Clock",
                            cell: (c) =>
                                c.snapshot.clockRunning
                                    ? `running · deadline ${formatUint(c.snapshot.clockDeadline)}`
                                    : `paused · ${formatUint(c.snapshot.clockAllowance)} blocks left`,
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
                            header: "Phase",
                            cell: (m) => (
                                <StatusBadge status={m.snapshot.phase} />
                            ),
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
                            header: "Standing",
                            cell: (c) => (
                                <StatusBadge status={c.snapshot.standing} />
                            ),
                        },
                        {
                            header: "Winner",
                            cell: (c) => (
                                <Hex value={c.snapshot.winnerCommitment} />
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

            <Section
                title={`Bond events (${bondEvents.data?.pagination.totalCount ?? "…"})`}
            >
                <DataTable
                    columns={[
                        {
                            header: "Type",
                            cell: (b) => <StatusBadge status={b.type} />,
                        },
                        {
                            header: "Recipient / claimer",
                            cell: (b) => (
                                <Hex
                                    value={
                                        b.type === "PARTIAL_BOND_REFUND"
                                            ? b.refund.recipient
                                            : b.recovery.claimer
                                    }
                                />
                            ),
                        },
                        {
                            header: "Amount",
                            align: "right",
                            cell: (b) =>
                                b.type === "PARTIAL_BOND_REFUND"
                                    ? `${formatEther(b.refund.value)} ETH${b.refund.success ? "" : " (failed)"}`
                                    : `${formatEther(b.recovery.payment)} ETH`,
                        },
                        {
                            header: "Burned",
                            align: "right",
                            cell: (b) =>
                                b.recovery
                                    ? `${formatEther(b.recovery.burned)} ETH`
                                    : "—",
                        },
                        {
                            header: "Block",
                            align: "right",
                            cell: (b) => formatUint(b.blockNumber),
                        },
                        {
                            header: "Tx",
                            cell: (b) => <TxHash value={b.txHash} />,
                        },
                    ]}
                    rows={bondEvents.data?.data}
                    rowKey={(b) => `${b.txHash}-${b.logIndex}`}
                    isLoading={bondEvents.isLoading}
                    error={bondEvents.error}
                    empty="No bond refunds or recoveries for this tournament."
                />
            </Section>

            <Collapsible label="Raw JSON">
                <JsonView value={t} />
            </Collapsible>
        </div>
    );
}
