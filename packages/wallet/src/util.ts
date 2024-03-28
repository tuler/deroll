import { AdvanceRequestData, RequestMetadata } from "@deroll/app";
import { isAddress, isHex } from "viem";

// Utils
const haveKeys = <T extends object>(
    obj: unknown,
    keys: (keyof T)[],
): obj is T =>
    typeof obj === "object" && obj !== null && keys.every((key) => key in obj);

const checkMetadata = (metadata: unknown): metadata is RequestMetadata => {
    return (
        haveKeys(metadata, [
            "msg_sender",
            "epoch_index",
            "input_index",
            "block_number",
            "timestamp",
        ]) && isAddress(metadata.msg_sender)
    );
};

export const isValidAdvanceRequestData = (
    data: unknown,
): data is AdvanceRequestData => {
    return (
        haveKeys(data, ["payload", "metadata"]) &&
        checkMetadata(data.metadata) &&
        isHex(data.payload, { strict: true })
    );
};
