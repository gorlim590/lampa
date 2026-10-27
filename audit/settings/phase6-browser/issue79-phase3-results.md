# Issue #79 Phase 3 — browser and ownership checkpoint

## Browser run

| Field | Result |
| --- | --- |
| Tested source SHA | `6df1263291d1a8ffdbf6762f2391ec283e10e471` |
| Browser mode | Existing dedicated Chromium over CDP; one existing Lampa tab; real Lampa Controller keyboard navigation |
| Result | PASS for the bounded Hybrid startup, Settings rail and Hub mount scenario |
| Browser | Chromium `156.0.8078.4`; process/profile and original tab survived |
| Test preference | `stremio_hybrid_enabled` set to Так through native Settings in the dedicated test profile; persistent after normal reload. `stremio_hybrid_primary_settings` was not changed. |
| Account safety | Treated the profile as potentially authenticated. Trakt API/auth hosts were blocked; this run made no Storage overrides and read no Storage values. No account, playback or destructive actions were invoked. |
| Viewport | Left unchanged. It varied naturally from `7680×3812` to `7680×4320` at DPR `0.25` across reload; screenshot is a crop, not 1080p/device acceptance. |

The run checked the local server's commit pin and CORS body/header SHA, routed the active Hybrid and Hub scripts from the current branch, checked exact committed bytes for the five allowlisted UI assets, waited for live presentation registration and rendered Home cards, navigated the native Settings rail with D-pad keys, opened the Hub, used Back to return to usable native Settings without a re-entry loop, and confirmed the same process/tab remained. No page exceptions were recorded. Routes and page-error listeners were removed in `finally`; no Storage functions or temporary globals were changed.

The tested browser asset hashes were:

| Asset | SHA-256 |
| --- | --- |
| `ui/stremio-hybrid.js` | `d0ab195493f31d1d2fbbfb9641dc4364895f6bcfae486bb7951445b67c11878f` |
| `ui/settings-hub.js` | `aeb9e77bb50622e5811b9e0210499c0dec0bf1b6663cde7d43df97e993986288` |
| `ui/design-optimized.js` | `6bce398af8d1f85faaeca7721a94540a0c73571038932fb475fcf76d7c1a0dcf` |
| `ui/interface-plus.js` | `9537df254948a908cc21b03647740d1c8f59458828d7378e7c51c584f85a5d0d` |
| `ui/cardify-plus.js` | `934cc71a1e95781b4daa1f1f39aa495ae88cc83a3bcd27bdd9f489cf65abc6bb` |

Screenshot: [Hub root](issue79-hub-root.png). This is a safe Settings-only screenshot captured from the existing tab; its crop is not evidence of a physical TV or a true 1080p viewport.

## Runtime ownership snapshot

| Module / responsibility | Observed state | Ownership boundary / status |
| --- | --- | --- |
| Stremio Hybrid | Active; version `3.0.0-early-shell-phase1`; init 1, style insertion 1, shell transitions 1; exact branch asset routed | Canonical shell, header, Settings rail, overlay/focus adapters; no duplicate Hybrid stylesheet observed. |
| Settings Hub | Contract 1; one mount; Hub route owned; exact branch asset routed by Hybrid | Internal Hybrid Settings presentation, not a competing theme. |
| Interface+ | Presentation contract 1; `ifx_header_css` absent while Hybrid active | Functional options and metadata remain Interface+ owned; standalone header fallback yields to Hybrid. |
| YDesign | Version `3.4.3-ua`; 42 vertical cards; 11 Ukrainian badge elements | Card content/orientation and badge metadata remain YDesign owned; no migration in this change. |
| Cardify+ | 11 registered Settings parameters | Settings/template owner remains Cardify+; Details screen was not opened in this bounded run. |
| Legacy Cardify | No `ui/cardify.js` script in this tab | Not active in this snapshot; no extension setting was changed. |
| Native Settings rail | 29 routes; previously CSS-colliding OMDB routes are now visible/focusable | Hybrid copies route identity into a namespaced attribute; native owner callbacks and native nodes remain intact. |
| Trakt / torrent / Screensaver+ | No service action or media operation attempted here | External service behavior, Details composition and torrent/saver interaction remain unverified by this run. |

The prior architecture matrix in [PLUGIN_COMPATIBILITY.md](../../../docs/PLUGIN_COMPATIBILITY.md) records wider owner context. Module registration and settings presence do not establish full functional or device compatibility.

## Confirmed change and test evidence

The live page exposed the defect that the earlier isolated fixture missed. A third-party CSS rule targets the exact native `div[data-component]` IDs; Hybrid copied those IDs onto its own route rows. This hid both rows in the rail. The fixed rows use `data-sh-settings-component`, so the third-party native selector no longer matches them. No original plugin menu, callback, handler, storage key or plugin source was removed or rewritten.

The original runner assertions also overclaimed behavior: native Settings `render()` returns detached folder nodes whose computed style is not reliable, so it cannot infer their later CSS visibility. The revised browser assertions exercise the resulting visible rail. Native return from the Hub root deliberately lands on the native first folder rather than immediately reopening the Hub; the runner now checks native usability and no re-entry, not a false Hub-row focus expectation.

Focused suite: **68 passed, 0 failed** across Hybrid, Hub lifecycle, Registry, bootstrap and header menu. Syntax checks and `git diff --check` passed. Startup timing from this one reload was Hybrid script start `3313.9 ms`, shell applied `3318.7 ms`, first shell frame `3356.2 ms`, and Lampa ready `7853.3 ms`. These are fixture/host-specific observations without a comparable baseline; they do not prove a startup optimization or identify the host delivery delay. Physical Google TV remains NOT VERIFIED.

## Remaining acceptance gaps

- Exercise real Details/Cardify composition, torrent fullscreen overlay, Hybrid disabled fallback and full Settings search/owner Back flow only when it can be done without mutating the existing authenticated profile; use safe synthetic fixtures where needed.
- Determine whether the host's published-plus-preview duplicate script deliveries can be reduced without changing loader order or breaking standalone fallbacks.
- Measure before/after startup only under a comparable asset/cache state; this patch does not alter overall startup architecture.
- Complete D-pad, Back, text legibility and focus acceptance on physical Google TV. The Hub primary-entry preference stays off by default.
