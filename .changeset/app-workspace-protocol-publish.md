---
"@deroll/app": patch
---

Republish with a valid package.json. Versions `2.0.0-alpha.7` and `2.0.0-alpha.8` were published with unresolved `workspace:*` references to `@deroll/cmio` and `@deroll/core`, making them uninstallable. The release process now resolves `workspace:` and `catalog:` protocols to concrete versions before `changeset publish`.
