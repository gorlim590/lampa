'use strict';

const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const source = fs.readFileSync(__dirname + '/../trakt/trakt.js', 'utf8');

function productionFunction(name, nextName) {
  const start = source.indexOf('  function ' + name + '(');
  const end = source.indexOf('  function ' + nextName + '(', start + 1);
  assert(start >= 0 && end > start, 'production helper ' + name + ' exists');
  return source.slice(start, end);
}

function setup() {
  const writes = [];
  let clock = 1_000_000;
  class TestDate extends Date { static now() { return clock; } }
  const context = vm.createContext({
    Array, Object, Number, String, Date: TestDate, Math, isFinite, parseInt,
    playbackIdentityGeneration: 7,
    externalPlaylistReport: null,
    cloudInjectInProgress: false,
    config: { minProgress: 90 },
    Lampa: { Storage: { get: () => 'account-a', field: name => name === 'trakt_min_progress' ? 90 : true } },
    getContentType$2: media => media && (media.method === 'tv' || media.media_type === 'tv' || media.type === 'tv' || media.number_of_seasons ? 'show' : 'movie'),
    extractSeasonEpisode: media => ({
      season: media.season_number != null ? media.season_number : media.season,
      episode: media.episode_number != null ? media.episode_number : media.episode
    }),
    verifiedShowEpisode: media => {
      if (!media || media.method !== 'tv' || !Number.isInteger(Number(media.id)) || Number(media.id) < 1 ||
          !Number.isInteger(Number(media.season_number)) || Number(media.season_number) < 0 ||
          !Number.isInteger(Number(media.episode_number)) || Number(media.episode_number) < 1) return null;
      return { id: String(media.id), season: Number(media.season_number), episode: Number(media.episode_number) };
    },
    getCompletionKey: media => media && media.id && Number.isInteger(media.season_number) && Number.isInteger(media.episode_number)
      ? `episode:tmdb:${media.id}:S${media.season_number}:E${media.episode_number}` : '',
    markFinishIntent: key => writes.push({ type: 'intent', key }),
    finish: media => { writes.push({ type: 'finish', media }); return Promise.resolve({ ok: true }); },
    slog: () => {}
  });
  vm.runInContext(productionFunction('buildExternalPlaylistReport', 'handleExternalPlaylistTimelineUpdate') +
    productionFunction('handleExternalPlaylistTimelineUpdate', 'handleJustPlusRawReport') +
    productionFunction('handleJustPlusRawReport', 'externalReportMatchesPlayerStart'), context);
  return { context, writes, advanceTime: ms => { clock += ms; } };
}

const show = { id: 1396, method: 'tv', media_type: 'tv', name: 'The Walking Dead', number_of_seasons: 11 };
async function flushPromises() { for (let i = 0; i < 8; i++) await Promise.resolve(); }

test('Just+ playlist report maps native Timeline hashes to exact season and episode identities', () => {
  const { context } = setup();
  const report = context.buildExternalPlaylistReport(show, 'episode-h2', [
    { url: 'same torrent', season: 2, episode: 2, timeline: { hash: 'episode-h2', time: 120, duration: 1800, percent: 6 } },
    { url: 'same torrent', season: 2, episode: 3, timeline: { hash: 'episode-h3', time: 30, duration: 1800, percent: 1 } }
  ], 'account-a', 7);
  assert.deepEqual({
    hashes: Object.keys(report.entries).sort(),
    e2: report.entries['episode-h2'].identity,
    e3: report.entries['episode-h3'].identity,
    token: report.token,
    generation: report.identityGeneration
  }, {
    hashes: ['episode-h2', 'episode-h3'],
    e2: { id: '1396', season: 2, episode: 2 },
    e3: { id: '1396', season: 2, episode: 3 },
    token: 'account-a',
    generation: 7
  });
});

test('confirmed external playlist reports finalize each exact episode once after the player returns', async () => {
  const { context, writes } = setup();
  const report = context.buildExternalPlaylistReport(show, 'e2', [
    { url: 'pack', season: 1, episode: 2, timeline: { hash: 'e2', time: 200, duration: 1800, percent: 11 } },
    { url: 'pack', season: 1, episode: 3, timeline: { hash: 'e3', time: 0, duration: 1800, percent: 0 } }
  ], 'account-a', 7);
  context.externalPlaylistReport = report;

  assert.equal(context.handleExternalPlaylistTimelineUpdate({ data: { hash: 'e2', road: { time: 1710, duration: 1800, percent: 95 } } }, report), true);
  assert.equal(context.handleExternalPlaylistTimelineUpdate({ data: { hash: 'e2', road: { time: 1710, duration: 1800, percent: 95 } } }, report), true, 'repeated full snapshots are accepted but do not duplicate a pending write');
  assert.equal(context.handleExternalPlaylistTimelineUpdate({ data: { hash: 'e3', road: { time: 1656, duration: 1800, percent: 92 } } }, report), true);
  await flushPromises();
  assert.deepEqual(writes.filter(x => x.type === 'finish').map(x => [x.media.season_number, x.media.episode_number, x.media.hash]), [[1, 2, 'e2'], [1, 3, 'e3']]);
});

test('below-threshold external progress is not written, but a later confirmed advance can qualify', async () => {
  const { context, writes } = setup();
  const report = context.buildExternalPlaylistReport(show, 'e2', [
    { season: 1, episode: 2, timeline: { hash: 'e2', time: 100, duration: 1800, percent: 5 } }
  ], 'account-a', 7);
  context.externalPlaylistReport = report;
  assert.equal(context.handleExternalPlaylistTimelineUpdate({ data: { hash: 'e2', road: { time: 1500, duration: 1800, percent: 83 } } }, report), false);
  assert.equal(context.handleExternalPlaylistTimelineUpdate({ data: { hash: 'e2', road: { time: 1620, duration: 1800, percent: 90 } } }, report), true);
  await flushPromises();
  assert.equal(writes.filter(x => x.type === 'finish').length, 1);
});

test('external percent without duration cannot pass the watched threshold', () => {
  const { context, writes } = setup();
  const report = context.buildExternalPlaylistReport(show, 'e2', [
    { season: 1, episode: 2, timeline: { hash: 'e2', time: 0, duration: 0, percent: 0 } }
  ], 'account-a', 7);
  context.externalPlaylistReport = report;
  assert.equal(context.handleExternalPlaylistTimelineUpdate({ data: { hash: 'e2', road: { time: 0, duration: 0, percent: 100 } } }, report), false);
  assert.equal(writes.filter(x => x.type === 'finish').length, 0);
});

test('ambiguous shared Timeline hash, missing S/E, and stale account generation fail closed', () => {
  const { context, writes } = setup();
  const ambiguous = context.buildExternalPlaylistReport(show, 'same', [
    { season: 1, episode: 2, timeline: { hash: 'same', time: 0, percent: 0 } },
    { season: 1, episode: 3, timeline: { hash: 'same', time: 0, percent: 0 } },
    { title: 'no verified coordinates', timeline: { hash: 'unknown', time: 0, percent: 0 } }
  ], 'account-a', 7);
  context.externalPlaylistReport = ambiguous;
  assert.equal(ambiguous.entries.same.ambiguous, true);
  assert.equal(ambiguous.entries.unknown, undefined);
  assert.equal(context.handleExternalPlaylistTimelineUpdate({ data: { hash: 'same', road: { time: 1700, duration: 1800, percent: 95 } } }, ambiguous), false);
  assert.equal(context.handleExternalPlaylistTimelineUpdate({ data: { hash: 'same', road: { time: 1700, duration: 1800, percent: 95 } } }, { ...ambiguous, token: 'account-b' }), false);
  assert.equal(context.handleExternalPlaylistTimelineUpdate({ data: { hash: 'same', road: { time: 1700, duration: 1800, percent: 95 } } }, { ...ambiguous, identityGeneration: 6 }), false);
  assert.equal(writes.filter(x => x.type === 'finish').length, 0);
});

test('external report remains valid after a measured 45-minute episode and two hours of session time', async () => {
  const { context, writes, advanceTime } = setup();
  assert.equal(context.buildExternalPlaylistReport({ id: 7, method: 'movie' }, 'h', [{ season: 1, episode: 1, timeline: { hash: 'h' } }], 'account-a', 7), null);
  const report = context.buildExternalPlaylistReport(show, 'e1', [
    { season: 1, episode: 1, timeline: { hash: 'e1', time: 0, duration: 2700 } },
    { season: 1, episode: 2, timeline: { hash: 'e2', time: 0, duration: 2700 } }
  ], 'account-a', 7);
  context.externalPlaylistReport = report;
  advanceTime(45 * 60 * 1000);
  assert.equal(context.handleExternalPlaylistTimelineUpdate({ data: { hash: 'e1', road: { time: 2430, duration: 2700 } } }, report), true);
  await flushPromises();
  advanceTime(2 * 60 * 60 * 1000);
  assert.equal(context.handleExternalPlaylistTimelineUpdate({ data: { hash: 'e2', road: { time: 1620, duration: 2700 } } }, report), false);
  assert.equal(context.handleExternalPlaylistTimelineUpdate({ data: { hash: 'e2', road: { time: 2430, duration: 2700 } } }, report), true, 'later playlist item remains eligible after a two-hour session');
  await flushPromises();
  assert.deepEqual(writes.filter(x => x.type === 'finish').map(x => x.media.episode_number), [1, 2]);
  const replacement = context.buildExternalPlaylistReport(show, 'e3', [{ season: 1, episode: 3, timeline: { hash: 'e3' } }], 'account-a', 7);
  context.externalPlaylistReport = replacement;
  assert.equal(context.handleExternalPlaylistTimelineUpdate({ data: { hash: 'e1', road: { time: 2600, duration: 2700 } } }, report), false, 'new handoff rejects late old snapshot');
});

test('failed history write can retry if the handler receives the repeated measured snapshot', async () => {
  const { context, writes } = setup();
  const report = context.buildExternalPlaylistReport(show, 'e2', [{ season: 1, episode: 2, timeline: { hash: 'e2' } }], 'account-a', 7);
  context.externalPlaylistReport = report;
  let attempt = 0;
  context.finish = media => { writes.push({ type: 'finish', media }); return Promise.resolve(++attempt === 1 ? { ok: false, status: 503 } : { ok: true }); };
  const snapshot = { data: { hash: 'e2', road: { time: 1710, duration: 1800, percent: 95 } } };
  assert.equal(context.handleExternalPlaylistTimelineUpdate(snapshot, report), true);
  await flushPromises();
  assert.equal(report.entries.e2.completionState, 'retryable');
  assert.equal(context.handleExternalPlaylistTimelineUpdate(snapshot, report), true, 'same position retries a failed write');
  await flushPromises();
  assert.equal(report.entries.e2.completionState, 'confirmed');
  context.handleExternalPlaylistTimelineUpdate(snapshot, report);
  await flushPromises();
  assert.equal(writes.filter(x => x.type === 'finish').length, 2);
});

test('95 percent measured report is supported; Android-normalized 96/99/100 percent markers are not evidence', async () => {
  const { context, writes } = setup();
  const report = context.buildExternalPlaylistReport(show, 'h95', [
    { season: 1, episode: 1, timeline: { hash: 'h95' } },
    { season: 1, episode: 2, timeline: { hash: 'h96' } },
    { season: 1, episode: 3, timeline: { hash: 'h99' } },
    { season: 1, episode: 4, timeline: { hash: 'h100' } }
  ], 'account-a', 7);
  context.externalPlaylistReport = report;
  assert.equal(context.handleExternalPlaylistTimelineUpdate({ data: { hash: 'h95', road: { time: 95, duration: 100, percent: 95 } } }, report), true);
  await flushPromises();
  for (const hash of ['h96', 'h99', 'h100']) {
    assert.equal(context.handleExternalPlaylistTimelineUpdate({ data: { hash, road: { time: 0, duration: 0, percent: 100 } } }, report), false, hash + ' normalized completion is unsupported');
  }
  assert.deepEqual(writes.filter(x => x.type === 'finish').map(x => x.media.episode_number), [1]);
});

test('raw Just+ bridge accepts genuinely measured 90–95 percent visits with exact episode identity', async () => {
  const { context, writes } = setup();
  const report = context.buildExternalPlaylistReport(show, 'e2', [
    { season: 1, episode: 2, timeline: { hash: 'e2', time: 120, duration: 1800 } }
  ], 'account-a', 7);
  context.externalPlaylistReport = report;
  const payload = {
    version: 1, card_id: '1396', end_by: 'user',
    items: [{ index: 0, hash: 'e2', season: 1, episode: 2, position_sec: 1710, duration_sec: 1800, has_visit: true }]
  };
  assert.equal(context.handleJustPlusRawReport(payload, report), true);
  await flushPromises();
  assert.deepEqual(writes.filter(x => x.type === 'finish').map(x => [x.media.season_number, x.media.episode_number]), [[1, 2]]);
});

test('raw Just+ bridge rejects under-threshold, synthetic, unknown-visit and zero-duration snapshots', async () => {
  const { context, writes } = setup();
  const report = context.buildExternalPlaylistReport(show, 'e2', [
    { season: 1, episode: 2, timeline: { hash: 'e2', time: 0, duration: 1800 } }
  ], 'account-a', 7);
  context.externalPlaylistReport = report;
  const item = { index: 0, hash: 'e2', season: 1, episode: 2, position_sec: 1602, duration_sec: 1800, has_visit: true };
  assert.equal(context.handleJustPlusRawReport({ version: 1, card_id: '1396', end_by: 'user', items: [item] }, report), false, '89% is below threshold');
  assert.equal(context.handleJustPlusRawReport({ version: 1, card_id: '1396', end_by: 'user', items: [{ ...item, has_visit: false, position_sec: 1800 }] }, report), false, 'synthetic/unvisited item is not evidence');
  assert.equal(context.handleJustPlusRawReport({ version: 1, card_id: '1396', end_by: 'user', items: [{ ...item, duration_sec: 0, position_sec: 0 }] }, report), false, 'zero duration cannot qualify');
  assert.equal(context.handleJustPlusRawReport({ version: 1, card_id: '1396', end_by: 'user', items: [{ ...item, episode: 3, position_sec: 1800 }] }, report), false, 'wrong episode cannot qualify');
  await flushPromises();
  assert.equal(writes.filter(x => x.type === 'finish').length, 0);
});

test('raw Just+ bridge recovers measured 96–100 percent before Android zero/zero normalization', async () => {
  const { context, writes } = setup();
  const report = context.buildExternalPlaylistReport(show, 'e96', [
    { season: 1, episode: 2, timeline: { hash: 'e96', time: 0, duration: 1800 } },
    { season: 1, episode: 3, timeline: { hash: 'e99', time: 0, duration: 1800 } },
    { season: 1, episode: 4, timeline: { hash: 'e100', time: 0, duration: 1800 } }
  ], 'account-a', 7);
  context.externalPlaylistReport = report;
  const items = [
    { index: 0, hash: 'e96', season: 1, episode: 2, position_sec: 1728, duration_sec: 1800, has_visit: true },
    { index: 1, hash: 'e99', season: 1, episode: 3, position_sec: 1782, duration_sec: 1800, has_visit: true },
    { index: 2, hash: 'e100', season: 1, episode: 4, position_sec: 1800, duration_sec: 1800, has_visit: true }
  ];
  assert.equal(context.handleJustPlusRawReport({ version: 1, card_id: '1396', end_by: 'completion', items }, report), true);
  await flushPromises();
  assert.deepEqual(writes.filter(x => x.type === 'finish').map(x => x.media.episode_number), [2, 3, 4]);
});

test('raw Just+ bridge retries a failed identical full snapshot and rejects stale owner data', async () => {
  const { context, writes } = setup();
  const report = context.buildExternalPlaylistReport(show, 'e2', [
    { season: 1, episode: 2, timeline: { hash: 'e2', time: 0, duration: 1800 } }
  ], 'account-a', 7);
  context.externalPlaylistReport = report;
  let attempt = 0;
  context.finish = media => { writes.push({ type: 'finish', media }); return Promise.resolve(++attempt === 1 ? { ok: false, status: 503 } : { ok: true }); };
  const payload = { version: 1, card_id: '1396', end_by: 'user', items: [{ hash: 'e2', season: 1, episode: 2, position_sec: 1710, duration_sec: 1800, has_visit: true }] };
  assert.equal(context.handleJustPlusRawReport(payload, { ...report, token: 'account-b' }), false);
  assert.equal(context.handleJustPlusRawReport(payload, { ...report, identityGeneration: 6 }), false);
  assert.equal(context.handleJustPlusRawReport({ ...payload, card_id: '999' }, report), false);
  assert.equal(context.handleJustPlusRawReport({ ...payload, card_id: '' }, report), false, 'missing native card identity is rejected');
  assert.equal(context.handleJustPlusRawReport({ ...payload, end_by: 'error' }, report), false);
  assert.equal(context.handleJustPlusRawReport(payload, report), true);
  await flushPromises();
  assert.equal(report.entries.e2.completionState, 'retryable');
  assert.equal(context.handleJustPlusRawReport(payload, report), true);
  await flushPromises();
  assert.equal(report.entries.e2.completionState, 'confirmed');
  assert.equal(writes.filter(x => x.type === 'finish').length, 2);
});

test('production watching lifecycle installs and removes the optional native raw-report event listener', () => {
  assert.match(source, /window\.addEventListener\('lampa:justplus-raw-report', this\._onJustPlusRawReport\)/);
  assert.match(source, /window\.removeEventListener\('lampa:justplus-raw-report', this\._onJustPlusRawReport\)/);
  assert.match(source, /handleJustPlusRawReport\(event && event\.detail, externalPlaylistReport\)/);
});

test('production external handoff captures PlayerPlaylist and timeline listener routes mapped reports', () => {
  assert.match(source, /Lampa\.PlayerPlaylist\s*&&\s*typeof Lampa\.PlayerPlaylist\.get\s*===\s*'function'/);
  assert.match(source, /buildExternalPlaylistReport\([\s\S]{0,220}playerPlaylist/);
  assert.match(source, /handleExternalPlaylistTimelineUpdate\(data, externalPlaylistReport\)/);
  assert.match(source, /externalPlaylistReport\s*=\s*null/);
});

for (const percent of [89, 90, 93, 95, 96, 99, 100]) {
  test('raw measured Android payload at '+percent+'% applies the configured threshold without transferring progress', async () => {
    const { context, writes } = setup();
    const report = context.buildExternalPlaylistReport(show, 'e2', [
      { season: 1, episode: 2, timeline: { hash: 'e2', time: 0, duration: 1000 } },
      { season: 1, episode: 3, timeline: { hash: 'e3', time: 0, duration: 1000 } }
    ], 'account-a', 7);
    context.externalPlaylistReport = report;
    const payload = { version: 1, card_id: '1396', end_by: 'user', items: [
      { index: 0, hash: 'e2', season: 1, episode: 2, position_sec: percent * 10, duration_sec: 1000, has_visit: true },
      { index: 1, hash: 'e3', season: 1, episode: 3, position_sec: 1, duration_sec: 1000, has_visit: true }
    ] };
    context.handleJustPlusRawReport(payload, report);
    context.handleJustPlusRawReport(payload, report);
    await flushPromises();
    assert.deepEqual(writes.filter(x => x.type === 'finish').map(x => x.media.episode_number), percent >= 90 ? [2] : []);
  });
}
