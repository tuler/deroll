import { App } from "@deroll/core";
export type { HttpAppOptions as AppOptions } from "./app";

import { HttpApp, HttpAppOptions } from "./app";

/**
 * Creates a new Cartesi application.
 * 
 * @param {HttpAppOptions} options - Configuration object.
 * @param {string} options.url - URL of the rollup HTTP server.
 * @param {boolean} [options.broadcastAdvanceRequests=false] - Whether to broadcast advance requests. Default is `false`.
 * 
 * @returns {App} App instance.
 * 
 * @example
 * import { createApp } from "@deroll/app";
 * 
 * const app = createApp({
 *   url: process.env.ROLLUP_HTTP_SERVER || "http://127.0.0.1:5004",
 * });
 * 
 * app.start();
 */
export const createApp = (options: HttpAppOptions): App => {
    return new HttpApp(options);
};