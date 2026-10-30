# Sanitized device event timeline

All timestamps below are relative ordering from the ADB session; wall-clock timestamps and private media identifiers are omitted.

1. **Lampa foreground.** Package inspection identified the Android Lampa wrapper and Just+ v2.5.1. The active Lampa card was the TV series *Silo*.
2. **Native torrent flow.** A real configured parser result was opened in Torrent Cinema, then the native Files list. The selected season pack contained 10 items. No parser/TorrServer configuration was changed.
3. **External launch.** Lampa handed the playlist to `com.justplus.player/.PlayerActivity`. Just+ showed episode title metadata for Season 3, Episode 7 and an actual duration of approximately 54m38s. The session's active playlist item was index 6 (zero-based as reported by MediaSession).
4. **Progress before switch.** The visible resumed position was approximately 18m37s, about 34% of the episode. This is below the configured watched threshold (~90%).
5. **In-player episode switch.** A native MediaSession `next` command advanced the same Just+ session to playlist item index 7, Season 3, Episode 8. Metadata changed to E08 and playback position reset to zero. Just+ remained the foreground player; Lampa did not receive focus at this transition.
6. **After switch.** E08 played for roughly two minutes, still far below the watched threshold. No synthetic seeking or completion marker was used.
7. **Stop/return.** Playback was stopped/backgrounded, then Lampa was brought back to the foreground. The available test did not capture a conclusive Just+ result callback or a matching Lampa Timeline update for the transition. No Trakt history write was eligible or attempted.
8. **Final environment.** ADB inspection confirmed Lampa as the top resumed Activity. Just+ MediaSession was stopped. No screenshot/raw UI dump was retained because it contained media/transport details.

This is a real multi-item external-player transition. It is not evidence of completion sync, callback timing at 120 seconds, exit-report delivery, or a Trakt server response.
