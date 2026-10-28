# Torrent Cinema 2.0 — acceptance evidence

## Real provider and TorrServer smoke

Run against the current PR artifact and existing authorized Lampa Chromium session: [sanitized smoke report](real-smoke/README.md) with [machine-readable evidence](real-smoke/real-integration-smoke.json). The Others returned 15 releases and its native Files handoff returned one TorrServer file entry; Arcane returned 20 releases. The 100 днів омани parser run and real-provider filter/duplicate interactions remain explicitly unresolved/not tested. No playback was started.

Branch `feat/issue-117-torrent-cinema`; empty-match-warning fix and final verification tested at `8e84c0bb4f9896f72e69667de7c9cddfee732ed0` (parent verification commit `b58bfe0ea30b14e31b12683f16a833889b6c098a`; primary runtime implementation remains `98346e41b45e2264eb4881c8bb20fe7213a5b983`). Development baseline f60132b, rebased onto fa378b3 (two inventory-only main commits).

Canonical artifact `ui/torrent-cinema.js`: 149250 bytes; SHA-256 `16dd3c98d21c83a4044782f2bcf460d746a920ce46dbb919a1abbfd08cf5bd78`. Rebuilt freshness check passed; both browser modes routed these exact local bytes into the existing native Lampa runtime. Original tab/URL/display metrics restored; browser/profile kept running.

| Check | Result |
| --- | --- |
| Broader focused automated suite at prior acceptance checkpoint | 230 PASS / 0 FAIL (commit `91a5685`) |
| Final targeted name/search regressions | 64 PASS / 0 FAIL; `tests/torrent-overlay.cjs` + `tests/torrent-search.cjs` |
| Empty-match warning regression | PASS: valid S02 has zero `.tc-match-note`; season mismatch renders exactly one note with nonempty reasons |
| Canonical-only install, Hybrid/Buttons+/other visual scripts not executed | 96 PASS / 0 FAIL |
| Hybrid integration | 96 PASS / 0 FAIL |
| 1280×720, 1920×1080, 3840×2160 CSS at DPR 1 | PASS in both modes; independent PNG sizes match |
| 1920×1080 CSS at DPR 2 | PASS; separate 3840×2160 PNG in both modes |
| Single toolbar/style, native D-pad/OK, info/Back, Files/return, focus restore | PASS with controlled parser/transport data |
| 720p text geometry | Actual title, technical badges, audio, voiceover and subtitles fit the row; info control is circular; expanded raw title fits its panel |
| Release-name fixtures | 15 independent film/series/anime/dorama, season/episode pack, long multilingual and sparse-name cases per mode; each has a unique media ID, exact parser Title/Name, one row, cacheHit=false, exact compact identity/verified metadata and exact expanded raw title |
| Genuine Name-only compatibility boundary | Live native `torrents` component is unsupported: its parse and tracker-filter paths call `element.Title.toLowerCase()` without a Name fallback. No Name-only result is sent through that component. The Torrent Cinema adapter separately passes a Name-only `releaseView` unit fixture. |
| Selected season UI matching | Selected season 2 with S02 release `(2018)` for series first aired 2013 shows no warning element. Negative season 1 check is renderer-level: it calls `LampaTorrentOverlay.decorate` with `{season:1}` and confirms the S02 mismatch note; it does not change the native selected-season filter. |
| Retired Google TV appearance settings | Eight settings remain inert and stored; toggling former TV/animation values leaves styles/subscriptions stable, without animation, transform or backdrop filter |
| Owner approved reference comparison | Reviewed directly; real release title, resolution/type/HDR/codec, audio, aligned availability/actions, two filter bands, restrained purple and four premium detail sections |
| Empty/error/retry, delayed results, reopen, profile isolation, teardown | PASS |
| Syntax/manifest/URL validator, artifact freshness, whitespace | PASS |
| Physical Google TV, real providers/TorrServer/player/tracks/4K playback | UNVERIFIED |

Three scenario families run in each owner-required install mode. Native row OK is preserved; only the synthetic release transport is shadowed. Core Files template/Modal/controllers run in the actual app. This is not real TorrServer/playback proof. Before fixture installation, both modes report the same uncaught `SyntaxError: Failed to execute 'appendChild' on 'Node': Unexpected token '&'` from `https://siaivo.isroot.in/app.min.js?v=1992455:44592:24`. CDP Runtime evidence attributes it to the host application bundle, before the fixture, with no observed PR asset frame; the host bundle source was not changed by this PR. No uncaught exception occurred after fixture setup. The pre-existing delivery toast was temporarily hidden for screenshots, then restored by reload.

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

The final HD pass gives wrapped text enough row height, brightens technical badges and keeps the info action circular. A browser regression measures actual text rectangles for all 12 baseline rows, including a long-title row, against card bounds, beyond checking document overflow. A long series fixture renders `Нічний архів / Night Archive` with verified 2024, S02E01–E03, 1080p, Ukrainian/English audio and studio; its expanded details retain the full multilingual raw torrent title. Fifteen independent cases are tested in each installation mode, covering parser-provided bilingual, Ukrainian-only, English-only, Title+Name and long multilingual titles. A live compatibility check documents that native Lampa cannot consume a Name-only parser row: it unconditionally reads `Title` before Torrent Cinema decorates the result. The adapter's Name-only fallback remains covered directly by a unit fixture; no production parsing shim was added. No catalog alias is appended.

For the positive season context, the browser opens the real Details → Torrent overlay and sets the native component's season filter to 2 using its public `setFilterData` API. The exact S02 release is accepted despite its 2018 release year and 2013 series premiere; its `reasons` array is empty and no `.tc-match-note` element is rendered. The negative case is renderer-level validation: it calls the production row renderer with `{season:1}` for the same S02 release and confirms a mismatch warning with nonempty reasons. It does not perform a native filter transition.

Series captures: [compact 1080p](series-long-1920.png) · [expanded 1080p](series-expanded-1920.png) · [standalone compact](standalone-series-long-1920.png) · [standalone expanded](standalone-series-expanded-1920.png).

## Size/performance

Raw shared presentation source changes from 299,568 to 252,970 bytes (46,598 fewer; 15.6%). Legacy installed URLs may add tiny alias requests, never another owner. Three complete rows fit at 720p and five at 1080p/4K; the taller HD rows prevent technical/audio clipping. The 4K modal uses 44px typography.

Single first-open observations: 268.3ms before, 349.7ms Hybrid, 347.5ms standalone. Host/protocol polling differs, so latency comparison is **INCONCLUSIVE**. No startup/FPS/memory/device gain claimed. The active runtime has 13 removable subscriptions and one scoped stylesheet; disabling removes these, retaining only its reversible enable-setting listener until destroy.

## Reproduce and rollback

Run `node scripts/build-torrent-cinema.mjs --check`, then `node tests/torrent-cinema-browser.cjs --standalone` and `node tests/torrent-cinema-browser.cjs` with the existing authorized CDP browser. Runners shadow Web Storage/backend writes and restore temporary routes/metrics/original page. Never run historical launch/destructive harnesses automatically.

[Ownership, installation, retained/retired settings and rollback](../../docs/torrent-cinema.md). CI workflows stay unchanged: the new checks run through the existing Hybrid test entry. The inherited inventory Markdown needed URL formatting only for the existing validator; inventory contents were preserved. No merge, production installation, security change or deployment occurred.
