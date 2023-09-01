export type { App, AppOptions } from "./app";
export * from "./types";

import { App, AppImpl, AppOptions } from "./app";

export const createApp = (options: AppOptions): App => {
    return new AppImpl(options);
};
