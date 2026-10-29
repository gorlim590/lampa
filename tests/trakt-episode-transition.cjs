'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const source = fs.readFileSync(__dirname + '/../trakt/trakt.js', 'utf8');

function productionFunction(name, nextMarker) {
  const start = source.indexOf('function ' + name + '(');
  const end = source.indexOf(nextMarker, start);
  assert(start >= 0 && end > start, 'production helper ' + name + ' is present');
  const bodyEnd = source.lastIndexOf('\n  }', end);
  return source.slice(start, bodyEnd + 4);
}

test('production episode completion key never falls back to torrent hash or title', () => {
  const context=vm.createContext({getContentType$1:m=>m.method==='tv'?'show':'movie',verifiedShowEpisode:m=>m.season_number===1&&m.episode_number===2?{id:'1396',season:1,episode:2}:null,Lampa:{Utils:{hash:()=> 'title-hash'}}});
  vm.runInContext(productionFunction('getCompletionKey','\n  /**\n   * Persist/restore cache'),context);
  assert.equal(context.getCompletionKey({id:1396,method:'tv',hash:'transport'}),'');
  assert.equal(context.getCompletionKey({id:1396,method:'tv',season_number:1,episode_number:2}),'episode:tmdb:1396:S1:E2');
});

test('history idempotency is scoped to the authenticated Trakt token', () => {
  const context = vm.createContext({
    completionCache: new Map([['account-a\u0000show:1:2:3', { ts: 1000, token: 'account-a', status: 'finished', sourceKey: 'show:1:2:3' }]]),
    completionScopeKey: (key, token) => String(token || '') + '\u0000' + String(key || ''),
    nowSec: () => 1000, getTTL: () => 3600, slog: () => {}
  });
  vm.runInContext(productionFunction('canFinishOnce', '\n  /**\n   * Update record and persist'), context);
  assert.equal(context.canFinishOnce('show:1:2:3', 'account-a').reason, 'already_finished');
  assert.deepEqual({ ...context.canFinishOnce('show:1:2:3', 'account-b') }, { allow: true, reason: 'no_record' });
  assert.match(source, /check\s*=\s*canFinishOnce\(key,\s*token\)/, 'production finisher passes the current token');
});

test('history writes retry transient failures and concurrent completion events settle once', async () => {
  const runtimeStart = source.indexOf('  function asyncGeneratorStep(');
  const runtimeEnd = source.indexOf('  function _createForOfIteratorHelper(', runtimeStart);
  const generatorStart = source.indexOf('  function _regenerator()');
  const generatorEnd = source.indexOf('  function _typeof(', generatorStart);
  const completionStart = source.indexOf('  function canFinishOnce(');
  const locksStart = source.indexOf('  function withPerKeyLock(_x, _x2)');
  const locksEnd = source.indexOf('  var intentTimers = new Map()', locksStart);
  const completionEnd = locksStart;
  assert(runtimeStart >= 0 && runtimeEnd > runtimeStart && generatorStart >= 0 && generatorEnd > generatorStart &&
    completionStart >= 0 && completionEnd > completionStart && locksStart >= 0 && locksEnd > locksStart,
  'production async/idempotency helpers are present');
  const context = vm.createContext({
    Promise, Map, Date, Math, Object, TypeError,
    completionCache: new Map(), lockQueues: new Map(), completionScopeKey: (key, token) => String(token || '') + '\u0000' + String(key || ''),
    nowSec: () => 1000, getTTL: () => 3600, persistSessionCache: () => {}, slog: () => {},
    sleep: () => Promise.resolve()
  });
  const completion = source.slice(completionStart, completionEnd);
  const locks = source.slice(locksStart, locksEnd);
  vm.runInContext(source.slice(runtimeStart, runtimeEnd) + source.slice(generatorStart, generatorEnd) + completion + locks, context);
  let writes = 0;
  const doFinish = async () => {
    writes++;
    if (writes === 1) throw Object.assign(new Error('temporary network failure'), { status: 503 });
    return { status: 200 };
  };
  const input = { key: 'show:1396:1:2', token: 'fixture-account', doFinish };
  const results = await Promise.all([
    context.finishWithIdempotency(input),
    context.finishWithIdempotency(input)
  ]);
  assert.equal(writes, 2, 'one transient failure retries once; concurrent duplicate adds no write');
  assert.equal(results.filter(result => result && result.ok).length, 1);
  assert.equal(context.completionCache.get('fixture-account\u0000' + input.key).status, 'finished');
});

test('history lock and terminal cache are isolated when A finishes late and B watches the same episode', async () => {
  const runtimeStart = source.indexOf('  function asyncGeneratorStep('), runtimeEnd = source.indexOf('  function _createForOfIteratorHelper(', runtimeStart);
  const generatorStart = source.indexOf('  function _regenerator()'), generatorEnd = source.indexOf('  function _typeof(', generatorStart);
  const completionStart = source.indexOf('  function canFinishOnce('), locksStart = source.indexOf('  function withPerKeyLock(_x, _x2)'), locksEnd = source.indexOf('  var intentTimers = new Map()', locksStart);
  const context = vm.createContext({ Promise, Map, Date, Math, Object, TypeError, completionCache: new Map(), lockQueues: new Map(), completionScopeKey:(k,t)=>t+'\u0000'+k, nowSec:()=>1000, getTTL:()=>3600, persistSessionCache:()=>{}, slog:()=>{}, sleep:()=>Promise.resolve() });
  vm.runInContext(source.slice(runtimeStart,runtimeEnd)+source.slice(generatorStart,generatorEnd)+source.slice(completionStart,locksStart)+source.slice(locksStart,locksEnd),context);
  let resolveA, writes=[];
  const a=context.finishWithIdempotency({key:'episode:trakt:9:S1:E2',token:'account-a',doFinish:()=>new Promise(r=>{resolveA=r;writes.push('a')})});
  await Promise.resolve(); await Promise.resolve();
  const b=context.finishWithIdempotency({key:'episode:trakt:9:S1:E2',token:'account-b',doFinish:()=>{writes.push('b');return Promise.resolve({status:200})}});
  const resultB=await b; assert.equal(resultB.ok,true); resolveA({status:200}); assert.equal((await a).ok,true);
  assert.deepEqual(writes,['a','b']);
  assert.equal(context.canFinishOnce('episode:trakt:9:S1:E2','account-a').reason,'already_finished');
  assert.equal(context.canFinishOnce('episode:trakt:9:S1:E2','account-b').reason,'already_finished');
});

test('verified TV episode identity rejects malformed or ambiguous metadata and keeps S00', () => {
  const start=source.indexOf('  function exactInteger('), end=source.indexOf('  function playbackSessionKey(',start);
  const context=vm.createContext({ Number, String, isFinite, Math, getContentType$2: media => media.method==='tv'?'show':'movie' });
  vm.runInContext(source.slice(start,end),context);
  const base={id:1396,method:'tv'};
  for(const [season,episodeNumber] of [[-1,2],[1.5,2],[1,'2.5'],['x',2],[1,0],[1,NaN],[undefined,2]]) assert.equal(context.verifiedShowEpisode({...base,season_number:season,episode_number:episodeNumber}),null);
  assert.deepEqual({...context.verifiedShowEpisode({...base,season_number:0,episode_number:1})},{id:'1396',season:0,episode:1});
  assert.equal(context.verifiedShowEpisode({id:1396,season_number:1,episode_number:2}),null,'a show identity is required');
});

test('Trakt+ refresh retries after failure and coalesces rapid confirmed writes to the latest episode', async () => {
  const calls = [], deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };
  const pending = deferred(); let attempt = 0;
  const context = vm.createContext({
    Object, Date, Promise, Map, String, clearTimeout, setTimeout: () => 1,
    playbackIdentityGeneration: 0, confirmedShowRefreshes: new Map(),
    Lampa: { Storage: { get: () => 'account-a' } },
    verifiedShowEpisode: media => ({ id: String(media.id), season: 2, episode: media.episode_number }),
    getContentType$1: media => media.method === 'tv' ? 'show' : 'movie',
    window: { TraktPlus: { detailsProgress: (media, force) => { calls.push([media.episode_number, force]); attempt++; return attempt === 1 ? pending.promise : Promise.resolve({ confirmed: true }); } } }
  });
  vm.runInContext(productionFunction('refreshConfirmedShowProgress', '\n  /**\n   * Визначає тип вмісту'), context);
  context.refreshConfirmedShowProgress({ id: 1396, method: 'tv', episode_number: 2 }, 'account-a', 0);
  await Promise.resolve(); await Promise.resolve();
  context.refreshConfirmedShowProgress({ id: 1396, method: 'tv', episode_number: 3 }, 'account-a', 0);
  pending.resolve({ confirmed: true });
  for (let i=0;i<20;i++) await Promise.resolve();
  assert.deepEqual(calls, [[2, true], [3, true]], 'a later confirmed episode is refreshed after the earlier in-flight read');
  context.refreshConfirmedShowProgress({ id: 1396, method: 'tv', episode_number: 3 }, 'account-a', 0);
  await Promise.resolve();
  assert.equal(calls.length, 2, 'successful reads are cooldown limited');
  context.refreshConfirmedShowProgress({ id: 42, method: 'movie' }, 'account-a', 0);
  assert.equal(calls.length, 2, 'movie history does not invoke show-progress refresh');
});

test('a failed refresh can be retried immediately by the next confirmed history write', async () => {
  let calls=0;const context=vm.createContext({Object,Date,Promise,Map,String,clearTimeout,setTimeout:()=>1,playbackIdentityGeneration:0,confirmedShowRefreshes:new Map(),Lampa:{Storage:{get:()=> 'account-a'}},verifiedShowEpisode:m=>({id:String(m.id),season:1,episode:1}),getContentType$1:()=> 'show',window:{TraktPlus:{detailsProgress:()=>{calls++;return Promise.resolve({confirmed:calls>1})}}}});
  vm.runInContext(productionFunction('refreshConfirmedShowProgress','\n  /**\n   * Визначає тип вмісту'),context);
  const media={id:88,method:'tv'};context.refreshConfirmedShowProgress(media,'account-a',0);for(let i=0;i<10;i++)await Promise.resolve();
  context.refreshConfirmedShowProgress(media,'account-a',0);for(let i=0;i<10;i++)await Promise.resolve();
  assert.equal(calls,2,'failed refresh does not establish the 30-second success cooldown');
});

test('late history callback cannot submit or refresh under a switched Trakt account', async () => {
  const start=source.indexOf('  function addHistoryForOwner('),end=source.indexOf('\n  function getContentType$1',start);
  const calls=[];let token='account-a',generation=0;
  const context=vm.createContext({Lampa:{Storage:{get:()=>token}},playbackIdentityGeneration:0,api$1:{addToHistory:body=>{calls.push(body);return Promise.resolve({status:200})}}});
  vm.runInContext(source.slice(start,end),context);
  token='account-b';generation=1;context.playbackIdentityGeneration=1;
  await assert.rejects(context.addHistoryForOwner('account-a',0,{method:'show'}));
  assert.deepEqual(calls,[]);
});

test('failed refresh does not start cooldown and account changes isolate refresh work', async () => {
  const calls = []; let token = 'account-a', generation = 0;
  const context = vm.createContext({ Object, Date, Promise, Map, String, clearTimeout, setTimeout: () => 1,
    playbackIdentityGeneration: 0, confirmedShowRefreshes: new Map(), Lampa: { Storage: { get: () => token } },
    verifiedShowEpisode: media => ({ id: String(media.id), season: 1, episode: 1 }),
    getContentType$1: () => 'show',
    window: { TraktPlus: { detailsProgress: (media) => { calls.push(token); return Promise.resolve({ confirmed: token !== 'account-a' }); } } }
  });
  vm.runInContext(productionFunction('refreshConfirmedShowProgress', '\n  /**\n   * Визначає тип вмісту'), context);
  context.refreshConfirmedShowProgress({ id: 77, method: 'tv' }, token, generation);
  for(let i=0;i<10;i++) await Promise.resolve();
  token='account-b'; generation=1; context.playbackIdentityGeneration=1;
  context.refreshConfirmedShowProgress({ id: 77, method: 'tv' }, token, generation);
  for(let i=0;i<10;i++) await Promise.resolve();
  assert.deepEqual(calls, ['account-a','account-b']);
});
