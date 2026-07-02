---
"@deroll/explorer": minor
---

follow the rollups-node 2.0.0-alpha.12 JSON-RPC API: applications now report `enabled` + `status` (OK/FAILED/DIVERGED/CORRUPTED) instead of `state`, carry a withdrawal config, foreclosure lifecycle fields and three new sync checkpoints; epochs gain `staged_at_block` and the CLAIM_STAGED/CLAIM_FORECLOSED statuses; inputs gain REPORTS_LIMIT_EXCEEDED. Adds a Withdrawals tab (list + per-account detail) for post-foreclosure withdrawal events, and Withdrawal config / Foreclosure sections on the application overview
