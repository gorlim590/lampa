# Technical diagnostics

## Verified on this device

- Lampa is the Android native wrapper, not a desktop Chrome/WebView-only host.
- Installed versions are Lampa 1.13.5 and Just+ 2.5.1.
- The real Lampa torrent → Files flow opened a multi-item playlist in Just+.
- Just+ exposed per-item title metadata and an active-item transition from Season 3 Episode 7 to Episode 8 without returning to Lampa. The playlist is therefore real and episode switching occurs inside the player.
- The installed Lampa package declares/resolves `PlayerReportReceiver`.
- No `PlayerReportReceiver` line was found in the bounded logcat observation around the switch. This is **not proof that no callback occurred**: release logging may be silent, and the run did not inspect or instrument private receiver payloads.

## Source-confirmed wrapper behavior

The official Lampa v1.13.5 `MainActivity` builds a Just+ playlist and mutable explicit result callback, receives reports through `PlayerReportReceiver`, reads `positions_sec[]` and per-item `history[].duration_sec`, and translates changed item progress into Lampa Timeline updates. It can retain background reports for application resume. Its `handleJustPlusReport` accepts `end_by=interval`, but only applies a background interval report immediately when `keepPlayerConnection` is enabled. The Just+ launch path requests a 120-second interval only under the same setting. The installed setting value was not inspected.

At >=96% the released wrapper uses `VIDEO_COMPLETED_DURATION_MAX_PERCENTAGE=96` and normalizes a completed item to zero time/duration with percent 100. Separately, `playerAutoNext` can create the same completed marker for earlier playlist items when the active index advances. The source default is true, but the effective user setting on this device is unknown. The JavaScript layer therefore cannot safely treat `0/0/100` as measured completion. This is source-confirmed for the matching wrapper version, but neither a >=96% completion nor that auto-next preference was verified on the device.

## Just+ API compatibility caveat

The official Playlist API describes a full-snapshot `result_callback` on leaving/stopping/replacing a player session. The same current documentation is contradictory about `report_interval_sec`: its schema and callback list describe interval reports while playing, while the key's detailed note says the feature is ignored since v2.2.2. The user's v2.5.1 APK is release-only/closed-source; the public implementation source is older. Therefore periodic reporting and exact callback timing on this installed build remain **NOT VERIFIED**. Do not assume either “exit only” or “every 120 seconds” without a device capture.

## Where the watched sync can fail

1. **At an in-player switch:** Just+ keeps playing while Lampa is backgrounded. A switch alone is not a Lampa JS `Player.start`; it becomes actionable only if a result snapshot or interval report is delivered.
2. **At report normalization:** If the wrapper forwards <96% measured progress unchanged, the plugin can compare it with the configured threshold. At >=96%, the wrapper discards the distinguishing raw measurement. If auto-next is enabled, the previous episode may also be changed to the same zero/zero/100 shape regardless of its measured position. The plugin must fail closed in both ambiguous cases.
3. **At the Android/web boundary:** After raw progress is discarded by the wrapper, no JavaScript-only change can recover it. The installed receiver's existence proves the Android callback path is declared, not that a particular report was emitted/accepted.
4. **At Trakt/UI:** This device run had no threshold-eligible episode, so Trakt HTTP request, server acknowledgement, and UI refresh were not tested. Do not attribute this run to a Trakt API failure or stale cache.

## Required Android bridge patch

In the Android Lampa wrapper's Just+ result handling, preserve the current Timeline/resume normalization. Before raw report values are lost, emit a separate app-scoped JS bridge event for each accepted Just+ full snapshot with:

- native playback-session/report ID and launching card ID;
- exact immutable playlist index and that item's native Timeline hash;
- verified show identity, season (including 0), and episode number;
- `positions_sec[i]` and the matching visit's `duration_sec` from `history[]`;
- `end_by` and an explicit “real visit record exists” provenance flag;
- an explicit indication that an auto-next completion is synthetic, or omission from the measured-progress stream.

The bridge must not be gated by `Timeline` equality/deduplication: a repeated identical full snapshot must be able to retry a previously failed Trakt history write. The JS consumer must bind the payload to the current account/profile and external playback session, require exact S/E identity, positive measured duration, a real visit, and the configured threshold, then use the existing idempotent writer. Keep credentials and raw reports out of logs. Implement and test this in a separate Android wrapper change; do not install a modified APK automatically.

## Verification boundaries

| Claim | Classification |
|---|---|
| Real playlist handoff and same-session S03E07→S03E08 | VERIFIED on hardware |
| Lampa remains foreground during the in-player transition | VERIFIED on hardware |
| Callback immediately on episode switch | NOT VERIFIED |
| 120-second callback with installed v2.5.1 | NOT VERIFIED |
| Current `Keep Player Connection` setting | NOT VERIFIED |
| Callback after clean Back/exit | NOT VERIFIED |
| >=96% normalized report on installed device | NOT VERIFIED on hardware; source-confirmed behavior |
| Trakt history request/acknowledgement or indicator refresh | NOT TESTED |
| Plugin-only recovery of raw >=96% progress | UNSUPPORTED after native normalization |
