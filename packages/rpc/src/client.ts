import { JSONRPCClient, TypedJSONRPCClient } from "json-rpc-2.0";
import { Methods } from "./methods";

export * from "./types";
export type ClientOptions = {
    uri: string;
};

export const createClient = (
    options: ClientOptions,
): TypedJSONRPCClient<Methods> => {
    const { uri } = options;
    const client = new JSONRPCClient((jsonRPCRequest) => {
        fetch(uri, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(jsonRPCRequest),
        }).then((response) => {
            if (response.status === 200) {
                return response
                    .json()
                    .then((jsonRCPResponse) => client.receive(jsonRCPResponse));
            } else if (jsonRPCRequest.id !== undefined) {
                return Promise.reject(new Error(response.statusText));
            }
        });
    });
    return client;
};
