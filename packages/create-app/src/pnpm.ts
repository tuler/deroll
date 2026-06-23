import TOML from "@iarna/toml";

/**
 * pnpm-workspace.yaml to allow native build of binding, and override age verification for deroll itself
 * TODO: remove age verification override once it's more stable
 */
export const pnpmWorkspace = TOML.stringify({
    allowBuilds: {
        "@tuler/node-libcmt": true,
        esbuild: true,
    },
    minimumReleaseAgeExclude: ["@deroll/*", "@tuler/node-libcmt"],
});
