# Issue #16 — metadata-backed anime/dorama torrent search

Baseline main: `9d3098d877b5b7497deb96e5ff6d9374bafc8bdc`. Final browser product source: `7bcf32903eff6c2c65dc34490dcf52536fd5bf49`. Later test/docs/CI commits do not change these product bytes.

## Confirmed request path and defects

Native Full torrent action and Hybrid `streamParams` build `search`, `search_one`, `search_two` from the card and the existing parse-language preference. Both reach the same native `Lampa.Parser.get`; Hybrid embeds the native torrents component, with a scoped cache wrapper. `providers/parsers.js` configures endpoints/keys rather than generating title aliases, and is not changed here. Native Parser then performs Jackett/Prowlarr/TorrServer requests and normalizes fields for the existing UI and Torrent.start.

The deployed native component obtains EN for some Japanese/Chinese animation and assigns it to `search_two`, but the transport searches `params.search`. This is not an automatic alias fallback. Korean drama is outside that native language/animation condition. Jackett also sends original/local title constraints unless clarification is set, which can negate a fallback query. Manual title choices exist, but do not provide a bounded automatic strategy. Native Full already supplies `alternative_titles`; these local metadata must be reused. Interface+ display translations and online search-sanitizer do not implement this torrent query contract.

Cinema's existing `titleWords` drops CJK/Hangul and permits partial token matches. It can reject a valid romanized alias, while a more popular wrong title can pass partial matching. Current main already includes prior Cinema/Hybrid work; the old Issue audit predates its publication. No #14 page deletion/files/ratings or #17 provider catalog work is included.

## Strategy and limits

`providers/torrent-search.js` wraps the public native Parser boundary once. Default loader and the managed manifest load this owned module; no external library/dependency or Settings menu is added.

- Ordinary non-target movies/series and explicit manual/free searches retain native parameters/results and one dispatch. Late responses are guarded by generation. East Asian original-language/script cards receive identity checks and fallback.
- The user/native primary query runs immediately, unchanged. Any relevant result ends the search immediately; optional aliases/metadata never delay it.
- Localized card name, verified UA/EN translations, metadata-provided romanized aliases, original, RU and other alternative titles form a normalized unique plan. Case, punctuation, diacritics and Korean spacing equivalents deduplicate. No transliteration is invented. The native `search_two` EN result is reused.
- Only an empty/non-relevant successful response permits another query. At most **3 logical native dispatches total**, sequential: primary +2 fallback. Fallback sets `clarification` on a shallow request copy to omit conflicting title constraints, preserving year/type/category settings and the original card. Primary network/API failure is returned immediately; an optional alias error stops rather than hammering a failed backend.
- Optional metadata is fetched only when useful local names are exhausted/missing and query budget remains. One typed numeric TMDB ID request appends translations/alternative_titles, using native proxy/key functions; never search by guessed title/ID. Response ID/type shape is verified. Metadata timeout <=2s; each alias deadline <=4s; the whole fallback phase <=8s, excluding native primary timeout. The native parser's configured timeout still applies.
- Public title metadata only: memory LRU 32 typed `source+media type+ID` entries, TTL6h. Anonymous cards never share a cache. No negative metadata cache and no duplicate parser-result cache, settings writes or credential storage. Existing native/Hybrid caches remain responsible for results; their general provider/configuration audit belongs to #17.
- Native backend multiplicity is preserved: configured “both” providers or TorrServer dual search can issue up to two transport requests per logical dispatch (max6), not an alias fan-out across the whole catalog. Already configured native aggregation waits remain native behavior.

Matching keeps Unicode scripts and requires a complete known title, or two complete known bilingual aliases, after release descriptors. Explicit wrong title/year/TMDB/type/season/episode are rejected before seeds can affect selection. Later season years are not compared to the first-air year. SxxEyy/ranges, `1x03`, Cyrillic season/episode labels and anime absolute episode labels are handled without inventing a seasonal/absolute-number mapping. Missing identity evidence remains unknown; identical titles with no year/IDs cannot be conclusively distinguished. Unlisted aliases/unusual release grammar can be omitted conservatively.

Infohash dedup supports equivalent hex/base32 magnets and ignores tracker parameters. Valid magnet identity wins over malformed InfoHash metadata. Without hash, exact URL or title/size/tracker plus structured quality/audio/subtitles/group/version are used; no fuzzy merging of different releases. Original result objects and native transport fields remain intact.

`torrents-redesign.js` delegates target-card matching to this module, retaining its ordinary matcher. Its quality counts retain the caller identity across shallow fallback requests. This works with the existing Hybrid scoped Parser wrapper and preserves UI/card/Trakt behavior. No observers, polling, per-frame processing, extra DOM updates or duplicated Settings handlers are introduced. Only active fallback deadline timers exist; native clear/destroy invalidates callbacks and aborts optional metadata, and repeated installation is idempotent.

## Evidence

`tests/fixtures/torrent-titles.json` uses real canonical Japanese/Korean/English/romanized titles verified against the linked public articles, in TMDB-shaped fixtures. TMDB IDs identify the works; fixture translation/alias envelopes and releases are controlled test data, not an assertion that every live TMDB response contains these exact alias fields. Korean RR is **Ojingeo geim**, not an invented spelling. Real backend credentials/history are neither used nor exported.

| Controlled example | Before | After |
|---|---|---|
| Squid Game / `오징어 게임` / `Гра в кальмара` | Native original-only query: 0 | Original → UA → Squid Game: 2 unique releases; wrong show/season removed |
| Attack on Titan / `進撃の巨人` / Shingeki no Kyojin | EN-only fixture search: 0 | EN → UA → verified romaji: 1 relevant Prowlarr release |
| Fight Club (1999), ordinary movie | 1 native query | 1 native TorrServer query; same magnet contract |

Final native Chromium pass: **11 PASS /0 FAIL**, exceptions `[]`; exact source SHA256/commit headers for all9 loaded owned/compatibility files. Actual native Jackett/Prowlarr/TorrServer transports execute against HTTP fixtures. Native Torrent UI shows both quality variants, focus/filter controls remain, and native selection passes correct title/magnet/media ID to Torrent.start (stubbed there to avoid real playback/server writes). Local alias exhaustion causes no optional metadata call; hashless audio variants remain distinct. YDesign, Hybrid and Trakt+ actual code was loaded. This is contract/UI evidence, not live parser availability or physical-device certification.

Measured fixture timings: original-only 44ms/1query/0results; bounded fallback101ms/3queries/2results, with fixed25ms fake response delays. These show the bounded extra work, **not** real latency or a speed improvement. Two root-path TorrServer configuration probes are recorded separately from searches; they come from the native test configuration, not the adapter.

Automated checks: **34 focused cases**, including missing/known metadata, UA/EN/original/verified romanizations/RU/Chinese names, ordinary/manual pass-through, ambiguous titles/remakes/types, seasons/episodes, hash/voice/quality variants, timeout/error, TTL/typed IDs and cancellation. **65 existing Cinema regressions PASS**; **99 Trakt/account/loader regressions PASS**. Syntax/repository/whitespace and current-head GitHub CI are required before merge.

Source review caught Hangul NFKD decomposition, late-season year semantics, localized episode grammar and hashless structured variants; focused tests cover each fix. The browser harness originally included native configuration probes in query counts and later dispatched direct API calls during the core's200ms delayed Back cleanup. The final harness waits for the actual native destroy event and has its own bounded query wait. Prior accounting failure is explicitly superseded; no claim that a hanging/cancelled harness query passed. No broad core lifecycle/provider rewrite was attempted.

Evidence: [browser JSON](../audit/issue-16/browser.json), [native UI screenshot](../audit/issue-16/torrent-results.png), [Cinema regression results](../audit/issue-16/cinema-regressions.json), [numbering test before fix](../audit/issue-16/numbering-before.log). Run `node --test --test-timeout=15000 tests/torrent-search.cjs` and `node tests/torrent-search-browser.cjs` (existing Playwright + system Chromium/proxy).

## Deployment, review and remaining manual checks

Complete diff is limited to the query adapter, two Cinema integration points, loader/cache tag, its expected-count regression, managed manifest entry, tests and documentation. Parser Settings, track/file/player code, YDesign/Trakt semantics and unrelated PR branches are unchanged. No new secrets/API keys are committed; runtime metadata uses Lampa's existing key. No result cache can leak parser credentials/accounts. Normal English search remains unchanged beyond dropping cancelled callbacks.

After Pages publishes main, refresh the existing loader URL with `?v=20261023-search-16` and restart Lampa. Its default list includes the adapter; do not add it twice. For custom `gl_loader_plugins`/individual URLs, add `providers/torrent-search.js` once before Cinema/Hybrid. Managed `plugins.json` includes it once before Cinema. Refresh an already installed direct Cinema URL with the same version query to obtain its matcher integration; do not reset parser addresses, keys, language or user history.

Physical Google TV/older WebViews, live indexer availability/rate limits and actual TorrServer/player/file-track playback remain manual platform/backend checks. Verify one known anime/dorama with your configured provider, expected season/episode and selection on the TV. No mass backend probes, stream downloads or #14/#17 feature work were performed. General native delayed cleanup and provider cache/configuration behavior remain owned by the external core/#17; the adapter prevents stale delivery and obeys explicit native cancellation. Merge/main CI/publication references are posted to Issue #16 after validation.
