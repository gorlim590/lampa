# Issue #125 — Google TV / Just+ field report

Date: 2026-10-30  
Device: Google TV Streamer 4K (Android 14)  
Installed apps: Lampa Android wrapper 1.13.5 (581); Just+ Player 2.5.1 (2005001)

## Result

**Verified on hardware:** Lampa launched the configured native Files/player handoff to Just+ with a real 10-item episodic playlist. Just+ showed the selected episode identity and media duration. The user switched inside the same Just+ session from S03E07 to S03E08; the active playlist item changed and playback position restarted at zero. Lampa did not become foreground during that transition.

**Not verified:** an Android result callback at the switch; periodic `report_interval_sec` delivery; clean player-exit callback delivery; >=96% normalization on this installed device; any Trakt history request/acknowledgement; and the post-write watched indicator. The `Keep Player Connection` setting was not read because the production app's private preferences are inaccessible without changing app state, and it was not toggled.

The measured E07 position was approximately 18m37s of 54m38s (~34%). E08 was stopped well below the configured watched threshold. Therefore no history entry was eligible or intentionally written. This run confirms the real transition path but does not reproduce a missed eligible completion.

## Root-cause assessment

The observed switch itself does not establish that a callback reaches Lampa immediately. The official Just+ API page contradicts itself about periodic reports: its schema says `report_interval_sec` reports while playing, while another sentence says the feature is ignored since 2.2.2. The released Lampa 1.13.5 source has an interval report path, but only asks for a 120-second interval when `Keep Player Connection` is enabled. That installed setting is unknown, and public Just+ source is older than the installed APK.

The strongest code-confirmed completion gap is in the Lampa Android wrapper: it normalizes playback at >=96% to `time=0,duration=0,percent=100`, and its `playerAutoNext` path can synthesize the same marker for previous items when switching episodes. The current wrapper source defaults `playerAutoNext` to true, but the effective owner setting on this device was not inspected. The plugin cannot distinguish a measured 96–100% visit from synthetic completion and correctly fails closed. Thus the same-hash episode switch is visible to Android, but a previous item can reach JS only as an ambiguous completion marker. A plugin-only change cannot recover raw position/duration/provenance already discarded by the native wrapper.

**Required safe fix:** add an Android-side, session-scoped raw Just+ report bridge before normalization, carrying exact item index/hash and S/E identity, raw position, measured duration, visit provenance, and end reason. Do not alter persisted Timeline normalization. Only real measured visits should be eligible; auto-next-only markers must remain ineligible. The report must reach JS even when normalized Timeline is unchanged, so repeated full snapshots can retry a failed history write.

No JavaScript production change is justified by this device run. The report bridge belongs in the Android Lampa wrapper and needs its own scoped native implementation and test build.

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
| Immediate callback on switch | NOT VERIFIED | No callback was observed in available logs; logs are not conclusive and exact interval preference is unknown |
| 120-second periodic report | NOT VERIFIED | The observed playback interval did not provide a conclusive receiver event; Just+ docs conflict |
| Callback on normal exit | NOT VERIFIED | A clean Just+ exit callback was not captured |
| >=96% raw vs normalized report | NOT VERIFIED on device | Source confirms normalization, but threshold playback was not performed |
| Trakt history attempt/confirmation | NOT TESTED | No eligible progress; no production history mutation |
| Physical playback of actual video | PASS, limited | Stream played in Just+ for several minutes; no claim about completion |
| End-to-end watched sync | NOT VERIFIED | No eligible episode and no Trakt acknowledgement observed |
