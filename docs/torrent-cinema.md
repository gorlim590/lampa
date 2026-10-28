# Torrent Cinema 2.0 — ownership and migration (#117)

## Stabilization follow-up (latest-main audit)

This follow-up is based on `origin/main` `901eef3cf0ff96dc89013812e4867820319602c4`, after #119–#123. It does not include unfinished #120 multi-parser work. The implementation branch is `fix/torrent-cinema-stabilization`.

### Confirmed source causes

- Torrent Cinema's owned overlay used z-index 100 and its Select styling had no layer. A broad `body:has(> .sh-torrent-overlay:not([hidden])) > .modal` rule forced every native modal to 110, changing unrelated plugin/native dialogs while still failing to own standalone native Loading surfaces.
- The navigation adapter flattened header/filter/row controls and relied on `offsetParent`; it did not navigate in logical groups or scroll offscreen targets into view. Controller transitions could also refocus the torrent surface while a native Select was in its close callback.
- The Sort and Other Trackers Select paths immediately reactivated the stream controller on close. Native Select closes/restores its previous controller and invokes `onBack` synchronously, so that reactivation competed with native ownership. Native Filters/Search used a similar path.
- `style.css` contained an accidental JavaScript `css += \`` fragment in the stylesheet source.

These are confirmed by source inspection of the current branch and upstream Lampa Select/Modal/Loading/Torrent/Controller implementations. The configured CDP endpoint was reachable, but its sole tab was `https://siaivo.isroot.in` without `window.Lampa` or Torrent Cinema. No live Lampa interaction or deployed UI reproduction was possible; runtime cause confirmation remains pending.

### Changes and layer contract

The runtime now tags native surfaces only while they belong to an active Torrent Cinema transition. Layers are scoped to those surfaces: Torrent Cinema 100, native Select 120, native Torrent/Files modal 130, native Loading 140, Search/keyboard 145 and player/error dialog 150. The broad body-wide modal override is removed. Surface tags and observers are released with the owning lifecycle.

Navigation is grouped into header, quality, tracker, native settings/filter and torrent rows. Horizontal movement stays within a group; vertical movement crosses adjacent groups, scrolls targets into view and skips hidden/disabled controls. Native Select ownership is held through its close callback and exact return focus is restored after it closes. Torrent selection continues to use the native Torrent/Files/player path and rearms the one-shot Torrent.back callback per selection.

### Reproducible acceptance matrix

`node tests/torrent-cinema-browser.cjs` runs Hybrid integration; add `--standalone` for direct canonical delivery. Both use the existing authorized Lampa tab, exact local artifact routing, a controlled parser fixture, actual native Lampa Select/Files/Loading/Torrent and controllers, and controlled TorrServer transport. The runner reports menu hit-testing, controller owner, geometry, source hashes, exceptions and blocked writes under `audit/torrent-cinema/`.

| Scenario | Fixture/check | Current result |
| --- | --- | --- |
| Source and artifact | `node scripts/build-torrent-cinema.mjs --check`; build-freshness test | PASS |
| Native Select menus | Other Trackers, Sort and Filters/Search opened by remote OK; DOM hit-test and Select controller | Browser runner added; NOT RUN (no Lampa tab) |
| D-pad groups | Start on first torrent; traverse controls using only arrow keys; verify focused selector and viewport | Browser runner added; NOT RUN |
| Torrent → Files → loading → player | Native row OK and Files selection; loading/menu hit-test; playback boundary | Browser runner added; NOT RUN |
| Transport outcomes | Delayed, 503 failure and cancelled preload; error visibility and Back/focus restoration | Browser runner added; NOT RUN |
| Repeated Back/open | Native return callback and controller restoration over repeated selections | Unit lifecycle fixtures PASS; browser runner NOT RUN |
| Layout/install modes | Hybrid and standalone, 1280×720, 1920×1080, 3840×2160, plus 1920×1080 DPR 2 | Existing runner supports these; this branch NOT RUN |
| Filters and ranking | Quality, UA-only, Toloka, Mazepa, Other, sort priorities and Best Choice | Existing focused tests PASS; native interaction NOT RUN |

Focused checks on this branch: 72/72 pass across torrent overlay, inline UI, lifecycle, torrent ranking and Hybrid suites. Browser runner/fixture syntax, `git diff --check` and exact artifact freshness pass. These results do not replace the unrun browser matrix. Physical Google TV, real parser providers, real TorrServer, media playback/tracks and Trakt/Details regression acceptance remain unverified.

### Evidence, limitations and rollback

Before/after source evidence: before, native modal elevation was global and native Loading had no Torrent Cinema ownership; after, only transition-owned nodes receive scoped layer classes. Before, navigation used a flat list and Select callbacks could reactivate the stream; after, logical group movement and Select transition ownership are explicit. The runner captures actual DOM ancestry, computed z-index, `elementFromPoint`, controller and focus data when run against Lampa. No new live screenshots/logs are claimed from this branch because the connected tab is not Lampa. Existing #117 screenshots are historical and are not evidence for this fix.

Known limitation: dynamic tagging depends on native Lampa surface classes and current Lampa events; the exact installed production build still needs the real-tab matrix. Rollback this follow-up by reverting its single stabilization commit (or the draft branch) and restoring the prior `ui/torrent-cinema.js` artifact; do not revert unrelated #117 or #120 work. Do not merge or deploy until the real-tab matrix is run and reviewed.

Baseline: clean `main` f60132b1502e678e81c85d3a4087d23ccac711ff. Task branch: `feat/issue-117-torrent-cinema`. The issue initially had no comments; the owner subsequently added [the visual reference](https://github.com/gorlim590/lampa/issues/117#issuecomment-6469301500). Owner corrections: omit the expanded-row right-hand Files button; use a restrained purple focus instead of acidic violet. Open PR #107 changes Settings Hub; it is not imported. Main already contains the relevant #14/#76/#79 integrations. The other local #73 checkout is dirty and is left untouched.

## Dependency map recorded before implementation

| Feature/contract | Baseline owner and callers | Decision / compatibility | Evidence to retain |
| --- | --- | --- | --- |
| Install/delivery | Hybrid imports `ui/torrent-overlay.js`; managed catalog lists `torrents-redesign.js`; loader imports Hybrid | One `ui/torrent-cinema.js` artifact, built offline from internal factories. Old URLs become deduplicated aliases. Hybrid requests the canonical entry, never a second presentation owner. | Delivery/duplicate-load tests, exact routed browser hashes |
| `TorrentsRedesign` parsing, normalization, matching, score, tracker/sort/pin APIs | Redesign; Hybrid rows and palette; unit fixtures | Move used implementations without changing algorithms; keep same public API object as compatibility surface. | Existing `torrents-cinema.cjs`, parser/search regressions |
| `TorrentsRedesign.palette`, `contrastText` | Hybrid Details branding, old standalone branding | Preserve shared pure helpers; remove standalone image acquisition and background jobs. | Existing color contracts; Hybrid integration |
| `LampaTorrentOverlay` create/key/session/coverage/releaseView/decorate | Overlay; Hybrid child/cache/rows | Canonical presentation owns these APIs; alias references the same object. Raw titles and transport remain intact. | Overlay identity, focus/scroll, normalization tests |
| Native child, `sh_movie_streams` controller, route interception, TTL4-entry cache | Hybrid stream block; matching Details Torrent action; native `Component.create('torrents')` | Move adapter into canonical plugin, independently attach to native Full. Preserve one native child, native handlers, search and Files. Hybrid keeps global Details/rating navigation only. | Async/profile/title isolation, Files one-shot Back, native controllers |
| `.sh-streams`, `.ctr-row`, `.sh-cinema-select`, `.sh-files-modal` CSS | Hybrid plus Overlay plus Redesign | One canonical stylesheet; replace duplicate row rules with single-column rows and optional inline details. Preserve scoped native Select/Files skins. | Geometry/screenshots at three CSS viewports |
| `.explorer.ctr`, `torrent_cinema` controller, poster/info/actions/background/trailer/watchlist UI | Redesign standalone mount/activity/render/scroll/resize/parser hooks | Retire custom decoration/controller, not the native `torrents` component/route. Standalone exclusive Watchlist writes, observers and background requests are eliminated. | No legacy mount/hook/style, native fallback and child tests |
| Files IMDb and metadata request budget | Redesign `attachFiles`, `torrent_file`, visibility observer, bounded requests/cache; Hybrid file still/rating/studio adapter | Move only required functions/listeners into canonical lifecycle. Preserve typed identity checks, lazy request budget, episode verification, cancellation. | Existing file identity/rating tests; native Files fixture |
| Providers/aliases/ranking | `providers/parsers.js`, `providers/torrent-search.js`, native Parser; metadata score helpers | Unchanged; one pipeline. Toloka then Mazepa preference, no new search, parser, player or TorrServer implementation. | Existing focused provider/search checks |
| Settings | `torrents_cinema_*`, SettingsApi component; Hub maps owner URL | Keep functional stable keys/defaults; obsolete standalone-only controls no longer registered. Old values remain untouched for rollback; no migration/reset. Hub points to canonical URL. | Settings registration, disable/re-enable, unchanged keys |
| Lifecycle | Three startup guards; Hybrid stream listeners plus Redesign anonymous listeners/observers | One idempotent canonical guard and named subscription registry; disable/destroy releases owned nodes/handlers/requests/styles/wrappers. Re-enable reinstalls once. | Duplicate load, repeated reopen/toggle, listener and style counts |
| Remote/Back | Hybrid native controller, `Torrent.back`, Overlay origin and scroll snapshots | Keep main-row OK native, add explicit info control; Back collapses details before overlay; menus/Files retain native ownership. | Actual existing-tab controller scenario, no real playback |

## Boundaries

Parser/search relevance and metadata interpretation stay with #76; native Files/player/TorrServer proof stays with #14. No Buttons+ dependency: move the original Torrent button out of the native hidden pool with its handlers, restore it during teardown. Global theme/settings navigation stays with #79/#73. No Trakt/history/account/TorrServer configuration writes are part of this change.

Browser baselines use controlled release responses inside the real Lampa Full/native torrent component, not an HTML imitation. They are fixture evidence, not provider or physical Google TV acceptance. Script hashes, geometry, screenshots and comparable measurements live in `audit/torrent-cinema/`. Browser zoom must be accounted for: CDP output dimensions alone are not evidence of CSS viewport or DPR.


## Installation and build

Canonical entry: <https://gorlim590.github.io/lampa/ui/torrent-cinema.js>. Install this one address for an independent Torrent Cinema; Hybrid loads it automatically. A source branch or Draft PR is not published to Pages. For a branch preview, the focused harness routes exact local bytes in the existing test tab. No TV build step or runtime package dependency.

Build/check offline: `node scripts/build-torrent-cinema.mjs` / `node scripts/build-torrent-cinema.mjs --check`. Edit `ui/torrent-cinema/{metadata,view,runtime,entry}.js` and `style.css`; commit the generated artifact. Internal factories are inert source modules, not separately installable plugins.

Existing installations may keep either legacy URL temporarily; both are tiny aliases and deduplicate a pending canonical request. Prefer replacing the exact legacy torrent presentation entries with the canonical URL and reload, preserving all unrelated extensions. Do not install both aliases manually. No automated extension-list rewrite or Storage migration occurs.

Main-row OK retains the native release → Files/selection contract. Right moves to the explicit info control; OK on info expands/collapses inline technical details. Back collapses details first, then closes the overlay and restores Details focus/scroll. There is **no Files button in expanded details**, per the latest owner instruction. Native Files/player/TorrServer routing remains with core/#14.

## Settings and rollback

Retained keys: `torrents_cinema_enabled`, `quality`, `auto`, `ua`, `ua_audio`, `ua_subs`, `tracker`/`tracker_name`, `sort`, `dedupe`, `suspect`, `episode_ratings`, `metadata_cache`, `parallel`, `lazy`, `rating_budget` (the latter names share the `torrents_cinema_` prefix). Unknown or absent values keep existing defaults. Recommendation helpers and Toloka/Mazepa scoring are retained, not reimplemented.

Eight standalone appearance/Google TV controls are no longer registered: `torrents_cinema_theme` (cinema/minimum theme), `torrents_cinema_tv` (reduced-effects TV mode), `torrents_cinema_animations` (motion class), `torrents_cinema_title_lines` (title line count), `torrents_cinema_cards` (row density), `torrents_cinema_intensity` (accent strength), `torrents_cinema_opacity` (panel opacity), and `torrents_cinema_darkness` (backdrop darkness). Their saved values are left untouched for rollback. The fixed interface uses restrained colors, content-sized rows and a static gradient; it does not create backdrop images, canvases, blur layers or animation loops. Focus/hover transitions are short, transforms are disabled, and `prefers-reduced-motion` removes transitions. Browser checks compare runtime subscription/style counts with legacy TV/animation values toggled; no extra effects or owned work are introduced. No controlled pre/post hardware benchmark exists, so this is a structural regression check, not a claim of measured performance improvement.

Other retired standalone controls for color extraction, ratings, trailers, watchlists and cache/background work are also not registered. Their settings values remain untouched.

Disable Torrent Cinema in its native SettingsApi panel to release its UI/handlers/styles and use native navigation. Direct API `setEnabled(false/true)` is reversible in memory; `destroy()` also removes its enable listener and queued metadata work. No native component is deleted. To roll back deployment after review, revert the scoped #117 commits (canonical artifact, aliases, Hybrid integration, manifest/Hub mapping) together and reload the old entry. Never clear profiles, history or credentials.


The owner's [independent-install clarification](https://github.com/gorlim590/lampa/issues/117#issuecomment-6470065909) requires a clean native Lampa smoke test, not only toggling Hybrid after startup. `node tests/torrent-cinema-browser.cjs --standalone` reloads the existing authorized tab, temporarily suppresses non-native visual extension delivery and directly loads only the exact canonical torrent artifact (native/provider dependencies remain). It asserts that neither Hybrid nor Buttons+ executes, then uses the actual native Details action, torrent component and Files template/Modal. `node tests/torrent-cinema-browser.cjs` separately verifies Hybrid integration. The three scenario families are exercised in both explicitly required install modes; original scripts, metrics and URL are restored afterward.
