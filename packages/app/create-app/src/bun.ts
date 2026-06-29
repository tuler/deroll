/**
 * bunfig.toml to override age verification for deroll itself
 * TODO: remove age verification override once it's more stable
 */
type ConfigOptions = {
    bindingPackage: string;
};
export const bunfig = (options: ConfigOptions) => `[install]
minimumReleaseAgeExcludes = ["@deroll/*", "${options.bindingPackage}"]
`;
