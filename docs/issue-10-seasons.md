# Issue #10 — canonical seasons and episode identity

Baseline main: `b1c784ee7ae65dcb454f1f4522fef51a521196d9`. Only open unrelated PR at start: Draft #29; no dependency or copied YDesign changes. Product/runtime commit: `bcf152aee1103046d3898f4f2c7d5a90d4aa62f4`.

## Reproduced root cause (2026-10-24)

The deployed Lampa core's `get$e` runs `Utils.splitEpisodesIntoSeasons` on TMDB season1; a90-day date gap creates invented seasons and synthetic episode IDs. `seasonFix` reuses the same TMDB season object when nonexistent season2/3 returns404. This is not three executions of seasons-info. The Full component then chooses the last virtual group, while the original movie metadata still reports season1. Evidence before changes: `audit/issue-10/baseline-source-seasons.json`, native Full/episodes snapshots and screenshots.

Actual live native-source requests for Apothecary Diaries / «Монолог травниці» (`TMDB220542`) returned:

| Requested season | Returned TMDB season ID | Episode count | First episode ID |
|---|---:|---:|---:|
|1|329141|24|901001 (synthetic)|
|2|329141|24|902001 (synthetic)|
|3|329141|12|903001 (synthetic)|

The public descriptor actually declares **one ordinary season with60 episodes**, plus Season0 with53 specials. Native raw `episodes_original` retains the real60 records/IDs. Do not invent three official seasons from broadcast gaps. The source may describe future episodes; a confirmed episode record is not a claim it already aired.

Two comparison titles captured from the actual native TMDB transport: Breaking Bad (`1396`) has5 ordinary seasons +S0; season5 contains16 episodes. Attack on Titan (`1429`) has4 ordinary seasons +S0; season4 contains28 episodes. Captured public fields are in `metadata.json` / `episode-metadata.json`; counts are a dated snapshot, not timeless promises. No Trakt IDs were needed/guessed for this TMDB defect.

## Minimal integration

- Canonical entry stays **media/seasons-info.js**. `info/seasons-info.js` remains the old URL alias, now with a pending-load guard and retry after load failure. Manifest already points to media; loader does not auto-load it by default, so neither was changed. The existing test browser really loads the media URL separately.
- Canonical plugin wraps the existing TMDB source `full` and `seasons` callbacks once, before rendering. Restore original episodes, preserve real IDs/numbers, remove the native virtual-split marker; normalize duplicate descriptor numbers and episode tuples on copies, not CSS/DOM removal. Explicit source descriptors determine allowed seasons, including0 and sparse season numbers. Nonexistent requested seasons are rejected before native fallback; missing descriptors are verified via the native cached transport.
- Existing native Season/Episode components and controllers remain. Only the native episode-page season Select's items are adapted to confirmed numbers. Season0 uses native truthy string routing (`"0"`) to avoid `object.season || lastSeason`; specials remain separate. Unrelated/torrent Selects are unchanged. Latest-season focus is preserved when the entry route omitted a season.
- Repeated ready events cannot duplicate initial observers/Settings registration; duplicate scripts cannot install another adapter. Concurrent native season/descriptor reads coalesce, repeated callbacks settle once, each subscriber gets independent copies. No global split utility, Trakt watched rule, torrent search, YDesign, Interface, Hybrid or Cardify implementation changed.
- Badge reads use the actual supported `Lampa.Api.sources.tmdb.get` transport instead of nonexistent `Lampa.TMDB.get` / mandatory custom key. Cache v2 is keyed by language+TMDB ID,23h TTL, max250 records, single in-flight read per key. Bad metadata is not cached. Clear-cache clears memory too. No old user data is deleted; legacy cache key is ignored.
- Recycled card callbacks verify the original data and badge node before updating, including errors. Infinite missing-card-data RAF retries replaced with one bounded retry. Optional chaining/arrow in the plugin tail removed; no dependencies added.

## Checks

- `node --test --test-timeout=15000 tests/seasons-info.cjs`: **21 PASS /0 FAIL**. Covers canonical+alias/double-load, repeated app-ready, source split restoration, single/multi/anime, special0, sparse/missing/malformed descriptors, concurrent callbacks and stale owner/title responses, cache/coalescing/errors/clear, native selector scope and default focus.
- `node --check media/seasons-info.js`, `node --check info/seasons-info.js`: **PASS**. `node scripts/check-repository.mjs`: **PASS** (61 JS,453 URLs at product stage). `git diff --check`: **PASS**.
- Existing CDP browser: **13 PASS /0 FAIL**, exceptions=[], exact7 changed/active source SHA256+commit headers. Actual native core executes its old gap splitting first; the new adapter restores the recorded raw public responses before native rendering.
- Native episode UI: Apothecary1 ordinary season/60 episodes with real IDs; selector onlyS0/S1; keyboard OK selects S0 (53 specials), arrows retain focus. Breaking BadS5:16 episodes/5 seasons; Attack on TitanS4:28/4. Reopen and page restart do not duplicate entries. Full has one episode row with original identities under actual active YDesign, Interface+, Cardify+, Trakt+ and Hybrid.
- Product source was rechecked after stale-callback/default-focus corrections. Earlier harness issues were global async style-count comparison and opening before native Activity initialized, not product passes; retained first failed result separately. Final `browser.json` is authoritative.
- Fixture stores are memory-only, HTTP mutations blocked, Trakt auth disabled; no real account writes/playback or browser closure. Original page restored. Browser's replacement Storage methods are test isolation only, not product code.

## Performance / limitations

Standard Full/season rendering reuses existing TMDB requests/cache: no additional request for valid complete metadata, two concurrent identical season reads become one native call; unsupported artificial S2/S3 no longer trigger404+fallback requests. A genuinely missing descriptor or wrong latest-season payload may need one native cached read. Badge duplicates coalesce; old permanent RAF loop is gone. No new DOM observers, intervals or listeners added; existing two observers remain and initialize once. No FPS/memory improvement or physical Google TV PASS claimed.

Physical Google TV/old hardware and actual playback remain untested. Browser fixtures cover native navigation and actual source/plugin code; they do not prove live Trakt/TorrServer behavior. Existing history stored against previously invented virtual S2/S3 numbers is **not rewritten**; automatic migration could mis-map user progress and is outside this fix. No real History/Timeline/Favorite data removed.

After merge/publication, reload Lampa to replace its old guarded script instance. Keep either canonical media URL or compatible old info URL; do not add a second plugin. Disable seasons-info +reload for rollback. No CSS hides duplicate seasons and no separate season UI was introduced.
