# Google TV pause suppression and Now Watching — 2026-10-31

## Scope and safeguards

- Device: Google TV Streamer 4K; Just+ Player 2.5.1; separate Android app `top.rootu.lampa.issue125probe` (Lampa v1.13.5 source, versionCode 581).
- Production Lampa `top.rootu.lampa` and Just+ were not modified. No app data was cleared.
- No history POST was allowed during this acceptance. Existing Ted Lasso E01–E04 history was not replayed; the four-write allowance remains exhausted.
- The active WebView JS URL was `https://gorlim590.github.io/lampa/trakt/trakt.js?v=20261028-torrent-cinema-2.0.0`, SHA-256 `9ed680d5355e8c51928f5ee2e601f3fa957059a286f9bd76f681f7320a981bf3`. The parallel APK remains `artifacts/issue125/lampa-1.13.5-issue125-site-test.apk`, SHA-256 `3fd009efdd0ef9777c59a7a11c29b056d9e5b6fab7dc0e070187696e1f29ecf3`.

## Physical pause-suppression result

This is a seek-based integration check using actual Just+ positions and durations. It verifies bridge and Trakt decision behavior; it is not a claim that the episodes were watched in real time.

| Local time | Native session / item | Measured position | JS / network decision | Result |
|---|---|---:|---|---|
| 07:15:18 | E05, index 6 | 1395/1865 = 74.80% | first measured interval started `/scrobble/start`; HTTP 201, `action=start` | E05 became active Now Watching |
| 07:17:18 | E05, index 6 | 1604/1865 = 86.01% | interval updated E05 progress | Still below custom 90% history threshold |
| 07:19:18 | E05→E06; indexes 6→7 | E05 1662/1865 = 89.12%; E06 60/1903 = 3.15% | Just+ next produced a later interval snapshot. JS decision for E05 was `external_pause_suppressed`, reason `progress_too_high`; neither `/scrobble/pause` nor `/scrobble/stop` was sent for E05. E06 `/scrobble/start` returned HTTP 201, `action=start`. | No high-progress pause 422 and no default-threshold watched stop |
| exit | E06, index 7 | 133/1903 = 6.99% | `live_scrobble_pause`, reason `external_session_ended`; `/scrobble/pause` HTTP 201; no `/scrobble/stop` | Current activity closed without a watched stop |

The E05/E06 playback session UUID is redacted in this report. The configured Watch Sync threshold was 90%. E05 stayed under 90%; E06 stayed far below it. A read-only history check after the session showed no E05 or E06 event. No history write was attempted by this test.

The existing successful readback identified the only authorized event IDs as E01 `event-E01 (redacted)`, E02 `event-E02 (redacted)`, E03 `event-E03 (redacted)`, and E04 `event-E04 (redacted)` (one unique event ID per episode). The current run added no IDs. Do not infer idempotency from only a `[1,2,3,4]` episode array; these are distinct history event identifiers.

## Now Watching and UI result

During an active E06 session, a read-only `GET /users/me/watching` returned one episode object with `action=scrobble`, Trakt show ID 162639, season 1, episode 6, `started_at=2026-10-31T05:20:57Z`, and `expires_at=2026-10-31T05:54:57Z`. This identifies the correct active episode at that sample. The expiry timestamp is the server's reported expiry, not a physically observed expiry transition.

The earlier HTTP 401 was a diagnostic-call bug, not evidence of stale authorization or a Trakt failure. The caller used `api.get(path, {cache:false})`, but this API signature is `get(path, unauthorized=false, options={})`; the options object was interpreted as `unauthorized=true`, so the request omitted bearer auth. Repeating the read-only request with the correct call `api.get('/users/me/watching', false, {cache:false, withMeta:true})` returned HTTP 204 with no body. The response was observed after the E06 session had been paused for hours, so it confirms there is no active Now Watching item now; it does not physically establish when the server expired the earlier item.

The actual Siaivo page rendered after return, but its home UI did not expose a direct Now Watching card that could independently confirm the episode or expiry. Thus live start and the correct active E06 read during playback are confirmed, while UI expiry transition is **not fully confirmed**. A sanitized corrected read is recorded in `pause-suppression-events.jsonl`.

## Reload and process lifecycle

During E06, with actual progress below threshold, the real Siaivo page was reloaded. After reload, `Lampa.PlayerPlaylist.get().length` was 0 and the JS handoff was absent. Native reports for E06 at 486/1903 and 606/1903 reached the receiver. Both failed JS acknowledgement six times at the bounded retry schedule. The raw report was therefore not consumed; no history or scrobble request was made for those reports.

The parallel package was force-stopped while Just+ was paused, and the app process disappeared. An explicit launch started a new process and restored the normal Siaivo page with app data intact. This confirms process termination/relaunch, but not pending-report recovery after process death: there was no pending callback at the moment of the kill. Ordinary WebView reload loss is confirmed; automatic handoff reconstruction is not implemented.

## Targeted regressions

`tests/trakt-scrobble-session.cjs` now includes:

- external episode transition boundary matrix: 79% sends a safe pause; 80%, 89%, 90%, 95%, 99%, and 100% send neither pause nor stop and start only the next episode;
- WebView reload with no reconstructed handoff: stale native report is rejected without raw ACK, history write, or scrobble mutation.

Focused suite: `node --test tests/trakt-scrobble-session.cjs` — 50/50 PASS.

## Acceptance verdict

- **Pause suppression >=80%:** physically confirmed in the parallel APK on E05→E06; E05 was 86.01% at decision time; no E05 pause/stop request was sent.
- **Live start:** physically confirmed by HTTP 201 `action=start` for E05/E06.
- **High-progress history safety:** no new history writes; prior unique event IDs E01–E04 unchanged; E05/E06 absent.
- **Low-progress exit pause:** HTTP 201 for E06 at 6.99%.
- **Now Watching:** correct E06 returned once by read-only endpoint during playback. The earlier 401 was caused by a malformed diagnostic call; the correctly authenticated read now returns HTTP 204 after the paused session expired. Expiry timing and a matching UI transition are unverified.
- **Reload recovery:** fails closed and exhausts bounded retries; **not ready** for production reliability.
- **Process-death pending recovery:** not tested with a pending event. The native pending raw snapshot and JS history completion state are volatile / Activity-saved state, not a durable process-independent queue. Durable retry is not implemented or verified.

Do not mark Issue #125 complete or PR #138 ready to merge. The tested pause fix is ready for owner review, while full Now Watching and reload/process-death recovery remain blockers.
