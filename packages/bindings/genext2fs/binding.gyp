{
    "variables": {
        # Neither vendored project can be built the way its own build system
        # builds it (autotools for xgenext2fs, autotools/cmake for libarchive),
        # so the translation units that matter are compiled directly here and
        # the generated config.h files are replaced by the hand-written ones
        # under config/.
        "genext2fs_dir": "deps/genext2fs",
        "libarchive_dir": "deps/libarchive/libarchive",
    },
    "targets": [
        {
            "target_name": "genext2fs",
            "sources": [
                "src/addon.cc",
                "src/xgenext2fs_lib.c",
                "src/libarchive_formats.c",
                # Read-only tar support out of libarchive, and nothing else: no
                # writers, no other formats, no decompression filters
                # (compressed input is inflated in JS). Keeping the list this
                # short is what makes a dependency-free static build possible.
                "<(libarchive_dir)/archive_acl.c",
                "<(libarchive_dir)/archive_check_magic.c",
                "<(libarchive_dir)/archive_entry.c",
                "<(libarchive_dir)/archive_entry_copy_stat.c",
                "<(libarchive_dir)/archive_entry_sparse.c",
                "<(libarchive_dir)/archive_entry_stat.c",
                "<(libarchive_dir)/archive_entry_xattr.c",
                "<(libarchive_dir)/archive_read.c",
                "<(libarchive_dir)/archive_read_add_passphrase.c",
                "<(libarchive_dir)/archive_read_open_file.c",
                "<(libarchive_dir)/archive_read_support_filter_none.c",
                "<(libarchive_dir)/archive_read_support_format_tar.c",
                "<(libarchive_dir)/archive_string.c",
                "<(libarchive_dir)/archive_string_sprintf.c",
                "<(libarchive_dir)/archive_util.c",
                "<(libarchive_dir)/archive_virtual.c",
            ],
            "include_dirs": [
                "<!@(node -p \"require('node-addon-api').include_dir\")",
                "src",
                # xgenext2fs.c does `#include <config.h>`
                "config/genext2fs",
                # libarchive is pointed at config/libarchive-config.h below
                "config",
                "<(genext2fs_dir)",
                "<(libarchive_dir)",
            ],
            "defines": [
                "NAPI_VERSION=8",
                "NAPI_DISABLE_CPP_EXCEPTIONS",
                "NODE_ADDON_API_DISABLE_DEPRECATED",
                "HAVE_CONFIG_H",
                # makes archive_platform.h skip the generated config.h
                "PLATFORM_CONFIG_H=\"libarchive-config.h\"",
            ],
            "cflags": ["-O2", "-fno-strict-aliasing"],
            # The C here is all upstream, and both projects build with warnings
            # we are in no position to fix; silence the ones they emit so a
            # genuine problem in our own code stands out.
            "cflags_c": [
                "-std=gnu99",
                "-Wno-implicit-fallthrough",
                "-Wno-maybe-uninitialized",
                "-Wno-sign-compare",
                "-Wno-stringop-truncation",
                "-Wno-unused-function",
                "-Wno-unused-result",
                "-Wno-unused-variable",
            ],
            "cflags_cc": ["-std=c++17"],
            "xcode_settings": {
                "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
                "GCC_C_LANGUAGE_STANDARD": "gnu99",
                "MACOSX_DEPLOYMENT_TARGET": "11.0",
                "WARNING_CFLAGS": [
                    "-Wno-deprecated-declarations",
                    "-Wno-sign-compare",
                    "-Wno-unknown-warning-option",
                    "-Wno-unused-function",
                    "-Wno-unused-result",
                    "-Wno-unused-variable",
                ],
            },
            "conditions": [
                ["OS=='linux'", {
                    # glibc/musl hide getline(3), getdelim(3) and friends behind
                    # the GNU feature test macro
                    "defines": ["_GNU_SOURCE"],
                }],
                ["OS=='mac'", {
                    # Darwin's iconv(3) lives outside libc
                    "libraries": ["-liconv"],
                }],
            ],
        },
    ],
}
