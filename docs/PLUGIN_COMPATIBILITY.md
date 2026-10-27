# Plugin compatibility and ownership

Baseline: main `67bad5f`, 2026-10-24. “Known” below means a code/evidence-confirmed boundary; optional combinations still require their affected-flow check. No blanket certification of every catalog entry or physical TV.

## Loading and activation

Prefer the real default order in `loader.js`: native Trakt → Trakt+ → torrent-search → Interface+ → YDesign → average-rating → Cardify+ → translation. Manual extension registration may differ; `plugins.json` status is managed configuration, not a running-device inventory. Do not load the same plugin through both loader and a separate extension URL.

Optional baseline: parser provider/search coordination before using Torrents Cinema/Hybrid's torrent flow; base UI owners before Hybrid; Home History after normal loader. Home History loads its own sibling helper. Screensaver+ is separate and requires native saver APIs. Preserve lazy/late-API support in existing implementations rather than adding duplicate loaders. For detailed integration read the relevant source/linked report, not every historical audit.

| Combination / boundary | Confirmed issue or obligation |
| --- | --- |
| Native Trakt + Cardify+ | Cardify has two rating anchors. Former multi-target `.after` cloned a Trakt badge twice. Follow-up #40 inserts once or yields to `LampaSeriesDetails`; do not restore broad selector insertion. |
| Interface+ + Hybrid + Trakt+ | Interface+ owns one upper TV/anime section. Trakt+ supplies verified personal progress; Hybrid does not append competing season/episode/next fields. Average runtime remains. [Evidence](issue-10-details.md). |
| YDesign + Hybrid | Hybrid owns outer layout/focus/transform/theme when its actual body state is enabled; YDesign owns vertical card content. PR29 removes horizontal/Ambient paths; preserve on/off and reduced-motion behavior. |
| Cardify versus Cardify+ | Alternative details layout implementations; avoid enabling both without a specific proven integration. Preserve existing handlers when moving nodes. |
| YDesign / Poster Status / TV Status / average-rating | Status/rating selectors can overlap. Identify owner before adding a badge or disabling a plugin. Unknown Trakt watched must not be coerced to confirmed unwatched; YDesign consumes confirmed Trakt status only; local Timeline remains playback progress. |
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

### Ukrainian audio badge (#69)

Nightingale was removed at the user's request. YDesign is the sole card UA indicator owner: one saturated yellow badge in the metadata row. Its WH response schema is explicit; localized titles, interface language and subtitles are not evidence. Explicit original Ukrainian/audio-track data is used first, then typed WH cache/lookup, then optional torrent audio evidence. WH concurrency is bounded at two; unknown failures have a short non-persistent retry cooldown. Old Nightingale storage is left untouched and is not imported. Remove any manually registered Nightingale URL before reloading an existing installation; no other extension needs removal.

## Settings Registry integration (#73 / #79)

Hub and Hybrid coordinate through `LampaSettingsHub.owns(name)`: Hybrid cancels its rail frame and clears the remembered category while Hub owns native Settings routes. Other routes retain native/Hybrid behavior. Loading the internal module is inert; only the single UI owner mounts/unmounts it. Combined integration requires the compatibility handshake, never a second global stylesheet or a theme reload. Old AverageRating panels are blocked by Hub until `settingsPrivacyVersion >= 1`; native fallback remains accessible. No Home/torrent business controller is replaced. See [inventory gaps](../audit/settings/README.md).

## #79 Phase 2 — scoped card focus ownership

Based on merged #93/main `8c3d1a7`; reuses #9/#15/#79 ownership evidence. This PR migrates **only the outer native-card focus/hover decoration**, not every presentation feature.

| Boundary | Canonical / retained owner | Status and next scope |
| --- | --- | --- |
| Outer card focus/hover ring while Hybrid is active | Hybrid stylesheet | Interface themes yielded only their card pseudo-border/glow; Hybrid neutralizes the native pseudo-ring and uses its existing view shadow. Actual body class controls ownership; no plugin-presence heuristic/listener. |
| Standalone Interface card focus | Original Interface theme table | All14 themes retained, gated to `body:not(.stremio-hybrid)`. No saved theme value migration. |
| Vertical card content/UA/IMDb/personal Trakt rating/progress | YDesign and existing service writers | Unchanged. Existing YDesign outer-focus guards already yield to Hybrid; do not copy metadata or watched logic into shell. |
| Details structure and metadata | Cardify+ templates / Interface+ section / native handlers; Hybrid composition | Unchanged; migrate one verified presentation boundary later. |
| Header/sidebar/menu theme | Existing Hybrid plus legacy Interface theme rules | Deferred: Interface's button/modal/background overrides still exist. This PR does not assert that those are consolidated. |
| Settings Registry/service handlers | #73 native Registry / original services | Unchanged. Do not add another controller/store or patch native listener arrays. |

**Reproduction:** in the existing primary Lampa tab, an emerald Interface theme added a green1.333px pseudo-border plus10px glow while Hybrid simultaneously drew its white/purple view shadow. The fixed source yields the Interface selector and clears only the native card pseudo-decoration in Hybrid. The resulting pseudo-border is0/none, the glow is none; card radius43.797px and the original Hybrid shadow are unchanged. Hover uses the same owner. Standalone keeps its original rules automatically when the body class changes. No competing content renderer was demonstrated at this boundary, so none was removed.

### Repeated-navigation listener diagnosis

Phase1 recorded native Params subscriptions0→8 across Settings panels while owner initialization/style/mount remained1. Public native host `/app.min.js?v=1992278` (SHA-256 `9cea962508ca7dfd50da201f9dd0c0ea012f541d0f8db932723a8d16a2a9cc1a`) registers an anonymous `Params.listener.follow('update_scroll_position', function...)` in native Settings `buildEvents()` (line15387). Both Back and `destroy()` remove only the named `update_scroll` callback (lines15450/15464), leaving the anonymous callback retained. This establishes a source-level lifetime mismatch; it is not proof of a Hybrid/Registry reinitialization leak. Callback closures retain the panel's scroll/last state. The proper upstream fix is a named, per-instance position callback removed by both teardown paths. Do not monkeypatch private native listener arrays or rewrite Registry/service handlers in this visual PR. No zero-global-listener-growth claim.

### Focused verification / performance

- Tested immutable source `7d3bdc7fde008a8f1bd8265213dc81ed0cb3ad82`; CDN bytes match local hashes in [measurements](../audit/ui/card-focus-measurements.json). Existing primary user tab loaded actual changed Interface+ and Hybrid, plus unchanged YDesign/Cardify+ from that same revision.
- **PASS** one ring/unchanged radius, UA and IMDb/rating nodes present; Right/Left use native navigation. **PASS** Details opens with Torrent action focus and Back restores a card. **PASS** native Hybrid off/on removes/restores one stylesheet, preserves the original Interface theme and trigger focus; setting restored enabled.
- **27 automated PASS**: card-focus ownership/14themes, bounded audit-entry cleanup, existing Hybrid description/navigation/bootstrap tests. Repository check69JS/43manifest/510URLs and diff checks pass; final evidence-only head reruns CI.
- D-pad59→57ms, including the same two-frame probe window: **no demonstrated performance change**. Two competing card decorations become one; no new production handlers, requests, timers, observers or content DOM nodes. Styles48→47, nodes1724→1763 and UI-tag counts11→5 are async/CDN/probe snapshot dependent, not proven reductions. Startup4.649→2.071s/frame and11.493→10.452s/usable are recorded only for transparency: audit-loader/CDN/cache differ, so not a startup optimization claim.
- Console: three error logs, zero named JS/affected-source exceptions; resource failures1before/2after. Attribution is unconfirmed, no globally clean-console or backend acceptance claim. Physical Google TV **NOT TESTED**.
- The opt-in `audit/ui/phase2-loader.js` selects the immutable actual loader/modules for verification, restores its temporary global base on success/failure and never enters default activation. No production bootstrap change. Original loader/Hybrid extension URLs were restored, only temporary probe removed; user tab/settings/auth/history preserved.

Keep this PR independently reversible. Remaining #79 work: verify/migrate Interface button/modal/background themes, YDesign presentation fragments and Cardify templates separately, preserving service ownership; resolve the upstream native callback lifetime separately. No automatic merge or closing #79.
