> Updated physical callback evidence: [Independent Callback Probe results](callback-probe-results.md). In particular, interval=120 is now VERIFIED on Just+ 2.5.1. Earlier observations below are retained as historical evidence.

# Technical diagnostics

## Verified on this device

- Lampa is the Android native wrapper, not a desktop Chrome/WebView-only host.
- Installed versions are Lampa 1.13.5 and Just+ 2.5.1.
- The real Lampa torrent → Files flow opened a multi-item playlist in Just+.
- Just+ exposed per-item title metadata and an active-item transition from Season 3 Episode 7 to Episode 8 without returning to Lampa. The playlist is therefore real and episode switching occurs inside the player.
- The installed Lampa package declares/resolves `PlayerReportReceiver`.
- No `PlayerReportReceiver` line was found in the bounded logcat observation around the switch. This is **not proof that no callback occurred**: release logging may be silent, and the run did not inspect or instrument private receiver payloads.
- The native Lampa menu was opened read-only. Its action said “Увімкнути утримання сокета”, establishing that `Keep Player Connection` is OFF. The menu was closed with Back without changing the setting.
- The real Just+ queue exposed 10 items. In the matching v1.13.5 wrapper source, multi-item playlist conversion is guarded by `playerAutoNext`; the source default is true and has no preference override in that file. This confirms the active playlist/auto-next path for this launch. No app setting was toggled.

## Source-confirmed wrapper behavior

The official Lampa v1.13.5 `MainActivity` builds a Just+ playlist and mutable explicit result callback, receives reports through `PlayerReportReceiver`, reads `positions_sec[]` and per-item `history[].duration_sec`, and translates changed item progress into Lampa Timeline updates. It can retain background reports for application resume. Its `handleJustPlusReport` accepts `end_by=interval`, and the Just+ launch path requests a 120-second interval only when `keepPlayerConnection` is enabled. On this device that setting is OFF, so Lampa did not request periodic reports. The expected earliest delivery is the Just+ full result snapshot when leaving/stopping its current session; that callback was not conclusively observed.

At >=96% the released wrapper uses `VIDEO_COMPLETED_DURATION_MAX_PERCENTAGE=96` and normalizes a completed item to zero time/duration with percent 100. Separately, `playerAutoNext` creates the same marker for earlier playlist items when the active index advances, regardless of measured position. The 10-item queue confirms this path was active. The JavaScript layer therefore cannot safely treat `0/0/100` as measured completion. This is source-confirmed for the matching wrapper version, but neither a >=90% progress report nor a >=96% completion was reproduced on the device.

## Just+ API compatibility caveat

The official Playlist API describes a full-snapshot `result_callback` on leaving/stopping/replacing a player session. The same current documentation is contradictory about `report_interval_sec`: its schema and callback list describe interval reports while playing, while the key's detailed note says the feature is ignored since v2.2.2. The user's v2.5.1 APK is release-only/closed-source; the public implementation source is older. Therefore periodic reporting and exact callback timing on this installed build remain **NOT VERIFIED**. Do not assume either “exit only” or “every 120 seconds” without a device capture.

## Where the watched sync can fail

1. **At an in-player switch:** Just+ keeps playing while Lampa is backgrounded. `Keep Player Connection` is OFF, so the wrapper does not request its 120-second report. A switch alone is not a Lampa JS `Player.start`; synchronization is deferred until the player delivers a result when it leaves/stops.
2. **At report normalization:** When a full snapshot is handled, auto-next completion overwrites previous items with zero/zero/100 even if their real measured progress was 90–95%. At >=96%, the native completion normalizer independently produces the same shape. The plugin must fail closed on both ambiguous cases. Therefore a delivered final report can still lose valid >=90% evidence before reaching JS.
3. **At the Android/web boundary:** After raw progress is discarded by the wrapper, no JavaScript-only change can recover it. The installed receiver's existence proves the Android callback path is declared, not that a particular report was emitted/accepted.
4. **At Trakt/UI:** This device run had no threshold-eligible episode, so Trakt HTTP request, server acknowledgement, and UI refresh were not tested. Do not attribute this run to a Trakt API failure or stale cache.

## Prepared Android bridge patch

The exact source patch is stored in [`native-bridge-v1.13.5.patch`](native-bridge-v1.13.5.patch), based on the Android wrapper tag that matches the installed version. It preserves the current Timeline/resume normalization. Before raw report values are lost, it emits a separate app-scoped JS event for each accepted Just+ full snapshot with:

- native playback-session/report ID and launching card ID;
- exact immutable playlist index and that item's native Timeline hash;
- verified show identity, season (including 0), and episode number;
- `positions_sec[i]` and the matching visit's `duration_sec` from `history[]`;
- `end_by` and an explicit “real visit record exists” provenance flag;
- an explicit indication that an auto-next completion is synthetic, or omission from the measured-progress stream.

The bridge is not gated by `Timeline` equality/deduplication, so a repeated full snapshot can retry a failed Trakt history write. The paired JS consumer in this branch binds the event to the current in-memory external playlist snapshot, account/profile generation, exact S/E, positive duration, real visit, and configured threshold, then uses the existing idempotent writer. Credentials and raw progress are not logged. The Android patch has not been compiled or installed, and the event is not present in the current APK.

## Verification boundaries

| Claim | Classification |
|---|---|
| Real playlist handoff and same-session S03E07→S03E08 | VERIFIED on hardware |
| Lampa remains foreground during the in-player transition | VERIFIED on hardware |
| Callback immediately on episode switch | NOT VERIFIED |
| 120-second callback with installed v2.5.1 | NOT REQUESTED by Lampa in this configuration; player behavior NOT VERIFIED |
| Current `Keep Player Connection` setting | VERIFIED OFF by read-only native menu |
| Callback after clean Back/exit | NOT VERIFIED |
| >=96% normalized report on installed device | NOT VERIFIED on hardware; source-confirmed behavior |
| Trakt history request/acknowledgement or indicator refresh | NOT TESTED |
| Plugin-only recovery of raw >=96% progress | UNSUPPORTED after native normalization |
| Controlled JavaScript raw-report tests | PASS, 179/179 with transition/session regressions | Tests use fixtures and mocked Trakt writes only |
| Native wrapper compile/install | NOT VERIFIED | Patch passes static diff checks; compatible Android build toolchain is unavailable |
