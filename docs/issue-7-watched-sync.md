# Issue #7: safe watched import and series completion

This changes Trakt+ and its existing YDesign bridge only. It does not add rating,
Watchlist, recommendations or other Issue features.

## Data safety

- Fetch/validate watched movies, every movie-history page and full watched-show
  records before any Favorite operation. API errors, invalid shapes, missing or
  repeated history event IDs, cancellation and changed last-activity stamps stop
  the import. Requests have a20-second watchdog and bounded retries.
- Import is deliberately **additive**. It never calls Favorite.remove, even after
  a successful response. Existing library movies, watched-cache movie IDs and
  import ownership keys are retained/merged. A silently truncated HTTP200 cannot
  erase previously imported records. Explicit remote-unwatch reconciliation is
  outside this change; remove unwanted local marks explicitly.
- Last-sync advances only after a completed import. If cancellation/error occurs
  during a batch, prior records remain, and provenance for already-added entries
  is saved without declaring success. Repeating the import skips viewed entries.
- No tokens or endpoints are exposed in diagnostics. syncStatus reports only
  counts/status; missing-TMDB records are counted instead of guessed by title.
  Synthetic954/911 fixtures do not establish the cause of an actual account's
  count discrepancy.

A completed operation means all requested pages succeeded and activity stamps
remained stable. The API wrapper exposes arrays rather than transport pagination
headers; it cannot independently prove that a proxy never silently truncates an
HTTP200 response. Additive/no-delete behavior remains safe in that case.

## Series/anime

The former noseasons list proved only that a show had been started. Trakt+ now
requests full watched-show data, counts distinct watched regular season/episode
coordinates (not plays), and requires a positive aired_episodes total with an
exact matching count. Duplicate replays, specials-only, future-dated episodes,
missing seasons/totals or stale evidence do not prove completion. Completed
one-episode shows remain valid. No extra per-show progress requests are introduced.

Completion evidence expires after6hours and is replaced when new episodes air.
Cache version5 never trusts old v4 started-show membership as completed. Movie
cache IDs are preserved during migration. The existing YDesign timeline logic
remains intact; only its fallback to old managed viewed marks is suppressed when
Trakt+ cannot confirm completion. Explicit local marks outside Trakt+'s ownership
remain functional. This does not implement Issue #8's separate movie-threshold work.

## Validation

Run from the checkout root:

```sh
node --check trakt/trakt-plus.js
node --check ui/design-optimized.js
node --test tests/trakt-watched-sync.cjs
node scripts/check-repository.mjs
git diff --check
```

The regression suite uses in-memory API, Storage and Favorite implementations.
It makes no network calls or account writes. CI runs it on Node20. Browser evidence
and remaining physical-TV/live-account limits are recorded in the PR/test report.
