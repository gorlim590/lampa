'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const dir = __dirname;
const probeFile = 'cleanup-failure-probe.json';
const probePath = path.join(dir, probeFile);
const output = path.join(dir, 'cleanup-check.json');
try { fs.unlinkSync(probePath); } catch (error) { if (error.code !== 'ENOENT') throw error; }

const child = spawnSync(process.execPath, [path.join(dir, 'run-e2e.cjs')], {
    cwd: path.resolve(dir, '../../..'),
    env: { ...process.env, P6_INJECT_ASSERTION_FAILURE: '1', P6_OUTPUT_FILE: probeFile },
    encoding: 'utf8', timeout: 90000, maxBuffer: 1024 * 1024
});
assert.equal(child.error, undefined, 'Intentional failure probe did not finish: ' + (child.error && child.error.message));
assert.equal(child.status, 1, 'Intentional assertion failure should make the runner exit non-zero');
const evidence = JSON.parse(fs.readFileSync(probePath, 'utf8'));
assert.equal(evidence.intentionalFailureProbe, true);
assert.equal(evidence.failure?.detail, 'Intentional cleanup verification failure');
assert.equal(evidence.cleanup?.status, 'PASS', 'Cleanup failed after intentional assertion failure');
assert.equal(evidence.cleanup?.pageRestore?.storageGetRestored, true);
assert.equal(evidence.cleanup?.pageRestore?.storageSetRestored, true);
assert.equal(evidence.cleanup?.pageRestore?.settingsObserverRemoved, true);
assert.equal(evidence.cleanup?.pageRestore?.temporaryGlobalsRemoved, true);
assert.equal(evidence.cleanup?.networkRouteUnregistered, true);
assert.equal(evidence.browserSurvival?.originalProcessStillAlive, true);
assert.equal(evidence.browserSurvival?.sameLampaTabStillAvailable, true);

const result = {
    status: 'PASS', mode: 'intentional assertion failure against the existing dedicated CDP page',
    expectedFailureObserved: true, cleanup: evidence.cleanup, browserSurvival: evidence.browserSurvival
};
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
fs.unlinkSync(probePath);
console.log(JSON.stringify({ status: result.status, cleanup: result.cleanup.status, browserSurvival: result.browserSurvival }));
