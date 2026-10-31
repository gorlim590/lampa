> Latest physical results: [native/WebView acceptance](../audit/issue-125/google-tv/native-webview-acceptance.md). This includes a compiled separate Android build and executed-source hashes; stock website/real API/UI acceptance remains open.

# Issue #125 — Trakt episode transitions

## Runtime event boundary

Trakt Core can observe these Lampa-side signals:

- `Lampa.Player.listener` `start`, `ended`, `destroy`, `error`, `external`, and `visibility` events.
- `Lampa.Timeline.listener` `update` events with a timeline hash and playback road (`time`, `duration`, `percent`). A matching hash is required before progress can affect a media identity.
- For Lampa's internal video element only, DOM `playing` and `pause` events from `Lampa.PlayerVideo.video()` provide a playback confirmation and current element position.

`Player.start` identifies a player/media handoff, but does not by itself confirm playback. A new Trakt START still waits for a matching advancing Timeline sample or the active internal video `playing` event. A new `Player.start` for a different, identified episode now ends the previous active session using its last confirmed progress. If that progress meets `trakt_min_progress`, it goes through the existing idempotent history writer; otherwise no history write is attempted.

The Timeline hash remains the association boundary. Stale samples for an earlier hash are ignored after a transition. Episode identity uses the show ID and exact season/episode fields resolved from the player event/hash metadata; unknown identity cannot create a show-history write. Two selected files from the same torrent are separate when Lampa supplies distinct exact S/E metadata, even if the Timeline hash is unchanged. For a same-hash, different-episode transition, subsequent Timeline events are ambiguous and ignored for that playback instance; an active internal Lampa video can supply progress from its own `playing`/`timeupdate` events. If those events are unavailable (including external players) or Lampa supplies no distinct episode metadata, the plugin safely sends no inferred watched history.

## Trakt writes and account safety

- Watched history is written through the existing authenticated `finish` / `api.addToHistory` path, only after the configured threshold is confirmed.
- Existing retry and 409-as-already-recorded behavior remain in place. Completion cache, request deduplication, and locks are scoped by Trakt account; stale callbacks are guarded by both token and playback/profile generation. Tokens are not emitted in logs.
- After Trakt acknowledges a show-history write, the affected show's Trakt+ progress is refreshed. Verified aired/watched counts, per-episode evidence (when returned by the endpoint), and Up Next are written into the existing account-bound cache; `traktplus:watched` notifies card/Details consumers. The full watched-library import is not rerun and Home is not reconstructed.
- A Trakt+ refresh is coalesced per account/profile/show. The cooldown starts only after a confirmed successful refresh; failures remain retryable, and overlapping history confirmations trigger a follow-up read for the newest episode. Forced reads supersede earlier in-flight reads so stale responses cannot update watched state or UI. Identical progress snapshots do not emit another watched event or redecorate rows.

## External-player compatibility: Just+ Player

The Just+ integration uses the supported Android Lampa bridge, not a guessed JavaScript API. The official Lampa Android wrapper's `configureJustPlusPlaylistIntent()` builds the nested `playlist.items` Bundle from its saved `PlayerPlaylist`, including each available item's `tmdb_id`/`imdb_id`, `season`, `episode`, URI, resume position, and an explicit mutable `result_callback` PendingIntent. `PlayerReportReceiver` forwards that result to the live Android Lampa activity. The wrapper then converts each changed playlist item's position/duration into `Lampa.Timeline.update()` and invokes the retained item-open callbacks. Verified against released Lampa wrapper tag v1.13.5: [MainActivity](https://github.com/lampa-app/LAMPA/blob/v1.13.5/app/src/main/java/top/rootu/lampa/MainActivity.kt), [PlayerStateManager](https://github.com/lampa-app/LAMPA/blob/v1.13.5/app/src/main/java/top/rootu/lampa/PlayerStateManager.kt), and [PlayerReportReceiver](https://github.com/lampa-app/LAMPA/blob/v1.13.5/app/src/main/java/top/rootu/lampa/receivers/PlayerReportReceiver.kt).

Trakt snapshots the exact, uniquely resolvable season/episode identities from `Lampa.PlayerPlaylist.get()` at the external-player handoff. The snapshot is scoped to that active handoff rather than a fixed 10-minute timer, so ordinary 45–60 minute episodes and long multi-episode sessions remain eligible. A later external handoff, unrelated player start, account change, or profile change invalidates the snapshot. After the Android wrapper returns per-item Timeline updates, the plugin uses the update's exact Timeline hash to select that snapshot entry and applies the configured completion threshold through the existing account-scoped, idempotent Trakt history writer. Initial completion requires advancing position and positive measured duration. Pending and confirmed entries remain idempotent. The history writer performs bounded internal retries, and the plugin permits a later retry if another eligible callback arrives; however, runtime retry after those attempts is **not guaranteed** because Android emits Timeline updates only for changed entries and persists the changed value. Missing S/E, a conflicting hash shared by different episodes, stale account/profile generation, regressing progress, or missing duration fail closed. Same torrent/transport URL across episodes is not used as identity. This permits Just+ to report more than the final episode after the user returns, when its playlist result contains usable per-item positions and durations.

| Runtime | Confirmed capability | Boundary |
| --- | --- | --- |
| Internal Lampa player | Player start, Timeline events, and the active HTML video element provide episode association and advancing position. Exact S/E plus the configured threshold can finalize history during playback. | If identity/progress is ambiguous or unavailable, history is not written. |
| Official Lampa Android wrapper | Source supports the Just+ nested playlist Bundle and routes result callbacks to per-item `Lampa.Timeline.update()` events. The Trakt plugin consumes those events using the captured playlist identity map. | A separate official-source v1.13.5 debug build physically exercised receiver/deferral/raw bridge/WebView/actual finish() with mocked transport. Stock production website handoff reconstruction and real authenticated API/UI remain unverified. |
| Just+ Player v2.5.1 | Official [Playlist API](https://github.com/just-plus-player/just-plus-player/blob/master/docs/PLAYLIST_API.md) documents per-item `positions_sec`, `history[]`, `duration_sec`, and `result_callback`. The user's installed v2.5.1 was exercised on the Google TV Streamer with a real 10-item Lampa playlist and an in-player S03E07→S03E08 switch. Its package/version and player metadata were confirmed by ADB. | Independent physical receiver tests verified recurring 120-second reports, Home/Back and completion callbacks on v2.5.1. Immediate per-switch callback was not observed in the bounded runs. The public documentation contradicts this verified interval behavior. |

The public Playlist API documentation is internally inconsistent about interval reports. Physical Probe evidence resolves this for the installed v2.5.1: callbacks occurred at 120.452, 240.453 and 360.455 seconds, with real positions 118/238/358 of 596 seconds. The owner's production Keep Player Connection was read-only verified OFF and was not changed, so its wrapper did not request interval delivery. Switching items alone did not immediately callback in the observed runs; Home/Back/completion did. See the [physical acceptance](../audit/issue-125/google-tv/native-webview-acceptance.md).

### Earlier below-threshold Google TV evidence — 2026-10-30

See the sanitized report in [`audit/issue-125/google-tv/`](../audit/issue-125/google-tv/README.md). On the owner's actual Google TV Streamer, the installed Lampa wrapper is v1.13.5 and Just+ is v2.5.1. A real ten-item Silo season playlist opened in Just+; the player exposed episode metadata and an actual same-session transition from S03E07 to S03E08. The transition stayed inside Just+ and did not bring Lampa to the foreground. E07 had about 18m37s of 54m38s progress (~34%), so no Trakt history write was eligible. Playback of E08 was stopped well below threshold. No synthetic progress or Trakt history mutation was used.

This verifies the physical launcher/playlist and direct episode-switch path. It does **not** verify a Just+ result callback at the switch, the 120-second interval, exit callback delivery, >=96% normalization on the installed device, a Trakt API attempt/acknowledgement, or a watched UI refresh. `Keep Player Connection` was verified OFF without changing it. Source analysis shows that the wrapper can also replace earlier playlist items with synthetic `0/0/100` when auto-next is active, so a real 90–95% visit may be lost before JavaScript as well. A separate Android wrapper bridge is needed to preserve raw visit evidence before either normalization path.

### Raw bridge v2 and native normalization

The matching wrapper normalizes >=96% completion and prior auto-next items to zero/zero/100. The separate instrumented official-source build physically confirmed this while preserving actual raw visits of 47/52 and 50/52. JavaScript cannot recover those measurements from normalized Timeline alone.

The companion v2 patch preserves every real history visit (up to the API's latest 500), binds a unique native session to the current account/profile/handoff, and validates playlist index + hash + exact S/E. It keeps one coalesced pending snapshot, six bounded delivery attempts, lifecycle/page-ready retries and saved-instance queue state. JavaScript acknowledges delivery independently of watched/API success. The raw path uses the existing idempotent finish() writer and rechecks account ownership immediately before its async invocation. Legacy ambiguous hashes remain rejected.

The official-source debug APK was compiled and installed under a separate application ID. Physical controlled tests covered background keptReports, temporary unready WebView, Activity recreation with explicit fixture handoff reconstruction, shared hashes, restart history and mock 503/retry. The real stock web bootstrap does not automatically acquire that fixture reconstruction: missing handoff ownership still fails closed. Process-death recovery and durable retry without another callback remain unverified.

See [the full physical matrix](../audit/issue-125/google-tv/native-webview-acceptance.md), [native bridge patch](../audit/issue-125/google-tv/native-bridge-v1.13.5.patch), [debug build patch](../audit/issue-125/google-tv/native-debug-v1.13.5.patch) and [reviewable fixture](../audit/issue-125/google-tv/webview-probe/README.md). The v2 event contract is newly implemented by these paired patches; it is absent from the installed production APK. No production APK or real Trakt history was changed.

### Fresh internal player after external return

The prior report-shadowing path is fixed in this plugin: a `Player.start` correlated with the still-pending external launch can retain that launch's snapshot, but after the external `visibility` return clears the handoff, a fresh internal `Player.start` invalidates the old report. If the internal player reuses a hash present in that report, its Timeline is quarantined because the web event contains no source provenance; scrobble and watched completion then use the active internal HTML video element's advancing positions. This prevents an old Android Timeline callback from being mistaken for current internal playback while preserving internal player progress.

The Android wrapper's reviewed `handleJustPlusReport()` path emits `Lampa.Timeline.update()` and retained playlist file callbacks via `markOpened()`; it does not emit `Player.start` for those result items. Thus a result callback following visibility without a new start remains consumable. If a different Android wrapper build emits `Player.start` while replaying its result, the plugin will conservatively treat it as a new internal session; that variant requires device verification.

### Native Timeline dedup and retry limitation

Android compares each normalized playlist item with its saved Timeline and emits `Lampa.Timeline.update()` only when they differ; it then persists the new playlist. If the first qualifying event reaches the plugin but all bounded Trakt history attempts fail, a repeated identical Just+ result normally emits no second Timeline event. The `retryable` state allows a later eligible callback to retry, but does not schedule a durable retry itself. A later measured position change can trigger another attempt; after the final result callback this is **best effort / NOT GUARANTEED**. A production-handler regression models the changed-only guard and confirms that an identical report is suppressed after failure.

### 2026-10-31 real Siaivo / Ted Lasso result

The separate v1.13.5 parallel APK opened the actual Siaivo UI and its 36-file S01 torrent. Its native playlist index map was `[2→S01E01, 3→S01E02, 4→S01E03, 5→S01E04]` after two unnumbered specials; `Lampa.PlayerPlaylist.get()` and native descriptor agreed on exact S/E. Just+ callbacks reached the Android receiver and WebView every 120 seconds. Four owner-authorized history writes, E01–E04 only, are confirmed by authenticated readback; Siaivo's detail UI refreshed to `4/44`, latest E04 “For the Children”, next E05 “Tan Lines”. E02–E04 used actual Just+ seek position for the integration test, so these are not real-time full-watch claims. See [the physical acceptance log](../audit/issue-125/google-tv/native-webview-acceptance.md) and [sanitized correlated events](../audit/issue-125/google-tv/ted-lasso-live-events.jsonl).

Raw callback ACK was false only while a qualifying history write remained pending; after HTTP 201 and local `completionState=confirmed`, ACK became true. The earlier permanent false state came from the read-only CDP guard blocking POST plus a handoff that did not account for all 36 season-pack slots. Both conditions are removed in the tested parallel build.

Live `/scrobble/start` is physically accepted for E03 and E04 (HTTP 201). High-progress `/scrobble/pause` physically returns HTTP 422 with gateway reason `progress_too_high`. The worktree now suppresses pause at >=80% and avoids `/stop`, preserving the custom 90% history rule; this fix has regression tests but has not yet been built/installed/rechecked on device. Thus history is physically accepted; live start is accepted; live pause/Now Watching expiry remains **NOT READY for owner acceptance** until the rebuilt candidate is verified. `/sync/playback` returning an empty list is not evidence about Now Watching because that endpoint exposes saved resume progress after pause.

### Physical Google TV acceptance procedure

Use a patched test build and a mocked Trakt transport (or a disposable test account), never the owner's production Trakt history.

1. Record Android Lampa wrapper build and Just+ Player v2.5.1 versions. Verify the native bridge sends the raw report before Timeline normalization and does so on each accepted result callback independently of Timeline dedup.
2. Use legally usable episodic test videos with exact show/season/episode metadata and deterministic durations. Capture the bridge payload and active JavaScript handoff ownership: card ID, item hash/index, exact S/E, raw position, matching visit duration, `end_by`, and measured-visit provenance. Do not claim a separate native session ID unless the Android wrapper adds and verifies one.
3. Exercise measured 95%, 96%, 99%, and 100%. Verify 95% follows the configured threshold, full progress is eligible only with a real visit record, and auto-next-only synthetic completions never write history.
4. Inject a Trakt 503 then success; verify a later delivered report retries the exact episode and repeated successful reports create one effective history event. Keep persistent failure visible as failure, never optimistic success.
5. Test a 45-minute episode and a multi-episode session exceeding two hours. Verify per-item positions and preserve existing normalized Timeline resume/completion behavior.
6. Return from Just+, then start the same episode/hash internally. Deliver a delayed external report and confirm it cannot shadow internal playback; confirm actual internal video progress still updates/scrobbles/completes normally.
7. Repeat callback-before/after-visibility, app background/foreground, account/profile transition, and process restart. Redact logs and confirm no production credentials or user history are involved. Physical acceptance requires these checks on the exact installed builds.

The earlier Chrome read-only observation did not expose AndroidJS. Subsequent physical testing used the independent Probe and a separate official-source Android debug package, with controlled WebView handoff and mocked API transport. Native receiver/deferral, raw-vs-normalized progress, actual finish() and transient retry are now physically verified in that controlled context. Real Trakt history was never mutated; stock web bootstrap and actual Trakt+ renderer remain unverified. Full [evidence and limits](../audit/issue-125/google-tv/native-webview-acceptance.md).

## Focused verification

Run:

```sh
node --test --test-timeout=15000 tests/trakt-scrobble-session.cjs tests/trakt-episode-transition.cjs tests/trakt-justplus-playlist.cjs tests/details-info.cjs tests/trakt-watched-sync.cjs tests/trakt-account-isolation.cjs
```

The controlled transition cases cover 95% and 20% progress, same torrent infohash with distinct files, rapid next/previous switches, duplicate and stale Timeline events, specials, profile changes, retry after a transient history error, and account-scoped history deduplication.

## Earlier core safety hardening checkpoint

Controlled same-hash E02→E03 cases verify stale Timeline rejection, completion from advancing internal-video progress at the configured threshold, 89% exit, repeated timeupdates/exits, account/profile invalidation, and exit-time capture when the last timeupdate is absent. The shared idempotent history writer retry test covers a transient 503. On `4ed68cf9e02e0977621ec9985e27477bccdced67`, the focused Trakt, Details, watched-sync and account-isolation command passed 161/161. GitHub Actions `home-history-checks.yml` ran all five mandatory Trakt tests alongside Home regressions and passed 214/214. All five required Actions passed on that SHA. At that earlier checkpoint, external-player and physical-device acceptance were unverified; the current bounded physical evidence is recorded above.
