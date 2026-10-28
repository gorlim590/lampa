'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(__dirname + '/../trakt/trakt.js', 'utf8');
function fixture() {
  const calls = [];
  const start = source.indexOf('  var activePlaybackSession = null;');
  const end = source.indexOf('  /**\n   * Simple in-memory idempotency cache', start);
  assert(start >= 0 && end > start, 'production scrobbler session block is present');
  const context = {
    Promise, Math, Number,
    throttleState: { lastSendTime: 0, lastSentPercent: 0, currentMedia: null, timerId: null },
    getContentType$2: media => media.method === 'tv' || media.original_name ? 'show' : 'movie',
    performScrobble: (action, media, progress) => { calls.push({ action, media: { ...media }, progress }); return Promise.resolve({ ok: true }); },
    updateThrottleState: percent => { context.throttleState.lastSentPercent = percent; }
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);
  return { api: context.scrobbler, calls, context };
}
const movie = (id = 438631) => ({ id, title: 'The Others', method: 'movie' });
const episode = (number, season = 1) => ({ id: 1396, name: 'Synthetic Series', original_name: 'Synthetic Series', method: 'tv', season_number: season, episode_number: number });

test('confirmed movie playback has one start and one idempotent stop with actual progress', async () => {
  const f = fixture(), media = movie();
  await Promise.all([f.api.scrobbleStart(media, 0), f.api.scrobbleStart(media, 0)]);
  assert.deepEqual(f.calls.map(call => call.action), ['start']);
  f.api.updatePlaybackSession(media, 3.4);
  await f.api.scrobbleStop(media, 3.4);
  await f.api.scrobbleStop(media, 3.4);
  assert.deepEqual(f.calls.map(call => call.action), ['start', 'stop']);
  assert.equal(f.calls[1].progress, 3.4);
  assert.equal(f.api.getActiveSession(), null);
});

test('episode switch stops S01E02 before starting S01E03 and preserves exact identity', async () => {
  const f = fixture(), second = episode(2), third = episode(3);
  await f.api.scrobbleStart(second, 8);
  await f.api.scrobbleStart(third, 0);
  assert.deepEqual(f.calls.map(call => [call.action, call.media.episode_number]), [['start', 2], ['stop', 2], ['start', 3]]);
  assert.equal(f.api.getActiveSession().key, 'show:1396:1:3');
});

test('a new episode waits for the prior STOP request to settle', async () => {
  const f = fixture(), second = episode(2), third = episode(3);
  let finishStop;
  f.context.performScrobble = (action, media, progress) => {
    f.calls.push({ action, media: { ...media }, progress });
    return action === 'stop' ? new Promise(resolve => { finishStop = resolve; }) : Promise.resolve({ ok: true });
  };
  await f.api.scrobbleStart(second, 10);
  const switching = f.api.scrobbleStart(third, 0);
  await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(f.calls.map(call => call.action), ['start', 'stop']);
  finishStop({ ok: true });
  await switching;
  assert.deepEqual(f.calls.map(call => call.action), ['start', 'stop', 'start']);
  assert.equal(f.calls[2].media.episode_number, 3);
});

test('pause/resume is idempotent and uses Timeline position rather than elapsed wall time', async () => {
  const f = fixture(), media = episode(4);
  await f.api.scrobbleStart(media, 1.1);
  await f.api.scrobblePause(media, 2.7);
  await f.api.scrobblePause(media, 2.7);
  f.api.updatePlaybackSession(media, 11.5);
  await f.api.resumePlaybackSession();
  assert.deepEqual(f.calls.map(call => call.action), ['start', 'pause', 'start']);
  assert.equal(f.calls[1].progress, 2.7);
  assert.equal(f.calls[2].progress, 11.5);
  assert.equal(f.api.getActiveSession().state, 'playing');
});

test('stale stop for another episode cannot stop the current session', async () => {
  const f = fixture(), current = episode(3);
  await f.api.scrobbleStart(current, 12);
  await f.api.scrobbleStop(episode(2), 90);
  assert.equal(f.api.getActiveSession().key, 'show:1396:1:3');
  assert.deepEqual(f.calls.map(call => call.action), ['start']);
});

test('logout/account credential change invalidates queued playback without replay under a new token', async () => {
  const f = fixture();
  const pending = f.api.scrobbleStart(movie(7), 0);
  f.api.clearPlaybackSession();
  await pending;
  assert.equal(f.api.getActiveSession(), null);
  assert.deepEqual(f.calls, []);
});

test('external launch waits for Timeline confirmation; destroy, ended and error close the tracked session', () => {
  const externalStart = source.indexOf('// External hand-off is not proof of playback.');
  const pauseStart = source.indexOf('// Pause/resume detection uses the active session identity', externalStart);
  const externalBlock = source.slice(externalStart, pauseStart);
  assert.match(externalBlock, /pendingExternalPlayback\s*=\s*timeline && timeline\.hash \? \{ media: card, hash: timeline\.hash \} : null/);
  assert.doesNotMatch(externalBlock, /scrobbleStart\(/);
  assert.match(source, /if \(card && \(percent > 0 \|\| Number\(road\.time\) > 0\)\)[\s\S]{0,600}scrobbler\.scrobbleStart\(sessionMedia, percent, !!externalPlayback\)/);
  assert.match(source, /follow\('destroy', routeFinishIntent\);\s*Lampa\.Player\.listener\.follow\('ended', routeFinishIntent\);\s*Lampa\.Player\.listener\.follow\('error', routeFinishIntent\)/);
  assert.match(source, /if \(playback && typeof scrobbler\.scrobbleStop === 'function'\) scrobbler\.scrobbleStop\(playback\.media, currentProgress\)/);
  assert.match(source, /if \(e && e\.hidden && playback && !playback\.external\) scrobbler\.scrobblePause\(playback\.media, playback\.progress\)/);
  assert.match(source, /currentProgress >= minProgress/);
  assert.match(source, /scrobbleQueue\.clear\(\);\s*scrobbler\.clearPlaybackSession\(\)/);
});
