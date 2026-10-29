# Issue #79 — Phase 6 stabilization evidence

## Result

This patch stabilizes YDesign's optional TV metadata prefetch and updates the existing Home rows when metadata arrives. It does **not** establish a reliable startup-speed improvement; Issue #79 remains open. PR #131 is ready for review as a correctness/lifecycle checkpoint.

## Confirmed prefetch failure

The previous code used a short timer window to wait for Home focus/controller readiness, then read Favorites once. It also stamped `RowsStore.last` before checking candidates or request outcomes. If Home was not ready during that window, or Favorite data was still empty, later native readiness/data events did not reliably restart the work. Because the early stamp also activated a 20-minute cooldown, an empty or failed attempt could suppress useful work.

The final cold-start fixture makes the distinctions explicit: 24 eligible TV candidates, empty browser cache/storage, both YDesign rows using their default-enabled settings, a live `items_line` controller, and one new disposable browser context per trial. The branch began **0/24** TMDb TV metadata requests before usable Home and completed **24/24** after it in all five trials. Merged main began 115/120 before usable Home (19–24 per run) and the remaining five after. Branch source calls are bounded to four by the queue; the browser's native request layer observed at most two simultaneous requests in this fixture.

Root causes addressed: the exhausted timer-only readiness window, no rescheduling on later Home/controller/focus/Favorite events, and cooldown state recorded before a successful outcome. The branch now waits for a visible focused Home card and an enabled controller, retries readiness at most eight times per event, then stops until a later native event. Empty candidates do not set a success cooldown. Only fully successful work starts the 20-minute cooldown; failures use exponential backoff starting at 30 seconds and capped at 15 minutes. Successful metadata is cached even if its Home session has gone stale, but that stale completion cannot paint into another activity.

## Updating Home rows

When a successful response changes the computed YDesign rows, a coalesced targeted refresh uses Lampa Home's native `createAndAppend` path. It appends a missing YDesign row or refreshes only that row, preserves the selected card when replacing its contents, and does not call `Activity.replace()` or rebuild unrelated Home/Trakt rows. Controlled regression coverage confirms the existing Home receives the new row without reload, focus remains on the same card, empty candidates can resume on a later Favorite `read`, failures retry after 30 seconds, fresh cache avoids another request, and late results after leaving Home do not mutate the new activity.

## Interleaved cold-start comparison

Ten disposable runs were interleaved `main, branch, branch, main` and repeated; each used a new context with empty cache/storage/cookies, Chromium 156, 1920×1080 CSS viewport, DPR 1, the actual Siaivo host/core, and local repository scripts intercepted before host bootstrap. A controlled 24-TV Favorite fixture was used; no saved user Home rows, credentials, preferences, or Trakt data were copied. The branch source was tested at commit `a93e941596a98e8ce48d2d0c8d250010d51ff1ee`; the final PR head retains the same production source hash. Full per-run timings, sanitized resource waterfall, navigation events, local source hashes, and failures are in `browser-results.json` and `interleaved-runs/`.

| Metric (navigation start, ms) | Main median (range) | Branch median (range) |
|---|---:|---:|
| First usable Home | 4450 (3975–6507) | 4168 (3740–5037) |
| `appready` → usable Home | 904 (724–1114) | 721 (670–1154) |
| First successful D-pad movement | 79 (63–568) | 74 (58–168) |
| Details ready after Enter | 932 (716–1170) | 773 (711–1001) |
| Back and Home focus restored | 297 (87–792) | 126 (93–602) |

Although the observed branch median for first usable Home is 282 ms lower, the run-to-run ranges overlap substantially and the sample uses synthetic Home favorites. This is not sufficient evidence to claim that the branch makes startup faster or to attribute the difference to the patch. The earlier three-run sample was slower on branch; the new runs show how variable the host/network path is. The concrete verified change is the timing of the optional metadata requests, not a demonstrated launch-time gain.

All five main trials and all five branch trials completed three Home → Details → Back cycles (15/15 Details opens and 15/15 focus restorations per revision). All ten final runs had no page exceptions. First usable D-pad readiness is measured as the first ArrowRight that changes the focused card.

## Details navigation failure investigation

One intermediate controlled run did not open a synthetic TV Details card. The captured state was native Activity `full`, controller `content`, with a native `app.min.js` exception: `TypeError: countries.join is not a function`. The synthetic TMDb response had omitted the `countries` array required by Lampa's native Details renderer. The harness now supplies `countries`, `origin_country`, and `production_countries` as arrays. After correcting the fixture, the failure did not recur in 30 Details/Back cycles across main and branch. This was a harness data-contract failure, not a confirmed production regression.

## Main Chrome observation

The authorized Chrome DevTools session was used read-only. Its existing Lampa tab remained at `https://siaivo.isroot.in/?component=main&source=tmdb&page=1`, appready, on the main activity, with `items_line` controller, `The Dog Stars` focused, viewport 1920×937 and DPR 1. No page scripts, storage, settings, tabs, or profile state were changed.

## Validation

- `tests/design-home-startup.cjs` and `tests/ydesign.cjs`: PASS, including asynchronous empty-cache row fill, event rescheduling, bounded readiness, retry/backoff, fresh cache, stale-session protection, and existing YDesign behavior.
- Broader Home, Hybrid, startup, Settings, Trakt, and Torrent Cinema regression matrix: **488/488 PASS** locally.
- `tests/design-home-startup.cjs` is included in the required Repository checks workflow. On pushed SHA `6f1f02f2f8bed3c1d96195d5922e3ffe8b3c8fcb`, all five GitHub Actions passed; the Repository checks log shows the `Trakt and YDesign regressions` step ran the new cases and finished **204/204 PASS** ([workflow run](https://github.com/gorlim590/lampa/actions/runs/40827304141)). The final evidence-only head is rechecked separately after push.
- `node scripts/check-repository.mjs`, JavaScript syntax checks, and `git diff --check`: PASS.
- GitHub Actions: verify all five workflows on the final pushed PR SHA; repository logs must show `tests/design-home-startup.cjs` executed.
- Physical Google TV: NOT TESTED.
- User's saved Home rows and personalized production feed: NOT copied into disposable contexts; behavior with that exact stored feed remains unverified.

## Rollback

Revert the Phase 6 commit. It changes no stored settings and performs no data migration. No parser, Trakt, torrent, or credential configuration changes are included.

## Final Home lifecycle hardening — 2026-10-29

The PR #131 final review found three gaps in the targeted row-update path and one queue-boundary bug:

- A Favorite `add`/`added` event after successful warmup was ignored by the success cooldown. It now schedules a coalesced targeted row refresh and a metadata pass. Per-title cache freshness is checked before filling the 24-request queue, so 23 fresh candidates do not prevent a new 25th Favorite from being fetched or trigger requests for already-fresh shows.
- A new Home activity that became usable while an earlier Home request remained in flight could lose its refresh attempt. The coordinator now records one bounded rerun; successful stale-session responses remain in cache, then the current Home resumes and fetches only uncached candidates. Results never paint into the old Home or Details activity.
- Targeted YDesign updates now honor native `content_rows_ydesign_week` and `content_rows_ydesign_continue` visibility flags and invoke the existing `LampaHomeHistory.applyOrder(component)` API after changes. Reordering retains the selected row; removing an empty focused YDesign row transfers focus to the nearest surviving row.
- Favorite `read`/`remove` after a successful warmup performs no metadata refetch for fresh cache. Favorite events during failure backoff do not bypass retry limits; the regular retry still sees the latest candidate list.

Deterministic regressions cover Favorite add/remove/read after success and failure, duplicate native `add` + `added` notifications, exactly one request for a new uncached candidate after 24 candidates are present, Home A → Details → Home B with a response settling in flight, cache retention, no stale DOM writes, preservation of the active row/focus, hidden native row policy, and saved Home History ordering. The focused startup suite is 14/14 PASS; the full relevant Home/YDesign, Trakt, Hybrid, Settings, and Torrent matrix is 492/492 PASS. The authorized Chrome DevTools session was checked read-only: its existing Lampa tabs, URL, storage-backed visibility values, focus, and viewport remained unchanged. No new cold-start measurements were taken and no startup speedup is claimed.

Final validation was pushed to `4c86487a467331cfd913ba2fa5c89e2e6a9132d4`. All five workflows passed on that SHA. The Repository checks log confirms the four new lifecycle cases in `tests/design-home-startup.cjs` passed as tests 11–14; the full Trakt and YDesign job passed 208/208 with zero failures. PR #131 is ready for review as a Phase 6 correctness checkpoint. Issue #79 remains open: this patch does not demonstrate a startup speedup, and physical Google TV plus the user's exact personalized Home feed remain unverified.
