import { keepPreviousData } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useReports } from "@cartesi/wagmi";
import {
    DataTable,
    Filter,
    filterInputClass,
    Pager,
    SortToggle,
    useListControls,
} from "../components/table";
import { PayloadPreview } from "../components/PayloadView";
import { Section } from "../components/ui";
import { formatUint, hexByteLength, uintToDecimal } from "../lib/format";
import { useApp } from "./AppLayout";

export function ReportsPage() {
    const { searchParams, limit, offset, descending, update } =
        useListControls();
    const epoch = searchParams.get("epoch") ?? "";
    const input = searchParams.get("input") ?? "";
    const { appParam, application } = useApp();

    const reports = useReports({
        application: appParam,
        epochIndex: epoch ? BigInt(epoch) : undefined,
        inputIndex: input ? BigInt(input) : undefined,
        limit,
        offset,
        descending,
        placeholderData: keepPreviousData,
    });

    return (
        <Section
            title="Reports"
            actions={
                <div className="flex flex-wrap items-center gap-3">
                    <Filter label="Epoch">
                        <input
                            type="number"
                            min={0}
                            value={epoch}
                            onChange={(e) => update({ epoch: e.target.value })}
                            placeholder="any"
                            className={`${filterInputClass} w-20`}
                        />
                    </Filter>
                    <Filter label="Input">
                        <input
                            type="number"
                            min={0}
                            value={input}
                            onChange={(e) => update({ input: e.target.value })}
                            placeholder="any"
                            className={`${filterInputClass} w-20`}
                        />
                    </Filter>
                    <SortToggle
                        descending={descending}
                        onChange={(desc) => update({ desc })}
                    />
                </div>
            }
        >
            <DataTable
                columns={[
                    {
                        header: "Index",
                        align: "right",
                        cell: (r) => formatUint(r.index),
                    },
                    {
                        header: "Epoch",
                        align: "right",
                        cell: (r) => (
                            <Link
                                to={`/apps/${appParam}/epochs/${uintToDecimal(r.epochIndex)}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-sky-700 hover:underline dark:text-sky-400"
                            >
                                {formatUint(r.epochIndex)}
                            </Link>
                        ),
                    },
                    {
                        header: "Input",
                        align: "right",
                        cell: (r) => (
                            <Link
                                to={`/apps/${appParam}/inputs/${uintToDecimal(r.inputIndex)}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-sky-700 hover:underline dark:text-sky-400"
                            >
                                {formatUint(r.inputIndex)}
                            </Link>
                        ),
                    },
                    {
                        header: "Size",
                        align: "right",
                        cell: (r) =>
                            `${hexByteLength(r.rawData).toLocaleString()} B`,
                    },
                    {
                        header: "Payload",
                        truncate: true,
                        cell: (r) => (
                            <PayloadPreview
                                value={r.rawData}
                                decode={{
                                    application: application.applicationAddress,
                                    kind: "report",
                                    record: r,
                                }}
                            />
                        ),
                    },
                ]}
                rows={reports.data?.data}
                rowKey={(r) => r.index.toString()}
                rowLink={(r) =>
                    `/apps/${appParam}/reports/${uintToDecimal(r.index)}`
                }
                isLoading={reports.isLoading}
                error={reports.error}
                empty="No reports."
            />
            <Pager
                pagination={reports.data?.pagination}
                limit={limit}
                offset={offset}
                onChange={(next) => update(next)}
            />
        </Section>
    );
}
