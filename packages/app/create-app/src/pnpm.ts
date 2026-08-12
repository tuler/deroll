/**
 * pnpm-workspace.yaml to allow native build of binding, and override age verification for deroll itself
 * TODO: remove age verification override once it's more stable
 */
export const pnpmWorkspace = () => `allowBuilds:
  '@cartesi/rollup': true
  esbuild: true
minimumReleaseAgeExclude:
  - "@deroll/*"
  - "@cartesi/rollup"
`;
