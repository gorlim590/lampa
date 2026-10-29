'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/../loader.js', 'utf8');

test('critical UI scripts download together but remain declared as ordered scripts', () => {
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
    appready: false,
    console: { log() {} }
  };
  const context = {
    window, document, URL,
    setTimeout(fn, ms) { const id = ++timerId; timers.set(id, { fn, ms }); return id; },
    clearTimeout(id) { timers.delete(id); }
  };
  vm.runInNewContext(source, context);
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
