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

Both runs used the existing authorized test tab, the canonical Torrent Cinema artifact, six controlled synthetic endpoints and fixture-only Files transport. They exercised native Details → Torrent Cinema, fast partial results, a slow source, one HTTP 503, deduplication, source status, focus retention, D-pad, Files and Back.

| Mode | First visible results | Settled | Requests | Peak | Distinct rows |
| --- | ---: | ---: | ---: | ---: | ---: |
| Standalone | 279 ms | 2029 ms | 6 | 4 | 3 |
| Hybrid | 291 ms | 2038 ms | 6 | 4 | 3 |

The loaded native `Lampa.Parser.jackett`, `Lampa.Utils.buildUrl` and `Lampa.Utils.isAnime` implementations were inspected in the same runtime. Their source SHA256 values and byte sizes are in the browser JSON reports. No parser endpoints or credentials were queried. Unit tests compare Jackett path, query, title/year/serial/genre/category fields, native animation category rule, proxy subpaths, errors, cancellation and preserved release transport fields.

The browser harness set independent CSS viewports of 1280×720, 1920×1080 and 3840×2160, verified reported DPR 1, overlay/card/filter geometry, visible rows and the per-source error label in both modes. The Files modal reports z-index 110 over Torrent Cinema's 100, one visible file, modal controller ownership and Back restoration to the focused release.

**Pixel-level visual acceptance is BLOCKED.** The connected Chromium's original DPR is 0.25; CDP emulation reports the requested CSS viewport and DPR, but screenshots still rasterize at the original 0.25 scale. The screenshots were inspected and are not saved as acceptance evidence. DOM geometry and controller tests pass, but they do not substitute for valid screenshots at these resolutions.

- [Standalone browser report](browser-standalone.json)
- [Hybrid browser report](browser-hybrid.json)

The harness restores the existing tab URL and original emulation metrics, removes routes/preload/shadow storage, and leaves the test browser running. Its six endpoint URLs and API keys are synthetic fixture values. It does not touch saved live parser configuration.

## Not tested / limitations

- No live parser endpoint health/search smoke was sent; no real configured endpoint availability/authentication/CORS conclusion is made.
- Live TorrServer, torrent download and playback are not tested.
- Physical Google TV rendering is not tested.
- Pixel screenshot review remains blocked by the connected browser raster scale. Re-run visual checks in a Chromium instance with native, non-forced viewport/DPR before marking PR #124 Ready for Review.

See [implementation and rollback](../../docs/issue-120-multi-parser.md).
