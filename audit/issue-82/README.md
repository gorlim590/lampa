# Issue #82 — «Ще» catalog viewer checkpoint

Date: 2026-10-29  
Base: `fedfd4f5be4516b2cd34b48cb8c64fc5de772cef` (main includes PR #134)  
Branch: `feat/issue-82-more-catalog`

## Change

The existing `trakt_plus_view` continues to use Lampa's native `Category` and the existing `createFullPager()` / `getRow()` data path. Its first `Category.build()` now uses up to 24 cards already present in the row cache. It no longer calls `pager.take(600)` before building. Later native `onNext` requests take at most 24 unique cards instead of 200. Requests for later source chunks remain demand-driven; no new Trakt endpoint, catalog producer, prefetch lane, or account write was added.

The pager keeps its source cursor on failed/partial pages so a later native `onNext` can retry. An initial empty/error result remains empty; the failure path reports that the user can reopen «Ще». A failed next-page attempt reports that reaching the end again retries the same page. Sparse results do not fabricate cards.

The focused local suite passed **141/141** across More viewer, watched sync, account isolation, Trakt personalization and ratings. `node --check`, `node scripts/check-repository.mjs` (78 JS files, 43 manifest entries, 579 URLs), and `git diff --check` passed.

## Trakt policy boundary

Issue #80 remains open and is still the repository's P0 release gate for increasing catalog retrieval. This PR therefore does **not** add endpoints, query fan-out, background retrieval, or a larger source-page budget. The behavior change is limited to when the existing viewer asks for data and how many cached unique cards it passes to native `Category` at a time. This report does not claim a policy determination for Lampa's integrated torrent/player product.

Trakt's current API guidance says discovery information may be displayed in-app and prohibits bulk harvesting, catalog mirroring, redistribution, and restriction evasion. Pagination is endpoint-specific and recommends using response headers; rate-limit guidance says respect `Retry-After` and use bounded backoff if absent. These general docs do not resolve the specific product applicability questions in open Issue #80. No live Trakt endpoint was called for this work.

- [Trakt API Use Policy](https://developer.trakt.tv/docs/api-use-policy)
- [Trakt Pagination](https://developer.trakt.tv/docs/pagination)
- [Trakt Rate Limits](https://developer.trakt.tv/docs/rate-limiting)
- [Issue #80 P0 gate](https://github.com/gorlim590/lampa/issues/80)

## Focused production-handler regressions

`tests/trakt-more-view.cjs` executes the actual `registerView()` / `createFullPager()` handlers from `trakt/trakt-plus.js` through the test-only seam in `tests/helpers/trakt-watched-fixture.cjs`.

- Cached abundant row: first build is 24 cards and makes zero pager/source requests before render.
- Paging: pages are capped at 24, deduplicated, and carry accurate page numbers/end state.
- Sparse cache: current records render immediately without an empty follow-up fetch or fake results.
- Empty cache: only a bounded first page is collected before the first native build.
- Errors: a failed source cursor is retained; later user-triggered retry succeeds without skipping the page.
- Empty/error first render shows an explicit Bell retry instruction.
- `openMore()` preserves the registered row ID and existing `trakt_plus_view` component.

The tests use in-memory fake responses only. They do not issue authenticated Trakt requests or writes.

## Existing Chrome observation (fixture only)

Used the existing main Chrome DevTools tab (`page 3`) at `https://siaivo.isroot.in/?card=125988&media=tv&source=tmdb`; original viewport was 1920×937 at DPR 1. Read-only inspection showed the installed Trakt+ script URL and active native Details controller. For UI isolation, temporary `Lampa.Component.add` entries rendered deterministic synthetic cards directly through the installed native `Category`; the fixture code itself makes no Trakt or Storage calls. The signed-in app stayed active, so its normal background reads were not counted as fixture requests. No history/rating writes or Storage writes were initiated. Temporary registrations were cleared by reloading the original URL.

| Native Category fixture | Viewport / DPR | Cards in active DOM | Visible cards | Focus / controller |
|---|---:|---:|---:|---|
| Baseline one-shot 120-card build | 1920×1080 / 1 | 120 | 10 | first card / `content` |
| First-page build | 1280×720 / 1 | 24 | 10 | first card / `content` |
| First-page build | 1920×1080 / 1 | 24 | 10 | first card / `content` |
| First-page build | 3840×2160 / 1 | 24 | 10 | first card / `content` |

Actual ArrowRight moved from fixture card 001 to 002; ArrowDown moved to card 007. With paged fixture data, native Category loaded subsequent pages while focus moved, and 120 cards remained in its DOM after five pages. Escape returned to the original Silo Details route and `full_start` controller. A reload restored the exact original URL, 1920×937 viewport, DPR 1, and removed all temporary component registrations.

The paired screenshots show the same synthetic catalog at 1920×1080: the 120-card native baseline and the 24-card first-page state. 720p and 4K files are real separately rendered browser captures. These screenshots validate the native Category presentation and card-batch size only; they are **not live Trakt results** and do not prove the changed plugin script ran in the user's Lampa runtime.

- [Baseline Category fixture, 120 cards](screenshots/issue82-before-120-1920x1080.png)
- [First page Category fixture, 24 cards](screenshots/issue82-after-1920x1080.png)
- [1280×720](screenshots/issue82-final-1280x720.png)
- [3840×2160](screenshots/issue82-final-3840x2160.png)

## Review follow-up — session ownership, retry and end state

- The More activity captures `sessionEpoch`, `ratingProfile()` and the verified account owner (when already known). It checks this owner after `getRow()`, before every later request, after each source chunk, and immediately before building/appending results. A credential or profile change invalidates the view and prevents its pending page from reaching native Category. Deterministic tests cover both an initial pending row and a later page resolving after credential/profile change.
- Inspected Lampa native [`Category.onLoadNext`](https://github.com/yumata/lampa-source/blob/master/src/interaction/items/category/module/next.js): native code increments `object.page` before `next` and `reject` only clears `next_wait`. On a failed page the viewer restores `object.page` to the last successful page, so a subsequent native scroll-end/Down-at-end can invoke the same page again. No automatic pagination loop starts on failure. A 429 is not retried by a timer; `Retry-After` is honored globally for catalog requests (30 seconds if absent), queued requests are suppressed during the window, and the visible notice tells the user to wait and retry at the end.
- End notification now occurs as soon as the final actual chunk is delivered (or an exhausted cached page is built). It does not wait for a later `onNext()` callback that native Category will never emit. An empty catalog continues to use native `empty()` state.
- **Important boundary:** the 24-card UI batches do not reduce the initial `getRow(def)` payload or its existing requests. `getRow()` still loads its configured preview chunks; upstream `feed()` still requests `limit=100` per endpoint. This change has no cold-start or live-provider speedup measurement.
- Main Chrome used the existing native Category for two controlled navigation checks. A one-card fixture opened real Silo `full` Details; Escape returned to the same fixture card/page. A separate 42-card fixture used ArrowRight + seven ArrowDown presses to reach `Controlled Film 37` at index 36 and native `scroll.position() = -3907.59375`; Enter opened a controlled Details activity and Escape restored the same focus, index, page and scroll position exactly. These validate native activity restoration; they do not load the changed Trakt+ script into the authenticated runtime. The original Silo URL, 1920×937 viewport, DPR 1, and “Коментарі” focus were restored, and temporary component registrations disappeared after reload.

## CI gate

All five GitHub Actions passed on code SHA `e4d8e37f0173253cbcc69196482c51d9b20740af` (Repository checks, Home order, Home history, Parser provider regressions, Season integrity). On this follow-up the CI suite is rerunning on the final pushed SHA. The Repository checks log confirms `tests/trakt-more-view.cjs` ran in the Trakt/YDesign regression step.

## Limitations and acceptance status

- **Verified by tests:** first build uses cache; page size is 24; duplicates are suppressed; failures retain the retry cursor; row identity stays bound to the existing native viewer.
- **Browser verified:** installed native Lampa `Category` accepts the fixture, Arrow navigation works, viewport layouts render, and Escape returns to Details.
- **Changed-source runtime:** `trakt/trakt-plus.js` was not injected into the signed-in main tab. Re-executing it could duplicate account-scoped listeners/row registrations and invoke authenticated reads; the authorized DevTools MCP exposes no safe route-level script interception. Production handlers are tested from exact source in Node VM tests; browser tests validate the installed native Category/Activity contract.
- **Native limitation:** installed `Category` accumulates DOM items as pages are appended (120 cards remained after five 24-card pages). This PR reduces initial DOM to one 24-item batch, but does not claim virtualization or a bounded lifetime DOM window. A safe native Category recycling contract has not been established.
- **Performance timing:** no comparable live-provider before/after latency or cold-start speedup is claimed. The 24-card UI batch does not change `getRow()` request count or per-endpoint payload size. Provider latency and catalog population remain unmeasured.
- **Missing measurements:** first-card wall-clock, first actionable D-pad wall-clock, and page request latency were not captured; fixture timing is not production Trakt/provider timing. Exact changed-source More → Details → Back is not browser-tested, though the existing native Category/Activity restoration contract was exercised with controlled fixtures as described above.
- **Sparse catalog, empty state, and 429 behavior:** covered with deterministic fixture responses; not tested against live Trakt.
- **Physical Google TV:** NOT VERIFIED.

## Rollback

Revert the scoped commits in this PR. No settings, Storage, credentials, Trakt history, or endpoint configuration were changed. The existing full-view component and Home rows remain the same owners.
