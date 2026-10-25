# Architecture map

Verified against main `67bad5f` (2026-10-24). This is an owner/entrypoint map, not certification of every plugin. Recheck only the changed boundary when code evolves. [Testing](TESTING.md) · [Compatibility](PLUGIN_COMPATIBILITY.md).

## Runtime and delivery

The running Lampa core supplies `Lampa.Activity`, `Controller`, `ContentRows`, `SettingsApi`, `Storage`, `Timeline`, `Favorite`, `Api`, `Parser` and player/TorrServer APIs. Its deployed version is independent of this repository; there is no local application build or package-manager test command to assume.

`loader.js` sequentially loads its default list, tolerates individual failures and versions URLs. `LAMPA_PLUGINS_LIST` or `gl_loader_plugins` can replace that list; `LAMPA_PLUGINS_BASE` and `LAMPA_PLUGINS_VERSION` configure delivery. `plugins.json` is a managed catalog/configuration, not proof that every listed extension is active. Device extension registration and optional URLs can differ. Inspect only safe script URLs/globals needed for a runtime task, never dump Storage/credentials.

The default sequence is native Trakt → Trakt+ → torrent-search aliases → Interface+ → YDesign → average-rating → Cardify+ → translation. Optional Hybrid, Torrents Cinema, parsers, screensaver and Home History must not be assumed to be default-loaded. First-party files are delivered as static scripts through GitHub Pages; a local file, commit or Draft PR does not publish it.

## Ownership and boundaries

| Owner / entrypoint | Responsibility and dependency boundary |
| --- | --- |
| `trakt/trakt.js` | Native Trakt API/auth, lists and producers. Supplies `TraktTV.api` to Trakt+. |
| `trakt/trakt-plus.js` | Verified account-bound watched state, sync and Trakt Home rows. `isWatched(card)` is true/false/null; unknown is not unwatched. Existing identity/snapshot validation must survive UI work. Read-only `detailsProgress`/`detailsSession` feed the upper TV section. |
| `ui/design-optimized.js` (YDesign) | Card rendering, metadata, badges and its own optional rows. Vertical-only card content/metadata and confirmed account-bound Trakt watched presentation. Ambient and horizontal card modes are removed by PR29; local progress remains separate. Native actor rows use the existing cache-only Trakt API. |
| `ui/interface-plus.js` | Settings and interface enhancements; owns the single upper TV/anime info renderer (`LampaSeriesDetails`). Trakt supplies confirmed counts/titles/dates; average runtime/genres remain. |
| `ui/cardify-plus.js` | Details layout with `.cardify` and multiple legitimate rating anchors. Moving existing nodes must preserve handlers; broad multi-anchor insertion can clone content. |
| `ui/stremio-hybrid.js` | Reversible global theme, navigation/details composition and embedded torrent UI. Actual enabled state, not just existence of `window.StremioHybrid`, determines ownership. It yields TV info to Interface+ and Home ordering to the Home coordinator. |
| `media/seasons-info.js` | Canonical season/card metadata and native source adapter; preserves confirmed source episode IDs/numbers, special season0 and idempotent registration. `info/seasons-info.js` is a compatibility alias, not a second implementation. |
| `providers/parsers.js` | Parser settings/coordinator (`ParserProviders`): independent Jackett/Prowlarr roles, progressive results, cancellation/cache/dedup. Native TorrServer mode/playback remains delegated. |
| `providers/torrent-search.js` | Bounded verified title-alias search around the native parser boundary; coordinates with ParserProviders. Not a separate playback system. |
| `torrents-redesign.js` | Torrents Cinema visual rows, source/filter/sort menus and file/episode styling. Hybrid reuses this boundary for its embedded list; preserve original magnets/download URLs and native playback. |
| `plugins-to-enable/home-history.js` | Single optional Home integration: local confirmed progress for Continue Watching; confirmed Trakt watched for Watched. Loads sibling `home-policy.js` automatically. |
| `plugins-to-enable/home-policy.js` | Core-row policy and persisted stable-ID order via Home coordinator. Keep DOM, component items, active row, controller and scroll coherent. Never activate helper separately. |
| `ui/screensaver-plus.js` | Screensaver+, MP4/clock/weather. Temporarily owns native Lampa saver methods when enabled/configured; disable/destroy restores methods and cleans timers/input/video. Never controls Android system saver. |
| `ui/poster-status.js`, `ui/tv-status.js`, `media/average-rating.js` | Additional status/rating owners. Check only the relevant selector/data overlap before adding another marker. |

## Data invariants

Trakt is the authority for confirmed personal watched status; Timeline/Favorite/profile data supplies local progress/candidates, not an interchangeable remote watched truth. Do not merge those stores or write guessed seeks. Preserve unknown/pending/error and account isolation. A watched episode is not proof that an entire show is complete.

For TV/anime distinguish source season/episode coordinates, absolute anime numbering, aired count and planned total. The upper Trakt denominator means **aired**, not final series size. The user confirms three broadcast seasons for Apothecary, while the observed catalogues merge source seasons; no hardcoded broadcast remap or misleading total is currently displayed. See [the details follow-up](issue-10-details.md) and [source-season adapter](issue-10-seasons.md). Do not infer broadcasts from date gaps or alter watched history to fit presentation.

## Reuse existing evidence

Read these only when the boundary is relevant: [Trakt account/snapshots](issue-7-account-isolation.md), [watched sync](issue-7-watched-sync.md), [Home history](issue-25-home-history.md), [Home ordering](issue-30-home-order.md), [parser coordinator](issue-17-parsers.md), [alias search](issue-16-torrent-search.md), [header](issue-21-header-clock.md). Their baseline/PR-era publication notes are historical; current branch files and Git history decide what is present. [Hybrid README](../README-stremio-hybrid.md) and [Torrents README](../README-torrents-redesign.md) contain subsystem details.
