// biome-ignore-all lint/correctness/useJsxKeyInIterable: KV/Crumbs tuples pass JSX as slot content rendered by the component, not as sibling list items
import { keepPreviousData } from "@tanstack/react-query";
import type { Address, Hash } from "viem";
import { Link, useParams } from "react-router-dom";
import { useMatch, useMatchAdvances } from "@cartesi/react";
import { DataTable, Pager, useListControls } from "../components/table";
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
    parseUintParam,
    formatDate,
    formatUint,
    isZeroHex,
    shortHex,
    uintToDecimal,
} from "../lib/format";
import { useApp } from "./AppLayout";

export function MatchPage() {
    const { appParam } = useApp();
    const { address = "", epochIndex = "0", idHash = "" } = useParams();
    const epochHex = parseUintParam(epochIndex);
    const { limit, offset, update } = useListControls();

    const matchParams = {
        application: appParam,
        epochIndex: epochHex,
        tournamentAddress: address as Address,
        idHash: idHash as Hash,
    };
    const match = useMatch(matchParams);
    const advances = useMatchAdvances({
        ...matchParams,
        limit,
        offset,
        placeholderData: keepPreviousData,
    });

    if (match.isPending) return <Spinner />;
    if (match.isError) return <ErrorBox error={match.error} />;
    const m = match.data;
    const base = `/apps/${appParam}`;
    const deleted = m.deletionReason !== "NOT_DELETED";
    const snap = m.snapshot;

    return (
        <div className="space-y-4">
            <Crumbs
                items={[
                    { label: "Tournaments", to: `${base}/tournaments` },
                    {
                        label: shortHex(address),
                        to: `${base}/tournaments/${address}`,
                    },
                    { label: `Match ${shortHex(m.idHash)}` },
                ]}
            />

            <Section
                title={
                    <span className="flex items-center gap-3">
                        Match <Hex value={m.idHash} />
                        <StatusBadge status={m.winnerCommitment} />
                    </span>
                }
            >
                <KV
                    rows={[
                        ["ID hash", <Hex value={m.idHash} full />],
                        [
                            "Tournament",
                            <Hex
                                value={m.tournamentAddress}
                                full
                                to={`${base}/tournaments/${m.tournamentAddress}`}
                            />,
                        ],
                        [
                            "Epoch",
                            <Link
                                className="text-sky-700 hover:underline dark:text-sky-400"
                                to={`${base}/epochs/${uintToDecimal(m.epochIndex)}`}
                            >
                                {formatUint(m.epochIndex)}
                            </Link>,
                        ],
                        [
                            "Commitment one",
                            <Hex value={m.commitmentOne} full />,
                        ],
                        [
                            "Commitment two",
                            <Hex value={m.commitmentTwo} full />,
                        ],
                        ["Left of two", <Hex value={m.leftOfTwo} full />],
                        ["Winner", <StatusBadge status={m.winnerCommitment} />],
                        ["Created at block", formatUint(m.blockNumber)],
                        ["Creation tx", <TxHash value={m.txHash} full />],
                        ["Eliminable at block", formatUint(m.eliminableAt)],
                        m.leafSeal
                            ? [
                                  "Leaf sealed at block",
                                  <span className="inline-flex flex-wrap items-center gap-2">
                                      {formatUint(m.leafSeal.blockNumber)}
                                      <TxHash value={m.leafSeal.txHash} />
                                      <span className="text-xs text-slate-500 dark:text-slate-400">
                                          eliminable at{" "}
                                          {formatUint(m.leafSeal.eliminableAt)}
                                      </span>
                                  </span>,
                              ]
                            : null,
                        [
                            "Resolution",
                            <StatusBadge status={m.deletionReason} />,
                        ],
                        deleted &&
                        m.deletionBlockNumber !== null &&
                        m.deletionBlockNumber !== 0n
                            ? [
                                  "Resolved at block",
                                  formatUint(m.deletionBlockNumber),
                              ]
                            : null,
                        deleted && !isZeroHex(m.deletionTxHash)
                            ? [
                                  "Resolution tx",
                                  <TxHash value={m.deletionTxHash} full />,
                              ]
                            : null,
                        ["Created", formatDate(m.createdAt)],
                        ["Updated", formatDate(m.updatedAt)],
                    ]}
                />
            </Section>

            <Section
                title={`Current state (as of block ${formatUint(snap.asOfBlock)})`}
            >
                <KV
                    rows={[
                        ["Phase", <StatusBadge status={snap.phase} />],
                        [
                            "Timeout outcome",
                            <StatusBadge status={snap.timeoutOutcome} />,
                        ],
                        [
                            "Deferred charge",
                            `${formatUint(snap.deferredCharge)} blocks`,
                        ],
                        ...(snap.bisection
                            ? ([
                                  [
                                      "Responder",
                                      <StatusBadge
                                          status={snap.bisection.responder}
                                      />,
                                  ],
                                  [
                                      "Current height",
                                      formatUint(snap.bisection.currentHeight),
                                  ],
                                  [
                                      "Revealing parent",
                                      <Hex
                                          value={snap.bisection.revealingParent}
                                          full
                                      />,
                                  ],
                                  [
                                      "Waiting left",
                                      <Hex
                                          value={snap.bisection.waitingLeft}
                                          full
                                      />,
                                  ],
                                  [
                                      "Waiting right",
                                      <Hex
                                          value={snap.bisection.waitingRight}
                                          full
                                      />,
                                  ],
                                  [
                                      "Segment start (position / cycle)",
                                      `${formatUint(snap.bisection.segmentStartPosition)} / ${formatUint(snap.bisection.segmentStartCycle)}`,
                                  ],
                              ] as [React.ReactNode, React.ReactNode][])
                            : []),
                        ...(snap.sealed
                            ? ([
                                  [
                                      "Agree state",
                                      <Hex
                                          value={snap.sealed.agreeState}
                                          full
                                      />,
                                  ],
                                  [
                                      "Divergence (position / cycle)",
                                      `${formatUint(snap.sealed.divergencePosition)} / ${formatUint(snap.sealed.divergenceCycle)}`,
                                  ],
                                  [
                                      "Final state one",
                                      <Hex
                                          value={snap.sealed.finalStateOne}
                                          full
                                      />,
                                  ],
                                  [
                                      "Final state two",
                                      <Hex
                                          value={snap.sealed.finalStateTwo}
                                          full
                                      />,
                                  ],
                              ] as [React.ReactNode, React.ReactNode][])
                            : []),
                    ]}
                />
            </Section>

            <Section
                title={`Match advances (${advances.data?.pagination.totalCount ?? "…"})`}
            >
                <DataTable
                    columns={[
                        {
                            header: "Other parent",
                            cell: (a) => <Hex value={a.otherParent} />,
                        },
                        {
                            header: "Left node",
                            cell: (a) => <Hex value={a.leftNode} />,
                        },
                        {
                            header: "Segment start",
                            align: "right",
                            cell: (a) => formatUint(a.segmentStartPosition),
                        },
                        {
                            header: "Eliminable at",
                            align: "right",
                            cell: (a) => formatUint(a.eliminableAt),
                        },
                        {
                            header: "Block",
                            align: "right",
                            cell: (a) => formatUint(a.blockNumber),
                        },
                        {
                            header: "Tx",
                            cell: (a) => <TxHash value={a.txHash} />,
                        },
                        {
                            header: "Observed",
                            cell: (a) => formatDate(a.createdAt),
                        },
                    ]}
                    rows={advances.data?.data}
                    rowKey={(a) => `${a.txHash}-${a.logIndex}`}
                    isLoading={advances.isLoading}
                    error={advances.error}
                    empty="No advances recorded for this match."
                />
                <Pager
                    pagination={advances.data?.pagination}
                    limit={limit}
                    offset={offset}
                    onChange={(next) => update(next)}
                />
            </Section>

            <Collapsible label="Raw JSON">
                <JsonView value={m} />
            </Collapsible>
        </div>
    );
}
