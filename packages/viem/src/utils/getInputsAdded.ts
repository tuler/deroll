import {
    ContractEventArgsFromTopics,
    parseEventLogs,
    TransactionReceipt,
} from "viem";
import { inputBoxAbi } from "../rollups";

export type InputAdded = ContractEventArgsFromTopics<
    typeof inputBoxAbi,
    "InputAdded",
    true
>;

export const getInputsAdded = (receipt: TransactionReceipt): InputAdded[] => {
    const logs = parseEventLogs({
        abi: inputBoxAbi,
        logs: receipt.logs,
        eventName: "InputAdded",
    });
    return logs.map((log) => log.args);
};
