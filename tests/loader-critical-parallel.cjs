'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/../loader.js', 'utf8');

function fixture(deferred = ['ui/cardify-plus.js']) {
  const scripts = [];
  const nodes = [];
  const rootClasses = new Set();
  const timers = new Map();
  let timerId = 0;
  function element(tag) {
    return {
      tagName: tag.toUpperCase(), children: [], parentNode: null, classList: { add: name => rootClasses.add(name), remove: name => rootClasses.delete(name) },
      appendChild(node) { this.children.push(node); node.parentNode = this; return node; },
      removeChild(node) { this.children = this.children.filter(child => child !== node); node.parentNode = null; return node; },
      setAttribute() {}, remove() {}
    };
  }
  const body = element('body');
  const head = element('head');
  head.appendChild = function (node) {
    node.parentNode = this;
    if (node.tagName === 'SCRIPT') scripts.push(node); else nodes.push(node);
  };
  const document = {
    location: { href: 'https://lampa.example/' },
    documentElement: { classList: { add: name => rootClasses.add(name), remove: name => rootClasses.delete(name), contains: name => rootClasses.has(name) } },
    body, head,
    createElement(tag) { return element(tag); },
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
  Object.defineProperty(context, 'Lampa', { get() { return window.Lampa; }, set(value) { window.Lampa = value; } });
  vm.runInNewContext(source, context);
  return { scripts, nodes, timers, window, document, rootClasses };
}

test('critical UI scripts download together but remain declared as ordered scripts', () => {
  const { scripts, window } = fixture([]);
  assert.equal(scripts.length, 7, 'Trakt and both Home owners are part of the built-in critical lane');
  assert.deepEqual(scripts.map(script => new URL(script.src).pathname), [
    '/lampa/ui/stremio-hybrid.js', '/lampa/ui/interface-plus.js', '/lampa/ui/design-optimized.js',
    '/lampa/trakt/trakt.js', '/lampa/trakt/trakt-plus.js',
    '/lampa/plugins-to-enable/home-policy.js', '/lampa/plugins-to-enable/home-history.js'
  ]);
  assert(scripts.every(script => script.async === false), 'dynamic script execution order remains explicit');
  scripts[2].onload();
  assert.equal(window.LampaLoaderDiagnostics.stage, 'critical');
  scripts[0].onload();
  assert.equal(window.LampaLoaderDiagnostics.stage, 'critical');
  scripts[1].onload();
  scripts.slice(3).forEach(script => script.onload());
  assert.equal(window.LampaLoaderDiagnostics.loaded, 7);
  assert.equal(window.LampaLoaderDiagnostics.stage, 'waiting-for-appready');
  assert.equal(window.LampaLoaderDiagnostics.waitingForAppReady, true);
});

test('a fast response and a failed sibling do not wait for the slow critical script', () => {
  const { scripts, window } = fixture([]);
  assert.equal(scripts.length, 7);
  scripts[1].onload();
  scripts[2].onerror();
  scripts.slice(3).forEach(script => script.onload());
  assert.equal(window.LampaLoaderDiagnostics.loaded, 5);
  assert.equal(window.LampaLoaderDiagnostics.failed, 1);
  assert.equal(window.LampaLoaderDiagnostics.stage, 'critical');
  scripts[0].onload();
  assert.equal(window.LampaLoaderDiagnostics.stage, 'waiting-for-appready');
  scripts[2].onload();
  scripts[1].onerror();
  assert.equal(window.LampaLoaderDiagnostics.loaded, 6);
  assert.equal(window.LampaLoaderDiagnostics.failed, 1);
});

test('a bounded critical timeout releases the lane and a late load is counted once', () => {
  const { scripts, timers, window } = fixture([]);
  scripts[0].onload();
  scripts[1].onload();
  scripts.slice(3).forEach(script => script.onload());
  const timeout = Array.from(timers.values()).find(timer => timer.ms === 8000);
  assert(timeout, 'the loader installs its bounded resource timeout');
  timeout.fn();
  assert.equal(window.LampaLoaderDiagnostics.stage, 'waiting-for-appready');
  assert.equal(window.LampaLoaderDiagnostics.timedOut, 1);
  assert.equal(window.LampaLoaderDiagnostics.failed, 1);
  scripts[2].onload();
  assert.equal(window.LampaLoaderDiagnostics.lateLoads, 1);
  assert.equal(window.LampaLoaderDiagnostics.loaded, 6);
  assert.equal(window.LampaLoaderDiagnostics.failed, 1);
});

test('late native dependencies start the deferred adapter only after appready arrives', () => {
  const { scripts, timers, window } = fixture(['ui/cardify-plus.js']);
  scripts.slice(0, 7).forEach(script => script.onload());
  assert.equal(window.LampaLoaderDiagnostics.stage, 'waiting-for-appready');
  assert.equal(scripts.length, 7, 'deferred adapters have not started while native Lampa is absent');
  window.appready = true;
  window.Lampa = {};
  const poll = Array.from(timers.values()).find(timer => timer.ms === 100);
  assert(poll, 'readiness polling remains bounded and scheduled');
  poll.fn();
  assert.equal(window.LampaLoaderDiagnostics.stage, 'deferred');
  assert.equal(scripts.length, 8);
  assert.equal(new URL(scripts[7].src).pathname, '/lampa/ui/full-cast.js', 'the built-in UI capability starts before optional user adapters');
  scripts[7].onload();
  assert.equal(scripts.length, 9);
  assert.equal(new URL(scripts[8].src).pathname, '/lampa/ui/cardify-plus.js');
  scripts[8].onload();
  assert.equal(window.LampaLoaderDiagnostics.stage, 'complete');
  assert.equal(window.LampaLoaderDiagnostics.loaded, 9);
});

test('first Home remains hidden until Trakt rows are built and complete', () => {
  const { scripts, timers, window, document, rootClasses } = fixture([]);
  assert(rootClasses.has('lampa-trakt-home-pending'));
  scripts.forEach(script => script.onload());
  let active = { component: 'main', source: 'tmdb', activity: { component: { items: [] } } };
  let replacements = 0;
  window.Lampa = { Activity: { active: () => active, replace() { replacements++; active = { component: 'main', source: 'tmdb', activity: { component: { items: [] } } }; } } };
  const gate = window.LampaTraktHomeGate;
  gate.homePolicyReady();
  gate.traktRowsReady(['trakt-popular', 'trakt-trending']);
  gate.requestHomeBuild();
  assert.equal(replacements, 1);
  assert(rootClasses.has('lampa-trakt-home-pending'), 'initial/native categories stay hidden while Trakt is loading');
  gate.homeRowComplete('trakt-popular');
  active.activity.component.items.push({ data: { home_row_origin: 'trakt', results: [{ id: 1 }] } });
  gate.homeRowComplete('trakt-trending');
  const poll = Array.from(timers.values()).find(timer => timer.ms === 150);
  assert(poll);
  poll.fn();
  assert.equal(window.LampaLoaderDiagnostics.traktHomeGate.status, 'ready');
  assert.equal(rootClasses.has('lampa-trakt-home-pending'), false);
  assert.equal(document.body.children.length, 0, 'loading overlay is removed after the Trakt Home is ready');
});
