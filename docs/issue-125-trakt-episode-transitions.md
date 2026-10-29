# Issue #125 — Trakt episode transitions

## Runtime event boundary

Trakt Core can observe these Lampa-side signals:

- `Lampa.Player.listener` `start`, `ended`, `destroy`, `error`, `external`, and `visibility` events.
- `Lampa.Timeline.listener` `update` events with a timeline hash and playback road (`time`, `duration`, `percent`). A matching hash is required before progress can affect a media identity.
- For Lampa's internal video element only, DOM `playing` and `pause` events from `Lampa.PlayerVideo.video()` provide a playback confirmation and current element position.

`Player.start` identifies a player/media handoff, but does not by itself confirm playback. A new Trakt START still waits for a matching advancing Timeline sample or the active internal video `playing` event. A new `Player.start` for a different, identified episode now ends the previous active session using its last confirmed progress. If that progress meets `trakt_min_progress`, it goes through the existing idempotent history writer; otherwise no history write is attempted.

The Timeline hash remains the association boundary. Stale samples for an earlier hash are ignored after a transition. Episode identity uses the show ID and exact season/episode fields resolved from the player event/hash metadata; unknown identity cannot create a show-history write. Two selected files from the same torrent are separate when Lampa supplies distinct exact S/E metadata, even if the Timeline hash is unchanged. If the hash stays the same and Lampa supplies no distinct episode metadata or player-start transition, the plugin cannot infer a file change and safely sends no watched history.

## Trakt writes and account safety

- Watched history is written through the existing authenticated `finish` / `api.addToHistory` path, only after the configured threshold is confirmed.
- Existing retry and 409-as-already-recorded behavior remain in place. Completion cache, request deduplication, and locks are scoped by Trakt account; stale callbacks are guarded by both token and playback/profile generation. Tokens are not emitted in logs.
- After Trakt acknowledges a show-history write, the affected show's Trakt+ progress is refreshed. Verified aired/watched counts, per-episode evidence (when returned by the endpoint), and Up Next are written into the existing account-bound cache; `traktplus:watched` notifies card/Details consumers. The full watched-library import is not rerun and Home is not reconstructed.
- A Trakt+ refresh is coalesced per account/profile/show. The cooldown starts only after a confirmed successful refresh; failures remain retryable, and overlapping history confirmations trigger a follow-up read for the newest episode. Forced reads supersede earlier in-flight reads so stale responses cannot update watched state or UI. Identical progress snapshots do not emit another watched event or redecorate rows.

## External-player limitation

The Lampa adapter emits an `external` handoff with the selected card/timeline association and can observe Lampa's return/visibility lifecycle. The repository does not contain Just Player code or an Android callback bridge that reports Just Player's internal next/previous episode changes or progress. The implementation therefore does not infer external progress from elapsed wall time or assume that Just Player emits updates to Lampa. External playback sync is possible only when matching Timeline progress returns through Lampa; otherwise the last confirmed Lampa progress is used and no guessed completion is sent.

The main Chrome tab was inspected read-only and showed an initialized Lampa page with the Player closed. No player was started and no real Trakt write was performed. Internal-player transition behavior is covered by controlled production-handler tests. Google TV Streamer 4K and Just Player episode switching are **NOT VERIFIED on-device**.

## Focused verification

Run:

```sh
node --test --test-timeout=15000 tests/trakt-scrobble-session.cjs tests/trakt-episode-transition.cjs tests/details-info.cjs tests/trakt-watched-sync.cjs tests/trakt-account-isolation.cjs
```

The controlled transition cases cover 95% and 20% progress, same torrent infohash with distinct files, rapid next/previous switches, duplicate and stale Timeline events, specials, profile changes, retry after a transient history error, and account-scoped history deduplication.

## Final safety hardening checkpoint

The PR adds controlled cases for malformed/fractional/negative episode identity (while retaining S00), same-hash season-pack files, late account-A completion while account B records the same episode, failed and overlapping Trakt+ refreshes, forced refresh supersession, and repeated identical progress reads. The GitHub Actions workflow `home-history-checks.yml` now runs the five mandatory Trakt lifecycle and watched-state test files alongside its Home regressions. The final local focused matrix passed 268/268; the exact GitHub Actions workflow command passed 208/208. CI must still be confirmed on the pushed commit; external-player and physical-device acceptance are not claimed.
