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
  assert.equal(url.searchParams.get('type'), 'all');
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

test('maps live JacRed fields and uses magnet instead of tracker page URL', () => {
  const magnet = 'magnet:?xt=urn:btih:' + 'b'.repeat(40);
  const app = load({results:[{
    title:'Монолог травниці', source:'Toloka',
    magnet, url:'https://toloka.to/t12345',
    page_url:'https://toloka.to/t12345',
    pir:7, voices:['UA studio'], quality:'1080p', size:2300000000,
    createTime:'2026-10-25'
  }]});
  let result;
  app.Lampa.Parser.get({search:'Монолог травниці',movie:{}}, r => {result=r}, e => {throw Error(e)});
  const row = result.Results[0];
  assert.equal(row.Link, magnet);
  assert.equal(row.MagnetUri, magnet);
  assert.equal(row.Peers, 7);
  assert.equal(row.Seeders, null);
  assert.equal(row.Quality, '1080p');
  assert.equal(row.Voices[0], 'UA studio');
});

test('rejects tracker topic pages without a magnet or torrent download', () => {
  const app = load({results:[{
    title:'Topic page only',source:'Toloka',
    url:'https://toloka.to/t12345'
  }]});
  let result;
  app.Lampa.Parser.get({search:'Topic page',movie:{}}, r=>{result=r}, e=>{throw Error(e)});
  assert.equal(result.Results.length, 0);
});

test('does not server-filter movie and dorama releases by type', () => {
  for (const movie of [
    { id: 927, source: 'tmdb', title: 'Gremlins' },
    { name: '100 Days of Deception', original_name: '100 Days of Deception', media_type: 'tv' }
  ]) {
    const app = load({results:[]});
    app.Lampa.Parser.get({search:movie.title || movie.name,movie}, () => {}, e => {throw Error(e)});
    const url = new URL(app.calls[0]);
    assert.equal(url.searchParams.get('type'), 'all');
    assert.equal(url.searchParams.get('q'), movie.title || movie.name);
  }
});

test('retains AniDUB dynamic torrent download endpoint alongside RuTor magnet', () => {
  const direct = 'https://tr.anidub.com/engine/download.php?id=123';
  const magnet = 'magnet:?xt=urn:btih:' + 'c'.repeat(40);
  const app = load({results:[
    {title:'100 дней под прикрытием / 100 Days of Deception',source:'AniDUB',type:'dorama',torrent_url:direct,page_url:'https://tr.anidub.com/topic/123'},
    {title:'100 дней лжи / 100 Days of Deception',source:'RuTor',magnet,type:'unknown'}
  ]});
  const rows = app.context.window.LampaUnifiedParser.toNative({results:[
    {title:'100 дней под прикрытием',source:'AniDUB',torrent_url:direct},
    {title:'100 дней лжи',source:'RuTor',magnet}
  ]}).Results;
  assert.equal(rows.length,2);
  assert.equal(rows[0].Tracker,'AniDUB');
  assert.equal(rows[0].Link,direct);
  assert.equal(rows[1].MagnetUri,magnet);
});

test('rejects spoofed AniDUB dynamic links and foreign tracker topic pages', () => {
  const app = load();
  const rows = app.context.window.LampaUnifiedParser.toNative({results:[
    {title:'Spoof',source:'AniDUB',torrent_url:'https://tr.anidub.com.attacker.example/engine/download.php?id=1'},
    {title:'Wrong host',source:'AniDUB',torrent_url:'https://elsewhere.example/engine/download.php?id=1'},
    {title:'Wrong path',source:'AniDUB',torrent_url:'https://tr.anidub.com/engine/topic.php?id=1'},
    {title:'No trusted source',source:'RuTor',torrent_url:'https://tr.anidub.com/engine/download.php?id=1'}
  ]}).Results;
  assert.equal(rows.length,0);
});
