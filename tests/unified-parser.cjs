const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const script = fs.readFileSync(path.join(__dirname, '../providers/unified-parser.js'), 'utf8');

function load(response) {
  const calls = [], requested = [];
  let legacy = 0, currentRequest;
  const stored = { unified_parser_url: 'https://parser.example.com', unified_parser_language: 'all' };
  const Parser = { get() { legacy++; }, clear() {} };
  function Reguest() {
    this.timeout = () => {};
    this.clear = () => { this.cleared = true; };
    this.native = (url, onOk, onFail) => {
      calls.push(url);
      currentRequest = { onOk, onFail };
      if (response !== undefined) onOk(response);
    };
  }
  const Lampa = {
    Parser, Reguest,
    Storage: { get: (key, fallback) => Object.hasOwn(stored, key) ? stored[key] : fallback, cache: () => [] },
    Utils: { hash: (value) => 'hash-' + value },
    SettingsApi: { addParam: () => {} }
  };
  const context = { window: { Lampa }, Lampa, console, setTimeout, clearTimeout, Date };
  vm.runInNewContext(script, context);
  return { Lampa, calls, requested, get legacy() { return legacy; }, request: () => currentRequest, context };
}

test('passes TMDB ID and maps Ukrainian torrent rows to native schema without legacy call', () => {
  const app = load({ results: [{
    source: 'Toloka', title: 'Монолог травниці', magnet: 'magnet:?xt=urn:btih:' + 'a'.repeat(40),
    size: 1048576, seeds: 9, peers: 2, type: 'anime'
  }], partial: false });
  let received;
  app.Lampa.Parser.get({
    search: 'The Apothecary Diaries',
    movie: { id: 220542, source: 'tmdb', original_name: '薬屋のひとりごと', original_language: 'ja', genres: [{id: 16}] }
  }, (body) => { received = body; }, (err) => { throw new Error(err); });
  assert.equal(app.calls.length, 1);
  const url = new URL(app.calls[0]);
  assert.equal(url.pathname, '/api/search/unified');
  assert.equal(url.searchParams.get('tmdb_id'), '220542');
  assert.equal(url.searchParams.get('tmdb_type'), 'tv');
  assert.equal(url.searchParams.get('type'), 'anime');
  assert.equal(received.Results.length, 1);
  assert.equal(received.Results[0].Tracker, 'Toloka');
  assert.equal(received.Results[0].Seeders, 9);
  assert.equal(received.Results[0].Size, 1048576);
  assert.equal(app.legacy, 0);
});

test('does not interpret page_url as playable torrent link', () => {
  const app = load({ results: [{title:'Only metadata',source:'Toloka',page_url:'https://example.com/topic'}] });
  let received;
  app.Lampa.Parser.get({search:'Test',movie:{}}, (r) => {received=r;}, () => {});
  assert.equal(received.Results.length, 0);
});

test('missing endpoint fails closed without legacy parser fallback', () => {
  const app = load();
  app.context.window.LAMPA_UNIFIED_PARSER_URL = 'http://127.0.0.1:8765';
  app.Lampa.Storage.get = (key, fallback) => key === 'unified_parser_url' ? '' : fallback;
  let error;
  app.Lampa.Parser.get({search:'The Order'}, () => {}, (e) => {error = e;});
  assert.match(error, /HTTPS/);
  assert.equal(app.legacy, 0);
  assert.equal(app.calls.length, 0);
});
