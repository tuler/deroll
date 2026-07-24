// biome-ignore-all lint/correctness/useJsxKeyInIterable: KV/Crumbs tuples pass JSX as slot content rendered by the component, not as sibling list items
import { Link, useParams } from "react-router-dom";
import { useReport } from "@cartesi/wagmi";
import { PayloadView } from "../components/PayloadView";
import {
    Collapsible,
    Crumbs,
    ErrorBox,
    JsonView,
    KV,
    Section,
    Spinner,
} from "../components/ui";
import {
    parseUintParam,
    formatDate,
    formatUint,
    uintToDecimal,
} from "../lib/format";
import { useApp } from "./AppLayout";

export function ReportPage() {
    const { appParam, application } = useApp();
    const { reportIndex = "0" } = useParams();
    const report = useReport({
        application: appParam,
        reportIndex: parseUintParam(reportIndex),
    });

    if (report.isPending) return <Spinner />;
    if (report.isError) return <ErrorBox error={report.error} />;
    const r = report.data;
    const base = `/apps/${appParam}`;

    return (
        <div className="space-y-4">
            <Crumbs
                items={[
                    { label: "Reports", to: `${base}/reports` },
                    { label: `Report ${formatUint(r.index)}` },
                ]}
            />

            <Section title={`Report ${formatUint(r.index)}`}>
                <KV
                    rows={[
                        ["Index", formatUint(r.index)],
                        [
                            "Epoch",
                            <Link
                                className="text-sky-700 hover:underline dark:text-sky-400"
                                to={`${base}/epochs/${uintToDecimal(r.epochIndex)}`}
                            >
                                {formatUint(r.epochIndex)}
                            </Link>,
                        ],
                        [
                            "Input",
                            <Link
                                className="text-sky-700 hover:underline dark:text-sky-400"
                                to={`${base}/inputs/${uintToDecimal(r.inputIndex)}`}
                            >
                                {formatUint(r.inputIndex)}
                            </Link>,
                        ],
                        ["Created", formatDate(r.createdAt)],
                        ["Updated", formatDate(r.updatedAt)],
                    ]}
                />
            </Section>

            <Section title="Payload">
                <PayloadView
                    value={r.rawData}
                    decode={{
                        application: application.applicationAddress,
                        kind: "report",
                        record: r,
                    }}
                />
            </Section>

            <Collapsible label="Raw JSON">
                <JsonView value={r} />
            </Collapsible>
        </div>
    );
}
