# Issue #10: one TV/anime details section (2026-10-24)

Baseline main: 58448f644daa51b0602a0428df6ec8b2758332fc. Product commit: e03b1be333b9322cf26bf17efbf4ed167d996ec2.

## Confirmed owners and root cause

The two identical Trakt badges were created by **trakt/trakt.js**, TraktHistory.showWatchProgress, not Trakt+. Cardify legitimately has two full-start-new__rate-line anchors. jQuery .after(progressElement) against both anchors cloned the same badge. Interface+ buildInfoPanel created the middle season/episode/runtime block; its 51 of60 was an estimate of aired episodes, not watched progress. Hybrid independently appended a next-episode field. Seasons Info owns source season/episode normalization and card badges, not these upper details. YDesign does not generate these three upper blocks.

## Agreed latest scope

The user requested only confirmed Trakt counts/progress in the upper section and removal of Hybrid's season/episode counts, preserving average episode runtime. Interface+ now renders one section; native Trakt defers to its ownership and has a single-host fallback when absent. Hybrid no longer appends season totals, episode totals or next-episode numbering. Runtime and genres remain; no movie actions, ratings, cards, watched history or torrent logic changed.

Trakt+ exposes read-only detailsProgress/card and detailsSession APIs. Verified account and TMDB/Trakt show mapping precede the existing progress endpoint. Account/session keyed cache:60s,32 entries, coalesced in-flight reads;20s bounded request deadline, no retry loop; last good same-session data can survive temporary errors for the existing6h TTL. Stale responses cannot enter a different account or detached/replaced details section. No imports/Favorite/history mutations.

The progress denominator explicitly means episodes aired, NOT final total. Progress.seasons is not a complete season catalogue. For Apothecary, both live catalogues currently use one merged source season; the user confirms three broadcast seasons. We do **not** claim that merged source means one real season and do **not** hardcode a speculative3-season mapping. No total-season field is displayed. Actual episode titles from Trakt replace ambiguous absolute S1E52 badges; missing titles/numeric metadata do not produce invented coordinates. IDs/history and PR37 source normalization are untouched. This is a deliberate scope refinement, not a claim of corrected provider metadata.

## Verification

- JS syntax for4 changed product files and repository checker:PASS (62JS/454URLs).
- node --test --test-timeout=15000 tests/details-info.cjs tests/seasons-info.cjs tests/trakt-watched-sync.cjs tests/trakt-account-isolation.cjs: **131PASS/0FAIL**.
- node tests/details-info-browser.cjs: **12PASS/0FAIL**, no pageerror exceptions. Existing CDP tab only, exact7 source SHA256 hashes and product SHA verified. Top details: unauthenticated/loading/confirmed/error; refreshed52 to51; repeated opening; Breaking Bad and Attack on Titan; runtime intact. Right/Back exercised; original page/metrics restored. Fixtures used for Trakt responses with memory-only account/storage shadows; no real account mutations or playback.
- Before: audit/issue-10-details/before.png and owners-before.json. After: after-full.png and browser.json. Screenshot is the actual upper details with current active UI plugins, not just lower seasons.
- Harness corrections: runtime was23 rather than fixture expectation24; optional legacy alias was not loaded, so exact hash coverage requires only7 actually used scripts. These were harness failures, not accepted PASS. Final successful run loads e03b1be product bytes.
- Physical Google TV/older WebView, actual playback/return from player and real-account post-deployment acceptance: **not tested**, not inferred from mocks. No FPS/profiling claims. Original public source season adapter21 tests still pass; unchanged canonical/alias modules.

## Performance / remaining acceptance

No new interval or MutationObserver. One guarded renderer registration; one watched event listener, one existing Storage listener and one activity listener. Opening confirmed details adds one verified progress read (plus identity/show mapping if not cached), cache hits coalesce; previously native badge path fetched whole show history. No focus-driven network loop or poster reload. Provider metadata discrepancy still exists upstream. Keep Issue10 open for user acceptance of actual production screen; do not claim physical TV or exact three broadcast-season metadata was fixed.
