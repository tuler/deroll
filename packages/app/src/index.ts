import type { App, AppOptions } from "@deroll/core";

import { NativeApp } from "./app.js";

export const createApp = (options?: AppOptions): App => {
    return new NativeApp(options);
};
