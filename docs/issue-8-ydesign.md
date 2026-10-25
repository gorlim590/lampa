# Issue #8 — vertical YDesign and Trakt-only status

Baseline: main `fcc148f88257daab6ce56681c51ecc7903274d94`. Scope follows the updated «Узгоджений скорочений обсяг перевірок» section in #8. This is a Draft for review; no merge or Issue closure.

## Changes and causes

- YDesign3.4 renders only vertical cards. Removed horizontal-only settings/render/CSS/description metadata requests, including Hybrid's obsolete horizontal selector. Two legacy orientation keys/classes are migration-only; other preferences survive. Catalog rows still scroll horizontally and Hybrid hero/details are unchanged.
- Ambient screen layer and all its defaults/settings/state/focus/retries/CSS are removed. Old stored value is ignored. Poster color sampling and inner gradients remain useful.
- Previously local Favorite/History/Timeline thresholds and a last-episode shortcut could mark a title watched independently of Trakt. Now only verified Trakt+ confirmation controls YDesign dim/check/notch. Progress/Continue Watching remain local and separate.
- TraktPlus.watchedStatus now includes verified `owner`, `session`, `mediaType`, `tmdbId` in addition to existing value/phase/updatedAt. This minimal #7 API extension does not change full-show completion logic. Legacy providers without identity metadata return unknown safely.
- Presentation cache `ydesign_trakt_status_v1` is bounded to3 accounts ×1500 content records, keyed by verified owner/media type/TMDB ID. Same-account pending/error retains the last confirmed boolean; missing/unverified owner/plugin/mapping is unknown. Older confirmations/session changes cannot overwrite new state. No local records are deleted.
- WH API error objects previously became false-positive UA badges; the actual public response is `{play: HTTPS_URL}`. Strict parsing and typed versioned cache/in-flight dedup distinguish true/false/unknown, with7d positive and12h negative TTL; transport/errors aren't cached. Full #22 is not included.
- Fixed mismatched extended metadata read/write keys and permanent memory hits bypassing TTL. Unified v8 cache and in-flight dedup; stale detached/replaced card responses are ignored. Genres/age/slogan/logo/TV episode metadata render on first open.
- Actual Hybrid body class governs shell ownership, including live on/off and either CSS order. YDesign keeps content; its own scale/lift/glow/outer dimensions/animations/blur rules apply only without Hybrid. Font remains because Hybrid does not supply a replacement. Font/style nodes are reused; reduced-motion disables card effects.
- Permanent400ms series polling and body-wide observer replaced with relevant Activity discovery, async container discovery/rebind and cleanup.1000ms fallback exists only while episode cards exist. Idempotent timeline writes avoid self-generated work. State-change updates coalesce; cache writes/color/focus changes don't trigger all-card metadata work. Home metadata warmup is bounded to24 candidates and active Home.
- Final smoke reproduced first-open ratings waiting for external icon preloads. Removed the gate and redundant preload timers: values render immediately; failed images become readable labels. This justified one focused rerun, with3 regression cases.

## Validation

Final exact runtime product source commit: **`1e0ae2423d7eeb95acd87ef97757979f39b89923`**.

Commands:

```
node --test tests/ydesign.cjs tests/trakt-watched-sync.cjs tests/trakt-account-isolation.cjs
node scripts/check-repository.mjs
git diff --check
node tests/ydesign-browser.cjs --final
```

- **164/164 unit/regression PASS** (63 YDesign +101 Trakt). Owner isolation, pending/error/unknown/restart, missing plugin/mapping, stale data, complete/partial/failed Trakt snapshots, orientation migration, cache/UA/in-flight behavior and scoped lifecycle are isolated mocks, not real-account testing.
- Repository syntax/links PASS:58 JS,449 URLs/first-party paths. Whitespace PASS.
- **26/26 existing-Chromium CDP checks PASS**, exceptions `[]`. Exact SHA256/commit headers verified for YDesign, Trakt+ and Hybrid, including profile's Hybrid delivery alias. Vertical movie/TV/anime content/strict UA/no Ambient; Hybrid on/off/focus/reduced motion; migration; Trakt false vs local95%, confirmed change/error retention/account replacement; native directional focus; episode progress70%/reset/OK/Back;3 Activity round trips.
- Each synthetic provider episode mount had **1 observer/1 progress interval**, each return to Home **0/0**, with native focus retained. This verifies lifecycle without a new profiling system. It is not a full leak/performance proof.
- Earlier720p/1080p/4K desktop sizing results are reused; no full matrix rerun. Earlier baseline/candidate methods differ; no claimed speed/FPS/memory improvement. Detailed profiling is waived by the updated scope.
- Browser uses native Lampa cards/Activity/controller with synthetic Trakt/metadata/provider DOM and in-memory owned settings. HTTP mutations blocked. No real Trakt writes, profile reset/new context, browser close or persisted settings changes. Final cleanup returned native Main with no fixture globals.

Evidence: [final runtime](../audit/issue-8/final-runtime.json), [unit log](../audit/issue-8/unit-final.log), [repository log](../audit/issue-8/repository-final.log), [cards screenshot](../audit/issue-8/final.png), [episodes screenshot](../audit/issue-8/final-episodes.png). Earlier failed smoke is retained in final-before-rating-fix.json, explicitly superseded.

## Limits / acceptance

- **Physical Google TV: untested, user acceptance required.** Desktop viewport checks do not prove TV performance.
- Real provider/player playback/return and live authenticated account synchronization are not exercised. Synthetic episode DOM verifies YDesign integration and native controller dispatch, not a specific BWA/online backend.
- Full load-order/all-plugin/all-preset/screen matrix and new performance baselines were intentionally omitted under the agreed reduced scope; no arbitrary compatibility/performance claims.
- `tv-status.js` is present in the test profile and provides production status, not watched truth. `poster-status.js` was reviewed as production status/type labeling; its optional full load-order combinations were not run. No unnecessary changes to either plugin or #9.
- A legacy Trakt+ without verified owner context deliberately yields unknown; deploy loader's coordinated Trakt+ and YDesign versions together. Missing identity/authentication cannot safely reuse an owner cache.
- Existing episode metadata may fall back to show/season fields when provider/TMDB episode data is absent; broader rating/provider corrections are outside this reduced #8 change. Reformatting the same provider DOM node across unrelated episodes without native rebuild deserves provider-specific testing; normal stale card responses and detach cleanup are guarded.

## Delivery and rollback

Feature branch `fix/issue-8-ydesign-vertical`; Draft PR targets main. Do not merge automatically or close #8. Logical commits5435b97/f58d52f/b165190/e86964f/1e0ae24 retain rollback points; final documentation/evidence commits do not change runtime source.

Disable Hybrid using its existing switch to restore standalone vertical YDesign. To roll back YDesign changes, restore the previous coordinated loader/Trakt+/YDesign sources from baseline in a separate reviewed revert. Legacy preferences and local history/progress are retained; clearing localStorage is neither necessary nor permitted.
