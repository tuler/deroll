import type { PackageManager } from "./index.js";

export const gitIgnore = (packageManager: PackageManager) => {
    return `.cartesi
/dist
/node_modules

${
    packageManager === "yarn"
        ? `
# Yarn 4 (PnP, not zero-install): commit config + editor SDKs, ignore everything
# \`yarn install\` regenerates (cache, unplugged, install state, the PnP resolver).
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/sdks
!.yarn/versions
.pnp.*
`
        : ""
}`;
};

export const dockerIgnore = (packageManager: PackageManager) => {
    return `.cartesi
/dist
/node_modules

${
    packageManager === "yarn"
        ? `# Let the build stage regenerate PnP artifacts; the host's reference local
# global-cache paths that don't exist in the image.
/.yarn
.pnp.*
`
        : ""
}
`;
};
