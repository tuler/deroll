{
    "variables": {
        # The addon links against the static libraries of an installed
        # cartesi-machine emulator distribution (the official .deb packages on
        # Linux, the cartesi-machine-emulator brew formula on macOS).
        # scripts/find-cartesi.cjs probes the standard locations; override
        # with the CARTESI_INC / CARTESI_LIB environment variables.
        "cartesi_inc%": "<!(node scripts/find-cartesi.cjs include)",
        "cartesi_lib%": "<!(node scripts/find-cartesi.cjs lib)",
        # libcartesi.a references libslirp (virtio net-user networking). By
        # default those symbols are stubbed out so the addon has no libslirp
        # dependency; set CARTESI_SLIRP=yes to link the real library.
        "cartesi_slirp%": "<!(node -p \"process.env.CARTESI_SLIRP || 'no'\")"
    },
    "targets": [
        {
            "target_name": "cartesi_machine",
            "sources": ["src/addon.cc"],
            "include_dirs": [
                "<!@(node -p \"require('node-addon-api').include_dir\")",
                "<(cartesi_inc)"
            ],
            "defines": [
                "NAPI_VERSION=8",
                "NAPI_DISABLE_CPP_EXCEPTIONS",
                "NODE_ADDON_API_DISABLE_DEPRECATED"
            ],
            "libraries": [
                "<(cartesi_lib)/libcartesi_jsonrpc.a",
                "<(cartesi_lib)/libcartesi.a"
            ],
            "conditions": [
                ["cartesi_slirp=='yes'", {
                    # brew/system libslirp lives next to libcartesi.a
                    "libraries": ["-L<(cartesi_lib)", "-lslirp"]
                }, {
                    "sources": ["src/slirp-stubs.c"]
                }],
                ["OS=='linux'", {
                    # libcartesi.a is built with OpenMP
                    "ldflags": ["-fopenmp"]
                }],
                ["OS=='mac'", {
                    "xcode_settings": {
                        "MACOSX_DEPLOYMENT_TARGET": "12.0",
                        # brew's libomp is keg-only; empty when not installed
                        "OTHER_LDFLAGS": ["<!@(node scripts/find-cartesi.cjs omp)"]
                    }
                }]
            ]
        }
    ]
}
