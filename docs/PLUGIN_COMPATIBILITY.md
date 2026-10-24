# Plugin compatibility and ownership

Baseline: main `67bad5f`, 2026-10-24. “Known” below means a code/evidence-confirmed boundary; optional combinations still require their affected-flow check. No blanket certification of every catalog entry or physical TV.

## Loading and activation

Prefer the real default order in `loader.js`: native Trakt → Trakt+ → torrent-search → Interface+ → YDesign → average-rating → Cardify+ → translation. Manual extension registration may differ; `plugins.json` status is managed configuration, not a running-device inventory. Do not load the same plugin through both loader and a separate extension URL.

Optional baseline: parser provider/search coordination before using Torrents Cinema/Hybrid's torrent flow; base UI owners before Hybrid; Home History after normal loader. Home History loads its own sibling helper. Screensaver+ is separate and requires native saver APIs. Preserve lazy/late-API support in existing implementations rather than adding duplicate loaders. For detailed integration read the relevant source/linked report, not every historical audit.

| Combination / boundary | Confirmed issue or obligation |
| --- | --- |
| Native Trakt + Cardify+ | Cardify has two rating anchors. Former multi-target `.after` cloned a Trakt badge twice. Follow-up #40 inserts once or yields to `LampaSeriesDetails`; do not restore broad selector insertion. |
| Interface+ + Hybrid + Trakt+ | Interface+ owns one upper TV/anime section. Trakt+ supplies verified personal progress; Hybrid does not append competing season/episode/next fields. Average runtime remains. [Evidence](issue-10-details.md). |
| YDesign + Hybrid | Overlap in card sizes/focus/transform/global theme needs targeted confirmation. Detect actual Hybrid on/off. Do not assume that a later CSS override proves duplicate JS animation, or that Draft PR29's cleanup is in main. Preserve YDesign card content. |
| Cardify versus Cardify+ | Alternative details layout implementations; avoid enabling both without a specific proven integration. Preserve existing handlers when moving nodes. |
| YDesign / Poster Status / TV Status / average-rating | Status/rating selectors can overlap. Identify owner before adding a badge or disabling a plugin. Unknown Trakt watched must not be coerced to confirmed unwatched; current main still has legacy YDesign fallback paths. |
| Canonical Seasons Info + legacy URL | `media/seasons-info.js` owns implementation; `info/seasons-info.js` loads it compatibly. Keep idempotence and old URL; do not maintain two renderers. Source-season normalization is distinct from upper info presentation. |
| ParserProviders + torrent-search + Torrents Cinema + Hybrid | One result pipeline/list. Parser roles run independently/progressively; alias coordinator must not multiply or leak old searches. Dedup by verified infohash or exact safe identity, never similar title alone. Preserve language/raw playback fields and native TorrServer/files. [Parser contract](issue-17-parsers.md). |
| Home History + Trakt/YDesign/Hybrid | One coordinator owns row registration/order. Preserve producer IDs, profile persistence and DOM/component/focus/scroll alignment. Unknown third-party rows fail open. Native-source signature matching is core-version sensitive. [Ordering](issue-30-home-order.md). |
| Screensaver+ + native saver | When enabled and configured to own native methods, wraps/restores Lampa `show/resetTimer`; handles pending starts and input/timer/video cleanup. Disabling/destroy must restore native behavior. Never disable Android's system saver. No broad standalone automated coverage currently claimed. |
| CommunityWatches / third-party catalogs | `config/disabled-plugins.json` and catalog status document managed policy; they do not uninstall scripts already active on a device. Do not classify/remove unrelated rows by localized title/icon. |

## Status/data compatibility

Trakt watched is account/media-type/ID scoped; unknown/pending/error and stale-session protection are part of the API contract. Local Continue Watching has a different purpose. Do not copy watched logic into card renderers or mix local Favorite lists with remote Watchlist.

Source season numbers are not guaranteed broadcast season numbers for anime. Do not infer the user's three broadcast seasons from an observed one-season source catalogue, or vice versa. Preserve IDs and history; the upper section currently omits unverified totals and uses Trakt titles rather than fabricated local coordinates.

## Diagnose only the relevant intersection

Record safe loaded URL/hash, actual enabled flags, selector owner and lifecycle event. Reproduce the specific overlap, fix its owner/registration, and verify disable/reopen where affected. Guards avoid duplicate initialization but do not prove cleanup or compatibility. Avoid global CSS hiding, new permanent observers and mass plugin removal. Preserve author/license notices when touching third-party-derived files (`NOTICE.md`, `licenses/`).
