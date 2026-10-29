# Issue #79 — Phase 6 startup evidence

## Scope and result

The confirmed plugin-side startup work was YDesign's optional TV metadata prefetch. On merged main, its 24 TMDb requests all began before the first usable Home focus in each of three controlled runs. The change now waits for the Home activity, visible focused card, and enabled native controller, then drains the same maximum of 24 candidates through a four-request queue. It does not change Home rows, their settings, Trakt data, row order, or saved visibility preferences.

The same source review found a defect in `computeRows()`: its loop referenced an undeclared `jobs` variable. With any candidate present, the existing `makeRowCall()` catch silently hid the resulting `ReferenceError`, so cached YDesign rows could fail to render. The loop now uses the already bounded candidate list directly.

This is a concrete reduction in pre-interaction background work and a row correctness fix. The three-run comparison did **not** establish a noticeable overall startup speedup: host and native app timing varied more than the measured change. Phase 6 is therefore not complete and Issue #79 stays open.

## Runtime ownership and measurements

The actual authorized Chrome tab was inspected through the existing Chrome DevTools session and restored after one Home → Details → Back smoke. The live page remained `https://siaivo.isroot.in/?component=main&source=tmdb&page=1`, 1920×937 CSS pixels, DPR 1, Hybrid `3.0.0-early-shell-phase1`, with the original `The Dog Stars` card focused. In its resource timing, `/app.min.js` ended at 440 ms, while the plugin loader request started at 2572 ms. This confirms that host delivery, rather than Hybrid CSS application alone, controls when the user's installed loader can run. The browser's active loader and preferences were not changed.

Cold comparisons used six disposable Chromium contexts, three per source version, with the same Chromium 156.0.8078.73 binary, 1920×1080 viewport, DPR 1, empty context storage/cache, real Siaivo host/core and live endpoint timing. Exact repository JS bytes were intercepted locally before host navigation. A controlled Home fixture supplied 24 TV candidates; no credentials or user Storage were copied. The loader started when the native Lampa API was available, matching the real host's API-before-plugin ordering. The main browser was not reloaded for these measurements.

Values below are milliseconds from navigation start. The outlier values are retained.

| Metric | main runs (1 / 2 / 3) | PR runs (1 / 2 / 3) | Median main → PR |
|---|---:|---:|---:|
| DOMContentLoaded | 2763 / 591 / 588 | 1003 / 527 / 563 | 591 → 563 |
| Native Lampa API available | 3246 / 1415 / 1408 | 2285 / 1010 / 1350 | 1415 → 1350 |
| Loader executed | 3271 / 1443 / 1435 | 2495 / 1036 / 1377 | 1443 → 1377 |
| Hybrid first active frame | 3340 / 1512 / 1493 | 2608 / 1099 / 1437 | 1512 → 1437 |
| Native `appready` | 5007 / 3090 / 3097 | 4487 / 2801 / 3100 | 3097 → 3100 |
| First visible Home card / usable focus | 10522 / 3785 / 3800 | 3734 / 3895 / 4530 | 3800 → 3895 |
| `appready` → usable Home | 5515 / 694 / 702 | 773 / 681 / 664 | 702 → 681 |
| First successful D-pad move | 81 / 2046 / 2036 | 69 / 51 / 241 | 2036 → 69 |
| Details ready after Enter | 897 / 345 / 330 | 662 / 706 / 693 | 345 → 693 |
| Home/focus restored after Back | 84 / 88 / 76 | 466 / 104 / 121 | 84 → 121 |

Final branch reruns were made after production commit `457b1eceb8cfd5d6fe988322ddb4b0d10da02002`; branch median navigation-to-usable-Home was 3,895 ms versus 3,800 ms on main. The branch `appready`-to-Home median was 681 ms versus 702 ms on main. This 21 ms change does not establish a noticeable improvement, and overall startup was about 96 ms slower on branch in these samples. Host delivery variance dominates. First Home DOMs had 28 cards in all six runs and similar node/style counts. Browser long-task observations and sanitized resource paths are retained in `browser-results.json`.

YDesign TV prefetch timing on the final branch rerun was:

- Main: 24/24 requests began before first usable Home in every run; observed peak concurrency 4 under the native request queue.
- Branch: no TV metadata requests were observed before Home or during the 8-second post-Home observation in any of the three final runs. The unit regression directly calls the bounded queue after focus is ready and verifies it starts four requests and drains all 24 after failures. This cold browser fixture did not demonstrate live post-Home queue execution, so that runtime behavior remains unverified in this fixture.

The initial Home source itself is host-driven. The controlled performance comparison cannot establish physical Google TV CPU, storage, or network performance, and the fixture does not represent the user's saved Home rows.

## Test results

Focused Home, Hybrid, startup, Settings, Trakt and Torrent Cinema regressions: **389/389 PASS** with:

```sh
node --test --test-timeout=15000 \
  tests/design-home-startup.cjs tests/home-history.cjs tests/home-order.cjs \
  tests/home-progress-display.cjs tests/home-trakt-progress.cjs \
  tests/hybrid-ui.cjs tests/hybrid-torrent-discovery.cjs \
  tests/ui-bootstrap.cjs tests/ui-startup-probe.cjs \
  tests/issue79-visual-owner.cjs tests/loader-critical-parallel.cjs \
  tests/settings-functional.cjs tests/settings-hub-lifecycle.cjs \
  tests/trakt-scrobble-session.cjs tests/trakt-episode-transition.cjs \
  tests/trakt-watched-sync.cjs tests/trakt-account-isolation.cjs \
  tests/torrent-overlay.cjs tests/torrents-cinema.cjs \
  tests/torrent-cinema-lifecycle.cjs tests/torrent-cinema-seasons.cjs
```

- `node --check` for all changed JavaScript: PASS.
- Repository checker (78 JavaScript files, 43 manifest entries, 565 URLs): PASS.
- `git diff --check`: PASS.
- Actual main Chrome Home → Details → Back: PASS. Enter opened native Details; Escape returned to Home and restored the focused card. Original URL, viewport, and original card focus were restored afterward.
- Readiness retry is bounded: if Home has no visible focused card or enabled native controller after at most 20 checks, optional metadata prefetch stops without starting requests; it can resume on a later Home activation.
- Search/Discover and physical Google TV: NOT TESTED. The changed code is isolated to YDesign Home rows/prefetch; those routes were not changed.
- User Trakt state, plugin settings, parser preferences, credentials, and browser Storage: not read or changed.

## Changed files and rollback

- `ui/design-optimized.js`: fix cached row computation; defer optional series metadata until Home focus is ready; bound this background queue to four in flight.
- `tests/helpers/ydesign-fixture.cjs`, `tests/design-home-startup.cjs`: deterministic regression coverage for cached rows, focus gating, queue bounds and failures.
- `audit/issue-79-phase6/startup-browser-runner.cjs`, `browser-results.json`: reproducible cold-start harness and sanitized evidence.

Rollback is a revert of the Phase 6 commit. No data migration or user-setting rollback is required. The design, loader, generated artifacts, Trakt logic, Torrent Cinema, and Settings Hub were not changed.

## Remaining Phase 6 work

The measured result does not yet satisfy the requested “noticeably faster first genuinely usable Home” criterion. Next work should isolate host/native Home card readiness from deferred plugin delivery on the same stable network path and identify a bottleneck that changes first usable Home materially without delaying Trakt/personalized rows. No physical Google TV result is claimed.
