import type { PackageManager } from "./index.js";

const buildBlocks = {
    yarn: `COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build`,
    npm: `COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile
COPY . .
RUN npm run build`,
    pnpm: `RUN corepack enable pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build`,
};

type DockerfileOptions = {
    aptSnapshot?: string;
    nodeVersion: string;
    packageManager: PackageManager;
};

export const dockerfile = (options: DockerfileOptions): string => {
    const { nodeVersion, packageManager } = options;
    const aptSnapshot = options.aptSnapshot ?? "20260415T030400Z";
    const buildBlock = buildBlocks[packageManager];

    const dockerfile = `# syntax=docker.io/docker/dockerfile:1

# This enforces that the packages downloaded from the repositories are the same
# for the defined date, no matter when the image is built.
ARG APT_UPDATE_SNAPSHOT=${aptSnapshot}
ARG MACHINE_GUEST_TOOLS_VERSION=0.17.2
ARG MACHINE_GUEST_TOOLS_SHA256SUM=c077573dbcf0cdc146adf14b480bfe454ca63aa4d3e8408c5487f550a5b77a41

################################################################################
# riscv64 base stage
FROM --platform=linux/riscv64 cartesi/node:${nodeVersion}-noble-slim AS base

ARG APT_UPDATE_SNAPSHOT
ARG DEBIAN_FRONTEND=noninteractive
RUN <<EOF
set -eu
apt-get update
apt-get install -y --no-install-recommends ca-certificates
apt-get update --snapshot=\${APT_UPDATE_SNAPSHOT}
apt-get remove -y --purge ca-certificates
apt-get autoremove -y --purge
EOF

################################################################################
# build stage: includes resources necessary for installing dependencies

# Here the image's platform does not necessarily have to be riscv64.
# If any needed dependencies rely on native binaries, you must use
# a riscv64 image such as cartesi/node:20-jammy for the build stage,
# to ensure that the appropriate binaries will be generated.
FROM --platform=$BUILDPLATFORM node:${nodeVersion}-trixie AS build-stage

WORKDIR /opt/cartesi/dapp

${buildBlock}

# Assemble the runtime root: the JS bundle plus the native addon, which cannot
# be inlined by esbuild and must ship as files next to the bundle. We also copy
# its loader (node-gyp-build); node-addon-api is build-only and not needed here.
# \`cp -RL\` dereferences pnpm's store symlinks into real files. The package ships
# prebuilds for every platform, so we keep only linux-riscv64 to shrink the image.
RUN <<EOF
set -eu
mkdir -p rootfs/node_modules/@tuler
cp dist/index.js rootfs/index.js
cp -RL node_modules/@tuler/node-libcmt rootfs/node_modules/@tuler/node-libcmt
cp -RL node_modules/.pnpm/node-gyp-build@*/node_modules/node-gyp-build rootfs/node_modules/node-gyp-build
find rootfs/node_modules/@tuler/node-libcmt/prebuilds -mindepth 1 -maxdepth 1 \
  -type d ! -name linux-riscv64 -exec rm -rf {} +
EOF

################################################################################
# runtime stage: produces final image that will be executed

# Here the image's platform MUST be linux/riscv64.
# Give preference to small base images, which lead to better start-up
# performance when loading the Cartesi Machine.
FROM base

ARG MACHINE_GUEST_TOOLS_VERSION
ARG MACHINE_GUEST_TOOLS_SHA256SUM
ADD --checksum=sha256:\${MACHINE_GUEST_TOOLS_SHA256SUM} \
  https://github.com/cartesi/machine-guest-tools/releases/download/v\${MACHINE_GUEST_TOOLS_VERSION}/machine-guest-tools_riscv64.deb \
  /tmp/machine-guest-tools_riscv64.deb

ARG DEBIAN_FRONTEND=noninteractive
RUN <<EOF
set -e
apt-get install -y --no-install-recommends \
  busybox-static \
  /tmp/machine-guest-tools_riscv64.deb

rm /tmp/machine-guest-tools_riscv64.deb
rm -rf /var/lib/apt/lists/* /var/log/* /var/cache/*
EOF

ENV PATH="/opt/cartesi/bin:\${PATH}"

WORKDIR /opt/cartesi/dapp
COPY --from=build-stage /opt/cartesi/dapp/rootfs .

ENTRYPOINT ["node"]
CMD ["index.js"]
`;
    return dockerfile;
};
