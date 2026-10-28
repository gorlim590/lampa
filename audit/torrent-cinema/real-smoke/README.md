# PR #119 real provider and TorrServer smoke

Run date: 2026-10-28. Tested against PR head `794d1a1d8096e877eb9792fae4acb1a49122cb54` using the existing authorized Lampa Chromium tab. The exact local `ui/torrent-cinema.js` artifact was loaded: 149250 bytes, SHA-256 `16dd3c98d21c83a4044782f2bcf460d746a920ce46dbb919a1abbfd08cf5bd78`.

## Results

### Final 30-second handoff investigation

With the exact local PR artifact loaded, the real Lampa Details page for `100 днів омани` (TMDb TV 293607) initialized and exposed a visible Torrent button. Its remote action created the native torrent component and called the configured `Parser.get` with the actual multilingual names: Korean original `100일의 거짓말` and Ukrainian `100 днів омани`. The visible overlay showed **«Пошук джерел…» at 108 ms**, then the real parser returned **0 releases at 2.598 s**; the overlay changed to **«Джерел не знайдено»**. The screen remained observable for the full 30 seconds. There was no parser error or timeout callback. This is an empty external search result, not a missing overlay/loading-state bug.

The Korean drama control `Гра в кальмара` / `오징어 게임` (TMDb TV 93405) followed the same real Details → Torrent flow. The visible overlay showed loading at 52 ms; the parser returned 28 real releases at 2.566 s and the UI showed 20 loaded at 2.688 s. Both cases were observed for 30 seconds. No release was selected, and no playback or download was started.

Instrumentation wrapped the existing Activity, Component.create and Parser.get functions and delegated all calls, callback data and errors to the original functions. It recorded no credentials, private URLs, magnets, or InfoHashes. Full boundary events and states are in [targeted-100-days-investigation.json](targeted-100-days-investigation.json). Focused tests passed 64/64.

- **PASS — The Others (2001):** 15 real releases in 3.824 seconds: Toloka.to (9) and Mazepa (6). Toloka.to Best Choice was first. The selected real release reported 1080p, 13 seeds, 0 peers, 16.08 GB, Ukrainian and English audio, and no detected dubbing studio. Native TorrServer handoff returned one file and metadata in 4.266 seconds; the Files UI showed 16.08 GB and no server error. Back returned to Details/Torrent Cinema with the release focused. No file was selected and playback did not start.
- **PASS — Arcane:** Lampa returned localized `Аркейн`, original `Arcane`, first-air year 2021 and two seasons. The real parser returned 20 releases in 12.231 seconds: Toloka.to (14) and The Pirate Bay (6). The inspected S02 release’s raw name includes 2024, 4K/2160p, Dolby Vision, HDR10, Ukrainian/English audio and subtitles. The expanded panel retained the full raw name and reported video/audio/subtitles/files details. No dubbing studio was detected. The row showed a season/year mismatch note, but the smoke did not record or change the native season filter, so this is unresolved for season-2 matching.
- **BLOCKED — 100 днів омани:** Lampa TMDB metadata resolved the actual series as `100 днів омани` / `100일의 거짓말` (2026-10-10). For 9.009 seconds after Torrent was opened, no results panel, status message, rows or final parser state appeared. This is not classified as an empty result, provider timeout or parser failure.
- **PARTIAL — parser failure handling:** the overlay remained usable and showed real releases. The run observed one external HTTP 400 and one external HTTP 404, but hostnames were discarded for privacy, so neither can be attributed to Toloka, Mazepa, or another configured parser.
- **NOT TESTED:** real-provider quality/tracker chip interaction, duplicate handling across real trackers, public-domain playback, and physical Google TV.

The run retained real release identity from parser `Title` fields; it did not append TMDB aliases. Ukrainian audio badges aligned with observed parser audio metadata. The checked Arcane entries did not provide dubbing studios.

## Evidence

- [The Others live Torrent Cinema](the-others-live.png)
- [Arcane live compact rows](arcane-live-compact.png)
- [Arcane live expanded details](arcane-live-expanded.png)
- [Sanitized machine-readable report](real-integration-smoke.json)

PNG captures are 7680×4320 because the existing browser had CSS viewport 7680×4320 at DPR 0.25 while the screen was 1920×1080. The inferred 25% page zoom was preserved; the browser and user settings were not changed. This is a capture of the existing test session, not a 7680×4320 physical display claim.

The original test tab was restored to its starting Lampa URL and left running. No credentials, API keys, magnets, hashes, private service addresses, or parser URL paths are included. No production settings changed, no file was selected, and no playback was started.
