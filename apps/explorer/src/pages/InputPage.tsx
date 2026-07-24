// biome-ignore-all lint/correctness/useJsxKeyInIterable: KV/Crumbs tuples pass JSX as slot content rendered by the component, not as sibling list items
import { Link, useParams } from "react-router-dom";
import { useInput } from "@cartesi/wagmi";
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
                                className="text-sky-700 hover:underline dark:text-sky-400"
                                to={`${base}/epochs/${uintToDecimal(i.epochIndex)}`}
                            >
                                {formatUint(i.epochIndex)}
                            </Link>,
                        ],
                        ["Status", <StatusBadge status={i.status} />],
                        ["Block number", formatUint(i.blockNumber)],
                        ["Machine hash", <Hex value={i.machineHash} full />],
                        ["Outputs hash", <Hex value={i.outputsHash} full />],
                        [
                            "Transaction reference",
                            <TxHash value={i.transactionHash} full />,
                        ],
                        ["Created", formatDate(i.createdAt)],
                        ["Updated", formatDate(i.updatedAt)],
                    ]}
                />
            </Section>

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

            <Section title="Produced by this input">
                <div className="flex flex-wrap gap-2">
                    <Link
                        to={`${base}/outputs?input=${inputIndex}`}
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-sky-700 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-400 dark:hover:bg-slate-800"
                    >
                        Outputs →
                    </Link>
                    <Link
                        to={`${base}/reports?input=${inputIndex}`}
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-sky-700 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-400 dark:hover:bg-slate-800"
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
