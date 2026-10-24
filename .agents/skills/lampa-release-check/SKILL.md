---
name: lampa-release-check
description: Review Lampa release or PR readiness, verify delivery paths, CI and authorized publication. Use for an explicit release/readiness request; do not trigger a full regression or publication for every small plugin change.
---

# Lampa release readiness

Read [repository rules](../../../AGENTS.md), [TESTING](../../../docs/TESTING.md) and the affected [compatibility boundary](../../../docs/PLUGIN_COMPATIBILITY.md).

## Workflow

1. Record intended base/head, task scope, dirty work and authorization. Verify actual main/open-PR dependencies; do not merge another Issue or treat a Draft as published. Instructions here grant no push/merge permission.
2. Review the complete scoped diff for unrelated files, secrets, copied third-party notices, changed URLs, aliases and configuration. Preserve loader/custom lists and optional-plugin activation; a release must not silently enable extra plugins.
3. Reuse still-valid test evidence. Run relevant syntax/regressions and `node scripts/check-repository.mjs` for code/delivery changes. A broad release may justify the explicit full non-browser command in TESTING; documentation-only PRs do not. Confirm current-head CI; do not bypass failed checks/protection.
4. Check browser evidence only when runtime changed and evidence is insufficient, using the UI skill's normal3-scenario budget. State unresolved backend/device/player acceptance separately; do not certify physical TV from mocks.
5. Prepare a PR with problem/result, exact validation, dependencies and remaining risks. Default to Draft when requested or authorization stops at review. Stop before merge unless explicitly authorized and required checks pass.
6. Only after authorized publication, confirm actual merge ancestry/product bytes in main, applicable post-merge CI, Pages deployment and served first-party file hashes. A push/PR alone is not delivery. Update existing progress and requested Issue with confirmed evidence; close an Issue only when authorized acceptance criteria are met.

## Success criteria

A reviewable scoped PR and reproducible readiness report exist, authorization boundaries are respected, and any published artifact is verified rather than assumed. Missing checks are BLOCKED/remaining risks, not inferred success. Do not create extra release documents when PR/progress already holds the evidence.
