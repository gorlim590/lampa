# Settings Hub audit (#73)

Baseline: `1747b16ff926072810a20af1b6665326ee34d2e3`.

This directory separates registration evidence from functional acceptance. A script tag is an observed delivery path, not proof that initialization succeeded. An `onChange` function is not proof of effect, persistence, reset or remote navigation.

## Read-only runtime census

Open the existing Lampa tab with the explicit `settings_audit=1` query parameter after the normal loader finishes. The optional loader branch loads `runtime-census.js` once. Without that parameter, the default eight-plugin sequence and request count remain unchanged.

The utility enumerates the current public `SettingsApi.allParams()` and `allComponents()` and native Settings folder/template metadata. It emits one inert JSON script element, `#lampa-settings-census`. It never invokes parameter handlers, opens panels, reads parameter values from Storage, writes preferences, patches APIs, adds listeners/observers, or probes services. Template translation may internally read the native language preference; the reported direct Storage counters refer only to the census's own calls. Defaults are allowlisted or redacted, source URL queries/userinfo and function bodies are excluded. Current values are deliberately marked not read.

The observed core source exposes these public enumeration methods; its downloaded source hash is `9cea962508ca7dfd50da201f9dd0c0ea012f541d0f8db932723a8d16a2a9cc1a`. The deployed application is external to this repository. Native templates, conditionally inserted controls and storage-only preferences must be reconciled with source; this utility does not pretend to complete their behavioral audit.

## Delivery phases

1. Capture the actual registration snapshot, attribute source/handler/storage ownership and produce `SETTINGS-INVENTORY.md` plus machine-readable records. Mark unresolved or untested rows explicitly, never as working/broken by inference.
2. Build a read-only Registry around existing native metadata and the resulting ownership map. No second business handler or preference store.
3. Add the opt-in Hub using native Settings navigation and shared Hybrid tokens. Retain the native entrypoint and every original owner panel.
4. Verify reversible controls and persistence in controlled fixtures; use existing verified evidence where source matches. Real credentials/history/server settings remain untouched.
5. Measure the affected open/switch/reopen path and reconcile final runtime inventory. Keep #73 open until all phases are accepted.

The related ownership constraints are #31/#18 for shared visuals/entrypoints, #15/#9 for plugins/UI, #5/#7 for Trakt, #25/#30 for Home, #12 for screensaver, #22 for language, and #14/#17/#47/#59 for torrents. Existing Home quick management and torrent controllers remain with their current owners.

## Checks

`node --test tests/settings-census.cjs` verifies read-only behavior, redaction, unavailable enumeration, and explicit/default loader paths. This is synthetic audit-tool coverage, not verification of user settings or physical Google TV.

## Census schema 2

Template parsing uses the exact `settings-param` class token: root wrappers and title classes are not options. Schema 1 counts include wrapper artifacts and must not be used as the final option count. Code-only callback fingerprints support offline owner attribution; string literals, comments and whitespace are removed before hashing. No callback bodies or current values are exported. The fingerprint is an attribution hint, not a unique registration identity.

## Inventory checkpoint

Primary Chrome/Lampa capture after PR #77: **576 records** (480 SettingsApi + 96 template records), **506 controls and 70 presentation records**. Capture: **47 ms**, zero direct Storage calls/service probes. The earlier 616-record schema 1 capture included wrappers and a different asynchronous registration state; it is not a valid speed comparison.

[SETTINGS-INVENTORY.md](SETTINGS-INVENTORY.md) maps every captured record's old location, category, owner candidate, storage attribution and verification status. [settings-inventory.json](settings-inventory.json) retains source lines, callback attribution, per-source hashes and ambiguity. Sources are frozen inspected bytes from checkpoint `87b43a8` (including proposed fixes), distinguished from the deployed capture and the later #79 compatibility refactor. Reuse unchanged ownership evidence; do not treat these hashes as current-branch delivery certification. Current values are never exported. Full audit artifacts are never downloaded by the TV Hub.

Ten BWA controls have unresolved source/handler attribution because the public-source fetch was unavailable in the audit environment. This is not proof of failure. Native `hub` uses a special folder callback. `ncInfo` is lazily created after opening its owner. Anonymous menu-hide controls require onRender discovery; no stable storage identity is invented. Duplicate IDs are review evidence, not permission to delete definitions. Conditional/platform-specific and storage-only options remain a gap. Effects, persistence, restart/reset and profile scope are **not individually certified** for all 506 controls.

Confirmed findings:

- **P0, fixed in proposed owner code; 5 synthetic tests PASS:** AverageRating interpolated four credential fields and a proxy string into ordinary panel HTML/text. Summaries now say configured/empty; original editor/storage writes are preserved. Real credentials were never opened/edited. Hub blocks opening that panel without the new safe capability; native fallback is retained.
- **P1, source-confirmed and reproduced in isolation:** `community/new-category.js` Info overrides Back with `Settings.create('ncInfo')`, reopening itself. Hub warns instead of invoking that broken transition. Owner code remains unchanged pending its focused fix.
- **P2, partial and explained:** legacy rating-size XS/S/M share the intentional 1.25 em TV minimum. The menu explains this without rewriting the stored selection. Larger values remain respected.
- **Dependency:** unavailable lazy templates are reported and are not directly created before their owner initializes them.

## Functional Registry/adapter and the single UI owner (#79)

`ui/settings-hub.js` is an internal module, not another installable theme. Loading it only exports `LampaSettingsHub` (`contractVersion: 1`); it does not mount controls, subscribe to app readiness, insert CSS, or bootstrap a theme. The single #79 UI entrypoint may call `install(Lampa, $, document)` after native Settings is ready and `destroy()` on teardown. Repeated install is idempotent; destroy removes its two subscriptions, owned navigation definitions/folder and active view, retaining all foreign settings. The unchanged native Settings fallback remains operational.

`createRegistry(Lampa, folders)` returns a read-only metadata snapshot, category/search selection, explicit gaps/statuses and direct-call metrics. No current values, account data or business-handler copies are retained. Categories are shared with the offline inventory tool. Duplicate canonical IDs get distinct snapshot instance IDs for focus return and are marked identity-unverified, rather than silently discarded or assigned invented storage keys.

The optional native navigation adapter adds one folder and one internal template route. It uses Settings.create/Controller/Scroll and links to original owner panels; values, editing, saving, reset and profile/account/device scope remain owned by those panels. There is no new preference store or key migration in this milestone. Every old key/default is passed through unchanged; individual scoping/effect certification and any later deprecation/migration remain #73 work, gated by owner proof. No decorative setting toggle is introduced.

Search uses metadata only; at most 24 option links render per page. Two subscriptions exist only while mounted, with no own interval/MutationObserver, focus/scroll-driven rebuild or service request. Owner panels retain their existing onRender work. The three existing Hybrid compatibility lines yield its legacy rail and clear a remembered Hub route; this is a functional handshake, not a redesign. #79 owns layout, typography, colors, focus presentation, responsive behavior and early initialization. Existing `settings-hub-active`/data hooks are available to that owner; #73 inserts no stylesheet. The earlier preview CSS remains recoverable in commit `1269918`, not in active delivery.

No production loader or manifest entry activates this adapter, including `settings_hub=1`. The explicit development harness below is not a recommended user-installed UI plugin. Native Settings is retained until real #79 integration acceptance. Physical TV, per-option effect/persistence/reset, complete third-party attribution and profile/device scope remain unverified.

## Offline reproduction and tests

`scripts/settings-inventory.mjs --acorn PATH --core FILE --scripts FILE --runtime FILE --external FILE` accepts local public-source inputs and a redacted schema 2 census. Acorn is an explicit audit-tool input, not a runtime dependency; no package is installed and inspected code is not executed.

`node --test tests/settings-census.cjs tests/settings-registry.cjs tests/settings-hub-lifecycle.cjs tests/settings-sensitive-summaries.cjs` covers privacy, categories, unknown/problem states, late discovery, native lifecycle cleanup, focus/Back return, bounded paging and unsafe panel protection in isolated fixtures. These do not certify primary-browser or physical TV acceptance.

The developer-only `audit/settings/preview.js?settings_preview=1` harness loads the matching-branch functional adapter only. It never destroys/reloads Hybrid or installs a stylesheet. It refuses to mount against an active legacy Hybrid without the compatibility contract and explains the #79 dependency. Browser acceptance must use the actual modified module in the authorized existing user tab; blocked integration is not a runtime PASS.

The external core source contains an anonymous Params `update_scroll_position` subscription in native Component construction that is not paired with removal in its Back/destroy code. This source-level lifecycle concern is outside this repository; do not claim all native listener counts are stable based on the Hub own-listener fixture. No global subscription patch is introduced. Runtime measurement/owner remediation remains a phase-5 acceptance item.
