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
| Official Lampa Android wrapper | Source supports the Just+ nested playlist Bundle and routes result callbacks to per-item `Lampa.Timeline.update()` events. The Trakt plugin consumes those events using the captured playlist identity map. | The user's main Chrome tab is the web site, not the Android WebView; this native callback path cannot be runtime-tested there. Installed APK build and end-to-end device callback are not verified. |
| Just+ Player v2.5.1 | Official [Playlist API](https://github.com/just-plus-player/just-plus-player/blob/master/docs/PLAYLIST_API.md) documents per-item `positions_sec`, `history[]`, `duration_sec`, and `result_callback`. Its current [release page](https://github.com/just-plus-player/just-plus-player/releases/tag/v2.5.1) is APK/release-note only; upstream states source has remained at 2.0.11 since v2.1.1 ([repository note](https://github.com/just-plus-player/just-plus-player#readme)). | No evidence that the user's installed v2.5.1 APK was exercised. API contract is documented, device compatibility is not independently verified. |

The Playlist API says `result_callback` returns on leaving the player; `report_interval_sec` is ignored by Just+ from v2.2.2 onward. Therefore an episode switch inside Just+ does not guarantee an immediate callback or Trakt write at that switch. The Lampa wrapper's `report_interval_sec=120` should not be treated as proof of periodic reports. On versions honoring the documented current contract, synchronization occurs when the user exits/returns or the player is otherwise left/replaced.

### 96% normalization and required native bridge change

The released Android wrapper defines `VIDEO_COMPLETED_DURATION_MAX_PERCENTAGE = 96`. Its `handleJustPlusReport()` receives the Just+ `positions_sec[]`, per-item `durations[]` reconstructed from `history[].duration_sec`, current `index`, and `end_by`. It considers an item ended at the threshold, then `createUpdatedPlaylistItem(..., ended=true)` replaces measured `time` and `duration` with zero and sets percent to 100. The `playerAutoNext` path can separately synthesize the same zero/zero/100 marker for prior items. The wrapper then emits only the normalized Timeline object to JavaScript. The plugin cannot tell a genuine 96–100% measurement from a synthetic auto-next marker after this transformation.

Consequently, measured reports below 96% (for example 95% with a 90% Trakt threshold) can be finalized by this PR. Genuine 96%, 99%, and 100% episodes are currently **not supported by the web plugin bridge** and may remain unwatched. The plugin deliberately does not infer their completion from the normalized marker.

The precise native-side change needed is to keep the persisted Timeline normalization unchanged, but add a separate Just+ result bridge callback before normalization is discarded. In `MainActivity.handleJustPlusReport()`, send a session-scoped report to a plugin-registered JS endpoint (for example `Lampa.Timeline.updateJustPlusReport`) on **each accepted `result_callback`, even when normalized Timeline is unchanged**. Include: report/session ID; launch card identity; playlist item index and its native Timeline hash; exact season/episode/show identity; raw `positions_sec[i]`; the matching visit's `duration_sec`; `end_by`; and a boolean indicating that this item has a real Just+ visit record. Mark auto-next-only completions as synthetic or omit them from this measured-report callback. The JS consumer can then apply the configured threshold to raw `position/duration`, require the current session/account and exact item identity, and ignore synthetic entries. The endpoint must be independent of the changed-only `it != state.playlist[i].timeline` guard and must not persist raw report fields into native Timeline state. Do not repurpose normalized `Timeline.time/duration` or alter `createCompletedPlaylistItem()`, since those fields also drive native resume/completion behavior. This requires a separate change to the Android Lampa wrapper; it is not safely implementable in this plugin repository alone.

### Fresh internal player after external return

The prior report-shadowing path is fixed in this plugin: a `Player.start` correlated with the still-pending external launch can retain that launch's snapshot, but after the external `visibility` return clears the handoff, a fresh internal `Player.start` invalidates the old report. If the internal player reuses a hash present in that report, its Timeline is quarantined because the web event contains no source provenance; scrobble and watched completion then use the active internal HTML video element's advancing positions. This prevents an old Android Timeline callback from being mistaken for current internal playback while preserving internal player progress.

The Android wrapper's reviewed `handleJustPlusReport()` path emits `Lampa.Timeline.update()` and retained playlist file callbacks via `markOpened()`; it does not emit `Player.start` for those result items. Thus a result callback following visibility without a new start remains consumable. If a different Android wrapper build emits `Player.start` while replaying its result, the plugin will conservatively treat it as a new internal session; that variant requires device verification.

### Native Timeline dedup and retry limitation

Android compares each normalized playlist item with its saved Timeline and emits `Lampa.Timeline.update()` only when they differ; it then persists the new playlist. If the first qualifying event reaches the plugin but all bounded Trakt history attempts fail, a repeated identical Just+ result normally emits no second Timeline event. The `retryable` state allows a later eligible callback to retry, but does not schedule a durable retry itself. A later measured position change can trigger another attempt; after the final result callback this is **best effort / NOT GUARANTEED**. A production-handler regression models the changed-only guard and confirms that an identical report is suppressed after failure.

### Physical Google TV acceptance procedure

Use a patched test build and a mocked Trakt transport (or a disposable test account), never the owner's production Trakt history.

1. Record Android Lampa wrapper build and Just+ Player v2.5.1 versions. Verify the native bridge sends the raw report before Timeline normalization and does so on each accepted result callback independently of Timeline dedup.
2. Use legally usable episodic test videos with exact show/season/episode metadata and deterministic durations. Capture the bridge payload: report/session ID, item hash/index, exact S/E, raw position, matching visit duration, `end_by`, and measured versus synthetic provenance.
3. Exercise measured 95%, 96%, 99%, and 100%. Verify 95% follows the configured threshold, full progress is eligible only with a real visit record, and auto-next-only synthetic completions never write history.
4. Inject a Trakt 503 then success; verify a later delivered report retries the exact episode and repeated successful reports create one effective history event. Keep persistent failure visible as failure, never optimistic success.
5. Test a 45-minute episode and a multi-episode session exceeding two hours. Verify per-item positions and preserve existing normalized Timeline resume/completion behavior.
6. Return from Just+, then start the same episode/hash internally. Deliver a delayed external report and confirm it cannot shadow internal playback; confirm actual internal video progress still updates/scrobbles/completes normally.
7. Repeat callback-before/after-visibility, app background/foreground, account/profile transition, and process restart. Redact logs and confirm no production credentials or user history are involved. Physical acceptance requires these checks on the exact installed builds.

The authorized main Chrome tab was inspected read-only and showed the web runtime with `Lampa.Player` initialized, Player closed, `PlayerPlaylist.get()` empty, and no AndroidJS bridge exposed. No player was started and no real Trakt write was performed. Internal-player transition behavior and Just+ report translation are covered by controlled production-handler tests. Google TV Streamer 4K and the user's installed APK are **NOT VERIFIED on-device**.

## Focused verification

Run:

```sh
node --test --test-timeout=15000 tests/trakt-scrobble-session.cjs tests/trakt-episode-transition.cjs tests/trakt-justplus-playlist.cjs tests/details-info.cjs tests/trakt-watched-sync.cjs tests/trakt-account-isolation.cjs
```

The controlled transition cases cover 95% and 20% progress, same torrent infohash with distinct files, rapid next/previous switches, duplicate and stale Timeline events, specials, profile changes, retry after a transient history error, and account-scoped history deduplication.

## Final safety hardening checkpoint

Controlled same-hash E02→E03 cases verify stale Timeline rejection, completion from advancing internal-video progress at the configured threshold, 89% exit, repeated timeupdates/exits, account/profile invalidation, and exit-time capture when the last timeupdate is absent. The shared idempotent history writer retry test covers a transient 503. On `4ed68cf9e02e0977621ec9985e27477bccdced67`, the focused Trakt, Details, watched-sync and account-isolation command passed 161/161. GitHub Actions `home-history-checks.yml` ran all five mandatory Trakt tests alongside Home regressions and passed 214/214. All five required Actions passed on that SHA. External-player and physical-device acceptance remain unverified.
