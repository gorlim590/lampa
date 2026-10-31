# Issue #125 — Google TV / Just+ evidence

The latest acceptance is [native/WebView acceptance](native-webview-acceptance.md), including a read-only smoke check of the real Siaivo Home and the exact PR JS bytes. It supersedes earlier NOT VERIFIED statements about building the companion APK and Just+ interval delivery.

A separate official-source Android Lampa debug APK was built and installed, preserving production Lampa. Physical test media exercised receiver → take/keptReports → handle → WebView → the production JS helpers and actual finish/history writer with mocked transport. Regular interval reports were observed at 120/240/360 seconds; measured 47/52 and 50/52 completion, shared hashes, per-visit restart history, delayed JS readiness, Activity recreation and a transient 503 were covered.

This is controlled physical integration acceptance plus real-site read-only bootstrap validation. A synthetic malformed callback confirmed the production listener does not ACK invalid payloads. Eligible callbacks remain unacknowledged until the API writer confirms; below-threshold/disabled-sync snapshots are consumed without writes. A bounded native six-attempt delivery is still not a durable queue. Real torrent playback with the owner session, authenticated Trakt write/confirmation, session recovery after site reload and actual Trakt+ watched renderer remain unverified. The latest parallel debug package is installed; production Lampa remains untouched. PR #138 remains Draft and Issue #125 open. No real Trakt history or production settings were changed.

- [Component matrix and correlated timeline](native-webview-acceptance.md)
- [Build and executed-source hashes](build-metadata.json)
- [Sanitized WebView journal](webview-events.jsonl)
- [Sanitized native journal](native-bridge-events.jsonl)
- [Long-video interval journal](probe-long-events.jsonl)
- [Native production bridge patch](native-bridge-v1.13.5.patch)
- [Separate debug package/instrumentation patch](native-debug-v1.13.5.patch)
- [Build procedure](native-build.md)
- [Reviewable WebView fixture](webview-probe/README.md)

<details><summary>Earlier below-threshold investigation (historical)</summary>

> Updated physical callback evidence: [Independent Callback Probe results](callback-probe-results.md). In particular, interval=120 is now VERIFIED on Just+ 2.5.1. Earlier observations below are retained as historical evidence.

# Issue #125 — Google TV / Just+ field report

Date: 2026-10-30  
Device: Google TV Streamer 4K (Android 14)  
Installed apps: Lampa Android wrapper 1.13.5 (581); Just+ Player 2.5.1 (2005001)

## Result

**Verified on hardware:** Lampa launched the configured native Files/player handoff to Just+ with a real 10-item episodic playlist. Just+ showed the selected episode identity and media duration. The user switched inside the same Just+ session from S03E07 to S03E08; the active playlist item changed and playback position restarted at zero. Lampa did not become foreground during that transition.

**Not verified:** an Android result callback at the switch; clean player-exit callback delivery; >=90% or >=96% completion reports on this installed device; any Trakt history request/acknowledgement; and the post-write watched indicator. The native menu was inspected read-only and offered “Увімкнути утримання сокета”, confirming `Keep Player Connection` is OFF. I closed the menu without selecting the action. The Trakt threshold was not read from the Android WebView.

The measured E07 position was approximately 18m37s of 54m38s (~34%). E08 was stopped well below the configured watched threshold. Therefore no history entry was eligible or intentionally written. This run confirms the real transition path but does not reproduce a missed eligible completion.

## Root-cause assessment

The first missing stage for an in-player switch is clearer: `Keep Player Connection` is OFF, so Lampa v1.13.5 does not request its optional 120-second `report_interval_sec`. An index change inside Just+ therefore has no configured periodic report path. The official API documents a full snapshot when the viewer leaves or stops; this is the earliest expected delivery, but the actual exit callback was not captured. The official Just+ API page also contradicts itself about interval support, but that ambiguity is immaterial for this run because Lampa sent no interval request.

The real ten-item playlist confirms that Lampa used its native playlist path; v1.13.5 only builds that multi-item state when `playerAutoNext` is true, and the source default is true. On a delivered result, that option can mark earlier items complete regardless of their measured progress, replacing them with `time=0,duration=0,percent=100`. At >=96%, the separate completion normalizer can produce the same marker. The installed plugin correctly rejects the ambiguous marker, so measured 90–95% may also be lost after switching when auto-next synthesizes completion. This mechanism is source-confirmed and fits the reported case, but the >=90% callback sequence was not tested on-device.

**Prepared fix:** this branch adds a guarded JS consumer and regression coverage for a raw report event. The matching native wrapper patch is included in [`native-bridge-v1.13.5.patch`](native-bridge-v1.13.5.patch). It emits item/hash/S/E identity, raw position, duration, visit provenance, and end reason before normalization, without changing persisted Timeline behavior. Repeated snapshots can retry a failed history write. This event does not exist in the currently installed APK until the native patch is built and installed.

The repository change is integration support for that native bridge, not a standalone fix for the installed APK. The Android patch has not been compiled or installed. Physical completion tests at 90–95% and 96–100% remain blocked until a disposable Trakt test profile is available; no real history entry has been created.

## Privacy and evidence

No pairing code, LAN address, credentials, stream URL, torrent filename/hash, personal Trakt history, or raw logcat is stored here. Screenshots and raw UI dumps were not retained because they exposed stream content and/or private transport details. Device results above are curated from ADB package, Activity, MediaSession, and UI observations. The actual Trakt account/history was not changed.

See [`adb-environment.md`](adb-environment.md), [`event-timeline.md`](event-timeline.md), and [`diagnostics.md`](diagnostics.md). The broader implementation contract remains in [`docs/issue-125-trakt-episode-transitions.md`](../../../docs/issue-125-trakt-episode-transitions.md).

## Status matrix

| Check | Status | Evidence |
|---|---|---|
| ADB authorization and shell | PASS | Device enumerated as authorized; shell queries succeeded |
| Installed Lampa and Just+ versions | PASS | Package manager reports 1.13.5 / 2.5.1 |
| Native Lampa → Just+ playlist handoff | PASS | Real playlist of 10 items opened; current episode metadata visible |
| Direct episode switch in Just+ | PASS | Active item 6/S03E07 → item 7/S03E08 in one session |
| Lampa stays backgrounded at switch | PASS | Foreground Activity remained Just+ during transition |
| Keep Player Connection | VERIFIED OFF | Read-only native menu offered “Увімкнути утримання сокета”; no setting changed |
| 120-second interval requested by Lampa | VERIFIED NOT REQUESTED | v1.13.5 adds it only when Keep Player Connection is ON |
| Just+ periodic callback behavior in v2.5.1 | NOT VERIFIED | Official API is contradictory; this configuration sent no interval request |
| Immediate callback on switch | NOT VERIFIED | No callback captured; no periodic report was requested |
| Callback on normal exit | NOT VERIFIED | A clean Just+ exit callback was not captured |
| >=90–95% or >=96–100% report | NOT VERIFIED on device | No threshold playback was performed |
| Trakt history attempt/confirmation | NOT TESTED | No eligible progress; no production history mutation |
| Physical playback of actual video | PASS, limited | Stream played in Just+ for several minutes; no claim about completion |
| End-to-end watched sync | NOT VERIFIED | No eligible episode and no Trakt acknowledgement observed |
| Controlled Trakt, transition and raw-bridge regressions | PASS, 179/179 | Includes measured 90–95%, 96–100%, no-visit rejection, stale owner rejection and retry after transient API failure |
| Android wrapper patch static checks | PASS | `git diff --check` and reverse-apply validation against the exact v1.13.5 source |
| Android wrapper compile | NOT VERIFIED | Gradle 7.5.1 is incompatible with installed JDK 21; installed Android SDK has platform-tools only |

## Prepared native bridge

`native-bridge-v1.13.5.patch` is a scoped source patch against the Android wrapper tag matching the installed Lampa package. It passes whitespace and reverse-apply checks, but compilation is blocked: only JDK 21 is installed, while this wrapper uses Gradle 7.5.1 (unsupported class-file version 65), and the Android SDK has platform-tools only. It has not been installed or tested on hardware. The current production plugin cannot recover progress the native wrapper has already normalized away; the paired event contract is required for both 90–95% auto-next transitions and >=96% completion normalization.

</details>
