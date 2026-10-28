# Torrent Cinema 2.0 — acceptance evidence

Branch `feat/issue-117-torrent-cinema`; visual acceptance follow-up to `ce50a4461cfd1270547ac8417ce71b4ab01cc9fa`. Development baseline f60132b, rebased onto fa378b3 (two inventory-only main commits).

Canonical artifact SHA-256: `31f957e6839b17b5b51761480812a155510b0943d003fac57492905d15de85bf`. Both browser modes routed the same changed bytes into the existing native Lampa runtime. Original tab/URL/display metrics restored; browser/profile kept running.

| Check | Result |
| --- | --- |
| Focused automated regressions | 228 PASS / 0 FAIL; command in unit-results.json |
| Canonical-only install, Hybrid/Buttons+/other visual scripts not executed | 28 PASS / 0 FAIL |
| Hybrid integration | 28 PASS / 0 FAIL |
| 1280×720, 1920×1080, 3840×2160 CSS at DPR 1 | PASS in both modes; independent PNG sizes match |
| 1920×1080 CSS at DPR 2 | PASS; separate 3840×2160 PNG in both modes |
| Single toolbar/style, native D-pad/OK, info/Back, Files/return, focus restore | PASS with controlled parser/transport data |
| Owner approved reference comparison | Reviewed directly; real release title, resolution/type/HDR/codec, audio, aligned availability/actions, two filter bands, restrained purple and four premium detail sections |
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
| Approved issue reference | [Last of Us mockup](approved-reference-last-of-us.png) | [Final Hybrid](after-1920.png) | [Expanded](expanded-1920.png) |

[Before 1080p](before-1920.png) · [Before 4K](before-3840.png) · [DPR 2 Hybrid](device-equivalent-1080-dpr2.png) · [DPR 2 standalone](standalone-device-equivalent-1080-dpr2.png).

The reference comparison keeps its TV composition while applying the owner's requested deviations: quality and tracker controls are separate navigable rows; the real title is parsed from the release's Title/Name field and shown above format badges; purple focus is muted; Files are factual metadata in the fourth details column and have no separate launch button. Release year and episode coverage appear only when supported by the release string or its metadata. Complete raw names remain in expanded details. The rendered fixture has no poster/backdrop artwork, so the screenshot's surface cannot show the Last of Us image from the reference.

## Size/performance

Raw shared presentation source changes from 299,568 to 243,401 bytes (56,167 fewer; 18.7%). Legacy installed URLs may add tiny alias requests, never another owner. Four complete rows fit at 720p and five at 1080p/4K; the 4K modal uses 44px typography.

Single first-open observations: 268.3ms before, 349.7ms Hybrid, 347.5ms standalone. Host/protocol polling differs, so latency comparison is **INCONCLUSIVE**. No startup/FPS/memory/device gain claimed. The active runtime has 13 removable subscriptions and one scoped stylesheet; disabling removes these, retaining only its reversible enable-setting listener until destroy.

## Reproduce and rollback

Run `node scripts/build-torrent-cinema.mjs --check`, then `node tests/torrent-cinema-browser.cjs --standalone` and `node tests/torrent-cinema-browser.cjs` with the existing authorized CDP browser. Runners shadow Web Storage/backend writes and restore temporary routes/metrics/original page. Never run historical launch/destructive harnesses automatically.

[Ownership, installation, retained/retired settings and rollback](../../docs/torrent-cinema.md). CI workflows stay unchanged: the new checks run through the existing Hybrid test entry. The inherited inventory Markdown needed URL formatting only for the existing validator; inventory contents were preserved. No merge, production installation, security change or deployment occurred.
