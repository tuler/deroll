/**
 * bunfig.toml to override age verification for deroll itself
 * TODO: remove age verification override once it's more stable
 */
export const bunfig = () => `[install]
minimumReleaseAgeExcludes = ["@deroll/*", "@cartesi/rollup"]
`;
