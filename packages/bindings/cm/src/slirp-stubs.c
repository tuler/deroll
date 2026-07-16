// Copyright Cartesi and individual authors (see AUTHORS)
// SPDX-License-Identifier: Apache-2.0
//
// The official libcartesi.a is built with slirp support and references a few
// libslirp symbols. They are only reached when a machine is configured with a
// virtio "net-user" device. By default the addon stubs them out so it has no
// libslirp runtime dependency; build with CARTESI_SLIRP=yes to link the real
// library instead and enable virtio net-user networking.

#include <stdio.h>
#include <stdlib.h>

static void slirp_stub_die(const char *name) {
    (void) fprintf(stderr,
        "@deroll/cm: %s called, but this build has no slirp support "
        "(rebuild with CARTESI_SLIRP=yes to enable virtio net-user)\n",
        name);
    abort();
}

void slirp_add_hostfwd(void) {
    slirp_stub_die("slirp_add_hostfwd");
}
void slirp_cleanup(void) {
    slirp_stub_die("slirp_cleanup");
}
void slirp_input(void) {
    slirp_stub_die("slirp_input");
}
void slirp_new(void) {
    slirp_stub_die("slirp_new");
}
void slirp_pollfds_fill(void) {
    slirp_stub_die("slirp_pollfds_fill");
}
void slirp_pollfds_poll(void) {
    slirp_stub_die("slirp_pollfds_poll");
}
const char *slirp_version_string(void) {
    return "none";
}
