# Plugin compatibility and ownership

Baseline: main `67bad5f`, 2026-10-24. “Known” below means a code/evidence-confirmed boundary; optional combinations still require their affected-flow check. No blanket certification of every catalog entry or physical TV.

## Loading and activation

Prefer the real default order in `loader.js`: native Trakt → Trakt+ → torrent-search → Interface+ → YDesign → average-rating → Cardify+ → translation. Manual extension registration may differ; `plugins.json` status is managed configuration, not a running-device inventory. Do not load the same plugin through both loader and a separate extension URL.

Optional baseline: parser provider/search coordination before using Torrents Cinema/Hybrid's torrent flow; base UI owners before Hybrid; Home History after normal loader. Home History loads its own sibling helper. Screensaver+ is separate and requires native saver APIs. Preserve lazy/late-API support in existing implementations rather than adding duplicate loaders. For detailed integration read the relevant source/linked report, not every historical audit.

| Combination / boundary | Confirmed issue or obligation |
| --- | --- |
| Native Trakt + Cardify+ | Cardify has two rating anchors. Former multi-target `.after` cloned a Trakt badge twice. Follow-up #40 inserts once or yields to `LampaSeriesDetails`; do not restore broad selector insertion. |
| Interface+ + Hybrid + Trakt+ | Interface+ owns one upper TV/anime section. Trakt+ supplies verified personal progress; Hybrid does not append competing season/episode/next fields. Average runtime remains. [Evidence](issue-10-details.md). |
| YDesign + Hybrid | Hybrid owns outer layout/focus/transform/theme when its actual body state is enabled; YDesign owns vertical card content. PR29 removes horizontal/Ambient paths; preserve on/off and reduced-motion behavior. |
| Cardify versus Cardify+ | Alternative details layout implementations; avoid enabling both without a specific proven integration. Preserve existing handlers when moving nodes. |
| YDesign / Poster Status / TV Status / average-rating | Status/rating selectors can overlap. Identify owner before adding a badge or disabling a plugin. Unknown Trakt watched must not be coerced to confirmed unwatched; YDesign consumes confirmed Trakt status only; local Timeline remains playback progress. |
| Canonical Seasons Info + legacy URL | `media/seasons-info.js` owns implementation; `info/seasons-info.js` loads it compatibly. Keep idempotence and old URL; do not maintain two renderers. Source-season normalization is distinct from upper info presentation. |
| ParserProviders + torrent-search + Torrents Cinema + Hybrid | One result pipeline/list. Parser roles run independently/progressively; alias coordinator must not multiply or leak old searches. Dedup by verified infohash or exact safe identity, never similar title alone. Preserve language/raw playback fields and native TorrServer/files. [Parser contract](issue-17-parsers.md). |
| Home History + Trakt/YDesign/Hybrid | One coordinator owns row registration/order. Preserve producer IDs, profile persistence and DOM/component/focus/scroll alignment. Unknown third-party rows fail open. Native-source signature matching is core-version sensitive. [Ordering](issue-30-home-order.md). |
| Screensaver+ + native saver | When enabled and configured to own native methods, wraps/restores Lampa `show/resetTimer`; handles pending starts and input/timer/video cleanup. Disabling/destroy must restore native behavior. Never disable Android's system saver. No broad standalone automated coverage currently claimed. |
| CommunityWatches / third-party catalogs | `config/disabled-plugins.json` and catalog status document managed policy; they do not uninstall scripts already active on a device. Do not classify/remove unrelated rows by localized title/icon. |

## Status/data compatibility

Trakt watched is account/media-type/ID scoped; unknown/pending/error and stale-session protection are part of the API contract. Local Continue Watching has a different purpose. Do not copy watched logic into card renderers or mix local Favorite lists with remote Watchlist.

Source season numbers are not guaranteed broadcast season numbers for anime. Do not infer the user's three broadcast seasons from an observed one-season source catalogue, or vice versa. Preserve IDs and history; the upper section currently omits unverified totals and uses Trakt titles rather than fabricated local coordinates.

## Diagnose only the relevant intersection

Record safe loaded URL/hash, actual enabled flags, selector owner and lifecycle event. Reproduce the specific overlap, fix its owner/registration, and verify disable/reopen where affected. Guards avoid duplicate initialization but do not prove cleanup or compatibility. Avoid global CSS hiding, new permanent observers and mass plugin removal. Preserve author/license notices when touching third-party-derived files (`NOTICE.md`, `licenses/`).

### Ukrainian audio badge (#69)

Nightingale was removed at the user's request. YDesign is the sole card UA indicator owner: one saturated yellow badge in the metadata row. Its WH response schema is explicit; localized titles, interface language and subtitles are not evidence. Explicit original Ukrainian/audio-track data is used first, then typed WH cache/lookup, then optional torrent audio evidence. WH concurrency is bounded at two; unknown failures have a short non-persistent retry cooldown. Old Nightingale storage is left untouched and is not imported. Remove any manually registered Nightingale URL before reloading an existing installation; no other extension needs removal.

## Settings Registry integration (#73 / #79)

Hub and Hybrid coordinate through `LampaSettingsHub.owns(name)`: Hybrid cancels its rail frame and clears the remembered category while Hub owns native Settings routes. Other routes retain native/Hybrid behavior. Loading the internal module is inert; only the single UI owner mounts/unmounts it. Combined integration requires the compatibility handshake, never a second global stylesheet or a theme reload. Old AverageRating panels are blocked by Hub until `settingsPrivacyVersion >= 1`; native fallback remains accessible. No Home/torrent business controller is replaced. See [inventory gaps](../audit/settings/README.md).

## #79 Phase 2 — scoped card focus ownership

Based on merged #93/main `8c3d1a7`; reuses #9/#15/#79 ownership evidence. This PR migrates **only the outer native-card focus/hover decoration**, not every presentation feature.

| Boundary | Canonical / retained owner | Status and next scope |
| --- | --- | --- |
| Outer card focus/hover ring while Hybrid is active | Hybrid stylesheet | Interface themes yielded only their card pseudo-border/glow; Hybrid neutralizes the native pseudo-ring and uses its existing view shadow. Actual body class controls ownership; no plugin-presence heuristic/listener. |
| Standalone Interface card focus | Original Interface theme table | All14 themes retained, gated to `body:not(.stremio-hybrid)`. No saved theme value migration. |
| Vertical card content/UA/IMDb/personal Trakt rating/progress | YDesign and existing service writers | Unchanged. Existing YDesign outer-focus guards already yield to Hybrid; do not copy metadata or watched logic into shell. |
| Details structure and metadata | Cardify+ templates / Interface+ section / native handlers; Hybrid composition | Unchanged; migrate one verified presentation boundary later. |
| Sidebar/menu row presentation | Hybrid owns the active rail; Interface+ menu item/version base and focus decoration is gated to `body:not(.stremio-hybrid)` | All 14 standalone themes retain their generated rules. Header ownership is tracked separately; other Interface button/modal/background rules remain outside this boundary. |
| Settings Registry/service handlers | #73 native Registry / original services | Unchanged. Do not add another controller/store or patch native listener arrays. |

**Reproduction:** in the existing primary Lampa tab, an emerald Interface theme added a green1.333px pseudo-border plus10px glow while Hybrid simultaneously drew its white/purple view shadow. The fixed source yields the Interface selector and clears only the native card pseudo-decoration in Hybrid. The resulting pseudo-border is0/none, the glow is none; card radius43.797px and the original Hybrid shadow are unchanged. Hover uses the same owner. Standalone keeps its original rules automatically when the body class changes. No competing content renderer was demonstrated at this boundary, so none was removed.

### Repeated-navigation listener diagnosis

Phase1 recorded native Params subscriptions0→8 across Settings panels while owner initialization/style/mount remained1. Public native host `/app.min.js?v=1992278` (SHA-256 `9cea962508ca7dfd50da201f9dd0c0ea012f541d0f8db932723a8d16a2a9cc1a`) registers an anonymous `Params.listener.follow('update_scroll_position', function...)` in native Settings `buildEvents()` (line15387). Both Back and `destroy()` remove only the named `update_scroll` callback (lines15450/15464), leaving the anonymous callback retained. This establishes a source-level lifetime mismatch; it is not proof of a Hybrid/Registry reinitialization leak. Callback closures retain the panel's scroll/last state. The proper upstream fix is a named, per-instance position callback removed by both teardown paths. Do not monkeypatch private native listener arrays or rewrite Registry/service handlers in this visual PR. No zero-global-listener-growth claim.

### Focused verification / performance

- Tested immutable source `7d3bdc7fde008a8f1bd8265213dc81ed0cb3ad82`; CDN bytes match local hashes in [measurements](../audit/ui/card-focus-measurements.json). Existing primary user tab loaded actual changed Interface+ and Hybrid, plus unchanged YDesign/Cardify+ from that same revision.
- **PASS** one ring/unchanged radius, UA and IMDb/rating nodes present; Right/Left use native navigation. **PASS** Details opens with Torrent action focus and Back restores a card. **PASS** native Hybrid off/on removes/restores one stylesheet, preserves the original Interface theme and trigger focus; setting restored enabled.
- **27 automated PASS**: card-focus ownership/14themes, bounded audit-entry cleanup, existing Hybrid description/navigation/bootstrap tests. Repository check69JS/43manifest/510URLs and diff checks pass; final evidence-only head reruns CI.
- D-pad59→57ms, including the same two-frame probe window: **no demonstrated performance change**. Two competing card decorations become one; no new production handlers, requests, timers, observers or content DOM nodes. Styles48→47, nodes1724→1763 and UI-tag counts11→5 are async/CDN/probe snapshot dependent, not proven reductions. Startup4.649→2.071s/frame and11.493→10.452s/usable are recorded only for transparency: audit-loader/CDN/cache differ, so not a startup optimization claim.
- Console: three error logs, zero named JS/affected-source exceptions; resource failures1before/2after. Attribution is unconfirmed, no globally clean-console or backend acceptance claim. Physical Google TV **NOT TESTED**.
- The opt-in `audit/ui/phase2-loader.js` selects the immutable actual loader/modules for verification, restores its temporary global base on success/failure and never enters default activation. No production bootstrap change. Original loader/Hybrid extension URLs were restored, only temporary probe removed; user tab/settings/auth/history preserved.

Keep this PR independently reversible. Remaining #79 work: verify/migrate Interface button/modal/background themes, YDesign presentation fragments and Cardify templates separately, preserving service ownership; resolve the upstream native callback lifetime separately. No automatic merge or closing #79.

### #79 Phase 2 follow-up — dialog surface ownership (after #94)

Baseline main `18d90ff` contains merged card-focus PR94. Reused the ownership map above; no full audit or new bootstrap. One subsystem: **overlay container surfaces** (`settings__content`, `settings-input__content`, `selectbox__content`, `modal__content`). Native actions, menu rows/buttons, global body background and content renderers are outside this PR.

The real primary Lampa tab reproduced a mixed owner: profile popup retained Hybrid background/shadow but Interface's emerald `!important` surface rule supplied a green border. Scope the existing Interface surface selector group to `body:not(.stremio-hybrid)`. Hybrid's existing stylesheet then owns the surface while active; its source is unchanged. All14 standalone theme declarations and original handler/storage behavior are preserved. No stylesheet or whole plugin is disabled; no new installed plugin/component/observer/controller/service rewrite.

Actual immutable tested source `63d01b4c0f65c736425ecd305eec078faef22618`, Interface SHA-256 `927d3bf54fb161fbd125ff42e3a88db56b106249f967e916a498335c50639be4`; public CDN/local bytes matched and the main user tab loaded that exact path through the existing opt-in phase2-loader. Unchanged Hybrid/YDesign/Cardify/service blobs were reused via the existing base-tree publication workflow, not retransferred. [Safe before/after evidence](../audit/ui/dialog-surface-measurements.json).

- Profile popup border: green `rgba(26,89,77,.12)` → canonical `rgba(255,255,255,.086)`. Background `rgba(17,18,29,.96)`, radius27.373px, shadow, blur-none and measured bounds629.563×1057.708px unchanged. No layout redesign claimed.
- Menu Down focus response5.5→7.1ms in the same two-frame probe: sample1.6ms slower, no demonstrated speedup or robust regression. Styles48→48; owner init/style/mount/load1 throughout the measured menu pass. DOM1747→1746 and native app194→196/storage37→39 are asynchronous host/service variation, not a reduction claim. No new production callback/request/timer/observer/DOM node.
- **PASS** main-tab profile menu D-pad/Back/reopen (Back returns to `sh-head-more`); native modal closes to its originating extension focus; native Hybrid off/on keeps trigger focus. Without Hybrid, the original emerald surface `rgba(12,22,25,.97)` and green border return. Enabled state restored. Actual native modal uses Hybrid's dark surface/no green border/no blur.
- **18 local tests PASS**: existing14 header-menu regressions plus4 presentation/audit-entry tests. New test executes all14 actual theme renderings, normalizes only the four scoped selectors and compares the entire generated standalone CSS with the previous renderer; native action/card rules remain byte-equivalent. Existing CI already includes this test file. Repository validator69JS/43manifest/511URLs, source syntax and diff checks PASS.
- Three console error entries / zero named JS or affected-source exceptions; one unattributed SCRIPT resource error in both measured runs. No full backend or globally clean-console certification. Physical Google TV **NOT TESTED**.
- Original loader URL restored; Hybrid URL never changed in this milestone. Only temporary probe removed, normal reload, same profile/tab/auth/history/preferences preserved. Hybrid on/off was restored to enabled. Screenshot stayed local because the surrounding Home contains personal viewing information; no screenshot/account data committed.

Native anonymous Settings listener lifetime remains the previously documented upstream concern; no native core/Registry patch or new navigation audit. Later button/global-background conflicts require their own reproduction before a separate PR. Keep #79 open; no automatic merge.

### #79 Phase 2 — native Settings / Select action-row ownership (after #95)

Baseline main `258aa750c68a6486a7f0f9f5c88a7eb304a5d737`. Scope selection used computed styles in the existing primary Lampa tab and the prior ownership map. Ordinary extension URLs initially exposed stale Interface surface CSS, so the baseline was explicitly loaded through the existing immutable source-loader before editing. No delivery/bootstrap fix is part of this milestone.

**Confirmed conflict:** native Select and Settings focused parameters had Hybrid's purple background/white text, but Interface emerald `!important` rules supplied green shadow `rgba(26,89,77,.25) 0 2px 8px` and1em radius instead of the existing Hybrid .7em/inset-ring token. Native Details actions were inspected: their focused background/color/border/shadow/transform/transition already came from Hybrid/Buttons+, so they were not migrated. Native modal buttons are not in Interface's theme selector groups and remain unchanged. Do not treat every overlap as a defect.

The single subsystem is native **Settings/Select action rows**: `.settings-folder`, `.settings-param`, `.selectbox-item`, plus their focused variants. Only those six selectors in Interface's existing theme base/focus groups are gated by `body:not(.stremio-hybrid)`. Existing Hybrid CSS automatically becomes authoritative. No new stronger Hybrid overrides, component renderer, state/action handler, style reinjection, observer/timer/store or Settings Registry change. Card rings and container surfaces from94/95, Details layout, global body theme, sidebar, player/torrents/Trakt and YDesign metadata are untouched.

All14 standalone themes retain the same declarations, transitions and state behavior; a new test executes each theme and compares the entire generated CSS against its previous rendering after normalizing only the six selectors. Other action selectors remain byte-equivalent. Existing native checked/disabled/loading/pressed semantics and handlers are not replaced; no artificial disabled/loading states were forced in the user's app.

Actual tested Interface source `abdfdcb3bab4f817f73a35c48d21e4b23a3ee301`, SHA-256 `8af96b51f36d6e7af05d4e86f834c38e1fe6ecf786aa4a4a7672a798fab0cf64`; CDN/local bytes matched and the existing main tab loaded that path. [Safe measurements](../audit/ui/action-focus-measurements.json).

| Computed focused row | Before | After |
| --- | --- | --- |
| Radius (Select and Settings) |27.3732px|19.1612px (.7em)|
| Shadow |green0 2px 8px|Hybrid inset4.927px, rgb(183,155,255)|
| Background / foreground |purple rgb(121,96,201) / white|unchanged|
| Border / scale / padding / opacity |native values|unchanged|
| Transition |Select opacity.16s; Settings transform+opacity.16s|unchanged|
| Menu D-pad sample |6.1ms|9.4ms|
| Styles / owner init+style+mount+load |48 /1 each|48 /1 each|

One bounded two-frame sample is3.3ms slower; **no speedup or robust regression claim**. No production callback/request/DOM additions. Native app/storage subscription counts differed with asynchronous service initialization; no leak-free or startup/network improvement assertion. The previously documented anonymous native Settings callback remains upstream and unchanged.

Runtime scenarios in the same user profile:

1. **PASS** native profile Select Up/Down/Back; exact avatar focus restored. Settings focused row uses canonical inset ring and existing spacing. **PASS** native Hybrid off/on restores original emerald gradient/shadow/radius and the exact trigger focus; enabled state restored.
2. **PASS** real Details → Favorites via Left/Right/OK → native checkbox Select → Up/Down → Back. Exact `.button--book.focus` restored, loading cleared, ratings retained. No menu choice was activated, so no favorite/history/Trakt data changed. Details initial Torrent focus remains intact.
3. **PASS** actual native confirmation/cancellation dialog during removal of only the audit probe: Left/Right works, No closes and restores originating Extensions focus. Original Hybrid pill/focus styles retained; no modal logic change.

**19 local tests PASS** (5 presentation/all14themes/audit-entry +14header/native-action regressions). Repository checks69JS/43manifest/513URLs, syntax/diff/security checks PASS; existing CI registration reused. Three console error entries, zero named JS or affected-source exceptions, one unattributed SCRIPT resource error per measured version. Do not claim an entirely clean third-party environment. Physical Google TV and live forced disabled/loading coverage **NOT TESTED**.

Original loader URL restored, Hybrid URL never changed, only temporary probe removed, normal reload leaves the same profile/tab usable. Local screenshot is not committed because surrounding Home contains personal viewing information. Existing delta-tree publication reuses unchanged Hybrid/YDesign/Cardify/service blobs and production code is not retransferred with evidence-only commits.

Remaining candidates: other Interface action groups (sidebar/menu, generic/simple actions, player controls) and global body rules require their own runtime proof before migration. No verified Details-focus conflict was found here. Do not import those candidates speculatively; do not close79/73 or automatically merge.

## #79 presentation architecture milestone — header region delegation

Baseline main `e0d871a` after merged93–96. Focused inventory reuses the preceding audit; this is not a Settings or repository re-audit.

| Feature | Classification / owner | Milestone action |
| --- | --- | --- |
| Header skin, clock typography, transparency and positioning | Presentation → canonical Hybrid | Migrate the remaining Interface header CSS dependencies and delegate the whole header region; remove the competing legacy header stylesheet while owned. |
| Native clock/time formatting, search, actions and profile/menu handlers | Functional/native or existing Hybrid handlers | Preserve original nodes/callbacks and native timer; no replacement clock, search or account logic. |
| Interface visibility/preferences, localized title/series metadata, ratings helpers | Functional/settings or metadata → Interface/service owners | Keep handlers, storage keys, APIs and current settings; no migration. |
| Vertical card layout/focus gates and content/UA/rating/progress writers | Presentation candidates / metadata → YDesign and service owners | Current card focus is already compatible after94; preserve metadata. Further presentation extraction needs independent parity evidence. |
| Cardify Details template/backdrop/poster/logo composition | Presentation candidate → Hybrid; data/controls remain service owners | Deferred as a separate subsystem; do not rewrite templates/backdrop/player in header PR. |
| Settings Registry plus card/dialog/Settings-Select presentation from93–96 | Already compatible | Reuse existing contract/focus/cleanup evidence; no repeated implementation. |
| Interface standalone themes, other menu/sidebar/body styling | Standalone fallback / later presentation candidates | Retain all14 themes and preference values; independent future scope only after runtime proof. |

**Header ownership evidence:** the real authorized main Lampa tab had one canonical Hybrid style plus an additional525-byte/five-rule `ifx_header_css`. Both match the header/clock: Hybrid wins transparency while Interface supplies header color rgb(244,244,247), clock flex-shrink and date-container alignment. The architecture is split even where declarations agree. Consolidation transfers those dependency rules into the existing static Hybrid style and replaces competing injection with an explicit, versioned region handoff in the original modules. No legacy plugin is disabled and no second installed UI entrypoint is introduced.

### Header presentation contract / implementation

- Hybrid advertises `presentationVersion:1` and `ownsPresentation('header')`. Ownership requires its actual active body class, live canonical stylesheet and non-destroyed instance, not mere global presence.
- Interface+ exposes `InterfacePlusPresentation` contract1 with a single `syncHeader()` region adapter in its existing module. A capable active canonical owner suppresses creation of Interface's header stylesheet. If Interface loads first, the canonical shell synchronously asks the adapter to release only its owned header style. No foreign style with the same id is deleted.
- The existing shell apply/off/destroy path synchronizes the adapter; no focus handlers, observers, timers, loader changes or new bootstrap stage. Disable/destroy restores the original standalone style; reenable removes it. Old/missing/incompatible/throwing owners preserve Interface fallback; a failed optional adapter cannot prevent the canonical shell. Relative diagnostics add only a numeric failure counter.
- Header foreground, clock flex alignment/shrink, tabular-number feature and date alignment now live in the canonical static style. Original native clock/search/action nodes and callback ownership remain. Standalone CSS is byte-identical to baseline:525bytes, SHA-256 `0faf016c458d1463a560a4f3776e2bc5d132371d36810f52c856ad89c7be799f`. No service plugin is disabled.

### Evidence and acceptance limits

Tested source `e5f8ccef0c0925d0abadc2523f2045abc38a3b1c` in the existing authorized main Chrome tab; actual Hybrid and Interface paths loaded from that revision and CDN/local bytes matched. [Safe measurements](../audit/ui/header-presentation-measurements.json) and [public header-only screenshot](../audit/ui/header-presentation.png).

| Claim | Evidence |
| --- | --- |
| One header presentation owner | canonical1+legacy1 → canonical1+legacy0;5 competing rules/525bytes no longer inserted in active Hybrid |
| Visual parity | all7 compared computed-style/geometry groups identical: header, clock, digits, date, date wrapper, search and avatar |
| Native node parity | one clock/search/avatar before, after and repeated profile navigation; no replacement clock/timer |
| Functional header | PASS search opens native input, Back restores search focus; mouse/D-pad profile opens, Up/Down/Back/reopen restores exact avatar focus |
| Reversible standalone | PASS native off/on; legacy525-byte dark header restored off, removed on; exact trigger focus and enabled preference restored |
| Source/unit lifecycle |31 PASS:6 new region/delegation tests (both load orders, repeated sync/toggles, teardown, old/failing contract, foreign style protection, no value/timer/event work) +11bootstrap +14native header/action regressions |

Syntax/repository validator69JS/43manifest/514URLs and diff checks PASS. CI source head all5 workflows successful; final evidence-only head still requires green CI before integration. No full suite re-run. Header style-node/matcher elimination is deterministic, not an FPS/startup gain: production JS grows795+648bytes for the explicit contract and transferred parity rules. No new stylesheet, installed entrypoint, request, observer, interval or event listener.

**Historical runtime limitation (superseded by the A/B acceptance below):** the immutable-source pass later displayed empty Home. One native Refresh still had no cards; Details smoke was therefore BLOCKED. No named JS exception or error attributed to the changed modules was captured, but5 unattributed error entries remain. Do not assign a network/product root cause without evidence. Restoring both original extension URLs and normal reload recovered49cards/focused card. The source-loader delivery environment differs, so full Home/Details/service parity is not certified by the header-only assertions. That was the pre-follow-up checkpoint. The bounded UI-only A/B below supersedes this acceptance blocker without assigning an unproven root cause. No Home/Trakt/core workaround was added.

Cleanup complete: original Hybrid/loader URLs restored, same profile/tab open, enabled setting restored, no probe was installed, no auth/history/account/server edits or storage clearing. Screenshot contains only the public header, no private Home context. Physical Google TV **NOT TESTED**. #79/#73 remain open; no automatic merge.

Next migration candidates stay as classified above: YDesign/card presentation separated from metadata, Cardify template composition separated from data/controls, other Interface theme/menu regions only after scoped parity. This PR establishes a reusable region-ownership boundary rather than another global override stack; it does not claim the complete application is already one plugin.

### PR97 runtime acceptance follow-up — controlled UI-only A/B

**Home/Details/header acceptance PASS.** This supersedes the previous runtime blocker, not its historical observations. Existing production UI source `a7ecc18a2757b582aa50be46a60634cf3a6305ea` and its31 passing tests were preserved without a new production fix. Four new audit tests verify the diagnostic boundary; all other files/services/metadata ownership remain unchanged.

The existing user main Chrome/Lampa tab ran one A/B comparison. Both phases used the normal Pages loader and the original service URLs/configuration; no `LAMPA_PLUGINS_BASE` or user-list override. Only Interface was redirected to the selected immutable UI revision, with Hybrid pinned to the same revision. The opt-in `audit/ui/header-runtime.js` temporarily replaces the loader URL, observes numerical registrations, script completions and aggregate API statuses, and expires its hooks. It never reads storage, request headers/bodies, responses or account/content identifiers; original arguments/callback results are passed through. Normal restoration reload removes all hooks, including any pass-through captured by later native wrappers.

| Observation | A: merged main e0d871a | B: PR97 a7ecc18 |
| --- | --- | --- |
| Usable Home rows/cards |7 /49|7 /46|
| Observed registrations / Home callbacks |41 /35 (from8)|41 /35 (from8)|
| Loader script completion order |Trakt → Trakt+ → torrent-search → Interface → YDesign → average-rating → Cardify → translation|identical|
| Non-UI delivery family |original Pages URLs|original Pages URLs|
| Public service readiness flags |all observed APIs/classes present, appready|same|
| Canonical / legacy header sheets |1 /1|1 /0|
| Named JS exceptions |0|0|

Hashes for both versions were independently checked against merged-main/local PR bytes, and actual script paths plus the ownership change confirmed execution. [Safe full results](../audit/ui/header-runtime-acceptance.json). Home/card totals are snapshots with asynchronous content; no identical-content or performance assertion. Both network buckets were empty in the bounded window: **no claim of zero total requests or verified fresh API success**. Cached/proxy/out-of-window behavior is not inferred as the root cause. Console captured2/4 unattributed entries, no named/changed-module exception; no global error-free claim.

With B actually loaded: **PASS** Home renders; a real Details page opens; Torrent receives initial focus; Back restores the same originating card. Card identity was compared only in transient controller memory and not exported. **PASS** search is centered (0px delta), clock/date remain visible, native search input/Back and avatar menu work. **PASS** Hybrid off restores exactly one525-byte standalone header stylesheet; on restores a single canonical owner and exact trigger focus. No backend/Trakt test writes or manual history manipulation.

Original Hybrid and loader URLs and enabled preference restored; same browser/profile/tab remains usable with49cards and no audit node/script. No new diagnostic extension was installed. The earlier empty Home was not reproduced in controlled UI-only A/B; its original root cause remains **UNKNOWN**. This is successful acceptance evidence, not a speculative attribution to CSS, Trakt, network or delivery.

Reuse31 existing header/bootstrap tests;4 targeted audit tests and repository validator70JS/43entries/517URLs PASS. Final-head CI must remain green before marking Ready. Per the current user instruction, mark Ready and report GO only after that check; no automatic merge, no closing79/73. Physical Google TV remains NOT TESTED. No YDesign/Cardify migration started.
