import type { App, InspectRequest } from "@deroll/core";
import {
    type MatchFunction,
    type MatchResult,
    type Path,
    match,
} from "path-to-regexp";
import { bytesToString, stringToHex } from "viem";

export type Handler<P extends object = object> = (
    match: MatchResult<P>,
    matchedRoute: Route<P>,
) => string;

type Route<P extends object> = {
    matcher: MatchFunction<P>;
    handler: Handler<P>;
};

export type RouterOptions = {
    app: App;
};

export class Router {
    private options: RouterOptions;
    // biome-ignore lint/suspicious/noExplicitAny: router type
    private routes: Route<any>[];

    constructor(options: RouterOptions) {
        this.options = options;
        this.routes = [];
        this.handler = this.handler.bind(this);
    }

    public add<P extends object>(path: Path, handler: Handler<P>): Route<P> {
        const matcher = match<P>(path, { decode: decodeURIComponent });

        const route = { matcher, handler };
        this.routes.push(route);
        return route;
    }

    private handle(url: string): string | undefined {
        for (const route of this.routes) {
            const match = route.matcher(url);
            if (match) {
                try {
                    return route.handler(match, route);
                } catch (e) {
                    throw new Error(`Error handling route ${url}`, {
                        cause: e,
                    });
                }
            }
        }
        return undefined;
    }

    public handler(request: InspectRequest): void {
        const url = bytesToString(request.payload);
        const result = this.handle(url);
        if (result) {
            // create single report with handler result
            this.options.app.createReport(stringToHex(result));
        }
    }
}

export const createRouter = (options: RouterOptions): Router => {
    return new Router(options);
};
