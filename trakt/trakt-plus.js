/*
 * TraktTV Plus v3 — надбудова для TraktTV.js (Lampa)
 * Підключати ПІСЛЯ TraktTV.js.
 *
 *  - рядки на головній: «Зараз дивляться» (фільми / серіали / мультфільми+мульти-серіали / аніме+аніме-фільми),
 *    жанрові, «бо ти дивився X», приховані перлини, топ, свіже, очікувані, класика, документальні, нові серіали…
 *  - кнопка «Ще» відкриває повну сторінку з нескінченною підгрузкою (посторінково з Trakt)
 *  - у картці фільму/серіалу: рядок «Подібні (Trakt)» після колекції; кнопка доступна як альтернатива
 *  - приховування переглянутого (фільми + серіали), позначка на картках (затемнення + риска + бейдж)
 *  - синхронізація переглянутого у Вибране, папка «Trakt: Переглянуті»
 *  - рядки реєструються одразу при завантаженні плагіна — повторно вмикати «Головну» не потрібно
 *
 * Код у ES5 (без async/arrow) для старих Smart TV.
 */
(function () {
  'use strict';

  if (window.trakt_plus_ready) return;
  window.trakt_plus_ready = true;

  // ───────────── КОНСТАНТИ ─────────────
  var MAX_WATCHED = 50000;
  var AUTO_SYNC_HOURS = 12;
  var WATCHED_CACHE_HOURS = 24;
  var WATCH_RECHECK_SEC = 90;
  var DEFAULT_EXCLUDE = 'reality,talk-show,news,game-show,soap,sporting-event,special-interest';
  var MARK_TYPES = ['look', 'viewed', 'scheduled', 'continued', 'thrown'];
  var CACHE_VER = 7;      // v7: verified account owner; credentials are never persisted as identity
  var TOP_INDEX = 0;      // з якої позиції починаються рядки Trakt на головній (0 = самий верх)
  var QUEUE_MAX = 3;      // скільки запитів до Trakt одночасно (щоб не ловити 429)
  var FULL_FIRST = 600;   // перший екран «Ще»: великий список без збільшення рядів головної
  var FULL_PAGE = 200;    // унікальних карток у наступній порції
  var FULL_SCAN = 12;     // межа пошуку після фільтрації в одному запиті UI

  var TREND_ROWS = [
    { key: 'movies', uk: 'Зараз дивляться: фільми', en: 'Watching now: movies', index: 3,
      loads: [{ p: '/movies', hint: 'movie' }], skip: ['animation', 'anime'] },
    { key: 'shows', uk: 'Зараз дивляться: серіали', en: 'Watching now: TV shows', index: 4,
      loads: [{ p: '/shows', hint: 'show' }], skip: ['animation', 'anime'] },
    { key: 'cartoons', uk: 'Зараз дивляться: мультфільми', en: 'Watching now: cartoons', index: 5,
      loads: [{ p: '/movies', hint: 'movie', genre: 'animation' }, { p: '/shows', hint: 'show', genre: 'animation' }],
      genre: 'animation', skip: ['anime'] },
    { key: 'anime', uk: 'Зараз дивляться: аніме', en: 'Watching now: anime', index: 6,
      loads: [{ p: '/movies', hint: 'movie', genre: 'anime' }, { p: '/shows', hint: 'show', genre: 'anime' }],
      genre: 'anime', skip: [] }
  ];

  // Жанрові рядки (фільми). Додавайте свої за зразком.
  var GENRE_ROWS = [
    { slug: 'horror', uk: 'Жахи, які ти ще не бачив', en: "Horror you haven't seen", minRating: 6.0, minVotes: 500, index: 10 },
    { slug: 'thriller', uk: 'Трилери', en: 'Thrillers', minRating: 6.8, minVotes: 1000, index: 11 },
    { slug: 'science-fiction', uk: 'Фантастика', en: 'Sci-Fi', minRating: 6.8, minVotes: 1000, index: 12 },
    { slug: 'comedy', uk: 'Комедії, які ти ще не бачив', en: "Comedies you haven't seen", minRating: 6.8, minVotes: 1500, index: 16 },
    { slug: 'mystery', uk: 'Детективи та містика', en: 'Mystery', minRating: 6.8, minVotes: 800, index: 17 },
    { slug: 'documentary', uk: 'Документальні', en: 'Documentaries', minRating: 7.0, minVotes: 300, index: 18 }
  ];

  var api = null;
  var watchedMovies = {};
  var watchedShows = {};
  var showStates = {};
  var showSources = {};
  var progressQueue = [], progressPending = {}, progressActive = 0, progressNotifyTimer = null;
  var readEpoch = 0;
  var lastSyncResult = null;
  var verifiedMovies = {}, movieStatusReady = false, showStatusReady = false;
  var statusPhase = 'idle', statusAt = 0, unmappedMovies = 0, unmappedShows = 0;
  var SHOW_STATE_TTL = 6 * 3600000;
  var watchedPromise = null;
  var watchedStamp = '';
  var hydrated = false;
  var lastCheck = 0;
  var ROWS = {};
  var syncing = false;
  var rowCalled = false;
  var credentialSeen, sessionEpoch = 0, accountOwner = null, identityPromise = null, identityRetryAt = 0;
  var sessionJobs = [], activeSync = null, accountTimer = null;

  // ───────────── ХЕЛПЕРИ ─────────────
  function lang() { return String(Lampa.Storage.get('language', 'en')); }
  function tr(uk, en) { return lang() === 'uk' ? uk : en; }
  function token() { return Lampa.Storage.get('trakt_token'); }
  // Compare credentials only as an in-memory invalidation signal, never as an
  // account ID/cache key. A rotated token must reverify the same authenticated owner.
  function observeSession() {
    var credential = token() || null;
    if (credential === credentialSeen) return;
    credentialSeen = credential; sessionEpoch++; readEpoch++;
    var jobs = sessionJobs; sessionJobs = [];
    accountOwner = null; identityPromise = null; identityRetryAt = 0;
    hydrated = false; watchedPromise = null; lastCheck = 0; watchedStamp = '';
    watchedMovies = {}; watchedShows = {}; showStates = {}; showSources = {};
    verifiedMovies = {}; movieStatusReady = showStatusReady = false;
    statusAt = 0; statusPhase = credential ? 'idle' : 'unavailable';
    unmappedMovies = unmappedShows = 0; lastSyncResult = null;
    progressQueue = []; progressPending = {}; progressActive = 0;
    clearTimeout(progressNotifyTimer); progressNotifyTimer = null;
    if (activeSync && activeSync.manual && Lampa.Loading) Lampa.Loading.stop();
    activeSync = null; syncing = false; watchedVer++;
    jobs.forEach(function (cancel) { cancel.listeners.slice().forEach(function (abort) { abort(); }); });
    clearRowCaches();
  }

  function sessionCancel(epoch, operation, stopped) {
    var cancel = function () {
      observeSession();
      return epoch !== sessionEpoch || (operation !== null && operation !== readEpoch) || !!(stopped && stopped());
    };
    cancel.listeners = []; sessionJobs.push(cancel); return cancel;
  }
  function releaseSession(cancel) {
    var i = sessionJobs.indexOf(cancel); if (i >= 0) sessionJobs.splice(i, 1);
  }
  function waitForSession(promise, cancel) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      function finish(error, value) {
        if (settled) return; settled = true;
        var i = cancel.listeners.indexOf(abort); if (i >= 0) cancel.listeners.splice(i, 1);
        if (error) reject(error); else resolve(value);
      }
      function abort() { finish(cancelledError()); }
      cancel.listeners.push(abort);
      try { checkCancelled(cancel); } catch (e) { finish(e); }
      promise.then(function (value) { finish(null, value); }, function (error) { finish(error); });
    });
  }
  function verifiedOwner(data) {
    var user = data && (data.user || data);
    var ids = user && user.ids;
    if (!ids || typeof ids !== 'object' || Array.isArray(ids)) throw new Error('Missing authenticated Trakt identity');
    if (typeof ids.uuid === 'string' && /^[a-zA-Z0-9-]{1,128}$/.test(ids.uuid)) return 'uuid:' + ids.uuid;
    // Older Trakt profiles expose only the authenticated slug. A rename safely
    // invalidates that fallback cache instead of guessing that two owners match.
    if (typeof ids.slug === 'string' && /^[a-z0-9_-]{1,128}$/i.test(ids.slug)) return 'slug:' + ids.slug.toLowerCase();
    throw new Error('Missing authenticated Trakt identity');
  }
  function ensureAccount(force) {
    observeSession();
    if (!credentialSeen) return Promise.reject(new Error('Trakt unavailable'));
    if (accountOwner) return Promise.resolve(accountOwner);
    if (identityPromise) return identityPromise;
    if (!force && Date.now() < identityRetryAt) return Promise.reject(new Error('Trakt identity unavailable'));
    var epoch = sessionEpoch, cancel = sessionCancel(epoch, null);
    statusPhase = 'loading';
    var pending = whenApi().then(function () {
      checkCancelled(cancel); return getRetry('/users/me', 0, cancel);
    }).then(function (data) {
      checkCancelled(cancel); accountOwner = verifiedOwner(data);
      hydrateWatched(); return accountOwner;
    });
    identityPromise = pending.then(function (owner) {
      releaseSession(cancel); if (epoch === sessionEpoch) identityPromise = null; return owner;
    }, function (error) {
      releaseSession(cancel);
      if (epoch === sessionEpoch) { identityPromise = null; accountOwner = null; statusPhase = 'error'; identityRetryAt = Date.now() + 30000; }
      throw error;
    });
    return identityPromise;
  }

  function onAccountStorage(event) {
    if (!event || (event.name !== 'trakt_token' && event.key !== 'trakt_token')) return;
    observeSession(); clearTimeout(accountTimer);
    accountTimer = setTimeout(function () { accountTimer = null; loadWatched(true).then(function () { decorateAll(); }); }, 150);
  }
  function notify(text) { try { Lampa.Bell.push({ text: text }); } catch (e) {} }
  function field(name, def) {
    var v = Lampa.Storage.field(name);
    return (v === undefined || v === null || v === '') ? def : v;
  }
  function bool(name, def) {
    var v = Lampa.Storage.field(name);
    if (v === undefined || v === null) return def;
    return v === true || v === 'true' || v === 1 || v === '1';
  }
  function arrToSet(arr) {
    var o = {};
    (arr || []).forEach(function (k) { o[k] = 1; });
    return o;
  }

  var cfgCache = null, cfgT = 0;
  function cfg() {
    var now = Date.now();
    if (cfgCache && now - cfgT < 800) return cfgCache;
    cfgT = now;
    cfgCache = {
      enable: bool('trakt_plus_enable', true),
      hideWatched: bool('trakt_plus_hide_watched', true),
      hideShows: bool('trakt_plus_hide_shows', true),
      mark: bool('trakt_plus_mark', true),
      markShows: bool('trakt_plus_mark_shows', true),
      autosync: bool('trakt_plus_autosync', true),
      trendHide: bool('trakt_plus_trend_hide_watched', false),
      more: bool('trakt_plus_more', true),
      fullRows: bool('trakt_plus_full_rows', true),
      fullButton: bool('trakt_plus_full_button', true),
      autoHome: bool('trakt_plus_auto_home', true),
      rowLimit: parseInt(field('trakt_plus_row_limit', '30'), 10) || 30,
      cacheMin: parseInt(field('trakt_plus_cache_min', '10'), 10) || 10,
      minRating: parseFloat(field('trakt_plus_min_rating', '6.5')) || 0,
      minVotes: parseInt(field('trakt_plus_min_votes', '500'), 10) || 0,
      recType: String(field('trakt_plus_rec_type', 'movies')),
      exclude: String(field('trakt_plus_exclude_genres', DEFAULT_EXCLUDE)).toLowerCase().split(',')
        .map(function (s) { return s.trim(); }).filter(Boolean)
    };
    return cfgCache;
  }
  function cfgSig() {
    var g = cfg();
    return [g.hideWatched, g.hideShows, g.trendHide, g.minRating, g.minVotes, g.exclude.join(), watchedVer].join('|');
  }

  function whenApi() {
    if (api) return Promise.resolve(api);
    return new Promise(function (resolve, reject) {
      var n = 0;
      (function poll() {
        var a = window.TraktTV && window.TraktTV.api;
        if (a) { api = a; return resolve(a); }
        if (++n > 200) return reject(new Error('no trakt api'));
        setTimeout(poll, 150);
      })();
    });
  }

  function img(m, type) {
    var s = m && m.images && m.images[type];
    var u = '';
    if (Array.isArray(s)) u = s[0] || '';
    else if (s && typeof s === 'object') u = s.medium || s.thumb || s.full || '';
    else if (typeof s === 'string') u = s;
    if (u && !/^https?:/.test(u)) u = 'https://' + u.replace(/^\/+/, '');
    return u;
  }

  function feed(path, extra) {
    var o = { extended: 'full,images', limit: 100 };
    var k;
    for (k in extra) if (extra.hasOwnProperty(k)) o[k] = extra[k];
    var q = [];
    for (k in o) if (o.hasOwnProperty(k)) q.push(k + '=' + encodeURIComponent(o[k]));
    return path + '?' + q.join('&');
  }

  function uniq(list) {
    var s = {}, o = [];
    list.forEach(function (c) {
      var k = c.method + c.id;
      if (s[k]) return;
      s[k] = 1;
      o.push(c);
    });
    return o;
  }

  // ───────────── ЧЕРГА ЗАПИТІВ (обмеження паралельності + повтор при збої) ─────────────
  var qActive = 0, qWait = [];
  function qPump() {
    while (qActive < QUEUE_MAX && qWait.length) {
      var j = qWait.shift();
      qActive++;
      qRun(j, 0);
    }
  }
  function qRun(j, att) {
    var out;
    try { out = api.get(j.u); } catch (e) { out = Promise.reject(e); }
    Promise.resolve(out).then(function (a) {
      qActive--; j.res(a); qPump();
    }, function (e) {
      if (att < 2) setTimeout(function () { qRun(j, att + 1); }, 1500 * (att + 1));
      else { qActive--; j.rej(e); qPump(); }
    });
  }
  function qget(u, foreground) {
    return new Promise(function (res, rej) {
      var job = { u: u, res: res, rej: rej, foreground: !!foreground };
      if (foreground) {
        var pos = 0;
        while (pos < qWait.length && qWait[pos].foreground) pos++;
        qWait.splice(pos, 0, job);
      } else qWait.push(job);
      qPump();
    });
  }

  // ───────────── КАРТКИ ─────────────
  function toCard(entry, hint) {
    if (!entry || typeof entry !== 'object') return null;
    var isShow = entry.show ? true : (entry.movie ? false : hint === 'show');
    var m = entry.movie || entry.show || entry;
    var ids = m.ids || {};
    if (!ids.tmdb) return null;
    var poster = img(m, 'poster');
    if (!poster) return null;
    var fan = img(m, 'fanart') || poster;
    var title = m.title || '';
    var date = isShow ? String(m.first_aired || '').slice(0, 10) : String(m.released || '');
    if (!date && m.year) date = String(m.year);
    var c = {
      component: 'full',
      source: 'tmdb',
      id: ids.tmdb,
      ids: ids,
      title: title,
      original_title: m.original_title || title,
      release_date: date,
      vote_average: Number(m.rating || 0),
      overview: m.overview || '',
      poster: poster,
      img: poster,
      image: fan,
      background_image: fan,
      method: isShow ? 'tv' : 'movie',
      card_type: isShow ? 'tv' : 'movie',
      type: isShow ? 'tv' : 'movie',
      media_type: isShow ? 'tv' : 'movie',
      _votes: Number(m.votes || 0),
      _watchers: Number(entry.watchers || entry.watcher_count || 0),
      _genres: Array.isArray(m.genres) ? m.genres : [],
      _country: String(m.country || '').toLowerCase(),
      _language: String(m.language || '').toLowerCase(),
      _year: Number(m.year || 0)
    };
    if (isShow) {
      c.name = title;
      c.original_name = m.original_title || title;
      c.first_air_date = date;
    }
    return c;
  }

  function openFull(c) {
    Lampa.Activity.push({ url: '', component: 'full', id: c.id, method: c.method, card: c, source: 'tmdb' });
  }

  function finalize(c) {
    var n = {};
    var k;
    for (k in c) if (c.hasOwnProperty(k)) n[k] = c[k];
    n.params = { emit: { onlyEnter: function () { openFull(n); } } };
    return n;
  }

  // ───────────── ПЕРЕГЛЯНУТЕ ─────────────
  function collectIds(list, key) {
    var o = {};
    (list || []).forEach(function (i) {
      var m = i && i[key];
      if (m && m.ids && m.ids.tmdb) o[m.ids.tmdb] = 1;
    });
    return o;
  }

  var watchedVer = 0; // лічильник змін множин (дешевий підпис для кешу рядків)

  // повідомляємо інші плагіни (YDesign) про зміну списку переглянутих
  function emitWatched() {
    try {
      var ev;
      if (typeof window.CustomEvent === 'function') ev = new CustomEvent('traktplus:watched');
      else { ev = document.createEvent('Event'); ev.initEvent('traktplus:watched', true, true); }
      document.dispatchEvent(ev);
    } catch (e) {}
  }

  function unionIds(a, b) {
    var out = {};
    Object.keys(a || {}).concat(Object.keys(b || {})).forEach(function (id) { out[id] = 1; });
    return out;
  }

  // Replays and specials cannot substitute for distinct aired regular episodes.
  // Missing totals/seasons mean unknown, never a completed series.
  function progressEvidence(progress) {
    var aired = Number(progress && progress.aired), count = Number(progress && progress.completed);
    if (!progress || !isFinite(aired) || !isFinite(count) || aired < 0 || count < 0 || aired % 1 || count % 1 || count > aired) throw new Error('Invalid show progress');
    return { t: Date.now(), aired: aired, watched: count, known: aired > 0, retryAfter: aired > 0 ? 0 : Date.now() + 300000, complete: aired > 0 && count === aired };
  }

  function progressPath(item) {
    var id = item.show && item.show.ids && item.show.ids.trakt;
    if (!(Number(id) > 0)) throw new Error('Missing Trakt show ID for progress');
    return '/shows/' + encodeURIComponent(id) + '/progress/watched?hidden=true&specials=false&count_specials=false';
  }

  function showEvidence(item) {
    if (item.progress) return progressEvidence(item.progress);
    var aired = Number(item.show && item.show.aired_episodes), seen = {}, valid = true;
    if (!Array.isArray(item.seasons)) valid = false;
    (item.seasons || []).forEach(function (season) {
      if (!(Number(season.number) > 0 && Number(season.number) % 1 === 0)) return;
      if (!Array.isArray(season.episodes)) { valid = false; return; }
      season.episodes.forEach(function (episode) {
        var n = Number(episode.number);
        if (!(n > 0 && n % 1 === 0 && Number(episode.plays) > 0)) return;
        if (episode.first_aired && Date.parse(episode.first_aired) > Date.now()) return;
        seen[season.number + ':' + n] = 1;
      });
    });
    var count = Object.keys(seen).length;
    return { t: Date.now(), aired: aired > 0 && aired % 1 === 0 ? aired : 0,
      watched: count, known: !!(valid && aired > 0), complete: !!(valid && aired > 0 && aired % 1 === 0 && count === aired) };
  }

  function freshStatus(t) { var age = Date.now() - Number(t); return isFinite(age) && age >= 0 && age < SHOW_STATE_TTL; }

  function completedShows() {
    var out = {};
    Object.keys(showStates).forEach(function (id) {
      var r = showStates[id];
      if (r.complete && freshStatus(r.t)) out[id] = 1;
    });
    return out;
  }

  function pumpProgress() {
    while (progressActive < 2 && progressQueue.length) {
      (function (job) {
        progressActive++;
        getRetry(progressPath(job.item), 0, job.cancel).then(function (data) {
          checkCancelled(job.cancel);
          var evidence = progressEvidence(data);
          if (showSources[job.id] !== job.item) return;
          evidence.sig = job.sig; evidence.trakt = job.item.show.ids.trakt; showStates[job.id] = evidence;
          watchedShows = completedShows(); watchedVer++;
          clearTimeout(progressNotifyTimer);
          progressNotifyTimer = setTimeout(function () {
            if (job.cancel()) return;
            try { persistWatched(); } catch (e) {}
            clearRowCaches(); emitWatched(); decorateAll();
          }, 100);
        }).catch(function () {
          if (!job.cancel() && showSources[job.id] === job.item && showStates[job.id]) { showStates[job.id].retryAfter = Date.now() + 300000; showStates[job.id].error = true; }
        }).then(function () {
          releaseSession(job.cancel);
          if (job.epoch !== sessionEpoch) return;
          delete progressPending[job.id]; progressActive--; pumpProgress();
        });
      })(progressQueue.shift());
    }
  }

  function isCompletedShow(id) {
    var r = showStates[id], item = showSources[id];
    if (item && r && !r.known && !(r.retryAfter > Date.now()) && !progressPending[id] && progressQueue.length < 128) {
      try {
        progressPath(item);
        progressPending[id] = true; progressQueue.push({ id: id, item: item, sig: r.sig, epoch: sessionEpoch, cancel: sessionCancel(sessionEpoch, readEpoch) }); pumpProgress();
      } catch (e) {}
    }
    return !!(r && r.complete && freshStatus(r.t));
  }

  function watchStatus(card) {
    try { return readWatchStatus(card); }
    catch (e) { statusPhase = 'error'; return null; }
  }

  function readWatchStatus(card) {
    observeSession();
    if (!accountOwner) { if (credentialSeen) ensureAccount().catch(function () {}); return null; }
    hydrateWatched();
    var id = tmdbId(card);
    if (!id || !card || !token() || statusPhase !== 'ready' || !freshStatus(statusAt)) return null;
    if (cardKind(card) !== 'show') {
      if (!movieStatusReady) return null;
      if (verifiedMovies[id]) return true;
      return unmappedMovies ? null : false;
    }
    if (!showStatusReady) return null;
    var record = showStates[id];
    if (!record) return unmappedShows ? null : false;
    isCompletedShow(id); // resolve missing proxy progress lazily, without blocking callers
    record = showStates[id];
    if (!record.known || record.error || !freshStatus(record.t)) return null;
    return !!record.complete;
  }

  function acceptWatched(movies, shows, stamp, missingMovies) {
    // Read-only imports are additive: even a silently truncated HTTP 200 cannot
    // delete an earlier known movie. Explicit unwatch reconciliation is separate.
    verifiedMovies = collectIds(movies, 'movie');
    watchedMovies = unionIds(watchedMovies, verifiedMovies);
    movieStatusReady = showStatusReady = true;
    statusPhase = 'ready'; statusAt = Date.now();
    unmappedMovies = missingMovies || 0;
    unmappedShows = shows.filter(function (it) { return !it.show.ids.tmdb; }).length;
    var currentStates = {}, currentSources = {};
    shows.forEach(function (it) {
      var id = it.show.ids.tmdb;
      if (!id) return;
      var evidence = showEvidence(it), old = showStates[id];
      var sig = [it.last_updated_at || it.last_watched_at || '', it.show.aired_episodes || ''].join('|');
      evidence.sig = sig; evidence.trakt = it.show.ids.trakt; currentSources[id] = it;
      currentStates[id] = !evidence.known && !it.progress && old && old.sig === sig && freshStatus(old.t) ? old : evidence;
    });
    showStates = currentStates; showSources = currentSources;
    watchedShows = completedShows();
    watchedStamp = stamp || '';
    watchedVer++;
  }

  function persistWatched() {
    observeSession();
    if (!accountOwner) throw cancelledError();
    Lampa.Storage.set('trakt_plus_watched_cache', {
      v: CACHE_VER, owner: accountOwner, t: Date.now(), stamp: watchedStamp, m: Object.keys(watchedMovies),
      s: Object.keys(completedShows()), shows: showStates,
      status: { t: statusAt, phase: statusPhase, movies: movieStatusReady, shows: showStatusReady,
        ids: Object.keys(verifiedMovies), missingMovies: unmappedMovies, missingShows: unmappedShows }
    });
  }

  function hydrateWatched() {
    if (hydrated || !accountOwner) return;
    hydrated = true;
    var c = Lampa.Storage.get('trakt_plus_watched_cache');
    if (c && c.t && c.v === CACHE_VER && c.owner === accountOwner) {
      watchedMovies = arrToSet(c.m);
      // v4 s[] meant started shows: it is never valid completion evidence.
      showStates = c.v === CACHE_VER && c.shows && typeof c.shows === 'object' ? c.shows : {};
      watchedShows = completedShows();
      if (c.v === CACHE_VER && c.status && (!c.status.phase || c.status.phase === 'ready') && freshStatus(c.status.t)) {
        statusAt = c.status.t; statusPhase = 'ready';
        verifiedMovies = arrToSet(c.status.ids);
        movieStatusReady = c.status.movies === true; showStatusReady = c.status.shows === true;
        unmappedMovies = c.status.missingMovies || 0; unmappedShows = c.status.missingShows || 0;
        Object.keys(showStates).forEach(function (id) {
          var r = showStates[id];
          if (r.trakt) showSources[id] = { show: { ids: { tmdb: id, trakt: r.trakt } } };
        });
      }
      watchedStamp = c.v === CACHE_VER ? (c.stamp || '') : '';
      watchedVer++;
    }
  }

  function validActivityTime(value) {
    if (typeof value !== 'string') return false;
    var match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?Z$/.exec(value);
    if (!match || !isFinite(Date.parse(value))) return false;
    var date = new Date(Date.parse(value));
    return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() + 1 === Number(match[2]) &&
      date.getUTCDate() === Number(match[3]) && date.getUTCHours() === Number(match[4]) &&
      date.getUTCMinutes() === Number(match[5]) && date.getUTCSeconds() === Number(match[6]);
  }
  function activityStamp(a) {
    if (!a || typeof a !== 'object' || !a.movies || !a.episodes ||
      typeof a.movies !== 'object' || typeof a.episodes !== 'object' ||
      Array.isArray(a.movies) || Array.isArray(a.episodes)) return null;
    var values = [a.movies.watched_at, a.episodes.watched_at, a.all];
    if (!values.every(validActivityTime)) return null;
    // Paused timestamps are not required for watched completeness. If supplied,
    // validate them too; absence is encoded explicitly, never as an empty date.
    for (var i = 0; i < 2; i++) {
      var group = i ? a.episodes : a.movies;
      if (Object.prototype.hasOwnProperty.call(group, 'paused_at')) {
        if (!validActivityTime(group.paused_at)) return null;
        values.push(group.paused_at);
      } else values.push(null);
    }
    return JSON.stringify(values);
  }

  function cancelledError() { var e = new Error('Watched sync cancelled'); e.cancelled = true; return e; }
  function checkCancelled(cancel) { if (cancel && cancel()) throw cancelledError(); }
  function strictList(value, kind) {
    if (!Array.isArray(value) || value.some(function (it) { return !it || !it[kind] || !it[kind].ids; })) {
      throw new Error('Invalid watched ' + kind + ' response');
    }
    return value;
  }

  function getRetry(path, attempt, cancel) {
    attempt = attempt || 0;
    return new Promise(function (resolve, reject) {
      try { checkCancelled(cancel); } catch (e) { return reject(e); }
      var settled = false, timer;
      function finish(error, value) {
        if (settled) return;
        settled = true; clearTimeout(timer);
        if (cancel && cancel.listeners) {
          var index = cancel.listeners.indexOf(abort);
          if (index >= 0) cancel.listeners.splice(index, 1);
        }
        if (error) reject(error); else resolve(value);
      }
      function abort() { finish(cancelledError()); }
      if (cancel && cancel.listeners) cancel.listeners.push(abort);
      timer = setTimeout(function () { finish(new Error('Watched request timeout')); }, 20000);
      Promise.resolve().then(function () {
        checkCancelled(cancel);
        // Watched/identity validation must not reuse cached show progress or an
        // in-flight request from a different credential generation in TraktTV.
        return api.get(path, false, { cache: false, forceFresh: true, dedup: false });
      }).then(function (v) {
        try { checkCancelled(cancel); finish(null, v); } catch (e) { finish(e); }
      }, function (e) { finish(e || new Error('Watched request failed')); });
    }).catch(function (e) {
      e = e || new Error('Watched request failed');
      checkCancelled(cancel);
      if (attempt < 2 && !e.cancelled && e.status !== 401 && e.status !== 403) {
        return new Promise(function (r) { setTimeout(r, 1500); }).then(function () { return getRetry(path, attempt + 1, cancel); });
      }
      throw e;
    });
  }

  function fetchShows(cancel, detailed) {
    // Some installed proxies omit seasons even without noseasons. The explicit
    // import obtains authoritative progress; Home resolves visible candidates lazily.
    return getRetry('/sync/watched/shows?extended=full', 0, cancel).then(function (a) {
      var list = strictList(a, 'show');
      if (!detailed) return list;
      var next = 0, result = list.slice();
      function worker() {
        checkCancelled(cancel);
        var index, item;
        do {
          index = next++;
          if (index >= list.length) return Promise.resolve();
          item = list[index];
        } while (showEvidence(item).known || !item.show.ids.trakt);
        return getRetry(progressPath(item), 0, cancel).then(function (p) {
          progressEvidence(p);
          var copy = {}; Object.keys(item).forEach(function (k) { copy[k] = item[k]; });
          copy.progress = p; result[index] = copy;
          return worker();
        });
      }
      return Promise.all([worker(), worker()]).then(function () { return result; });
    });
  }

  function refreshWatched(force) {
    observeSession();
    if (syncing) return Promise.resolve(false);
    var session = sessionEpoch;
    return ensureAccount(force).then(function () {
      observeSession(); if (session !== sessionEpoch) throw cancelledError();
      if (syncing) return false;
      return refreshVerifiedWatched(force);
    });
  }

  function refreshVerifiedWatched(force) {
    var epoch = ++readEpoch, cached = Lampa.Storage.get('trakt_plus_watched_cache') || {};
    var cancel = sessionCancel(sessionEpoch, epoch);
    var tooOld = cached.owner !== accountOwner || !cached.t || cached.v !== CACHE_VER || !cached.status || (cached.status.phase && cached.status.phase !== 'ready') || !freshStatus(cached.status.t);
    statusPhase = 'loading';
    return getRetry('/sync/last_activities', 0, cancel).then(function (a) {
      var stamp = activityStamp(a);
      if (!force && !tooOld && stamp !== null && stamp === cached.stamp) { statusPhase = 'ready'; return false; }
      if (stamp === null) throw new Error('Missing activity snapshot');
      var movies = pagedWatchedMovies(false, cancel).then(function (items) {
        var missing = items.filter(function (it) { return !it.movie.ids.tmdb; }).length;
        if (items.length !== HIST_PAGE) return { list: items, unmapped: missing };
        return pagedHistory(false, null, cancel).then(function (history) {
          return { list: mergeWatched(items, history), unmapped: missing + history.filter(function (it) { return !it.movie.ids.tmdb; }).length };
        });
      });
      return Promise.all([movies, fetchShows(cancel)]).then(function (r) {
        return getRetry('/sync/last_activities', 0, cancel).then(function (after) {
          checkCancelled(cancel);
          if (activityStamp(after) !== stamp) throw new Error('Trakt changed during refresh');
          acceptWatched(r[0].list, r[1], stamp, r[0].unmapped);
          persistWatched(); emitWatched(); return true;
        });
      });
    }).catch(function (e) {
      if (epoch === readEpoch) statusPhase = e && e.cancelled ? 'cancelled' : 'error';
      throw e;
    }).then(function (value) { releaseSession(cancel); return value; }, function (error) {
      releaseSession(cancel); throw error;
    });
  }

  function loadWatched(force) {
    observeSession();
    if (!token()) { statusPhase = 'unavailable'; return Promise.resolve(false); }
    var session = sessionEpoch;
    var now = Date.now();
    if (!force && watchedPromise && (now - lastCheck) < WATCH_RECHECK_SEC * 1000) return watchedPromise;
    lastCheck = now;
    watchedPromise = whenApi().then(function () {
      observeSession(); if (session !== sessionEpoch) throw cancelledError();
      return refreshWatched(force);
    }).catch(function () { return false; });
    return watchedPromise;
  }

  function isWatched(c) {
    if (cardKind(c) === 'show' && !cfg().hideShows) return false;
    return watchStatus(c) === true;
  }

  // ───────────── ФІЛЬТРИ ТА РАНЖУВАННЯ ─────────────
  function passes(c, o) {
    o = o || {};
    var g = cfg();
    if (o.countries && o.countries.indexOf(c._country) < 0) return false;
    if (o.languages && o.languages.indexOf(c._language) < 0) return false;
    var hide = o.hideWatched != null ? o.hideWatched : g.hideWatched;
    if (hide && isWatched(c)) return false;
    if (o.notGenres) {
      for (var n = 0; n < o.notGenres.length; n++) if (c._genres.indexOf(o.notGenres[n]) > -1) return false;
    }
    var minR = o.minRating != null ? o.minRating : g.minRating;
    var minV = o.minVotes != null ? o.minVotes : g.minVotes;
    if (c.vote_average < minR) return false;
    var v = c._votes || 0;
    if (v < minV) return false;
    if (o.maxVotes && v > o.maxVotes) return false;
    if (o.genre && c._genres.indexOf(o.genre) < 0) return false;
    for (var i = 0; i < c._genres.length; i++) {
      if (g.exclude.indexOf(c._genres[i]) > -1 && c._genres[i] !== o.genre) return false;
    }
    return true;
  }

  function dayNum() { return Math.floor(Date.now() / 86400000); }

  function score(c) {
    var v = c._votes || 0, m = 1000;
    var s = (v / (v + m)) * c.vote_average + (m / (v + m)) * 6.5;
    var h = ((Number(c.id) * 2654435761 + dayNum() * 97) >>> 0) % 1000 / 1000;
    return s + (h - 0.5) * 0.8;
  }
  function rank(list) {
    return list.map(function (c) { return { c: c, s: score(c) }; })
      .sort(function (a, b) { return b.s - a.s; })
      .map(function (x) { return x.c; });
  }

  function interleave(lists) {
    var out = [], i = 0, more = true;
    while (more) {
      more = false;
      for (var k = 0; k < lists.length; k++) {
        if (i < lists[k].length) { out.push(lists[k][i]); more = true; }
      }
      i++;
    }
    return out;
  }

  // ───────────── ЗАГАЛЬНИЙ ЗАВАНТАЖУВАЧ РЯДКІВ (ЧАНКИ = СТОРІНКИ TRAKT) ─────────────
  function combineDefault(groups, def) {
    var all = [];
    groups.forEach(function (g) { all = all.concat(g.cards); });
    var o = def.opts || {};
    all = all.filter(function (c) {
      if (def.selfId && String(c.id) === String(def.selfId)) return false;
      return passes(c, o);
    });
    all = uniq(all);
    return def.keepOrder ? all : rank(all);
  }

  function combineTrend(groups, def) {
    var per = {};
    groups.forEach(function (g) {
      var k = g.spec.k;
      per[k] = per[k] || { trend: [], pop: [] };
      per[k][g.spec.tag] = per[k][g.spec.tag].concat(g.cards);
    });
    var o = def.opts();
    var lists = Object.keys(per).map(function (k) {
      var p = per[k];
      p.trend.sort(function (a, b) { return b._watchers - a._watchers; });
      p.pop.sort(function (a, b) { return b._votes - a._votes; });
      return uniq(p.trend.concat(p.pop)).filter(function (c) { return passes(c, o); });
    });
    return uniq(interleave(lists));
  }

  function loadChunk(def, ch, foreground) {
    return whenApi().then(function () {
      return def.prepare ? def.prepare(ch) : null;
    }).then(function () {
      var specs = (foreground && def.fullUrls ? def.fullUrls(ch) : def.urls(ch)) || [];
      return Promise.all([loadWatched(), Promise.all(specs.map(function (s) {
        return qget(s.u, foreground).then(function (a) { return Array.isArray(a) ? { arr: a } : { arr: [], err: true }; },
          function () { return { arr: [], err: true }; })
          .then(function (x) {
            return { spec: s, err: !!x.err, raw: x.arr.length, cards: x.arr.map(function (e) { return toCard(e, s.hint); }).filter(Boolean) };
          });
      }))]);
    }).then(function (r) {
      var raw = 0, errs = 0;
      r[1].forEach(function (g) { raw += g.raw; if (g.err) errs++; });
      return {
        cards: (def.combine || combineDefault)(r[1], def), raw: raw, errs: errs,
        moreSources: !!(foreground && def.fullHasMore && def.fullHasMore(ch))
      };
    });
  }

  function defTitle(def) { return def.titleFn ? def.titleFn() : tr(def.uk, def.en); }

  function getRow(def, force) {
    var sig = cfgSig();
    var ttl = cfg().cacheMin * 60000;
    if (!force && def._c && def._sig === sig && Date.now() - def._t < ttl) return Promise.resolve(def._c);
    if (def._p && def._psig === sig) return def._p;
    var n = def.chunks || 1, jobs = [], i;
    for (i = 1; i <= n; i++) jobs.push(loadChunk(def, i));
    def._psig = sig;
    var p = Promise.all(jobs).then(function (res) {
      var cards = [], raw = 0, errs = 0;
      res.forEach(function (r) { cards = cards.concat(r.cards); raw += r.raw; errs += r.errs || 0; });
      cards = uniq(cards);
      if (def._p === p) def._p = null;
      if (errs && !cards.length) throw new Error('trakt request failed');
      var out = { cards: cards, title: defTitle(def), nextChunk: n + 1, exhausted: !raw && !errs };
      if (!errs) { def._c = out; def._t = Date.now(); def._sig = sig; } // збійні/часткові результати не кешуємо
      return out;
    }, function (e) {
      if (def._p === p) def._p = null;
      throw e;
    });
    def._p = p;
    return p;
  }

  function clearRowCaches() {
    Object.keys(ROWS).forEach(function (k) { ROWS[k]._c = null; ROWS[k]._p = null; });
  }

  // ───────────── ВИЗНАЧЕННЯ РЯДКІВ ─────────────
  function movieDef(o) {
    o.hint = 'movie';
    return o;
  }

  function buildDefs() {
    var defs = [];
    var y = new Date().getFullYear();

    // Зараз дивляться
    TREND_ROWS.forEach(function (t) {
      defs.push({
        name: 'TraktPlusTrend_' + t.key, uk: t.uk, en: t.en, index: t.index, chunks: 2,
        fullUk: { movies: 'Фільми Trakt — великий каталог', shows: 'Серіали Trakt — великий каталог', cartoons: 'Мультфільми Trakt — великий каталог', anime: 'Аніме Trakt — великий каталог' }[t.key],
        fullEn: { movies: 'Trakt movies — extended catalogue', shows: 'Trakt shows — extended catalogue', cartoons: 'Trakt animation — extended catalogue', anime: 'Trakt anime — extended catalogue' }[t.key],
        opts: function () { return { minRating: 0, minVotes: 0, hideWatched: cfg().trendHide, genre: t.genre, notGenres: t.skip }; },
        combine: combineTrend,
        urls: function (ch) {
          var s = [];
          t.loads.forEach(function (l, k) {
            var ex = { page: ch };
            if (l.genre) ex.genres = l.genre;
            s.push({ u: feed(l.p + '/trending', ex), hint: l.hint, k: k, tag: 'trend' });
            s.push({ u: feed(l.p + '/popular', ex), hint: l.hint, k: k, tag: 'pop' });
          });
          return s;
        },
        // Public popularity endpoints end after a few pages. Partition the
        // expanded catalogue by decade, preserving this row's media/genre filters.
        fullUrls: function (ch) {
          var cursor = Math.max(0, ch - 3);
          var decade = Math.floor(y / 10) * 10 - Math.floor(cursor / 5) * 10;
          if (decade < 1890) return [];
          var page = cursor % 5 + 1, specs = [];
          t.loads.forEach(function (l, k) {
            ['/popular', '/watched/all', '/favorited/all'].forEach(function (endpoint) {
              var extra = { page: page, years: decade + '-' + Math.min(y, decade + 9) };
              if (l.genre) extra.genres = l.genre;
              specs.push({ u: feed(l.p + endpoint, extra), hint: l.hint, k: k, tag: 'pop' });
            });
          });
          return specs;
        },
        fullHasMore: function (ch) {
          var nextCursor = Math.max(0, ch - 2);
          return Math.floor(y / 10) * 10 - Math.floor(nextCursor / 5) * 10 >= 1890;
        }
      });
    });

    // Live-action Korean drama only; anime and other countries are excluded.
    defs.push({
      name: 'TraktPlusDoramas', uk: 'Популярні корейські дорами', en: 'Popular Korean dramas', index: 4.5, chunks: 2,
      opts: { genre: 'drama', minRating: 0, minVotes: 0, hideWatched: false,
        notGenres: ['animation', 'anime', 'reality', 'talk-show', 'news', 'game-show'],
        countries: ['kr'], languages: ['ko'] },
      urls: function (ch) {
        return ['/shows/popular', '/shows/trending'].map(function (endpoint) {
          return { u: feed(endpoint, { page: ch, genres: 'drama', countries: 'kr', languages: 'ko' }), hint: 'show' };
        });
      }
    });

    // Жанри
    GENRE_ROWS.forEach(function (g) {
      defs.push({
        name: 'TraktPlusGenre_' + g.slug.replace(/[^a-z]/g, ''), uk: g.uk, en: g.en, index: g.index, chunks: 2,
        opts: { genre: g.slug, minRating: g.minRating, minVotes: g.minVotes },
        urls: function (ch) {
          var s = [
            { u: feed('/movies/popular', { genres: g.slug, page: ch }), hint: 'movie' },
            { u: feed('/movies/trending', { genres: g.slug, page: ch }), hint: 'movie' }
          ];
          if (ch === 1) s.push({ u: feed('/recommendations/movies', { ignore_collected: 'true' }), hint: 'movie' });
          return s;
        }
      });
    });

    // Бо ти дивився
    var because = {
      name: 'TraktPlusBecause', uk: 'Бо ти дивився…', en: 'Because you watched…', index: 7, chunks: 1,
      opts: { minRating: 6.0, minVotes: 300 },
      titleFn: function () {
        return because._pick ? tr('Бо ти дивився: ', 'Because you watched: ') + because._pick.title : tr('Бо ти дивився…', 'Because you watched…');
      },
      prepare: function (ch) {
        if (ch > 1 && because._pick) return null;
        return api.get('/sync/history/movies?limit=20').then(function (h) {
          var seen = {}, picks = [];
          (Array.isArray(h) ? h : []).forEach(function (i) {
            var m = i && i.movie;
            if (m && m.ids && m.ids.trakt && !seen[m.ids.trakt]) { seen[m.ids.trakt] = 1; picks.push(m); }
          });
          because._pick = picks.length ? picks[Math.floor(Math.random() * Math.min(picks.length, 10))] : null;
        }, function () { because._pick = null; });
      },
      urls: function (ch) {
        if (!because._pick) return [];
        return [{ u: feed('/movies/' + because._pick.ids.trakt + '/related', { page: ch }), hint: 'movie' }];
      }
    };
    defs.push(because);

    defs.push({ name: 'TraktPlusGems', uk: 'Приховані перлини', en: 'Hidden gems', index: 8, chunks: 3,
      opts: { minRating: 7.2, minVotes: 300, maxVotes: 15000 },
      urls: function (ch) {
        var s = [{ u: feed('/movies/popular', { page: ch + 1 }), hint: 'movie' }];
        if (ch === 1) s.push({ u: feed('/recommendations/movies', { ignore_collected: 'true' }), hint: 'movie' });
        return s;
      } });

    defs.push({ name: 'TraktPlusTop', uk: 'Топ, який ти ще не бачив', en: 'Top rated you have not seen', index: 9, chunks: 3,
      opts: { minRating: 7.5, minVotes: 3000 },
      urls: function (ch) { return [{ u: feed('/movies/popular', { page: ch }), hint: 'movie' }]; } });

    defs.push({ name: 'TraktPlusFresh', uk: 'Свіже й варте уваги', en: 'Fresh & worth watching', index: 13, chunks: 2,
      opts: { minRating: 6.5, minVotes: 300 },
      urls: function (ch) {
        var yy = (y - 1) + '-' + y;
        return [
          { u: feed('/movies/popular', { years: yy, page: ch }), hint: 'movie' },
          { u: feed('/movies/trending', { years: yy, page: ch }), hint: 'movie' }
        ];
      } });

    defs.push({ name: 'TraktPlusAnticipated', uk: 'Очікувані прем’єри', en: 'Most anticipated', index: 14, chunks: 1, keepOrder: true,
      opts: { minRating: 0, minVotes: 0 },
      urls: function (ch) { return [{ u: feed('/movies/anticipated', { page: ch }), hint: 'movie' }]; } });

    defs.push({ name: 'TraktPlusWeekly', uk: 'Найпопулярніше цього тижня', en: 'Most watched this week', index: 15, chunks: 1, keepOrder: true,
      opts: { minRating: 0, minVotes: 0, hideWatched: false },
      urls: function (ch) { return [{ u: feed('/movies/watched/weekly', { page: ch }), hint: 'movie' }]; } });

    defs.push({ name: 'TraktPlusClassics', uk: 'Класика, яку варто побачити', en: 'Classics worth watching', index: 19, chunks: 2,
      opts: { minRating: 7.6, minVotes: 2000 },
      urls: function (ch) { return [{ u: feed('/movies/popular', { years: '1930-1999', page: ch }), hint: 'movie' }]; } });

    defs.push({ name: 'TraktPlusTopShows', uk: 'Серіали, які ти ще не бачив', en: 'Shows you have not seen', index: 20, chunks: 2,
      opts: { minRating: 7.8, minVotes: 2000 },
      urls: function (ch) {
        var s = [{ u: feed('/shows/popular', { page: ch }), hint: 'show' }];
        if (ch === 1) s.push({ u: feed('/recommendations/shows', { ignore_collected: 'true' }), hint: 'show' });
        return s;
      } });

    defs.push({ name: 'TraktPlusNewShows', uk: 'Нові серіали', en: 'New TV shows', index: 21, chunks: 2,
      opts: { minRating: 6.8, minVotes: 200, notGenres: ['animation', 'anime'] },
      urls: function (ch) {
        var yy = (y - 1) + '-' + y;
        return [
          { u: feed('/shows/popular', { years: yy, page: ch }), hint: 'show' },
          { u: feed('/shows/trending', { years: yy, page: ch }), hint: 'show' }
        ];
      } });

    return defs;
  }

  // Рядки «Подібні» для конкретної картки
  function relatedDef(kind, tmdb, title) {
    var name = 'TraktPlusRel_' + kind + '_' + tmdb;
    if (ROWS[name]) return ROWS[name];
    var def = {
      name: name, chunks: 1, keepOrder: true, selfId: tmdb, index: 0,
      opts: { minRating: 0, minVotes: 0, hideWatched: false },
      titleFn: function () { return tr('Подібні (Trakt)', 'Similar (Trakt)') + (title ? ': ' + title : ''); },
      prepare: function () {
        if (def._tid) return null;
        return api.get('/search/tmdb/' + tmdb + '?type=' + kind).then(function (a) {
          var it = Array.isArray(a) && a[0];
          var m = it && it[kind];
          def._tid = (m && m.ids && m.ids.trakt) || 0;
        }, function () { def._tid = 0; });
      },
      urls: function (ch) {
        if (!def._tid) return [];
        return [{ u: feed('/' + kind + 's/' + def._tid + '/related', { page: ch, limit: 40 }), hint: kind }];
      }
    };
    ROWS[name] = def;
    return def;
  }

  function cardKind(d) {
    if (!d) return 'movie';
    // Не перевіряємо лише перше поле: у Lampa method може бути "movie",
    // а type/card_type/media_type — "tv" або "anime".
    var kinds = [d.method, d.type, d.card_type, d.media_type];
    for (var i = 0; i < kinds.length; i++) {
      var kind = String(kinds[i] || '').toLowerCase();
      if (kind === 'tv' || kind === 'show' || kind === 'anime' || kind === 'tv_series') return 'show';
    }
    if (d.first_air_date || d.number_of_seasons || d.original_name ||
        (d.name && !d.title)) return 'show';
    return 'movie';
  }

  function tmdbId(d) {
    var id = d && (d.tmdb_id || (d.ids && d.ids.tmdb) || (d.source === 'trakt' ? null : d.id));
    if (id === undefined || id === null || !/^[1-9]\d*$/.test(String(id))) return '';
    return String(id);
  }

  function openMore(def, title) {
    if (def.fullUk) title = tr(def.fullUk, def.fullEn);
    Lampa.Activity.push({ url: '', title: title, component: 'trakt_plus_view', row: def.name, page: 1 });
  }

  // ───────────── РЕЄСТРАЦІЯ РЯДКІВ ─────────────
  function lineFor(def, r) {
    var g = cfg();
    var title = r.title || defTitle(def);
    var line = {
      title: title,
      trakt_line: true,
      trakt_line_title: title,
      source: 'tmdb',
      page: 1,
      total_pages: 1,
      results: r.cards.slice(0, g.rowLimit).map(finalize)
    };
    if (g.more) {
      var onMore = function () { openMore(def, title); };
      // New Line.More checks total_pages, while legacy InteractionLine checks more.
      // This signals the expandable row; the full view computes its own pagination.
      line.more = true;
      line.total_pages = 2;
      line.onMore = onMore;
      if (Lampa.Maker) line.params = { emit: { onlyMore: onMore } };
    }
    return line;
  }

  function registerRow(def) {
    ROWS[def.name] = def;
    Lampa.ContentRows.add({
      name: def.name,
      title: 'TraktTV+: ' + defTitle(def),
      index: def.index,
      screen: ['main'],
      call: function () {
        rowCalled = true;
        if (!cfg().enable || !token()) return;
        return function (call) {
          function attempt(n) {
            getRow(def, n > 0).then(function (r) {
              if (!r.cards || r.cards.length < 4) return call();
              call(lineFor(def, r));
            }).catch(function () {
              // тимчасовий збій (ліміт запитів / мережа) — пробуємо ще раз, а не лишаємо рядок порожнім
              if (n < 3) setTimeout(function () { attempt(n + 1); }, 2500 * (n + 1));
              else call();
            });
          }
          attempt(0);
        };
      }
    });
  }

  function registerRows() {
    if (!Lampa.ContentRows || typeof Lampa.ContentRows.add !== 'function') return;
    var defs = buildDefs();
    defs.sort(function (a, b) { return a.index - b.index; });
    defs.forEach(function (d, i) { d.index = TOP_INDEX + i; registerRow(d); }); // Trakt-рядки — з самого верху

    // Блок «Подібні (Trakt)» у картці (якщо ця збірка Lampa підтримує рядки в full)
    Lampa.ContentRows.add({
      name: 'TraktPlusFullRelated',
      title: 'TraktTV+: ' + tr('Подібні (Trakt)', 'Similar (Trakt)'),
      index: 3,
      screen: ['full'],
      call: function (params) {
        if (!cfg().enable || !cfg().fullRows || !token()) return;
        var card = params && (params.card || (params.object && params.object.card) || params.data || params.movie);
        if (!card || !card.id) return;
        var kind = cardKind(card);
        var def = relatedDef(kind, card.id, '');
        return function (call) {
          getRow(def).then(function (r) {
            if (!r.cards || r.cards.length < 2) return call();
            var line = lineFor(def, r);
            line.trakt_related = true;
            call(line);
          }).catch(function () { call(); });
        };
      }
    });
  }

  function insertFullRelatedRow(comp, movie) {
    if (!comp || !comp.rows || comp._traktPlusRelatedInserted || !movie || !movie.id) return;
    comp._traktPlusRelatedInserted = true;
    var def = relatedDef(cardKind(movie), movie.id, '');
    var payload = lineFor(def, { cards: [], title: tr('Подібні (Trakt)', 'Similar (Trakt)') });
    payload.trakt_related = true;
    payload.params = payload.params || {};
    payload.params.emit = payload.params.emit || {};
    payload.params.emit.onDestroy = function () { this._traktRelatedDestroyed = true; };
    payload.params.emit.onCreate = function () {
      var line = this;
      getRow(def).then(function (r) {
        if (line._traktRelatedDestroyed) return;
        line.data.results = (r.cards || []).slice(0, cfg().rowLimit).map(finalize);
        line.data.results.slice(0, line.view || 7).forEach(function (card) { line.emit('createAndAppend', card); });
        if (!line.data.results.length) line.render().find('.items-line__body').text(tr('Подібних у Trakt поки немає', 'No Trakt matches yet'));
        Lampa.Layer.visible(line.render(true));
      }).catch(function () {
        if (!line._traktRelatedDestroyed) line.render().find('.items-line__body').text(tr('Trakt тимчасово недоступний. Спробуйте «Ще».', 'Trakt is unavailable. Try More.'));
      });
    };
    var props = comp.props;
    var collection = props && props.get('collection');
    var recommendation = props && props.get('recomend');
    var similar = props && props.get('simular');
    var index = comp.rows.length;
    for (var i = 0; i < comp.rows.length; i++) {
      var row = comp.rows[i];
      if (!Array.isArray(row) || row[0] !== 'cards') continue;
      if (row[1] && row[1].trakt_related) return;
      if (collection && row[1] === collection) { index = i + 1; break; }
      if ((recommendation && row[1] === recommendation) || (similar && row[1] === similar)) { index = i; break; }
    }
    comp.rows.splice(index, 0, ['cards', payload]);
  }

  function hookFullRows() {
    if (!Lampa.Maker || !Lampa.Maker.map) return;
    Lampa.Listener.follow('full', function (e) {
      if (!e || e.type !== 'start' || !e.link || e.link._traktPlusBuildHook) return;
      var comp = e.link, build = comp.build;
      comp._traktPlusBuildHook = true;
      comp.build = function (data) {
        if (cfg().enable && cfg().fullRows && token()) {
          insertFullRelatedRow(this, this.props.get('movie'));
          if (Array.isArray(data)) data = this.rows.slice(0, data.length);
        }
        return build.call(this, data);
      };
    });
    var items = Lampa.Maker.map('Main').Items;
    if (!items || !items.onBuild || items.onBuild._traktPlusRelated) return;
    var original = items.onBuild;
    var wrapped = function (data) {
      if (this.object && this.object.component === 'full' && cfg().enable && cfg().fullRows && token()) {
        insertFullRelatedRow(this, this.props && this.props.get('movie'));
        if (Array.isArray(data) && this.rows) data = this.rows.slice(0, data.length);
      }
      return original.call(this, data);
    };
    wrapped._traktPlusRelated = true;
    items.onBuild = wrapped;
    // A cached full page may finish before the plugins' app-ready handlers.
    // Keep the native row and item arrays aligned when attaching after that build.
    function attachCurrent() {
      var active = Lampa.Activity.active();
      var comp = active && active.component === 'full' && active.activity && active.activity.component;
      if (!comp || !comp.rows || !comp.props || !cfg().enable || !cfg().fullRows || !token()) return;
      var movie = comp.props.get('movie');
      if (!movie || comp._traktPlusRelatedInserted) return;
      insertFullRelatedRow(comp, movie);
      var index = comp.rows.findIndex(function (row) { return Array.isArray(row) && row[1] && row[1].trakt_related; });
      if (index < 0 || index >= comp.items.length) return;
      var before = comp.items[index];
      comp.fragment = document.createDocumentFragment();
      comp.emit('createAndAppend', comp.rows[index]);
      var item = comp.items.pop();
      comp.items.splice(index, 0, item);
      before.render(true).before(item.render(true));
      if (comp.active >= index) comp.active++;
      Lampa.Layer.visible(comp.scroll.render(true));
    }
    setTimeout(attachCurrent, 0);
    setTimeout(attachCurrent, 1000);
  }

  // The star remains an optional fallback when the inline row is disabled.
  function hookFull() {
    Lampa.Listener.follow('full', function (e) {
      if (!e || e.type !== 'complite') return;
      try {
        var g = cfg();
        if (!g.enable || g.fullRows || !g.fullButton || !token()) return;
        var $ = window.$ || window.jQuery;
        var card = e.data && (e.data.movie || e.data.card);
        if (!$ || !card || !card.id || !e.object || !e.object.activity) return;
        var render = e.object.activity.render();
        var box = render.find('.full-start-new__buttons, .full-start__buttons').eq(0);
        if (!box.length || box.find('.trakt-plus-btn').length) return;
        var ico = '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M12 2l2.9 6.9L22 9.6l-5.4 4.7L18.2 22 12 18.3 5.8 22l1.6-7.7L2 9.6l7.1-.7z"/></svg>';
        var btn = $('<div class="full-start__button selector trakt-plus-btn">' + ico + '<span>' + tr('Trakt: подібні', 'Trakt: similar') + '</span></div>');
        btn.on('hover:enter', function () {
          var kind = cardKind(card);
          var title = card.title || card.name || '';
          var def = relatedDef(kind, card.id, title);
          openMore(def, defTitle(def));
        });
        box.append(btn);
        setTimeout(decorateAll, 800);
      } catch (x) {}
    });
  }

  // ───────────── РОЗУМНІ РЕКОМЕНДАЦІЇ ─────────────
  var recCache = { t: 0, key: '', list: null };

  function smartRecs() {
    var g = cfg();
    var ignoreWl = bool('trakt_source_ignore_watchlisted', false) ? 'true' : 'false';
    var key = [g.recType, g.minRating, g.minVotes, g.exclude.join(), g.hideWatched, g.hideShows, ignoreWl].join('|');
    if (recCache.list && recCache.key === key && Date.now() - recCache.t < 20 * 60000) {
      return Promise.resolve(recCache.list);
    }
    var extra = { ignore_collected: ignoreWl, ignore_watchlisted: ignoreWl };
    var jobs = [];
    function one(path, hint) {
      return api.get(feed(path, extra)).then(function (a) { return Array.isArray(a) ? a : []; }, function () { return []; })
        .then(function (arr) { return arr.map(function (e) { return toCard(e, hint); }).filter(Boolean); });
    }
    if (g.recType !== 'shows') jobs.push(one('/recommendations/movies', 'movie'));
    if (g.recType !== 'movies') jobs.push(one('/recommendations/shows', 'show'));
    return Promise.all([loadWatched(), Promise.all(jobs)]).then(function (r) {
      var all = [];
      r[1].forEach(function (a) { all = all.concat(a); });
      var list = rank(uniq(all).filter(function (c) { return passes(c); }));
      recCache = { t: Date.now(), key: key, list: list };
      return list;
    });
  }

  function patchRecommendations() {
    var orig = api.recommendations;
    if (typeof orig !== 'function' || orig._tp) return;
    api.recommendations = function (options) {
      var self = this;
      if (!cfg().enable || !token()) return orig.call(self, options);
      options = options || {};
      var page = Math.max(1, parseInt(options.page, 10) || 1);
      var limit = Math.max(1, parseInt(options.limit, 10) || 36);
      return smartRecs().then(function (list) {
        var total = list.length;
        return {
          results: list.slice((page - 1) * limit, page * limit),
          total: total,
          total_pages: Math.max(1, Math.ceil(total / limit)),
          page: page
        };
      }).catch(function () { return orig.call(self, options); });
    };
    api.recommendations._tp = true;
  }

  // ───────────── СТОРІНКИ: «ЩЕ» ТА ПАПКА ─────────────
  function libTitle() {
    var n = (Lampa.Storage.get('trakt_plus_library') || []).length;
    return tr('Trakt: Переглянуті', 'Trakt: Watched') + (n ? ' (' + n + ')' : '');
  }

  function openLibrary() {
    Lampa.Activity.push({ url: '', title: libTitle(), component: 'trakt_plus_library', page: 1 });
  }

  function registerLibrary() {
    Lampa.Component.add('trakt_plus_library', function (object) {
      var comp = Lampa.Maker.make('Category', object);
      var PAGE = 60, nextPage = 2, lib = [];
      function pageCards(p) {
        return lib.slice((p - 1) * PAGE, p * PAGE).map(function (x) {
          var poster = x.p ? 'https://' + x.p : '';
          return {
            component: 'full', source: 'tmdb', id: x.i, ids: { tmdb: x.i },
            title: x.t, original_title: x.t, release_date: x.y ? String(x.y) : '',
            poster: poster, img: poster, image: poster, background_image: poster,
            vote_average: 0, method: 'movie', card_type: 'movie', type: 'movie', media_type: 'movie', _lib: true
          };
        });
      }
      comp.use({
        onCreate: function () {
          var self = this;
          lib = Lampa.Storage.get('trakt_plus_library') || [];
          if (!lib.length) {
            self.empty();
            notify(tr('Папка порожня. Зробіть імпорт: Налаштування → Trakt+', 'Folder is empty. Run import: Settings → Trakt+'));
            return;
          }
          self.build({ results: pageCards(1), total_pages: Math.ceil(lib.length / PAGE), page: 1 });
        },
        onNext: function (resolve, reject) {
          var tp = Math.ceil(lib.length / PAGE);
          if (nextPage > tp) return reject.call(this);
          var pg = nextPage++;
          resolve.call(this, { results: pageCards(pg), total_pages: tp, page: pg });
        },
        onInstance: function (card, element) {
          card.use({ onlyMenu: false, onlyEnter: function () { openFull(element); } });
        }
      });
      return comp;
    });
  }

  var menuTries = 0;
  function addMenuItem() {
    var $ = window.$ || window.jQuery;
    if (!$) return;
    var list = $('.menu .menu__list').eq(0);
    if (!list.length) {
      if (++menuTries < 40) setTimeout(addMenuItem, 500);
      return;
    }
    if ($('.menu [data-action="trakt_plus_library"]').length) return;
    var ico = '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>';
    var li = $('<li class="menu__item selector" data-action="trakt_plus_library"><div class="menu__ico">' + ico +
      '</div><div class="menu__text">' + tr('Trakt: Переглянуті', 'Trakt: Watched') + '</div></li>');
    li.on('hover:enter', openLibrary);
    var fav = list.find('[data-action="favorite"]').first();
    if (fav.length) fav.after(li); else list.append(li);
  }

  function createFullPager(def, initial) {
    var seen = {}, pending = [], chunk = initial.nextChunk || 2;
    var done = !!initial.exhausted;
    function append(cards) {
      (cards || []).forEach(function (card) {
        var key = card.method + ':' + card.id;
        if (seen[key]) return;
        seen[key] = true;
        pending.push(card);
      });
    }
    append(initial.cards);
    return {
      hasMore: function () { return pending.length > 0 || !done; },
      take: function (limit) {
        var tries = 0;
        function step() {
          if (done || pending.length >= limit || tries++ >= FULL_SCAN) {
            return Promise.resolve(pending.splice(0, limit));
          }
          return loadChunk(def, chunk, true).then(function (r) {
            append(r.cards);
            // Partial/error responses must be retried at the same source page.
            if (r.errs) return pending.splice(0, limit);
            chunk++;
            if (!r.raw && !r.moreSources) done = true;
            return step();
          }, function () { return pending.splice(0, limit); });
        }
        return step();
      }
    };
  }

  function registerView() {
    if (!Lampa.Maker || !Lampa.Component) return;
    registerLibrary();
    Lampa.Component.add('trakt_plus_view', function (object) {
      var comp = Lampa.Maker.make('Category', object);
      var def = ROWS[object.row];
      var pager = null, next = 2;

      comp.use({
        onCreate: function () {
          var self = this;
          if (!def) { self.empty(); return; }
          getRow(def).then(function (r) {
            pager = createFullPager(def, r);
            return pager.take(FULL_FIRST).then(function (cards) {
              if (self.destroyed) return;
              if (!cards.length) { self.empty(); return; }
              try {
                self.build({ results: cards, total_pages: pager.hasMore() ? 2 : 1, page: 1 });
              } catch (err) { self.empty(); }
            });
          }, function () { self.empty(); });
        },
        onNext: function (resolve, reject) {
          var self = this;
          if (!def || !pager || !pager.hasMore()) return reject.call(self);
          pager.take(FULL_PAGE).then(function (res) {
            if (self.destroyed) return;
            if (!res.length) {
              self.object.page = next - 1;
              if (!pager.hasMore()) self.total_pages = next - 1;
              return reject.call(self);
            }
            var pg = next++;
            // Lampa Category.Next ignores new_data.total_pages: update the instance too.
            self.total_pages = pager.hasMore() ? pg + 1 : pg;
            self.object.page = pg;
            resolve.call(self, { results: res, total_pages: self.total_pages, page: pg });
          }, function () { self.object.page = next - 1; reject.call(self); });
        },
        onInstance: function (card, element) {
          card.use({ onlyMenu: false, onlyEnter: function () { openFull(element); } });
        }
      });
      return comp;
    });
  }

  // ───────────── СИНХРОНІЗАТОР ─────────────
  function cardFromWatched(item) {
    var m = item && item.movie;
    if (!m || !m.ids || !m.ids.tmdb) return null;
    var poster = img(m, 'poster');
    var fan = img(m, 'fanart');
    var title = m.title || '';
    return {
      id: m.ids.tmdb,
      ids: { tmdb: m.ids.tmdb, trakt: m.ids.trakt, imdb: m.ids.imdb },
      title: title,
      original_title: title,
      release_date: m.year ? String(m.year) : '',
      poster: poster, img: poster,
      background_image: fan, image: fan,
      vote_average: 0,
      method: 'movie', type: 'movie', card_type: 'movie', media_type: 'movie', source: 'tmdb'
    };
  }

  function cardFromWatchedShow(item) {
    var m = item && item.show;
    if (!m || !m.ids || !m.ids.tmdb) return null;
    var poster = img(m, 'poster');
    var fan = img(m, 'fanart') || poster;
    var title = m.title || m.name || '';
    var date = m.first_aired ? String(m.first_aired).slice(0, 10) : (m.year ? String(m.year) : '');
    return {
      id: m.ids.tmdb,
      ids: { tmdb: m.ids.tmdb, trakt: m.ids.trakt, imdb: m.ids.imdb },
      title: title,
      name: title,
      original_title: m.title || title,
      original_name: m.title || title,
      release_date: date,
      first_air_date: date,
      poster: poster, img: poster,
      background_image: fan, image: fan,
      vote_average: 0,
      method: 'tv', type: 'tv', card_type: 'tv', media_type: 'tv', source: 'tmdb'
    };
  }

  function syncedKey(card) {
    return (cardKind(card) === 'show' ? 'tv:' : 'movie:') + String(card.id || (card.ids && card.ids.tmdb) || '');
  }

  function syncedSet(list) {
    var out = {};
    (list || []).forEach(function (value) {
      var key = String(value);
      // Сумісність зі старим кешем, де зберігалися лише числові ID фільмів.
      if (key.indexOf(':') < 0) key = 'movie:' + key;
      out[key] = 1;
    });
    return out;
  }

  var HIST_PAGE = 100;

  function pagedWatchedMovies(images, cancel) {
    return getRetry('/sync/watched/movies' + (images ? '?extended=full,images' : ''), 0, cancel)
      .then(function (a) { return strictList(a, 'movie'); });
  }

  function pagedHistory(images, onProgress, cancel) {
    var acc = [], seenEvents = {}, pageCount = 0;
    function go(page) {
      checkCancelled(cancel);
      if (++pageCount > 10000) return Promise.reject(new Error('History pagination limit'));
      var q = '/sync/history/movies?page=' + page + '&limit=' + HIST_PAGE + (images ? '&extended=full,images' : '');
      return getRetry(q, 0, cancel).then(function (value) {
        var arr = strictList(value, 'movie');
        arr.forEach(function (it) {
          if (it.id === undefined || it.id === null || seenEvents[it.id]) throw new Error('Repeated or missing history event ID');
          seenEvents[it.id] = 1;
        });
        acc = acc.concat(arr);
        if (onProgress) onProgress(acc.length);
        if (arr.length < HIST_PAGE) return acc;
        return go(page + 1);
      });
    }
    return go(1);
  }

  function mergeWatched(a, hist) {
    var map = {}, out = [];
    function put(it, ts) {
      var m = it && it.movie;
      if (!m || !m.ids || !m.ids.tmdb) return;
      var k = m.ids.tmdb;
      if (map[k]) {
        if (ts && String(ts) > String(map[k].last_watched_at || '')) map[k].last_watched_at = ts;
        if (!img(map[k].movie, 'poster') && img(m, 'poster')) map[k].movie = m;
        return;
      }
      map[k] = { movie: m, last_watched_at: ts || '' };
      out.push(map[k]);
    }
    a.forEach(function (it) { put(it, it.last_watched_at); });
    hist.forEach(function (it) { put(it, it.watched_at || it.last_watched_at); });
    return out;
  }

  function fetchAllMerged(opts) {
    opts = opts || {};
    return Promise.all([
      pagedWatchedMovies(opts.images, opts.cancel),
      pagedHistory(opts.images, opts.progress, opts.cancel)
    ]).then(function (res) {
      return { list: mergeWatched(res[0], res[1]), a: res[0].length, h: res[1].length,
        unmapped: res[0].concat(res[1]).filter(function (it) { return !it.movie.ids.tmdb; }).length };
    });
  }

  function saveLibrary(list) {
    var lib = list.map(function (it) {
      var m = it.movie;
      return { i: m.ids.tmdb, t: m.title || '', y: m.year || 0,
        p: img(m, 'poster').replace(/^https?:\/\//, ''), w: String(it.last_watched_at || '') };
    });
    var previous = Lampa.Storage.get('trakt_plus_library') || [], byId = {};
    previous.concat(lib).forEach(function (it) {
      var old = byId[it.i];
      if (!old || String(it.w || '') >= String(old.w || '')) byId[it.i] = it;
    });
    lib = Object.keys(byId).map(function (id) { return byId[id]; });
    lib.sort(function (x, y) { return String(y.w || '').localeCompare(String(x.w || '')); });
    try {
      Lampa.Storage.set('trakt_plus_library', lib);
      Lampa.Storage.set('trakt_plus_library_t', Date.now());
      return lib.length;
    } catch (e) { return 0; }
  }

  function syncWatched(manual) {
    observeSession();
    if (syncing) return Promise.resolve({ status: 'busy' });
    if (!token() || !Lampa.Favorite) { statusPhase = 'unavailable'; return Promise.resolve({ status: 'unavailable' }); }
    syncing = true; statusPhase = 'loading';
    var session = sessionEpoch, ticket = { manual: !!manual }; activeSync = ticket;
    var epoch = ++readEpoch, stopped = false, result = { status: 'loading', added: 0, skipped: 0, removed: 0 };
    var mine = syncedSet(Lampa.Storage.get('trakt_plus_synced') || []), changed = false;
    var cancel = sessionCancel(session, epoch, function () { return stopped; });
    if (manual && Lampa.Loading) Lampa.Loading.start(function () { stopped = true; cancel.listeners.slice().forEach(function (abort) { abort(); }); }, tr('Завантаження переглянутого з Trakt…', 'Loading watched from Trakt…'));
    var beforeStamp;
    return whenApi().then(function () {
      checkCancelled(cancel); return waitForSession(ensureAccount(true), cancel);
    }).then(function () {
      checkCancelled(cancel); statusPhase = 'loading';
      return getRetry('/sync/last_activities', 0, cancel);
    }).then(function (a) {
      beforeStamp = activityStamp(a);
      if (beforeStamp === null) throw new Error('Missing activity snapshot');
      return Promise.all([fetchAllMerged({ images: true, cancel: cancel }), fetchShows(cancel, true)]);
    }).then(function (r) {
      return getRetry('/sync/last_activities', 0, cancel).then(function (a) {
        if (activityStamp(a) !== beforeStamp) throw new Error('Trakt changed during sync; retry');
        checkCancelled(cancel);
        var data = r[0], shows = r[1], cards = data.list.map(cardFromWatched).filter(Boolean);
        shows.forEach(function (it) { if (showEvidence(it).complete) { var c = cardFromWatchedShow(it); if (c) cards.push(c); } });
        if (cards.length > MAX_WATCHED) throw new Error('Import size limit; nothing committed');
        result.movies = data.list.length; result.shows = shows.length; result.unmapped = data.unmapped;
        result.unknownShows = shows.filter(function (it) { return !showEvidence(it).known; }).length;
        return new Promise(function (resolve, reject) {
          var i = 0;
          function step() {
            try {
              checkCancelled(cancel);
              var end = Math.min(i + 25, cards.length);
              for (; i < end; i++) {
                checkCancelled(cancel);
                var c = cards[i], key = syncedKey(c), st = Lampa.Favorite.check(c) || {};
                if (st.viewed || MARK_TYPES.some(function (t) { return st[t]; })) { result.skipped++; continue; }
                Lampa.Favorite.add('viewed', c);
                mine[key] = 1; changed = true; result.added++;
              }
              if (i < cards.length) return setTimeout(step, 0);
              checkCancelled(cancel);
              // Deliberately no Favorite.remove: local marks and earlier successful imports
              // are not evidence of permission to propagate remote unwatch/deletions.
              if (changed) { Lampa.Storage.set('trakt_plus_synced', Object.keys(mine)); }
              var libCount = saveLibrary(data.list);
              if (!libCount && (data.list.length || (Lampa.Storage.get('trakt_plus_library') || []).length)) throw new Error('Could not save watched library');
              acceptWatched(data.list, shows, beforeStamp, data.unmapped);
              persistWatched();
              if (!result.unknownShows) {
                Lampa.Storage.set('trakt_plus_last_sync_owner', accountOwner);
                Lampa.Storage.set('trakt_plus_last_sync', Date.now());
              }
              result.status = result.unknownShows ? 'partial' : 'complete';
              emitWatched(); clearRowCaches(); decorateAll(); resolve(result);
            } catch (e) { reject(e); }
          }
          step();
        });
      });
    }).catch(function (e) {
      result.status = (e && e.cancelled) || cancel() ? 'cancelled' : 'failed';
      // Preserve provenance for additions already committed before a user cancellation.
      // Never overwrite it with an empty/partial set or advance last_sync on failure.
      if (changed && session === sessionEpoch) { try { Lampa.Storage.set('trakt_plus_synced', Object.keys(mine)); } catch (ignore) {} }
      return result;
    }).then(function (r) {
      releaseSession(cancel);
      if (activeSync !== ticket) return r;
      activeSync = null; syncing = false; lastSyncResult = r;
      if (r.status !== 'complete' && r.status !== 'partial') statusPhase = r.status === 'cancelled' ? 'cancelled' : 'error';
      if (manual && Lampa.Loading) Lampa.Loading.stop();
      if (manual) notify(r.status === 'complete'
        ? tr('Trakt: додано ', 'Trakt: added ') + r.added + tr(', пропущено ', ', skipped ') + r.skipped + tr('. Видалень немає.', '. No deletions.')
        : tr('Синхронізацію не завершено. Попередні записи збережено.', 'Sync incomplete. Previous entries retained.'));
      return r;
    });
  }

  function scheduleAutoSync() {
    setTimeout(function () {
      if (!cfg().enable || !cfg().autosync || !token()) return;
      var last = Number(Lampa.Storage.get('trakt_plus_last_sync') || 0);
      observeSession();
      if (!accountOwner || Lampa.Storage.get('trakt_plus_last_sync_owner') !== accountOwner || Date.now() - last > AUTO_SYNC_HOURS * 3600000) syncWatched(false);
    }, 20000);
  }

  // ───────────── ПОЗНАЧКИ НА КАРТКАХ ─────────────
  function isMarked(d, g) {
    var id = d.id || (d.ids && d.ids.tmdb);
    if (!id) return false;
    if (cardKind(d) === 'show') return !!(g.markShows && watchStatus(d) === true);
    return watchStatus(d) === true;
  }

  function decorate(node, data, g) {
    if (!node || !node.classList || !data) return;
    g = g || cfg();
    var yd = !!window.YDesignLoaded; // YDesign rules are intentionally unchanged until Issue #8.
    if (!yd && g.mark && !data._lib && (cardKind(data) !== 'show' || g.markShows) && watchStatus(data) === null) return;
    var on = !!(!yd && g.mark && !data._lib && isMarked(data, g));
    var view = node.querySelector ? node.querySelector('.card__view') : null;
    if (on) {
      node.classList.add('trakt-plus-watched');
      if (view && !view.querySelector('.trakt-plus-badge')) {
        var b = document.createElement('div');
        b.className = 'trakt-plus-badge';
        b.textContent = '✓ Trakt';
        view.appendChild(b);
      }
    } else if (node.classList.contains('trakt-plus-watched')) {
      node.classList.remove('trakt-plus-watched');
      var old = view ? view.querySelector('.trakt-plus-badge') : null;
      if (old && old.parentNode) old.parentNode.removeChild(old);
    }
  }

  function decorateAll() {
    if (window.YDesignLoaded && !document.querySelector('.trakt-plus-watched')) return; // нічого знімати й малювати
    try {
      var g = cfg();
      var nodes = document.querySelectorAll('.card');
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        var d = el.card_data || (window.jQuery ? window.jQuery(el).data('card') : null);
        if (d) decorate(el, d, g);
      }
    } catch (e) {}
  }

  function hookDecorations() {
    Lampa.Listener.follow('line', function (e) {
      if (!e || !Array.isArray(e.items)) return;
      if (['append', 'visible', 'toggle'].indexOf(e.type) < 0) return;
      e.items.forEach(function (ci) {
        try { if (ci && ci.data && ci.render) decorate(ci.render(true), ci.data); } catch (x) {}
      });
    });
    var timer = null;
    try {
      new MutationObserver(function (muts) {
        // реагуємо лише коли з'явились нові картки (YDesign постійно дописує у DOM — не скануємо на кожну дрібницю)
        var hasCard = false;
        for (var i = 0; i < muts.length && !hasCard; i++) {
          var add = muts[i].addedNodes;
          for (var j = 0; j < add.length; j++) {
            var n = add[j];
            if (n.nodeType !== 1) continue;
            if ((n.classList && n.classList.contains('card')) || (n.querySelector && n.querySelector('.card'))) { hasCard = true; break; }
          }
        }
        if (!hasCard) return;
        clearTimeout(timer);
        timer = setTimeout(function () {
          decorateAll();
          loadWatched().then(function (changed) { if (changed) { clearRowCaches(); decorateAll(); } });
        }, 300);
      }).observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  }

  function injectStyle() {
    var css = '' +
      '.trakt-plus-watched .card__view{position:relative}' +
      '.trakt-plus-watched .card__img{opacity:.4 !important;-webkit-filter:grayscale(.5) !important;filter:grayscale(.5) !important}' +
      '.trakt-plus-watched .card__view::before{content:"";position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.45);z-index:3;pointer-events:none;border-radius:inherit}' +
      '.trakt-plus-watched .card__view::after{content:"";position:absolute;left:0;right:0;bottom:0;height:.35em;background:#37ff54;z-index:4;pointer-events:none}' +
      '.trakt-plus-badge{position:absolute;top:.5em;left:.5em;z-index:5;padding:.15em .5em;font-size:.85em;line-height:1.3;font-weight:700;' +
      'color:#37ff54;background:rgba(0,0,0,.7);border-radius:.4em;pointer-events:none}' +
      '.trakt-plus-btn svg{width:1.6em;height:1.6em;margin-right:.4em}';
    var s = document.createElement('style');
    s.setAttribute('data-trakt-plus', '1');
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ───────────── НАЛАШТУВАННЯ ─────────────
  function initSettings() {
    if (!Lampa.SettingsApi) return;
    var icon = '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l2.9 6.9L22 9.6l-5.4 4.7L18.2 22 12 18.3 5.8 22l1.6-7.7L2 9.6l7.1-.7z"/></svg>';
    Lampa.SettingsApi.addComponent({ component: 'trakt_plus', name: 'Trakt+', icon: icon, before: 'interface' });

    function add(param, name, descr, onChange) {
      Lampa.SettingsApi.addParam({
        component: 'trakt_plus',
        param: param,
        field: { name: name, description: descr || '' },
        onChange: function (v) { cfgCache = null; clearRowCaches(); if (onChange) onChange(v); }
      });
    }

    add({ name: 'trakt_plus_enable', type: 'trigger', 'default': true },
      tr('Увімкнути Trakt+', 'Enable Trakt+'),
      tr('Розумні рекомендації та додаткові рядки', 'Smart recommendations and extra rows'));
    add({ name: 'trakt_plus_hide_watched', type: 'trigger', 'default': true },
      tr('Ховати переглянуті фільми', 'Hide watched movies'),
      tr('Не показувати у рядках фільми, вже відмічені на Trakt', 'Hide movies already watched on Trakt'));
    add({ name: 'trakt_plus_hide_shows', type: 'trigger', 'default': true },
      tr('Ховати серіали, які вже дивився', 'Hide shows already watched'),
      tr('Серіал вважається переглянутим, якщо в Trakt є хоч одна серія', 'A show counts as watched if Trakt has any episode'));
    add({ name: 'trakt_plus_rec_type', type: 'select', 'default': 'movies',
      values: { movies: tr('Тільки фільми', 'Movies only'), shows: tr('Тільки серіали', 'Shows only'), both: tr('Фільми та серіали', 'Movies & shows') } },
      tr('Рекомендації: що показувати', 'Recommendations: content'));
    add({ name: 'trakt_plus_min_rating', type: 'select', 'default': '6.5',
      values: { '0': tr('Без фільтра', 'No filter'), '6': '6.0', '6.5': '6.5', '7': '7.0', '7.5': '7.5', '8': '8.0' } },
      tr('Мінімальний рейтинг Trakt', 'Minimum Trakt rating'));
    add({ name: 'trakt_plus_min_votes', type: 'select', 'default': '500',
      values: { '0': tr('Без фільтра', 'No filter'), '100': '100', '500': '500', '1000': '1000', '3000': '3000', '10000': '10000' } },
      tr('Мінімум голосів', 'Minimum votes'),
      tr('Відсікає маловідомі фільми з випадковим рейтингом', 'Cuts obscure titles with unreliable ratings'));
    add({ name: 'trakt_plus_exclude_genres', type: 'input', values: '', 'default': DEFAULT_EXCLUDE, placeholder: DEFAULT_EXCLUDE },
      tr('Виключені жанри (slug через кому)', 'Excluded genres (comma-separated slugs)'),
      'reality, talk-show, news, game-show, soap, ...');
    add({ name: 'trakt_plus_row_limit', type: 'select', 'default': '30',
      values: { '20': '20', '30': '30', '40': '40', '60': '60', '100': '100' } },
      tr('Карток у рядку на головній', 'Cards per home row'));
    add({ name: 'trakt_plus_more', type: 'trigger', 'default': true },
      tr('Кнопка «Ще» у рядках', '"More" button in rows'),
      tr('Відкриває повну сторінку з підгрузкою', 'Opens a full page with infinite loading'));
    add({ name: 'trakt_plus_cache_min', type: 'select', 'default': '10',
      values: { '2': tr('2 хв', '2 min'), '10': tr('10 хв', '10 min'), '30': tr('30 хв', '30 min'), '60': tr('60 хв', '60 min') } },
      tr('Кеш рядків', 'Row cache'));
    add({ name: 'trakt_plus_trend_hide_watched', type: 'trigger', 'default': false },
      tr('Ховати переглянуте у "Зараз дивляться"', 'Hide watched in "Watching now"'),
      tr('Вимкнено: переглянуті лишаються, але з позначкою Trakt', 'Off: watched items stay, marked with Trakt badge'));
    add({ name: 'trakt_plus_mark', type: 'trigger', 'default': true },
      tr('Позначати переглянуті фільми', 'Mark watched movies'),
      tr('Затемнення + зелена риска + бейдж Trakt', 'Dimmed + green line + Trakt badge'));
    add({ name: 'trakt_plus_mark_shows', type: 'trigger', 'default': true },
      tr('Позначати переглянуті серіали', 'Mark watched shows'),
      tr('Так само, як для фільмів', 'Same as for movies'));
    add({ name: 'trakt_plus_full_rows', type: 'trigger', 'default': true },
      tr('У картці: блок «Подібні (Trakt)»', 'In card: "Similar (Trakt)" row'),
      tr('Після колекції, перед рекомендаціями та подібними TMDB', 'After collection, before TMDB recommendations and similar titles'));
    add({ name: 'trakt_plus_full_button', type: 'trigger', 'default': true },
      tr('У картці: кнопка «Trakt: подібні»', 'In card: "Trakt: similar" button'),
      tr('Показується, коли блок «Подібні (Trakt)» вимкнено', 'Shown when the Similar (Trakt) row is disabled'));
    add({ name: 'trakt_plus_auto_home', type: 'trigger', 'default': true },
      tr('Автоматично оновити головну, якщо рядки не з’явились', 'Auto-reload home if rows did not appear'));
    add({ name: 'trakt_plus_autosync', type: 'trigger', 'default': true },
      tr('Авто-синхронізація переглянутих', 'Auto-sync watched'),
      tr('Раз на ' + AUTO_SYNC_HOURS + ' год. при запуску', 'Every ' + AUTO_SYNC_HOURS + 'h on startup'));
    add({ name: 'trakt_plus_sync_now', type: 'button' },
      tr('Синхронізувати переглянуті з Trakt зараз', 'Sync watched from Trakt now'),
      tr('Вибране → Переглянуті', 'Favorites → Viewed'),
      function () { syncWatched(true); });
    add({ name: 'trakt_plus_open_library', type: 'button' },
      tr('Відкрити папку "Trakt: Переглянуті"', 'Open "Trakt: Watched" folder'), '',
      function () { openLibrary(); });
    add({ name: 'trakt_plus_status', type: 'button' },
      tr('Стан: скільки переглянутого відомо', 'Status: known watched counts'),
      tr('Якщо 0 — натисніть «Скинути кеш»', 'If 0 — press "Reset cache"'),
      function () {
        loadWatched().then(function () {
          if (statusPhase !== 'ready') return notify(tr('Статус Trakt поки невідомий', 'Trakt status is not known yet'));
          notify(tr('Фільмів: ', 'Movies: ') + Object.keys(verifiedMovies).length + tr(', завершених серіалів: ', ', completed shows: ') + Object.keys(completedShows()).length);
        });
      });
    add({ name: 'trakt_plus_reset_cache', type: 'button' },
      tr('Скинути кеш Trakt+', 'Reset Trakt+ cache'), '',
      function () {
        Lampa.Storage.set('trakt_plus_watched_cache', null);
        watchedPromise = null;
        watchedMovies = {};
        watchedShows = {};
        showStates = {}; showSources = {}; verifiedMovies = {}; movieStatusReady = showStatusReady = false; statusPhase = 'idle'; statusAt = 0; progressQueue = []; clearTimeout(progressNotifyTimer); readEpoch++;
        watchedStamp = '';
        watchedVer++;
        lastCheck = 0;
        recCache = { t: 0, key: '', list: null };
        clearRowCaches();
        loadWatched(true).then(function () {
          decorateAll();
          notify(tr('Кеш скинуто. Фільмів: ', 'Cache cleared. Movies: ') + Object.keys(verifiedMovies).length + tr(', завершених серіалів: ', ', completed shows: ') + Object.keys(completedShows()).length);
        });
      });
  }

  // ───────────── СТАРТ ─────────────
  function reopenMain() {
    var $ = window.$ || window.jQuery;
    try {
      var item = $ ? $('.menu [data-action="main"]').first() : null;
      if (item && item.length) { item.trigger('hover:enter'); return; }
    } catch (e) {}
    try {
      var src = Lampa.Storage.field('source');
      var o = { url: '', title: 'Main', component: 'main', source: src, page: 1 };
      if (Lampa.Activity.replace) Lampa.Activity.replace(o); else Lampa.Activity.push(o);
    } catch (e) {}
  }

  function ensureHome() {
    function check() {
      try {
        var a = Lampa.Activity && Lampa.Activity.active && Lampa.Activity.active();
        if (a && a.component === 'main' && !rowCalled && cfg().enable && cfg().autoHome && token()) {
          rowCalled = true;
          reopenMain();
        }
      } catch (e) {}
    }
    setTimeout(check, 1500);
    setTimeout(check, 4000);
    setTimeout(check, 8000);
    setTimeout(check, 15000);
  }

  // Міст для інших плагінів (YDesign): чи фільм переглянутий на Trakt. Доступний одразу, ще до boot().
  window.TraktPlus = window.TraktPlus || {};
  // Status is independent of UI mark/hide preferences and local Favorite/Timeline.
  // null = not known (loading/error/stale/insufficient completion evidence).
  window.TraktPlus.version = '3.2.1-issue7-account';
  window.TraktPlus.syncWatched = function () { return syncWatched(true); };
  window.TraktPlus.syncStatus = function () { return lastSyncResult; };
  window.TraktPlus.isWatched = watchStatus;
  window.TraktPlus.isWatchedShow = function (card) {
    return cardKind(card) === 'show' ? watchStatus(card) : null;
  };
  window.TraktPlus.watchedStatus = function (card) {
    var value = watchStatus(card);
    var phase = !token() ? 'unavailable' : !freshStatus(statusAt) && statusAt ? 'expired' : statusPhase;
    if (value === null && phase === 'ready') {
      var id = tmdbId(card), r = showStates[id];
      phase = cardKind(card) === 'show' && r && r.error ? 'error' : progressPending[id] ? 'loading' : 'unknown';
    }
    return { value: value, source: 'trakt', phase: phase, updatedAt: statusAt || null };
  };

  // One auth subscription for this plugin lifetime (the module guard prevents
  // duplicate registration). Reads and every async boundary also check sessions.
  if (Lampa.Storage.listener && Lampa.Storage.listener.follow) Lampa.Storage.listener.follow('change', onAccountStorage);
  if (window.addEventListener) window.addEventListener('storage', onAccountStorage);

  // Рядки реєструємо ОДРАЗУ (до готовності додатку), щоб головна їх одразу підхопила
  try { registerRows(); } catch (e) {}

  var tries = 0, booted = false;
  function boot() {
    if (booted) return;
    api = window.TraktTV && window.TraktTV.api;
    if (!api) {
      tries++;
      if (tries < 60) setTimeout(boot, 500);
      return;
    }
    booted = true;
    try { hydrateWatched(); } catch (e) {}
    try { injectStyle(); } catch (e) {}
    try { initSettings(); } catch (e) {}
    try { patchRecommendations(); } catch (e) {}
    try { registerView(); } catch (e) {}
    try { addMenuItem(); } catch (e) {}
    try { hookDecorations(); } catch (e) {}
    try { hookFullRows(); } catch (e) {}
    try { hookFull(); } catch (e) {}

    loadWatched().then(function () { decorateAll(); });
    scheduleAutoSync();
    ensureHome();
  }

  if (window.appready) boot();
  else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') boot(); });
})();
