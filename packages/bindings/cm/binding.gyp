{
    "variables": {
        # Path to a machine-emulator source tree.
        # Defaults to the vendored submodule; override for local development:
        #   MACHINE_EMULATOR_DIR=/path/to/machine-emulator npm install
        "emulator_dir%": "<!(node -p \"process.env.MACHINE_EMULATOR_DIR || 'deps/machine-emulator'\")",
        # Boost headers location (header-only usage). Defaults to the system
        # include path on Linux and the Homebrew prefix on macOS. Override:
        #   BOOST_INC=/path/to/boost/include npm install
        "boost_inc%": "<!(node -p \"process.env.BOOST_INC || (process.platform === 'darwin' ? require('child_process').execSync('brew --prefix 2>/dev/null || echo /opt/homebrew').toString().trim() + '/include' : '/usr/include')\")"
    },
    "target_defaults": {
        "defines": [
            "NO_SLIRP",
            "_FILE_OFFSET_BITS=64",
            "JSON_HAS_FILESYSTEM=0",
            "NDEBUG"
        ],
        "include_dirs": [
            "gen",
            "<(emulator_dir)/src",
            "<(emulator_dir)/third-party/llvm-flang-uint128",
            "<(emulator_dir)/third-party/ankerl",
            "<(emulator_dir)/third-party/nlohmann-json",
            "<(boost_inc)"
        ],
        "cflags": [
            "-O2",
            "-fvisibility=hidden",
            "-fno-strict-aliasing",
            "-fno-strict-overflow",
            "-fno-delete-null-pointer-checks"
        ],
        "cflags_c": ["-std=gnu99"],
        "cflags_cc!": ["-std=gnu++17", "-fno-exceptions", "-fno-rtti"],
        "cflags_cc": ["-std=gnu++23", "-fexceptions", "-frtti"],
        "xcode_settings": {
            "CLANG_CXX_LANGUAGE_STANDARD": "gnu++23",
            "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
            "GCC_ENABLE_CPP_RTTI": "YES",
            "GCC_SYMBOLS_PRIVATE_EXTERN": "YES",
            "MACOSX_DEPLOYMENT_TARGET": "12.0",
            # OTHER_* flags are emitted after the flags gyp computes from the
            # GCC_/CLANG_ settings above, so they win even when node-gyp's
            # common.gypi (-fno-exceptions, -fno-rtti, -std=gnu++17) takes
            # precedence in the settings merge. libcartesi requires C++23
            # with exceptions and RTTI.
            "OTHER_CFLAGS": [
                "-O2",
                "-fno-strict-aliasing",
                "-fno-strict-overflow",
                "-fno-delete-null-pointer-checks"
            ],
            "OTHER_CPLUSPLUSFLAGS": [
                "-std=gnu++23",
                "-fexceptions",
                "-frtti",
                "-O2",
                "-fno-strict-aliasing",
                "-fno-strict-overflow",
                "-fno-delete-null-pointer-checks"
            ]
        }
    },
    "targets": [
        {
            # libcartesi + the libcartesi_jsonrpc client, compiled from the
            # machine-emulator submodule (see src/Makefile LIBCARTESI_OBJS and
            # LIBCARTESI_JSONRPC_OBJS upstream).
            "target_name": "cartesi",
            "type": "static_library",
            "sources": [
                "<(emulator_dir)/src/back-merkle-tree.cpp",
                "<(emulator_dir)/src/base64.cpp",
                "<(emulator_dir)/src/clint-address-range.cpp",
                "<(emulator_dir)/src/dtb.cpp",
                "<(emulator_dir)/src/hash-tree.cpp",
                "<(emulator_dir)/src/htif-address-range.cpp",
                "<(emulator_dir)/src/interpret.cpp",
                "<(emulator_dir)/src/is-pristine.cpp",
                "<(emulator_dir)/src/json-util.cpp",
                "<(emulator_dir)/src/jsonrpc-machine-c-api.cpp",
                "<(emulator_dir)/src/jsonrpc-machine.cpp",
                "<(emulator_dir)/src/keccak-256-hasher.cpp",
                "<(emulator_dir)/src/local-machine.cpp",
                "<(emulator_dir)/src/machine-address-ranges.cpp",
                "<(emulator_dir)/src/machine-c-api.cpp",
                "<(emulator_dir)/src/machine-config.cpp",
                "<(emulator_dir)/src/machine-console.cpp",
                "<(emulator_dir)/src/machine.cpp",
                "<(emulator_dir)/src/memory-address-range.cpp",
                "<(emulator_dir)/src/os-filesystem.cpp",
                "<(emulator_dir)/src/os-mapped-memory.cpp",
                "<(emulator_dir)/src/os.cpp",
                "<(emulator_dir)/src/plic-address-range.cpp",
                "<(emulator_dir)/src/send-cmio-response.cpp",
                "<(emulator_dir)/src/sha-256-hasher.cpp",
                "<(emulator_dir)/src/uarch-interpret.cpp",
                "<(emulator_dir)/src/uarch-pristine-state-hash.cpp",
                "<(emulator_dir)/src/uarch-reset-state.cpp",
                "<(emulator_dir)/src/uarch-step.cpp",
                "<(emulator_dir)/src/virtio-address-range.cpp",
                "<(emulator_dir)/src/virtio-console-address-range.cpp",
                "<(emulator_dir)/src/virtio-net-address-range.cpp",
                "<(emulator_dir)/src/virtio-net-tuntap-address-range.cpp",
                "<(emulator_dir)/src/virtio-net-user-address-range.cpp",
                "<(emulator_dir)/src/virtio-p9fs-address-range.cpp",
                "gen/uarch-pristine-hash.c",
                "gen/uarch-pristine-ram.c"
            ]
        },
        {
            "target_name": "cartesi_machine",
            "dependencies": ["cartesi"],
            "sources": ["src/addon.cc"],
            "include_dirs": [
                "<!@(node -p \"require('node-addon-api').include_dir\")"
            ],
            "defines": [
                "NAPI_VERSION=8",
                "NAPI_DISABLE_CPP_EXCEPTIONS",
                "NODE_ADDON_API_DISABLE_DEPRECATED"
            ]
        },
        {
            # The remote machine server spawned by cm_jsonrpc_spawn_server.
            # Looked up through the CARTESI_JSONRPC_MACHINE environment
            # variable (set by the TypeScript layer) or the PATH.
            "target_name": "cartesi-jsonrpc-machine",
            "type": "executable",
            "dependencies": ["cartesi"],
            "sources": [
                "<(emulator_dir)/src/jsonrpc-remote-machine.cpp",
                "<(emulator_dir)/src/slog.cpp",
                "gen/jsonrpc-discover.cpp"
            ],
            "libraries": ["-lpthread"],
            "conditions": [
                ["OS=='mac'", {"libraries!": ["-lpthread"]}]
            ]
        }
    ]
}
