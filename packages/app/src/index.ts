export type { App, AppOptions } from "./dapp";
export * from "./types";

import { App, AppImpl, AppOptions } from "./dapp";

export const createApp = (options: AppOptions): App => {
    return new AppImpl(options);
};
