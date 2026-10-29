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
    shouldSendProgress: () => false,
    debugEnabled: () => false,
    performScrobble: (action, media, progress) => { calls.push({ action, media: { ...media }, progress }); return Promise.resolve({ ok: true }); },
    updateThrottleState: percent => { context.throttleState.lastSentPercent = percent; context.throttleState.lastSendTime = Date.now(); }
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

function productionMethod(owner, name) {
  const ownerStart = source.indexOf('var ' + owner + ' = {');
  const start = source.indexOf(name + ': function', ownerStart);
  const end = source.indexOf('\n    },\n    /**', start);
  assert(ownerStart >= 0 && start > ownerStart && end > start, 'production ' + owner + '.' + name + ' exists');
  return source.slice(start, end + 6).slice(source.indexOf('function', start) - start);
}

function integrationFixture() {
  const f = fixture();
  f.context.shouldSendProgress = () => f.context.throttleState.lastSendTime === 0;
  let playerPlaylist = [];
  const values = { trakt_enable_watching: true, trakt_token: 'synthetic-token', trakt_min_progress: 90 };
  const player = Object.create(null), timelineHandlers = Object.create(null), globalListeners = Object.create(null), accountListeners = Object.create(null), storageListeners = [], documentListeners = Object.create(null);
  let activityCard = null, activeVideo = null, playerOpened = false, currentCardReadCount = 0;
  const on = map => (name, fn) => { (map[name] || (map[name] = [])).push(fn); };
  const remove = map => (name, fn) => { map[name] = (map[name] || []).filter(item => item !== fn); };
  const storage = {
    field: key => values[key], get: key => values[key], set: (key, value) => { values[key] = value; },
    listener: { follow: (name, fn) => { if (name === 'change') storageListeners.push(fn); }, remove: (name, fn) => { const i = storageListeners.indexOf(fn); if (i >= 0) storageListeners.splice(i, 1); } }
  };
  const Lampa = {
    Storage: storage,
    Activity: { active: () => ({ movie: activityCard, card: activityCard }) },
    Player: { opened: () => playerOpened, listener: { follow: on(player), remove: remove(player) } },
    PlayerPlaylist: { get: () => playerPlaylist },
    PlayerVideo: { video: () => activeVideo },
    Timeline: { listener: { follow: on(timelineHandlers), remove: remove(timelineHandlers) } },
    Listener: { follow: on(globalListeners), remove: remove(globalListeners) },
    Account: { listener: { follow: on(accountListeners), remove: remove(accountListeners) } },
    Utils: { hash: value => String(value) }
  };
  const meta = Object.create(null);
  const markProgressStart = source.indexOf('function markProgressUpdate()');
  const markProgressEnd = source.indexOf('\n  }', markProgressStart) + 4;
  assert(markProgressStart >= 0 && markProgressEnd > markProgressStart, 'production Timeline timestamp helper exists');
  vm.runInContext(source.slice(markProgressStart, markProgressEnd), f.context);
  Object.assign(f.context, {
    Lampa, window: { Lampa, appready: true }, document: {
      addEventListener: on(documentListeners), removeEventListener: remove(documentListeners)
    },
    config: { minProgress: 90 }, cloudInjectInProgress: false,
    getContentType$1: media => media && (media.method === 'tv' || media.method === 'show' || media.original_name || media.first_air_date) ? 'show' : 'movie',
    isInitialized: false,
    isInitialized$1: false,
    pendingExternalPlayback: null, externalPlaylistReport: null, pendingInternalPlayback: null, timelineProgressSamples: {},
    playbackInstanceSequence: 0, playbackIdentityGeneration: 0, currentPlaybackInstance: null, terminalPlaybackInstanceId: null,
    setHashMeta: (hash, value) => { meta[hash] = value; }, getHashMeta: hash => meta[hash] || null,
    extractSeasonEpisode: media => ({ season: media.season_number != null ? media.season_number : media.season, episode: media.episode_number != null ? media.episode_number : media.episode }),
    getContentType$2: media => media && (media.method === 'tv' || media.type === 'tv' ? 'show' : 'movie'),
    verifiedShowEpisode: media => media && media.method === 'tv' && Number.isInteger(media.season_number) && media.season_number >= 0 && Number.isInteger(media.episode_number) && media.episode_number >= 1 ? { id: String(media.id), season: media.season_number, episode: media.episode_number } : null,
    resolveSeasonEpisode: () => ({}), loadSessionCache: () => {}, loadHashMetaCache: () => {},
    scrobbleQueue: { init: () => {}, clear: () => { f.context.queueClearCount = (f.context.queueClearCount || 0) + 1; } },
    slog: () => {}, logWarn: (...args) => { f.context.lastWarning = args; f.context.lastWarningMessage = String(args[1]); }, logDebugOnce: () => {},
    getCompletionKey: () => 'synthetic-completion',
    markFinishIntent: () => { f.context.finishIntentCount = (f.context.finishIntentCount || 0) + 1; },
    finish: media => { f.context.finishCallCount = (f.context.finishCallCount || 0) + 1; (f.context.finishedMedia || (f.context.finishedMedia = [])).push({ ...media }); return Promise.resolve({ ok: true }); },
    documentListeners, storageListeners, playerHandlers: player, activityCard
  });
  const instanceHelpersStart = source.indexOf('  function beginPlaybackInstance(');
  const instanceHelpersEnd = source.indexOf('\n\n  /**\n   * Модуль для відстеження перегляду', instanceHelpersStart);
  assert(instanceHelpersStart >= 0 && instanceHelpersEnd > instanceHelpersStart, 'production playback-instance helpers exist');
  vm.runInContext(source.slice(instanceHelpersStart, instanceHelpersEnd), f.context);
  vm.runInContext('var onPlayerStart = ' + productionMethod('watching', 'onPlayerStart') + '; var processTimelineUpdate = ' + productionMethod('watching', 'processTimelineUpdate') + '; var watchingInit = ' + productionMethod('watching', 'init') + '; var eventInit = ' + productionMethod('events', 'init') + ';', f.context);
  const watching = {
    isLoggingEnabled: () => false,
    getCurrentCard: () => { currentCardReadCount++; return activityCard; },
    checkAndAddToShow: (media, hash) => { (f.context.showWatchingCalls || (f.context.showWatchingCalls = [])).push({ id: media && media.id, episode_number: media && media.episode_number, hash }); },
    getMetaByHash: () => null,
    onPlayerStart: f.context.onPlayerStart,
    processTimelineUpdate: f.context.processTimelineUpdate,
    init: f.context.watchingInit
  };
  f.context.watching = watching;
  watching.init.call(watching);
  const events = { _cleanups: [], onAppReady: () => {}, init: f.context.eventInit };
  events.init.call(events);
  const playerEvent = (type, data) => {
    if (type === 'destroy' || type === 'error' || type === 'ended') playerOpened = false;
    (player[type] || []).slice().forEach(fn => fn(data || {}));
  };
  const storageChange = name => storageListeners.slice().forEach(fn => fn({ name }));
  const timeline = (hash, time, percent, duration = 1000) => {
    activityCard = f.currentCard || activityCard;
    f.context.activityCard = activityCard;
    (timelineHandlers.update || []).slice().forEach(fn => fn({ data: { hash, road: { time, duration, percent } } }));
  };
  const launch = (media, hash) => {
    activityCard = media; f.currentCard = media; f.context.activityCard = media;
    activeVideo = { currentTime: 0, duration: 1000, paused: true, seeking: false };
    playerOpened = true;
    (player.start || []).slice().forEach(fn => fn({ card: media, timeline: { hash, percent: 0 } }));
  };
  return { ...f, values, player, playerEvent, storageChange, documentListeners, accountListeners, timeline, launch, video: () => activeVideo, watching, events, setPlaylist: list => { playerPlaylist = list; }, currentCardReadCount: () => currentCardReadCount };
}

async function flush() { for (let i = 0; i < 12; i++) await Promise.resolve(); }

test('production player launch does not START until Timeline advances; advancing Timeline starts once', async () => {
  const f = integrationFixture(), media = movie();
  f.launch(media, 'movie-hash');
  assert.deepEqual(f.calls, []);
  f.timeline('movie-hash', 100, 10);
  assert.deepEqual(f.calls, []);
  f.timeline('movie-hash', 101, 10.1);
  await flush();
  assert.deepEqual(f.calls.map(call => call.action), ['start']);
  f.timeline('movie-hash', 102, 10.2);
  await flush();
  assert.deepEqual(f.calls.map(call => call.action), ['start']);
});

test('the active Lampa video playing event is an accepted playback confirmation', async () => {
  const f = integrationFixture(), media = movie(13);
  f.launch(media, 'play-event');
  Object.assign(f.video(), { currentTime: 125, duration: 1000, paused: false });
  f.documentListeners.playing[0]({ target: f.video() });
  await flush();
  assert.deepEqual(f.calls.map(call => call.action), ['start']);
  assert.equal(f.calls[0].progress, 12.5);
});

test('completion terminal state prevents repeated START/STOP while allowing a fresh replay of the same movie', async () => {
  const f = integrationFixture(), media = movie(44);
  f.launch(media, 'completion-run-1');
  f.timeline('completion-run-1', 880, 88);
  f.timeline('completion-run-1', 890, 89); await flush();
  f.timeline('completion-run-1', 900, 90); await flush();
  for (const percent of [91, 95, 100]) f.timeline('completion-run-1', percent * 10, percent);
  await flush();
  assert.deepEqual(f.calls.map(call => call.action), ['start', 'stop']);
  assert.equal(f.context.finishCallCount, 1);

  f.launch(media, 'completion-run-2');
  f.timeline('completion-run-2', 880, 88);
  f.timeline('completion-run-2', 890, 89); await flush();
  f.timeline('completion-run-2', 900, 90); await flush();
  assert.deepEqual(f.calls.map(call => call.action), ['start', 'stop', 'start', 'stop']);
  assert.equal(f.context.finishCallCount, 2, 'new player instance may complete the same media again');
});

test('unrelated and repeated media playing events cannot resume or restart the tracked player', async () => {
  const f = integrationFixture(), media = movie(45);
  f.launch(media, 'tracked-video');
  Object.assign(f.video(), { currentTime: 100, duration: 1000, paused: false });
  const playing = f.documentListeners.playing[0];
  playing({ target: f.video() }); await flush();
  assert.deepEqual(f.calls.map(call => call.action), ['start']);
  f.video().paused = true;
  f.documentListeners.pause[0]({ target: f.video() }); await flush();
  assert.deepEqual(f.calls.map(call => call.action), ['start', 'pause']);

  playing({ target: { currentTime: 400, duration: 1000, paused: false } }); await flush();
  assert.deepEqual(f.calls.map(call => call.action), ['start', 'pause'], 'auxiliary trailer/video is not Lampa PlayerVideo.video()');
  f.documentListeners.pause[0]({ target: { seeking: false, currentTime: 400, duration: 1000 } }); await flush();
  assert.deepEqual(f.calls.map(call => call.action), ['start', 'pause'], 'auxiliary video pause cannot pause the tracked session');
  Object.assign(f.video(), { currentTime: 120, paused: false });
  playing({ target: f.video() }); await flush();
  playing({ target: f.video() }); await flush();
  assert.deepEqual(f.calls.map(call => call.action), ['start', 'pause', 'start']);
  assert.equal(f.calls[2].progress, 12);

  f.playerEvent('destroy', { type: 'destroy' }); await flush();
  playing({ target: f.video() });
  f.playerEvent('error', { type: 'error' });
  await flush();
  assert.deepEqual(f.calls.map(call => call.action), ['start', 'pause', 'start', 'stop'], 'post-stop callbacks are inert');
});

test('production pause, seek, and resume handlers use real progress and distinct events', async () => {
  const f = integrationFixture(), media = movie();
  f.launch(media, 'movie-hash');
  f.timeline('movie-hash', 100, 10);
  f.timeline('movie-hash', 101, 10.1);
  await flush();
  const actualProgressUpdateAt = f.context.throttleState.lastProgressUpdateAt;
  assert.ok(actualProgressUpdateAt > 0);
  f.context.throttleState.lastProgressUpdateAt = 1234;
  assert.equal(f.api.getCurrentProgress().time, 1234, 'getter returns the stored Timeline timestamp, not a fresh Date.now()');
  f.context.throttleState.lastProgressUpdateAt = actualProgressUpdateAt;
  const pause = f.documentListeners.pause[0], play = f.documentListeners.playing[0];
  Object.assign(f.video(), { seeking: false, currentTime: 110, duration: 1000 });
  pause({ target: f.video() });
  await flush();
  assert.deepEqual(f.calls.map(call => call.action), ['start', 'pause']);
  assert.equal(f.calls[1].progress, 11);
  const beforeSeek = f.calls.length;
  f.video().seeking = true;
  pause({ target: f.video() });
  await flush();
  assert.equal(f.calls.length, beforeSeek);
  Object.assign(f.video(), { seeking: false, currentTime: 120, duration: 1000, paused: false });
  play({ target: f.video() });
  await flush();
  assert.deepEqual(f.calls.map(call => call.action), ['start', 'pause', 'start']);
  assert.equal(f.calls[2].progress, 12);
});

test('production Timeline switching sends S01E02 STOP before S01E03 START', async () => {
  const f = integrationFixture(), second = episode(2), third = episode(3);
  f.launch(second, 's1e2'); f.timeline('s1e2', 10, 1); f.timeline('s1e2', 11, 1.1); await flush();
  f.launch(third, 's1e3'); f.timeline('s1e3', 0, 0); f.timeline('s1e3', 1, 0.1); await flush();
  assert.deepEqual(f.calls.map(call => [call.action, call.media.episode_number]), [['start', 2], ['stop', 2], ['start', 3]]);
});

test('direct player switch at confirmed 95% records only the previous episode and stops it before E03 starts', async () => {
  const f = integrationFixture(), second = episode(2), third = episode(3);
  f.launch(second, 'switch-e2');
  Object.assign(f.video(), { currentTime: 950, duration: 1000, paused: false });
  f.documentListeners.playing[0]({ target: f.video() }); await flush();
  assert.deepEqual(f.calls.map(call => call.action), ['start']);
  assert.equal(f.api.getActiveSession().progress, 95);
  assert.equal(f.context.currentPlaybackInstance.hash, 'switch-e2');
  assert.equal(f.context.playbackSessionKey(second), 'show:1396:1:2');
  assert.equal(f.context.playbackSessionKey(third), 'show:1396:1:3');
  assert.match(f.context.onPlayerStart.toString(), /stopPreviousEpisodeOnPlayerStart/);
  f.launch(third, 'switch-e3');
  await flush();
  assert.equal(f.context.finishCallCount, 1);
  assert.equal(f.context.finishedMedia[0].episode_number, 2);
  assert.deepEqual(f.calls.map(call => [call.action, call.media.episode_number]), [['start', 2], ['stop', 2]]);
  f.timeline('switch-e3', 0, 0); f.timeline('switch-e3', 1, 0.1); await flush();
  assert.deepEqual(f.calls.map(call => [call.action, call.media.episode_number]), [['start', 2], ['stop', 2], ['start', 3]]);
  assert.ok(!f.context.finishedMedia.some(media => media.episode_number === 3), 'starting E03 never marks E03 watched');
});

test('direct player switch at 20% stops E02 without a watched-history write', async () => {
  const f = integrationFixture(), second = episode(2), third = episode(3);
  f.launch(second, 'low-e2');
  f.timeline('low-e2', 100, 10); f.timeline('low-e2', 200, 20); await flush();
  f.launch(third, 'low-e3'); await flush();
  assert.equal(f.context.finishCallCount || 0, 0);
  assert.deepEqual(f.calls.map(call => [call.action, call.media.episode_number]), [['start', 2], ['stop', 2]]);
  f.timeline('low-e3', 0, 0); f.timeline('low-e3', 1, 0.1); await flush();
  assert.deepEqual(f.calls.map(call => [call.action, call.media.episode_number]), [['start', 2], ['stop', 2], ['start', 3]]);
  assert.equal(f.context.finishCallCount || 0, 0);
});

test('same torrent hash with different selected episode files keeps independent episode sessions', async () => {
  const f = integrationFixture(), second = Object.assign(episode(2), { infohash: 'same-pack-hash' }), third = Object.assign(episode(3), { infohash: 'same-pack-hash' });
  f.launch(second, 'pack-file-e2'); f.timeline('pack-file-e2', 1, 1); f.timeline('pack-file-e2', 2, 2); await flush();
  f.launch(third, 'pack-file-e3'); f.timeline('pack-file-e3', 0, 0); f.timeline('pack-file-e3', 1, 0.1); await flush();
  assert.deepEqual(f.calls.map(call => [call.action, call.media.episode_number]), [['start', 2], ['stop', 2], ['start', 3]]);
  assert.equal(f.api.getActiveSession().key, 'show:1396:1:3');
});

test('rapid next/previous episode starts and duplicate/out-of-order Timeline callbacks stay isolated', async () => {
  const f = integrationFixture(), second = episode(2), third = episode(3);
  f.launch(second, 'rapid-e2'); f.timeline('rapid-e2', 10, 1); f.timeline('rapid-e2', 11, 1.1); await flush();
  f.launch(third, 'rapid-e3'); f.timeline('rapid-e3', 0, 0); f.timeline('rapid-e3', 1, 0.1); await flush();
  f.launch(second, 'rapid-e2-replay'); f.timeline('rapid-e2-replay', 0, 0); f.timeline('rapid-e2-replay', 1, 0.1); await flush();
  const before = f.calls.length;
  f.timeline('rapid-e3', 990, 99); f.timeline('rapid-e2-replay', 1, 0.1); await flush();
  assert.equal(f.calls.length, before, 'stale or repeated samples cannot add starts/history');
  assert.equal(f.api.getActiveSession().key, 'show:1396:1:2');
  assert.equal(f.context.finishCallCount || 0, 0);
});

test('stale S01E02 completion after switching to S01E03 cannot mutate or complete the current episode', async () => {
  const f = integrationFixture(), second = episode(2), third = episode(3);
  f.launch(second, 'delayed-e2'); f.timeline('delayed-e2', 10, 1); f.timeline('delayed-e2', 11, 1.1); await flush();
  f.launch(third, 'current-e3'); f.timeline('current-e3', 0, 0); f.timeline('current-e3', 1, 0.1); await flush();
  const finishCount = f.context.finishCallCount || 0;
  const showCount = (f.context.showWatchingCalls || []).length;
  const callCount = f.calls.length;
  const currentCardReads = f.currentCardReadCount();
  f.timeline('delayed-e2', 950, 95); await flush();
  assert.equal(f.context.finishCallCount || 0, finishCount);
  assert.equal((f.context.showWatchingCalls || []).length, showCount);
  assert.equal(f.calls.length, callCount);
  assert.equal(f.currentCardReadCount(), currentCardReads, 'stale hash never falls back to the current Activity card');
  assert.ok(!(f.context.finishedMedia || []).some(media => media.episode_number === 3));
});

test('delayed high-progress movie Timeline cannot complete a different current movie', async () => {
  const f = integrationFixture(), oldMovie = movie(101), currentMovie = movie(202);
  f.launch(oldMovie, 'old-movie'); f.timeline('old-movie', 1, 1); f.timeline('old-movie', 2, 2); await flush();
  f.launch(currentMovie, 'current-movie'); f.timeline('current-movie', 0, 0); f.timeline('current-movie', 1, 0.1); await flush();
  const finishCount = f.context.finishCallCount || 0;
  const showCount = (f.context.showWatchingCalls || []).length;
  const callCount = f.calls.length;
  f.timeline('old-movie', 990, 99); await flush();
  assert.equal(f.context.finishCallCount || 0, finishCount);
  assert.equal((f.context.showWatchingCalls || []).length, showCount);
  assert.equal(f.calls.length, callCount);
  assert.ok(!(f.context.finishedMedia || []).some(media => media.id === currentMovie.id));
});

test('unassociated Timeline hash cannot use Activity identity for any playback or account mutation', async () => {
  const f = integrationFixture();
  f.currentCard = movie(303);
  f.context.currentPlaybackInstance = null;
  f.timeline('unknown-hash', 990, 99); await flush();
  assert.deepEqual(f.calls, []);
  assert.equal(f.context.finishCallCount || 0, 0);
  assert.deepEqual(f.context.showWatchingCalls || [], []);
  assert.equal(f.currentCardReadCount(), 0);
  assert.equal(f.context.window.last_timeline_event, undefined);
});

test('verified current episode completes once at threshold with its exact identity', async () => {
  const f = integrationFixture(), current = episode(7, 0);
  f.launch(current, 'special-current');
  f.timeline('special-current', 880, 88); f.timeline('special-current', 890, 89); await flush();
  f.timeline('special-current', 900, 90); await flush();
  f.timeline('special-current', 910, 91); f.timeline('special-current', 920, 92); await flush();
  assert.equal(f.context.finishCallCount, 1);
  assert.equal(f.context.finishedMedia[0].id, current.id);
  assert.equal(f.context.finishedMedia[0].season_number, 0);
  assert.equal(f.context.finishedMedia[0].episode_number, 7);
  assert.deepEqual(f.calls.map(call => call.action), ['start', 'stop']);
});

test('production session key refuses malformed TV episode identity before scrobble or history association', () => {
  const f=integrationFixture(), base={id:1396,method:'tv',name:'Synthetic Series',original_name:'Synthetic Series'};
  for(const [season,episodeNumber] of [[-1,2],[1.5,2],[1,0],[1,'2.25'],[undefined,2]]) {
    assert.equal(f.context.playbackSessionKey({...base,season_number:season,episode_number:episodeNumber}),'');
  }
});

test('same Timeline hash may represent a different verified file episode in a season pack', async () => {
  const f=integrationFixture(), second=episode(2), third=episode(3);
  f.launch(second,'same-timeline-hash'); Object.assign(f.video(),{currentTime:950,duration:1000,paused:false}); f.documentListeners.playing[0]({target:f.video()}); await flush();
  f.launch(third,'same-timeline-hash'); await flush();
  assert.equal(f.context.finishCallCount,1,'exact S/E metadata distinguishes selected files despite unchanged torrent hash');
  assert.equal(f.context.finishedMedia[0].episode_number,2);
  assert.deepEqual(f.calls.map(call=>[call.action,call.media.episode_number]),[['start',2],['stop',2]]);
});

test('unchanged Timeline hash without distinct episode metadata cannot infer a season-pack transition', async () => {
  const f=integrationFixture(), second=episode(2), ambiguous={id:1396,method:'tv',name:'Synthetic Series',original_name:'Synthetic Series'};
  f.launch(second,'same-hash'); Object.assign(f.video(),{currentTime:200,duration:1000,paused:false}); f.documentListeners.playing[0]({target:f.video()}); await flush();
  f.launch(ambiguous,'same-hash'); await flush();
  assert.equal(f.context.finishCallCount||0,0);
  assert.deepEqual(f.calls.map(call=>call.action),['start','stop'],'the old session closes, but no episode history is inferred');
});

test('same-hash delayed E02 Timeline events cannot transfer 20% progress or watched completion to E03', async () => {
  const f=integrationFixture(), second=episode(2), third=episode(3);
  f.launch(second,'shared-season-pack-hash');
  f.timeline('shared-season-pack-hash',100,10); f.timeline('shared-season-pack-hash',200,20); await flush();
  assert.equal(f.api.getActiveSession().key,'show:1396:1:2');assert.equal(f.api.getActiveSession().progress,20);
  f.launch(third,'shared-season-pack-hash'); await flush();
  assert.equal(f.context.finishCallCount||0,0,'20% E02 does not finish');
  assert.equal(f.context.currentPlaybackInstance.ambiguousTimelineHash,true);
  // Old events are indistinguishable by hash alone, so the production handler
  // must ignore them rather than assigning their positions to the new episode.
  f.timeline('shared-season-pack-hash',990,99);f.timeline('shared-season-pack-hash',1000,100);await flush();
  assert.notEqual(f.api.getActiveSession()?.key,'show:1396:1:3','stale timeline cannot confirm/start E03');
  Object.assign(f.video(),{currentTime:100,duration:1000,paused:false});f.documentListeners.playing[0]({target:f.video()});await flush();
  assert.equal(f.api.getActiveSession().key,'show:1396:1:3');assert.equal(f.api.getActiveSession().progress,10,'E03 starts from actual active-video position');
  const previousWindowEvent=f.context.window.last_timeline_event;
  f.timeline('shared-season-pack-hash',990,99);f.timeline('shared-season-pack-hash',1000,100);await flush();
  assert.equal(f.api.getActiveSession().progress,10,'delayed E02 events cannot overwrite video-confirmed E03 progress');
  assert.equal(f.context.finishCallCount||0,0,'stale 99–100% never marks E03 watched');
  assert.equal(f.context.window.last_timeline_event,previousWindowEvent,'ambiguous callbacks do not publish as current Timeline evidence');
  Object.assign(f.video(),{currentTime:200,duration:1000,paused:false});f.documentListeners.timeupdate[0]({target:f.video()});
  assert.equal(f.api.getActiveSession().progress,20,'internal player timeupdate may advance only from the active video element');
});

test('ambiguous same-hash E03 completes once from advancing active-video progress at threshold', async () => {
  const f=integrationFixture(), second=episode(2), third=episode(3);
  f.launch(second,'threshold-pack-hash');
  f.timeline('threshold-pack-hash',100,10);f.timeline('threshold-pack-hash',200,20);await flush();
  f.launch(third,'threshold-pack-hash');await flush();
  f.timeline('threshold-pack-hash',990,99);f.timeline('threshold-pack-hash',1000,100);await flush();
  assert.equal(f.context.finishCallCount||0,0,'delayed E02 Timeline does not finish E03');
  Object.assign(f.video(),{currentTime:200,duration:1000,paused:false});f.documentListeners.playing[0]({target:f.video()});await flush();
  Object.assign(f.video(),{currentTime:950,duration:1000,paused:false});f.documentListeners.timeupdate[0]({target:f.video()});await flush();
  assert.equal(f.context.finishCallCount,1);
  assert.equal(String(f.context.finishedMedia[0].id),'1396');assert.equal(f.context.finishedMedia[0].season_number,1);assert.equal(f.context.finishedMedia[0].episode_number,3);
  assert.equal(f.context.terminalPlaybackInstanceId,f.context.currentPlaybackInstance.id);
  f.documentListeners.timeupdate[0]({target:f.video()});f.documentListeners.timeupdate[0]({target:f.video()});
  f.playerEvent('ended',{type:'ended'});f.playerEvent('destroy',{type:'destroy'});await flush();
  assert.equal(f.context.finishCallCount,1,'repeat updates and exit callbacks do not duplicate completion');
});

test('ambiguous same-hash completion is captured on Player ended before a final timeupdate', async () => {
  const f=integrationFixture();f.launch(episode(2),'exit-pack-hash');
  f.timeline('exit-pack-hash',100,10);f.timeline('exit-pack-hash',200,20);await flush();
  f.launch(episode(3),'exit-pack-hash');await flush();
  Object.assign(f.video(),{currentTime:200,duration:1000,paused:false});f.documentListeners.playing[0]({target:f.video()});await flush();
  // Simulate a final internal-video position sampled by Lampa.Player.ended,
  // with no preceding timeupdate at this exact threshold.
  Object.assign(f.video(),{currentTime:950,duration:1000,paused:false});f.playerEvent('ended',{type:'ended'});await flush();
  assert.equal(f.context.finishCallCount,1);assert.equal(f.context.finishedMedia[0].episode_number,3);
  f.playerEvent('destroy',{type:'destroy'});await flush();assert.equal(f.context.finishCallCount,1,'destroy after ended cannot duplicate the history write');
});

test('ambiguous same-hash episode at 89% exits without a history write', async () => {
  const f=integrationFixture();f.launch(episode(2),'under-threshold-pack');
  f.timeline('under-threshold-pack',100,10);f.timeline('under-threshold-pack',200,20);await flush();
  f.launch(episode(3),'under-threshold-pack');await flush();
  Object.assign(f.video(),{currentTime:200,duration:1000,paused:false});f.documentListeners.playing[0]({target:f.video()});await flush();
  Object.assign(f.video(),{currentTime:890,duration:1000,paused:false});f.documentListeners.timeupdate[0]({target:f.video()});await flush();
  assert.equal(f.api.getActiveSession().progress,89);assert.equal(f.context.finishCallCount||0,0);
  f.playerEvent('ended',{type:'ended'});await flush();assert.equal(f.context.finishCallCount||0,0);
});

test('ambiguous same-hash timeupdate cannot finish after account or profile identity changes', async () => {
  for(const changed of ['account','profile']) {
    const f=integrationFixture();f.launch(episode(2),'identity-pack-'+changed);
    f.timeline('identity-pack-'+changed,100,10);f.timeline('identity-pack-'+changed,200,20);await flush();
    f.launch(episode(3),'identity-pack-'+changed);await flush();
    Object.assign(f.video(),{currentTime:200,duration:1000,paused:false});f.documentListeners.playing[0]({target:f.video()});await flush();
    if(changed==='account'){f.values.trakt_token='synthetic-new-account';f.storageChange('trakt_token');}
    else (f.accountListeners.profile_select||[]).slice().forEach(fn=>fn({}));
    Object.assign(f.video(),{currentTime:950,duration:1000,paused:false});f.documentListeners.timeupdate[0]({target:f.video()});await flush();
    assert.equal(f.context.finishCallCount||0,0,changed+' switch invalidates pending episode completion');
  }
});

test('production destroy and error handlers STOP the confirmed session', async () => {
  for (const endEvent of ['destroy', 'error']) {
    const f = integrationFixture(), media = movie(endEvent === 'destroy' ? 1 : 2);
    f.launch(media, endEvent); f.timeline(endEvent, 1, 1); f.timeline(endEvent, 2, 2); await flush();
    assert.ok(f.api.getActiveSession(), 'active session before ' + endEvent);
    f.playerEvent(endEvent, { type: endEvent }); await flush();
    f.playerEvent(endEvent, { type: endEvent });
    f.playerEvent(endEvent === 'destroy' ? 'error' : 'destroy', { type: endEvent === 'destroy' ? 'error' : 'destroy' });
    await flush();
    assert.deepEqual(f.calls.map(call => call.action), ['start', 'stop'], endEvent + ' ' + f.context.lastWarningMessage);
  }
});

test('disabling Watching invokes production auth callback and stops without ReferenceError', async () => {
  const f = integrationFixture(), media = movie();
  f.launch(media, 'disable'); f.timeline('disable', 1, 1); f.timeline('disable', 2, 2); await flush();
  f.values.trakt_enable_watching = false;
  assert.doesNotThrow(() => f.storageChange('trakt_enable_watching'));
  await flush();
  assert.deepEqual(f.calls.map(call => call.action), ['start', 'stop']);
  assert.equal(f.context.pendingInternalPlayback, null);
});

test('external handoff is retained through player destroy and needs advancing Timeline; return without Timeline stops safely', async () => {
  const f = integrationFixture(), media = movie(9);
  f.launch(media, 'external-hash');
  f.playerEvent('external', { data: { card: media, timeline: { hash: 'external-hash' } } });
  f.playerEvent('destroy', { type: 'destroy' });
  assert.equal(f.context.pendingExternalPlayback.hash, 'external-hash');
  f.timeline('external-hash', 30, 3);
  assert.deepEqual(f.calls, []);
  f.timeline('external-hash', 31, 3.1); await flush();
  assert.deepEqual(f.calls.map(call => call.action), ['start']);
  assert.equal(f.api.getActiveSession().external, true);
  f.playerEvent('visibility', { hidden: false }); await flush();
  f.playerEvent('visibility', { hidden: false });
  f.playerEvent('destroy', { type: 'destroy' });
  await flush();
  assert.deepEqual(f.calls.map(call => call.action), ['start', 'stop']);
  assert.equal(f.context.pendingExternalPlayback, null);
});

test('external player return without any confirming Timeline clears the handoff without START or watched completion', async () => {
  const f = integrationFixture(), media = movie(19);
  f.launch(media, 'external-no-timeline');
  f.playerEvent('external', { data: { card: media, timeline: { hash: 'external-no-timeline' } } });
  f.playerEvent('destroy', { type: 'destroy' });
  assert.equal(f.context.pendingExternalPlayback.hash, 'external-no-timeline');
  f.playerEvent('visibility', { hidden: false });
  await flush();
  assert.deepEqual(f.calls, []);
  assert.equal(f.context.pendingExternalPlayback, null);
});

test('official Just+ playlist callback finalizes each exact episode through Lampa Timeline after return', async () => {
  const f = integrationFixture();
  const show = { id: 1396, method: 'tv', type: 'tv', name: 'Show', number_of_seasons: 3 };
  f.setPlaylist([
    { season: 1, episode: 2, url: 'same-pack', timeline: { hash: 'native-e2', time: 100, duration: 1000, percent: 10 } },
    { season: 1, episode: 3, url: 'same-pack', timeline: { hash: 'native-e3', time: 0, duration: 1000, percent: 0 } }
  ]);
  f.playerEvent('external', { data: { card: show, timeline: { hash: 'native-e3' } } });
  assert.deepEqual(Object.keys(f.context.externalPlaylistReport.entries).sort(), ['native-e2', 'native-e3']);
  f.playerEvent('visibility', { hidden: false });
  f.timeline('native-e2', 950, 95);
  f.timeline('native-e3', 920, 92);
  await flush();
  assert.deepEqual(f.context.finishedMedia.map(media => [media.season_number, media.episode_number, media.hash]), [[1, 2, 'native-e2'], [1, 3, 'native-e3']]);
  f.timeline('native-e2', 950, 95);
  await flush();
  assert.equal(f.context.finishedMedia.length, 2, 'repeated callback snapshot is idempotent');
});

test('external launch Player.start before visibility retains report; native Timeline callback after return still completes', async () => {
  const f = integrationFixture();
  const show = { id: 1396, method: 'tv', type: 'tv', name: 'Show', season_number: 1, episode_number: 3 };
  f.setPlaylist([{ season: 1, episode: 3, timeline: { hash: 'return-e3', time: 0, duration: 2700 } }]);
  f.playerEvent('external', { data: { card: show, timeline: { hash: 'return-e3' } } });
  f.playerEvent('start', { card: show, timeline: { hash: 'return-e3' } });
  assert.ok(f.context.externalPlaylistReport, 'start correlated with the still-pending external handoff preserves the snapshot');
  f.playerEvent('visibility', { hidden: false });
  f.timeline('return-e3', 0, 100, 0);
  await flush();
  assert.equal(f.context.finishCallCount || 0, 0, 'Android 0/0/100 normalization is not completion evidence');
  f.timeline('return-e3', 2430, 90, 2700);
  await flush();
  assert.deepEqual((f.context.finishedMedia || []).map(media => [media.season_number, media.episode_number, media.hash]), [[1, 3, 'return-e3']]);
});

test('fresh internal Player.start with the same episode/hash clears external snapshot and uses real video progress', async () => {
  const f = integrationFixture();
  const show = { id: 1396, method: 'tv', type: 'tv', name: 'Show', season_number: 1, episode_number: 3 };
  f.setPlaylist([{ season: 1, episode: 3, timeline: { hash: 'same-e3', time: 0, duration: 2700 } }]);
  f.playerEvent('external', { data: { card: show, timeline: { hash: 'same-e3' } } });
  f.playerEvent('visibility', { hidden: false });
  f.launch(show, 'same-e3');
  assert.equal(f.context.externalPlaylistReport, null, 'a post-return Player.start is a new internal session, not an Android result callback');
  assert.equal(f.context.currentPlaybackInstance.ambiguousTimelineHash, true, 'reused external hash is quarantined from Timeline attribution');
  f.timeline('same-e3', 0, 100, 0);
  await flush();
  assert.equal(f.context.finishCallCount || 0, 0, 'late normalized Android completion cannot finish the fresh internal session');
  Object.assign(f.video(), { currentTime: 100, duration: 1000, paused: false });
  f.documentListeners.playing[0]({ target: f.video() });
  await flush();
  Object.assign(f.video(), { currentTime: 950 });
  f.documentListeners.timeupdate[0]({ target: f.video() });
  await flush();
  assert.deepEqual((f.context.finishedMedia || []).map(media => [media.season_number, media.episode_number, media.hash]), [[1, 3, 'same-e3']], 'actual internal video progress completes normally');
});

test('account change invalidates a not-yet-sent production START and its pending association', async () => {
  const f = integrationFixture(), media = movie(10);
  f.launch(media, 'account-switch'); f.timeline('account-switch', 1, 1); f.timeline('account-switch', 2, 2);
  f.values.trakt_token = 'different-synthetic-token';
  f.storageChange('trakt_token');
  f.timeline('account-switch', 3, 3);
  f.timeline('account-switch', 4, 4);
  await flush();
  assert.deepEqual(f.calls, []);
  assert.equal(f.context.queueClearCount, 1);
  assert.equal(f.api.getActiveSession(), null);
});

test('profile switch invalidates active session and stale Timeline cannot restart it under the same token', async () => {
  const f = integrationFixture(), media = movie(11);
  f.launch(media, 'profile-switch'); f.timeline('profile-switch', 1, 1); f.timeline('profile-switch', 2, 2); await flush();
  assert.deepEqual(f.calls.map(call => call.action), ['start']);
  const showWritesBeforeSwitch = (f.context.showWatchingCalls || []).length;
  (f.accountListeners.profile_select || []).slice().forEach(fn => fn({}));
  f.timeline('profile-switch', 990, 99); await flush();
  assert.deepEqual(f.calls.map(call => call.action), ['start']);
  assert.equal(f.api.getActiveSession(), null);
  assert.equal(f.context.queueClearCount, 1);
  assert.equal(f.context.finishCallCount || 0, 0, 'same-token profile switch cannot finish stale media');
  assert.equal((f.context.showWatchingCalls || []).length, showWritesBeforeSwitch, 'stale progress cannot write show-watching state into another profile');
});

test('season zero specials retain exact identity in production session keys', async () => {
  const f = fixture(), special = episode(1, 0);
  await f.api.scrobbleStart(special, 0);
  assert.equal(f.api.getActiveSession().key, 'show:1396:0:1');
  assert.deepEqual(f.calls.map(call => call.action), ['start']);
});

test('season zero specials serialize correctly for both live and queued scrobble requests', () => {
  const build = (name, marker) => {
    const start = source.indexOf('function ' + name + '(');
    const end = source.indexOf(marker, start);
    assert(start >= 0 && end > start, name + ' production helper exists');
    const bodyEnd = source.lastIndexOf('\n  }', end);
    const context = vm.createContext({ debugEnabled: () => false, logWarn: () => {}, getContentType$2: () => 'show' });
    vm.runInContext('var candidate = ' + source.slice(start, bodyEnd + 4), context);
    return context.candidate;
  };
  const queuedBody = build('buildScrobbleBody$1', '\n  function replayAction');
  const liveBody = build('buildScrobbleBody', '\n  /**\n   * Read minInterval');
  const special = episode(1, 0);
  assert.equal(queuedBody(special, 0).episode.season, 0);
  assert.equal(liveBody(special, 0).episode.season, 0);
});
