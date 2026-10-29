# Issue #79 Phase 5 — single presentation owner checkpoint

This is a scoped implementation checkpoint on the current `main` containing PR #129. It does not resolve Issue #79: physical Google TV acceptance and several functional pages remain outstanding. The final acceptance status is intentionally **Draft / not ready for merge**.

## Confirmed problem and ownership

The host-delivery boundary remains: Lampa cannot be styled by an extension before the host delivers that extension. The loader already has a UI-first path, so this change does not claim to remove a pre-delivery native paint or an application restart.

Once the UI scripts arrive, several presentation modules independently inserted styles. Hybrid already owns the shell, but YDesign created its own card and font style tags, Cardify+ appended another global style tag, and Interface+ could still install a selected global theme. This made presentation ordering depend on separate injections and left multiple owners for overlapping visual regions.

The boundary implemented here is:

| Region / responsibility | Owner after this change | Compatibility behavior |
| --- | --- | --- |
| Hybrid shell, design tokens, header, left navigation, shared cards/details/overlay/settings presentation | `ui/stremio-hybrid.js` | One stable `#stremio-hybrid-style`; disabled Hybrid leaves native fallback available. |
| YDesign poster data, badges, settings and native behavior | `ui/design-optimized.js` | Its two CSS blocks register with Hybrid when available; standalone mode retains the previous style tags. |
| Cardify+ Details template, rating/data behavior and settings | `ui/cardify-plus.js` | Existing CSS is registered with Hybrid when available; the original standalone `<style>` behavior remains when Hybrid is absent. |
| Interface+ functional/settings and selected standalone theme | `ui/interface-plus.js` | Its global theme yields while Hybrid owns the theme and returns when Hybrid is disabled. Other native integrations remain in Interface+. |
| Native player, Files, torrent and episode behavior | Existing Lampa / Torrent Cinema owners | Not migrated or replaced by this phase. |

The deferred presentation modules are not concatenated into one blocking bundle. Loader critical UI scripts now start downloading together; dynamic script execution remains ordered (`async = false`) and the loader advances only after all three complete or fail through their existing bounded callbacks.

## Implementation

- Added a small CSS registry to Hybrid. Module CSS is composed into one versioned style element, duplicate registrations do not rewrite it, removals update the same element, and destroy/disable retains the native fallback.
- Routed YDesign card/font CSS and Cardify+ CSS through that owner, including adoption for the Hybrid-late load order.
- Added Interface+ theme ownership handoff and standalone restoration.
- Changed the three critical UI scripts from serial download/execute to parallel download with ordered execution.
- Added lifecycle, owner, fallback and loader-order regression tests.

## Verification

**Focused automated checks:** 72/72 PASS across Hybrid/bootstrap, header, Cardify singleton, owner registry, critical loader, focus owner and startup-probe tests. `tests/settings-functional.cjs`: 10/10 PASS. `node scripts/check-repository.mjs`: PASS (78 JS files, 43 manifest entries, 563 URLs). Changed-file syntax and `git diff --check`: PASS.

**Existing main Chrome, actual Lampa runtime:** The untouched original Lampa tab remained open. A duplicate Home tab in the same Chrome profile was used for the reversible preview. The exact working-tree `ui/stremio-hybrid.js` bytes were evaluated in that initialized Lampa page after the previous Hybrid instance's `destroy()`; the page was then reloaded back to the main-delivered runtime. The active Cardify CSS bytes were moved through the new registry in-place to exercise the owner contract; the browser already had the older Cardify module loaded, so this is not claimed as direct delivery of the changed Cardify+ script. No saved settings, account data, parser settings, or credentials were changed.

- Actual DPR-1 browser renders were captured at 1280×720, 1920×1080, and 3840×2160. Image dimensions were checked from the saved JPEG headers. The 4K screenshot is independently rendered at that viewport, not an upscaled 1080p capture.
- At all three viewports, `document.body.scrollWidth/scrollHeight` matched the viewport, the active controller stayed `items_line`, and the screenshot showed stable Home layout/focus. At 720p, actual `ArrowRight` and `ArrowLeft` moved to the adjacent card and restored the original card focus.
- On that same branch-injected Hybrid runtime, actual `Enter` opened a native movie Details activity and `Escape` returned to Home with `items_line` and the prior card focused.
- The Hybrid runtime reported exactly one `#stremio-hybrid-style`, three registered style modules (YDesign cards/font and Cardify+), and one initialization. No page reload was used to install the branch code; the tab was restored by navigating the duplicate tab back to its original Home URL and clearing viewport emulation.
- Screenshots: [1280×720](screenshots/hybrid-1280x720.jpg), [1920×1080](screenshots/hybrid-1920x1080.jpg), [3840×2160](screenshots/hybrid-3840x2160.jpg).

**Not verified:** cold-start performance of the final loader on branch bytes, three comparable before/after first-usable runs, standalone browser rendering, Search/Discover/Settings/Details/Torrent/Files journeys, repeated lifecycle growth, and physical Google TV. Prior main-browser cache-bypass observations were not a sufficient matched before/after set; the new Hybrid was installed only after Lampa had already started. The observed source timing shows host delivery and native startup take materially longer than the local Hybrid shell insertion, but no speedup is claimed from that non-comparable injection sample.

## Rollback

Revert the scoped changes in `loader.js`, `ui/stremio-hybrid.js`, `ui/interface-plus.js`, `ui/design-optimized.js`, and `ui/cardify-plus.js`, plus the associated tests and audit. No storage migration or user setting changes are required. If Hybrid is disabled or fails, each adapter keeps its standalone CSS path.

## Remaining Issue #79 work

Capture three comparable cold/warm startup samples with exact branch assets, identify the host/native Home readiness boundary, and test Home → Details → Back, Search, Discover, Settings, Torrent Cinema/Files and focus at desktop sizes. Physical Google TV and remote acceptance are still required. Do not close Issue #79 based on this checkpoint.

## Phase 5 stabilization addendum — 2026-10-29

### Lifecycle and CI

- `repository-checks.yml` now runs `tests/issue79-visual-owner.cjs`, `tests/loader-critical-parallel.cjs` and `tests/settings-functional.cjs`; existing checks remain in place.
- The full entrypoint fixture exercises Hybrid ON → OFF → ON, destroy to standalone CSS, restart/adoption, duplicate registration, stale-version registry migration, style deduplication and preservation of YDesign/Cardify adapter rules.
- The loader fixture now exercises independent fast/slow responses, a failed sibling, bounded timeout, a late script load and delayed native `appready`. Dynamic critical scripts remain `async=false` in declaration order.
- `tests/ydesign-browser.cjs` was inspected and run with a temporary `playwright-core` compatibility alias. It fails before touching a page because it hardcodes CDP `127.0.0.1:9222`, which returns `ECONNREFUSED` in this environment. The authorized main Chrome is exposed through Chrome DevTools MCP instead. This is an environment prerequisite mismatch, not evidence of a YDesign regression.

### Main Chrome test using the exact branch assets

The existing selected Lampa Home tab in the authorized main Chrome was used. The original Details tab was left untouched. A loopback preview served the branch `loader.js`, Hybrid, Interface+, YDesign and Cardify+ bytes. The page already had the host loader running, so the first injected copy correctly no-op'd; for the reversible preview, only the in-memory `LampaLoaderStarted` flag was reset, and the deferred list was set on a window global (no `Lampa.Storage` call). The local loader then reported **4 requested / 4 loaded / 0 failed / 0 timed out** (three critical UI assets plus one explicitly selected deferred Cardify+ asset). Hybrid advanced from the host-delivered 3.0.0 instance to branch 3.1.0. One canonical `#stremio-hybrid-style` remained; YDesign card/font CSS was registered. Cardify+ was already initialized by the host, so its branch registration was covered by the runtime fixture and not independently established in the browser.

Actual remote-key sequence passed: ArrowRight moved to the adjacent Home card, Enter opened native Details, Escape returned to Home and restored focus to the originating card. Three additional Home → Details → Back cycles each returned to Home; after the cycles one native Activity remained active and one canonical stylesheet remained. The page's card feed continued growing during these cycles, so raw DOM totals are not treated as a comparable listener/leak measurement.

The live Hybrid `destroy()` path removed its canonical style and body class while restoring YDesign's standalone card/font style elements; loading the exact branch Hybrid script again adopted those elements into one canonical style. The browser viewport was checked at CSS 1280×720, 1920×1080 and 3840×2160, DPR 1. Three independently rendered PNG screenshots are in `screenshots/phase5-browser/`. The 4K screenshot is a 3840×2160 raster capture, not an upscaled 1080p image. The browser was returned to its original Home URL and 1920×937 CSS viewport; after reload the branch preview globals and scripts were absent and the host Hybrid 3.0.0 was back. No saved settings, credentials, extension registration, Trakt history or parser configuration were changed.

This live pass covers Home, focus, Details, Back, one canonical stylesheet, destroy/fallback/restart and desktop viewport rendering. Search, Discover, opening Settings, Torrent Cinema/Files and physical Google TV were not exercised in the main profile. Their functional regressions are covered by focused source tests, but browser acceptance for those journeys remains open.

### Performance boundary

No valid before/after cold-start delta is claimed. The direct Chrome preview necessarily began after the native app was ready. A separate Chromium harness reached native `appready` in roughly 3.9–4.7 seconds but did not successfully inject either loader revision before host bootstrap, and Home cards were absent in that harness; those runs are rejected as invalid A/B evidence. In the direct branch preview, Hybrid applied its shell about 9 ms after its own script start and completed the critical lane after 4/4 local assets loaded, but that warm injection is not comparable to cold startup. The PR's confirmed performance change is bounded parallel request start for the three critical UI files while preserving ordered execution; no device-class startup improvement is claimed. Google TV style-recalculation cost remains unmeasured.

### Verification on the worktree before push

- Focused UI/loader/Settings/Home/Trakt/Torrent regression set: **494/494 PASS**.
- `node scripts/check-repository.mjs`: **PASS** (78 JavaScript files, 43 manifest entries, 563 URLs).
- Changed-file `node --check` and `git diff --check`: **PASS**.
- All five GitHub Actions passed on pushed SHA `2d3dbf5f336522a497a28dca418a9e7afb7456e9` (Repository checks, Home history, Home order, Parsers and Seasons). The Repository checks log confirms `issue79-visual-owner.cjs` and `loader-critical-parallel.cjs` ran in an 80/80 passing UI step, and `settings-functional.cjs` ran in a 70/70 passing Settings step.

**Verdict:** keep PR #130 Draft. The style lifecycle and loader failure paths are covered and the main-browser UI smoke passed. Cold-start A/B performance, live Settings/Search/Discover/Torrent/Files acceptance, post-push Actions, and physical Google TV remain outstanding.
