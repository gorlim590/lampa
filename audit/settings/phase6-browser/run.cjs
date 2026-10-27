'use strict';
// Canonical entry point: run twice on the existing tab, then prove cleanup after a forced assertion failure.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

for (const [index, script] of ['run-e2e.cjs', 'run-cleanup-check.cjs'].entries()) {
    const result = spawnSync(process.execPath, [path.join(__dirname, script)], { stdio: 'inherit', env: process.env });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status || 1);
    if (index === 0) {
        const evidence = JSON.parse(fs.readFileSync(path.join(__dirname, 'e2e-stable.json'), 'utf8'));
        if (evidence.result !== 'PASS' || evidence.cleanup?.status !== 'PASS' ||
            !evidence.browserSurvival?.originalProcessStillAlive || !evidence.browserSurvival?.sameLampaTabStillAvailable) {
            console.error('Stable browser run or its cleanup/survival verification did not pass');
            process.exit(1);
        }
    }
}
