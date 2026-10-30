# Issue #89 — focused navigation and Similar row acceptance

Date: 2026-10-30. Browser: owner's existing Chrome DevTools session, page 3 only. The page was restored to the original Silo URL and 1920×937 viewport after checks. Page 4 and other tabs were not touched.

## Why “Подібні” can look cut off

The Home/Details content is a vertical native Lampa feed. While focus remains on the preceding row, Lampa exposes only the next row's upper edge as a preview. When D-pad focus enters “Подібні”, native scrolling moves the focused card into view. In this check the card itself was not clipped at the bottom in any tested viewport:

| CSS viewport / DPR | Similar row bounds after focus | Focused card bounds | Result |
|---|---:|---:|---|
| 1280×720 / 1 | y=287…709 | y=322…682 | Fully visible |
| 1920×1080 / 1 | y=403…1036 | y=455…966 | Fully visible |
| 3840×2160 / 1 | y=735…2001 | y=839…1920 | Fully visible |

The first two are captured as `screenshots/similar-focused-720.png` and `screenshots/similar-focused-1080.png`. The 4K measurement is from the live DOM after native D-pad navigation; no physical 4K TV was used.

This points to a partially visible next-row preview, not an inaccessible/overflowing Similar row. Press Down to focus the row; the native feed scrolls it fully into view. No CSS change was justified by this observation.

## Related live navigation observation

On the Dune Details page, Up from the Director card moved to the nearest preceding Details-zone control (“Додаткова інформація”) and scrolled that target into view. This is spatial navigation between zones, not a Torrent jump. Enter on the Director card invoked Lampa's native person route; Escape returned to the same movie with Director focus restored. No unexpected Activity transition occurred during arrow navigation.

The `Виробництво 1` action was absent in the final local-source check, including when the native network-logo container was missing. Its unit regression verifies that it remains hidden and its focus is transferred to a visible section control if needed.

## Limitations

- Physical Google TV acceptance: NOT VERIFIED.
- The legacy standalone browser suite requiring CDP port 9222: NOT VERIFIED; this acceptance used the authorized Chrome DevTools connection.
- A real Torrent-row → Files action was not performed because the browser action approval rejected Enter on a real release row as a possible playback/torrent operation. No playback or download was started. Native Files lifecycle remains covered by deterministic tests only for this pass.

## PR #136 final hardening — 2026-10-30

The installed browser showed two native Full navigation states during real D-pad use: `full_start` for the hero and, depending on the path, either the native `full_descr` controller or the same `full_start` controller for the Details collection. The implementation now supports both: when native `full_descr` is not active, it scopes the existing Full Start collection to the Details row instead of assuming an unregistered controller; Back restores the hero collection and Torrent focus.

On the same Silo route and exact current local `ui/stremio-hybrid.js` bytes (preview SHA-256 `8aea7e40830a82d1487c56b366b36a997a63e0b83835d448012072fc85d95955`):

- Torrent → ArrowDown → Comments: the native route entered Details and CSS focus matched `Controller.link.last`.
- Back collapsed the open Comments disclosure; the next Back returned to hero with Torrent focused and `link.last` matching. Down re-entered Details, including the repeated path where `full_start` owned the scoped Details collection.
- Rapid Down → Enter on collapsed Comments and Studios activated the visible disclosure once; ArrowRight → Enter on the focused Studios control collapsed only that control.
- Additional Information → Genre → Enter opened native Select. Escape returned to the exact Genre control with `Controller.link.last` matching and the original card URL restored.
- ArrowDown to a native comment card → Enter → Escape returned to the same comment card with the native Full controller and `link.last` matching; no duplicate action was observed.

The local script was removed by restoring the original Silo URL with a page navigation. The original viewport (1920×937, DPR 1) is restored; other tabs and saved state were untouched.

Regression additions cover the production organizer un-hiding late text/actions/cards, fast same-turn ArrowDown/ArrowRight → OK with one action, and Full Start `link.last` isolation from actor/Details zones without an artificial Torrent focus call.

## PR #136 review follow-up — 2026-10-30

On the same authorized Chrome tab (page 3, Silo, 1920×937/DPR 1), the current working-tree `ui/stremio-hybrid.js` was served from the branch preview and its response SHA-256 was verified as `902cce6885015d0aed2f10c5e54a5cb305dea30f6852277c3e321d8addf22bb4`.

- Real remote ArrowDown followed immediately by Enter moved focus from Коментарі to Студії та виробництво. CSS focus equaled native `full_start` `Controller.link.last`; only the Studio disclosure handler ran once, and neither the previous Comments action nor Additional Information ran.
- Native Genre Select → Escape returned to the exact Жанр control in the native `full_descr` controller, with `link.last` matching and Select closed. No filter value was selected.
- The production-organizer regression now places an existing episode row before two initially empty rows. It verifies the first content lookup still chooses the episode, complete visibility reconciliation hides both empty rows, then a provider action inserted in the later row makes only that row visible on the next adaptation while preserving node identity and order.
- A production-handler regression verifies native `full_start` collection ownership through delayed provider adaptation and return from cast/episode and Select contexts; focus and `link.last` remain on the remembered Details control or exact Select origin.
- Focused `details-presentation.cjs`: **48/48 passed**. Full local CI-command matrix: Repository checks and checker **PASS (16)**; UI/repository regression batch **477/477**; Home history **227/227**; Home order **54/54**; Parser providers **187/187**; Seasons **235/235**.
- The branch preview and temporary browser event observers were removed by reloading the original Silo URL. The page returned to the original 1920×937/DPR 1 viewport with default Torrent focus; no other tab, profile data, settings or Trakt state was changed.

Physical Google TV acceptance remains **NOT VERIFIED**.
