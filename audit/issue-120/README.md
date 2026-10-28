# Issue #120 acceptance evidence

Product patch: `2a5c07fcfff37f17497b34225078a30dd7a7f962`, based on main `901eef3cf0ff96dc89013812e4867820319602c4`. Latest evidence/harness commit: `35d95a6a5387666877248931231190e7fd425a94`. Draft PR #124 remains open, unmerged, and undeployed.

## Automated checks

- Focused and adjacent torrent/Hybrid suites: **170 PASS / 0 FAIL**.
- `node scripts/build-torrent-cinema.mjs --check`: PASS.
- `node scripts/check-repository.mjs`: PASS (77 JavaScript files, 43 manifest entries, 556 URLs).
- `git diff --check`: PASS.
- GitHub Actions on pushed head `f9f01f90223de5d8df41498b6da1a1de40285461`: all 5 PR checks PASS, 0 FAIL.

Fake-clock request matrix:

| Enabled sources | Cold requests | Peak concurrency | First result | Warm additional requests | Alias requests, 2 aliases |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 3 | 3 | 3 | 20 ms simulated | 0 | max 6 |
| 6 | 6 | 4 | 20 ms simulated | 0 | max 8 |
| 17 | 17 | 4 | 20 ms simulated | 0 | max 8 |

Alias budget tests also cover settled/failed originals, cancellation, replacement, repeated aliases and a third alias. Retry after 401/403 clears cooldown. Source migration covers selected primary/secondary, new installations with 17 defaults, explicit empty/removed catalogs, disabled catalog entries, custom sources and repeated Auto toggles without changing catalog flags or credentials.

## Actual Lampa browser integration

The initial live-tab harness run used six controlled synthetic endpoints and fixture-only Files transport. The updated visual acceptance was then rerun in a separately launched, ephemeral Chromium process at native DPR 1. It injects the current local canonical Torrent Cinema bytes and, for Hybrid, the current local Hybrid bytes. No screenshot is resized from another viewport. The isolated run exercises native Lampa Details → Torrent Cinema, filters, source status, D-pad, Files and Back, with deterministic synthetic provider data.

| Mode | First visible results | Settled | Requests | Peak | Distinct rows |
| --- | ---: | ---: | ---: | ---: | ---: |
| Standalone (prior authorized-tab run) | 279 ms | 2029 ms | 6 | 4 | 3 |
| Hybrid (prior authorized-tab run) | 291 ms | 2038 ms | 6 | 4 | 3 |

The loaded native `Lampa.Parser.jackett`, `Lampa.Utils.buildUrl` and `Lampa.Utils.isAnime` implementations were inspected in the same runtime. Their source SHA256 values and byte sizes are in the browser JSON reports. Those controlled browser runs did not query parser endpoints or credentials. Unit tests compare Jackett path, query, title/year/serial/genre/category fields, native animation category rule, proxy subpaths, errors, cancellation and preserved release transport fields.

The visual harness runs each installation mode in isolated Chromium with native `deviceScaleFactor: 1`, then sets independent 1280×720, 1920×1080 and 3840×2160 CSS viewports. Reports confirm matching DPR, raster dimensions and CSS viewport; screenshots are actual browser renders. Torrent Cinema rendering, multi-source status, quality/tracker filters, scrolling, Files modal stacking, Back behavior and focus restoration passed 98 checks per mode. At 720p three rows are visible; at 1080p and 4K five rows are visible. The Files modal is visibly above the overlay in screenshots; DOM reports its z-index 110 vs. overlay 100, modal controller ownership and Back restoration. Native Lampa uses `pointer-events:none` for its remote-driven Files layer and file rows, so `elementFromPoint` cannot be used for those targets; screenshot and controller/stack geometry are the evidence used instead.

**Pixel-level visual acceptance: PASS for isolated desktop Chromium at native DPR 1.** This is not physical Google TV evidence. The first isolated run had a 1280×720 browser window; larger viewports were set in-page and independently rasterized at DPR 1 (not forced-device-metrics emulation). Live provider endpoints, live TorrServer and playback were not exercised.

Current native-DPR evidence supersedes the earlier DPR-emulated reports in this directory:

- [Standalone 98-check report](../torrent-cinema/browser-standalone.json)
- [Hybrid 98-check report](../torrent-cinema/browser-results.json)

| Mode | 720p selected / expanded | 1080p selected / expanded | 4K selected / expanded |
| --- | --- | --- | --- |
| Standalone | [selected](../torrent-cinema/standalone-1280.png) / [expanded](../torrent-cinema/standalone-expanded-1280.png) | [selected](../torrent-cinema/standalone-1920.png) / [expanded](../torrent-cinema/standalone-expanded-1920.png) | [selected](../torrent-cinema/standalone-3840.png) / [expanded](../torrent-cinema/standalone-expanded-3840.png) |
| Hybrid | [selected](../torrent-cinema/after-1280.png) / [expanded](../torrent-cinema/expanded-1280.png) | [selected](../torrent-cinema/after-1920.png) / [expanded](../torrent-cinema/expanded-1920.png) | [selected](../torrent-cinema/after-3840.png) / [expanded](../torrent-cinema/expanded-3840.png) |

Files layering captures: [Standalone](../torrent-cinema/standalone-files-1920.png) · [Hybrid](../torrent-cinema/files-1920.png).

The harness restores the existing tab URL and original emulation metrics, removes routes/preload/shadow storage, and leaves the test browser running. Its six endpoint URLs and API keys are synthetic fixture values. It does not touch saved live parser configuration.

## Live series investigation: Таємниця бункера / Silo

Read-only smoke in the existing main Lampa browser used the installed main-branch runtime and real configured parser responses; it did **not** execute PR #124's local coordinator artifact. The saved native filter for TMDb TV card `125988` was `season: ["1"]`; its year filter was empty. This explains why the overlay showed only S01 rows while provider responses contained later seasons. No preference was changed. See [sanitized machine-readable results](silo-main-smoke.json).

Manual query `Silo S02` returned HTTP 200 with 40 parser records (31 title matches including season-range packs); results include standalone S02 releases dated 2024. `Silo S03` returned HTTP 200 with 34 parser records (27 title matches); results include standalone S03 releases dated 2026, including Toloka and Mazepa entries. The UI showed `6/40` and `5/34` rows respectively because the saved native season-1 filter remained active. Thus the parser search is not limited to the 2023 first-air year. These are live endpoint observations, not PR #124 browser-acceptance evidence; no endpoint URL, key or authenticated address was recorded. No Files, download or playback action was started.

## Not tested / limitations

- The Silo smoke confirms one live parser response per manual query; it does not establish health, authentication, or CORS behavior of every configured endpoint. PR #124's all-enabled-source behavior remains covered by deterministic fixtures only.
- Live TorrServer, torrent download and playback are not tested.
- Physical Google TV rendering/performance remains unverified. Live parser/TorrServer behavior remains untested.

See [implementation and rollback](../../docs/issue-120-multi-parser.md).
