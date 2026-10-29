# Issue #89 Details page evidence

## Scope

The Hybrid Details adapter keeps Lampa's native movie, TV, genres, comments, studio/network, related-list, and episode nodes. It moves existing nodes with their listeners rather than cloning them. The episode preview and native season/episode renderer remain intact.

The page now renders three matching disclosure rows in this order: **Коментарі** (open by default), **Студії та виробництво**, and **Додаткова інформація**. The native “Детально” heading is hidden while those rows are active. Genre chips use the real media genres and forward OK to the native genre selector. “Пов'язані списки” and the existing genre/keyword controls live inside “Додаткова інформація”. Disabling/restarting Hybrid restores the original nodes, positions, handlers, and classes.

## Main Chrome browser acceptance

Tested in the existing connected Chrome DevTools session on the Silo TV Details route:

`https://siaivo.isroot.in/?card=125988&media=tv&source=tmdb`

The exact branch `ui/stremio-hybrid.js` bytes were injected reversibly into the existing page. The main Chrome was not replaced and no Storage, extension settings, parser settings, credentials, or Trakt data were changed.

- Actual D-pad/OK opened and closed the comments disclosure; focus stayed on its toggle.
- Actual OK on an existing genre chip opened Lampa's native Select; Escape returned to the same Details activity.
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

Physical Google TV remote/hardware acceptance has not been performed. Browser viewport emulation does not prove device rendering. Movie, anime feature-film, episodic anime, and dorama routes were covered by shared media-agnostic code and regression tests, but the live connected page used for browser acceptance was Silo TV.
