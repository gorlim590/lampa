# Dynamic Season-Aware Torrent Browser — acceptance evidence

Browser screenshots and live-data evidence captured 2026-10-29 in the authorized main Chrome Lampa tab (`https://siaivo.isroot.in/`). The local PR sources were injected into that existing page for these checks; no provider response was replaced with a fixture. No playback or downloads were started.

## Future season rule

The selector includes only numbered seasons with a valid `air_date` on or before the current date. Season 0/Specials, future air dates, missing/invalid dates, and unreported seasons do not create buttons. Season numbers are taken from metadata, so gaps are preserved and there is no fixed maximum.

For Silo (TMDb TV ID 125988), the live metadata contained S01 (2023), S02 (2024), S03 (2026), and future S04 (2027-07-08). The selector displayed **S01, S02, S03**. **S04 was absent**. This implements the owner's clarification that a season which has not aired must not be listed.

## Live search checks

- **Silo S02:** actual configured parser search `Таємниця бункера S02`; 48 unique raw releases across the season and collection query phases, 20 S02 rows, 0 collections. The row title/coverage and season status reflected S02. Silo S03 was also searched on the same title in the prior browser pass and returned 17 season rows plus 1 collection.
- **Supernatural (TMDb TV ID 1622):** metadata produced exactly 15 aired numbered seasons; Specials were excluded. Actual ArrowRight from S01 reached S15, and seven ArrowLeft actions reached S08. Enter on S08 performed a new query (`Надприродне S08`): 75 unique raw results across two phases, 9 S08 releases and 9 collections. Enter on S15 queried `Надприродне S15`: 57 unique raw results across three bounded phases, 0 season-only releases and 9 collections. The live endpoint supplied collections for S15; the UI did not fabricate season-only releases.
- S15 exposed a coordinator edge case: accepted season-pack rows were discarded when the next alias phase had exhausted its time budget. The fix preserves already accepted rows and initializes the bounded fallback deadline before the broad collection query. The final live S15 view displayed the 9 returned collection rows.

Counts use unique releases across search phases before title/season filtering, deduplicated by the existing torrent identity rules. The displayed seasonal and collection counts are separate.

## Screenshots and raster geometry

All screenshots are direct browser captures at device pixel ratio 1 (not resized images):

| Scenario | CSS viewport | Raster | Screenshot |
|---|---:|---:|---|
| Silo S02 | 1280×720 | 1280×720 | [silo-1280x720.png](silo-1280x720.png) |
| Silo S02 | 1920×1080 | 1920×1080 | [silo-1920x1080.png](silo-1920x1080.png) |
| Silo S02 | 3840×2160 | 3840×2160 | [silo-3840x2160.png](silo-3840x2160.png) |
| Supernatural S15 collections | 1280×720 | 1280×720 | [supernatural-s15-1280x720.png](supernatural-s15-1280x720.png) |
| Supernatural S08 results | 1920×1080 | 1920×1080 | [supernatural-s08-1920x1080.png](supernatural-s08-1920x1080.png) |
| Supernatural S15 collections | 3840×2160 | 3840×2160 | [supernatural-s15-3840x2160.png](supernatural-s15-3840x2160.png) |

Silo overlay geometry was x=77, y=36, 1126×648 at 1280×720 and x=230, y=108, 3379×1944 at 3840×2160. The document had no horizontal or vertical overflow at either size. Fifteen season controls fit in the tested 1280×720 row; focused controls remained visible. This is desktop viewport emulation, not physical Google TV verification.

## Earlier live season-search artifacts (historical checkpoint)

The earlier local source bytes loaded for the season-search browser pass were; this checkpoint is superseded by the final artifact evidence below:

- `ui/torrent-cinema.js` — 180,506 bytes, SHA-256 `7ee7a602346b77965067064faf9757a3e9e6da97b35156a645b4fb612c513b81`
- `providers/torrent-search.js` — 21,773 bytes, SHA-256 `5775add9fd0c1bbd672a0d16daf9278e7154e19433743222efe388ee6a329c4b`

## PR #128 pre-merge hardening — 2026-10-29

The exact rebuilt `ui/torrent-cinema.js` (2.1.0; 180,506 bytes; SHA-256 above) was loaded temporarily into the existing main Chrome tab at `?card=125988&media=tv&source=tmdb` through a loopback read-only preview. The page was restored afterward; the main browser profile, saved settings, parser credentials and URL were preserved.

- Live Silo metadata still exposed only aired seasons S01–S03; future S04 (2027) remained absent.
- A browser-only synthetic metadata/parser fixture supplied 47 already-aired numbered seasons. At CSS viewport 1280×720, DPR 1, the UI rendered 47 buttons in one scrollable row (scrollWidth 2,731 px; clientWidth 1,092 px). The selected S47 scrolled into view on open. Real ArrowRight reached S47, ArrowLeft returned to S01, and both focused buttons stayed inside the visible row. Up from a release traversed the settings, tracker and quality groups back to the selected season.
- Fixture searches issued S47, S08, S15 and S02 queries. After rapid S08→S15→S02 changes, S02 was selected, stale S47-only results were not shown, and a verified S01–S47 collection was eligible and pinned as Best Choice. The S01–S03 collection was not pinned outside its coverage. This is fixture evidence, not live provider output.
- On S08, collection rows visibly showed **Містить S08**, **Не містить S08**, and **Склад сезонів не підтверджено**. The direct 1280×720 browser capture is [premerge-1280-season8-visible-badges.png](premerge-1280-season8-visible-badges.png).
- The native quality/audio/tracker fields remain delegated to the native filter setter; its saved legacy season is preserved and the active season is never written there. Browser fixture writes to the separate new season namespace were intercepted, so no preference changed.
- With an in-memory TorrServer transport stub, native Files appeared above Torrent Cinema (z-index 130 over 100); Back returned to the overlay with the same release focused. Reopening Files on the same synthetic release did not produce a second Files dialog in this direct main-browser run; a different synthetic release did open Files. Same-release repeated Files behavior therefore remains unconfirmed with a live configured TorrServer. No playback or download was started.

Focused local checks after this pass: **146/146** tests passed across season model, overlay, parser search, Hybrid, Torrent Cinema and native lifecycle suites. Artifact freshness, syntax, repository checks and `git diff --check` passed. The main-browser screenshot and geometry above are an actual 1280×720 Chrome render. Physical Google TV behavior is not tested.

## Targeted checks

- 105 torrent search, season model, overlay, and native lifecycle tests passed.
- 50 focused Torrent Cinema, inline lifecycle, details, and Hybrid regressions passed.
- `node scripts/build-torrent-cinema.mjs --check` passed.
- `node --check ui/torrent-cinema.js` and `node --check providers/torrent-search.js` passed.
- `git diff --check` passed.

Standalone mode, physical Google TV, and actual playback were not exercised in this main-browser session. The standalone and Hybrid integration contracts remain covered by focused automated tests; this evidence does not claim device-level acceptance.

## Earlier audio selector hardening checkpoint — 2026-10-29

At this checkpoint, a local build was injected into the owner's existing main Chrome Lampa tab through the read-only loopback preview. The exact artifact was `ui/torrent-cinema.js` (185,677 UTF-8 bytes / 181,440 JavaScript characters; SHA-256 `9e8175e9fdf24da713302002e30dc7928ecf8a5767d89e8e6695818517371d53`). The parser boundary was replaced only in page memory with seven controlled releases; no configured parser endpoint, credential, proxy, or saved parser source flag was changed.

The controlled set contained Ukrainian-only, Russian-only, English-only, unknown-audio, Ukrainian+English, English-audio/Ukrainian-subtitle, and French-audio releases. Real ArrowLeft/ArrowRight/Enter input selected all four categories. Observed category counts were UA 2, RU 1, EN 3, Other 2; the bilingual release counted in both UA and EN. The English-audio/Ukrainian-subtitle item appeared under EN only. Unknown and French items appeared under Other. With Toloka selected, the scoped counters became UA 1, RU 0, EN 0, Other 1; returning to All Trackers restored the original counts. A separate five-release fixture with no Ukrainian audio showed UA 0 while RU 1, EN 2, and Other 2 remained populated. The default for a new title was UA.

Counter scope is the active season and quality/tracker filters, before the selected audio category. Duplicate valid InfoHashes count once per category; a multilingual release can count in more than one category. A stale native season value is ignored in movie status text, and audio/tracker selection refreshes the result status immediately.

| Main Chrome controlled-fixture render | CSS viewport / DPR | Raster | Geometry and result |
|---|---:|---:|---|
| [1280×720](audio-filter/1280x720.jpg) | 1280×720 / 1 | 1280×720 | Modal 1126×648; two 1084×116 rows; no toolbar, modal, or tested text clipping |
| [1920×1080](audio-filter/1920x1080.jpg) | 1920×1080 / 1 | 1920×1080 | Modal 1690×972; two 1622 px wide rows; no horizontal overflow or tested text clipping |
| [3840×2160](audio-filter/3840x2160.jpg) | 3840×2160 / 1 | 3840×2160 | Modal 3379×1944; two 3245 px wide rows; no horizontal overflow or tested text clipping |

One visible Torrent Cinema overlay was present at each viewport. This is a real browser raster check at DPR 1, not physical Google TV testing. The controlled fixture did not start playback or call TorrServer.

Focused tests after the final patch: **225/225 passed** across metadata/overlay, seasons, native lifecycle, parser search, Hybrid discovery/UI, and parser provider suites. `node scripts/build-torrent-cinema.mjs --check` and `git diff --check` passed. These browser category cases are controlled-fixture evidence; no live provider response is claimed.

### Native Files and Back check after audio selection

On the same main Chrome tab and exact PR artifact, a controlled TV release was selected with the EN audio category active. Opening native Files displayed the native modal above Torrent Cinema (z-index 130 over 100) with one file; no playback was requested. The first Back closed Files and returned to the Torrent Cinema controller with the selected release focused and EN still active. A second Files open on that release also rendered the native file row. On the second Back, Lampa returned to the underlying Details controller rather than the torrent overlay; this repeat-cycle focus restoration is not accepted as a pass and remains a lifecycle limitation to investigate separately. The check used a memory-only transport fixture and did not contact configured parsers or TorrServer.

After the check, the exact main Chrome tab was navigated back to `https://siaivo.isroot.in/?card=125988&media=tv&source=tmdb&settings=parser`. The app loaded its published Torrent Cinema 2.0.0; the temporary fixture and injected PR artifact were absent. Saved settings, credentials, profile and other tabs were preserved.

## Final audio and native Files regression pass — 2026-10-29

Final tested canonical artifact: `ui/torrent-cinema.js`, 185,901 UTF-8 bytes, SHA-256 `33015869b49ac1b38a7bc050ed680e0f0a93b9ca0a5629a253d46f2ae45a7475`. The screenshots below were captured from these exact artifact bytes (not the earlier 5a0d7e6 build), at DPR 1, with controlled fixture data.

- Structured `AudioLanguages: ["Українська озвучка"]` and `["Українська доріжка"]` normalize to `languages: ["Українська"]`, `audio.ua: true`, and the UA category. This fixes the badge and Best Choice flag as well as category matching.
- Verified mixed tracks overlap categories as requested: UA+French matches UA and Other; EN+Japanese matches EN and Other. Unknown-only audio stays in Other. Ukrainian subtitles with English audio do not match UA.
- For a TV empty-UA fixture, the live overlay status read `Парсер знайшов: 2 · S03: 0 · колекції: 0 · UA: 0 видимих`. Choosing Other showed two rows and updated status to `Інші: 2 видимих`. This was controlled parser data, not a live provider response.
- Final artifact browser screenshots (the 1280 case shows all three UA-matching rows; rows stay readable and toolbar does not overflow):

| CSS viewport / DPR | Raster | Modal bounds | Screenshot |
|---|---|---|---|
| 1280×720 / 1 | 1280×720 | x77 y36, 1126×648 | [1280×720](audio-filter-final/1280x720.jpg) |
| 1920×1080 / 1 | 1920×1080 | x115 y54, 1690×972 | [1920×1080](audio-filter-final/1920x1080.jpg) |
| 3840×2160 / 1 | 3840×2160 | x230 y108, 3379×1944 | [3840×2160](audio-filter-final/3840x2160.jpg) |

### Identical main-vs-PR Files lifecycle A/B

Used the same main Chrome tab, same movie card (TMDb 1384216), same in-memory `Lampa.Parser.get` fixture (`AB Lifecycle Test 2024 1080p WEB-DL Ukrainian`, InfoHash `1111…1111`, one synthetic file), and actual Enter/Escape remote keys. Parser callbacks were replaced only in page memory; this made no parser endpoint or saved setting changes. `Torrent.back`, `selectionArmed`, controller toggle events, and native modal close were traced. The scripts had trace-only hooks around the existing `selectionArmed` assignments; base artifacts were otherwise unchanged.

| Observation | Merged main #126 artifact (`dc5ce25`, SHA-256 `fbf57d83846ef27e42c16710a414f93b0a9c5173c1272c0018a57f74bee34362`) | PR #128 candidate artifact (SHA-256 above) |
|---|---|---|
| First Files open → Back | Modal/controller opened; one Back callback fired; `selectionArmed` cleared; returned to `sh_movie_streams` with the torrent row focused | Same |
| Reopen same Files → Back | Files reopened; second Back callback fired; returned to `sh_movie_streams` with the same torrent row focused | Same |
| Result | Repeated Back failure not reproduced | No regression vs main; failure not reproduced |

Thus the previously reported second-cycle return-to-Details behavior did not reproduce on either side under the identical fixture. No separate inherited blocker is confirmed by this A/B. This is a browser fixture test, not a real TorrServer or playback test.

Focused local tests now include direct localized-UA flag, mixed-language Other membership, subtitle separation, and TV status updates including zero visible rows. Physical Google TV and actual media playback remain untested.
