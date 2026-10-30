# Isolated Android WebView fixture

Run `python3 audit/issue-125/google-tv/webview-probe/serve.py`, then reverse the selected port with ADB and launch the separately built debug Lampa with `issue125_probe_url` pointing to that origin. The production APK is never targeted.

The server reads the current canonical `trakt/trakt.js` and inserts `hook.js` before startup. Production helper functions, `finish()` and its idempotent writer remain unchanged. Plugin startup is intentionally suppressed; a controlled Lampa API facade and handoff replace the real website bootstrap. `api$1.get/addToHistory` are mocked, and Trakt+ UI confirmation is a stub. This is physical Android callback/handler/writer acceptance, not acceptance of the stock Lampa web UI, authenticated Trakt API or actual Trakt+ renderer. `/metadata` exposes both source and instrumented hashes. `hook.js` and all instrumented differences are reviewable.

`index.html` contains only fixture account data and episodes. Change its fixture identities and the matching native debug launch together for other scenarios. `?failfirst=1` makes the first history transport attempt reject with 503. Journal output defaults to `/tmp`; it records only controlled fixture metadata.

The debug Android-only intent extras `issue125_probe_url`, `issue125_probe_play`, and `issue125_probe_recreate` exist only under BuildConfig.DEBUG. They are not production APIs. The accompanying debug patch changes applicationId to a distinct package.
