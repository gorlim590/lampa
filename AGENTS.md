# AI agent working rules

This repository contains browser plugins for an external Lampa runtime, not the Lampa application itself. Start with the current task and relevant files; do not automatically audit the repository.

## Start and scope

- Confirm repository root (`git rev-parse --show-toplevel`), branch, dirty files and baseline SHA. Preserve unrelated work. Read the relevant Issue/comments and nearest instructions, then the latest relevant `CODEX_PROGRESS.md` entry; historical reports are evidence for their recorded commit, not proof about current main.
- Work in a task branch. Respect the current user's authorization for push/PR/merge; default to a Draft PR without merge when not authorized. Do not import another Issue's unmerged implementation merely because a report references it.
- Find the owner using the [architecture map](docs/ARCHITECTURE.md) and [compatibility notes](docs/PLUGIN_COMPATIBILITY.md). Search named files with `rg` before broad discovery. Distinguish canonical implementations, URL aliases, registered plugins and actually active scripts.
- Keep fixes local to the confirmed cause. Preserve external APIs, playback identities, Ukrainian metadata/badges, native focus/navigation, user settings and legacy URL compatibility. Do not add dependencies, wrappers, observers or documentation without a concrete need.

## Verification budget

- Follow [TESTING.md](docs/TESTING.md): static checks and focused unit tests first. Documentation-only changes need links/frontmatter/diff checks, no browser or local full product suite.
- For an ordinary Issue use **at most 3 targeted browser scenarios**, only for UI/runtime effects. Existing harnesses may contain larger suites: inspect and select/adapt the affected scenario rather than automatically running all of them. A specific failure or explicit task requirement can justify more; record why.
- Reuse a passing result when the relevant code, dependencies and environment are unchanged; record its SHA, command and evidence. Rerun failed/affected tests after a fix, not unrelated successful tests. Full regression is for broad shared changes or release preparation.
- Check an unavailable browser once; record `BLOCKED` with the actual error and continue independent checks. Retry only after evidence that the environment changed. No new profile, browser/context launch, storage/cookie clearing or closing the user's browser. Verify changed JS bytes/hash and commit before claiming runtime PASS.
- Label PASS/FAIL/BLOCKED honestly. Mocks are not real backend acceptance; desktop Chromium is not physical Google TV performance. Never bypass CI/branch protections to meet a budget.

## Data and performance

- Never read/output credentials, embed secrets, alter real Trakt data for tests, erase histories or migrate account data implicitly. Use isolated mock data; inspect scripts before execution. Preserve profile/account boundaries and reject stale async responses.
- Reuse native Lampa components/controllers. Prefer lifecycle events, bounded caches and coalesced requests; cleanup listeners/timers/observers. Avoid focus-driven network requests, global `Storage.get` overrides, permanent DOM scanning and costly animation/blur without evidence.
- At a stable checkpoint update the existing progress file with baseline/head, changed files, tests/evidence, limitations and next step. Do not create another parallel progress report. Include only scoped files in commits.

## Task-specific skills

Read only the relevant skill; do not preload all three:

- [lampa-plugin-development](.agents/skills/lampa-plugin-development/SKILL.md): change plugin behavior or fix a regression.
- [lampa-ui-testing](.agents/skills/lampa-ui-testing/SKILL.md): verify UI/runtime changes with native navigation.
- [lampa-release-check](.agents/skills/lampa-release-check/SKILL.md): review release readiness, delivery and authorized publication.

Claude Code uses the short `CLAUDE.md` import. Other agents can read these Markdown skills directly; automatic discovery depends on the client. Machine-specific paths/tools belong in local instructions, not portable repository rules.
