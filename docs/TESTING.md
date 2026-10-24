# Testing with a bounded scope

Choose checks from the actual diff and risk. Do not start a full repository audit or every browser harness for an ordinary Issue. Existing CI remains mandatory even when it runs more than the locally selected tests; no CI behavior is changed by these instructions.

## Select the smallest useful level

| Change | Local verification |
| --- | --- |
| Documentation / skills only | Check changed Markdown links, skill frontmatter and `git diff --check`; no product/browser suite. Use the installed skill validator if available; do not install a dependency just for it. |
| Small JS behavior fix | `node --check path/to/changed.js`, relevant test file(s) below, whitespace. Add a regression for a demonstrated logic failure. |
| UI/runtime boundary | Same static/unit checks, then **at most3 targeted browser scenarios** for an ordinary Issue. Verify the actual changed bytes before acceptance. |
| Broad shared API/lifecycle change or release | Relevant combined regressions; full explicit non-browser suite when warranted. Extend browser coverage only for a concrete risk or explicit requirement. |

Reuse successful evidence only when the relevant source/dependency/fixture hashes and runtime assumptions still match. Record commit, command, results and evidence path. A documentation change after a product test does not require rerunning that product test. After a failure rerun the affected check after fixing its cause; preserve the distinction between harness failure and product failure.

## Focused commands (from repository root)

Node20 matches CI. Tests use built-in `node:test`; no `npm install` is required for unit tests.

| Boundary | Test files (pass to `node --test --test-timeout=15000`) |
| --- | --- |
| Trakt watched/account/cache/snapshots | `tests/trakt-watched-sync.cjs tests/trakt-account-isolation.cjs` |
| Upper TV/anime info ownership / Trakt details API | `tests/details-info.cjs` (add Trakt tests if sync/session contract changes) |
| Canonical seasons / aliases / source IDs | `tests/seasons-info.cjs` |
| Home History / actual progress and candidates | `tests/home-history.cjs` |
| Home filtering/order/profile/focus | `tests/home-order.cjs tests/home-history.cjs` |
| Parser roles/progressive results/cache/dedup | `tests/parser-providers.cjs tests/torrent-search.cjs` |
| Multilingual alias search | `tests/torrent-search.cjs` |

`node scripts/check-repository.mjs` checks JS syntax and first-party delivery paths/URLs. It is appropriate for source/delivery changes and release checks; it is broader than a Markdown-only check. `git diff --check` checks uncommitted changes; use `git diff --check BASE...HEAD` for committed PR changes.

A deliberate full **non-browser** run is:

```sh
node --test --test-timeout=15000 tests/trakt-watched-sync.cjs tests/trakt-account-isolation.cjs tests/details-info.cjs tests/seasons-info.cjs tests/home-history.cjs tests/home-order.cjs tests/parser-providers.cjs tests/torrent-search.cjs
```

Do **not** use `node --test tests/*.cjs`: that also selects browser scripts with live side effects. No dedicated Screensaver+ unit file currently exists; syntax plus a focused lifecycle runtime check is needed when its behavior changes. Do not invent a PASS from an unrelated suite.

## Runtime: only when affected

Plan up to3 observable scenarios, e.g. (1) changed UI state and native arrows/OK/Back, (2) relevant async/error/profile transition, (3) reopen/toggle/cleanup. These are focused user flows, not a way to hide a large matrix under one name. Inspect existing harness source first; several historical scripts run more checks than this budget and need a focused selection/adaptation.

- Use the existing authorized Lampa tab, commonly CDP `http://127.0.0.1:9222`; connect via `chromium.connectOverCDP` and select the known tab. Do not launch a browser/context/profile, clear data or call `browser.close()` on the user session.
- `details-info`, `seasons-info`, `home-history`, `home-order`, `parser-providers`, and `trakt-watched` browser CJS files use CDP. **Legacy `tests/header-browser.cjs` and `tests/torrent-search-browser.cjs` launch isolated Chromium**; do not run them automatically or against the user-session workflow. Inspect/adapt rather than silently adopting their launch policy. Playwright is an environment prerequisite, not a new runtime dependency.
- Check availability once. On ECONNREFUSED/EPERM/timeout/missing authorized tab, report BLOCKED and continue independent tests. Do not recreate the environment or bypass permissions. Retry only after a demonstrated environment change.
- Verify served JS hashes/commit and source URL, not merely a global version string. Test routes must deliver exact changed bytes. Isolate backend and storage mutations with fixtures; never read/log tokens or mutate real Trakt/history for test setup. Restore routes, temporary metrics and original page; preserve browser/profile.
- Assert native controller focus, component state and DOM together when moving rows/elements. No random playback. Controlled media fixtures are separate from real TorrServer/player acceptance.
- For a Stremio visual task, reuse saved `stremio-reference/` evidence; capture via an authorized existing X11 window only if needed. No Stremio settings/account changes. Do not perform X11 work for unrelated parser/docs changes.

Record PASS/FAIL/BLOCKED per scenario, actual code revision, mocks versus real backend, remaining device checks. Desktop720p/1080p/4K emulation is not physical Google TV verification. CPU/FPS/memory profiling is justified by a measured defect or explicit performance/release task, not every UI patch.

## CI already present

`.github/workflows/repository-checks.yml` runs syntax/URLs, Trakt and alias tests. `seasons-checks.yml` runs seasons/details; `parser-provider-checks.yml` runs parser/alias tests. `home-history-checks.yml` and `home-order-checks.yml` cover Home on PR/manual dispatch; main-push triggers differ. Pages deployment is separate. Check the actual head/base and run statuses rather than assuming all jobs run on every event. PR green is not post-merge green, and neither proves physical-TV behavior.
