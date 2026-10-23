# Issue #7 account isolation / integrity — 2026-10-23

**READY FOR REVIEW** for this mocked-code/runtime scope. No main merge or issue closure authorized.

Baseline: main a33f4b1da897757ee2567f8d41e9a936f077d312, with PR #23 already merged. Existing52 tests passed. The first41 new cases reproduced34 failures before the implementation; `before-regressions.log` is intentionally a record of those expected baseline failures, not the final result.

Final implementation tests: `node --test --test-timeout=15000 tests/trakt-watched-sync.cjs tests/trakt-account-isolation.cjs` — **99 PASS**, zero failures/cancellations. Includes the existing52 and47 additional cases for account A/B in both directions, runtime/restart/logout/rotation, ownerless caches, overlapping manual/background/identity/show-progress responses, pending old requests, invalid/missing/changed snapshots, empty accounts, errors, auth listener idempotence, account-bound auto-sync and native GET compatibility/cache bypass.

`node scripts/check-repository.mjs`, JavaScript syntax checks and `git diff --check` — **PASS**. CI adds the new regression file to the existing Node20 workflow. CI/PR URLs are recorded in the Draft PR and Issue report after publication.

## Existing authorized CDP browser

`node tests/trakt-watched-browser.cjs --skip-live` — **24 PASS /0 FAIL**, JavaScript exceptions=[]; raw report: `browser-report.json`. Exact tested source commit: **07b5b5baf8ea8259a4336a0ed53e9c489bdb2170**. Later evidence/docs commits do not change these runtime sources.

The existing tab/profile on127.0.0.1:9222 is used; no new browser/context/profile or storage clearing. Temporarily fulfilled local committed sources carry the source commit header. SHA256 matches for all four loader/TraktTV/Trakt+/baseline YDesign responses are in the report. The test profile's preview-loader URL is explicitly mapped to the modified normal loader during the test; normal preview delivery is restored afterward. This is an isolated test deployment, not permanent installation of the Draft branch.

The first runtime pass had22 passing behavior checks and one failing source-origin check because its loader lived at `/preview-loader.js`; the harness mapping was corrected. Capture is also stopped before restoring the original profile so cleanup reloads cannot overwrite evidence with baseline-source hashes. The final repeated run passed all24 checks.

Native cards/YDesign marks and row registrations are exercised, partial TV/anime stays false and complete TV/anime true through the Trakt+ API. Existing YDesign display rules and local marks are intentionally unchanged. Right/OK/Back opens and returns from native details. Synthetic A→B becomes null immediately and then B's false after sync; same-owner rotation restores B cache after identity verification; invalid final snapshot preserves the previous fixture storage; a renderer reload starts unknown until B identity is released and verified. Reexecuting the plugin does not register duplicate rows. Unit tests separately confirm one auth listener per event source.

All tested Trakt/Favorite/cache operations are fixtures in memory; outbound HTTP mutation methods are blocked. Final comparison confirms real Favorite and owned caches/preferences unchanged. Fixture methods/routes are removed and the original page reloaded; the browser remains open.

## Limits / remaining risks

- No real Trakt account write, login/logout, live empty-account sample or full954/911 reconciliation was performed.
- Desktop CDP checks do not establish physical Google TV performance or playback acceptance.
- Authenticated identity uses the existing native `/users/me` endpoint, UUID first / verified slug fallback. Native transport/backend availability and future response-format changes remain real integration risks; malformed/unavailable identity fails closed as unknown.
- Rotation during a running sync may conservatively cancel that attempt and require retry after same-owner verification. No local records are removed.
- Native HTTP may finish after logical cancellation; its stale response is discarded. Fresh, same-owner cache survives an API error on disk, but the API reports null during error/loading; UI retention policy remains separate Issue #8.
- Consistently truncated but plausible HTTP200 responses cannot be fully proven complete by these array-only wrappers. Existing additive import retains local data.

Root causes, cache migration and minimum activity contract: `docs/issue-7-account-isolation.md`. Stop after #7; do not start another Issue automatically.

## Draft publication and CI

Draft PR: https://github.com/gorlim590/lampa/pull/27 . Implementation/evidence head ad620c43ee9243fcc4bca1ca2e6e0a6d354f112a. GitHub CI on Node20 confirms99PASS/0FAIL plus static/whitespace checks: https://github.com/gorlim590/lampa/actions/runs/39938617150 . Later publication-checkpoint commits affect documentation/evidence only. Main remains unchanged; Issue #7 remains open.

## Final cleanup hardening

A post-test check caught the legacy cleanup only clearing the URL hash, while Lampa v3 retains its component in the query string. Production scripts and fixture methods were already restored, but the tab remained on the fixture Activity. The harness now navigates back to the original non-fixture URL (or Main if the starting URL was already a fixture), waits for a real native Activity, and asserts no fixture global/route. The repeated complete runtime run has24PASS/0FAIL and no JavaScript exceptions, including this new24th check. Tested source commit07b5b5b has unchanged runtime code from e70cd08; only the harness cleanup/evidence changes afterward.
