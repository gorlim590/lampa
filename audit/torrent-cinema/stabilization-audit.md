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
