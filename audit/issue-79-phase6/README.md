# Issue #79 — Phase 6 stabilization evidence

## Result

This patch stabilizes YDesign's optional TV metadata prefetch and updates the existing Home rows when metadata arrives. It does **not** establish a reliable startup-speed improvement; Issue #79 remains open and PR #131 remains Draft.

## Confirmed prefetch failure

The previous code used a short timer window to wait for Home focus/controller readiness, then read Favorites once. It also stamped `RowsStore.last` before checking candidates or request outcomes. If Home was not ready during that window, or Favorite data was still empty, later native readiness/data events did not reliably restart the work. Because the early stamp also activated a 20-minute cooldown, an empty or failed attempt could suppress useful work.

The final cold-start fixture makes the distinctions explicit: 24 eligible TV candidates, empty browser cache/storage, both YDesign rows using their default-enabled settings, a live `items_line` controller, and one new disposable browser context per trial. The branch began **0/24** TMDb TV metadata requests before usable Home and completed **24/24** after it in all five trials. Merged main began 115/120 before usable Home (19–24 per run) and the remaining five after. Branch source calls are bounded to four by the queue; the browser's native request layer observed at most two simultaneous requests in this fixture.

Root causes addressed: the exhausted timer-only readiness window, no rescheduling on later Home/controller/focus/Favorite events, and cooldown state recorded before a successful outcome. The branch now waits for a visible focused Home card and an enabled controller, retries readiness at most eight times per event, then stops until a later native event. Empty candidates do not set a success cooldown. Only fully successful work starts the 20-minute cooldown; failures use exponential backoff starting at 30 seconds and capped at 15 minutes. Successful metadata is cached even if its Home session has gone stale, but that stale completion cannot paint into another activity.

## Updating Home rows

When a successful response changes the computed YDesign rows, a coalesced targeted refresh uses Lampa Home's native `createAndAppend` path. It appends a missing YDesign row or refreshes only that row, preserves the selected card when replacing its contents, and does not call `Activity.replace()` or rebuild unrelated Home/Trakt rows. Controlled regression coverage confirms the existing Home receives the new row without reload, focus remains on the same card, empty candidates can resume on a later Favorite `read`, failures retry after 30 seconds, fresh cache avoids another request, and late results after leaving Home do not mutate the new activity.

## Interleaved cold-start comparison

Ten disposable runs were interleaved `main, branch, branch, main` and repeated; each used a new context with empty cache/storage/cookies, Chromium 156, 1920×1080 CSS viewport, DPR 1, the actual Siaivo host/core, and local repository scripts intercepted before host bootstrap. A controlled 24-TV Favorite fixture was used; no saved user Home rows, credentials, preferences, or Trakt data were copied. Full per-run timings, sanitized resource waterfall, navigation events, local source hashes, and failures are in `browser-results.json` and `interleaved-runs/`.

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
- `tests/design-home-startup.cjs` is included in the required Repository checks workflow; verify its execution in final-SHA GitHub logs before closing this acceptance item.
- `node scripts/check-repository.mjs`, JavaScript syntax checks, and `git diff --check`: PASS.
- GitHub Actions: verify all five workflows on the final pushed PR SHA; repository logs must show `tests/design-home-startup.cjs` executed.
- Physical Google TV: NOT TESTED.
- User's saved Home rows and personalized production feed: NOT copied into disposable contexts; behavior with that exact stored feed remains unverified.

## Rollback

Revert the Phase 6 commit. It changes no stored settings and performs no data migration. No parser, Trakt, torrent, or credential configuration changes are included.
