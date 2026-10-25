# Issue #21 — neutral header and native Ukrainian clock

Implemented on main baseline `ee40032cd3564a4f3ecd263cf55638e3a1e1524a`, product commit `786a47f0eff4b28bb12ab3b79cb48beb4352a642`.

## Confirmed causes and scope

- Current main already contains the earlier Hybrid clock relocation (11de4f3); the old Issue audit predates its publication. Reused it rather than building another clock.
- Actual deployed core + current repository plugins produced a computed header `rgb(21,17,39)`, exactly Hybrid's `--sh-header:#151127`. Its movie-specific rule changed this to transparent, exposing the underlying page/backdrop. Native core `.head` has no background of its own, so purple-leaning Interface themes (Twitch/AMOLED etc.) can also show through without Hybrid. No header inline style was present in the inspected runtime.
- Interface+ theme selectors affect body, focus controls and panels; YDesign has no header background rule. Cardify+ owns only the intentional `.head.nodisplay` trailer transition, not a header color. Neither owner needed edits. Torrents Cinema uses a dark gradient on the same header; the scoped opaque neutral header remains readable without changing its visibility/controller ownership.
- Native clock uses a negative top margin, a .9 line-height on the large time and 1 on date/weekday. Hybrid shrank the time separately, added another gap, capped the group at 16vw and hid weekdays. Its absolutely positioned search could collide with a wider localized date.

## Changes

- `ui/interface-plus.js`: one idempotent static `ifx_header_css` style installed immediately when the plugin loads. Neutral opaque `#15171c` header with light foreground, centered native time/date group, tabular time digits, consistent line-height and spacing. No per-route style replacement or DOM relocation added.
- `ui/stremio-hybrid.js` 2.7.1: same neutral header on Home/details; restore the native weekday, remove the clock's width cap, align typography, and keep search in the existing flex flow beside clock/profile. Existing clock/controller nodes and reversible relocation remain unchanged.
- `loader.js`: cache version `20261023-header-21`, preserving plugin order/default enablement; its existing version regression is updated.
- `tests/header-browser.cjs`: repeatable isolated Chromium pass using actual native UI and exact modified source bytes, with synthetic read-only metadata.

Native `Utils.time` already uses the app's translated `day_*`/`month_*_e` labels and a 60-second timer with native cleanup. No locale override, second clock, new product listener, timer, observer, storage patch or layout measurement loop was introduced. The test uses actual Ukrainian translations for a deliberately long Monday/November label; it does not change the user's clock/timezone or claim to test November's real calendar time. Body themes, card styles, Trakt state and focus accents remain owned by their existing plugins.

## Verification and independent diff review

- Repository JavaScript syntax/path validation: PASS (60 JS); changed browser CJS syntax and whitespace PASS.
- Existing Trakt sync/account/loader tests: 99 PASS / 0 FAIL. Loader version change is exercised, default order retained.
- Browser: **24 PASS / 0 FAIL**, JS exceptions `[]`, relevant failed network requests `[]`. Source SHA256/commit headers match all seven requested files, including actual changed Interface+, Hybrid and loader. Product commit is recorded in `audit/issue-21/browser.json`.
- Native Home, Full details, Settings and catalog; arrows/Back, catalog active selection/scroll; Twitch/AMOLED/default; Hybrid off/on and reload. 1920x1080 plus 1280x720 and 3840x2160, including native clock at 1280. Long Ukrainian weekday/date geometry has no clipping or overlap. Eight-frame samples after route/theme changes and reload retain the neutral header; this is bounded flicker evidence, not an exhaustive frame/performance claim.
- Same native clock node after disable/re-enable, one shared style/profile, zero clock DOM mutations over 2.2 seconds. No per-second writes added; the existing native minute ticker remains authoritative.
- Complete production diff reviewed: header selectors do not match full-start headers/cards, and no Trakt/history/provider logic changes. Shared rule specificity beats native background and normal inline styles; Hybrid's more-specific Home/movie selectors now deliberately agree with it. Interface theme reordering cannot reintroduce a transparent header. Cardify's intentional trailer hiding remains intact.
- PR29 overlap: both UI patches apply cleanly by 3-way dry-run to `d5d32ac`; that PR and its branch remain untouched. No unrelated feature/issue work, secrets or user configuration included.
- Initial harness attempts were not acceptance passes: startup screenshot could precede welcome dismissal, an invalid `discuss.results` fixture was replaced with the core's actual `discuss.result`, and Settings/Search APIs were corrected from source inspection. Superseded JSON is labelled separately; final report/screenshots are authoritative. No additional production fix was needed after the first product commit.

Screenshots: [Home](../audit/issue-21/home-1920.png), [details](../audit/issue-21/details.png), [720p](../audit/issue-21/header-1280.png), [4K](../audit/issue-21/header-3840.png), [native / Hybrid off](../audit/issue-21/native.png). Baseline computed styles: [baseline.json](../audit/issue-21/baseline.json). [Final browser evidence](../audit/issue-21/browser.json).

## Delivery and limits

Required PR checks must pass on the latest head before normal GitHub merge. Main CI/Pages and publication hashes are verified after merge and linked in Issue #21's final result.

After publication, refresh/restart Lampa so the updated loader uses its new cache version. If loader itself is cached, update its existing extension URL query to `?v=20261023-header-21`. If using optional Hybrid directly, update its existing URL query too; the normal loader does not enable Hybrid. Direct Interface+ users should refresh its existing URL similarly. Do not add duplicate extension entries or clear user data.

Physical Google TV Streamer 4K, older TV WebViews and arbitrary external theme combinations have not been run. On device, check Home/details/Settings/catalog, Ukrainian weekday/date, arrows/OK/Back and scrolling at the configured scale. Browser tests use isolated metadata and no authenticated backend or playback. No speed/FPS claim; no physical acceptance claim. Physical verification is a remaining platform limitation, not represented as a browser PASS.
