# Independent Just+ Callback Probe — 2026-10-30

## Physical evidence

Separate debug package `org.lampa.justplusprobe` was built and installed, without replacing Lampa or Just+. Source is in `JustPlusCallbackProbe/`. Test media: public Sintel trailer from W3C (Blender Foundation, CC BY 3.0). Each item used a unique public URI query and explicit position zero. No Trakt code/account exists in the probe. No production history or settings were changed. Lampa was returned to foreground afterwards.

`probe-events.jsonl` contains only receiver/ActivityResult metadata, random test session IDs and measured positions. The initial session c765… is excluded from position conclusions because identical URIs could reuse player resume state. Subsequent sessions used unique per-item/per-launch URIs.

### Interval session 2c1bc553…

- Launch: 1793373844611 ms.
- Manual next dispatched: 1793373858241 ms; native MediaSession changed item 0 → 1 at position zero. Receiver remained empty for this session at that point.
- Repeated previous commands reset item 1; they did not change item identity and are not counted as B → A evidence.
- Automatic next to item 2 observed at 1793373922136 ms. No receiver callback yet.
- First callback: 1793373964957 ms, **120346 ms after launch**, `end_by=interval`, while Just+ remained active. Positions `[11,52,46]`; history contained the three visited items with measured durations 52 seconds.
- Playlist completion ActivityResult: 1793373970666 ms, `end_by=completion`, positions `[11,52,52]`.
- Separate receiver completion: 1793373971560 ms, 894 ms after ActivityResult, identical measured snapshot.

**Just+ 2.5.1 supports report_interval_sec=120 on this physical device.** The documentation statement that it is ignored is contradicted by this receiver evidence. Neither manual nor automatic next produced an immediate receiver callback in this run; the first callback was the interval.

### No-interval session 74428fdd…

- Launch: 1793373989492 ms.
- Home key: 1793373994705 ms.
- Receiver callback: 1793373996020 ms, `end_by=user`, position 4/52 seconds. No ActivityResult at Home.
- Returned to Just+, resumed playback, issued next then two immediate previous commands. Native MediaSession confirmed item 0 again. Home then produced another callback at 1793374037972 ms.
- History correctly held visits 0 → 1 → 0 with positions 6, 0, 0 seconds. No synthetic completion was reported for the brief item 1 visit.

A separate early Back run produced ActivityResult and then receiver callback (~921 ms later). Repeated launches generated distinct probe session IDs. Replacement of an actively playing session by a new launch was not separately tested.

## Component matrix

| Component | Input | Output | Runtime evidence | Result |
|---|---|---|---|---|
| Just+ 2.5.1 | Official playlist + mutable explicit PendingIntent | Full snapshot | Own receiver: user, interval, completion; actual positions/history | PASS on test media |
| Android BroadcastReceiver | Just+ PendingIntent | Probe JSON journal | Receiver callback independent of ActivityResult, including Home | PASS for probe |
| Production Lampa receiver | Just+ callback | Native report | Installed APK manifest confirms non-exported `top.rootu.lampa.receivers.PlayerReportReceiver`; payload not instrumented | NOT VERIFIED |
| Production MainActivity | Native report | Timeline | Source: background reports retained unless resumed or interval+keep; auto-next and >=96% normalize to 0/0/100 | Source-confirmed loss; runtime payload NOT VERIFIED |
| Production WebView | Timeline/native report | JS event | No accessible WebView debug socket; optional PR event absent in installed APK | NOT VERIFIED |
| PR Trakt JS | Exact measured fixture payload | Mock history | 89/90/93/95/96/99/100 tests; duplicate snapshots; episode isolation | PASS in controlled fixtures |
| Real Trakt API | History request | Confirmation | No real history mutations permitted/performed | NOT TESTED |
| Trakt+ UI | Confirmation | Watched cache/UI | Existing controlled confirmation regressions only | NOT VERIFIED physically |

## Answers and responsibility

1. No immediate callback was observed on manual or automatic item switch in the controlled physical run. This is bounded runtime evidence, not a proof for every Just+ mode.
2. With interval enabled, first observed delivery was 120.346 seconds after launch. Without interval, Home delivered a user callback; Back and natural playlist completion also delivered callbacks.
3. The probe receiver receives while its Activity is behind Just+. Production Lampa background receipt is not proven by this test.
4. Lampa v1.13.5 source discards measured progress through both >=96% normalization and synthetic prior-item auto-next completion. The exact production receiver payload remains uninstrumented.
5. Existing JS can count measured 90–95% only if positive time/duration reaches it; a prior item overwritten by auto-next cannot qualify safely.
6. Preserving trustworthy 96–100% evidence requires native wrapper changes (or equivalent unnormalized bridge); JS cannot reconstruct discarded provenance.
7. Immediate per-switch synchronization requires Just+ to emit a result at the switch, or another supported per-switch channel. Interval reporting gives bounded periodic delivery, not immediate delivery. Keep Player Connection is OFF on this device; it was not changed.
8. Reliable post-return synchronization requires the wrapper to forward raw measured visits before normalization and independently of Timeline equality, plus the guarded JS consumer. The proposed patch is not installed, so end-to-end success remains unverified.
9. Just+ interval/callback transport worked in the probe. Lampa owns background deferral and raw-progress loss. Our repository owns strict identity, threshold, idempotent history writes/retries and confirmed UI refresh. No actual Trakt API failure was established.

## Remaining acceptance

An instrumented separate Lampa debug build is required to prove receiver → keptReports → WebView delivery without modifying production. No such build was installed. The current production WebView script URL/hash and threshold remain inaccessible through ADB private storage/debugging; do not assume Draft PR bytes are loaded. Test the native patch with probe media and mocked Trakt before any production installation. This report does not close Issue #125.
