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
