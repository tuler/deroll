#!/usr/bin/env node
import { Option, program } from "@commander-js/extra-typings";
import bodyParser from "body-parser";
import { InvalidArgumentError } from "commander";
import express from "express";
import { createServer, ServerOptions } from "./server";

type AppOptions = ServerOptions & {
    path?: string;
};

const createApp = (options: AppOptions) => {
    const path = options.path || "/rpc";
    const server = createServer(options);

    // create express http server
    const app = express();
    app.use(bodyParser.json());
    app.post(path, (req, res) => {
        const jsonRPCRquest = req.body;
        server.receive(jsonRPCRquest).then((jsonRPCResponse) => {
            if (jsonRPCResponse) {
                res.json(jsonRPCResponse);
            } else {
                res.sendStatus(204);
            }
        });
    });
    return app;
};

const portParser = (value: string, _dummyPrevious: number): number => {
    // parseInt takes a string and a radix
    const parsedValue = parseInt(value, 10);
    if (isNaN(parsedValue) || parsedValue < 0 || parsedValue >= 65536) {
        throw new InvalidArgumentError("port should be >= 0 and < 65536");
    }
    return parsedValue;
};

const envPrefix = "CARTESI_RPC_";
program
    .name("cartesi-rpc")
    .argument("<graphqlUri>")
    .addOption(
        new Option("-p, --port <port>", "port for the RPC server")
            .default(4000)
            .argParser(portParser)
            .env(`${envPrefix}PORT`),
    )
    .addOption(
        new Option("--hostname <hostname>", "hostname for the RPC server")
            .env(`${envPrefix}HOSTNAME`)
            .default("127.0.0.1"),
    )
    .addOption(
        new Option("--path <path>", "path prefix for the RPC server")
            .default("/rpc")
            .env(`${envPrefix}PATH`),
    )
    .action((graphqlUri, options) => {
        const { hostname, path, port } = options;
        const app = createApp({ graphqlUri, path });
        app.listen(port, hostname, () => {
            console.log(
                `server listening at http://${hostname}:${port}${path}`,
            );
            console.log(`backend at ${graphqlUri}`);
        });
    });
program.parse();
