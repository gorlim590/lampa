# ADB environment (sanitized)

- Device: Google TV Streamer 4K, Android 14 / API 34.
- ADB: wireless device was already authorized after the user supplied a one-time pairing code; connection and pairing endpoints are intentionally omitted.
- Lampa: `top.rootu.lampa`, version `1.13.5`, version code `581`; Android native wrapper with WebView.
- Just+: `com.justplus.player`, version `2.5.1`, version code `2005001`.
- Just+ launch Activity resolves to `com.brouken.player.PlayerActivity`.
- Lampa `PlayerReportReceiver` component is declared/resolvable in the installed package.
- TorrServer/parser settings were not changed.
- Trakt credentials/account settings were not read or changed. No history write was made.
- `run-as top.rootu.lampa` is denied because this is a non-debuggable production package; private preferences cannot be inspected through that route. `Keep Player Connection` was not toggled, and its current value remains unknown.
- ADB shell, package inspection, foreground Activity/window inspection, MediaSession inspection, and remote key input were available.

No LAN address, pairing code, account data, transport URL, or torrent identity is included.
