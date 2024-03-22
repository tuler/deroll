import { AdvanceRequestData, RequestMetadata } from "@deroll/app";
import { isAddress, isHex } from "viem";
import { MissingContextArgumentError } from "./errors";

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

export const checkFieldsOrThrow = <T extends object>(
    obj: Partial<T>,
): obj is Required<typeof obj> => {
    const keys = Object.entries(obj);
    const undKeys = keys.filter(([, value]) => value !== undefined);

    if (undKeys.length > 0) {
        throw new MissingContextArgumentError(Object.fromEntries(undKeys));
    }

    return true;
};
