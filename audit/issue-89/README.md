# Issue #89 Details page evidence

## Scope

The Hybrid Details adapter keeps Lampa's native movie, TV, genres, comments, studio/network, related-list, and episode nodes. It moves existing nodes with their listeners rather than cloning them. The episode preview and native season/episode renderer remain intact.

The page now renders three matching disclosure rows in this order: **Коментарі** (open by default), **Студії та виробництво**, and **Додаткова інформація**. The native “Детально” heading is hidden while those rows are active. Genre labels are descriptive only; the existing shared native **Жанр** selector remains the sole genre-filter action. “Пов'язані списки” and the existing genre/keyword controls live inside “Додаткова інформація”. Disabling/restarting Hybrid restores the original nodes, positions, handlers, and classes.

## Main Chrome browser acceptance

Tested in the existing connected Chrome DevTools session on the Silo TV Details route:

`https://siaivo.isroot.in/?card=125988&media=tv&source=tmdb`

The exact branch `ui/stremio-hybrid.js` bytes were injected reversibly into the existing page. The main Chrome was not replaced and no Storage, extension settings, parser settings, credentials, or Trakt data were changed.

- Actual D-pad/OK opened and closed the comments disclosure; focus stayed on its toggle.
- The shared native Genre control inside Additional Information opened Lampa's native Select; Escape returned focus to the invoking control.
- The duplicate “Детально” heading was absent; the episode preview remained one native row.
- The related-lists control was inside the collapsed Additional Information section.
- At 1280×720, 1920×1080, and 3840×2160 CSS viewport with DPR 1, all three disclosure rows had identical left edge and width, and document horizontal overflow was false.
- At initial page reload, the native `full_start` controller focused “Торренти”.
- The original URL and viewport (1920×937, DPR 1) were restored after testing.

The before screenshot shows the native page while optional comments were still in its loading state. The after screenshot shows the same route after the configured comment source returned real comments; this is visual evidence, not a controlled provider-content comparison.

| State | Screenshot |
| --- | --- |
| Main before | [details-before-1920x1080.png](details-before-1920x1080.png) |
| Issue #89 branch after | [details-after-1920x1080.png](details-after-1920x1080.png) |

## Limits

Physical Google TV remote/hardware acceptance has not been performed. Browser viewport emulation does not prove device rendering. This initial acceptance used the Silo TV route; the focused follow-up below adds a real movie route.

## Focused UX/correctness follow-up — 2026-10-29

The final branch source (`ui/stremio-hybrid.js` SHA-256 `3a623cf617cc9c659b2f1e295a25020be9b1fc7d203d7abf8c2104f0fe7196ac`) keeps the native Lampa Scroll owner in control. After native Arrow navigation, the adapter now calls the active Full Details component's `scroll.immediate(focused)` in one animation frame. A prior attempt to call DOM `scrollIntoView()` did not work reliably because Lampa's managed scroll position subsequently replaced it; that approach was removed. All three rows use one restrained circular chevron treatment and the existing high-contrast TV focus outline.

On the existing main Chrome page, exact local `ui/stremio-hybrid.js` bytes were loaded reversibly. The live TV route was `?card=125988&media=tv&source=tmdb` (Silo), and the movie route was `?card=1384216&media=movie&source=tmdb` (The Dog Stars). Actual remote-key behavior:

- On both routes, the initial native focus remained **Торренти**. The movie rendered no season controls.
- Three delayed `Lampa.Listener.send('full')` adaptations retained the same connected native Genre control inside Additional Information and preserved its focus.
- ArrowDown reached Comments and its first comment card. The focused comment card was inside the viewport after native scrolling (movie at 1920×1080: y=131..362; Silo at 3840×2160: y=436..810).
- Enter opened/collapsed each disclosure. Escape collapsed the focused open disclosure and left Details active. From Genre, Enter opened Lampa's actual native Select; Escape closed Select and restored focus to the exact originating Genre control, then another Escape collapsed Additional Information.
- The comments source and content were real page data; no fixture or DOM-only replacement was used. No Storage, credentials, Trakt history or saved preferences were changed.

### Alignment geometry

The disclosure group is a child of `.full-start-new` and uses its content width. It no longer uses the fixed negative-left/extra-width workaround. Measurements are CSS pixels at DPR 1, comparing disclosure-group edges with the parent content box:

| Viewport | Left edge delta | Right edge delta | Horizontal overflow |
| --- | ---: | ---: | --- |
| 1280×720 | −0.014 px | +0.014 px | No |
| 1920×1080 | −0.014 px | +0.014 px | No |
| 3840×2160 | −0.011 px | +0.011 px | No |

### Same-state TV screenshots

Before/after screenshots below use the same Silo route, initial Torrent focus, native top scroll position, loaded media content and DPR 1. The 4K images are actual 3840×2160 browser captures. Movie before/after images use the same The Dog Stars route and 1920×1080 viewport; the additional movie screenshot shows the open Comments row and native comment carousel.

| View | Before | Branch after |
| --- | --- | --- |
| 1280×720 | ![TV before 1280×720](acceptance-2026-10-29/tv-before-1280x720.jpg) | ![TV after 1280×720](acceptance-2026-10-29/tv-after-1280x720.jpg) |
| 1920×1080 | ![TV before 1920×1080](acceptance-2026-10-29/tv-before-1920x1080.jpg) | ![TV after 1920×1080](acceptance-2026-10-29/tv-after-1920x1080.jpg) |
| 3840×2160 | ![TV before 3840×2160](acceptance-2026-10-29/tv-before-3840x2160.jpg) | ![TV after 3840×2160](acceptance-2026-10-29/tv-after-3840x2160.jpg) |

Movie comparison: [before](acceptance-2026-10-29/movie-before-1920x1080.jpg), [after](acceptance-2026-10-29/movie-after-1920x1080.jpg), [open Comments](acceptance-2026-10-29/movie-comments-after-1920x1080.jpg).

The main tab will be returned to its original Silo URL and 1920×937 viewport after verification. Physical Google TV acceptance remains outstanding.

## Final lifecycle hardening — 2026-10-29

The targeted production change now scopes the Details key listener to the active Full activity and its native `full_start` / `full_descr` controller, verifies the same native Scroll owner before each animation-frame scroll, and yields while Select, Modal, Torrent, Player, or any other controller owns input. The Back wrapper delegates to native Back whenever Details is not the active input owner. The legacy “Детально” suppression now hides only its empty heading node; it leaves its `items-line` and other children intact. Disclosure mounting follows available native Comments/production/metadata nodes and does not depend on the old heading text.

Production-handler regressions pass **18/18**, including native overlay/controller isolation, delayed/partial metadata, no-metadata cleanup, repeated adaptation and 20 teardown cycles. The focused Details/Hybrid/Trakt/Torrent suite passes **268/268**; repository and syntax checks pass.

The exact final source was injected reversibly in the existing Chrome tab. On Silo and The Dog Stars, native focus initially remained on **Торренти**; The Dog Stars had no season controls. D-pad/OK opened and closed Comments and Studio; Escape collapsed an expanded section without leaving Details or showing an exit dialog. Native Genre Select opened under controller `select`; Escape restored focus to the same Genre control. Silo Torrent Cinema displayed live configured results; selecting the first release opened the native **Файли** modal (`z-index:130`) above the Torrent Cinema overlay (`z-index:100`), and Back returned to that release before the next Back closed the popup and restored Torrent focus. No playback was started. On a later reload the Comments provider displayed its real empty state, “Коментарі не знайдено”; the disclosure remained mounted and navigable.

Final-source screenshots are actual browser captures with CSS viewport and DPR 1. The rendered screenshot dimensions match each viewport; `screen.width/height` remained 1920×1080 during 4K emulation, so this is viewport evidence, not physical 4K panel or Google TV evidence.

| Viewport | Content-box left/right alignment error | Horizontal overflow | Screenshot |
| --- | ---: | --- | --- |
| 1280×720 | −0.014 / −0.014 CSS px | No | [final TV 720p](acceptance-2026-10-29/final-tv-1280x720.png) |
| 1920×1080 | −0.014 / −0.014 CSS px | No | [final TV 1080p](acceptance-2026-10-29/final-tv-1920x1080.png) |
| 3840×2160 | −0.011 / −0.011 CSS px | No | [final TV 4K viewport](acceptance-2026-10-29/final-tv-3840x2160.png) |

Browser profile, tabs, settings, Storage, parser configuration, credentials, and Trakt history were preserved. The interactive route and viewport are restored after the final checks. Physical Google TV remains unverified.

On implementation commit `a42fa3814f291f0eada13868fa9f26f076da8992`, all five GitHub Actions passed. The Seasons workflow log confirms `details-presentation.cjs` executed in the 205/205 passing Details/Hybrid/Trakt regression step. A final evidence-only checkpoint will rerun CI on its own head.
