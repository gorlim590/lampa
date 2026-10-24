---
name: lampa-ui-testing
description: Validate Lampa UI or browser-runtime changes with native TV navigation and exact changed scripts. Use when rendering, focus, lifecycle or runtime integration is affected; skip documentation-only work and pure logic already covered by unit tests.
---

# Focused Lampa UI verification

Read [repository rules](../../../AGENTS.md) and the runtime section of [TESTING](../../../docs/TESTING.md). Do not automatically run a historical browser harness's entire matrix.

## Workflow

1. Reuse prior evidence for unchanged relevant source/fixtures/runtime. Complete syntax and targeted unit checks first. Define at most3 user scenarios for an ordinary Issue: changed behavior, affected async/error transition, and reopen/toggle/focus cleanup as needed. Record a concrete reason for any exception.
2. Inspect the chosen harness. Legacy header/torrent-search harnesses launch Chromium and are not suitable for an existing-user-tab task without adaptation. No browser/profile/context launch, account writes, storage clearing or user-browser closure.
3. Attempt the authorized existing CDP tab once. If unavailable, record the exact BLOCKED reason and continue independent checks. Do not retry without evidence of an environment change or change security/network settings.
4. Verify served URL, hash and commit of the modified JS before asserting runtime success. Route exact local bytes if needed; use isolated mock responses/write shadows and restore them afterward. Never inspect token values or dump user storage.
5. Assert visible UI and native controller/component state together: relevant arrows/OK/Back, scroll and logical focus restoration. Do not launch arbitrary sources. Screenshots should prove the affected section, not just show an error-free console.
6. Restore routes, metrics and original page without closing the browser. Report per-scenario PASS/FAIL/BLOCKED, exceptions, hashes, fixture versus real backend and remaining physical-device/player checks. Update existing progress once.

## Success criteria

Evidence demonstrates the affected behavior in actual changed code within the agreed budget, user data/session is preserved, and unperformed tests stay explicitly unverified. No physical Google TV/FPS claim from desktop emulation; no repetitive screenshots, full audit or profiling without a defect.
