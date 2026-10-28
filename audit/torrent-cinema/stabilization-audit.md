# Torrent Cinema stabilization audit log

Date: 2026-10-28 (Europe/Kyiv)

## Baseline and scope

- Base: latest fetched `origin/main`, `901eef3cf0ff96dc89013812e4867820319602c4`.
- Branch: `fix/torrent-cinema-stabilization`.
- No #120 changes added. The existing historical #117 worktree and unrelated dirty checkout were preserved.
- No live parser/account settings were read or changed. No actual torrent or TorrServer request was made.

## Runtime inspection

- `cua.getState()` reported browser use disabled in Work settings.
- Read-only CDP connection to `127.0.0.1:9222` succeeded. The sole available tab was `https://siaivo.isroot.in`; `window.Lampa`, Lampa controllers, Torrent Cinema and native overlay surfaces were absent.
- The existing browser runner reloads its current tab. It was not run against this non-Lampa target. Therefore this audit has no live DOM dump, computed-style snapshot or screenshot for this branch.
- Upstream native Lampa Select, Modal, Loading, Torrent, Player and Controller interfaces were inspected to establish expected lifecycle events and ownership.

## Confirmed source causes

1. The page-wide `body:has(> .sh-torrent-overlay:not([hidden])) > .modal` override changed every native modal while Torrent Cinema was open. Native standalone Loading surfaces had no equivalent owner layer.
2. The custom Select surface lacked an explicit owned layer; native Select did not have a scoped stacking contract relative to Torrent Cinema.
3. The old navigation flattened control groups, did not scroll offscreen controls into view and could keep focus on hidden/unavailable controls.
4. Sort/Other Tracker close callbacks reactivated the torrent controller during native Select close handling. Filter/Search could also race native focus restoration.
5. `style.css` contained an accidental JavaScript template-literal fragment.

These are confirmed source causes, not a claim that the deployed UI was reproduced. Runtime reproduction requires a Lampa tab.

## Validation log (sanitized)

Commands run from the stabilization worktree:

```text
rtk node --check tests/torrent-cinema-browser.cjs                         PASS
rtk node --check tests/helpers/torrent-cinema-browser-fixture.cjs         PASS
rtk node scripts/build-torrent-cinema.mjs                                 PASS
rtk node scripts/build-torrent-cinema.mjs --check                         PASS
rtk git diff --check                                                      PASS
rtk node scripts/check-repository.mjs                                     PASS
  Checked JavaScript syntax in 77 files.
  Checked plugins.json manifest (43 entries).
  Parsed 558 URLs; checked first-party GitHub Pages paths against both branches.
rtk node --test tests/torrent-overlay.cjs tests/torrent-cinema-inline.cjs \
  tests/torrent-cinema-lifecycle.cjs tests/torrents-cinema.cjs tests/hybrid-ui.cjs
  PASS 72/72, 0 failures.
```

Generated artifact SHA-256 at this checkpoint: `fe1b53b8f61e981489cdecd4e66678361ef84e4e3b9e0d0f07541e6ab0600b9d` (`ui/torrent-cinema.js`).

## Browser acceptance matrix

The existing-CDP runner was extended to verify these cases using native Lampa components and a controlled parser/TorrServer fixture. It has not been executed on this branch because no Lampa tab was available.

| Case | Acceptance evidence to collect | Status |
| --- | --- | --- |
| Native Other Trackers, Sort and Filters/Search menus | remote OK; computed z-index; `elementFromPoint`; `select` controller | NOT RUN |
| Quality/UA/tracker/settings/rows | arrow-only focus walk from initial torrent; visible selector; scroll restoration | NOT RUN |
| Torrent row → Files → native Loading → Player boundary | DOM ancestry/layer hit-test/controller; no real media playback | NOT RUN |
| TorrServer connection and preload failure | native error surface visibility and controller | NOT RUN |
| Delayed and cancelled preload | Loading ownership; Back restores Files/controller and scroll/focus | NOT RUN |
| Repeated selection / Back | native one-shot `Torrent.back` callback rearmed each time | NOT RUN |
| Hybrid and standalone at 1280×720, 1920×1080, 3840×2160; 1920×1080 DPR 2 | CSS viewport/DPR, geometry and screenshots | NOT RUN |

No secrets or account data are included. The browser runner, once run on the authorized Lampa tab, writes its sanitized checks and screenshots under `audit/torrent-cinema/`.

## Lifecycle follow-up (2026-10-29)

- Reused the initialized authorized tab at the existing Lampa URL; Chrome reported `Chrome/156.0.8078.4`, `window.appready === true`, `window.Lampa` present, active component `full`.
- Inspected the installed native Select callbacks. The observed close sequence was `preshow` → `fullshow` → controller `select` → `hide` (with `Select.opened() === false`) → `close`; the controller can remain `select` after the close callback and changes independently. A newly shown menu therefore cannot safely be handled by a zero-delay `opened()` poll.
- Inspected and exercised native `Loading.start/stop` without torrent playback or requests: controller ownership changes synchronously to `loading`; generic `.loading-layer` is inserted after 500 ms; `.media-loading--standalone` is inserted synchronously; `stop()` cancels a pending generic layer or removes a visible one and restores the previous controller. A 650 ms run confirmed the delayed surface remains present while loading continues. These are native browser observations, not physical TV tests.
- The runtime now releases Select ownership on native `hide`, restores focus only after the same Select closes and the overlay controller owns focus, and ignores replacement menus. Files close no longer clears the selection on a zero-delay timer; the selected release remains armed through the subsequent native Loading/Files/player/Back controller events. Loading surface observation is limited to the native surface creation window (1.5 s maximum, native generic insertion at 500 ms) and disconnects as soon as the surface appears or Loading is cancelled/stopped, so a long-running load does not retain an observer.
- Added `tests/torrent-cinema-native-lifecycle.cjs` for replacement Select, same-menu focus restoration, Files close handoff, delayed generic Loading, synchronous media Loading, and observer cancellation. The existing `tests/torrent-overlay.cjs` entry loads this focused suite, so the current CI workflow covers it without workflow permission changes. Focused tests: **78/78 PASS** across native lifecycle, lifecycle, overlay, inline, legacy torrent and Hybrid suites. Build freshness and `git diff --check`: **PASS**.
- Exact branch artifact after rebuild: `ui/torrent-cinema.js`, 156,522 bytes, SHA-256 `0a866d9e27e4c1b2b424c39beecae029ef772933cdc9ccdd66c280855b697458`.
- The existing end-to-end runner was attempted in both Hybrid and standalone modes against this artifact. Both **FAIL before layout capture**: the synthetic Details torrent action calls `Activity.push` with the expected fixture ID/source while the Full page and stream pane are active, but the installed runtime enters native activity `torrents`; the custom overlay is closed and its 12 fixture rows are not rendered. Each run times out waiting for result rows and restores the original URL/tab. This is a confirmed browser integration blocker (not a Select/Loading unit-test failure); no 720p/1080p/4K screenshots, Select elementFromPoint checks, Files loop or focus matrix are claimed as passed. Runner diagnostics now preserve the sanitized transition evidence.
- Follow-up commits `fa13a9a` and `8c554a6` were pushed to the existing Draft PR branch; final HEAD is `8c554a6bfaab0f5c3030de6ae1e73f73baa0ce30`. All five GitHub Actions checks on this final HEAD **PASS**.

### Current acceptance status

| Area | Status |
| --- | --- |
| Installed native Select/Loading lifecycle inspection | PASS |
| Focused lifecycle regressions and artifact freshness | PASS |
| Hybrid browser matrix | FAIL before first layout; overlay route hands off to native Torrent activity |
| Standalone browser matrix | FAIL before first layout; same native activity handoff |
| Select z-order/hit test, D-pad matrix, Files/Back loops | BLOCKED by overlay not remaining open in the existing runner |
| GitHub Actions on follow-up head | PASS (5/5) |
| Physical Google TV | NOT TESTED |

## Final main-browser verification (2026-10-29)

The owner authorized checks in the existing main Chrome tab. The tab was kept on the Silo Details URL, and the local build of `ui/torrent-cinema.js` was loaded into that page before opening Torrent Cinema. The final artifact at this checkpoint is 159,746 bytes, SHA-256 `fbf57d83846ef27e42c16710a414f93b0a9c5173c1272c0018a57f74bee34362`. At test time the actual browser CSS viewport was emulated as 3840×2160 at DPR 1; this is browser viewport evidence, not a physical 4K screen claim. The original 1920×937 DPR 1 viewport and saved S01 filter were restored after testing.

- **Release titles — PASS:** the real Silo result `... S1-2 ...` displays `S01–S02`; single-season releases show S01, and S02/S03 episode releases show their actual episode coverage. Tests also cover `S01-S03`, `Seasons 1-3`, episode packs and complete-season text. No coverage is inferred from TMDb.
- **Real Silo tracker counts — PASS / clarified:** with the native season filter temporarily set and then restored, the real configured parser returned 20 S02 rows (Mazepa 13, The Pirate Bay 7, Toloka 0) and 20 S03 rows (Mazepa 2, The Pirate Bay 18, Toloka 0). Each response reported one configured endpoint successful, zero pending and zero failed. Raw row `Tracker` fields matched the visible tracker labels. This parser endpoint is distinct from the torrent tracker. Earlier real Toloka S02 evidence was for Arcane (14 Toloka rows), not Silo; it does not conflict with Silo's actual tracker distribution. Tracker ranking remains Toloka, Mazepa, then other sources.
- **Remote navigation — PASS:** native remote arrow keys traversed header → quality → trackers → filter action → results. Left/Right traversed tracker chips, OK on Toloka applied its filter (5 S01 rows), and OK on All restored all 14 S01 rows. Right from a release enters Info and remains there; Down moves to the next release; Back collapses expanded details first.
- **Native layers and Back — PASS:** Sort and Filters Select surfaces rendered at z-index 120 above Torrent Cinema at 100; screenshots show the native Select above the list. `elementFromPoint()` returned the page background because this Lampa remote UI disables pointer hit testing; no hit-test pass is claimed. Parser Settings rendered at z-index 110 and Back returned focus to Filters. Native Files rendered at z-index 130, exposed 10 file entries, and Back returned to the selected release. The loading/player UI layer had previously been observed at z-index 140/150; this final pass did not start playback.
- **4K layout — PASS:** final-artifact screenshot `main-browser-silo-s01-multiseason-3840x2160.png` is an independently rendered 3840×2160 DPR 1 viewport. The modal, filter rows, multi-season title, rows and Sort Select were inspected. Earlier exact-browser checks also recorded Files → Player UI, but the selected Silo file showed “Відео не знайдено або пошкоджено”; a visible Player surface is not evidence that video playback started.
- **Evidence files:** `main-browser-silo-s01-multiseason-3840x2160.png`, `main-browser-silo-s02-3840x2160.png`, `main-browser-silo-s03-3840x2160.png`. S02/S03 counts and raw Tracker fields were rechecked in the live main browser; the saved season preference was restored to S01.

The production change for this pass synchronizes D-pad navigation with the currently focused DOM element, maps Info focus back to its owning release before vertical movement, and recognizes compact multi-season forms such as `S1-2` and `Seasons 1-3`. Standalone mode and physical Google TV remain untested in this final pass.
