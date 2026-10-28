## Summary

Stabilizes Torrent Cinema's native overlay ownership and remote-control lifecycle from latest `main` (`901eef3cf0ff96dc89013812e4867820319602c4`). This does not include unfinished #120 multi-parser work. No merge or deployment is requested.

## Confirmed source causes

- A broad `body:has(.sh-torrent-overlay) > .modal` override elevated every native modal while Torrent Cinema was open, while native standalone Loading surfaces had no scoped owner layer.
- Native Select had no explicit owned layer relative to Torrent Cinema.
- The D-pad adapter flattened logical groups, did not scroll offscreen controls into view, and could focus unavailable controls.
- Sort/Other Trackers callbacks reactivated the stream controller during native Select close; Filter/Search could race native focus restoration.
- `style.css` contained an accidental JavaScript template-literal fragment.

These causes are confirmed by source and upstream native interface inspection. The configured CDP tab was not Lampa (`window.Lampa` and Torrent Cinema were absent), so the deployed failure was not reproduced. No live account/parser settings were changed. The existing runner reloads its current tab and was not run on the unrelated page.

## Changes

- Add scoped classes and cleanup for owned Torrent/Files, Select, Loading, Search/keyboard and Player surfaces. Remove the page-wide modal override.
- Rebuild directional navigation across header, quality, tracker, settings/filter and torrent-row groups; scroll targets into view and hold focus ownership through native Select callbacks.
- Preserve native Torrent/Files/Loading/Player and rearm the one-shot Torrent.back callback for each selection.
- Remove accidental JavaScript from CSS; regenerate canonical `ui/torrent-cinema.js`.
- Extend browser fixtures and runner for actual native Lampa surfaces, hit testing, D-pad reachability, delayed/failing/cancelled transport and both standalone/Hybrid modes. Document reproducible matrix and rollback.

## Evidence

- Focused tests: 72/72 PASS (`torrent-overlay`, `torrent-cinema-inline`, `torrent-cinema-lifecycle`, `torrents-cinema`, `hybrid-ui`).
- Repository checker PASS: 77 JS files, 43 manifest entries, 558 URL paths.
- Browser runner and fixture syntax PASS; canonical build freshness and `git diff --check` PASS.
- Generated artifact SHA-256: `fe1b53b8f61e981489cdecd4e66678361ef84e4e3b9e0d0f07541e6ab0600b9d`.
- Browser acceptance is explicitly NOT RUN: only connected tab was not Lampa. No screenshots or live computed DOM results are claimed. Physical Google TV, live providers, real TorrServer, playback and tracks remain unverified.

The detailed sanitized log and matrix are in [`stabilization-audit.md`](stabilization-audit.md); operational matrix and rollback are in [`docs/torrent-cinema.md`](../../docs/torrent-cinema.md).

## Files changed

- Runtime/style and generated artifact: `ui/torrent-cinema/runtime.js`, `ui/torrent-cinema/style.css`, `ui/torrent-cinema.js`.
- Regression/browser checks: `tests/torrent-overlay.cjs`, `tests/torrent-cinema-inline.cjs`, `tests/helpers/torrent-cinema-browser-fixture.cjs`, `tests/torrent-cinema-browser.cjs`.
- Audit/rollback docs: `docs/torrent-cinema.md`, `audit/torrent-cinema/stabilization-audit.md`, `CODEX_PROGRESS.md`.

## Rollback

Revert this stabilization commit (or close this draft and reset the branch) to restore the previous `ui/torrent-cinema.js` and runtime/style source. Leave unrelated #117 and #120 work untouched. Do not merge/deploy until the real-Lampa browser matrix has been run and reviewed.
