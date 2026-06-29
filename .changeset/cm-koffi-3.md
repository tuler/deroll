---
"@deroll/cm": minor
---

Upgrade koffi from 2.x to 3.x. koffi 3 ships its native engine as platform-specific subpackages (`@koromix/koffi-<platform>`) pulled in via optionalDependencies, and represents pointers as BigInt. cm's FFI usage — `koffi.load`, opaque types, C-prototype function declarations and `_Out_` parameters — is unchanged, so there is no change to cm's public API.
