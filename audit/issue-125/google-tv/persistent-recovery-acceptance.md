# Persistent Just+ session recovery — 2026-10-31

## Scope

This acceptance uses the separate `top.rootu.lampa.issue125probe` package on the Google TV Streamer 4K. The production `top.rootu.lampa` app, Just+ Player, TorrServer, site configuration, and Trakt history were not modified. The only Trakt API calls in the recovery exercise were the parallel app's ordinary read requests; no `/sync/history` write was made. E01–E04 were not replayed.

The real site origin was `http://siaivo.isroot.in`. TMDB show ID is **97546**; Trakt show ID is **162639**. The real Siaivo season torrent had a ten-item playlist. The recovery exercise used Ted Lasso S01E07 at native index 6. Its saved native descriptor and browser candidate each contained ten indexed entries. The current snapshot was 454/1928 seconds (23.55%), below the configured 90% threshold.

## Implemented persistence boundary

- Android stores a versioned Just+ descriptor in the app-private `storagePrefs`: random session UUID, show/card ID, exact indexed hash and S/E identities, creation time, and no Trakt bearer token or stream URL.
- The receiver accepts a callback only for the active stored session. It commits the sanitized measured snapshot into a bounded SharedPreferences queue (64 reports, 2 MiB total) before asking an Activity/WebView to handle it. The report stores only safe measured fields and a generated report ID.
- The Trakt JS module persists a matching recovery candidate in site-origin `localStorage`: show/episode identities, native session ID after binding, profile ID, and a native-computed SHA-256 token fingerprint. The token itself is never written to the candidate.
- Once the Trakt module has attached its listeners, it reads the native descriptor, validates age, session, show, index/hash/S/E, profile and token fingerprint, reconstructs the handoff even if `Lampa.PlayerPlaylist.get()` is empty, then requests replay of the native queue.
- Eligible history is durably queued in a bounded localStorage outbox. The native ACK means the exact report is either handled below threshold or stored in that JS outbox; it does not mean Trakt confirmed the history write. After a successful POST, the code performs a read-back and stores a unique event ID when Trakt exposes it. Before retrying an uncertain POST, it checks the exact show/episode/time window to avoid duplicate writes.
- Retry backoff grows exponentially and is capped at six hours. 401/403 are blocked pending owner reauthentication; a token/profile mismatch never replays under another owner. The queue is capped at 64 pending and 128 receipts.

## Physical process-death exercise

A real Siaivo/Just+ playback session was at E07, index 6. The parallel Lampa process was killed with `run-as ... kill -9` while Just+ remained active; app data was not cleared. Pressing Home caused Just+ to send its final user snapshot to the test package. Android started a new app process to receive it. The receiver's SharedPreferences queue survived; the new Activity reconstructed the native session and produced the E07 raw snapshot with exact index/S/E/hash match.

The first cold WebView had not loaded the Trakt module. The parallel Siaivo page's plugin loader listed only its three configured scripts; it did not request the repository Trakt script. The native report therefore received six bounded `raw-ack-false` delivery attempts and remained in the durable native queue. This was a real, useful failure: the transport survives process death, but session recovery cannot execute until the Trakt JS module exists.

After attaching the exact configured script URL through the debug APK's local test override, the WebView loaded the repo's latest JS asset (SHA-256 below). The plugin handshake restored the exact candidate and the persisted descriptor, replayed the pending E07 report, and native ACK changed to true. The report was below 90%, so it caused no history enqueue or write. This proves process-death recovery **after the Trakt handler becomes ready**, and proves the cold-page delay while the configured plugin is absent. It does not prove that the current site configuration loads Trakt automatically on every cold home screen.

Sanitized correlated times (device local time, 2026-10-31):

| Time | Event | Evidence |
|---|---|---|
| 16:49 | Test app process killed while Just+ remained open; no `pm clear` | ADB process lifecycle; subsequent receiver-started process |
| 16:50:02.524 | E07 user snapshot handled, 454/1928 sec, ten-entry descriptor | `Issue125Bridge` `handle`; index 6 hash/S/E matches true |
| 16:50:06–16:50:37 | Cold WebView delivery ACK false across bounded retry schedule | `Issue125Bridge` `raw-ack-false` |
| 16:52:50.094 | Test APK served the exact patched Trakt JS through local override | `Issue125SiteOverride`, SHA-256 `4057ba0b…e7d3cad` |
| 16:52:51.813 | Pending E07 report ACK true after plugin handshake/replay | `Issue125Bridge` `raw-ack-true` |

The persistent log `persistent-recovery-events.jsonl` contains only these sanitized stage summaries. Session UUIDs, token fingerprints, raw hashes, private URLs, and Trakt event IDs are not published.

## WebView reload and retry

- A reload preserves Android's descriptor and report queue. The JS candidate and history outbox survive through the site origin's localStorage. The regression tests recreate a new JS module instance over the same localStorage and native descriptor; the restored report is accepted only when owner/profile/session/index/hash/S/E match.
- A dedicated regression now models a 503 before process restart, then a fresh JS instance drains the same stable episode identity, reads back its unique mock event ID, and ACKs duplicate callbacks without a second write.
- The Google TV physically exercised a previous 503 → mock-success retry. The newest read-back-ID behavior is covered by the updated regression suite; no new real Trakt history write was made.
- If the site never loads the Trakt module, the report remains durable and is not falsely ACKed. After six short delivery attempts, a later JS `recoverJustPlusSession()` calls the native replay method when the plugin eventually initializes. The short native delivery retry budget is not the history retry budget.

## Remaining boundaries

1. Current cold Siaivo home did not request `trakt.js`; this test explicitly loaded it via the test-only URL override. The owner's actual plugin registration/autoload must be corrected or verified on the configured site before this can be called fully automatic.
2. `localStorage` is persistent across ordinary WebView reload and app process death, but clearing site data/removing the parallel app destroys the JS-side recovery candidate/outbox. Native descriptor does not contain the bearer token and will fail closed if owner proof is absent.
3. A successful sync response does not always return event IDs. The code records a unique read-back event ID when available; if read-back itself fails, the accepted API response is retained but the event ID list may be empty. Do not treat that case as independent proof of server-side idempotency.
4. Now Watching updates are still interval-driven. The earlier physical run showed a 120-second Just+ interval was processed after returning to Lampa, not continuously while the external player covered the WebView. Continuous live status remains unverified.
5. Android production patch is a source patch for upstream v1.13.5, not a signed release APK. The installed APK is debug-only and has WebView diagnostics plus a local JS override.

## Regression checks

`tests/trakt-scrobble-session.cjs` covers owner-bound reload restoration, stale session/profile/token rejection, durable 503 queue across a fresh JS realm, successful unique event-ID read-back, duplicate callback idempotence, and exact 90% threshold behavior. The test APK build compiles the production-compatible Android bridge plus debug-only instrumentation; the native debug patch is kept separate from the production bridge patch.
