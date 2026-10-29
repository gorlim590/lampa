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
