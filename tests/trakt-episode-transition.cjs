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

test('history idempotency is scoped to the authenticated Trakt token', () => {
  const context = vm.createContext({
    completionCache: new Map([['show:1:2:3', { ts: 1000, token: 'account-a', status: 'finished' }]]),
    nowSec: () => 1000, getTTL: () => 3600, slog: () => {}
  });
  vm.runInContext(productionFunction('canFinishOnce', '\n  /**\n   * Update record and persist'), context);
  assert.equal(context.canFinishOnce('show:1:2:3', 'account-a').reason, 'already_finished');
  assert.deepEqual({ ...context.canFinishOnce('show:1:2:3', 'account-b') }, { allow: true, reason: 'account_changed' });
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
    completionCache: new Map(), lockQueues: new Map(),
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
  assert.equal(context.completionCache.get(input.key).status, 'finished');
});

test('Trakt+ progress refresh is requested only after confirmed show history and coalesces per show', async () => {
  const calls = [];
  const context = vm.createContext({
    Object, Date, Promise,
    getContentType$1: media => media.method === 'tv' ? 'show' : 'movie',
    CustomEvent: function (name) { this.type = name; },
    window: { TraktPlus: { detailsProgress: (media, force) => { calls.push([media.id, force]); return Promise.resolve({ confirmed: true }); } }, CustomEvent: function (name) { this.type = name; } },
    document: { dispatchEvent: () => {} },
    lastShowProgressRefresh: Object.create(null)
  });
  vm.runInContext(productionFunction('refreshConfirmedShowProgress', '\n  function _finish()'), context);
  context.refreshConfirmedShowProgress({ id: 1396, method: 'tv' });
  for (let i = 0; i < 10; i++) await Promise.resolve();
  assert.deepEqual(calls, [[1396, true]]);
  context.refreshConfirmedShowProgress({ id: 1396, method: 'tv' });
  await Promise.resolve(); await Promise.resolve();
  assert.equal(calls.length, 1, 'repeat episode completions in the brief cooldown do not add API reads');
  context.refreshConfirmedShowProgress({ id: 42, method: 'movie' });
  assert.equal(calls.length, 1, 'movie history does not invoke show-progress refresh');
});
