import type { Input, UserOp } from "@deroll/decoder";
import { Link } from "react-router-dom";
import { PayloadPreview } from "../components/PayloadView";
import { DataTable } from "../components/table";
import { ErrorBox, Hex, linkClass, Pill, Spinner } from "../components/ui";
import { formatUint } from "../lib/format";
import { feeToLinear } from "./fee";
import { useBatch, userOpPath } from "./userOps";

/** The linear value of a log-space fee exponent, in smallest fee-token units. */
function linearFee(exponent: number): string {
    try {
        return `${feeToLinear(exponent).toLocaleString()} smallest units`;
    } catch {
        return "out of range";
    }
}

/**
 * A log-space fee exponent (base 129/128), with its linear value on hover or,
 * with `detail`, spelled out.
 */
export function Fee({
    exponent,
    detail = false,
}: {
    exponent: number;
    detail?: boolean;
}) {
    const linear = `(129/128)^${exponent} = ${linearFee(exponent)}`;
    if (!detail) return <span title={linear}>{exponent.toLocaleString()}</span>;
    return (
        <span>
            {exponent.toLocaleString()}{" "}
            <span className="text-slate-500 dark:text-slate-400">
                ({linear})
            </span>
        </span>
    );
}

/** A recovered signer, or the reason there is none. */
export function Signer({
    signer,
    full = false,
}: {
    signer: UserOp["signer"];
    full?: boolean;
}) {
    if (signer) return <Hex value={signer} head={6} tail={4} full={full} />;
    return (
        <Pill
            label="unrecoverable"
            color="red"
            title="The signature does not recover a signer; the scheduler drops this operation"
        />
    );
}

/** Table of user operations, each decoded by the application's `userOp` method. */
export function UserOpsTable({
    ops,
    appParam,
    application,
    showInput = false,
    empty = "No user operations.",
}: {
    ops?: UserOp[];
    appParam: string;
    application: string;
    /** Add a column linking each operation to its batch input. */
    showInput?: boolean;
    empty?: string;
}) {
    return (
        <DataTable
            columns={[
                ...(showInput
                    ? [
                          {
                              header: "Input",
                              align: "right" as const,
                              cell: (op: UserOp) => (
                                  <Link
                                      to={`/apps/${appParam}/inputs/${op.inputIndex}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className={linkClass}
                                  >
                                      {formatUint(op.inputIndex)}
                                  </Link>
                              ),
                          },
                      ]
                    : []),
                {
                    header: "Op",
                    cell: (op) => (
                        <span
                            className="font-mono text-[13px]"
                            title={`frame ${op.frameIndex}, operation ${op.opIndex}`}
                        >
                            {op.frameIndex}.{op.opIndex}
                        </span>
                    ),
                },
                {
                    header: "Signer",
                    cell: (op) => <Signer signer={op.signer} />,
                },
                {
                    header: "Nonce",
                    align: "right",
                    cell: (op) => op.nonce.toLocaleString(),
                },
                {
                    header: "Max fee",
                    align: "right",
                    cell: (op) => <Fee exponent={op.maxFee} />,
                },
                {
                    header: "Payload",
                    truncate: true,
                    cell: (op) => (
                        <PayloadPreview
                            value={op.data}
                            decode={{ application, kind: "userOp", record: op }}
                        />
                    ),
                },
            ]}
            rows={ops}
            rowKey={(op) => `${op.inputIndex}/${op.frameIndex}/${op.opIndex}`}
            rowLink={(op) => userOpPath(appParam, op)}
            empty={empty}
        />
    );
}

/** The user operations of one batch input, unfolded under its table row. */
export function BatchUserOps({
    input,
    appParam,
    application,
}: {
    input: Input;
    appParam: string;
    application: string;
}) {
    const { batch, userOps, isLoading, error } = useBatch(input, application);
    if (!batch?.ok) return null;
    if (error) return <ErrorBox error={error} />;
    if (isLoading) return <Spinner label="Recovering signers…" />;
    return (
        <UserOpsTable
            ops={userOps}
            appParam={appParam}
            application={application}
            empty="This batch carries no user operations."
        />
    );
}
