# Continue the integration, do not restart

Actual checkout: `audit/stremio-hybrid-20261022/repository`, branch `design/stremio-hybrid-x11`. Root workspace is not Git. Root `ui/stremio-hybrid.js` is served by existing loopback preview; release copy and checkout must stay synced. No push/merge during this run.

## Current delivery

- Hybrid 2.6.1 loaded through existing localhost extension, no manual evaluate bootstrap required. Release/stremio-hybrid matches source.
- Owned Interface+/AverageRating/Screensaver+ files are local patches. Combined test uses exact existing URL response replacements during normal reload; no plugin duplication or persisted extension URL change. Routes are removed afterward. Current runtime can retain patched owners, but next ordinary reload downloads published owners again. Do not call local files published.
- CommunityWatches extension status0 persists. `config/disabled-plugins.json` describes policy; does not itself run at startup. Targeted status backup is under backups/full-integration-20261023. Another TV installation needs its own extension disable.
- Chromium remains open, same authorized profile/tab. No history, lists, cookies or user avatar altered. Native MP4 screensaver preview tested; no torrent/video content playback started.

## Evidence / remaining work

| Area | Evidence | Remaining |
|---|---|---|
| Dependency audit | AUDIT.md + classification/state/sources | Update only changed runtime facts; do not repeat full audit |
| Movie/TV/anime details | details-report26PASS, rating-owner2PASS, screenshots | Actual cartoon samples; further user visual feedback |
| Dune broken icon | Oscar remote SVG broken, count6 genuine; owner local SVG | Owner delivery |
| Embedded clarification | inline-search10PASS | Native global keyboard submission end-to-end; callback is controlled |
| Files | files11PASS native templates/OK spy, safe TMDB episode mapping | Real TorrServer/magnets/files/player return, IMDb loader integration |
| Parsers | Native child reused | providers/parsers.js injects filter--parser only on standalone route; private reloadTorrents uses Activity.replace. Define public scoped callback before adapting; do not fake source picker |
| Best choice | Current feature is a release badge, not a selector mode | Define/test always-first mode separately; no fabricated selector inserted |
| Legacy torrent Activity | API and fallback callers retained | Cannot remove until series/history/plugins/TorrServer routes verified |
| Home continuation | home-order10PASS including late rows and8toggles | Real nonempty history after restart, different-provider dataset merge rules |
| Home speed | before4131ms/DOM1801; warm after93ms/DOM1942 | Not comparable speedup. Native partNext waits for entire batches; background rating/UA/parser traffic needs targeted profiling; card alignment pending |
| CommunityWatches | community3PASS after reload | Apply policy on physical TV separately |
| Header/profile | header11PASS, native clock, URL field/fallback | Actual saved avatar after restart/physical TV input; source menus beyond tested routes |
| Screensaver+ | screensaver13PASS; correct show/resetTimer ownership, tracked listeners/timers, pending cancellation | Owner delivery, prolonged physical TV testing. Baseline3ms vs26.1/1.3/26.6ms is not speedup evidence |
| Favorites | custom-favorites has separate v3/v2 branches | Audit active branch, native local lists vs Trakt Watchlist before reversible cycle tests. The component() call found in legacy v2 is not proof of current cause |
| Settings | Existing functional Hybrid rail retained | Full category/option dependency audit and reorganization pending |
| Add categories | new-category owns real provider/category rows | Retained, no blind removal |
| UA Comments | Exact external owner identified in AUDIT.md | License/redistribution unresolved; no copy made |
| Trakt-first | Existing Trakt rows retained | Official API research, list/order architecture deferred until critical routes stable |
| BWA/community sources | Logic untouched | Visual/navigation compatibility pending |
| TV performance | Desktop720/1080/4K checks | Physical Google TV/remote/FPS, long heap profiling BLOCKED |

## Next implementation order

1. Finish parser switcher integration through an explicit per-child API, plus real Files/TorrServer tests when available. Do not expose private endpoint/key values or play random sources.
2. Reproduce Favorites in active v3 branch; back up affected list in memory/outside Git, use reversible test items and separate local stores from Trakt Watchlist.
3. Profile Home slow batches; preserve existing rows and useful badges. Resolve different-provider continuation semantics before merging data.
4. Audit settings and Add Categories, UA Comments license, BWA/source menus. Trakt-first remains a separate stage; browse official API docs before assumptions.
5. Package owner delivery and verify physical TV only when authorized/available. No publication merely because local tests passed.

Tests connect only to existing Chromium CDP9222. Never browser.close(), new context/profile, storage.clear(), system permissions changes, credential output or force-push. Preserve saved real Stremio window references; no need to repeat completed X11 audit. Update CODEX_PROGRESS and commit each stable stage in actual checkout.
