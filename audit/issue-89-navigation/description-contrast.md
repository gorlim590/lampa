# Issue #89 — synopsis contrast check

- Date: 2026-10-30
- Browser: owner's existing Chrome DevTools session, Lampa page 3
- Route: `?card=125988&media=tv&source=tmdb` (Silo)
- Tested viewport: 1280×720 CSS px, DPR 1
- Additional read-only viewport checks: 1920×1080 and 3840×2160 CSS px, DPR 1. At 1080p computed description size was 26.69px; at 4K it was 53.38px, with the same solid fill, opacity 1 and no mask. Screenshots for both are captured directly at those viewport dimensions.
- Source: exact local `ui/stremio-hybrid.js` served from the branch preview (`127.0.0.1:8769`); fetched bytes matched the working source SHA during this check.

The synopsis is rendered as a native Details text node inside the secondary-information group. The production CSS now explicitly sets a consistent light text fill and subtle dark text shadow, and disables mask, opacity fading, line clamp, clipping and text background/filter on that description. Browser-computed values were: `color=rgb(244, 242, 250)`, `-webkit-text-fill-color=rgb(244, 242, 250)`, `opacity=1`, `-webkit-mask-image=none`, `max-height=none`, `overflow=visible`. The final paragraph line is fully visible in the screenshot; the visible contrast gradient comes from the cinematic backdrop behind the translucent panel, not a fade applied to the text.

Screenshot: `screenshots/silo-description-720-final.png` (captured directly from the browser at 1280×720; not resized).
