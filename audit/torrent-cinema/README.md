# Torrent Cinema 2.0 — acceptance evidence

Implementation commit `ce50a4461cfd1270547ac8417ce71b4ab01cc9fa`; branch `feat/issue-117-torrent-cinema`. Development baseline f60132b, rebased onto fa378b3 (two inventory-only main commits).

Canonical artifact SHA-256: `fa5c1407087ad854a63f6a6c3a2719974289339dca069da1651c1dd4c99b3083`. Both browser modes routed the same changed bytes into the existing native Lampa runtime. Original tab/URL/display metrics restored; browser/profile kept running.

| Check | Result |
| --- | --- |
| Focused automated regressions | 225 PASS / 0 FAIL; command in unit-results.json |
| Canonical-only install, Hybrid/Buttons+/other visual scripts not executed | 24 PASS / 0 FAIL |
| Hybrid integration | 24 PASS / 0 FAIL |
| 1280×720, 1920×1080, 3840×2160 CSS at DPR 1 | PASS in both modes; independent PNG sizes match |
| 1920×1080 CSS at DPR 2 | PASS; separate 3840×2160 PNG in both modes |
| Single toolbar/style, native D-pad/OK, info/Back, Files/return, focus restore | PASS with controlled parser/transport data |
| Empty/error/retry, delayed results, reopen, profile isolation, teardown | PASS |
| Syntax/manifest/URL validator, artifact freshness, whitespace | PASS |
| Physical Google TV, real providers/TorrServer/player/tracks/4K playback | UNVERIFIED |

Three scenario families run in each owner-required install mode. Native row OK is preserved; only the synthetic release transport is shadowed. Core Files template/Modal/controllers run in the actual app. This is not real TorrServer/playback proof. Existing host startup errors are recorded separately; no exception occurred after fixture setup. The pre-existing delivery toast was temporarily hidden for screenshots, then restored by reload.

## Screenshots

| Mode/state | 720p | 1080p | 4K |
| --- | --- | --- | --- |
| Hybrid selected | [HD](after-1280.png) | [FHD](after-1920.png) | [UHD](after-3840.png) |
| Hybrid expanded | [HD](expanded-1280.png) | [FHD](expanded-1920.png) | [UHD](expanded-3840.png) |
| Standalone selected | [HD](standalone-1280.png) | [FHD](standalone-1920.png) | [UHD](standalone-3840.png) |
| Standalone expanded | [HD](standalone-expanded-1280.png) | [FHD](standalone-expanded-1920.png) | [UHD](standalone-expanded-3840.png) |

[Before 1080p](before-1920.png) · [Before 4K](before-3840.png) · [DPR 2 Hybrid](device-equivalent-1080-dpr2.png) · [DPR 2 standalone](standalone-device-equivalent-1080-dpr2.png).

## Size/performance

Raw shared presentation source changes from 299,568 to 234,435 bytes (65,133 fewer; 21.7%). Legacy installed URLs may add tiny alias requests, never another owner. The first 1080p row changes from about 223 to 129 CSS px; five complete rows fit. The 4K modal uses 44px typography.

Single first-open observations: 268.3ms before, 349.7ms Hybrid, 347.5ms standalone. Host/protocol polling differs, so latency comparison is **INCONCLUSIVE**. No startup/FPS/memory/device gain claimed. The active runtime has 13 removable subscriptions and one scoped stylesheet; disabling removes these, retaining only its reversible enable-setting listener until destroy.

## Reproduce and rollback

Run `node scripts/build-torrent-cinema.mjs --check`, then `node tests/torrent-cinema-browser.cjs --standalone` and `node tests/torrent-cinema-browser.cjs` with the existing authorized CDP browser. Runners shadow Web Storage/backend writes and restore temporary routes/metrics/original page. Never run historical launch/destructive harnesses automatically.

[Ownership, installation, retained/retired settings and rollback](../../docs/torrent-cinema.md). CI workflows stay unchanged: the new checks run through the existing Hybrid test entry. The inherited inventory Markdown needed URL formatting only for the existing validator; inventory contents were preserved. No merge, production installation, security change or deployment occurred.
