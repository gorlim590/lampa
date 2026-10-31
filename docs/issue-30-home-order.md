# Issue #30 — Home cleanup and row order

Status: implemented for the verified native TMDB/CUB Home builders; review/physical-device acceptance pending. This is a stacked change on Draft #32 (Issue #25), not a copy of #25 into main. Main baseline: `fcc148f88257daab6ce56681c51ecc7903274d94`; dependency head: `434b35a5b8996dbba4c00346b70e96f15657bb66`. Draft #29 stays separate and unmerged.

## One Home integration point

`plugins-to-enable/home-history.js` owns the existing ContentRows boundary and native activity/append lifecycle. The built-in `loader.js` loads `home-policy.js` then `home-history.js` automatically; neither needs a separate extension registration. The helper has no independent listeners, polling, observers or Home API fetches.

The native registry does not expose previously registered row objects. We therefore identify native callbacks by exact whitespace-normalized source from the actual deployed app, not title/icon/TMDB poster source. Evidence: `audit/issue-30/core-builders.json`, app URL and SHA256 included. Future unknown core versions fail open: preserve unknown callbacks rather than delete potentially unrelated plugin content. A new native app version may require updating the reviewed signatures.

Before the native Home executor runs, the marked Home callback array is filtered. This also catches core genre/person/keyword work appended after `ContentRows.call`. Non-Home arrays are untouched. Existing Home may rebuild once on initial activation to retire previously created native rows; already-issued requests cannot be cancelled retroactively. Reordering never rebuilds Home or fetches recommendations.

## Producer inventory / action

| Technical row/builder | Producer | Action / reason |
|---|---|---|
| `core:tmdb:movie/now_playing` | native TMDB Home | Hide before execution; cinema recommendations |
| `core:tmdb:trending/movie/day`, `trending/movie/week` | native TMDB Home | Hide; daily/weekly trends |
| `core:tmdb:movie/upcoming` | native TMDB Home | Hide; upcoming releases |
| `core:tmdb:movie/popular`, `trending/tv/week` | native TMDB Home | Hide; fire-icon movie/TV popularity |
| `core:tmdb:movie/top_rated`, `tv/top_rated` | native TMDB Home | Hide; top movies/TV |
| `core:tmdb:discover/movie?with_genres=` | native TMDB Home | Hide; generated genre recommendations |
| `core:tmdb:builder-65740c249aa5`, `builder-dd55f4e44543` | native Api.partPersons / partKeywords | Hide; actor/keyword recommendation generators and their requests |
| `core:cub:?sort=now_playing`, `?sort=latest` | native CUB Home | Hide; cinema/latest |
| `core:cub:top/fire/movie`, `top/hundred/movie`, `top/hundred/tv` | native CUB Home | Hide; popularity/top100 |
| `core:cub:?cat=`, `?sort=top&genre=` | native CUB Home | Hide; UHD/genre recommendations |
| `core:cub:builder-329afe2c458f` | native CUB Home | Hide; added trailers recommendations |
| `core:native:init$19`, `core:native:add$2` (two branches) | native Favorite/Continue registry | Replaced by #25's independent confirmed-history rows |
| `TraktPlusTrend_*`, `TraktPlusGenre_*`, `TraktPlusDoramas`, `TraktPlusBecause`, `TraktPlusGems`, other `def.name` | Trakt+ | Keep; explicit stable producer ID added at lineFor, independent of TMDB metadata |
| Native Trakt `config.name` rows | TraktTV plugin | Keep; attachOnMore adds stable ID to both cached and fresh payloads |
| `home_history_resume`, `home_history_watched` | home-history / #25 | Keep; reuse existing native progress / confirmed Trakt watched contract |
| `ydesign_week` | YDesign | Keep; plugin-specific existing `ydesign_row=week` marker |
| `ydesign_continue` | YDesign | Existing #25 producer guard yields to Home History; no new YDesign edits |
| Future ContentRows registration with `row.name` | third-party plugin | Keep and annotate with its registration ID; title-identical “Top movies” is retained |
| Preloaded unknown row without stable producer metadata | third-party / unknown | Keep at its existing anchor; show read-only in editor until producer supplies ID; never persist a guessed title/URL ID |
| `community/new-category.js` SourceTMDB replacement | third-party source override | Unchanged. Its own similar-looking recommendations are plugin-owned, not native callback matches |
| Studio Picks / TMDB Networks / Nightingale | third-party | Not removed or reconfigured. No direct ContentRows registration found in these repository files; no claim about external variants |

No third-party row is automatically removed. Possible later consolidation of the weekly YDesign row or new-category recommendations requires separate user review; outside #30.

## Manual order / navigation / persistence

Lampa Settings → **Головна сторінка → Порядок рядків Home**. Native Select supports OK, Up/Down, move higher/lower, direct position, Done and Back. Each confirmed move saves automatically; reset is available in both the editor and Settings.

Native Storage key: `home_history_order_v1:<Timeline.filename()>`, schema `{v:1,ids:[...]}`. This uses the existing active profile namespace; no token/account data or localized names are saved. Editor actions capture the profile and reject stale actions after profile changes. Missing row IDs remain in saved order. New stable IDs append predictably (technical-ID order after saved entries). Unknown or duplicate-ID rows remain visible but uneditable. Reset returns to the session's native permitted order; without a custom order, Continue Watching is third among sortable rows, subject to fixed unknown anchors. Explicit custom order supersedes the older Hybrid third-slot rule.

Ordering moves existing native row nodes, reorders `component.items`, retains selected row object and updates `active`/owned scroll. Card objects, posters, row controllers and playback handlers are reused. Detached placeholders/different parents cause a safe deferred reorder, never deletion/desynchronization. Hybrid delegates to this coordinator only while the policy is actually ready; otherwise its previous behavior remains.

## Targeted checks

- `node --test --test-timeout=15000 tests/home-history.cjs tests/home-order.cjs`: **43 PASS / 0 FAIL** (30 history +13 policy). Includes all22 captured native callback signatures; execution is prevented before callbacks; non-Home preserved, title collisions, registered-plugin provenance, persistent/missing/new/profile rows, native state/DOM identity, reset and TV Select actions.
- Changed JavaScript syntax checks, `node scripts/check-repository.mjs`: **PASS**,60 JS files /450 URLs. `git diff --check`: **PASS**.
- Existing Chromium CDP, `node tests/home-order-browser.cjs`: **11 PASS / 0 FAIL**, no JS exceptions. Exact six source SHA256 + commit response headers verified at product commit `bb1a45acf5ac53d97dcdfc46c3bb1c242e35aa29`.
- Actual native TMDB Main + actual Trakt+ producer code with synthetic API reads: two Trakt rows, two History rows and title-identical third-party row remain;11 native recommendation/generator signatures suppressed. Native Select keyboard reorder, Back/arrows, node/selection preservation, late row append lifecycle, Hybrid off/on, real page restart restoring native saved setting all passed.
- Measured reorder: **0 additional Trakt API calls**, same row/node identities. Policy itself adds **0 timers /0 observers /0 network requests**. Existing #25 refresh debounce retained. No FPS/memory improvement claimed; no broad profiling done.
- First harness attempt reached5 passing checks but used an invalid synthetic append event after key timing, producing a harness evaluate exception. Evidence retained in `browser-before-harness-fix.json`; corrected timing + actual append lifecycle pass are in `browser.json`. No product changes were needed. Follow-up targeted rerun verified the genuine append hook and DOM order.

Browser fixture replaces Storage methods only inside the isolated test page to prevent real writes; product code does not replace Storage.get. Real Trakt, user lists, auth, profiles and playback were not mutated; tab restored without closing Chromium. Screenshot `audit/issue-30/home-order-final.png` contains synthetic content. Tests do not establish physical Google TV performance or live backend behavior.

## Remaining acceptance / rollback

- Review and merge #25 first; then retarget this stacked PR to main. No main merge performed.
- Publish both sibling files together, update optional extension URL cache/version, restart Lampa once. Draft PR URL is not a deployed plugin.
- Physical Google TV: verify native Settings editor, arrows/OK/Back and scroll on device. Live account/feed variants and future changed core fingerprints remain unverified.
- Unknown preloaded plugins without stable IDs remain fixed/read-only rather than being guessed or deleted. They can opt in using `home_row_id` metadata or re-register after the coordinator.
- Disable the single home-history extension and reload to restore previous native Home behavior. Saved order keys are inert and histories/settings remain intact. Revert #30 commits to retain #25 history-only behavior.
