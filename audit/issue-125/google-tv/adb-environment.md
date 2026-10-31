> Latest evidence: [compiled native/WebView acceptance](native-webview-acceptance.md). Earlier build/callback limitations below are historical; stock production WebView and real Trakt/UI remain unverified.

> Updated physical callback evidence: [Independent Callback Probe results](callback-probe-results.md). In particular, interval=120 is now VERIFIED on Just+ 2.5.1. Earlier observations below are retained as historical evidence.

# ADB environment (sanitized)

- Device: Google TV Streamer 4K, Android 14 / API 34.
- ADB: wireless device was already authorized after the user supplied a one-time pairing code; connection and pairing endpoints are intentionally omitted.
- Lampa: `top.rootu.lampa`, version `1.13.5`, version code `581`; Android native wrapper with WebView.
- Just+: `com.justplus.player`, version `2.5.1`, version code `2005001`.
- Just+ launch Activity resolves to `com.brouken.player.PlayerActivity`.
- Lampa `PlayerReportReceiver` component is declared/resolvable in the installed package.
- TorrServer/parser settings were not changed.
- Trakt credentials/account settings were not read or changed. No history write was made.
- `run-as top.rootu.lampa` is denied because this is a non-debuggable production package. `Keep Player Connection` was verified OFF through its native read-only menu label (“Увімкнути утримання сокета”); the menu was closed without selecting it. The Trakt completion threshold remains unread because it belongs to the Android WebView's private Lampa storage.
- ADB shell, package inspection, foreground Activity/window inspection, MediaSession inspection, and remote key input were available.

No LAN address, pairing code, account data, transport URL, or torrent identity is included.
