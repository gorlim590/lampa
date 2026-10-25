# Issue #35 — source rail and explicit synopsis controls

Baseline main`ffa1d41f1e78f7e8c3a3401cf319a02d8d9172d5`; branch`fix/issue-35-details-ux`. Scope follows the latest user task: width/readability, plain collapsed synopsis and native remote focus. Earlier auto-expand wording is superseded. Broader #35 ranking/title-normalizer/language/settings requests are not implemented here. No parser/TorrServer/Trakt/search logic changed; no PR#42 code imported.

## Cause and fix

Final Hybrid CSS overrode an older25vw rule with a30vw right rail, while left content separately reserved32vw. Fixed pixel-independent shared layout uses `--sh-stream-width:42%` of the **actual hero container**, plus one1.2em gap for the left column. This respects the existing side-navigation space rather than treating the entire viewport as content. Below900CSSpx the source rail stacks in flow. Grid uses minmax(0,1fr) for the title and compact metrics; full original native/Cinema title wraps normally (including more than2lines where needed), no clamp/ellipsis or metadata mutation. Row type grows from .75em to .9em, not reduced to make titles fit.

Measured in the same native fixture page:1920×1080 rail**576→768.4375CSSpx (+33.4%)**, title**15.3974→18.4769px (+20%)**. Settled3840×2160 rail**1536.9375px**, host3659.375px, no column overlap or document overflow. Initial4K snapshot was taken before native resize completed; it was superseded, not accepted as4K evidence. Temporary CDP emulation compensates the inherited browser zoom without modifying profile zoom settings, and restores metrics afterward.

Original native `.full-descr__text.selector` had native enter/click behavior; Hybrid also attached its own synopsis-modal handler. Active Hybrid now temporarily replaces only that text presentation with one plain text node, keeping the original detached node/handlers for exact restoration on theme disable. This avoids private jQuery event introspection or global CSS hiding. Only one synopsis is in the visible DOM. Text has no selector/tabindex/button role/action handler and remains selectable. The old Hybrid synopsis-modal path is removed. An explicit native-selector action owns collapsed/expanded state; **Показати більше / Показати менше**, initial collapsed per detail instance. No redundant action for missing synopsis. The action scrolls into view inside the existing action row.

Initial focus selects the **available visible enabled `.view--torrent`** action, even if it is not first, by native collectionFocus only (no enter/search). One record flag prevents later adaptations/Back from resetting a valid action focus. Modal/content controllers are not hijacked. Hidden/unavailable actions retain the visible native fallback; existing callbacks, action order and native Back are preserved.

## Tests / evidence

```sh
node --check ui/stremio-hybrid.js
node --check tests/details-ux-browser.cjs
node --test --test-timeout=15000 tests/hybrid-ui.cjs tests/details-info.cjs tests/details-cast.cjs
node scripts/check-repository.mjs
git diff --check origin/main...HEAD
node tests/details-ux-browser.cjs
# Run only changed layout / native quality-filter gates if needed:
DETAILS35_LAYOUT_ONLY=1 node tests/details-ux-browser.cjs
DETAILS35_FILTER_ONLY=1 node tests/details-ux-browser.cjs
```

**51targeted unit/regression tests PASS**, repository**62JS/455URLs PASS**, syntax/whitespace PASS. Existing seasons/details CI already includes `hybrid-ui.cjs`; no new dependency/workflow required.

Accepted browser evidence (overlapping checks, do not sum):
- `browser-ui.json`:**23PASS**, movie/ButtonsPlusOFF visible fallback, series+anime/ButtonsPlusON available Torrent focus,0parser calls merely from focus, plain collapsed text/click-no-modal, explicit OK expand/collapse/same focus, actual embedded native child+controlled parser row, complete long title, Back/media identity, missing synopsis and theme cleanup. Product localf8708d8; later runtime functions are identical, only row font grew.
- `browser-layout.json`:**9PASS**, new font, complete native raw title, actual source/filter Select OK/Down/Back, settled true1920/3840CSS bounds, latest product local1d981dc. No repeated description/player matrix.
- `browser-filters.json`:**8PASS**, native1080 selects the short release, All restores both short and long releases, Back retains actual Full owner, latest source hash. The test respects the existing180ms per-action debounce and does not assume a particular user sort/first row.
- No new JavaScript exceptions; changed Hybrid response SHA-256 equals Git blobs at the recorded product commits. Original user tab/URL/viewport/profile restored; Storage/socket writes shadowed in memory and HTTP mutations blocked. No new browser/context/profile or external scripts installed.
- `before.jpg` / `after.jpg`: same fixture/native hero, source results and1080CSS conditions, cropped to the upper83% to omit an inherited unrelated localhost preview-plugin load banner. Raw PNGs/early attempts remain untracked. This is a controlled parser/metadata fixture, **not a real torrent playback test**.

## Compatibility / remaining limits

**Confirmed pre-existing blocker, not silently fixed:** without ButtonsPlus, main's native Torrent action stays in a hidden template pool. Synopsis/fallback and the pane's own entry work, but direct initial Torrent focus is impossible when no visible action exists. PR#42 owns that movement/routing fix; it remains unmerged and was not imported. With ButtonsPlus available, actual series/anime Torrent initial focus passes. Generic focus selection and repeat/Back rules are covered by executable tests. No claim of every plugin/load-order combination.

Actual native embedded list, quality filters, source menu and Back were exercised with deterministic results. Real native Files/audio/subtitle/TorrServer/player-return acceptance remains with #14/#42 and is **NOT TESTED** here; no fake Files/player certification. Physical Google TV is **NOT TESTED**. Short descriptions and full absence use the same plain-text adapter; missing synopsis is checked, but exhaustive all-media/short-description combinations are not claimed. No FPS/memory claim or global audit.

Review this scoped PR without merging. Keep Issue#35 open for the remaining wider backlog/compatibility acceptance. Revert the PR to undo; disabling Hybrid restores the original synopsis nodes/handlers and prior design. Main and unrelated Draft#42/#29 remain unchanged.
