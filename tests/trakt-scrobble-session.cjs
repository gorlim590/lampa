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
  const values = { trakt_enable_watching: true, trakt_token: 'synthetic-token', trakt_min_progress: 90 };
  const player = Object.create(null), timelineHandlers = Object.create(null), globalListeners = Object.create(null), storageListeners = [], documentListeners = Object.create(null);
  let activityCard = null;
  const on = map => (name, fn) => { (map[name] || (map[name] = [])).push(fn); };
  const remove = map => (name, fn) => { map[name] = (map[name] || []).filter(item => item !== fn); };
  const storage = {
    field: key => values[key], get: key => values[key], set: (key, value) => { values[key] = value; },
    listener: { follow: (name, fn) => { if (name === 'change') storageListeners.push(fn); }, remove: (name, fn) => { const i = storageListeners.indexOf(fn); if (i >= 0) storageListeners.splice(i, 1); } }
  };
  const Lampa = {
    Storage: storage,
    Activity: { active: () => ({ movie: activityCard, card: activityCard }) },
    Player: { listener: { follow: on(player), remove: remove(player) } },
    Timeline: { listener: { follow: on(timelineHandlers), remove: remove(timelineHandlers) } },
    Listener: { follow: on(globalListeners), remove: remove(globalListeners) },
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
    isInitialized: false,
    isInitialized$1: false,
    pendingExternalPlayback: null, pendingInternalPlayback: null, timelineProgressSamples: {},
    setHashMeta: (hash, value) => { meta[hash] = value; }, getHashMeta: hash => meta[hash] || null,
    extractSeasonEpisode: media => ({ season: media.season_number, episode: media.episode_number }),
    resolveSeasonEpisode: () => ({}), loadSessionCache: () => {}, loadHashMetaCache: () => {},
    scrobbleQueue: { init: () => {}, clear: () => { f.context.queueClearCount = (f.context.queueClearCount || 0) + 1; } },
    slog: () => {}, logWarn: (...args) => { f.context.lastWarning = args; f.context.lastWarningMessage = String(args[1]); }, logDebugOnce: () => {},
    getCompletionKey: () => null, markFinishIntent: () => {}, finish: () => Promise.resolve(),
    documentListeners, storageListeners, playerHandlers: player, activityCard
  });
  vm.runInContext('var onPlayerStart = ' + productionMethod('watching', 'onPlayerStart') + '; var processTimelineUpdate = ' + productionMethod('watching', 'processTimelineUpdate') + '; var watchingInit = ' + productionMethod('watching', 'init') + '; var eventInit = ' + productionMethod('events', 'init') + ';', f.context);
  const watching = {
    isLoggingEnabled: () => false,
    getCurrentCard: () => activityCard,
    checkAndAddToShow: () => {},
    getMetaByHash: () => null,
    onPlayerStart: f.context.onPlayerStart,
    processTimelineUpdate: f.context.processTimelineUpdate,
    init: f.context.watchingInit
  };
  f.context.watching = watching;
  watching.init.call(watching);
  const events = { _cleanups: [], onAppReady: () => {}, init: f.context.eventInit };
  events.init.call(events);
  const playerEvent = (type, data) => (player[type] || []).slice().forEach(fn => fn(data || {}));
  const storageChange = name => storageListeners.slice().forEach(fn => fn({ name }));
  const timeline = (hash, time, percent) => {
    activityCard = f.currentCard || activityCard;
    f.context.activityCard = activityCard;
    (timelineHandlers.update || []).slice().forEach(fn => fn({ data: { hash, road: { time, duration: 1000, percent } } }));
  };
  const launch = (media, hash) => {
    activityCard = media; f.currentCard = media; f.context.activityCard = media;
    (player.start || []).slice().forEach(fn => fn({ card: media, timeline: { hash, percent: 0 } }));
  };
  return { ...f, values, player, playerEvent, storageChange, documentListeners, timeline, launch, watching, events };
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

test('a real media-element play event is an accepted playback confirmation', async () => {
  const f = integrationFixture(), media = movie(13);
  f.launch(media, 'play-event');
  f.documentListeners.play[0]({ target: { currentTime: 125, duration: 1000, paused: false } });
  await flush();
  assert.deepEqual(f.calls.map(call => call.action), ['start']);
  assert.equal(f.calls[0].progress, 12.5);
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
  const pause = f.documentListeners.pause[0], play = f.documentListeners.play[0];
  pause({ target: { seeking: false, currentTime: 110, duration: 1000 } });
  await flush();
  assert.deepEqual(f.calls.map(call => call.action), ['start', 'pause']);
  assert.equal(f.calls[1].progress, 11);
  const beforeSeek = f.calls.length;
  pause({ target: { seeking: true } });
  await flush();
  assert.equal(f.calls.length, beforeSeek);
  play({ target: { currentTime: 120, duration: 1000, paused: false } });
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

test('production destroy and error handlers STOP the confirmed session', async () => {
  for (const endEvent of ['destroy', 'error']) {
    const f = integrationFixture(), media = movie(endEvent === 'destroy' ? 1 : 2);
    f.launch(media, endEvent); f.timeline(endEvent, 1, 1); f.timeline(endEvent, 2, 2); await flush();
    assert.ok(f.api.getActiveSession(), 'active session before ' + endEvent);
    f.playerEvent(endEvent, { type: endEvent }); await flush();
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

test('account change invalidates a not-yet-sent production START and its pending association', async () => {
  const f = integrationFixture(), media = movie(10);
  f.launch(media, 'account-switch'); f.timeline('account-switch', 1, 1); f.timeline('account-switch', 2, 2);
  f.values.trakt_token = 'different-synthetic-token';
  f.storageChange('trakt_token');
  await flush();
  assert.deepEqual(f.calls, []);
  assert.equal(f.context.queueClearCount, 1);
  assert.equal(f.api.getActiveSession(), null);
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
