# Issue #7 — safe imports and authoritative Trakt status

Only Trakt+ watched sync/status and its tests/CI are changed. YDesign is byte-for-byte
unchanged from main. Rendering rules, movie thresholds and the migration of all UI
badges away from local History/Timeline remain Issue #8, not part of this PR.

## Public status contract (3.2.0-issue7)

```js
var value = TraktPlus.isWatched(card);
// true: fresh Trakt evidence confirms completed viewing
// false: a successful, sufficiently mapped snapshot confirms not completed
// null: unknown — loading, unavailable, error, cancellation, stale or unmapped data
var detail = TraktPlus.watchedStatus(card);
// { value, source: 'trakt', phase, updatedAt }
```

Consumers must compare strictly with true/false and retain an explicit unknown
state. Do not use `!!value`, `value || false`, or `!value` as proof of unwatched.
Status is independent of mark/hide/theme preferences. Explicit TMDB IDs take
precedence over generic IDs; Trakt-only/non-TMDB identities remain unknown.
Local Favorite, History and Timeline never establish the public API's truth.

Fresh verified movie IDs are separate from additive import history: a later valid
Trakt snapshot can report false after remote unwatch while preserving the earlier
local record. A missing-TMDB remote record keeps negative identity inference
unknown. Legacy caches cannot prove completion. Cache v6 stores only timestamped
Trakt status evidence; stale/future-dated/error states are not false.

The current unchanged YDesign still has local fallback rules and boolean coercion.
Its fully Trakt-only rendering/unknown-state UI is intentionally deferred to #8.
Existing native cards and navigation are tested for compatibility, not certified
as already following that future display policy.

## Data safety

- Fetch and validate watched movies, every movie-history page and watched shows
  before Favorite operations. Errors, invalid response shapes, repeated/missing
  event IDs, cancellation and changed activity stamps abort the operation.
- Both explicit sync and background status refresh verify activity snapshots.
  Requests have a20-second watchdog and bounded retries. Cancellation releases the
  import promptly even when native HTTP cannot abort its underlying read; late
  responses cannot commit stale data.
- Imports are deliberately additive. No Favorite.remove is called. Existing movie
  library entries, import provenance and historical cache IDs are merged/retained.
  Explicit local deletion/unwatch reconciliation is not automated by this change.
- Last-sync advances only for completed imports. Partial/failed/cancelled work does
  not declare success. If cancelled during a batch, already-added records and their
  provenance are retained; repeating skips existing viewed entries.
- Native Favorite.add integration is preserved; no direct Trakt write endpoint is
  introduced. Unit/browser tests replace it in memory and block HTTP mutations.

A successful operation means all requested pages passed validation and activity
stamps were stable. The native API wrapper returns arrays without pagination
headers, so arbitrary plausible HTTP200 truncation cannot be independently proven
absent. The no-delete import policy remains safe even then. No claim of absolute
completeness for an untested live account is made.

## Series/anime and installed-proxy compatibility

Started-show membership is not completion. Use distinct watched regular episode
coordinates with a positive aired total, or authoritative aired/completed progress.
Replays and specials do not substitute for regular episodes; missing/zero totals,
unknown metadata and stale evidence return null, not false or true.

Some installed proxies omit seasons even with extended=full. Explicit imports then
fetch progress including hidden regular seasons, excluding specials, at most two
requests concurrently. Home resolves unknown visible candidates lazily and coalesces
per-show work, with at most128queued jobs, five-minute cooldown for errors/unknown
results and six-hour evidence lifetime. No permanent polling interval is added.

A progress error aborts explicit sync before Favorite writes. Unidentifiable or
zero-aired shows are reported as partial/unknown without advancing last-sync.
Exactly100-item watched-movie responses are expanded through strict history
pagination. Explicit imports already read history once and reuse that evidence.

## Validation and limits

```sh
node --check trakt/trakt-plus.js
node --test tests/trakt-watched-sync.cjs
node scripts/check-repository.mjs
git diff --check
```

CI runs the unit suite on Node20. Browser tests use the existing authorized CDP tab:

```sh
node tests/trakt-watched-browser.cjs
# Reuse earlier aggregate read-only transport observations during fixture reruns:
node tests/trakt-watched-browser.cjs --skip-live
```

The browser harness proves the executed source SHA256/version, uses native cards,
Home registration and Right/OK/Back, and isolates Favorite/owned caches in memory.
Temporary routes are removed afterward; no new profile is created or browser closed.
This is not a permanent plugin installation or a live account write/import test.

Read-only native API observations:100watched movies,44shows, all44with aired totals
but without seasons across three query forms; a progress response had counters and
seasons; first two history pages had100items each with different first event IDs.
Only aggregate schema/count information is saved, not tokens, headers or private
lists. Native API cache may apply. These observations do not resolve the actual
954/911account discrepancy; synthetic954/911 tests are explicitly separate.

Full account reconciliation, real import/remote persistence and physical Google TV
performance remain unverified. Results and screenshots are in audit/issue-7/.
