# UA Comments attribution and local ownership

Original author: **Ярослав / @Yaroslav_Films**.
Original source credited by the mirror: http://lampalampa.free.nf/uacoments.js

Pinned distribution: https://github.com/marv2on/lampa-plugins-sync/blob/main/sync/Yaroslav/uacoments.js
Git blob: `869619491257aa70e4ebff14e2365a46ad67a2b2` (91,258 bytes).
The mirror distributes this repository under its root MIT License,
Copyright (c) 2026 marv2on; the exact license is retained in `LICENSE`.
The upstream file itself carries no separate conflicting license header.
Attribution preserves both the original author and the mirror distributor.

`uacoments.upstream.js` is the exact reference snapshot, not an extra plugin to load.
`media/ua-comments.js` is the local derivative; rebuild with
`python3 audit/ua-comments-20261023/build-local.py` from the workspace root.
Local modifications: one initialization, page-owned request cancellation and timers,
page-scoped/coalesced observation, eight-entry/5-minute successful-result cache,
40-card pagination, lightweight Hybrid styling, escaped author text, and support for
short JSON responses. Original source matching, parsers, settings and comment viewer
are retained. Comments are read-only; the local adapter does not add posting.

The existing remote icons, provider APIs, original proxy settings and fallback service
remain external dependencies. Vendoring JavaScript does not make these services local,
prove their availability, or grant additional rights to third-party comments/media.
No author credentials, user data or API secrets are included in this snapshot.
