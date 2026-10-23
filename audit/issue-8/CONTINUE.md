# Issue #8 — continuation checkpoint (2026-10-23)

Stopped at the user's explicit request. Do not begin new changes until resumed.

## Locate the work

- Repository worktree: `/home/gostrimchik/lampa-testing/audit/issue-8-ydesign`
- Branch: `fix/issue-8-ydesign-vertical` (LOCAL ONLY; no Draft PR/publication yet).
- Baseline current-main SHA: `fcc148f88257daab6ce56681c51ecc7903274d94`.
- Completed earlier local commits: `5435b97` (vertical / retired background removal), `f58d52f` (account-bound Trakt presentation / metadata).
- The checkpoint commit containing this file saves lifecycle, CSS ownership, harness improvements and evidence. Resolve it with `git log -1` on this branch.
- No AGENTS.md was found in applicable ancestors/repository. No open PR conflicted at task start. Recheck remote state before publishing, not a new full audit.
- Scope remains ONLY #8. Read existing audit notes rather than redoing #7/#22/#9. Do not change #7 description, merge main, or close #8.

## Implemented

1. Only vertical card rendering/defaults/settings/CSS remain. Legacy orientation keys/classes are migration-only. Both settings event paths migrate imported old values. Horizontal catalog rows, Hybrid hero and detail backgrounds remain.
2. Ambient functions/state/default/SettingsApi/focus calls/retries and CSS removed entirely. Poster colors/inner gradients remain.
3. Trakt-only watched via verified `TraktPlus.watchedStatus` owner/session/media type/TMDB ID. Confirmed true/false cached separately per account/type/id; pending/error keeps last verified same-owner truth, unverified/missing/mismatched context stays unknown. Older confirmations/delayed writes cannot overwrite a new session. No local History/Favorite/Timeline watched fallback; progress/Continue Watching retained. Dim/check/notch update coherently.
4. Minimal Trakt+ `3.2.2-issue8-context` API metadata/events extension; completion semantics from main/#7 unchanged. Loader tag `20261023-ydesign-3.4.0`.
5. UA strict actual `{play:HTTPS_URL}` schema, typed versioned cache, TTL/in-flight dedup and error retry. Legacy id-only cache ignored; API error objects no longer generate UA badges. Public schema sampled read-only; no playback. Full #22 work not claimed.
6. Extended metadata key mismatch fixed to unified v8, in-flight dedup, memory TTL and malformed/stale/disconnected response guards. Removed English requests needed solely by deleted description mode. Genres/age/ratings/logos/slogan/TV episode info worked on first-open synthetic native cards.
7. Replaced global body MutationObserver + permanent400ms interval with relevant-activity discovery observer, asynchronous container discovery/rebind,1000ms fallback only when episode cards exist, disconnect/clear on exit/disable. Idempotent timeline writes prevent self-triggered observer work; newly changed JS progress can override prior applied width. Unit lifecycle checks pass; actual episode-provider runtime/return remains pending.
8. Hybrid ownership via actual `body.stremio-hybrid` CSS state, not global-object presence. Standalone YDesign shell styles separated from shared internal content; own transform/shadow/glow/animation/width/spacing/backdrop-filter declarations scoped out while Hybrid active. Shared CSS marks restored after catching an initialization regression. Reduced-motion covers subtree; singleton font style writes are idempotent.
9. Settings/Storage changes coalesce; cache writes/removed settings no longer schedule restyles. Metadata-sensitive changes rerender active visible cards; settings epoch rebinds later-visible cards. No progress invalidation for color/focus changes. Marks coalesce120ms and update notch too. Warmup limited to active Home and24 candidates, existing request dedup retained. Init is guarded against duplicate registration.

## Verified at checkpoint

- `node --test tests/ydesign.cjs tests/trakt-watched-sync.cjs tests/trakt-account-isolation.cjs`: **161 PASS /0FAIL** (60 YDesign +101 Trakt, isolated mocks). `audit/issue-8/unit-checkpoint.log`.
- `node scripts/check-repository.mjs`: **PASS** (58JS,449URLs/first-party paths). `audit/issue-8/repository-checkpoint.log`.
- `git diff --check`: PASS before committing.
- Existing CDP9222 browser suite last run: **19 PASS /1 FAIL**, exceptions `[]`; see `runtime.json`/`candidate.png`. The failure is source-proof coverage: this profile delivers Hybrid through `/stremio-hybrid.js`, not `/ui/stremio-hybrid.js`, so only exact Trakt+/YDesign bodies were intercepted. Harness alias mapping now fixed, **not rerun yet**. Do not claim full matrix/source proof PASS.
- Actual candidate YDesign body SHA256: `8b407ccbd26d644df73774220bb7fff8650e447269e3209bdae0300c800e3017`. It matches the saved production source at checkpoint. Header recorded parent `f58d52f` because source was being developed uncommitted; final exact-commit-header rerun remains needed.
- Confirmed browser behaviors: three native movie/TV/anime cards render; first-open content; strict UA; no Home episode poll/observer; Hybrid toggle/standalone focus/reduced motion; vertical sizes720/1080/2160; orientation migration; Trakt false vs local95%; confirmed movie update; same-account error retention; account B unknown then negative; directional native focus; no JS exceptions. Hybrid checks used profile-delivered older Hybrid (same effective vertical rules, but not source-proof of changed local Hybrid).
- Final cleanup independently checked: native Main, `fixtureGlobals=false`, `fixtureRoute=false`; original real browser methods restored by navigation. No close/new profile/storage reset or real Trakt mutation.

## Measurement limits

- `baseline.json/png`: frozen main fcc, original controlled fixture component `issue8_fixture`,8s settling then3.48s sample;45queries/13timer callbacks/400ms interval/body observer/114DOM/3TMDB+3UA; incorrectly3watched+3UA.
- `runtime.json/candidate.png`: changed fixture registered as Main, same sample duration but route method refined;63queries/4timer callbacks/no recurring timer/no observer/100DOM/3TMDB+3UA;0watched and correct1UA. **Not yet an identical-method before/after comparison.** Do not claim speed/FPS/heap improvement; ready/long-task/heap are single instrumented desktop observations.
- Harness `--baseline` now reads exact frozen-main files using `git show fcc148f:<path>` and uses the same current Main fixture. Rerun frozen baseline and candidate sequentially after source-alias fix, preserving initial artifacts as historical if needed. Not a repeat audit: this finishes comparable measurement methodology.

## Next steps, in order

1. Inspect this checkpoint's diff and continue from branch HEAD. No new broad audit.
2. Run `node tests/ydesign-browser.cjs` with corrected Hybrid alias, exact checkpoint commit SHA. Diagnose failures and fix only #8 regressions. Rerun `--baseline` for comparable metrics using current harness; preserve prior artifacts distinctly.
3. Complete missing browser matrix: genuine YDesign-only /Hybrid-only isolated loads and both plugin orders; repeat initialization/style/font/listener count; owned shadow cache persistence across reload; missing Trakt, timeout/incomplete responses/recovery. Most account/stale permutations already have unit tests; don't portray them as live Trakt checks.
4. Actual async episode container discovery/replacement, progress changes/reset, valid focus retained, arrows/OK/Back, modal/Activity exit cleanup, and return from provider/player need focused runtime tests. Review root lifecycle if native events occur before root attach. Existing observer attaches only relevant activity root, not body.
5. Review remaining episode async safety: metadata callback checks connected/fixedLayout but lacks a per-format generation token when the SAME node is reformatted before response; poster-color callback also needs guarded reuse if reproducible. Review `getTmdbMetadata` parent show/season rating fallback for missing episode data; do not mislabel it as episode-specific truth. Scope any necessary change to #8; retain local episode progress.
6. `poster-status.js` provides production status/type labels; `tv-status.js` colors native Full production status, neither is watched authority. tv-status is active in CDP. poster-status load-order duplicate type label is a potential risk, not yet reproduced: test before changing. Avoid rewriting #9 or unrelated plugins. If loading poster-status in fixtures, shadow its Storage prefix and disable external sync so no real settings change.
7. Save final screenshots/tests/results, add CI YDesign test command, docs and progress, publish branch/Draft PR linked #8 and detailed issue report. Mark only confirmed checkboxes. Physical Google TV/live provider/player testing **BLOCKED/unperformed** unless actually available.
8. No merge, no issue closure, no next Issue. Wait for user review.

## Runtime fixture safety

- Use existing Chromium9222 only; current authorized Lampa tab. Do not use main Chrome for experiments.
- Harness shadows YDesign/Trakt/Hybrid settings, native Favorite/Timeline, all Trakt API responses and metadata; aborts all HTTP mutation methods. Never test real account writes. No `browser.close()`, new context/profile, storage/cookie clearing.
- Existing harness cleanup restores actual route and verifies no fixture globals. Do not run concurrent harness instances.
- Sources: `tests/ydesign-browser.cjs`, `tests/helpers/ydesign-fixture.cjs`, `tests/ydesign.cjs`. Earlier Trakt browser harness remains in `tests/trakt-watched-browser.cjs` (version expectation updated).
- Current checkpoint has **not** been published. CLI Git push lacks credentials; use authorized GitHub connector if still unavailable. GitData tools can publish Draft/report. Preserve logical commits if possible.
- Prior proven transport: small Git bundle on temporary Actions branch, verify bundle/hash/fixed refs, push feature only with GITHUB_TOKEN, cleanup transport branch. **Do not include workflow-changing commits in bundle**: Actions token cannot push workflows. Current local feature commits do not change CI. Add final CI change through GitHub connector after transport. No token/config printing. Alternative push if ordinary credentials become available; no unnecessary transport experiments.

## Wider roadmap

The user's older15-stage roadmap is retained in historical `CODEX_PROGRESS.md` and `audit/full-integration-20261023/CONTINUE.md`; it is deferred. Current authorization is Issue #8 only. Do not start Trakt recommendation architecture, UA Comments, Screensaver or other Issues automatically.
