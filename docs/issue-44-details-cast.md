# Issue #44 — lower Details, Cast and cached Trakt filmography

Baseline: `main@418b90e056dd81a0e3538948600d79981e9f1a05`. Branch: `feat/details-cast-trakt`.

## Ownership and behavior

- Native Full and Actor components remain responsible for rendering, focus, scroll and routes. No second person page/plugin is registered.
- Hybrid reversibly detaches only native `.full-descr__details` (release/budget/countries). Models are preserved; genres/studios/tags remain. Sparse pages keep their inline overview and omit the otherwise empty lower Description row. Theme off restores native presentation; re-enabling restores compact presentation. Native cast/director cards keep their original actions and role/name/photo, with compact portraits and readable focus.
- Trakt+ adapts only Full presentation payloads: official TMDB collection membership, unique chronological movie parts including the current film, no single-title/empty/malformed collection. Contradictory membership is rejected; TV/anime retain native episodes instead. Existing Trakt Related loader/cache supplies Similar, excluding current/collection overlaps. Native recommendation/similar UI and empty native comments are omitted; shared API methods are retained. Native Full metadata may still fetch bundled recommendation data upstream; this change does not claim to eliminate every core TMDB request.
- Actor credits use the existing native person API, source/language/ID-keyed public cache (6h, max32 entries), request coalescing and a15s deadline. The native source may itself cache metadata longer. Account/profile projections are recalculated from confirmed cached Trakt data. Old callbacks cannot paint a departed Actor or replace a newer job.
- All/Watched/Unwatched and year/rating controls use native Select and route replacement. All sections partition the works without repetition. Complete watches and partial TV progress are distinguished; unknown is never added to Unwatched. A partially watched show is labeled with episode progress, not a completed-show tick.
- Opening/filtering a person does not start a full sync or per-card Trakt/progress request. Optional cast watched count appears only for already-cached complete evidence; no person-by-person metadata fetches.
- YDesign's small adapter applies **only** to new `_trakt_cached_only` cards: confirmed cached Trakt marks, session-aware mark cache and its own partial badge lifecycle. Existing Home/ordinary cards remain unchanged. This is not the broader Draft PR#29 rewrite.
- Base Trakt Related Lists uses one pending owner/scope and one insertion target, avoiding duplicate controls and stale account/profile results. Home/torrent/player algorithms and loader order are unchanged. Loader revision updated to `20261024-details-44`.

## Reproduce targeted checks

```sh
node --test --test-timeout=15000 tests/details-cast.cjs
node --test --test-timeout=15000 tests/seasons-info.cjs tests/details-info.cjs tests/hybrid-ui.cjs tests/trakt-watched-sync.cjs tests/trakt-account-isolation.cjs tests/home-history.cjs tests/home-order.cjs
node scripts/check-repository.mjs
git diff --check
# Existing Chromium CDP9222 only; Playwright already supplied by local test environment:
node tests/details-cast-browser.cjs
CAST44_FINAL_ONLY=1 node tests/details-cast-browser.cjs
# Optional narrow conflicting-local-marks scenario (earlier successful result reused):
CAST44_MARKS_ONLY=1 node tests/details-cast-browser.cjs
```

Results: **209 targeted automated tests PASS /0FAIL** (28new Details +181existing regressions), syntax/repository **62JS/454URLs PASS**, whitespace PASS. Final style-only correction also passed the7relevant Hybrid tests (included in209; not counted twice). CI runs the Details tests in the existing seasons/details workflow.

## Browser evidence and limits

Committed harness: `tests/details-cast-browser.cjs`. Sanitized fixture-only results: `audit/issue-44/browser.json` (**17PASS**) and `browser-final.json` (**7PASS**). No JavaScript exceptions. Exact SHA-256 response-byte checks are tied to `testedProductCommit` in each report. The final narrow pass covers the subsequent one-rule focus-color fix; the17-check pass is reused for unchanged logic. All four modified runtime plugins were actually loaded. Complete base Trakt source executes, then a test-only public transport override supplies deterministic responses. Other product JS executes unmodified. These are real native-UI/browser integration tests with mocked service data, **not live Trakt service verification**.

The harness shadows writes in memory, blocks non-GET network mutations, restores the test URL/viewport, never closes Chromium and uses the existing context/profile. It may create a single Lampa test tab if the CDP context has none. No tokens or user histories are exported. Fixtures use invented titles, IDs, portraits and accounts. An inherited unrelated preview-loader/plugin load warning was visible in the test environment; those plugins were not accepted as covered. The actor screenshot crop shows only the relevant fixture UI and is not full-screen layout certification. The final cast contrast is checked via computed style; a blank native transformed-scroll element crop was rejected and excluded instead of being published as visual proof. Initial diagnostics/failed attempts/raw PNGs are intentionally untracked.

Verified: collection/current/related dedup; native seasons/cast rows preserved; keyboard Down/OK/Back with cast return focus; Actor reopen/cache/filter/rating sort; partial2/10progress; account change/logout; no additional Trakt requests on Actor open/filter; no collection; sparse description and theme toggle; disabled/offline Trakt metadata and unknown filters; focused cast text. Existing watched/account-isolation/Home regression tests pass.

**NOT TESTED:** physical Google TV, real portraits/live actor catalog accuracy, live Trakt sync or writes, real TorrServer playback, exhaustive third-party plugin combinations, FPS/memory performance. No new DOM observer/interval added. No physical-device performance claim.

## Release

Publish this scoped branch, verify current-base conflict status and required CI, then use normal PR merge only if green. User explicitly authorizes this merge. Do not import Drafts#29/#41/#42. CI/PR/merge/Pages result is recorded in Issue#44 and the root continuation checkpoint after publication. Revert via the resulting PR's merge commit if needed; no user data migration is involved.

Public product commits: `f0dd93f36505b7a336ae5e4ed9151f6ce299dd41` (17-check pass, exact tree of local2416f37) and `c61cfbb0924cfb6416ba65b34c1dfc6d467ed2c8` (final7checks, exact tree of localbec69f0). Publication via the GitHub connector preserves each logical commit tree/blob while commit author timestamps/metadata may differ. Reports retain both identities and the tested tree.
