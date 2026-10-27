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

   The runner requires the existing dedicated profile process and exactly one open Lampa tab. It does not reload the page or create contexts. It temporarily intercepts `Lampa.Storage.set`, supplies the opt-in primary-entry value through a temporary `get` wrapper, removes Cookie/Authorization headers from requests, and blocks sensitive service calls, API writes, and external writes while recording only safe origin/count metadata. It never inspects or logs stored values. This is **not complete Storage isolation**: the app may read its existing settings normally, and the browser profile must continue to be treated as authenticated. If Hybrid is initially off, the runner enables it only in memory after installing the Storage write interceptor and restores the original active state in `finally`. It completes Native Settings → Hub → search → YDesign owner → Back → Hub root → Standard Settings twice, then fresh-open/root-Back and Hybrid off/on checks. Search input is entered in Lampa's native keyboard; its visible native confirmation control is activated directly because the native `keybord` controller does not expose that control as a focusable item. This does not verify physical remote confirmation. The runner removes its Storage wrappers, Settings observer and page route in `finally`, checks restoration, disconnects Playwright and verifies that the same Chromium process and CDP tab survive.

   The canonical runner also performs an intentional assertion failure before UI navigation. This exercises the same cleanup path after a failed assertion; `cleanup-check.json` records the result. If stale native keyboard DOM remains while both Settings and keyboard state are closed, the runner removes those transient `.settings-input` nodes created by its prior modal interactions before capture/cleanup. It never removes nodes while an input or Settings panel is active. The expected-failure child evidence is deleted after its sanitized cleanup summary is checked.

For startup-stage diagnosis, `run-phase4-startup.cjs` injects the temporary `startup-probe.js` at document start and records its SHA with each run. It distinguishes DOMContentLoaded, first Lampa global availability, the `appready === true` transition, first native `ContentRows('main')` call/data callback, first visible untransformed native card, first visible YDesign-transformed card, Hybrid shell, initial focused Home card/controller, and the first observed Arrow-key focus change under the native controller. It also records bounded long-task timings and a resource waterfall that redacts non-allowlisted paths and all queries. It does not inspect Storage. The focused-card marker is only focus availability; the Arrow-key marker requires a changed focused card and is not physical remote acceptance. The probe is isolated instrumentation, not a production script.

To collect up to three warm runs of the exact branch only (without mixing the old local preview as a comparison), use `LAMPA_PHASE7_ONLY=1 LAMPA_PHASE4_TRIALS=3 node audit/settings/phase6-browser/run-phase4-startup.cjs`; output goes to `phase7-startup-results.json`. The runner still uses the existing CDP tab and route, and blocks Trakt API/auth. **Do not run it against an authenticated profile until local Storage/service write safety has been explicitly checked for the target configuration**: the probe itself is read-only, but a normal Lampa/plugin reload can persist application state. It never clears profile data or claims first D-pad key-response time from focus presence alone.

## Asset and module evidence

`manifest.json` lists 13 first-party modules served from the active branch. At server startup and on every request, allowlisted assets are checked against their committed Git blobs, the checkout SHA is rechecked, and dirty allowlisted files or changed HEAD fail with HTTP 409. The runner verifies CORS response body SHA-256 values and server hash headers against checked-out files. A dirty or stale checkout cannot be reported as committed source. The server binds only to `127.0.0.1`; do not use a published deployment as PR source evidence.

Hybrid is the one visual owner. Interface+ remains active through its presentation contract; its standalone header style must remain absent while Hybrid owns the header. YDesign supplies vertical cards/badges, and Cardify+ remains the original details/settings owner. Third-party or external core behaviors remain unverified unless their actual owner source is available and safe to exercise.

## Persistent visual test profile

For the dedicated test profile's normal Home/Settings verification, enable the main Hybrid switch once through **Settings → Інтерфейс → Stremio × Lampa → Так** (`stremio_hybrid_enabled`). This is a UI-only preference change in that isolated profile; it persists through reloads and is reversible by choosing **Ні** in the same row. The production setting behavior/default is unchanged. Do not change `stremio_hybrid_primary_settings` as part of this setup: it is a separate opt-in that keeps native Settings as the default entry unless explicitly tested.

The phase 6 fixture runner can still provide temporary values for its isolated Hub-routing scenarios. It is not needed to activate Hybrid in the persistent UI test profile. Never copy account/session data into a disposable state or treat the existing profile as unauthenticated.

To verify the persisted profile and exact current branch without Storage overrides, set `LAMPA_TEST_CHROMIUM_PROFILE` locally to the dedicated profile directory and run `node audit/settings/phase6-browser/run-issue79.cjs`. The runner requires the existing CDP browser and tab, verifies `/health`, CORS and asset hashes, routes the canonical Hybrid/Hub scripts from the branch allowlist, blocks Trakt API/auth hosts, exercises native D-pad/Back and exits by detaching without calling `browser.close()`.

## Safety and limitations

- The existing browser profile is treated as potentially authenticated. The runner does not inspect, reset or copy profile values. Although `Storage.set` is intercepted, application reads may still use existing preferences; this harness does not claim full Storage isolation.
- Trakt authentication, account mutations, history/sync actions, API-keyed metadata requests, playback, and torrent/server operations are blocked or not invoked. Details composition and live torrent-overlay interaction are not proven by this run.
- The existing launcher `test-lampa.js` specifies a 1920×1080 viewport. The already-running CDP tab reports an unbounded 7680×3812 viewport at DPR 0.25; viewport overrides do not apply through the attached page, so browser dimensions are left untouched. Screenshot artifacts are 1920×1080 crops from the actual rendered page, not emulated TV acceptance.
- This is desktop Chromium evidence only. Physical Google TV remains unverified.
- Keep the loopback server on the current branch worktree. After changing branches, stop only this server and restart it from the intended worktree; do not replace or restart Chromium. Leave the browser and profile open.
