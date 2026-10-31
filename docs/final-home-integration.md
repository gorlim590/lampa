# Final independent review — PR #32 / #33

Review date: 2026-10-23. Main baseline `fcc148f88257daab6ce56681c51ecc7903274d94`.
PR32 reviewed head `434b35a5b8996dbba4c00346b70e96f15657bb66`; PR33 integrated product/evidence head `4c76521cc969ef7a84b480e14b12108baa8fa4c5`.

## Review result

Both implementations are ready for sequential merge, subject to current-head GitHub checks. #33 descends directly from #32; main is an ancestor of both. Six #25 commits and four #30 commits have scoped, reviewable changes. Subsequent #25 changes after native-player evidence affect tests/docs/CI only; subsequent #30 changes after original browser evidence affect tests/docs/CI only. No unrelated features or PR29 commits were imported. No AGENTS.md or CLAUDE.md exists in the checkout; CODEX_PROGRESS and issue/PR descriptions/comments were reviewed. Prior no-merge instructions are superseded by the user's explicit integration/merge authorization.

History review confirms typed alias dedup preserves playback identity, real seconds are required for movie resume, confirmed watched uses the existing account-bound Trakt+ API, latest completion/reset suppresses stale progress, and profile Timeline data is read at callback time. Series/anime rely on actual episode progress or cached aired timetable evidence and label unavailable positions. Watched takes precedence over local replay by the documented policy. No new watched cache or guessed seek is written. Existing native-player evidence at product commit 306524b remains applicable to unchanged playback logic.

The original user's three incorrect titles and missing-history examples remain unavailable. The baseline YDesign 50% cutoff and 90-candidate starvation are reproducibly fixed, but this does not establish a title-by-title reconstruction of the original account incident. Watched lists cover known local Favorite candidates; they are not an import of the whole remote Trakt library.

Policy review confirms native Home builders are filtered before execution, while Trakt/History/third-party and unknown callbacks are retained. All 22 captured signatures still occur in the currently fetched deployed core, despite its changed whole-file SHA256 `c7ffb0ac787c6c18bd59f2e41b09b513a99f7dc5afe4a4c3cf3c573eb7a9badf` (`https://siaivo.isroot.in/app.min.js`). Unknown future signatures deliberately fail open and can therefore require maintenance after core upgrades. Unknown preloaded rows without stable IDs remain fixed/read-only.

Order changes use native Settings/Select, preserve absent IDs, reject stale-profile edits, move existing nodes and component.items together, retain active row/controller and update owned scroll. Reset and up/down/direct-position controls have focused coverage. Async append reapplies order, and Hybrid yields to the coordinator. No permanent DOM polling, observers, global product Storage overrides or extra reorder requests were introduced.

PR29 overlap: UI patches apply cleanly with `git apply --3way --check` to d5d32ac; the two Trakt producer metadata fields do not change watched semantics. Its broad YDesign Trakt-only badge changes remain separate and unmerged; current main badges retain their previous behavior.

## Validation

- Isolated integration branch at PR33 head, merged with current main: already up to date; clean before evidence changes.
- PR32 exact head: 30/30 Home tests pass.
- Integrated heads: 142/142 Home history/order + Trakt sync/account regressions pass.
- Repository validation: syntax for all 60 JS files, first-party paths, whitespace pass. Changed browser CJS also passes `node --check`.
- Initial exact-head GitHub checks: PR32 Home history + repository success; PR33 Home order (includes repository/whitespace) success. New evidence/test commit must receive fresh CI; retargeted PR33 must receive main-base checks before merge.
- Fresh isolated Chromium, actual deployed Siaivo core, actual modified Trakt+/Hybrid/History/Policy sources: 11 PASS, 0 FAIL, no JavaScript exceptions. Six served source SHA256 values and commit headers match integrated head. Both History rows, actual Trakt producers and title-identical third-party row remain, native recommendations disappear, remote-style keyboard Select/Back/arrows work, late append keeps DOM/component order, Hybrid toggles preserve order, and page restart restores the saved setting with missing rows. Reorder preserves row/node identities and adds zero Trakt API calls.
- Test-only defect fixed: restart previously waited for plugin globals before native Activity existed in a fresh profile. The harness now waits for appready and active Activity too. Superseded failure and corrected passing evidence are retained in `audit/final-home-integration/`. No product defect was confirmed; production source is unchanged.

Browser used synthetic read-only Trakt responses and isolated in-memory fixture writes; page restart carries the synthetic saved order. This verifies consumers/native rendering, not authenticated backend availability or physical-device performance. Earlier native-player resume evidence is reused rather than repeating playback.

## Delivery and remaining manual checks

Historical delivery note superseded by the built-in Home startup integration: the current `loader.js` loads Home Policy and Home History itself. Do not register Home History as a separate extension. Publish the updated loader and both source files together, then advance the loader version so existing WebViews do not retain stale assets; no app-data clearing is needed.

Physical Google TV: verify Settings up/down/direct position/reset, arrows/OK/Back, scrolling and return from the actual player. Original account examples, external-player position reporting and live backend feeds remain unverified. Existing optional-plugin configurations beyond this focused pass are not certified. Do not close unrelated issues, enable optional plugins globally, delete unrelated branches, or merge PR29.

Merge SHAs, final main Actions/Pages results and public URL byte checks are reported after the authorized sequential GitHub merges.
