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
  const f = fixture({ history, ajax() {} });
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
