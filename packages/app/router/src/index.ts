import type { InspectRequest, Rollup } from "@cartesi/rollup";
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

export class Router {
    // biome-ignore lint/suspicious/noExplicitAny: router type
    private routes: Route<any>[];

    constructor() {
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

    /**
     * Answers an inspect query, reporting the matched route's result.
     *
     * Returns whether a route matched, so the router composes with `chain`: an
     * unmatched query falls through to the next handler. The rollup parameter
     * is narrowed to what this actually uses, which keeps it satisfiable by a
     * plain object in tests — `Rollup` itself carries a `#private` brand.
     */
    public handler(
        request: InspectRequest,
        rollup: Pick<Rollup, "emitReport">,
    ): boolean {
        const url = bytesToString(request.payload);
        const result = this.handle(url);
        if (result === undefined) {
            return false;
        }

        // create single report with handler result
        rollup.emitReport(stringToHex(result));
        return true;
    }
}

export const createRouter = (): Router => {
    return new Router();
};
