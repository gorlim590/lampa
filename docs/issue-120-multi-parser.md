# Automatic multi-parser search (#120)

Baseline: main `901eef3cf0ff96dc89013812e4867820319602c4` (includes #117, #121, #122 and #123). No UI redesign or player replacement.

## Ownership and minimum change map

- `providers/parsers.js`: existing catalog, credentials, URL/proxy resolver and native parser settings remain the source of truth. Adds Auto/manual selection, concurrency and an independent per-entry exclusion map.
- `providers/parser-search.js`: extends the #17 coordinator, progressive native torrent consumer, identity merge, cache and cancellation. One queue replaces the former unbounded two-role dispatch. No additional lifetime Parser.get wrapper.
- `providers/torrent-search.js`: unchanged #16 alias owner. Coordinator limits a fallback wave to four healthy responders from the same original search owner, rather than repeating the entire catalog for every alias.
- `ui/torrent-cinema/runtime.js`: existing refresh clears failure cooldowns; catalog/exclusion changes invalidate its existing child/cache. Standalone and Hybrid consume the same native results.
- Ranking, tracker filters, release titles, metadata interpretation, Files/TorrServer and playback stay with existing owners. Endpoint order is not tracker rank. Toloka and Mazepa ranking code is unchanged, including when a configured endpoint is unavailable.

## Migration and operation

Auto is the default only when `parser_search_mode` is absent. Existing primary/secondary credentials and roles are not rewritten; choose Manual for troubleshooting with those saved roles. The catalog is not replenished during migration: deleted entries stay deleted and an explicitly empty saved array stays empty. Existing `enabled:false`, `disabled:true` (including string equivalents) and explicit exclusion flags remain excluded. New presets are not added to an existing saved catalog. Global parser/TorrServer selection remains authoritative.

Use native Parser settings → Enabled search sources to explicitly exclude or re-enable entries. The exclusion map is `parser_enabled_sources_v1`; it contains booleans, not keys or URLs. Numbered source labels deliberately avoid exposing custom endpoint addresses. The existing catalog editor continues to own addresses and keys. Live owner configuration was not edited during development or testing.

Default concurrency is 4; optional 6. Extra sources remain queued. Per-slot deadlines are 0.5–15 seconds using the existing parser timeout. A 17-source all-timeout run can take five waves at cap 4; fast partial results never wait for those waves. There are no automatic retries. Explicit Torrent Cinema Refresh clears the 5-second failure cooldown and reuses successful caches.

Success TTL is 120 seconds, valid empty TTL 10 seconds. LRU holds at most 24 endpoint/query entries; payloads larger than 256,000 JSON characters are delivered but not cached. Cache keys include account/profile, endpoint type/address/key, movie/query/season/episode. Keys are memory-only and not exposed through diagnostics. Cancellation aborts each active Reguest, drops queued work, and rejects late callbacks. Storage source changes and native profile selection also cancel immediately.

HTTPS pages do not directly query HTTP endpoints: they settle as unsupported unless the existing owner-configured resolver already supplies an HTTPS proxy. Unsupported protocols, network/CORS, invalid payload, HTTP 429/5xx, timeout and cooldown remain independent source states. CORS is honestly reported as generic network failure because the browser cannot identify the remote cause.

Native `Parser.jackett` has one private shared Reguest and no individual abort return value. The coordinator therefore owns a per-slot Jackett transport adapter alongside its existing Prowlarr adapter. It preserves the native Jackett query parameters, result fields, viewed state and transport identities; it does not replace native torrent components or create another search engine. This boundary was checked against the running native function. HTTP errors are handled without returning authenticated error URLs to the UI.

Verified BTIH (hex/base32) is authoritative for deduplication, followed by exact download URL. Similar titles/sizes alone never collapse rows. Duplicate provenance and missing verified metadata/transport fields are retained. No release names or audio languages are generated.

## Targeted evidence

Commands:

- `node --test --test-timeout=15000 tests/parser-providers.cjs tests/torrent-search.cjs tests/torrent-overlay.cjs tests/torrents-cinema.cjs tests/hybrid-ui.cjs`
- `node scripts/build-torrent-cinema.mjs --check`
- `node scripts/check-repository.mjs`
- With existing Playwright installation: `node tests/issue120-browser.cjs --standalone` and `node tests/issue120-browser.cjs`.

Deterministic fake-clock unit cases: 3/6/17 mixed enabled endpoints issue exactly 3/6/17 cold requests, peak concurrency 3/4/4, first response at simulated 20 ms, zero additional warm requests. Queue cancellation, fast/slow sources, individual timeout/abort, 429/500/503, invalid payload, unsupported protocol, no enabled sources, six-way duplicate provenance, profile/credential isolation, migration/exclusions and a bounded 17→4 alias wave are covered. These are controlled timings, not live server performance measurements.

Browser evidence is in `audit/issue-120/`: hashes and byte lengths identify exact locally routed/evaluated product sources. Existing authorized CDP Lampa tab only, shadow Web Storage, synthetic HTTP Jackett/Prowlarr endpoints. The fixture's Parser.get replacement is restored before opening Torrent: the coordinator and real Reguest adapters perform all six HTTP requests. Native Details, torrent component, Torrent Cinema, Info, Files template/modal, D-pad and Back execute. Files transport alone is synthetic, so no downloads or playback occur. Routes and shadow instrumentation are removed and the original tab URL is restored.

Known limits: physical Google TV, real provider availability/authentication/CORS, real TorrServer and playback are NOT TESTED for this issue. Existing working live settings were preserved. Browser testing proves progressive partial errors and navigation for six endpoints; the larger 17-source matrix is deterministic unit coverage. No claim about physical TV FPS/memory or live search speed.

## Rollback

Revert this PR's scoped files and rebuild the canonical artifact. Existing primary/secondary credentials/catalog remain usable; optional new settings can be left stored. Manual mode can be selected without restoring or replacing any endpoint. This Draft is not merged or deployed.
