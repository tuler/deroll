import { keepPreviousData } from "@tanstack/react-query";
import { useWithdrawals } from "@cartesi/react";
import {
    DataTable,
    Filter,
    filterInputClass,
    Pager,
    SortToggle,
    useListControls,
} from "../components/table";
import { PayloadPreview } from "../components/PayloadView";
import { TxHash } from "../components/TxHash";
import { Section } from "../components/ui";
import {
    formatDate,
    formatUint,
    hexByteLength,
    uintToDecimal,
} from "../lib/format";
import { useApp } from "./AppLayout";

export function WithdrawalsPage() {
    const { searchParams, limit, offset, descending, update } =
        useListControls();
    const account = searchParams.get("account") ?? "";
    const { appParam, application } = useApp();

    const withdrawals = useWithdrawals({
        application: appParam,
        accountIndex: account ? BigInt(account) : undefined,
        limit,
        offset,
        descending,
        placeholderData: keepPreviousData,
    });

    return (
        <Section
            title="Withdrawals"
            actions={
                <div className="flex flex-wrap items-center gap-3">
                    <Filter label="Account">
                        <input
                            type="number"
                            min={0}
                            value={account}
                            onChange={(e) =>
                                update({ account: e.target.value })
                            }
                            placeholder="any"
                            className={`${filterInputClass} w-24`}
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
                        header: "Account index",
                        align: "right",
                        cell: (w) => formatUint(w.accountIndex),
                    },
                    {
                        header: "Account",
                        truncate: true,
                        cell: (w) => (
                            <PayloadPreview
                                value={w.account}
                                decode={{
                                    application: application.applicationAddress,
                                    kind: "withdrawalAccount",
                                    record: w,
                                }}
                            />
                        ),
                    },
                    {
                        header: "Output size",
                        align: "right",
                        cell: (w) =>
                            `${hexByteLength(w.output).toLocaleString()} B`,
                    },
                    {
                        header: "Block",
                        align: "right",
                        cell: (w) => formatUint(w.blockNumber),
                    },
                    {
                        header: "Transaction",
                        cell: (w) => <TxHash value={w.transactionHash} />,
                    },
                    { header: "Created", cell: (w) => formatDate(w.createdAt) },
                ]}
                rows={withdrawals.data?.data}
                rowKey={(w) => w.accountIndex.toString()}
                rowLink={(w) =>
                    `/apps/${appParam}/withdrawals/${uintToDecimal(w.accountIndex)}`
                }
                isLoading={withdrawals.isLoading}
                error={withdrawals.error}
                empty="No withdrawals — they appear only after the application is foreclosed and its accounts drive is proved."
            />
            <Pager
                pagination={withdrawals.data?.pagination}
                limit={limit}
                offset={offset}
                onChange={(next) => update(next)}
            />
        </Section>
    );
}
