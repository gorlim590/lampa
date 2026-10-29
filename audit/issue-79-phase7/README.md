# Issue #79 Phase 7 — startup measurements

## Status

Phase 7 is **not complete** and this branch does **not** demonstrate a faster first usable Home. The local change reduces redundant Hybrid CSS string composition during repeated readiness passes, with regression coverage. Ten interleaved cold-context comparisons did not show a user-visible startup gain; the branch was slower at the key interaction metric. No speedup is claimed.

## Confirmed critical path

A read-only observation in the existing Lampa Chrome tab showed the host's `/app.min.js` request near 0.22 s after navigation, while the installed `/lampa/loader.js` request began near 2.51 s. The Hybrid script began near 2.69 s. In that one session, loader critical work and native startup overlapped; the timestamps are a single live observation, not a representative benchmark. Siaivo's host bootstrap and extension delivery determine when its installed plugin loader is invoked. This repository controls work after `loader.js` executes, but cannot move the host's extension callback earlier without a host-side change.

In isolated runs, first visible card/focus was generally around 0.7–0.8 s after native appready. This is downstream native Home rendering and provider activity; the measured first usable point additionally waits for a successful remote-key focus move. The harness intercepts repository assets before host bootstrap, uses exact main/branch plugin source bytes, and does not emulate the user's saved rows.

## Matched experiment

- 10 alternating main/branch pairs (20 runs); same Chrome executable, 1920×1080 CSS viewport, DPR 1, real Siaivo host/native app, new isolated browser context per run, identical fixture and interception policy.
- Each context contains 24 controlled synthetic TV Favorites. This is not a copy of personal Trakt state. Public API/network timing remains variable; these are fresh context/cache runs, not controlled network-cold runs.
- Each run uses real keyboard input: ArrowRight until the card focus actually changes, Enter to open Details, Escape to return. The harness no longer sends ArrowLeft when there was no initially focused card.
- D-pad 10/10, Details 10/10, Back 10/10 on both main and branch.

| Metric (ms) | main median (range; SD) | branch median (range; SD) |
|---|---:|---:|
| Native appready | 2119 (1992–3674; 489) | 2125 (1910–2490; 199) |
| First visible card / focus candidate | 2893 (2610–4303; 459) | 2833 (2658–3197; 187) |
| First actual usable ArrowRight | 3326 (3135–4848; 479) | 3361 (3050–3702; 220) |
| ArrowRight response | 204 (191–363) | 203 (180–318) |
| Details open | 466 (355–578) | 463 (367–580) |
| Back to Home | 117 (57–380) | 151 (59–467) |

Branch first-usable median is about 35 ms slower in this sample, while first visible card is about 60 ms earlier and native appready is effectively unchanged. These differences are small relative to run variability and changing host/API conditions. The sampled `renderOwnedStyles` medians are effectively identical (18.05 ms main; 18.15 ms branch); the CSS cache produced no measurable profiler-time reduction. Individual run measurements are in [browser-results.json](browser-results.json).

## ArrowRight investigation

The initial failed manual attempt targeted a Lampa tab while it was not selected/foregrounded; the page did not move focus. Once the existing Lampa tab was selected, ArrowRight reached the Lampa document (BODY target, `items_line` controller) and changed the focused card. A temporary in-memory probe on the foreground tab recorded the focus change about 8 ms after keydown; its listener and observer were removed. The isolated harness also exposed a test race: visible/focused-card readiness can precede an actionable focused card index. It now treats first usable as an actual key-driven focus change and avoids sending a compensating Left when the starting index is -1.

In the foreground Lampa tab, Enter opened Details and the page returned to Home. The DevTools target identity changed during Back, so exact origin-card restoration in that live session is not claimed. No settings, Storage, cookies, parser state, Trakt state or history were written.

## Code change and tests

`ui/stremio-hybrid.js` caches the combined stylesheet by owner active/destroyed state and registered-module revision, invalidating when modules change. This avoids rejoining the adapter stylesheet on unchanged readiness passes and retains repair of a missing/changed DOM style. Tests cover repeated readiness calls, duplicate registration, module invalidation, enable/disable and full lifecycle.

Focused Home, Hybrid, loader, Settings, Trakt and Torrent regressions: 330/330 passed. Repository checks and Torrent Cinema artifact freshness check passed. The benchmark is fixture-only and does not verify personalized Home scenarios, Search/Discover/Settings/Torrent flows or physical Google TV.

## Remaining work

- No measurable first-usable-Home improvement; the branch is not ready to merge.
- Run representative minimal, Trakt-heavy and many-row profiles with controlled slow/failed optional providers.
- Determine whether a host-side extension delivery change is possible; it is outside this repository's current control.
- Verify exact live focus restoration and remaining Search, Discover, Settings and Torrent/Files scenarios without changing user data.
- Physical Google TV acceptance remains unverified.

Implementation source commit: `71cb119e5530d389057f4c1a555d4d98775b77f6` (based on main `284e40fbc0688bdeee1c95d864a0db070d10e49d`). The benchmark records exact source hashes in `browser-results.json`.

## Phase 7 continuation — Home rendering and focus evidence (2026-10-29)

The latest experiment supersedes the earlier fixed-delay D-pad measurement above. It uses the corrected harness that waits for a real focused-card index change, with 10 alternating matched pairs (20 runs) against merged main. Exact production script bytes were routed before host bootstrap; each run used a fresh isolated browser context, Chrome 156.0.8078.73, 1920×1080 CSS viewport, DPR 1, and 24 synthetic TV Favorite identities. Host and provider endpoints remained live; OS/network caches were not forced cold. The user's actual Home was inspected read-only and contained 7 rows and about 37–51 cards across asynchronous feed growth; no personal rows or credentials were copied into fixtures.

- Main medians: appready 2,190 ms; first visible card 2,999 ms (759 ms after appready); first actionable Home 3,495 ms (478 ms after visible card); ArrowRight response 114 ms.
- Branch medians: appready 2,297 ms; first visible card 3,012 ms (720 ms after appready); first actionable Home 3,392 ms (420 ms after visible card); ArrowRight response 86 ms.
- Paired branch-minus-main first-usable difference: −25 ms mean, SD 302 ms; approximate 95% t interval −241 to +191 ms. It crosses zero and supports no speedup claim. First-card paired difference is +9 ms (95% interval −179 to +197 ms). Home→Details and Back passed 10/10 on each revision.
- Host rendering accounted for the strongest sampled work: native `frameVisible`, `frameUpdate` and `appendChild` frames recur in the CPU sample. `frameVisible` CPU median was 55 ms main and 60 ms branch. `renderOwnedStyles` stayed about 18 ms in both. Long-task totals were 32 main versus 35 branch across the ten runs; durations overlapped (roughly 50–185 ms). Sampling is limited and does not attribute all native render cost.
- A corrected supplemental ContentRows callback probe measured one native call at 3.6 ms on main and 4.0 ms on branch; callback invocation observations were under 1 ms each. This is one run per revision, not part of the matched benchmark, and is not a meaningful bottleneck.

The production change limits watched-mark refresh work to cards whose bounding boxes intersect the viewport; offscreen cards receive current marks when focused. A 25-row/150-card regression verifies only viewport-intersecting cards are refreshed and deferred cards update on native focus. This is a bounded runtime-work improvement for refresh events, not a demonstrated first-startup optimization. Matched cold-context trials did not show a meaningful improvement, so PR #132 remains Draft and Phase 7 is not complete.

Representative smoke fixtures (single samples, not performance comparisons) passed Home focus/Details/Back for minimal Home, 18 extra rows, 700 ms slow optional metadata, failed optional metadata, and warm-return cache cases. The 18-row case contained 25 rows/157 cards. Optional metadata did not prevent initial card rendering; request timing relative to the first key action varied. Warm return retained the local metadata cache and made zero TV metadata requests in both revisions. Full per-run timings, long tasks, network counts, source hashes, and sanitized profile summaries are in `continuation-results.json`.

The existing main Chrome Lampa tab was checked read-only at its original URL and viewport. After foregrounding the tab, real ArrowRight/ArrowLeft moved and restored Home focus, Enter/Escape opened and returned from Details, and the Settings menu opened and Back returned to Home. The earlier ArrowRight no-op occurred while DevTools was targeting a non-foreground page; explicit page selection fixed it, so no product navigation defect was reproduced. Search, Discover, live Torrent Cinema/Files, physical Google TV, and personalized Trakt rows under a copied fixture were not tested. Original tab URL, viewport, user Storage and Trakt state were preserved.

**Conclusion:** no measured first-usable-Home speedup; keep the PR Draft. The native host owns most of the remaining appready-to-card rendering path, while host extension-delivery timing is outside this repository. Do not mark Issue #79 complete.
