// Record types come from @cartesi/client — the typed toolkit for the Cartesi
// Rollups node (https://cartesi.github.io/rollups-ts) that @cartesi/react's
// hooks are built on. This module only re-exports them and adds UI-side
// constants and small accessors.

import type { EpochStatus, Output, OutputType } from "@cartesi/client";

export type * from "@cartesi/client";

export const EPOCH_STATUSES: EpochStatus[] = [
    "OPEN",
    "CLOSED",
    "INPUTS_PROCESSED",
    "CLAIM_COMPUTED",
    "CLAIM_SUBMITTED",
    "CLAIM_STAGED",
    "CLAIM_ACCEPTED",
    "CLAIM_REJECTED",
    "CLAIM_FORECLOSED",
];

/** The canonical output types (Cartesi Outputs library), as the node names them. */
export const OUTPUT_TYPES: OutputType[] = [
    "Notice",
    "Voucher",
    "DelegateCallVoucher",
];

export function outputTypeLabel(type?: string | null): string {
    return type ?? "Unknown";
}

/** Voucher/DelegateCallVoucher destination; Notices have none. */
export function outputDestination(
    decoded: Output["decodedData"],
): string | undefined {
    return decoded && "destination" in decoded
        ? decoded.destination
        : undefined;
}

/** Voucher value (wei); other output types have none. */
export function outputValue(
    decoded: Output["decodedData"],
): bigint | undefined {
    return decoded && "value" in decoded ? decoded.value : undefined;
}
