# Physical native/WebView acceptance — 2026-10-30

## Latest update — pause suppression and live state, 2026-10-31

The earlier statement below that pause suppression was not installed is superseded: the parallel APK was rebuilt/installed from the current candidate before the physical E05/E06 run. The >=80% suppression branch is physically confirmed at E05 86.01% during Just+ Next: JS emitted `external_pause_suppressed` / `progress_too_high`, sent no E05 `/pause` or `/stop`, and started E06 with HTTP 201 `action=start`. E06 exited at 6.99% with `/pause` HTTP 201. Neither episode created a history entry. Exact current-run detail is in [pause-suppression-live-acceptance.md](pause-suppression-live-acceptance.md) and [pause-suppression-events.jsonl](pause-suppression-events.jsonl).

Read-only `GET /users/me/watching` returned the correct E06 object and `action=scrobble` during playback. The later HTTP 401 previously recorded here was caused by a malformed diagnostic call: the API signature is `get(path, unauthorized=false, options={})`, and the options object had accidentally been passed as the `unauthorized` argument, omitting bearer auth. The corrected authenticated no-cache request returned HTTP 204 with no body after the paused session had expired. This confirms no active item at that later sample, but does not establish the exact expiry time. The Siaivo home UI did not independently show a Now Watching item or expiry transition, so that UI transition remains unverified.

The real website reload removed the in-memory external playlist handoff (`PlayerPlaylist.get()` length 0). E06 snapshots at 486/1903 and 606/1903 were received natively but exhausted six bounded JS ACK attempts. They were below the history threshold; no write occurred. Force-stop killed the parallel app process and explicit launch restored it without clearing data, but pending-event recovery at the time of death was not exercised. Process-death durable recovery remains unverified.

## Real Siaivo / Ted Lasso acceptance — 2026-10-31

This section supersedes the earlier statement that no real Siaivo season torrent or authenticated history write had been exercised. The separate Android package `top.rootu.lampa.issue125probe` opened the actual configured Siaivo page `http://siaivo.isroot.in`, used its real torrent overlay and 36-file season pack (two unnumbered special slots followed by S01E01 at native index 2, E02 at 3, E03 at 4, E04 at 5), and launched those files in Just+ 2.5.1. `Lampa.PlayerPlaylist.get()` returned all 36 items with the same exact S/E at the native indexes; the session descriptor matched card ID 97546 and the known episode entries. No production APK, parser, TorrServer or setting was changed.

The authenticated read-only precheck showed Ted Lasso Trakt ID 162639 and no S01E02–E04 history. The owner had authorized at most E01–E04. Exactly those four episode histories are now confirmed; no other Trakt data was changed. E01/E02 confirmation predates the final portion of the retained log. E03/E04 and the exact correlated Android/WebView/API events are retained in `ted-lasso-live-events.jsonl`.

| Episode | Physical Just+ measurement used for acceptance | JS/history decision | Remote result/readback |
|---|---:|---|---|
| S01E01 | 1686/1856 = 90.84% at interval; later actual exit snapshot 1839/1855 = 99.14% | Exact native index/S/E; eligible at configured 90% | `/sync/history` accepted (HTTP 201); authenticated history read showed E01 once |
| S01E02 | 1616/1760 = 91.82% interval snapshot (earlier interval had lower position) | Exact native index 3 / S01E02; eligible | History readback after E02: S01 `[1,2]`; one effective row |
| S01E03 | 1686/1824 = 92.43%; prior interval was 287/1824 = 15.73% | Live session on E03; history queued and ACK held until API confirmation | `/sync/history` HTTP 201; authenticated readback `[1,2,3]`; native ACK true after confirmation |
| S01E04 | 1884/2018 = 93.36%; final user snapshot 1924/2018 = 95.34% | Exact index 5 / S01E04; eligible | `/sync/history` HTTP 201; authenticated readback `[1,2,3,4]`; native ACK true after confirmation |

Progress for E02–E04 used the seek controls in Just+ and is therefore a **seek-based integration test**, not evidence of watching those episodes in real time. It did use actual player positions, actual `duration_sec`, Just+ interval callbacks, Android receiver delivery and authenticated API confirmation; no JS payload or progress number was forged. Four was the total authorized write ceiling and it was not exceeded.

### Correlated live/ACK events

The same native session UUID `d6a43d2d-1923-427d-8ce8-53635214d762` generated 120-second snapshots at 06:34:08, 06:36:08, 06:38:08 and 06:40:08 local time. The first snapshot held E02 at index 3 = 1616/1760 and E03 at index 4 = 167/1824. The second had E03 at 287/1824; its JS live event started S01E03 at 15.73%, and the start request returned HTTP 201. The third had E03 1686/1824 (92.43%): the plugin queued the exact history, left raw ACK false while the write was pending, got HTTP 201, and ACKed at 06:38:11. The fourth included E04 1884/2018 (93.36%): JS started the exact E04 live session, queued history, got HTTP 201, then ACKed at 06:40:11. The per-event timestamps and safe fields are in `ted-lasso-live-events.jsonl`.

The Lampa detail UI subsequently showed `Trakt · Переглянуто: 4/44`, “Остання переглянута: For the Children” (E04), and “Наступна непереглянута: Tan Lines” (E05). This is a real Siaivo/Trakt+ detail-page refresh, not the previous controlled fixture. It verifies aggregate watched rendering and exact latest/next labels; it does not verify every separate season-card badge or UI after process restart.

### Real raw ACK failure and live pause defect

Earlier raw `ack=false` events in this run were transient and correct while an eligible `/sync/history` request was pending. They became `ack=true` only after HTTP 201 and the writer changed the episode state to `confirmed`. In the prior failed runtime, permanent `ack=false` was caused by the local read-only CDP guard blocking the history POST, compounded by the real season pack having 36 native slots (including two specials) while the old handoff assumed only numbered entries. Removing the guard and binding all indexed slots with exact S/E fixed the runtime; the 36-item production handoff and raw report are now physically accepted.

Live scrobbling is **partly accepted**: actual interval reports started E03 at 15.73% and E04 at 93.36%, and their `/trakt/scrobble/start` responses were HTTP 201. However, switching away from high-progress E03 and exiting high-progress E04 caused `/trakt/scrobble/pause` HTTP 422. A sanitized replay of the same pause body exposed the response code `progress_too_high`. This is a real gateway response, not a CORS or `status:0` transport failure. The current worktree suppresses invalid pause calls at >=80% to avoid the known 422 and never uses `/stop` (which could create watched history at Trakt's lower default threshold); a new start replaces the old live item, otherwise the accepted start expires after its remaining runtime. The suppression change has unit coverage but is **not yet installed or physically re-verified**.

An authenticated `GET /sync/playback` returned an empty list. Trakt documents this endpoint as saved playback progress after a pause, not a live Now Watching query, so that result neither disproves nor confirms the public Now Watching display. The physical `scrobble/start` HTTP 201 is confirmed; direct user-specific Now Watching UI/readback remains unverified. Likewise, pause suppression's expiry behavior still needs a post-build runtime check before declaring live scrobbling complete.

The currently installed parallel APK predates the pause-suppression change. It must be rebuilt from the final worktree JS, checksum/signature checked and installed over the **parallel** package before any further runtime acceptance. Production `top.rootu.lampa` remains untouched. Real history count remains exactly four, E01–E04.

## Actual Siaivo site smoke check — 2026-10-30

After the owner logged into the parallel `Lampa Trakt Test` application, its WebView was checked read-only against the configured site. The stored launch URL was read from the application before the APK update as `https://siaivo.github.io`; the live page redirects to `http://siaivo.isroot.in/`. The actual Home UI rendered and reported Activity `main`, Hybrid `3.1.0-single-presentation-owner`, and Trakt+ `3.4.1-rating-widgets`. Trakt token presence and Watching Sync were checked only as booleans; no credential value was read or printed.

The test APK intercepted only `/lampa/trakt/trakt.js` and served the current PR source from its local asset. Android log tag `Issue125SiteOverride` recorded the asset SHA. `Debugger.getScriptSource` then returned the executed script with SHA-256 `f2caf253a4bba7fae573792b4b465f26cd8b47850eac85633262e586bc378b13`, equal to the repository source. A malformed synthetic raw-report event was dispatched as a negative smoke test; the production handler left its ACK unset. The read-only network guard remained active and rejected non-read methods to Trakt and the Siaivo proxy. No player was started and no Trakt write was attempted.

The same app received the updated JS through `adb install -r`, preserving its app data; no URL field was saved. A test-only launch parameter supplied the previously verified site URL. The official production app was not changed. This proves actual-site bootstrap and script-byte ownership, but does **not** prove a real torrent → Just+ → raw report → history write or Trakt+ watched-card refresh.

The final ACK regression semantics are now explicit: malformed or identity-mismatched reports remain unacknowledged; valid below-threshold and disabled-sync reports are consumed without a write; eligible reports stay unacknowledged while the history writer is pending or retryable and receive ACK only after confirmation. Production tests cover the pending → 503 → retry → confirmed path. This narrows the data-loss window, but the native retry budget is still bounded to six attempts and there is no durable JS queue after that budget or process death. No real player/session was started in this follow-up, so the new ACK code was verified in production-handler tests and its exact script bytes in the real site WebView, not as an eligible physical Trakt write.

Final test APK after the ACK regression fix: `artifacts/issue125/lampa-1.13.5-issue125-site-test.apk` (outside Git), SHA-256 `348f965a915d9d89469d16157674004cd5b93f3bbc25b827641f463149929547`; signer certificate SHA-256 `e796a3d3972f0b1e598b43e2dc84834ee3be241bae8b351601f676147990ad9b`. Its executed JS SHA-256 is `3e5a791f72fbc3f109c8269b78807a9c31ff1330c171f9ed6aece08278423b56`.

## Scope and artifact identity

Hardware: Google TV Streamer 4K, Android 14; installed Just+ 2.5.1. Production Lampa 1.13.5 was not replaced. An official v1.13.5 source build with the proposed bridge and debug-only instrumentation was compiled with JDK 17, SDK 34 and Build Tools 30.0.3, installed as **top.rootu.lampa.issue125probe**. Upstream base is f6d9a9318a889b53edccd81fbe7050ec17dfd2ba.

The canonical JS source SHA-256 is **ea076f8a76cf692b38531656d6a30345cd22cd3c5f2ac43c57efd4b9309e4f58**. The actual executed WebView script was retrieved with Debugger.getScriptSource at `http://127.0.0.1:18766/trakt-instrumented.js`: **27a5065b1ede4a85c6f67839f047b4f64d5951f1c794fef0a4a376521a3d4970**. It matches the served instrumented source. See `build-metadata.json` for APK/native source hashes.

The fixture loads the full Trakt source definitions and preserves production helpers, finish(), owner guards, idempotency and retry code. `webview-probe/hook.js` suppresses normal plugin startup, supplies a controlled Lampa facade/handoff, and mocks only Trakt lookup/history transport plus the Trakt+ confirmation consumer. Therefore this is a **physical Android receiver/WebView/production-handler/history-writer test with controlled web context**, not acceptance of the stock website bootstrap or real Trakt+ renderer. Episode labels are fixture metadata attached to legally available short test videos, not real episode watches.

## Independent long-video reports

Probe session `9c5e7ae2-9b77-4578-a069-a8f9118e86e1` used a local read-only public Big Buck Bunny fixture, duration 596 seconds. No seeking was used. The receiver journal is `probe-long-events.jsonl`.

| Event | Wall time (ms) | Since launch | Actual position/duration |
|---|---:|---:|---|
| Launch | 1793375378222 | 0 | — |
| interval 1 | 1793375498674 | 120452 ms | 118/596 |
| interval 2 | 1793375618675 | 240453 ms | 238/596 |
| interval 3 | 1793375738677 | 360455 ms | 358/596 |
| user exit | 1793375761733 | 383511 ms | 380/596 |

Inter-callback intervals were 120001 and 120002 ms. This verifies recurring full snapshots on installed Just+ 2.5.1. Failed/cancelled media setup attempts are excluded. The local provider exposes only this public test file and allows read access only; its callback receiver remains non-exported.

## Correlated native → JS → mock API results

`native-bridge-events.jsonl` contains sanitized retained native stages; `webview-events.jsonl` contains the complete persistent web journal. Older native ring-buffer lines were not all retained, so the first scenario's native timestamps below are curated from its observed ADB output. No global log buffers were cleared.

| Scenario/session | Native evidence | JS decision | API / UI outcome |
|---|---|---|---|
| 96.15%, `ab34f484…` | receiver 1793375977748; take 5977750; handle 5977753; raw queued 5977842; positions [50,25], durations [52,52] | raw 5977878 accepts only S01E02 50/52; E03 25/52 ineligible | actual finish() → mocked history E02 at 5977902; confirmation consumer at 5977909; native ack 5977916 |
| Restart negative control, `bcdbc91d…` | actual history E02 46/52 → E03 0/52 → E02 1/52 | 88.46% is below 90%; raw accepted=false | no history write |
| Eligible visit then restart, `536c3d95…` | latest positions [2,0], but actual visits E04 50/52 → E05 0/52 → E04 2/52; raw queued 1793376209023 | WebView initially unready; ack false at 6209054 and 6210060; reload/handoff 6211522; raw 6211554 retains prior 50/52 | only E04 confirmed at 6211571; UI consumer 6211574; ack true 6211578 |
| 90.38% + retry, `282b002f…` | measured E06 47/52, E07 1/52 | raw 1793376351981 qualifies only E06 | first mock write fails 503 at 6351998; retry confirms E06 at 6352514; UI consumer only afterwards, 6352517 |
| Shared hash + background, `87464e6b…` | same hash for E08/E09; receiver 1793376530366 in CREATED; deferred 6530382; later handle in STARTED | raw maps index 0 to E08 47/52 and index 1 to E09 2/52; ambiguous legacy Timeline rejected | only E08 confirmed at 6626267; second callback exposed a STARTED→RESUMED queue gap in the initial patch |
| Activity recreation, `f9e1a695…` | final patch queues at 1793376929061 in STARTED; ON_RESUME runs delivery; unready WebView ack=false; pending session/descriptor survive recreate | new controlled WebView explicitly prepares the same fixture handoff; raw 3/52 is consumed but not eligible; ack=true at 6931893 | no history write |
| Final APK combined acceptance, `4ad890ec…` | receiver 1793377357378 in CREATED, deferred 7357382; one retained report drained on return with ON_RESUME | same hash E08 47/52 versus E09 2/52; session bound; raw accepted at 7360059; synthetic and ambiguous Timeline events rejected | mock 503 at 7360129; actual writer retries; only E08 confirmed at 7360668; UI consumer 7360673 |

Timestamp suffixes in the first rows share the leading `179337` wall-clock prefix. Percentages are computed from actual Just+ callback positions, not invented elapsed-time progress. ADB media commands controlled next/previous/Back/Home; no seek-to-completion or production Trakt write was performed.

## Confirmed fixes

- Preserve **each measured history visit**, bounded to the API's latest 500, rather than treating positions_sec[] as maximum progress. A restart can legitimately reduce the latest position to zero.
- Protocol v2 binds a unique native UUID to the current JS handoff, card, complete indexed identity map, token and profile generation. PendingIntents have unique actions. Older native sessions cannot update the newer session's Timeline or raw delivery.
- Raw matching uses index + hash + exact S/E. Different season-pack files sharing a hash remain distinct; legacy hash-only ambiguity still fails closed.
- One coalesced pending full snapshot, six bounded delivery attempts, lifecycle/page readiness retries, matching JS acknowledgement, and saved-instance restoration. ACK means valid handoff delivery, not confirmed watched history.
- A physical STARTED-state delivery gap was found in the initial new queue and fixed with a Lifecycle ON_RESUME observer. The final APK combined test above uses that fix.
- JS rechecks ownership immediately before asynchronous finish(), preventing an account change between scheduling and invocation from attributing the old episode to the new account.

## Component verdict

| Component | Input → output | Classification |
|---|---|---|
| Installed Just+ 2.5.1 | playlist → interval/user/completion snapshots with per-visit positions | VERIFIED on physical test media |
| Android PendingIntent/receiver | snapshot → app callback | VERIFIED, both independent Probe and official-source debug Lampa |
| Official-source MainActivity | receiver → take → deferral/handle → raw event | VERIFIED in separate instrumented build; production APK itself was not instrumented |
| Native normalization | measured progress → 0/0/100 Timeline | VERIFIED in debug build preserving the official normalizer; measured data lost without companion raw bridge |
| WebView | queued raw event → v2 owner/index/identity checks | VERIFIED in controlled physical fixture, including temporary unready state |
| Trakt JS finish/history writer | eligible episode → mocked API and retry | VERIFIED physically in controlled fixture; real authenticated API NOT TESTED |
| Trakt+ | success → refresh consumer | Stub observed physically; real cache/rendering NOT VERIFIED by this fixture |

## Exact remaining boundary

The controlled fixture explicitly reconstructs its handoff after WebView/Activity recreation. **The stock Lampa website does not gain automatic handoff reconstruction from this test.** If a real page reload loses externalPlaylistReport, v2 binding fails closed rather than guessing account/episode ownership. Persistent owner-safe reconstruction remains a separate acceptance gap. The original wrapper also drops reports when no live Activity exists; process-death recovery is not established by saved-instance testing.

Native delivery acknowledgement does not guarantee a successful remote API during a prolonged outage. Bounded writer retries and repeated received snapshots work; durable retry after exhausted attempts without another callback/process restart remains unverified. No optimistic watched state was published in the 503 test.

The local native auto-next normalization remains unchanged and can synthesize completion for prior items regardless of measured progress. That local Timeline/Watch Next behavior is a separate native issue; Trakt raw processing requires measured visits and does not trust the synthetic marker.

Immediate per-switch sync is not provided by the observed Just+ callback lifecycle. Periodic delivery works at 120 seconds when requested; the owner's production Keep Player Connection remains OFF and was not changed. Reliable post-return sync needs both the reviewed native raw bridge and the matching JS. A JS-only deployment cannot recover measurements already normalized away by the installed wrapper.

PR #138 must remain Draft pending native integration review, real website handoff restoration and real Trakt+ UI acceptance. Issue #125 is not closed. Production Lampa, credentials, settings, parser/TorrServer configuration and real Trakt history were preserved.

## Cleanup and validation

After evidence capture, both temporary diagnostic packages were uninstalled, their public fixture files removed, and ADB reverse/forward routes removed. Production Lampa 1.13.5/581 and Just+ 2.5.1/2005001 remain installed; production Lampa is foreground. The compiled debug APK remains in the Linux workspace artifacts directory, with its hash recorded in build-metadata.json. No real Trakt account/history or production settings were changed.

Final focused Trakt/Details/session/account regressions: **189/189 PASS**. Repository validation passed (80 JavaScript files, manifest and links). Native debug build succeeded and both native patches pass application checks against the pinned upstream base. GitHub Actions results for the final pushed SHA are recorded in the PR description.
