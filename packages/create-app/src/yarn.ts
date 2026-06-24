/**
 * .yarnrc.yml to override age verification for deroll itself
 * TODO: remove age verification override once it's more stable
 */
type RcOptions = {
    bindingPackage: string;
};
export const yarnRc = (options: RcOptions) => `enableScripts: true
npmPreapprovedPackages:
  - "@deroll/*"
  - "${options.bindingPackage}"
`;
