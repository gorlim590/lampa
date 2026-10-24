# Issue #17 — independent parsers and one progressive list

Baseline main: `8f44d3dd0e3148114c34d9604e59f33360a6294d`. Final product/browser commit: `6e404c646108b20b852bb17b8388f59aa13dac48`. No dependency on Draft #29; #16 already merged and reused.

## Actual behavior before the fix

`providers/parsers.js` configures sources, URLs/proxy/protocol and native `parser_use_link=one/two/both`; it was not a fallback-only feature. The deployed native Parser already launched two same-type requests concurrently, but invoked its consumer only after both settled. Its dedup key compares full magnet URI, so identical infohashes with different `tr` parameters survive as duplicates. Prowlarr secondary configuration was always written to Jackett fields, while native dispatch selects both endpoints using one global type. Mixed source types therefore did not work correctly.

## Supported contracts / configuration

- **Jackett-compatible** `/api/v2.0/indexers/{all|status:healthy}/results` returning `{Results:[...]}`: native `Lampa.Parser.jackett` still owns request construction/normalization. Native base URL normalization/proxy paths retained.
- **Prowlarr** `/api/v1/search` returning an array of `protocol:torrent` entries: thin coordinator adapter preserves raw fields, torrent download/magnet, infohash, size/seeds/peers, season/episode, audio/subtitle/ffprobe fields. No audio inferred from the movie title.
- Each managed role can be Jackett or Prowlarr, including mixed types and either role alone. Secondary type uses matching `prowlarr_url_two/key_two` or `jackett_url_two/key_two`; disabling clears both old secondary transport fields. Existing selector/Settings UI remains.
- Native **TorrServer search mode** is delegated unchanged; this is not a rewrite of its Rutor/Torznab implementation. Playback/TorrServer stays the native consumer of the selected row's original magnet/download link.
- Existing default presets are Jackett-compatible definitions: LampaUA Jackett, LampaUA, Spawn(1)/(2), Jac.red, Jacred.pro, Jac.black, Jac-red.ru, Jac.stull, Jr.Maxvol, Jac.Maxvol, NoName,407-Xyz, alcoV1/V2, NMJC, LampaApp. This is a preset inventory, **not certification of every public host's uptime/API behavior**. Custom definitions can select Prowlarr; host-specific exceptions still require that host's actual contract.

## One integration, no second torrent block

The existing `providers/parsers.js` entry loads sibling `providers/parser-search.js` with the same cache/version query. Do not enable the internal helper separately. Loader/manifest paths unchanged. The helper publishes the `ParserProviders.search/cancel/stats` integration and scopes its native component adapter to `torrents`; existing Cinema/Hybrid use that same component.

Two slots run independently. Fast nonempty results appear immediately; late results replace the cumulative snapshot in the **same native list**. The consumer resets native private results/filters through the existing callback/build path, restores rendered pagination and the selected release identity, and suppresses late activity toggles so menus/focus are not stolen. Only real provider updates trigger this work. No scroll/focus polling or MutationObserver added.

Ordinary external consumers remain **one-shot by default**. Only a native torrent component or explicit `params.parser_streaming=true` subscriber receives partial snapshots (`parser_pending:true`) and the final one. This avoids duplicating cards in unrelated legacy callbacks. Both #16 load orders are covered; its alias retry starts only after final empty results, and an irrelevant partial response cannot disable the alias deadline. Native Parser's existing single active search ownership is retained.

`parser_status` carries safe role/type/label/status, without URLs/credentials. Provenance is visible on native/Cinema cards. Hybrid caches only final all-success snapshots, not incomplete/failed aggregates. No #35 language-order redesign or new player/track selection was implemented.

## Identity / metadata / lifecycle

- Valid BTIH hex/base32 hashes canonicalize before merging. Direct valid InfoHash also supported; identical hash dominates different tracker parameters.
- Otherwise an exact HTTP download URL is used as an identity proof. Without either proof, source/index-scoped opaque IDs keep rows distinct; titles/size are never sufficient to merge different releases.
- Metadata/quality/audio variants with different hashes/URLs remain distinct. Same hash keeps per-source provenance and original rows; missing structured fields can be filled from the verified duplicate. Existing playable fields remain intact. No inferred tracks or rewritten torrent contents.
- Maximum2 slots; equal active queries/subscribers and identical selected endpoint credentials coalesce. Per-source timeout is the configured parse timeout clamped500ms–15s. New title/config query or clear invalidates the old generation and aborts native/owned pending transport; stale/double callbacks ignored.
- Successful provider cache:120s; valid empty:10s; max24 LRU entries. Cache identity includes query/media/season context, transport type, resolved URL and key **in private memory only**; never logged/persisted. Each source caches independently; failed aggregate is not a successful cache. Warm all-hit data emits once. Viewed flags refreshed from native storage.
- Errors use5s per-endpoint cooldown and **no automatic network retries**. One failed/empty/slow provider cannot suppress the other's results. Native Jackett hides detailed HTTP status; its failures are conservatively generic network errors. Prowlarr can report rate-limit/server-error. This does not claim live Retry-After/header verification for all servers.
- Only1 new lifetime torrent render listener (module guard), no new observers/intervals. Deadlines cleared after settlement/cancel; existing provider Settings observer/URL mechanisms retained and initialization guarded. No token/endpoint credentials in UI provenance or test logs.

## Targeted validation

- `node --test --test-timeout=15000 tests/parser-providers.cjs tests/torrent-search.cjs`: **64 PASS /0 FAIL** (30 coordinator +34 existing #16).
- Syntax for changed JS; `node scripts/check-repository.mjs`: **PASS**,62 JS/454 URLs. `git diff --check`: **PASS**.
- Existing Chromium via CDP: **13 PASS /0 FAIL**, JS exceptions `[]`. Five exact changed JS + unchanged loader SHA256/commit headers verified. Actual native Jackett, native torrent component/Cinema, source Select and #16 execute against controlled HTTP fixtures.
- Both Jackett; warm cache; one list/no duplicate DOM/focus retained; visible combined provenance; keyboard arrows/Select/OK switches secondary to actual Prowlarr fields; mixed contracts preserve languages; primary503 leaves secondary usable; native release selection reaches the Torrent/TorrServer boundary with original magnet. No real TorrServer write/playback.
- Unit fixtures additionally cover each role alone, Prowlarr primary, either role failing, empty/invalid, delayed/timeout/duplicate callbacks,429/500/503, changed title/config/key, aborts, cold/warm/empty TTL, source-specific failure cache, same endpoint/query coalescing, base32/hex identity, hashless variants, file-only torrent links/raw ffprobe, alias load orders/deadline and legacy one-shot consumers.

### Measured before/after (synthetic latency, not real server/FPS)

Actual browser HTTP handlers delay primary60ms and secondary650ms. Native pre-integration function was captured before plugin initialization for the baseline.

| Measurement | Native before | Coordinator after |
|---|---:|---:|
| HTTP requests per cold query |2|2|
| First displayed result callback |664.5ms|73.6ms|
| Full search completion |664.5ms|664.4ms|
| Result rows for same fixture payload |3 (one duplicate)|2 unique|
| Warm query requests |not a native-cache claim|0|
| Warm UI snapshots |—|1 (no redundant partial rebuild)|

No broad profiling or physical Google TV performance claim. Earlier harness errors involved holding a script load/incorrectly measuring an already-wrapped baseline; the final pass captures native dispatch before initialization. The warm two-callback observation was corrected and rechecked. Failed/earlier evidence is distinct from final `audit/issue-17/browser.json`.

## Delivery / acceptance limits

Deploy updated parsers entry, internal helper, #16 adapter, Cinema and Hybrid **together**, then reload Lampa; do not mix a newly loaded parser helper with a stale cached pre-integration #16 script. Explicit URL version bump/reload may be needed on WebView caches. Main loader/manifest activation selection unchanged; no real profile/plugin configuration edited by tests.

Physical Google TV, live health/availability of all public presets, real TorrServer/file download/playback and actual track selection are untested. Fixtures prove protocol/metadata/selection contracts, not that a particular public torrent exists or is playable. Existing search Settings are preserved; no real keys/auth/account data read into evidence. Test page's Storage/HTTP isolation is not product monkey-patching. Browser restored without launch/new context/profile or closure.

Rollback: revert the #17 commits and reload; existing settings remain. If parser management is disabled and Lampa reloaded, native parser behavior remains available. Future #35 can sort the preserved structured language metadata; it is not implemented here.
