// biome-ignore-all lint/correctness/useJsxKeyInIterable: KV/Crumbs tuples pass JSX as slot content rendered by the component, not as sibling list items
import { useInput } from "@cartesi/react";
import { Link, useParams } from "react-router-dom";
import { PayloadView } from "../components/PayloadView";
import {
    Collapsible,
    Crumbs,
    ErrorBox,
    EmptyState,
    Hex,
    JsonView,
    KV,
    linkClass,
    Section,
    Spinner,
    StatusBadge,
} from "../components/ui";
import { formatUint, parseUintParam } from "../lib/format";
import { SubmittedNote } from "../sequencer/BatchSection";
import { useBatch } from "../sequencer/userOps";
import { Fee, Signer } from "../sequencer/UserOpsTable";
import { useApp } from "./AppLayout";

export function UserOpPage() {
    const { appParam, application } = useApp();
    const { inputIndex = "0", frameIndex = "0", opIndex = "0" } = useParams();
    const input = useInput({
        application: appParam,
        inputIndex: parseUintParam(inputIndex),
    });
    const { batch, userOps, isLoading, error } = useBatch(
        input.data,
        application.applicationAddress,
    );

    if (input.isPending) return <Spinner />;
    if (input.isError) return <ErrorBox error={input.error} />;
    const base = `/apps/${appParam}`;
    const label = `User op ${frameIndex}.${opIndex}`;
    const crumbs = (
        <Crumbs
            items={[
                { label: "Inputs", to: `${base}/inputs` },
                {
                    label: `Input ${formatUint(input.data.index)}`,
                    to: `${base}/inputs/${inputIndex}`,
                },
                { label },
            ]}
        />
    );

    if (!batch?.ok) {
        return (
            <div className="space-y-4">
                {crumbs}
                <EmptyState
                    label={
                        batch
                            ? "This input is a malformed batch; it carries no user operations."
                            : "This input is not a sequencer batch. Set the application's batch submitter on its Overview page."
                    }
                />
            </div>
        );
    }
    if (error) return <ErrorBox error={error} />;
    if (isLoading || !userOps) return <Spinner label="Recovering signers…" />;

    const op = userOps.find(
        (o) =>
            String(o.frameIndex) === frameIndex &&
            String(o.opIndex) === opIndex,
    );
    if (!op) {
        return (
            <div className="space-y-4">
                {crumbs}
                <EmptyState label="This batch has no such user operation." />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {crumbs}
            <Section
                title={
                    <span className="flex items-center gap-3">
                        {label} <StatusBadge status="SUBMITTED" />
                    </span>
                }
            >
                <div className="space-y-3">
                    <KV
                        rows={[
                            ["Signer", <Signer signer={op.signer} full />],
                            ["Nonce", op.nonce.toLocaleString()],
                            ["Max fee", <Fee exponent={op.maxFee} detail />],
                            [
                                "Batch input",
                                <Link
                                    to={`${base}/inputs/${inputIndex}`}
                                    className={linkClass}
                                >
                                    {formatUint(op.inputIndex)}
                                </Link>,
                            ],
                            ["Batch nonce", formatUint(op.batchNonce)],
                            ["Frame", op.frameIndex.toLocaleString()],
                            ["Position in frame", op.opIndex.toLocaleString()],
                            ["Frame safe block", formatUint(op.safeBlock)],
                            [
                                "Frame fee price",
                                <Fee exponent={op.feePrice} detail />,
                            ],
                            ["Signature", <Hex value={op.signature} full />],
                            [
                                "Data",
                                <PayloadView
                                    value={op.data}
                                    decode={{
                                        application:
                                            application.applicationAddress,
                                        kind: "userOp",
                                        record: op,
                                    }}
                                />,
                            ],
                        ]}
                    />
                    <SubmittedNote />
                </div>
            </Section>
            <Collapsible label="Raw JSON">
                <JsonView value={op} />
            </Collapsible>
        </div>
    );
}
