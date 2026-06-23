/**
 * pnpm-workspace.yaml to allow native build of binding, and override age verification for deroll itself
 * TODO: remove age verification override once it's more stable
 */
type WorkspaceOptions = {
    bindingPackage: string;
};
export const pnpmWorkspace = (options: WorkspaceOptions) => `allowBuilds:
  '${options.bindingPackage}': true
  esbuild: true
minimumReleaseAgeExclude:
  - "@deroll/*"
  - "${options.bindingPackage}"
`;
