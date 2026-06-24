import type { PackageManager } from "./index.js";

const buildBlocks = {
    npm: `COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage the runtime files: the JS bundle plus @tuler/node-libcmt's native addon,
# which esbuild cannot inline and must be required at runtime. npm's flat layout
# keeps the addon and its node-gyp-build loader as real dirs at the top level, so
# copy both next to the bundle.

RUN mkdir -p rootfs/node_modules/@tuler \\
 && cp dist/index.js rootfs/index.js \\
 && cp -R node_modules/@tuler/node-libcmt rootfs/node_modules/@tuler/ \\
 && cp -R node_modules/node-gyp-build rootfs/node_modules/node-gyp-build`,

    pnpm: `RUN corepack enable pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# Stage the runtime files: the JS bundle plus @tuler/node-libcmt's native addon,
# which esbuild cannot inline and must be required at runtime. \`cp -RL\` flattens
# pnpm's self-contained store dir for the addon into a real node_modules (the
# addon, its node-gyp-build loader, and node-addon-api).
RUN mkdir -p rootfs \\
 && cp dist/index.js rootfs/index.js \\
 && cp -RL node_modules/.pnpm/@tuler+node-libcmt@*/node_modules rootfs/node_modules
`,

    yarn: `RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable
COPY . .
RUN yarn build

# Stage the runtime files for Yarn PnP: the JS bundle, the .pnp.cjs resolver, and
# the only two packages required at runtime (@tuler/node-libcmt's native addon and
# its node-gyp-build loader). Both are "unplugged" — real dirs under .yarn/unplugged
# that .pnp.cjs resolves by relative path — so no node_modules or zip cache ships.
RUN mkdir -p rootfs/.yarn/unplugged \\
 && cp dist/index.js rootfs/index.js \\
 && cp .pnp.cjs rootfs/.pnp.cjs \\
 && cp -R .yarn/unplugged/@tuler-node-libcmt-* .yarn/unplugged/node-gyp-build-* rootfs/.yarn/unplugged/
`,

    bun: `COPY package.json bun.lock ./
RUN bun ci
COPY . .
RUN bun run build

# Stage the runtime files: the JS bundle plus @tuler/node-libcmt's native addon,
# which esbuild cannot inline and must be required at runtime. npm's flat layout
# keeps the addon and its node-gyp-build loader as real dirs at the top level, so
# copy both next to the bundle.

RUN mkdir -p rootfs/node_modules/@tuler \\
 && cp dist/index.js rootfs/index.js \\
 && cp -R node_modules/@tuler/node-libcmt rootfs/node_modules/@tuler/ \\
 && cp -R node_modules/node-gyp-build rootfs/node_modules/node-gyp-build`,
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

    const buildImage =
        packageManager === "bun" ? `oven:bun:1` : `node:${nodeVersion}-trixie`;

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
FROM --platform=$BUILDPLATFORM ${buildImage} AS build-stage

WORKDIR /opt/cartesi/dapp

${buildBlock}

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
