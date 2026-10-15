#!/usr/bin/env bash
# Regenerates test/fixtures/sequencer-vectors.json from the sequencer's own Rust
# types (sequencer-core at SEQUENCER_REV). The vectors must come from the same
# ethereum_ssz, alloy and k256 versions the scheduler runs, so the fixturegen
# lockfile is checked against the sequencer's lockfile at that revision.
set -euo pipefail
cd "$(dirname "$0")/.."
SEQUENCER_REV=8a7c914fe32a81391f42252d8e81a93cb962d570
gen_lock=scripts/fixturegen/Cargo.lock
seq_lock=$(mktemp)
trap 'rm -f "$seq_lock"' EXIT
curl -fsSL "https://raw.githubusercontent.com/cartesi/sequencer/$SEQUENCER_REV/Cargo.lock" -o "$seq_lock"
versions() {
    grep -A1 "^name = \"$1\"$" "$2" | sed -n 's/^version = "\(.*\)"/\1/p' | sort | tr '\n' ' '
}
for crate in ethereum_ssz ethereum_ssz_derive alloy-primitives alloy-sol-types k256; do
    want=$(versions "$crate" "$seq_lock")
    got=$(versions "$crate" "$gen_lock")
    if [[ "$want" != "$got" ]]; then
        echo "$crate: sequencer has $want, fixturegen has $got; update $gen_lock" >&2
        exit 1
    fi
done
cargo run --quiet --release --locked --manifest-path scripts/fixturegen/Cargo.toml \
    > test/fixtures/sequencer-vectors.json
bunx biome format --write test/fixtures/sequencer-vectors.json
