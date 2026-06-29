#!/usr/bin/env bash
# Copyright Cartesi and individual authors (see AUTHORS)
# SPDX-License-Identifier: Apache-2.0
#
# End-to-end test of the linux-riscv64 prebuild inside a real Cartesi Machine.
#
# Requires: docker (with riscv64 emulation), cartesi-machine, node, wget.
#
#   test/machine/run.sh            # full run
#   SKIP_PREBUILD=1 test/machine/run.sh   # reuse existing prebuilds/linux-riscv64
#   SKIP_ROOTFS=1 test/machine/run.sh     # reuse existing work/rootfs.ext2
#
# CARTESI_MACHINE overrides how the emulator is invoked, e.g. to run it from
# the cartesi/machine-emulator docker image (all paths it receives are
# relative to the repository root):
#
#   CARTESI_MACHINE="docker run --rm -u $(id -u):$(id -g) -v $PWD:/mnt -w /mnt \
#     cartesi/machine-emulator:0.19.0 cartesi-machine" test/machine/run.sh

set -euo pipefail

cd "$(dirname "$0")/../.."
CARTESI_MACHINE=${CARTESI_MACHINE:-cartesi-machine}
WORK=test/machine/work
mkdir -p "$WORK"

LINUX_IMAGE_VERSION=v0.20.0
LINUX_VERSION=6.5.13-ctsi-1
GUEST_TOOLS_VERSION=v0.17.2

# 1. Cartesi kernel for the emulator
KERNEL="$WORK/linux-${LINUX_VERSION}-${LINUX_IMAGE_VERSION}.bin"
if [ ! -f "$KERNEL" ]; then
    echo "==> downloading Cartesi kernel"
    wget -q -O "$KERNEL" \
        "https://github.com/cartesi/machine-linux-image/releases/download/${LINUX_IMAGE_VERSION}/linux-${LINUX_VERSION}-${LINUX_IMAGE_VERSION}.bin"
fi

# 2. cross-build the linux-riscv64 prebuild (mirrors CI)
if [ -z "${SKIP_PREBUILD:-}" ]; then
    echo "==> cross-building linux-riscv64 prebuild"
    docker build --platform linux/amd64 \
        --build-arg LINUX_IMAGE_VERSION="$LINUX_IMAGE_VERSION" \
        --build-arg LINUX_VERSION="$LINUX_VERSION" \
        -f test/machine/Dockerfile.prebuild \
        --target export --output type=local,dest=prebuilds .
fi
test -d prebuilds/linux-riscv64 || { echo "missing prebuilds/linux-riscv64" >&2; exit 1; }

# 3. pack the package and stage the dapp directory (prebuild rides along in
# the tarball; --ignore-scripts skips node-gyp-build's host-side install)
if [ -z "${SKIP_ROOTFS:-}" ]; then
    echo "==> staging dapp with packed tarball"
    CONTEXT="$WORK/context"
    rm -rf "$CONTEXT"
    mkdir -p "$CONTEXT/dapp"
    TARBALL=$(npm pack --pack-destination "$WORK" | tail -1)
    npm install --prefix "$CONTEXT/dapp" --ignore-scripts --omit=dev "$WORK/$TARBALL"
    cp test/machine/app.mjs "$CONTEXT/dapp/"

    # 4. build the riscv64 rootfs and convert it to ext2
    echo "==> building riscv64 rootfs"
    docker build --platform linux/riscv64 \
        --build-arg GUEST_TOOLS_VERSION="$GUEST_TOOLS_VERSION" \
        -f test/machine/Dockerfile.rootfs \
        -t libcmt-node-machine-rootfs "$CONTEXT"
    cid=$(docker create --platform linux/riscv64 libcmt-node-machine-rootfs)
    docker export "$cid" > "$WORK/rootfs.tar"
    docker rm "$cid" > /dev/null

    echo "==> creating rootfs.ext2"
    docker run --rm -v "$PWD/$WORK":/work debian:bookworm-slim bash -c '
        set -e
        apt-get update -qq >/dev/null && apt-get install -y -qq genext2fs >/dev/null
        mkdir /rootfs && tar -xpf /work/rootfs.tar -C /rootfs
        kib=$(du -sk /rootfs | cut -f1)
        blocks=$(( kib / 4 * 3 / 2 + 16384 ))   # 4KiB blocks, 50% slack + 64MiB
        genext2fs -z -B 4096 -i 4096 -b "$blocks" -d /rootfs /work/rootfs.ext2
    '
fi

# 5. encode the advance inputs and the inspect query
echo "==> encoding inputs"
node test/machine/encode-inputs.mjs "$WORK"

# 6. boot the machine, feed the inputs, run the dapp
echo "==> running cartesi-machine"
rm -f "$WORK"/input-*-output-*.bin "$WORK"/input-*-report-*.bin "$WORK"/query-report-*.bin
# --no-rollback: snapshot/rollback (only needed to revert rejected advances
# and inspects) requires a remote machine server; this test accepts everything
$CARTESI_MACHINE \
    --no-rollback \
    --ram-image="$KERNEL" \
    --ram-length=512Mi \
    --flash-drive=label:root,filename:"$WORK/rootfs.ext2" \
    --cmio-advance-state=input:"$WORK/input-%i.bin",input_index_begin:0,input_index_end:2,output:"$WORK/input-%i-output-%o.bin",report:"$WORK/input-%i-report-%o.bin" \
    --cmio-inspect-state=query:"$WORK/query.bin",report:"$WORK/query-report-%o.bin" \
    -- node /opt/dapp/app.mjs

# 7. verify the emitted outputs against expectations
echo "==> verifying outputs"
node test/machine/verify-outputs.mjs "$WORK"
