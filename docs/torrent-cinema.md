# Torrent Cinema 2.0 — ownership and migration (#117)

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

Standalone-only appearance/watchlist/trailer/background controls are no longer registered: theme/color/manual color/intensity/opacity/darkness/cards/title-lines/ratings/animations/tv/color-cache. Stored values are left untouched, available if rolling back. The historical captured Settings inventory keeps its original owner attribution; its reconciliation explicitly marks retired controls and does not claim fresh device verification.

Disable Torrent Cinema in its native SettingsApi panel to release its UI/handlers/styles and use native navigation. Direct API `setEnabled(false/true)` is reversible in memory; `destroy()` also removes its enable listener and queued metadata work. No native component is deleted. To roll back deployment after review, revert the scoped #117 commits (canonical artifact, aliases, Hybrid integration, manifest/Hub mapping) together and reload the old entry. Never clear profiles, history or credentials.


The owner's [independent-install clarification](https://github.com/gorlim590/lampa/issues/117#issuecomment-6470065909) requires a clean native Lampa smoke test, not only toggling Hybrid after startup. `node tests/torrent-cinema-browser.cjs --standalone` reloads the existing authorized tab, temporarily suppresses non-native visual extension delivery and directly loads only the exact canonical torrent artifact (native/provider dependencies remain). It asserts that neither Hybrid nor Buttons+ executes, then uses the actual native Details action, torrent component and Files template/Modal. `node tests/torrent-cinema-browser.cjs` separately verifies Hybrid integration. The three scenario families are exercised in both explicitly required install modes; original scripts, metrics and URL are restored afterward.
