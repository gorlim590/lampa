# Repository layout and URL migration

This PR introduces canonical categorized plugin paths **without deleting legacy entrypoints**. Existing installed Lampa plugin URLs, `plugins.json`, `loader.js`, and third-party references continue working. New paths are mirrors at the snapshot of this PR and must not be independently edited without an explicit migration plan; the old paths remain the source of truth until a follow-up switches the build/manifest and adds backwards-compatible shims. **Do not install both old and new URLs for the same plugin at once.**

## Current structure

- `plugins/` — proposed canonical category layout for Lampa JavaScript plugins.
- `audit/` — existing isolated audit/test area (test runners, reports, screenshots, JSON, logs); leave test-relative resources together so scripts remain reproducible.
- `backups/` — existing pre-change snapshots, not runtime plugins.
- `tests/` — executable regression tests.
- `scripts/` — repository validation and maintenance scripts.
- `docs/`, `release/`, `stremio-reference/` — documentation, releases and visual references.

## Old path → proposed canonical path

| Existing path and GitHub Pages URL suffix | New path and proposed URL suffix | Do I need to update Lampa now? |
|---|---|---|
| `community/community-watches.js` | `plugins/community/community-watches.js` | **No** — old path remains available |
| `community/hikka.js` | `plugins/community/hikka.js` | **No** — old path remains available |
| `community/imdb-trailers.js` | `plugins/community/imdb-trailers.js` | **No** — old path remains available |
| `community/lparty.js` | `plugins/community/lparty.js` | **No** — old path remains available |
| `community/new-category.js` | `plugins/community/new-category.js` | **No** — old path remains available |
| `community/nightingale.js` | `plugins/community/nightingale.js` | **No** — old path remains available |
| `community/vinyl.js` | `plugins/community/vinyl.js` | **No** — old path remains available |
| `filters/anti-dmca.js` | `plugins/filters/anti-dmca.js` | **No** — old path remains available |
| `filters/content-hider.js` | `plugins/filters/content-hider.js` | **No** — old path remains available |
| `filters/hide-content.js` | `plugins/filters/hide-content.js` | **No** — old path remains available |
| `filters/lampac-source-filter.js` | `plugins/filters/lampac-source-filter.js` | **No** — old path remains available |
| `filters/search-sanitizer.js` | `plugins/filters/search-sanitizer.js` | **No** — old path remains available |
| `filters/source-sort.js` | `plugins/filters/source-sort.js` | **No** — old path remains available |
| `filters/trash-filter.js` | `plugins/filters/trash-filter.js` | **No** — old path remains available |
| `info/seasons-info.js` | `plugins/media/legacy/seasons-info.js` | **No** — old path remains available |
| `localization/translate.js` | `plugins/localization/translate.js` | **No** — old path remains available |
| `media/average-rating.js` | `plugins/media/average-rating.js` | **No** — old path remains available |
| `media/custom-favorites.js` | `plugins/media/custom-favorites.js` | **No** — old path remains available |
| `media/seasons-info.js` | `plugins/media/seasons-info.js` | **No** — old path remains available |
| `media/studio-picks.js` | `plugins/media/studio-picks.js` | **No** — old path remains available |
| `media/ua-comments.js` | `plugins/media/ua-comments.js` | **No** — old path remains available |
| `providers/bandera-online.js` | `plugins/providers/bandera-online.js` | **No** — old path remains available |
| `providers/parsers.js` | `plugins/providers/parsers.js` | **No** — old path remains available |
| `providers/tmdb-networks.js` | `plugins/providers/tmdb-networks.js` | **No** — old path remains available |
| `providers/tracks-probe.js` | `plugins/providers/tracks-probe.js` | **No** — old path remains available |
| `providers/tryzub-tv.js` | `plugins/providers/tryzub-tv.js` | **No** — old path remains available |
| `providers/ts-tracks.js` | `plugins/providers/ts-tracks.js` | **No** — old path remains available |
| `torrents-redesign.js` | `plugins/torrents/torrents-redesign.js` | **No** — old path remains available |
| `trakt/community-watches.js` | `plugins/trakt/community-watches.js` | **No** — old path remains available |
| `trakt/trakt-plus.js` | `plugins/trakt/trakt-plus.js` | **No** — old path remains available |
| `trakt/trakt.js` | `plugins/trakt/trakt.js` | **No** — old path remains available |
| `ui/buttons-plus.js` | `plugins/ui/controls/buttons-plus.js` | **No** — old path remains available |
| `ui/cardify-plus.js` | `plugins/ui/cardify-plus.js` | **No** — old path remains available |
| `ui/cardify.js` | `plugins/ui/cardify.js` | **No** — old path remains available |
| `ui/design-optimized.js` | `plugins/ui/design-optimized.js` | **No** — old path remains available |
| `ui/interface-plus.js` | `plugins/ui/interface-plus.js` | **No** — old path remains available |
| `ui/menu-hide.js` | `plugins/ui/menu-hide.js` | **No** — old path remains available |
| `ui/poster-status.js` | `plugins/ui/poster-status.js` | **No** — old path remains available |
| `ui/screensaver-plus.js` | `plugins/screensaver/screensaver-plus.js` | **No** — old path remains available |
| `ui/series-progress-fix.js` | `plugins/ui/series-progress-fix.js` | **No** — old path remains available |
| `ui/stremio-hybrid.js` | `plugins/torrents/stremio-hybrid.js` | **No** — old path remains available |
| `ui/tv-status.js` | `plugins/ui/tv-status.js` | **No** — old path remains available |

## Future migration checklist

1. Decide on one active plugin registry (currently `plugins.json`, `loader.js`, plus manual Lampa-installed URLs can overlap); inventory active scripts at runtime.
2. Deduplicate functional owners (e.g., Cardify vs Cardify+) before enabling both copies.
3. Implement backwards-compatible loaders at old paths and migrate `plugins.json`/loader references atomically; verify slow-load/race behavior and GitHub Pages URL availability.
4. Test clean-profile Home, details, torrents, history, Trakt watched, remote focus/Back, restart and caches on a pinned commit SHA and on actual Google TV where possible.
5. Only after tests choose whether to update user-installed Lampa URLs. Never silently break the old URLs.

## No runtime changes in this PR

This organizational staging deliberately does not change active plugin URLs, remove old files, alter playback/data, or claim successful browser/Google TV tests.
