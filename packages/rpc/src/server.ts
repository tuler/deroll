import { ApolloClient, InMemoryCache } from "@apollo/client/core";
import filterGraphQlFragment from "graphql-filter-fragment";
import { JSONRPCServer, TypedJSONRPCServer } from "json-rpc-2.0";
import { Methods } from "./methods";
import {
    InputDocument,
    InputNumberDocument,
    NoticeCountDocument,
    NoticeDocument,
    ReportCountDocument,
    ReportDocument,
    VoucherCountDocument,
    VoucherDocument,
} from "./__generated__/graphql";
import { exceptionMiddleware, logMiddleware } from "./middlewares";

export * from "./types";
export type ServerOptions = {
    graphqlUri: string;
};

export const createServer = (
    options: ServerOptions,
): TypedJSONRPCServer<Methods> => {
    const { graphqlUri } = options;

    // create graphql client
    const cache = new InMemoryCache();
    const client = new ApolloClient({ cache, uri: graphqlUri });

    // create json-rpc server
    const server: TypedJSONRPCServer<Methods> = new JSONRPCServer();
    server.addMethod("cartesi_inputNumber", async () => {
        const { data } = await client.query({
            query: InputNumberDocument,
            fetchPolicy: "no-cache",
        });
        return data.inputs.edges[0] ? data.inputs.edges[0].node.index : -1;
    });

    server.addMethod("cartesi_getInput", async ([inputNumber]) => {
        const { data } = await client.query({
            query: InputDocument,
            variables: { inputNumber },
            fetchPolicy: "no-cache",
        });
        const input = filterGraphQlFragment(InputDocument, data).input;
        return input;
    });

    server.addMethod("cartesi_getNoticeCount", async ([inputNumber]) => {
        const { data } = await client.query({
            query: NoticeCountDocument,
            variables: { inputNumber },
            fetchPolicy: "no-cache",
        });
        return data.input.notices.totalCount;
    });

    server.addMethod("cartesi_getReportCount", async ([inputNumber]) => {
        const { data } = await client.query({
            query: ReportCountDocument,
            variables: { inputNumber },
            fetchPolicy: "no-cache",
        });
        return data.input.reports.totalCount;
    });

    server.addMethod("cartesi_getVoucherCount", async ([inputNumber]) => {
        const { data } = await client.query({
            query: VoucherCountDocument,
            variables: { inputNumber },
            fetchPolicy: "no-cache",
        });
        return data.input.vouchers.totalCount;
    });

    server.addMethod(
        "cartesi_getNotice",
        async ([inputNumber, noticeNumber]) => {
            const { data } = await client.query({
                query: NoticeDocument,
                variables: { inputNumber, noticeNumber },
                fetchPolicy: "no-cache",
            });
            const notice = filterGraphQlFragment(NoticeDocument, data).input
                .notice;
            return notice;
        },
    );

    server.addMethod(
        "cartesi_getReport",
        async ([inputNumber, reportNumber]) => {
            const { data } = await client.query({
                query: ReportDocument,
                variables: { inputNumber, reportNumber },
                fetchPolicy: "no-cache",
            });
            const report = filterGraphQlFragment(ReportDocument, data).input
                .report;
            return report;
        },
    );

    server.addMethod(
        "cartesi_getVoucher",
        async ([inputNumber, voucherNumber]) => {
            const { data } = await client.query({
                query: VoucherDocument,
                variables: { inputNumber, voucherNumber },
                fetchPolicy: "no-cache",
            });
            const voucher = filterGraphQlFragment(VoucherDocument, data).input
                .voucher;
            return voucher;
        },
    );

    server.applyMiddleware(logMiddleware, exceptionMiddleware);
    return server;
};
