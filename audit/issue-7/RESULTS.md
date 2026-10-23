# Issue #7 verification — 2026-10-23

Scope: Trakt+ watched sync/status only. Base main5119195. Version3.2.0-issue7.
Final diff does not change YDesign, History/Timeline rendering rules or any other
Issue's implementation. Loader changes only the cache tag, not its plugin order.

## Outcome

- Additive, idempotent local import; no Favorite.remove path. Every required page
  and snapshot is validated before import. Failure/cancellation retains old data
  and provenance, does not advance successful-sync time and cannot commit late reads.
- Trakt-only public API returns true/false/null. null covers loading, error,
  unavailable, cancelled, stale, unmapped and insufficient completion evidence.
  Preferences controlling mark/hide/UI do not change status. Verified status is
  separate from retained local import history, so remote unwatch can return false
  without deleting a local record. Source is explicit in watchedStatus(card).
- Shows/anime require distinct aired episode evidence or authoritative progress,
  not any-episode membership. Proxy-stripped responses use bounded progress fetches.
  Legacy caches are not trusted; cache v6 retains only timestamped Trakt evidence.
- Existing consumers using boolean coercion/local fallbacks still need the planned
  Issue #8 display migration. This PR does not perform it.

## Executed checks

| Check | Result |
|---|---|
| JS syntax: Trakt+, loader, browser harness | PASS |
| node --test tests/trakt-watched-sync.cjs |52PASS,0FAIL |
| Repository checker | PASS; see repository-checks.log |
| git diff --check | PASS |
| Existing Chromium CDP/native Lampa + controlled transport/storage/Favorite |16PASS,0FAIL; errors=[] |
| Exact modified Trakt+ response SHA256 |707026e644fa9ee9b3a832600b2fa0a2eeec943e43159bca156be695f42480e5 |
| Unchanged baseline YDesign SHA256 |d6e718d335b92e9d8d2dbc27e26343eb7cacd0f21cfd3286ede2a98a644f6422 |
| Native cards, Home registrations, duplicate initialization, Right/OK/Back | PASS with controlled Trakt data |
| Real local Favorite/owned caches after browser cleanup | Unchanged; comparison returns true |
| HTTP mutations observed during browser scenarios |0; mutation guard installed |
| Live native API GET schema/count observations | PASS, aggregate-only; not account import |
| Real account sync/write or actual954/911 reconciliation | NOT RUN/BLOCKED by test scope; no account mutations authorized |
| Physical Google TV Streamer/FPS/long-session heap/player | BLOCKED; desktop is not hardware proof |

Read-only native transport returned100watched movies and44shows, without seasons
in full/default/full,episodes forms. Progress returned aired/completed/seasons.
The first two history pages had100events each and different first IDs. Native API
cache may apply. Those observations were retained for final fixture reruns, not
repeated per source revision. No private list, token, header or account ID is saved.

Unit cases cover complete/partial/error/empty snapshots, changing activities,
repeated/malformed pages, cancellation before/during import, hung transport,
idempotence,954records/no100cap, missing IDs, TV/anime specials/replays/future
records, stripped proxy payloads, concurrency limits, lazy dedup/cooldown,
legacy/stale/error/future cache, tri-state transitions, remote unwatch with local
data retention, explicit TMDB priority, UI preference independence and loader order.

Browser routes fulfill the exact local plugin bytes; response hashes and public
version prove the modified code executed. Favorite/owned cache writes and Trakt
responses use isolated memory fixtures. Native API read-only sampling is distinct.
Routes are removed afterward and the original tab/profile is preserved, not closed
or cleared. This is not a permanent deployment to the user's installed plugin set.

## Reproduce

```sh
node --test tests/trakt-watched-sync.cjs
node scripts/check-repository.mjs
node tests/trakt-watched-browser.cjs --skip-live
```

The browser harness needs the existing authorized tab at CDP9222 and Playwright
already available in the shared workspace. --skip-live reuses aggregate schema
observations and does not perform account writes. CI runs unit/static checks only.

## Review limits and rollback

No merge/main publication or Issue closure is authorized. Explicit remote-unwatch
pruning and fully Trakt-only YDesign badges are deferred. A plausible silently
truncated HTTP200 cannot be proven complete from an array-only wrapper; additive
imports remain non-destructive. Real-account reconciliation requires separate
controlled acceptance and must not be claimed from these fixtures.

Revert the feature branch/PR commits to roll back code. No user lists, credentials,
authorization, localStorage contents or browser profile need to be reset. Local
original commits are retained even when publishing equivalent GitHub API commits.
