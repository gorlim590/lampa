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
