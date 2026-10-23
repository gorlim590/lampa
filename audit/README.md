# Audit evidence and test reports

All audit evidence is already consolidated under `audit/` by date and topic. It includes screenshot `.png` artifacts, JSON metrics, `.log` output, scripts and Markdown reports.

`audit/reports/CODEX_PROGRESS.md` is the moved top-level running Codex progress report. Historical dated directories remain unchanged because test scripts and GitHub issues may link to them. **Do not move their internal files without adjusting relative imports, evidence links and test commands.**

Suggested layout for future audits: `audit/<issue>-YYYYMMDD/{README.md,tests/,results/,screenshots/,logs/}`. Production runtime plugins are organized separately in `plugins/`, and historical copies in `backups/`.
