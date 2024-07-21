import { type GetInputReturnType } from "@deroll/rpc/client";
import pRetry, { AbortError } from "p-retry";
import { Account, Chain, Client, Transport } from "viem";
import { PublicCartesiRpcSchema } from "../decorators/publicL2";

export type WaitForInputParams = {
    inputNumber: number;
    waitProcessing?: boolean;
    rejectErrors?: boolean;
    pollingInterval?: number;
    retryCount?: number;
    timeout?: number;
};

export const waitForInput = async <
    TChain extends Chain | undefined,
    TAccount extends Account | undefined,
>(
    client: Client<Transport, TChain, TAccount, PublicCartesiRpcSchema>,
    params: WaitForInputParams,
): Promise<GetInputReturnType> => {
    const { inputNumber } = params;
    const pollingInterval = params.pollingInterval ?? client.pollingInterval;
    const retryCount = params.retryCount ?? 10;
    const timeout = params.timeout;

    // wait processing by default
    const waitProcessing =
        params.waitProcessing === undefined ? true : params.waitProcessing;

    // reject if input was not successfully processed
    const rejectErrors =
        params.rejectErrors === undefined ? false : params.rejectErrors;

    const input = pRetry(
        async () => {
            const input = await client.request({
                method: "cartesi_getInput",
                params: [inputNumber],
            });

            if (waitProcessing && input.status === "UNPROCESSED") {
                throw new Error("Input is UNPROCESSED");
            }

            if (
                rejectErrors &&
                (input.status === "CYCLE_LIMIT_EXCEEDED" ||
                    input.status === "EXCEPTION" ||
                    input.status === "MACHINE_HALTED" ||
                    input.status === "PAYLOAD_LENGTH_LIMIT_EXCEEDED" ||
                    input.status === "REJECTED" ||
                    input.status === "TIME_LIMIT_EXCEEDED")
            ) {
                throw new AbortError(`Input status: ${input.status}`);
            }

            return input;
        },
        {
            retries: retryCount,
            minTimeout: pollingInterval,
            factor: 1,
            maxRetryTime: timeout,
        },
    );

    return input;
};
