# Issue #14 — embedded entry and Files ownership

Status: **PARTIAL — review required, no automatic merge**. Baseline main
`67bad5f5432022030a93bd1c2b1ceef3bb7c63e6`. PR #29 and #41 were not imported.

## Confirmed defects and changes

* Native Full keeps `.view--torrent` inside `.buttons--container.hide`.
  ButtonsPlus moves that existing button into the visible action bar. Hybrid now
  performs this minimal relocation itself and records its original position for
  theme teardown. It neither clones the button nor replaces its handlers.
* Native handlers dispatch `hover:enter` through jQuery. Hybrid's existing native
  DOM capture listener misses those events. A reversible `Activity.push/replace`
  adapter now owns only matching torrent requests from the active Full page:
  content ID, source and movie/TV type must match. Other routes and arguments
  remain native. Changed search/season parameters recreate only the embedded
  child. The adapter preserves later wrappers and is dormant when Hybrid is off.
* Cinema's Files rating context previously admitted only an active standalone
  `torrents` Activity. `TorrentsRedesign.attachFiles()` gives the existing rating
  pipeline an explicitly owned Full lifecycle. Hybrid destroys that binding when
  its child closes. Existing request queue, cache, budget and IntersectionObserver
  are reused, without another parser or global observer.
* Rating callbacks now validate the file's identity, including media, source,
  season/episode and path. A late event for another title cannot borrow the active
  context. A recycled/offscreen row cannot receive the old score or start a late
  OMDb request. Missing/ambiguous episode metadata still produces no invented score.

## Dependencies retained

| Owner | Responsibility | Result |
|---|---|---|
| Lampa core Full | Native buttons, jQuery events and detail lifecycle | Existing handlers retained |
| Hybrid | Embedded child, focus, query bridge and Files presentation | Owns entry without ButtonsPlus |
| `torrents-redesign.js` | Release presentation and shared Files/IMDb pipeline | Full ownership adapter added |
| `providers/parsers.js`, `parser-search.js`, `torrent-search.js` | Parallel sources, aliases, deduplication/cache | Unchanged; #16/#17 tests reused |
| Native `torrents` component | Search/filter controller used as embedded child and legacy Activity | Retained |
| Native Torrent/Torserver/Player | Transfer, native file selection and playback | Retained |
| `ts-tracks.js` / `tracks-probe.js` | Optional ffprobe/file stream metadata | Not rewritten; full native Files proof still pending |

The old component is part of the externally delivered Lampa core, and its
constructor is still used by the embedded implementation. Unregistering it would
break the new block. No shared API, legacy route or fallback was deleted.

## Evidence and checks

* `node --test tests/torrent-details.cjs`: **8 PASS / 0 FAIL**. Covers route/type/
  source boundaries, cleanup and later wrappers, Full ownership, lazy/cache
  reuse, ambiguous episodes, recycled nodes, foreign events and late metadata.
* Existing #16/#17 tests: **64 PASS / 0 FAIL**; existing Cinema offline tests:
  **65 PASS**; Cinema state tests: **23 PASS / 0 FAIL**. No changed provider code.
* `node scripts/check-repository.mjs`: **PASS**, 62 JS files and 456 URLs.
  Syntax and `git diff --check`: **PASS**. Focused tests added to existing CI.
* `audit/issue-14/buttons-before.json`: clean reload with ButtonsPlus off/on
  reproduces the hidden button and escape to standalone Activity.
* `audit/issue-14/movie-keyboard.json`: two movie cases **PASS**, ButtonsPlus
  off/on, actual keyboard Enter/Down/Up/Back; one embedded fixture result, active
  Activity remains Full, Back restores `full_start`. Source SHA-256 hashes are
  recorded. Its third anime attempt failed and is explicitly retained as such.
* Screenshots `audit/issue-14/movie-off.png` and `movie-on.png` show those tested
  movie states. Only the existing CDP profile was used. Writes in controlled
  tests were memory-only; the ordinary user tab/browser were not closed.
* Native Torserver read-only health: **PASS**. Official WebTorrent Sintel fixture
  was checked as absent before testing. **Real playback NOT CONFIRMED**: the test
  timed out waiting for the active detail fixture, before native file selection
  or player invocation (`nativeCalls: 0`). It is not a Torserver playback PASS.

## Remaining acceptance work

1. Fix the controlled metadata setup for fresh TV/anime and Sintel details in the
   current native core. Network fixtures did not reliably control the active
   detail component; a later provider callback fixture also failed to populate it.
   Movie entry checks passed, but do not prove TV/anime runtime equivalence.
2. Run the changed rating pipeline in real native Files: verify exact episode
   identities, visible-only IMDb requests, warm cache and no stale updates. Unit
   mocks are not a substitute for this runtime check.
3. Verify ffprobe quality/HDR, audio/subtitle tracks and selection against actual
   native Files payloads. Do not send authenticated stream URLs to external probes.
4. Complete controlled native TorrServer Files → Player playback, back/focus and
   error/timeout tests. Current failed attempt added no fixture (no release selected).
5. Only after equivalence and real playback proof, decide which legacy *UI-only*
   routes/resources can be retired without deleting the shared constructor/APIs.
6. Physical Google TV Streamer 4K: **NOT TESTED**. No FPS/memory improvement claimed.

Do not close #14 or merge this entire change automatically while the critical
runtime checks above remain unconfirmed. Revert this PR to restore baseline
ownership; no user storage migration or credentials changes are involved.
