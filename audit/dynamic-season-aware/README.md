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

## Exact local artifacts

The final local source bytes loaded into the browser were:

- `ui/torrent-cinema.js` — 177,975 bytes, SHA-256 `10db03bfbdaa98ba081a71caaad0d531a2f1e3d163d8e73be42d395113250ae1`
- `providers/torrent-search.js` — 21,773 bytes, SHA-256 `5775add9fd0c1bbd672a0d16daf9278e7154e19433743222efe388ee6a329c4b`

## Targeted checks

- 105 torrent search, season model, overlay, and native lifecycle tests passed.
- 50 focused Torrent Cinema, inline lifecycle, details, and Hybrid regressions passed.
- `node scripts/build-torrent-cinema.mjs --check` passed.
- `node --check ui/torrent-cinema.js` and `node --check providers/torrent-search.js` passed.
- `git diff --check` passed.

Standalone mode, physical Google TV, and actual playback were not exercised in this main-browser session. The standalone and Hybrid integration contracts remain covered by focused automated tests; this evidence does not claim device-level acceptance.
