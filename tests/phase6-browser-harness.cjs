'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '../audit/settings/phase6-browser');
const runner = fs.readFileSync(path.join(dir, 'run-e2e.cjs'), 'utf8');
const server = fs.readFileSync(path.join(dir, 'serve.cjs'), 'utf8');
const wrapper = fs.readFileSync(path.join(dir, 'run-cleanup-check.cjs'), 'utf8');

test('browser assertions require visible active-panel elements, native controller and in-panel focus', () => {
    assert.match(runner, /expectedElementVisibleInActivePanel/);
    assert.match(runner, /allowedControllers\.includes\(value\.controller\)/);
    assert.match(runner, /focusVisibleInActivePanel/);
    assert(runner.includes("await page.unroute('**/*', route)"));
    assert.match(runner, /Native Lampa keyboard confirmation control is not visible/);
});

test('browser cleanup restores Storage and listener, unregisters routing, and verifies process and page survival', () => {
    for (const expected of [
        'storageGetRestored', 'storageSetRestored', 'settingsObserverRemoved', 'temporaryGlobalsRemoved',
        'networkRouteUnregistered', 'originalProcessStillAlive', 'sameLampaTabStillAvailable'
    ]) assert(runner.includes(expected), 'missing cleanup assertion: ' + expected);
    assert.match(runner, /cleanup\.errors\.push/);
    assert.match(runner, /blockedServiceCounts/);
    assert.match(runner, /removeInactiveNativeKeyboardPanels/);
    assert(!runner.includes('.catch(() => {})'), 'cleanup errors must not be silently swallowed');
    assert.match(wrapper, /Intentional cleanup verification failure/);
    assert.match(wrapper, /Cleanup failed after intentional assertion failure/);
});

test('asset server pins allowlisted bytes to a clean committed checkout on each request and binds loopback only', () => {
    assert.match(server, /git\(\['rev-parse', 'HEAD'\]\)/);
    assert.match(server, /git\(\['status', '--porcelain', '--untracked-files=all'/);
    assert(server.includes("['show', branchSha + ':' + relative]"));
    assert.match(server, /currentCheckoutMismatch/);
    assert.match(server, /res\.writeHead\(409/);
    assert.match(server, /server\.listen\(8766, '127\.0\.0\.1'/);
});

test('runner attaches only to existing CDP and does not create a browser, tab or context', () => {
    assert.match(runner, /chromium\.connectOverCDP\('http:\/\/127\.0\.0\.1:9222'\)/);
    assert(!/chromium\.launch\(|newPage\(|newContext\(/.test(runner));
    assert.match(runner, /await browser\.close\(\)/);
    assert.match(runner, /sameLampaTabStillAvailable/);
});
