# Issue #73 Phase 6 Integration QA

Tested code head: `2e2685dfda597f1f139fc433e46b1420711470ad`; base: `fefc419aebc655d2bb39c1e498cbd7c88ac566c1` (PR #103). Evidence in this report is from isolated fixtures unless stated otherwise. The historical 576-record inventory and summary were reused, not rebuilt.

## Evidence summary

| Subsystem / scenario | Mode | Expected and observed | Status | Evidence |
| --- | --- | --- | --- | --- |
| Native Main → Hub, default OFF, opt-in ON, explicit standard fallback, root Back, fresh reopen | Integrated real Hub + Hybrid routing functions | Native remains on with preference off; Hub opens with it on; both native return paths bypass re-entry once; next opening routes again | PASS | `tests/settings-hub-lifecycle.cjs` integrated lifecycle cases |
| Failed primary Hub initialization, Hybrid disabled, Hub destroy/reinstall | Integrated mock | One bounded failed attempt; native route retained; teardown removes Hub listeners and reinstall adds one | PASS | Same; `tests/ui-bootstrap.cjs` failure/late-load coverage |
| Category → paged result → real owner route → Back/focus → category/root | Mock Settings DOM/controller | Owner panel opened through native Settings; exact result and category focus restored; page size remains 24 | PASS | `tests/settings-hub-lifecycle.cjs` |
| Search from root and category; query edit and owner Back | Mock input + native controller | Query, result identity and category return context preserved | PASS | Search lifecycle cases |
| Search identity, owner/key metadata, case folding, duplicate template/API representation, private Storage guard | Registry/mock Storage that throws on read/write | Search uses metadata only; template/API representation collapses; duplicate registrations remain explicit in Registry; no value reads | PASS | `tests/settings-registry.cjs`, `tests/settings-hub-lifecycle.cjs` |
| Pagination, late SettingsApi registration, 506 synthetic rows | Mock Registry and Settings controller | Registry enumerates 506 synthetic rows; rendered row cap stays at 24; later snapshot discovers registration | PASS | lifecycle test and diagnostics below |
| Consolidated known folder and restoration on native fallback, close, destroy, failed owner; unknown/system/missing/template-only and foreign marker | Mock native-folder DOM | Only allowlisted registered owner with accessible route is hidden. Unknown/system/missing/template-only and premarked folders remain visible/unchanged. Failure/fallback/close/destroy restores Hub marker and original visibility/attributes | PASS | folder lifecycle tests |
| Settings.create throw, missing template, unavailable owner, late registration | Failure-injection mock | Native fallback remains available; missing owner is reported without opening it; late entry appears on snapshot rebuild | PASS | Registry and lifecycle tests |
| Repeated Settings/list/owner navigation | 30 fixture cycles | Owner Back restores result; nested Back restores category; root Back exits; root registrations remain stable | PASS | `Repeated Hub navigation...` test |
| Search open/edit/Back | 20 fixture cycles | Query survives reentry; listener counts remain at one Hub open + one close listener | PASS | Same stress test |
| Hub destroy/reinstall | 10 fixture cycles | No Hub listeners or Hub parameters remain after each destroy | PASS | Same stress test |
| Actual owner handler behaviors | Synthetic Storage/API fixtures | Reused and reran existing unique 65-control evidence suite (62 isolated verified, 3 partial in baseline); no live accounts/services touched | PASS for existing isolated evidence; no new distinct business controls | `tests/settings-functional.cjs`; machine summary unchanged |
| Hybrid presentation and TV D-pad | DOM/API fixture only | Hybrid ownership/cleanup and native focus callbacks tested; actual remote key delivery and TV focus feel not tested | PARTIAL | `tests/hybrid-ui.cjs`, `tests/settings-hub-lifecycle.cjs` |
| Home, Screensaver+, Language, Profiles, unknown external plugins, external player/TorrServer | Registry/native route boundary only | Native ownership remains; authentic side effects unavailable or not exercised this phase | NOT TESTED for owner effects | Inventory/source boundary; no external substitute handlers added |
| Exact deployed assets in authorized browser | Existing Lampa tab inspection | Hub and Hybrid source URLs were visible, but the browser tool could not produce verifiable served-JS hashes matching the tested commit; no browser interactions attempted | BLOCKED | Existing tab asset inspection; `docs/TESTING.md` exact-hash requirement |
| Physical Google TV | Device | No device session available | NOT TESTED | — |

## Navigation state-machine matrix

| Transition / recovery | Status | Boundary |
| --- | --- | --- |
| A. Native Settings → Hub | PASS | Integrated fixture; preference off/on |
| B. Hub → category | PASS | Native Settings params / focus fixture |
| C–D. Category → result → original owner | PASS | Authentic Hub route, mock native owner template |
| E–F. Owner Back to focused category/search result | PASS | Query and focus assertions |
| G. Empty-result editing | PARTIAL | Empty-state rendering is covered by existing result paths; repeated empty-query edit was not separately stressed |
| H. Search result on page 2/3 → owner → Back | PARTIAL | Paging and owner Back are separately tested, but not composed on page 2/3 |
| I–J. Category → root → native Settings | PASS | Root Back and Hub Back coverage |
| K–L. Standard Settings fallback; close/reopen | PASS | Native bypass and fresh Hub route asserted |
| M–N. Hybrid disabled while Hub/owner remains open | PARTIAL | Disabled-before-open and shell lifecycle tested; mid-navigation Hybrid disable not composed with owner Back |
| O–Q. Destroy while list/owner visible; reinstall | PARTIAL | Destroy/reinstall while root/category open tested; destroy during owner route is not composed |
| R–U. Missing owner/template, late registration, stale removed owner | PARTIAL | Missing/template/late cases covered; unregister-after-snapshot was not directly injected |
| V–W. Repeated open and rapid Back | PARTIAL | 30 sequential opens/nested Back with loop guard; truly concurrent queued opens and multiple rapid Back events not exercised |
| X–Y. Search after category change; failed primary route | PASS | Query/context restoration and single bounded initialization failure asserted |

Programmatic fixture focus validates native `collectionFocus` and hover focus targets, not physical D-pad event dispatch. No production navigation defect was reproduced. The existing Registry keeps duplicate registrations as distinct instances; the Hub intentionally de-duplicates canonical component/key rows. The inventory's known duplicate `ncInfo:group` registrations are static informational rows with no handlers and a blocked lazy owner panel, so they are not evidence of duplicate functional owners. No identity/routing change was justified.

## Owner coverage and counts

The baseline machine summary remains at 506 identifiable controls / 576 inventory records, with 65 controls having prior isolated evidence (62 verified, 3 partial). The functional suite was rerun. This Phase 6 change adds **zero new distinct real business controls**; the new fixture used one synthetic owner with 506 generated settings solely to exercise Hub-scale pagination and timing. Runtime-verified count remains zero.

| Area | Existing isolated evidence rerun | Phase 6 owner-effect result |
| --- | --- | --- |
| Appearance (YDesign, Interface+, Cardify+, Hybrid) | Existing owner handlers/persistence and Hybrid lifecycle | PASS for those prior isolated controls; no browser/device claim |
| Trakt Core / Trakt+ | Existing auth-missing, settings/reset and mocked sync/config tests | PASS for safe mocked cases; authenticated backend/account behavior NOT TESTED |
| Torrents Cinema / parser | Existing synthetic presentation/preference tests | PASS for tested mock-owned controls; no torrent/player/TorrServer actions |
| External Lampa player/TorrServer | None | BLOCKED / external owner not independently exercisable here |
| Home / Screensaver / Language / Profiles / Plugins / System | Registry ownership/fallback only | NOT TESTED for owner-side functional effects |
| BWA / unknown third party | Attribution only | UNKNOWN; source provenance unavailable |

## Stress and timing evidence

Fixture stress completed: 30 open/category/owner/Back cycles, 20 search/edit/reentry cycles, 10 destroy/reinstall cycles. Assertions observed one open and one close listener while mounted, zero after destroy, zero Hub parameters after destroy, stable root registration IDs, no Hub-owned stylesheet, and no Registry observer/timer growth (instrumented values remained 0). These are counter assertions, not heap profiling.

One cold/warm fixture sample (`performance.now()`, Linux x64, Node v24.22.1; mock Lampa `SettingsApi`, 506 synthetic owner records, no Storage/services): Registry install/build 7.724 ms; cold root 2.009 ms; category 3.132 ms; page 1.303 ms; search 0.851 ms; owner open 0.179 ms; owner Back 0.582 ms; warm root 6.102 ms; reopen 1.322 ms. Registry reported 506 records, six builds over the full sequence, max rendered settings rows 24, two listeners, zero timers/observers. These single-process fixture samples are descriptive, not a device benchmark or startup claim.

## Validation and release decision

- Focused Settings/Registry/Hub/functional/sensitive-summary/inventory/summary/bootstrap/Hybrid/header suites: **107 passed, 0 failed, 0 skipped**.
- `node scripts/settings-audit-summary.mjs --check`: PASS; existing generated summary is fresh.
- `node scripts/check-repository.mjs`: PASS (70 JS files, 43 manifest entries, 518 URLs).
- Changed JavaScript syntax and `git diff --check`: PASS.
- No production source or inventory/summary changes; preference remains default OFF.
- Browser: BLOCKED at exact-asset hash verification; no interaction or profile changes.
- Physical Google TV: NOT TESTED.

**Verdict: NOT READY FOR OPT-IN QA** until the deployed asset hashes are verified against an authorized preview/head and one bounded runtime smoke test covers focus, owner Back and native fallback. **Not ready to enable by default** until exact delivery, runtime persistence/owner behavior, and physical Google TV D-pad/Back acceptance are established. Rollback remains the existing opt-in preference OFF plus native Settings fallback.

| Release criterion | Evidence state |
| --- | --- |
| Settings entry/exit, Back stack, search, paging, owner route, native fallback | Fixture PASS; exact deployed browser behavior blocked |
| D-pad focus, Ukrainian label readability, device Back | Fixture focus callbacks partial; Google TV NOT TESTED |
| Folder restoration, unknown/system owner preservation | Fixture PASS for cases listed above |
| Persistence/defaults and privacy | Existing synthetic owner fixtures PASS; runtime storage/account behavior NOT TESTED |
| Initialization/teardown and repeated use | Fixture stress PASS; browser resource behavior NOT TESTED |
| Correct JS delivery | BLOCKED: no matching served asset hashes |
| User rollback | Source verified: preference stays OFF by default and native Settings fallback remains |

## Follow-up batch

1. Provide a safe preview or exact deployed asset hashes, then run one browser smoke for root/category/search/owner Back/native fallback without opening credential editors.
2. Compose the currently separate cases: page-2 search result → owner → Back, mid-navigation Hybrid disable, destroy while owner is active, stale result after unregister, and multiple rapid Back events.
3. Add safe source-backed owner fixtures for Home, Screensaver+, Language and profile-scoped settings; retain external player/TorrServer and authenticated Trakt behavior as unverified until authentic safe contracts are available.
4. Run Google TV acceptance for D-pad focus, long Ukrainian labels, Back stack, reopen and rollback before considering a default change.
