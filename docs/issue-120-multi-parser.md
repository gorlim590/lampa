# Automatic multi-parser search (#120)

Baseline: main `901eef3cf0ff96dc89013812e4867820319602c4` (includes #117, #121, #122 and #123). No UI redesign or player replacement.

## Ownership and minimum change map

- `providers/parsers.js`: existing catalog, credentials, URL/proxy resolver and native parser settings remain the source of truth. Adds Auto/manual selection, concurrency and an independent per-entry exclusion map.
- `providers/parser-search.js`: extends the #17 coordinator, progressive native torrent consumer, identity merge, cache and cancellation. One queue replaces the former unbounded two-role dispatch. No additional lifetime Parser.get wrapper.
- `providers/torrent-search.js`: unchanged #16 alias owner. Coordinator limits a fallback wave to four healthy responders from the same original search owner, rather than repeating the entire catalog for every alias.
- `ui/torrent-cinema/runtime.js`: existing refresh clears failure cooldowns; catalog/exclusion changes invalidate its existing child/cache. Standalone and Hybrid consume the same native results.
- Ranking, tracker filters, release titles, metadata interpretation, Files/TorrServer and playback stay with existing owners. Endpoint order is not tracker rank. Toloka and Mazepa ranking code is unchanged, including when a configured endpoint is unavailable.

## Migration and operation

Auto is the default only when `parser_search_mode` is absent. The new per-source Auto inclusion map is separate from catalog `enabled`/`disabled` fields. On an installation without that map, search derives inclusion only from the currently selected legacy primary and secondary catalog sources; it does not write a migration map during search. This preserves existing choices without changing catalog flags or credentials. Explicit map entries are authoritative afterward, and missing entries are off.

New installs with no selected legacy parser start with no Auto sources until the owner enables entries. An empty saved catalog stays empty, removed entries are not restored, and catalog-disabled entries cannot be enabled through Auto Search. Existing saved custom endpoints remain in the catalog and can be included explicitly. Bundled presets are never inferred as user-enabled merely because their disabled flag is absent; a newly added preset remains off unless it is a currently selected legacy source or explicitly included by the owner. Manual mode continues to use saved primary/secondary roles without rewriting them. Global parser/TorrServer selection remains authoritative.

Use native Parser settings → Enabled search sources to explicitly exclude or re-enable entries. The exclusion map is `parser_enabled_sources_v1`; it contains booleans, not keys or URLs. Numbered source labels deliberately avoid exposing custom endpoint addresses. The existing catalog editor continues to own addresses and keys. Live owner configuration was not edited during development or testing.

Default concurrency is 4; optional 6. Extra sources remain queued. Per-slot deadlines are 0.5–15 seconds using the existing parser timeout. A 17-source all-timeout run can take five waves at cap 4; fast partial results never wait for those waves. There are no automatic retries. Explicit Torrent Cinema Refresh clears the 5-second failure cooldown and reuses successful caches. The native status line shows aggregate progress and exposes each numbered source's state and response count through its accessible label/title. HTTP 401/403 are reported as authentication errors; endpoints and keys are never shown.

Success TTL is 120 seconds, valid empty TTL 10 seconds. LRU holds at most 24 endpoint/query entries; payloads larger than 256,000 JSON characters are delivered but not cached. Cache keys include account/profile, endpoint type/address/key, movie/query/season/episode. Keys are memory-only and not exposed through diagnostics. Cancellation aborts each active Reguest, drops queued work, and rejects late callbacks. Storage source changes and native profile selection also cancel immediately.

HTTPS pages do not directly query HTTP endpoints: they settle as unsupported unless the existing owner-configured resolver already supplies an HTTPS proxy. Unsupported protocols, network/CORS, invalid payload, HTTP 429/5xx, timeout and cooldown remain independent source states. CORS is honestly reported as generic network failure because the browser cannot identify the remote cause.

Native `Parser.jackett` has one private shared Reguest and no individual abort return value. The coordinator therefore owns a per-slot Jackett transport adapter alongside its existing Prowlarr adapter. The running Lampa core's actual `Parser.jackett`, `Utils.buildUrl` and `Utils.isAnime` functions were inspected in the existing CDP tab. The adapter preserves `/api/v2.0/indexers/{healthy|all}/results`, `apikey`, `Query`, title/title_original, year, serial flag, genres, categories, and the native 5070 anime movie category rule (Japanese/Chinese original language plus animation genre). It also clones native torrent fields and adds the same derived time/hash/viewed/size/source-rank fields. Deterministic tests assert encoded parameters, movie metadata, anime categories, proxy/subpath behavior, exact title, magnet/download, tracker, audio/subtitle and availability fields. Errors become safe per-source categories rather than native localized text containing the endpoint URL. A per-slot `Reguest.clear()` provides cancellation where native `Parser.jackett` has no individual cancellation handle.

Verified BTIH (hex/base32) is authoritative for deduplication, followed by exact download URL. Similar titles/sizes alone never collapse rows. Duplicate provenance and missing verified metadata/transport fields are retained. No release names or audio languages are generated. Alias requests use a WeakMap owner record created by the original query, not the mutable active job: only up to four healthy original responders may participate, and at most two distinct alias queries can reserve those sources (maximum 8 alias endpoint requests, or `2 × min(4, healthy original responders)`). Repeated aliases, third aliases, failed originals, and cancelled/replaced owners cannot expand this budget or fall back to the whole catalog.

## Targeted evidence

Commands:

- `node --test --test-timeout=15000 tests/parser-providers.cjs tests/torrent-search.cjs tests/torrent-overlay.cjs tests/torrents-cinema.cjs tests/hybrid-ui.cjs`
- `node scripts/build-torrent-cinema.mjs --check`
- `node scripts/check-repository.mjs`
- With existing Playwright installation: `node tests/issue120-browser.cjs --standalone` and `node tests/issue120-browser.cjs`.

Deterministic fake-clock unit cases: 3/6/17 mixed enabled endpoints issue exactly 3/6/17 cold requests, peak concurrency 3/4/4, first response at simulated 20 ms, zero additional warm requests. Alias requests across two query aliases are capped at 6/8/8 for 3/6/17 healthy endpoints; a third or repeated alias adds no requests. Queue cancellation, fast/slow sources, individual timeout/abort, 401/403, 429/500/503, invalid payload, unsupported protocol, no enabled sources, six-way duplicate provenance, profile/credential isolation, safe migration/exclusions and retry are covered. These are controlled timings, not live server performance measurements.

Browser evidence is in `audit/issue-120/`: hashes and byte lengths identify exact locally routed/evaluated product sources. Existing authorized CDP Lampa tab only, shadow Web Storage, synthetic HTTP Jackett/Prowlarr endpoints. The fixture's Parser.get replacement is restored before opening Torrent: the coordinator and Reguest adapters perform all six HTTP requests. Native Details, torrent component, Torrent Cinema, Info, Files template/modal, D-pad and Back execute. Files transport alone is synthetic, so no downloads or playback occur. The DOM geometry pass sets independent 1280×720, 1920×1080, and 3840×2160 CSS viewports and verifies `devicePixelRatio === 1`, modal bounds, rows, filters, source status, Files z-index (110 over 100), and controller/Back restoration in both standalone and Hybrid. The test Chromium starts at DPR 0.25; scale compensation gives the requested CSS viewport and reported DPR, but the compositor hit-test remains at the original raster scale. Therefore the report marks pixel hit testing BLOCKED, and does not claim trustworthy visual screenshot review or physical Google TV testing. Routes and shadow instrumentation are removed, original URL and device metrics are restored.

Known limits: no live endpoint health/search request was sent, so actual provider availability/authentication/CORS remains NOT TESTED; real TorrServer and playback are also NOT TESTED. Existing working live settings were preserved. Browser testing proves progressive partial errors and navigation for six synthetic endpoints; the 3/17 endpoint matrices are deterministic unit coverage. Pixel-level layout verification is inconclusive in this test Chromium due to the fixed raster scale, and physical Google TV remains untested. No claim about physical TV FPS/memory or live search speed.

## Rollback

Revert this PR's scoped files and rebuild the canonical artifact. Existing primary/secondary credentials/catalog remain usable; optional new settings can be left stored. Manual mode can be selected without restoring or replacing any endpoint. This Draft is not merged or deployed.
