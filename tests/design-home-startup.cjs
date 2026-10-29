'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./helpers/ydesign-fixture.cjs');

test('YDesign cached Home rows compute without a phantom request queue and retain eligible progress', () => {
  const f = fixture({ history: [{ id: 11, media_type: 'movie', title: 'Fixture movie' }], percent: 25 });
  const rows = f.api.computeRows();
  assert.deepEqual(Array.from(rows.up), []);
  assert.deepEqual(Array.from(rows.cont, card => card.id), [11]);
});

test('YDesign does not start optional TV metadata requests until Home has visible focus', async () => {
  const options = {
    history: [{ id: 1001, media_type: 'tv', name: 'Fixture series' }],
    focus: { getClientRects: () => [] },
    controller: { name: 'items_line' },
    ajax() {}
  };
  const f = fixture(options);
  f.api.scheduleWarmRows(0, false);
  f.flush(0);
  assert.equal(f.jobs.length, 0);
  options.focus = { getClientRects: () => [{ width: 1, height: 1 }] };
  f.flush(250);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(f.jobs.length, 1);
});

function usableFixtureOptions(history, extra = {}) {
  const focus = { getClientRects: () => [{ width: 2, height: 2 }] };
  const component = {
    items: [], active: 0, fragment: null, emitted: [], appended: 0,
    emit(event, data) { this.emitted.push(event); if (event === 'createAndAppend') { this.items.push({ data, items: [], active: 0 }); if (this.fragment) this.fragment.appendChild({}); } },
    scroll: { append(fragment) { component.appended += fragment.children.length; } }
  };
  return Object.assign({ history, focus, controller: { name: 'items_line' }, activity: { component: 'main', activity: { component } }, ajax() {} }, extra);
}

test('YDesign stops bounded readiness checks without starting pre-focus requests', () => {
  const options = {
    history: [{ id: 1501, media_type: 'tv', name: 'Slow Home series' }],
    focus: { getClientRects: () => [] },
    controller: null,
    ajax() {}
  };
  const f = fixture(options);
  f.timers.clear();
  f.api.scheduleWarmRows(0, true);
  for (let i = 0; i < 22; i++) f.flush(i === 0 ? 0 : 250);
  assert.equal(f.jobs.length, 0);
  assert.equal(f.timers.size, 0, 'readiness polling is bounded and stops cleanly');
});

test('YDesign warms no more than four optional TV metadata requests at a time and drains failures', async () => {
  const history = Array.from({ length: 24 }, (_, i) => ({ id: 2000 + i, media_type: 'tv', name: 'Fixture ' + i }));
  const f = fixture(usableFixtureOptions(history));
  f.api.warmRows(false);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(f.jobs.length, 4, 'initial work is bounded to four network requests');
  for (let i = 0; i < 24; i++) {
    const request = f.jobs[i];
    assert.ok(request, 'the queue continues after each failure');
    request.error();
    await Promise.resolve();
    await Promise.resolve();
  }
  assert.equal(f.jobs.length, 24);
});

test('empty candidate discovery has no cooldown and Favorite read event resumes metadata queue', async () => {
  const options = usableFixtureOptions([]), f = fixture(options);
  f.api.installWarmRowsEvents(); f.api.installWarmRowsEvents();
  assert.equal(f.listeners['lampa:activity'].length, 1, 'native activity listener is installed once');
  assert.equal(f.listeners['favorite:read'].length, 1, 'native Favorite read listener is installed once');
  f.flush(0);
  assert.equal(f.api.RowsStore.lastSuccess, 0);
  assert.equal(f.api.RowsStore.outcome, 'empty-candidates');
  assert.equal(f.jobs.length, 0);
  options.history.push({ id: 3101, media_type: 'tv', name: 'Late Favorite' });
  f.listeners['favorite:read'][0](); f.flush(0); await Promise.resolve(); await Promise.resolve();
  assert.equal(f.jobs.length, 1, 'a later native Favorites read can start optional work');
});

test('Home readiness retries stop boundedly and a later focus/controller event resumes them', async () => {
  const options = usableFixtureOptions([{ id: 3201, media_type: 'tv', name: 'Late Focus' }]);
  options.focus = { getClientRects: () => [] }; options.controller = null;
  const f = fixture(options);
  f.api.installWarmRowsEvents(); f.listeners['lampa:activity'][0]({ type: 'start', component: 'main' }); f.flush(0);
  for (let i = 0; i < 9; i++) f.flush(250);
  assert.equal(f.jobs.length, 0); assert.equal(f.api.RowsStore.outcome, 'not-ready');
  assert.equal(f.api.WarmRowsStore.timer, null, 'the fallback readiness window is bounded');
  options.focus = { getClientRects: () => [{ width: 2, height: 2 }] }; options.controller = { name: 'items_line' };
  f.listeners['controller:toggle'][0](); f.flush(0); await Promise.resolve(); await Promise.resolve();
  assert.equal(f.jobs.length, 1, 'actual focus/controller readiness event resumes the pending Home work');
});

test('successful TV metadata is appended to the existing Home row without replacing Home', async () => {
  const future = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const options = usableFixtureOptions([{ id: 3301, media_type: 'tv', name: 'New series' }]);
  options.storage = { ydesign_slogan_lang: 'uk' };
  let replacements = 0;
  options.activity.activity.replace = () => replacements++;
  const f = fixture(options); f.api.warmRows(false); await Promise.resolve(); await Promise.resolve();
  assert.equal(f.jobs.length, 1);
  f.jobs[0].success({ id: 3301, name: 'New series', number_of_seasons: 1, number_of_episodes: 2, seasons: [{ season_number: 1, episode_count: 2 }], next_episode_to_air: { season_number: 1, episode_number: 2, air_date: future }, images: { posters: [] } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.api.RowsStore.outcome, 'success');
  f.flush(120);
  const home = options.activity.activity.component;
  assert.equal(home.items.length, 1); assert.equal(home.items[0].data.home_row_id, 'ydesign_week');
  assert.equal(home.items[0].data.results[0].id, 3301);
  assert.equal(home.appended, 1); assert.equal(replacements, 0, 'targeted row append never invokes Activity.replace');
  assert.equal(options.focus.getClientRects().length, 1, 'row update does not steal Home focus');
  assert.equal(options.activity.component, 'main');
});

test('failed metadata request gets short bounded retry, not the 20 minute success cooldown', async () => {
  const f = fixture(usableFixtureOptions([{ id: 3401, media_type: 'tv', name: 'Retry series' }]));
  const now = Date.now(); f.api.warmRows(false); await Promise.resolve(); await Promise.resolve();
  assert.equal(f.jobs.length, 1); f.jobs[0].error(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.api.RowsStore.lastSuccess, 0);
  assert.equal(f.api.RowsStore.outcome, 'failed');
  assert.ok(f.api.RowsStore.retryAt >= now + 29900 && f.api.RowsStore.retryAt <= now + 30100, 'first failure backs off for 30 seconds');
  assert.ok(f.api.RowsStore.retryAt < now + 20 * 60 * 1000);
  f.context.Date = class extends Date { static now() { return now + 31000; } };
  f.flush(30000); for (const timer of [...f.timers.values()]) if (timer.ms < 1000) f.flush(timer.ms);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.jobs.length, 2, 'the scheduled retry runs after its short backoff');
});

test('metadata completed after leaving Home updates cache but cannot repaint another activity', async () => {
  const options = usableFixtureOptions([{ id: 3451, media_type: 'tv', name: 'Stale Home series' }]);
  options.storage = { ydesign_slogan_lang: 'uk' };
  const f = fixture(options); f.api.warmRows(false); await Promise.resolve(); await Promise.resolve();
  assert.equal(f.jobs.length, 1);
  const home = options.activity.activity.component;
  options.activity.component = 'full';
  f.jobs[0].success({ id: 3451, name: 'Stale Home series', countries: [], number_of_seasons: 1, seasons: [{ season_number: 1, episode_count: 2 }], next_episode_to_air: { season_number: 1, episode_number: 2, air_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10) }, images: { posters: [] } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.api.RowsStore.outcome, 'stale-session');
  assert.equal(home.items.length, 0, 'stale completion does not inject into a non-Home activity');
});

test('successful empty optional row refresh records success cooldown and does not duplicate refreshes', async () => {
  const f = fixture(usableFixtureOptions([{ id: 3501, media_type: 'tv', name: 'Cached series' }]));
  f.api.ApiCache.set(f.api.extCacheKey(3501, 'tv'), { fetched: Date.now(), next_ep: null, last_ep: null, title_uk: 'Cached series' });
  f.api.warmRows(false);
  assert.equal(f.jobs.length, 0); assert.equal(f.api.RowsStore.outcome, 'fresh-cache');
  assert.ok(f.api.RowsStore.lastSuccess > 0);
  f.api.warmRows(false); assert.equal(f.jobs.length, 0);
});
