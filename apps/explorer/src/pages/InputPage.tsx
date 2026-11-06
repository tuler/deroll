// biome-ignore-all lint/correctness/useJsxKeyInIterable: KV/Crumbs tuples pass JSX as slot content rendered by the component, not as sibling list items
import { Link, useParams } from "react-router-dom";
import { useInput } from "@cartesi/react";
import { PayloadView } from "../components/PayloadView";
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
    uintToDecimal,
} from "../lib/format";
import { useApp } from "./AppLayout";
import { BatchSection } from "../sequencer/BatchSection";

export function InputPage() {
    const { appParam, application } = useApp();
    const { inputIndex = "0" } = useParams();
    const input = useInput({
        application: appParam,
        inputIndex: parseUintParam(inputIndex),
    });

    if (input.isPending) return <Spinner />;
    if (input.isError) return <ErrorBox error={input.error} />;
    const i = input.data;
    const base = `/apps/${appParam}`;
    const decoded = i.decodedData;
    const timestamp = decoded?.blockTimestamp ?? null;

    return (
        <div className="space-y-4">
            <Crumbs
                items={[
                    { label: "Inputs", to: `${base}/inputs` },
                    { label: `Input ${formatUint(i.index)}` },
                ]}
            />

            <Section
                title={
                    <span className="flex items-center gap-3">
                        Input {formatUint(i.index)}{" "}
                        <StatusBadge status={i.status} />
                    </span>
                }
            >
                <KV
                    rows={[
                        ["Index", formatUint(i.index)],
                        [
                            "Epoch",
                            <Link
                                className="underline decoration-cartesi-teal underline-offset-2 hover:decoration-2 dark:text-cartesi-cyan dark:decoration-cartesi-cyan/40"
                                to={`${base}/epochs/${uintToDecimal(i.epochIndex)}`}
                            >
                                {formatUint(i.epochIndex)}
                            </Link>,
                        ],
                        ["Status", <StatusBadge status={i.status} />],
                        ["Block number", formatUint(i.blockNumber)],
                        ["Machine hash", <Hex value={i.machineHash} full />],
                        [
                            "TX buffer data block",
                            <Hex value={i.txBufferDataBlock} full />,
                        ],
                        [
                            "Transaction reference",
                            <TxHash value={i.transactionHash} full />,
                        ],
                        ["Created", formatDate(i.createdAt)],
                        ["Updated", formatDate(i.updatedAt)],
                    ]}
                />
            </Section>

            {i.exceptionData !== null && (
                <Section title="Exception data">
                    <PayloadView value={i.exceptionData} />
                </Section>
            )}

            {decoded && (
                <Section title="Decoded EvmAdvance">
                    <KV
                        rows={[
                            ["Sender", <Hex value={decoded.sender} full />],
                            [
                                "Application contract",
                                <Hex
                                    value={decoded.applicationContract}
                                    full
                                />,
                            ],
                            ["Chain ID", formatUint(decoded.chainId)],
                            ["Block number", formatUint(decoded.blockNumber)],
                            [
                                "Block timestamp",
                                timestamp !== null
                                    ? `${formatDate(new Date(Number(timestamp) * 1000).toISOString())} (${timestamp})`
                                    : "—",
                            ],
                            [
                                "Prev randao",
                                <Hex
                                    value={`0x${decoded.prevRandao.toString(16).padStart(64, "0")}`}
                                />,
                            ],
                            [
                                "Payload",
                                <PayloadView
                                    value={decoded.payload}
                                    decode={{
                                        application:
                                            application.applicationAddress,
                                        kind: "input",
                                        record: i,
                                    }}
                                />,
                            ],
                        ]}
                    />
                </Section>
            )}

            <BatchSection
                input={i}
                appParam={appParam}
                application={application.applicationAddress}
            />

            <Section title="Produced by this input">
                <div className="flex flex-wrap gap-2">
                    <Link
                        to={`${base}/outputs?input=${inputIndex}`}
                        className="rounded-full border border-neutral-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-eyebrow text-neutral-900 hover:border-accent dark:border-white dark:text-white"
                    >
                        Outputs →
                    </Link>
                    <Link
                        to={`${base}/reports?input=${inputIndex}`}
                        className="rounded-full border border-neutral-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-eyebrow text-neutral-900 hover:border-accent dark:border-white dark:text-white"
                    >
                        Reports →
                    </Link>
                </div>
            </Section>

            <div className="space-y-2">
                <Collapsible label="Raw input data">
                    <PayloadView value={i.rawData} />
                </Collapsible>
                <Collapsible label="Raw JSON">
                    <JsonView value={i} />
                </Collapsible>
            </div>
        </div>
    );
}
