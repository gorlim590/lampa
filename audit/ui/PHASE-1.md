# Issue #79 — early static shell / Settings integration (Phase 1)

Baseline: main `aa6c476d1160265d4ac224780cdadb03c04a9eb1` (merged #92). This is not the full UI-owner migration or another Settings inventory.

## Confirmed execution path

The existing primary Lampa tab loads `loader.js` and `ui/stremio-hybrid.js` as separate native extensions. The loader starts its serial service/UI-compatibility chain after appready: Trakt, Trakt+, torrent aliases, Interface+, YDesign, AverageRating, Cardify+, translation. Hybrid previously also waited for appready before inserting its entire static stylesheet and body class. Native core builds activities/layers before sending that event. This creates an avoidable gap between Hybrid script delivery and shell application.

The external native plugin loader requests scripts and then separately downloads them through XHR into its plugin cache. Resource entries with both initiators are not proof of duplicate JavaScript initialization. The observed native bundle hash remains `9cea962508ca7dfd50da201f9dd0c0ea012f541d0f8db932723a8d16a2a9cc1a`. No forced reload/location navigation or Activity.replace call was found in the four relevant UI owners; an apparent visual restart is not certified as a real navigation.

## Phase-1 ownership and deferred migration

| Presentation boundary | Current owner / action | Later migration, not part of this PR |
| --- | --- | --- |
| Global shell, left rail, header/search/avatar, outer focus, Details composition | Continue `ui/stremio-hybrid.js` as the one canonical installable shell; early static style, later native hooks | Consolidate future shell components without another installed theme |
| Settings Registry and native owner navigation | Reuse `ui/settings-hub.js`, contractVersion 1; explicit canonical install/destroy | #73 per-setting effect/persistence/scope/reset/obsolete verification |
| Settings appearance | Canonical Hybrid stylesheet only; no style injection by Registry | Shared #31/#79 component parity across nested native/service panels |
| Vertical card content, UA detection, genres/logos/statuses | Preserve YDesign feature/rendering API | Extract presentation only after metadata, settings and status parity |
| Upper TV/anime metadata, interface controls and icon helpers | Preserve Interface+ feature APIs | Transfer conflicting theme/size/focus styling with verified key mapping |
| Details templates, poster/logo, backdrop composition | Preserve Cardify+ hooks/handlers | Migrate the template presentation with reversible adapter parity |
| Ordered native actions | Preserve Buttons+ and existing click handlers | Adopt action presentation only, not playback routes |
| Ratings/status badges | Preserve AverageRating/privacy, Trakt authority and existing metadata | Shared visual components, retaining each service's writers/cache |
| Torrent/Files/episode presentation | Preserve current overlay/Cinema and native navigation | Other issues own search, playback and spoiler/episode behavior |

This first milestone establishes one **global shell** owner; it does not claim all legacy UI helper scripts/styles have been removed. No plugin disablement or broad feature migration is performed.

## Implementation contract

- Install the existing canonical `ui/stremio-hybrid.js` entry once. Its global guard remains authoritative. No second wrapper/installer or production loader-list change.
- At script execution, use the existing allowlisted native `stremio_hybrid_enabled` setting and insert one versioned static stylesheet before appready. Respect disabled values. No app hiding, reload, timer/observer bootstrap or account reads.
- Native header/cards/Details/controller adapters still initialize at appready. Same-state refresh updates the avatar without replaying the full UI setup or replacing CSS.
- Load the inert Settings module once, after functional initialization, without blocking first paint. The canonical owner explicitly mounts/unmounts it; late callbacks, unsupported API or load/install errors preserve native fallback. No Registry/service handler duplication or preference migration.
- Settings presentation uses the same static shell style and existing tokens. No second Settings stylesheet, controller or store is introduced.
- `StremioHybrid.diagnostics()` exposes only numeric lifecycle counters/relative timestamps and the public version, not user values.

## Measurement method and baseline

The optional `startup-probe.js` is a temporary developer extension, never default-loaded. It emits only numeric timing/count data, allowlisted UI resource paths and error classes into an inert JSON node. A startup-only observer disconnects at the first usable themed screen; the remaining diagnostic listeners expire after 24 navigation keys or 60 seconds. It neither reads preferences/accounts nor makes requests. Native subscription counters do not represent browser DOM-listener totals.

The first schema-1 capture omitted style-attribute splash changes and is excluded from exact usability comparison. The corrected schema-2 measurements below were captured before production changes in the same existing main Chrome profile. HTTP cache, cookies and Storage were not cleared. **These are two normal fresh-document reloads, not a certified cold-network or physical-device benchmark.**

| Baseline metric | Run 1 | Run 2 |
| --- | ---: | ---: |
| First observed correct Hybrid frame | 3757.1 ms | 2802.6 ms |
| First observed usable card screen after splash | 10122.7 ms | 8606.2 ms |
| Observed D-pad focus response (includes two-frame observation window) | 69.7 ms | 59.6 ms |
| Hybrid stylesheet nodes | 1 | 1 |
| Header profile buttons | 1 | 1 |
| Loaded UI script tags | 10 | 10 |
| Total style/link nodes at captured snapshot | 48 | 48 |

The recorded first key action time depends on the test driver; it is not the earliest possible D-pad-ready timestamp. Startup screen timing includes unchanged metadata/Home latency. Network/cache differences and a small sample prohibit attributing all elapsed-time variation to this patch. The final comparison below uses the same frame/visibility/D-pad definitions. Physical Google TV remains NOT TESTED.

For temporary script URLs, the native core automatically appends account context unless its numeric-address exclusion matches. Diagnostic URLs use the inert `context=0.0.0.0` marker to avoid appending that context; do not export full native script URL queries, console/storage dumps or account data. Restore/remove temporary extension URLs after the pass.

## Focused validation

`node --test tests/ui-bootstrap.cjs tests/header-menu.cjs tests/hybrid-ui.cjs tests/settings-registry.cjs tests/settings-hub-lifecycle.cjs tests/settings-sensitive-summaries.cjs`: 56 PASS at the implementation checkpoint. The pre-appready tests execute the actual entrypoint; lifecycle tests isolate native service effects. No live Trakt write, playback or physical TV acceptance is implied.

## Final comparison and runtime acceptance

Tested immutable source: `2c466b69f3a964550fc90a793ff6f0d861c0cb44`; Hybrid SHA-256 `7ae58eeb02eb216b727de4109ac5b4a31b9d22238d952b72eb81001cf3f9cf67`. The existing primary Chrome tab loaded that exact path, and CDN/local bytes matched. Contract-1 Settings loaded from the same commit. Probe schema4 from `12ded67c0f170a5a1fe5e01cd7335fc5a2ca7b62` retained the corrected baseline definitions. [Safe numeric measurements](startup-measurements.json).

| Metric | Before run1 / run2 | Final bounded run |
| --- | --- | --- |
| Observed correct Hybrid frame | 3757.1 / 2802.6 ms | 2294.0 ms |
| Usable card screen | 10122.7 / 8606.2 ms | 9500.3 ms |
| First sampled D-pad focus response | 69.7 / 59.6 ms | 77.7 ms |
| Hybrid style / profile | 1 / 1 both | 1 / 1 throughout |
| Total style/link nodes | 48 / 48 | 48 throughout |
| UI scripts at snapshot | 10 / 10 | 8; no script-removal claim |
| Owner init / style insertion / Settings mount | unavailable before | 1 / 1 / 1 throughout |
| Settings load / failure | unavailable before | 1 / 0 |

**Conclusion:** the frame appeared earlier in this final sample; overall usable startup stayed within baseline variation, while the sampled D-pad response was 8–18ms slower. No demonstrated overall speedup or FPS gain. An earlier intermediate sample was slower (4014/11323ms frame/usable); another had a late probe and no comparable frame. No further reload/probe rewrite was performed to select a faster final result.

One cancellable owner RAF retains relative timings for late observers, without polling. Final entry/class/frame/appready: 2276.8/2283.1/2287.6/2813.1ms. The external observer's **2294ms** remains the comparison metric. Script-delivery-to-observed-frame gap was about1029ms in baseline1 and32.1ms finally, consistent with removal of the appready style gate. Host extension delivery can still be late: this milestone does not own initial host HTML or hide the app before script delivery.

Bounded actual-source scenarios:

1. **PASS** startup/Right: exact source/version, one style/profile/init, usable screen and sampled focus response.
2. **PASS** native Settings → Hub → Back → reopen → Appearance → Back to exact `hub_category_appearance` → Back: native rail restored twice (31 categories), one adapter mount, no value edits. Earlier same-phase evidence also opened a real native owner panel and restored its indexed row. Fixed the event-order race: Main must restore its rail even before the later Hub listener clears its previous active flag.
3. **PASS** cleanup: exact original Hybrid URL restored; only temporary probe removed via native Extensions. Normal native reload left the same user tab usable (49 cards/focused card, one style/profile, no probe/test source). No auth/history/server/preferences reset or migration.

Two unattributed console error entries and one SCRIPT resource failure were observed; no named JavaScript or Hybrid/Settings-source exception captured. Raw messages/queries were excluded. This does not certify every third-party plugin loaded successfully or a globally clean console.

Owner init/style/mount/load stayed1. Native Settings/controller/storage subscriptions stayed17/4/39. Native Params rose0→8; asynchronous Home changed app subscriptions213→227 and nodes1660→1811. The external host's native Settings Component adds an anonymous `update_scroll_position` listener on panel construction. Do not monkeypatch its private arrays; no total-listener/no-leak claim. Fixed-state Hub Back snapshots reached1800 nodes twice, without owner CSS/init growth. External listener ownership is a documented follow-up.

The failed load now retries only after explicit disable/reenable or a fresh document, never on refresh/focus. Adapter destroy errors cannot prevent shell teardown. No new global observer/timer, Registry/store/controller, loader/manifest/default activation, business-handler rewrite or destructive migration was added. Settings presentation stays in canonical Hybrid CSS; #73 source/owner handlers remain unchanged.

## Final validation and handoff

- Recovered isolated-header fixture (missing timing helper); production timing test passed. Added explicit transient-load retry and throwing-destroy regressions.
- `node --test tests/ui-bootstrap.cjs tests/header-menu.cjs tests/settings-hub-lifecycle.cjs tests/ui-startup-probe.cjs`: **33 PASS, 0 FAIL**. Earlier unchanged Hybrid/Registry/privacy evidence reused.
- Source syntax, repository validator (68JS/43manifest/509URLs), diff check: **PASS**.
- All five GitHub workflows at tested source2c466b6 successful: Repository, parser, season, Home history, Home order. Final evidence-only head must also be green before approval.
- **GO for review/merge of bounded Phase1**, subject to final-head green CI and owner approval. No automatic merge; #79 remains open. This is not full UI consolidation or closure of #73.
- Physical Google TV, certified cold-network benchmark and complete YDesign/Interface+/Cardify presentation migration: **NOT TESTED / deferred**. #73 per-setting functional/persistence/scope verification remains with Registry/service owners. The ownership table above is the remaining migration list.

[Settings screenshot](settings-phase1.png) contains public category labels only, captured during this phase; final Back fix does not change its layout.
