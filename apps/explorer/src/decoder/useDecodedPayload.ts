import { useQuery } from "@tanstack/react-query";
import type { Deposit, Input, UserOp } from "@deroll/decoder";
import { useNodeInfo } from "@cartesi/react";
import { loadDecoder } from "./loader";
import { decodePortalInput, hasDepositAppData } from "./portals";
import { useDecoderUrl } from "./registry";
import { decodeBatchInput, describeBatch } from "../sequencer/userOps";
import { useSubmitter } from "../sequencer/registry";
import type { DecodeContext, DecodeResult, PayloadKind } from "./types";

/** Identifies a payload for decoding; passed through to the registered decoder. */
export interface DecodeProps {
    /** Application contract address (not the route param, which may be a name). */
    application: string;
    /** Payload source — also the name of the decoder method to call. */
    kind: PayloadKind;
    /** Full record (Input, Output, Report, Withdrawal or UserOp) the bytes belong to. */
    record: unknown;
}

/**
 * What identifies a decode beyond its bytes. A user op's decode may depend on
 * its signer and position, and two ops can carry identical data.
 */
function recordKey(props: DecodeProps): string | undefined {
    if (props.kind !== "userOp") return undefined;
    const op = props.record as UserOp;
    return `${op.inputIndex}/${op.frameIndex}/${op.opIndex}/${op.signer}`;
}

export interface DecodedPayload {
    /** 'off' when nothing applies: no decoder registered or empty payload. */
    status: "off" | "loading" | "decoded" | "failed";
    result?: DecodeResult;
    /** Set when the module failed to load or decode() threw; a null return is silent. */
    error?: Error;
}

/**
 * Merges a decoder's decode of the deposit's app-specific data into the
 * explorer's native deposit result.
 */
function composeDeposit(
    native: DecodeResult,
    custom: DecodeResult,
): DecodeResult {
    const deposit = native.data as Deposit;
    return {
        summary: [native.summary, custom.summary].filter(Boolean).join(" · "),
        tags: [...(native.tags ?? []), ...(custom.tags ?? [])],
        data:
            custom.data === undefined
                ? deposit
                : { ...deposit, decodedData: custom.data },
    };
}

/**
 * Runs the application's registered decoder (if any) over a payload. Portal
 * deposit inputs are decoded natively — no decoder needed — with the
 * decoder's optional `deposit` method decorating the result. So are sequencer
 * batches: their user operations reach the decoder one by one, through its
 * `userOp` method.
 */
export function useDecodedPayload(
    payload?: string | null,
    props?: DecodeProps,
): DecodedPayload {
    const url = useDecoderUrl(props?.application);
    const submitter = useSubmitter(props?.application);
    const chainId = useNodeInfo({}).data?.chainId;
    const hasPayload = !!props && !!payload && payload !== "0x";
    // Inputs are always eligible (they may be a natively-decoded deposit);
    // every other payload needs a registered decoder.
    const enabled = hasPayload && (!!url || props.kind === "input");

    const query = useQuery<DecodeResult | null>({
        queryKey: [
            "decode",
            url,
            props?.kind,
            payload,
            props && recordKey(props),
            props?.kind === "input" ? submitter : undefined,
        ],
        queryFn: async () => {
            if (!props) return null;
            const { kind, application, record } = props;
            const context: DecodeContext = {
                application: application.toLowerCase(),
                chainId,
            };
            if (kind === "input") {
                // A batch is protocol-defined and never a direct input, so
                // the decoder's `input` method is not called for it.
                const batch = decodeBatchInput(record as Input, submitter);
                if (batch) return describeBatch(batch);
                // Deposits are protocol-defined: decode them here, and only hand the
                // decoder their app-specific attachment (execLayerData & co).
                const native = decodePortalInput(record as Input);
                if (native) {
                    const deposit = native.data as Deposit;
                    if (url && hasDepositAppData(deposit)) {
                        try {
                            const decoder = await loadDecoder(url);
                            const custom = decoder.deposit
                                ? await decoder.deposit(deposit, context)
                                : null;
                            if (custom) return composeDeposit(native, custom);
                        } catch {
                            // A broken decoder must not hide the native deposit view.
                        }
                    }
                    return native;
                }
            }
            if (!url) return null;
            const decoder = await loadDecoder(url);
            // An exported method is the capability signal: only call what the
            // decoder declares, and fall back to the hex/UTF-8 view otherwise.
            const method = decoder[kind];
            if (!method) return null;
            // Cast: kind is a runtime value and record is unknown here, so the
            // per-method record type can't be proven, though the shape is correct.
            const result = await (
                method as (r: unknown, c: DecodeContext) => unknown
            )(record, context);
            return (result ?? null) as DecodeResult | null;
        },
        enabled,
        retry: false,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
    });

    if (!enabled) return { status: "off" };
    if (query.isPending) return { status: "loading" };
    if (query.error) return { status: "failed", error: query.error };
    if (query.data === null) return { status: "failed" };
    return { status: "decoded", result: query.data };
}
