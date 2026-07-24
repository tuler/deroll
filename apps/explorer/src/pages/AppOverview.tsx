// biome-ignore-all lint/correctness/useJsxKeyInIterable: KV/Crumbs tuples pass JSX as slot content rendered by the component, not as sibling list items
import {
    useLastAcceptedEpochIndex,
    useProcessedInputCount,
} from "@cartesi/wagmi";
import { DecoderSettings } from "../components/DecoderSettings";
import { TxHash } from "../components/TxHash";
import {
    Collapsible,
    Hex,
    JsonView,
    KV,
    Section,
    StatusBadge,
} from "../components/ui";
import { formatDate, formatNanos, formatUint } from "../lib/format";
import { useApp } from "./AppLayout";

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {label}
            </div>
            <div className="mt-1 text-xl font-semibold text-slate-800 dark:text-slate-100">
                {value}
            </div>
        </div>
    );
}

export function AppOverview() {
    const { appParam, application: app } = useApp();
    const processedCount = useProcessedInputCount({ application: appParam });
    const lastAccepted = useLastAcceptedEpochIndex({ application: appParam });
    const ep = app.executionParameters;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                    label="Processed inputs"
                    value={formatUint(processedCount.data)}
                />
                <StatCard
                    label="Last accepted epoch"
                    value={
                        lastAccepted.isSuccess
                            ? formatUint(lastAccepted.data)
                            : "—"
                    }
                />
                <StatCard
                    label="Epoch length"
                    value={formatUint(app.epochLength)}
                />
                <StatCard
                    label="Status"
                    value={
                        <span className="inline-flex items-center gap-1.5">
                            <StatusBadge status={app.status} />
                            {!app.enabled && <StatusBadge status="DISABLED" />}
                        </span>
                    }
                />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Section title="Contracts">
                    <KV
                        rows={[
                            [
                                "Application",
                                <Hex value={app.applicationAddress} />,
                            ],
                            ["Consensus", <Hex value={app.consensusAddress} />],
                            ["Input box", <Hex value={app.inputBoxAddress} />],
                            ["Template hash", <Hex value={app.templateHash} />],
                            [
                                "Data availability",
                                <span className="inline-flex items-center gap-2">
                                    <StatusBadge
                                        status={app.dataAvailability.type}
                                    />
                                    <Hex
                                        value={
                                            app.dataAvailability.inputBoxAddress
                                        }
                                    />
                                </span>,
                            ],
                            [
                                "Input box deployed at block",
                                formatUint(app.inputBoxBlock),
                            ],
                        ]}
                    />
                </Section>

                <Section title="Status">
                    <KV
                        rows={[
                            ["Status", <StatusBadge status={app.status} />],
                            [
                                "Enabled",
                                <StatusBadge
                                    status={
                                        app.enabled ? "ENABLED" : "DISABLED"
                                    }
                                />,
                            ],
                            [
                                "Consensus type",
                                <StatusBadge status={app.consensusType} />,
                            ],
                            app.reason
                                ? (["Reason", app.reason] as [
                                      React.ReactNode,
                                      React.ReactNode,
                                  ])
                                : null,
                            [
                                "Claim staging period",
                                `${formatUint(app.claimStagingPeriod)} blocks`,
                            ],
                            ["Created", formatDate(app.createdAt)],
                            ["Updated", formatDate(app.updatedAt)],
                        ]}
                    />
                </Section>

                <Section title="Withdrawal config">
                    {app.withdrawalConfig ? (
                        <KV
                            rows={[
                                [
                                    "Guardian",
                                    <Hex
                                        value={app.withdrawalConfig.guardian}
                                    />,
                                ],
                                [
                                    "Output builder",
                                    <Hex
                                        value={
                                            app.withdrawalConfig
                                                .withdrawalOutputBuilder
                                        }
                                    />,
                                ],
                                [
                                    "Accounts drive start index",
                                    formatUint(
                                        app.withdrawalConfig
                                            .accountsDriveStartIndex,
                                    ),
                                ],
                                [
                                    "Max accounts (log2)",
                                    formatUint(
                                        app.withdrawalConfig
                                            .log2MaxNumOfAccounts,
                                    ),
                                ],
                                [
                                    "Leaves per account (log2)",
                                    formatUint(
                                        app.withdrawalConfig
                                            .log2LeavesPerAccount,
                                    ),
                                ],
                            ]}
                        />
                    ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Not available.
                        </p>
                    )}
                </Section>

                <Section title="Foreclosure">
                    {app.forecloseBlock === 0n ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Not foreclosed.
                        </p>
                    ) : (
                        <KV
                            rows={[
                                [
                                    "Foreclosed at block",
                                    formatUint(app.forecloseBlock),
                                ],
                                [
                                    "Foreclose transaction",
                                    <TxHash value={app.forecloseTransaction} />,
                                ],
                                [
                                    "Accounts drive proved at block",
                                    app.accountsDriveProvedBlock === 0n
                                        ? "—"
                                        : formatUint(
                                              app.accountsDriveProvedBlock,
                                          ),
                                ],
                                [
                                    "Accounts drive proved transaction",
                                    <TxHash
                                        value={
                                            app.accountsDriveProvedTransaction
                                        }
                                    />,
                                ],
                                [
                                    "Accounts drive merkle root",
                                    <Hex value={app.accountsDriveMerkleRoot} />,
                                ],
                            ]}
                        />
                    )}
                </Section>

                <Section title="Sync checkpoints (last scanned block)">
                    <KV
                        rows={[
                            ["Epochs", formatUint(app.lastEpochCheckBlock)],
                            ["Inputs", formatUint(app.lastInputCheckBlock)],
                            ["Outputs", formatUint(app.lastOutputCheckBlock)],
                            [
                                "Tournaments",
                                formatUint(app.lastTournamentCheckBlock),
                            ],
                            [
                                "Foreclosures",
                                formatUint(app.lastForecloseCheckBlock),
                            ],
                            [
                                "Accounts drive proofs",
                                formatUint(
                                    app.lastAccountsDriveProvedCheckBlock,
                                ),
                            ],
                            [
                                "Withdrawals",
                                formatUint(app.lastWithdrawalCheckBlock),
                            ],
                        ]}
                    />
                </Section>

                <Section title="Execution parameters">
                    {ep ? (
                        <KV
                            rows={[
                                [
                                    "Snapshot policy",
                                    <StatusBadge status={ep.snapshotPolicy} />,
                                ],
                                [
                                    "Advance cycles (inc / max)",
                                    `${formatUint(ep.advanceIncCycles)} / ${formatUint(ep.advanceMaxCycles)}`,
                                ],
                                [
                                    "Inspect cycles (inc / max)",
                                    `${formatUint(ep.inspectIncCycles)} / ${formatUint(ep.inspectMaxCycles)}`,
                                ],
                                [
                                    "Advance deadline (inc / max)",
                                    `${formatNanos(ep.advanceIncDeadline)} / ${formatNanos(ep.advanceMaxDeadline)}`,
                                ],
                                [
                                    "Inspect deadline (inc / max)",
                                    `${formatNanos(ep.inspectIncDeadline)} / ${formatNanos(ep.inspectMaxDeadline)}`,
                                ],
                                [
                                    "Load / store deadline",
                                    `${formatNanos(ep.loadDeadline)} / ${formatNanos(ep.storeDeadline)}`,
                                ],
                                ["Fast deadline", formatNanos(ep.fastDeadline)],
                                [
                                    "Max concurrent inspects",
                                    ep.maxConcurrentInspects,
                                ],
                            ]}
                        />
                    ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Not available.
                        </p>
                    )}
                </Section>
            </div>

            <DecoderSettings
                key={app.applicationAddress}
                application={app.applicationAddress}
            />

            <Collapsible label="Raw JSON">
                <JsonView value={app} />
            </Collapsible>
        </div>
    );
}
