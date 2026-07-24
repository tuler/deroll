// biome-ignore-all lint/correctness/useJsxKeyInIterable: KV/Crumbs tuples pass JSX as slot content rendered by the component, not as sibling list items
import { useParams } from "react-router-dom";
import { useWithdrawal } from "@cartesi/wagmi";
import { PayloadView } from "../components/PayloadView";
import { TxHash } from "../components/TxHash";
import {
    Collapsible,
    Crumbs,
    ErrorBox,
    JsonView,
    KV,
    Section,
    Spinner,
} from "../components/ui";
import { parseUintParam, formatDate, formatUint } from "../lib/format";
import { useApp } from "./AppLayout";

export function WithdrawalPage() {
    const { appParam, application } = useApp();
    const { accountIndex = "0" } = useParams();
    const withdrawal = useWithdrawal({
        application: appParam,
        accountIndex: parseUintParam(accountIndex),
    });

    if (withdrawal.isPending) return <Spinner />;
    if (withdrawal.isError) return <ErrorBox error={withdrawal.error} />;
    const w = withdrawal.data;
    const base = `/apps/${appParam}`;

    return (
        <div className="space-y-4">
            <Crumbs
                items={[
                    { label: "Withdrawals", to: `${base}/withdrawals` },
                    { label: `Account ${formatUint(w.accountIndex)}` },
                ]}
            />

            <Section
                title={`Withdrawal — account ${formatUint(w.accountIndex)}`}
            >
                <KV
                    rows={[
                        ["Account index", formatUint(w.accountIndex)],
                        ["Block", formatUint(w.blockNumber)],
                        [
                            "Transaction",
                            <TxHash value={w.transactionHash} full />,
                        ],
                        ["Log index", formatUint(w.logIndex)],
                        ["Created", formatDate(w.createdAt)],
                        ["Updated", formatDate(w.updatedAt)],
                    ]}
                />
            </Section>

            <Section title="Account">
                <PayloadView
                    value={w.account}
                    decode={{
                        application: application.applicationAddress,
                        kind: "withdrawalAccount",
                        record: w,
                    }}
                />
            </Section>

            <Section title="Output">
                <PayloadView
                    value={w.output}
                    decode={{
                        application: application.applicationAddress,
                        kind: "withdrawalOutput",
                        record: w,
                    }}
                />
            </Section>

            <Collapsible label="Raw JSON">
                <JsonView value={w} />
            </Collapsible>
        </div>
    );
}
