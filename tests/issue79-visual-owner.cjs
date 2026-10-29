'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '..');
const hybridSource = fs.readFileSync(path.join(root, 'ui/stremio-hybrid.js'), 'utf8');
const interfaceSource = fs.readFileSync(path.join(root, 'ui/interface-plus.js'), 'utf8');
const designSource = fs.readFileSync(path.join(root, 'ui/design-optimized.js'), 'utf8');
const cardifySource = fs.readFileSync(path.join(root, 'ui/cardify-plus.js'), 'utf8');

function hybridStyleFixture(enabled = true) {
  const classes = new Set(enabled ? ['stremio-hybrid'] : []);
  const nodes = [];
  let writes = 0;
  function makeStyle() {
    let value = '';
    const node = {
      id: '',
      setAttribute() {},
      remove() { const index = nodes.indexOf(this); if (index >= 0) nodes.splice(index, 1); },
      get textContent() { return value; },
      set textContent(next) { writes++; value = next; }
    };
    return node;
  }
  const document = {
    body: { classList: { contains: name => classes.has(name) } },
    head: { appendChild(node) { if (!nodes.includes(node)) nodes.push(node); } },
    createElement: tag => tag === 'style' ? makeStyle() : { tag },
    getElementById: id => nodes.find(node => node.id === id) || null
  };
  const context = {
    window: {}, document, css: '/* canonical shell */', UI_VERSION: 'fixture', style: null, destroyed: false,
    styleStore: { order: [], modules: {} }, styleIdsByOwner: { 'ydesign-cards':'ydesign-style-block', 'ydesign-font':'ydesign-font-css', 'cardify-plus':'cardify-plus-styles' }, styleModuleRevision:0,styleContentCache:{valid:false,active:null,destroyed:null,revision:-1,value:''},bootStats: { styleInsertions: 0, styleUpdates: 0, styleCompositions:0, styleCacheHits:0 }
  };
  const start = hybridSource.indexOf('    function renderOwnedStyles()');
  const end = hybridSource.indexOf('    // One static shell and stylesheet owner;', start);
  assert(start >= 0 && end > start, 'style-owner functions should remain a testable boundary');
  vm.createContext(context);
  vm.runInContext(hybridSource.slice(start, end), context);
  return { context, nodes, writes: () => writes, classes };
}

test('Hybrid is the only owner for every canonical visual region while enabled', () => {
  const f = hybridStyleFixture();
  const c = f.context;
  c.style = {};
  for (const region of ['theme', 'header', 'navigation', 'cards', 'details', 'overlays', 'settings']) {
    assert.equal(c.ownsPresentation(region), true, region);
  }
  assert.equal(c.ownsPresentation('player'), false, 'native player remains outside theme ownership');
  f.classes.delete('stremio-hybrid');
  assert.equal(c.ownsPresentation('header'), false, 'native fallback reclaims the page when Hybrid is off');
});

test('registered adapter CSS shares one stable Hybrid stylesheet and ignores duplicate updates', () => {
  const f = hybridStyleFixture();
  const c = f.context;
  assert.equal(c.registerStyles('ydesign-cards', '.ydesign-card{display:block}'), true);
  assert.equal(f.nodes.length, 1);
  assert.match(f.nodes[0].textContent, /canonical shell/);
  assert.match(f.nodes[0].textContent, /ydesign-card/);
  const writes = f.writes();
  c.registerStyles('ydesign-cards', '.ydesign-card{display:block}');
  assert.equal(f.writes(), writes, 'identical CSS does not trigger a stylesheet rewrite');
  c.registerStyles('ydesign-font', 'body{font-family:fixture}');
  assert.equal(f.nodes.length, 1, 'second module does not insert a competing style element');
  assert.match(f.nodes[0].textContent, /font-family:fixture/);
  c.unregisterStyles('ydesign-font');
  assert.equal(f.nodes.length, 1);
  assert.doesNotMatch(f.nodes[0].textContent, /font-family:fixture/);
});

test('unchanged Hybrid readiness calls reuse combined CSS and recompute after owner changes',()=>{
  const f=hybridStyleFixture(),c=f.context;
  c.registerStyles('ydesign-cards','.ydesign-card{display:block}');
  const composed=c.bootStats.styleCompositions,writes=f.writes();
  for(let i=0;i<20;i++)c.renderOwnedStyles();
  assert.equal(c.bootStats.styleCompositions,composed,'unchanged apply/readiness does not concatenate adapter modules again');
  assert.equal(c.bootStats.styleCacheHits,20);
  assert.equal(f.writes(),writes,'cache hits do not rewrite the owner stylesheet');
  c.registerStyles('ydesign-font','body{font-family:fixture}');
  assert.equal(c.bootStats.styleCompositions,composed+1);
  f.classes.delete('stremio-hybrid');c.renderOwnedStyles();
  assert.equal(c.bootStats.styleCompositions,composed+2,'native fallback composes feature-only CSS once');
  f.classes.add('stremio-hybrid');c.renderOwnedStyles();
  assert.equal(c.bootStats.styleCompositions,composed+3,'re-enabled theme recomposes the canonical shell');
});

test('Hybrid disabled retains only registered feature CSS and removes the shell-only sheet', () => {
  const f = hybridStyleFixture(false);
  const c = f.context;
  c.registerStyles('ydesign-cards', '.ydesign-card{display:block}');
  assert.equal(f.nodes.length, 1);
  assert.doesNotMatch(f.nodes[0].textContent, /canonical shell/);
  c.unregisterStyles('ydesign-cards');
  assert.equal(f.nodes.length, 0);
});

test('Interface+ legacy theme yields while Hybrid owns theme and restores on native fallback', () => {
  assert.match(interfaceSource, /setThemeOwner:setHybridThemeOwner/);
  assert.match(interfaceSource, /if \(hybridOwnsTheme \|\| hybrid && hybrid\.ownsPresentation && hybrid\.ownsPresentation\('theme'\)\) return;/);
  const start = interfaceSource.indexOf('    function setHybridThemeOwner(on) {');
  const end = interfaceSource.indexOf('\n    var STATUS_BASE_SEL', start);
  assert(start >= 0 && end > start);
  const style = { removed: false, remove() { this.removed = true; } };
  const c = { hybridOwnsTheme: false, currentInterfaceTheme: 'netflix', document: { getElementById: () => style }, applyTheme(value) { c.applied = value; } };
  vm.createContext(c);
  vm.runInContext(interfaceSource.slice(start, end), c);
  c.setHybridThemeOwner(true);
  assert.equal(style.removed, true);
  assert.equal(c.applied, undefined);
  c.setHybridThemeOwner(false);
  assert.equal(c.applied, 'netflix', 'saved native theme returns when canonical Hybrid is disabled');
});

test('YDesign routes its main and font styles through Hybrid and keeps a standalone fallback', () => {
  const start = designSource.indexOf('    function publishStyle(owner, id, text) {');
  const end = designSource.indexOf('\n    function cssFont', start);
  assert(start >= 0 && end > start);
  let appended = 0, removed = 0, registered = [], unregistered = [];
  let hasExisting = true;
  const existing = { parentNode: { removeChild() { removed++; hasExisting = false; } } };
  const doc = { getElementById: () => hasExisting ? existing : null, head: { appendChild() { appended++; hasExisting = true; } }, createElement: () => ({ setAttribute() {}, id: '', textContent: '' }) };
  const hybrid = { registerStyles: (name, css) => registered.push([name, css]), unregisterStyles: name => unregistered.push(name) };
  const c = { window: { StremioHybrid: hybrid }, document: doc };
  vm.createContext(c); vm.runInContext(designSource.slice(start, end), c);
  c.publishStyle('ydesign-cards', 'ydesign-style-block', '.card{}');
  c.publishStyle('ydesign-font', 'ydesign-font-css', '.font{}');
  c.publishStyle('ydesign-font', 'ydesign-font-css', '');
  assert.deepEqual(registered, [['ydesign-cards', '.card{}'], ['ydesign-font', '.font{}']]);
  assert.deepEqual(unregistered, ['ydesign-font']);
  assert.equal(appended, 0);
  assert.equal(removed, 1);

  c.window.StremioHybrid = null;
  c.publishStyle('ydesign-cards', 'ydesign-style-block', '.card{}');
  assert.equal(appended, 1, 'YDesign still provides standalone styles without Hybrid');
});

test('Cardify+ transfers its presentation CSS into the Hybrid owner and Hybrid adopts it when loaded later', () => {
  assert.match(cardifySource, /<style id=\\"cardify-plus-styles\\">/);
  assert.match(cardifySource, /hybridPresentation\.registerStyles\("cardify-plus", cardifyStyle\.textContent\)/);
  const start = hybridSource.indexOf('    function adoptAdapterStyles() {');
  const end = hybridSource.indexOf('\n    function ownsPresentation', start);
  const context = { document: { getElementById(id) { return id === 'cardify-plus-styles' ? node : null; } }, styleIdsByOwner: { 'ydesign-cards':'ydesign-style-block', 'ydesign-font':'ydesign-font-css', 'cardify-plus':'cardify-plus-styles' }, registerStyles(name, css) { registered.push([name, css]); } };
  const registered = [];
  let removed = 0;
  const node = { textContent: '.cardify{display:flex}', parentNode: { removeChild() { removed++; } } };
  vm.createContext(context);
  vm.runInContext(hybridSource.slice(start, end), context);
  context.adoptAdapterStyles();
  assert.deepEqual(registered, [['cardify-plus', '.cardify{display:flex}']]);
  assert.equal(removed, 1);
});
