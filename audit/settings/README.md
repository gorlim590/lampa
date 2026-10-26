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
