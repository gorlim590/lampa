# Phase 6 browser QA

This setup attaches to the already-running dedicated Lampa Chromium at CDP `127.0.0.1:9222` and reuses its one open Lampa tab. It does not create a browser, tab, context, or profile. The profile may contain authenticated data: never inspect/export cookies, credentials, local databases, or saved values. The runner only checks that Chromium's process uses the dedicated profile path.

## Run

1. Keep the existing dedicated Chromium and tab open.
2. From this branch worktree, start the loopback asset server if it is not already running:

   ```sh
   node audit/settings/phase6-browser/serve.cjs
   ```

   It binds only to `127.0.0.1:8766`, serves a fixed branch allowlist, rejects non-GET methods, exposes CORS SHA headers, and reports the checkout SHA at `/health`.
3. Run the stable integration flow:

   ```sh
   node audit/settings/phase6-browser/run.cjs
   ```

   The runner requires the existing dedicated profile process and exactly one open Lampa tab. It does not reload the page. It intercepts `Lampa.Storage.set` in memory, supplies the opt-in primary-entry value in memory, removes Cookie/Authorization headers from requests, and blocks auth/account/history/playback services, sensitive query parameters, API writes, and external writes. It never reads or logs stored values. It completes the same Native Settings → Hub → search → YDesign owner → Back → Hub root → Standard Settings flow twice, then checks a fresh open and native root Back.

## Asset and module evidence

`manifest.json` lists 13 first-party modules served from the active branch. The runner verifies loaded module source URLs from the in-page runtime report. `browser-evidence.json` records CORS response body SHA-256 values for the loader, manifest, and module assets, checked against branch files; Hybrid separately loads `settings-hub.js` and `torrent-overlay.js`. Do not use a published GitHub Pages deployment as PR source evidence.

Hybrid is the one visual owner. Interface+ remains active through its presentation contract; its standalone header style must remain absent while Hybrid owns the header. YDesign supplies vertical cards/badges, and Cardify+ remains the original details/settings owner. Third-party or external core behaviors remain unverified unless their actual owner source is available and safe to exercise.

## Safety and limitations

- The existing browser profile is treated as potentially authenticated. No profile storage or credential values are read, reset, copied, or written by the QA harness.
- Trakt authentication, account mutations, history/sync actions, API-keyed metadata requests, playback, and torrent/server operations are blocked or not invoked. Details composition and live torrent-overlay interaction are not proven by this run.
- The existing launcher `test-lampa.js` specifies a 1920×1080 viewport. The already-running CDP tab reports an unbounded 7680×3812 viewport at DPR 0.25; viewport overrides do not apply through the attached page, so browser dimensions are left untouched. Screenshot artifacts are 1920×1080 crops from the actual rendered page, not emulated TV acceptance.
- This is desktop Chromium evidence only. Physical Google TV remains unverified.
- Keep the loopback server on the current branch worktree. After changing branches, stop only this server and restart it from the intended worktree; do not replace or restart Chromium. Leave the browser and profile open.
