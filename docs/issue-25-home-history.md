# Issue #25 — independent resume and confirmed watched rows

Baseline main: `fcc148f88257daab6ce56681c51ecc7903274d94`. Branch: `fix/issue-25-home-history`. PR #29 remains separate/unmerged; its audit and164 tests were not repeated.

## Confirmed causes versus the original user incident

- Native Lampa registers `continue_watch`; YDesign registers a separate `ydesign_continue`. Native Trakt additionally offers the distinct “Дивитись далі / Up Next”. They do not share one inclusion rule. In the observed Siaivo core, ContentRows deduplicates registration objects, not names, so multiple native continuations can also coexist.
- Main's YDesign scans bookmark lists before History and stops at90 candidates **before** checking progress. A known in-progress title later in history is therefore starved. It includes movie percent only between5 and50:75% and95% unfinished titles disappear. An executable regression reproduces both defects from the actual baseline functions.
- Its extended-series cache read key v6 differs from the write key v7, so local series evidence can be missed. #29 fixes that private cache; #25 bypasses it using native Timeline and cached TimeTable, without copying #29.
- Native history/viewed and threshold/last-episode shortcuts are not Trakt completion evidence. Neither opening a card nor watchlist membership proves a playback position. Maximum percent across old hashes can hide a newer replay/reset; source/type/ID changes can also lose a native binding.
- **No hard limit3 was found. The exact user's three titles/missing examples remain unconfirmed.** The accessible test profile has0 History/Viewed entries and1407 Timeline records, not the user's populated original dataset; examples were requested asynchronously. Do not claim a title-by-title incident reconstruction.
- There is also a viewport distinction: the current main horizontal YDesign layout can show roughly3 full posters while the controlled row contains7. Visible poster count is not dataset size; #29 changes orientation separately. This is an observed possibility, not a proven explanation of the original report.

## Minimal independent integration

`plugins-to-enable/home-history.js` owns only these two optional Home rows. A separate module is used because native core is externally hosted, the YDesign row is private and modified extensively in unmerged #29, and Trakt+ already supplies watched truth. It avoids a second Trakt/parser/metadata system and does not change shared viewing data.

It is **not in loader defaults**, as requested. [Activation instructions](../plugins-to-enable/README.md) contain the future GitHub Pages URL; a Draft PR does not make that URL live or install anything in Lampa.

- “Переглянуто”: only `TraktPlus.isWatched(card) === true`, for known native Favorite/history/bookmark candidates. Existing #7 full-show/movie/account semantics are reused; there is no duplicate watched cache, bulk import or account write. It is not a download of the entire remote Trakt library. Unknown/error/missing API is not false and adds no watched evidence.
- “Продовжити”: actual current-profile Timeline records with incomplete progress. Movies require saved positive seconds, not just a percent/history flag. Explicit0/reset and100%/duration-completed records exclude a position.75%/95% remain eligible. Latest updated evidence wins over historical maximum; tied undated completion/reset wins conservatively. No arbitrary result truncation or persistent Home cache; native row rendering retains its normal lazy horizontal window.
- Dedup uses typed explicit TMDB/Trakt/IMDb aliases; same numeric IDs from different media/providers are not guessed equivalent. Playback identity remains the card/source/title owning the freshest native record, even when dedup uses another canonical alias. This distinction is tested.
- Ambiguous legacy title hashes are rejected when different candidates share a title; linked Timeline metadata takes precedence. Existing renamed/source hashes and exact seconds/handler remain available to the native player; no guessed Timeline is written.
- Series/anime: exact linked episode progress or cached legacy episode hashes; next episode only from cached aired timetable and completed predecessor evidence. Specials/unaired are excluded. Where seconds are absent, UI explicitly says position unavailable; no fabricated seek. Missing schedule/legacy mapping is omitted conservatively, not fetched speculatively. Anime feature films remain movie media.
- Replay policy: while Trakt confirms completed, title remains in watched and is excluded from resume, even with stale local partial evidence. An unfinished local replay is eligible when provider no longer confirms completion/returns unknown and a valid native partial position exists; this does not convert unknown into unwatched. No remote-history editing or inference from last episode.
- Recompute on native Timeline/read/favorite/profile/Activity and Trakt notification events, coalesced120ms. One scoped in-memory road index per build; no polling/observer or new API request. Changed managed rows update through native Maker APIs, preserve selected content, and empty rows disappear. Queued callbacks read the current profile at delivery time.

No global `Storage.get` replacement remains. The ContentRows callback adapter discards only legacy continuation/history payloads on Home, retains unrelated/Up Next/category payloads and does not persist settings. Existing native callbacks may still perform their own timetable/cache work before output is discarded; the module adds no metadata/API search. Two YDesign active-module guards avoid duplicate continuation registration in either load order; merely having an inactive module object does not disable YDesign.

Hybrid receives a narrow history-change notification and prunes destroyed row references before ordering/restoration. This prevents a theme toggle from resurrecting a removed profile/history row. No new design or Trakt semantics were copied from #29. Dry-run3way application of the two UI patches to PR29 succeeds after dropping an unnecessary warmup edit. Loader is unchanged; #29 stays unmerged.

## Tests and runtime evidence

Commands:

```
node --test tests/home-history.cjs
node --test --test-name-pattern=loader tests/trakt-watched-sync.cjs
node scripts/check-repository.mjs
git diff --check
node tests/home-history-browser.cjs
```

- **30 focused regression tests PASS**, plus unchanged loader1PASS. Baseline defect reproduction, progress/completion/reset, >3/90 candidate starvation, ID/source/title dedup, newest native bindings, profile/restart/offline/unknown, series/anime/specials/air dates, callback freshness/coalescing, no writes, native row updates/focus, actual Hybrid order/off functions.
- Syntax/repository PASS:59JS/450 URLs at runtime checkpoint; whitespace PASS. Current CI adds only focused Home tests; no rerun of #8's full164 suite.
- **Existing CDP13PASS/0FAIL, exceptions=[]**, exact runtime product commit **`306524bdbcc76847d6924bc13b27af9d69f428a1`**. SHA256/commit proof for plugin/YDesign/Hybrid and unchanged loader.7 deduplicated resumes +1 confirmed watched; native timeline completion updates, empty/returning profile, Hybrid on/off, native directional focus and visible no-position episode label.
- **Actual built-in Lampa player** resumes generated60s silent PCM media at **20.008768s** from native saved20s; a different provider hash is resolved using native Timeline binding. Native Back returns Home and saves fixture progress. This is real native player/Timeline code, not merely a custom card field; it is not a real torrent/external player/backend test.
- All storage writes and Socket.send isolated to in-memory fixture state; HTTP mutations blocked. No real Trakt writes, profile clear/new context/browser close or installed extension. Original page/methods restored and fixture globals absent.
- Initial index optimization failed tests and an early checkpoint inaccurately called them passing because a shell tail masked the exit code; this was explicitly corrected, fail-fast commands adopted, and evidence retained as superseded. Subsequent native test launcher/focus precondition issues were fixed without pretending that playback had run. Only the final13/0 report is acceptance evidence.

Evidence: [runtime](../audit/issue-25/browser.json), [unit log](../audit/issue-25/unit-final.log), [repository log](../audit/issue-25/repository.log), [fixture screenshot](../audit/issue-25/home-final.png).

## Remaining acceptance / risks

- Exact real three titles and missing examples: **BLOCKED / unavailable in current test profile**. Need user examples or original populated profile; no private history exported or invented explanation.
- Physical Google TV and external player/TorrServer/provider return are untested. Native controlled PCM is not proof of all movie formats, external-player timecode callbacks or cloud synchronization.
- Test profile shows pre-existing failures for some localhost8766 preview plugins. Changed sources are proven; no all-plugin compatibility claim. These unrelated plugins were not repaired/audited.
- Missing legacy position links, incomplete cached timetable and unavailable card metadata are omitted rather than guessed. Provider-specific metadata/cache limits remain native. No performance/FPS claim or global profiling.
- Main's old YDesign watched badges still require #29 for complete Trakt-only presentation; #25 fixes row membership and preserves integration without duplicating that work. Future merge strategy: review independently from main, apply either order; both UI patches dry-run clean against #29, keep both independent CI workflows. No merge or issue closure is authorized here.

Disable the optional extension and reload to restore native/YDesign row ownership; no saved position/history needs deletion. Revert the narrow UI guards/pruning separately if needed. Stop after Draft/report; do not start another Issue automatically.
