{
    "targets": [
        {
            "target_name": "cmio_shim",
            "sources": [
                "shim/shim.cc"
            ],
            "include_dirs": [
                "<!@(node -p \"require('node-addon-api').include_dir\")"
            ],
            "defines": [
                "NAPI_VERSION=8",
                "NAPI_DISABLE_CPP_EXCEPTIONS",
                "NODE_ADDON_API_DISABLE_DEPRECATED"
            ],
            "cflags": ["-O2"],
            "cflags_cc": ["-std=c++17"],
            "xcode_settings": {
                "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
                "MACOSX_DEPLOYMENT_TARGET": "11.0"
            }
        }
    ]
}
