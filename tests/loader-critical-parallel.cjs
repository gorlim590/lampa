'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/../loader.js', 'utf8');

function fixture(deferred = ['ui/cardify-plus.js']) {
  const scripts = [];
  const timers = new Map();
  let timerId = 0;
  const document = {
    location: { href: 'https://lampa.example/' },
    head: { appendChild(script) { scripts.push(script); script.parentNode = this; } },
    createElement(tag) { assert.equal(tag, 'script'); return { async: true, setAttribute() {}, remove() {} }; },
    querySelector() { return null; }
  };
  const window = {
    LAMPA_PLUGINS_BASE: 'https://gorlim590.github.io/lampa/',
    LAMPA_PLUGINS_VERSION: 'fixture',
    LAMPA_PLUGINS_LIST: deferred,
    appready: false,
    console: { log() {} }
  };
  const context = {
    window, document, URL,
    setTimeout(fn, ms) { const id = ++timerId; timers.set(id, { fn, ms }); return id; },
    clearTimeout(id) { timers.delete(id); }
  };
  vm.runInNewContext(source, context);
  return { scripts, timers, window };
}

test('critical UI scripts download together but remain declared as ordered scripts', () => {
  const { scripts, window } = fixture([]);
  assert.equal(scripts.length, 3, 'all critical scripts are requested before any onload callback');
  assert.deepEqual(scripts.map(script => new URL(script.src).pathname), [
    '/lampa/ui/stremio-hybrid.js', '/lampa/ui/interface-plus.js', '/lampa/ui/design-optimized.js'
  ]);
  assert(scripts.every(script => script.async === false), 'dynamic script execution order remains explicit');
  scripts[2].onload();
  assert.equal(window.LampaLoaderDiagnostics.stage, 'critical');
  scripts[0].onload();
  assert.equal(window.LampaLoaderDiagnostics.stage, 'critical');
  scripts[1].onload();
  assert.equal(window.LampaLoaderDiagnostics.loaded, 3);
  assert.equal(window.LampaLoaderDiagnostics.stage, 'waiting-for-appready');
  assert.equal(window.LampaLoaderDiagnostics.waitingForAppReady, true);
});

test('a fast response and a failed sibling do not wait for the slow critical script', () => {
  const { scripts, window } = fixture([]);
  assert.equal(scripts.length, 3);
  scripts[1].onload();
  scripts[2].onerror();
  assert.equal(window.LampaLoaderDiagnostics.loaded, 1);
  assert.equal(window.LampaLoaderDiagnostics.failed, 1);
  assert.equal(window.LampaLoaderDiagnostics.stage, 'critical');
  scripts[0].onload();
  assert.equal(window.LampaLoaderDiagnostics.stage, 'waiting-for-appready');
  scripts[2].onload();
  scripts[1].onerror();
  assert.equal(window.LampaLoaderDiagnostics.loaded, 2);
  assert.equal(window.LampaLoaderDiagnostics.failed, 1);
});

test('a bounded critical timeout releases the lane and a late load is counted once', () => {
  const { scripts, timers, window } = fixture([]);
  scripts[0].onload();
  scripts[1].onload();
  const timeout = Array.from(timers.values()).find(timer => timer.ms === 8000);
  assert(timeout, 'the loader installs its bounded resource timeout');
  timeout.fn();
  assert.equal(window.LampaLoaderDiagnostics.stage, 'waiting-for-appready');
  assert.equal(window.LampaLoaderDiagnostics.timedOut, 1);
  assert.equal(window.LampaLoaderDiagnostics.failed, 1);
  scripts[2].onload();
  assert.equal(window.LampaLoaderDiagnostics.lateLoads, 1);
  assert.equal(window.LampaLoaderDiagnostics.loaded, 2);
  assert.equal(window.LampaLoaderDiagnostics.failed, 1);
});

test('late native dependencies start the deferred adapter only after appready arrives', () => {
  const { scripts, timers, window } = fixture(['ui/cardify-plus.js']);
  scripts.slice(0, 3).forEach(script => script.onload());
  assert.equal(window.LampaLoaderDiagnostics.stage, 'waiting-for-appready');
  assert.equal(scripts.length, 3, 'deferred adapters have not started while native Lampa is absent');
  window.appready = true;
  window.Lampa = {};
  const poll = Array.from(timers.values()).find(timer => timer.ms === 100);
  assert(poll, 'readiness polling remains bounded and scheduled');
  poll.fn();
  assert.equal(window.LampaLoaderDiagnostics.stage, 'deferred');
  assert.equal(scripts.length, 4);
  assert.equal(new URL(scripts[3].src).pathname, '/lampa/ui/cardify-plus.js');
  scripts[3].onload();
  assert.equal(window.LampaLoaderDiagnostics.stage, 'complete');
  assert.equal(window.LampaLoaderDiagnostics.loaded, 4);
});
