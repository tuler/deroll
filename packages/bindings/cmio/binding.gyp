{
    "variables": {
        # Path to a libcmt source tree (machine-guest-tools/sys-utils/libcmt).
        # Defaults to the vendored submodule; override for local development:
        #   LIBCMT_DIR=/path/to/machine-guest-tools/sys-utils/libcmt npm install
        "libcmt_dir%": "<!(node -p \"process.env.LIBCMT_DIR || 'deps/machine-guest-tools/sys-utils/libcmt'\")",
        # riscv64 only: linker argument for a prebuilt libcmt static library.
        # Defaults to the one installed by the machine-guest-tools .deb.
        "libcmt_lib%": "<!(node -p \"process.env.LIBCMT_LIB || '-l:libcmt.a'\")"
    },
    "targets": [
        {
            "target_name": "libcmt",
            "sources": [
                "src/addon.cc"
            ],
            "include_dirs": [
                "<!@(node -p \"require('node-addon-api').include_dir\")",
                "<(libcmt_dir)/include"
            ],
            "defines": [
                "NAPI_VERSION=8",
                "NAPI_DISABLE_CPP_EXCEPTIONS",
                "NODE_ADDON_API_DISABLE_DEPRECATED"
            ],
            "cflags": ["-O2", "-fno-strict-aliasing", "-fno-strict-overflow"],
            "cflags_cc": ["-std=c++17"],
            "xcode_settings": {
                "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
                "MACOSX_DEPLOYMENT_TARGET": "11.0"
            },
            "conditions": [
                ["target_arch=='riscv64'", {
                    # Inside the Cartesi Machine: link the real driver build of
                    # libcmt installed by the machine-guest-tools package.
                    "libraries": ["<(libcmt_lib)"]
                }, {
                    # Host (development): compile libcmt sources with the mock
                    # IO driver directly into the addon.
                    "sources": [
                        "<(libcmt_dir)/src/abi.c",
                        "<(libcmt_dir)/src/buf.c",
                        "<(libcmt_dir)/src/keccak.c",
                        "<(libcmt_dir)/src/merkle.c",
                        "<(libcmt_dir)/src/rollup.c",
                        "<(libcmt_dir)/src/util.c",
                        "<(libcmt_dir)/src/io-mock.c"
                    ]
                }]
            ]
        }
    ]
}
