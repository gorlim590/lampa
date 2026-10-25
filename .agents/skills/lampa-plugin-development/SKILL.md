---
name: lampa-plugin-development
description: Develop or fix Lampa plugin behavior in this repository, including lifecycle, metadata, Trakt, Home or torrent boundaries. Use for implementation work, not documentation-only edits or an unsolicited full audit.
---

# Lampa plugin development

Read [repository rules](../../../AGENTS.md) first; then only the relevant owner in [ARCHITECTURE](../../../docs/ARCHITECTURE.md) and intersection in [PLUGIN_COMPATIBILITY](../../../docs/PLUGIN_COMPATIBILITY.md).

## Workflow

1. Record root/branch/baseline/dirty files. Read the requested Issue and latest relevant checkpoint. Check whether a related fix is on this main or only an unmerged PR; reuse recorded evidence for unchanged code.
2. Trace the named entrypoint, canonical owner, native Lampa boundary and relevant caller. Search those files first. A catalog listing/global object is not proof of activation; a CSS overlap is not proof of double execution.
3. Establish a reproducible failure before patching. Choose the smallest owner-level fix; keep legacy URL aliases, playback IDs, Trakt unknown/account semantics and local resume data intact. Do not create another Home/details/search renderer to bypass an existing one.
4. Use existing events/components, bounded requests/cache and stale-response checks. Preserve listeners on moved nodes; cleanup owned resources. Profile only a concrete performance problem.
5. Run changed-file syntax and the focused regression from [TESTING](../../../docs/TESTING.md). Use the UI skill only for a real UI/runtime impact, with up to3 focused scenarios for an ordinary Issue.
6. Review scoped diff, record tests/limitations/next step in existing progress and make logical commits. Publication follows current task authorization, never implicit permission from this skill.

## Success criteria

The demonstrated failure is fixed with a meaningful regression or documented runtime evidence; relevant native APIs/data/remote navigation survive; tests name actual code/evidence and do not turn unknown into PASS. No unrelated plugin refactor, extra dependency, account mutation or unrequested merge.
