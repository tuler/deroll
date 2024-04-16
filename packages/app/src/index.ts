import { App } from "@deroll/core";
export type { HttpAppOptions as AppOptions } from "./app";

import { HttpApp, HttpAppOptions } from "./app";

export const createApp = (options: HttpAppOptions): App => {
    return new HttpApp(options);
};
