import { App, InspectRequestData } from "@deroll/app";
import { Key, match, MatchResult, MatchFunction, Path } from "path-to-regexp";
import { bytesToString, stringToBytes, toBytes, toHex } from "viem";

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private routes: Route<any>[];

    constructor(options: RouterOptions) {
        this.options = options;
        this.routes = [];
        this.handler = this.handler.bind(this);
    }

    public add<P extends object>(path: Path, handler: Handler<P>): Route<P> {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const keys: Key[] = [];
        const matcher = match<P>(path, { decode: decodeURIComponent });

        const route: Route<P> = { matcher, handler };
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

    public async handler(data: InspectRequestData): Promise<void> {
        const url = bytesToString(toBytes(data.payload));
        const result = this.handle(url);
        if (result) {
            // create single report with handler result
            await this.options.app.createReport({
                payload: toHex(stringToBytes(result)),
            });
        }
    }
}

export const createRouter = (options: RouterOptions): Router => {
    return new Router(options);
};
