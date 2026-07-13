---
"@deroll/rollup": minor
"@deroll/app": patch
"@deroll/create-app": patch
---

Add `@deroll/rollup` — Node.js bindings for libcmt (migrated from `@tuler/node-libcmt`). The libcmt C source is tracked as a git submodule (`machine-guest-tools`) and compiled into a native addon (host builds use the mock-IO driver). `@deroll/app` and the `create-app` scaffolding now depend on the in-repo `@deroll/rollup` instead of the external `@tuler/node-libcmt`.
