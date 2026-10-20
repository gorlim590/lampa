/*
 * TraktTV Plus v3 — надбудова для TraktTV.js (Lampa)
 * Підключати ПІСЛЯ TraktTV.js.
 *
 *  - рядки на головній: «Зараз дивляться» (фільми / серіали / мультфільми+мульти-серіали / аніме+аніме-фільми),
 *    жанрові, «бо ти дивився X», приховані перлини, топ, свіже, очікувані, класика, документальні, нові серіали…
 *  - кнопка «Ще» відкриває повну сторінку з нескінченною підгрузкою (посторінково з Trakt)
 *  - у картці фільму/серіалу: блок «Подібні (Trakt)» + кнопка «Trakt: подібні»
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

  var TREND_ROWS = [
    { key: 'movies', uk: 'Зараз дивляться: фільми', en: 'Watching now: movies', index: 1,
      loads: [{ p: '/movies', hint: 'movie' }], skip: ['animation', 'anime'] },
    { key: 'shows', uk: 'Зараз дивляться: серіали', en: 'Watching now: TV shows', index: 2,
      loads: [{ p: '/shows', hint: 'show' }], skip: ['animation', 'anime'] },
    { key: 'cartoons', uk: 'Зараз дивляться: мультфільми', en: 'Watching now: cartoons', index: 3,
      loads: [{ p: '/movies', hint: 'movie', genre: 'animation' }, { p: '/shows', hint: 'show', genre: 'animation' }],
      genre: 'animation', skip: ['anime'] },
    { key: 'anime', uk: 'Зараз дивляться: аніме', en: 'Watching now: anime', index: 4,
      loads: [{ p: '/movies', hint: 'movie', genre: 'anime' }, { p: '/shows', hint: 'show', genre: 'anime' }],
      genre: 'anime', skip: [] }
  ];

  // Жанрові рядки (фільми). Додавайте свої за зразком.
  var GENRE_ROWS = [
    { slug: 'horror', uk: 'Жахи, які ти ще не бачив', en: "Horror you haven't seen", minRating: 6.0, minVotes: 500, index: 8 },
    { slug: 'thriller', uk: 'Трилери', en: 'Thrillers', minRating: 6.8, minVotes: 1000, index: 9 },
    { slug: 'science-fiction', uk: 'Фантастика', en: 'Sci-Fi', minRating: 6.8, minVotes: 1000, index: 10 },
    { slug: 'comedy', uk: 'Комедії, які ти ще не бачив', en: "Comedies you haven't seen", minRating: 6.8, minVotes: 1500, index: 14 },
    { slug: 'mystery', uk: 'Детективи та містика', en: 'Mystery', minRating: 6.8, minVotes: 800, index: 15 },
    { slug: 'documentary', uk: 'Документальні', en: 'Documentaries', minRating: 7.0, minVotes: 300, index: 16 }
  ];

  var api = null;
  var watchedMovies = {};
  var watchedShows = {};
  var watchedPromise = null;
  var watchedStamp = '';
  var hydrated = false;
  var lastCheck = 0;
  var ROWS = {};
  var syncing = false;
  var rowCalled = false;

  // ───────────── ХЕЛПЕРИ ─────────────
  function lang() { return String(Lampa.Storage.get('language', 'en')); }
  function tr(uk, en) { return lang() === 'uk' ? uk : en; }
  function token() { return Lampa.Storage.get('trakt_token'); }
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
    return [g.hideWatched, g.hideShows, g.trendHide, g.minRating, g.minVotes, g.exclude.join(), Object.keys(watchedMovies).length, Object.keys(watchedShows).length].join('|');
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
      _votes: Number(m.votes || 0),
      _watchers: Number(entry.watchers || entry.watcher_count || 0),
      _genres: Array.isArray(m.genres) ? m.genres : [],
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

  function persistWatched() {
    try {
      Lampa.Storage.set('trakt_plus_watched_cache', {
        t: Date.now(), stamp: watchedStamp, m: Object.keys(watchedMovies), s: Object.keys(watchedShows)
      });
    } catch (e) {}
  }

  function hydrateWatched() {
    if (hydrated) return;
    hydrated = true;
    var c = Lampa.Storage.get('trakt_plus_watched_cache');
    if (c && c.t) {
      watchedMovies = arrToSet(c.m);
      watchedShows = arrToSet(c.s);
      watchedStamp = c.stamp || '';
    }
  }

  function activityStamp(a) {
    if (!a) return null;
    return String((a.movies && a.movies.watched_at) || '') + '|' + String((a.episodes && a.episodes.watched_at) || '');
  }

  function getRetry(path, attempt) {
    attempt = attempt || 0;
    return api.get(path).catch(function (e) {
      if (attempt < 2) {
        return new Promise(function (r) { setTimeout(r, 1500); }).then(function () { return getRetry(path, attempt + 1); });
      }
      throw e;
    });
  }

  // Швидке оновлення множин «переглянуто» (без картинок, без історії)
  function refreshWatched(force) {
    var cached = Lampa.Storage.get('trakt_plus_watched_cache') || {};
    var cachedEmpty = !(cached.m && cached.m.length) && !(cached.s && cached.s.length);
    var tooOld = !cached.t || cachedEmpty || (Date.now() - cached.t) > WATCHED_CACHE_HOURS * 3600000;
    return api.get('/sync/last_activities').then(function (a) { return activityStamp(a); }, function () { return null; })
      .then(function (stamp) {
        var same = stamp !== null && stamp === (cached.stamp || '');
        if (!force && !tooOld && (same || stamp === null)) return false;
        return Promise.all([
          getRetry('/sync/watched/movies').catch(function () { return null; }),
          getRetry('/sync/watched/shows?extended=noseasons').catch(function () { return null; })
        ]).then(function (r) {
          var okM = Array.isArray(r[0]), okS = Array.isArray(r[1]);
          if (okM) watchedMovies = collectIds(r[0], 'movie');
          if (okS) watchedShows = collectIds(r[1], 'show');
          if (okM || okS) {
            // штамп зберігаємо лише коли обидва запити успішні — інакше повторимо наступного разу
            watchedStamp = (okM && okS && stamp !== null) ? stamp : '';
            persistWatched();
          }
          return okM || okS;
        });
      });
  }

  function loadWatched(force) {
    hydrateWatched();
    if (!token()) return Promise.resolve(false);
    var now = Date.now();
    if (!force && watchedPromise && (now - lastCheck) < WATCH_RECHECK_SEC * 1000) return watchedPromise;
    lastCheck = now;
    watchedPromise = whenApi().then(function () { return refreshWatched(force); }).catch(function () { return false; });
    return watchedPromise;
  }

  function isWatched(c) {
    var g = cfg();
    if (c.method === 'tv') return g.hideShows && !!watchedShows[c.id];
    return !!watchedMovies[c.id];
  }

  // ───────────── ФІЛЬТРИ ТА РАНЖУВАННЯ ─────────────
  function passes(c, o) {
    o = o || {};
    var g = cfg();
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

  function loadChunk(def, ch) {
    return whenApi().then(function () {
      return def.prepare ? def.prepare(ch) : null;
    }).then(function () {
      var specs = def.urls(ch) || [];
      return Promise.all([loadWatched(), Promise.all(specs.map(function (s) {
        return api.get(s.u).then(function (a) { return Array.isArray(a) ? a : []; }, function () { return []; })
          .then(function (arr) {
            return { spec: s, raw: arr.length, cards: arr.map(function (e) { return toCard(e, s.hint); }).filter(Boolean) };
          });
      }))]);
    }).then(function (r) {
      var raw = 0;
      r[1].forEach(function (g) { raw += g.raw; });
      return { cards: (def.combine || combineDefault)(r[1], def), raw: raw };
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
      var cards = [], raw = 0;
      res.forEach(function (r) { cards = cards.concat(r.cards); raw += r.raw; });
      cards = uniq(cards);
      var out = { cards: cards, title: defTitle(def), nextChunk: n + 1, exhausted: !raw };
      def._c = out; def._t = Date.now(); def._sig = sig;
      if (def._p === p) def._p = null;
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
        }
      });
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
      name: 'TraktPlusBecause', uk: 'Бо ти дивився…', en: 'Because you watched…', index: 5, chunks: 1,
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

    defs.push({ name: 'TraktPlusGems', uk: 'Приховані перлини', en: 'Hidden gems', index: 6, chunks: 3,
      opts: { minRating: 7.2, minVotes: 300, maxVotes: 15000 },
      urls: function (ch) {
        var s = [{ u: feed('/movies/popular', { page: ch + 1 }), hint: 'movie' }];
        if (ch === 1) s.push({ u: feed('/recommendations/movies', { ignore_collected: 'true' }), hint: 'movie' });
        return s;
      } });

    defs.push({ name: 'TraktPlusTop', uk: 'Топ, який ти ще не бачив', en: 'Top rated you have not seen', index: 7, chunks: 3,
      opts: { minRating: 7.5, minVotes: 3000 },
      urls: function (ch) { return [{ u: feed('/movies/popular', { page: ch }), hint: 'movie' }]; } });

    defs.push({ name: 'TraktPlusFresh', uk: 'Свіже й варте уваги', en: 'Fresh & worth watching', index: 11, chunks: 2,
      opts: { minRating: 6.5, minVotes: 300 },
      urls: function (ch) {
        var yy = (y - 1) + '-' + y;
        return [
          { u: feed('/movies/popular', { years: yy, page: ch }), hint: 'movie' },
          { u: feed('/movies/trending', { years: yy, page: ch }), hint: 'movie' }
        ];
      } });

    defs.push({ name: 'TraktPlusAnticipated', uk: 'Очікувані прем’єри', en: 'Most anticipated', index: 12, chunks: 1, keepOrder: true,
      opts: { minRating: 0, minVotes: 0 },
      urls: function (ch) { return [{ u: feed('/movies/anticipated', { page: ch }), hint: 'movie' }]; } });

    defs.push({ name: 'TraktPlusWeekly', uk: 'Найпопулярніше цього тижня', en: 'Most watched this week', index: 13, chunks: 1, keepOrder: true,
      opts: { minRating: 0, minVotes: 0, hideWatched: false },
      urls: function (ch) { return [{ u: feed('/movies/watched/weekly', { page: ch }), hint: 'movie' }]; } });

    defs.push({ name: 'TraktPlusClassics', uk: 'Класика, яку варто побачити', en: 'Classics worth watching', index: 17, chunks: 2,
      opts: { minRating: 7.6, minVotes: 2000 },
      urls: function (ch) { return [{ u: feed('/movies/popular', { years: '1930-1999', page: ch }), hint: 'movie' }]; } });

    defs.push({ name: 'TraktPlusTopShows', uk: 'Серіали, які ти ще не бачив', en: 'Shows you have not seen', index: 18, chunks: 2,
      opts: { minRating: 7.8, minVotes: 2000 },
      urls: function (ch) {
        var s = [{ u: feed('/shows/popular', { page: ch }), hint: 'show' }];
        if (ch === 1) s.push({ u: feed('/recommendations/shows', { ignore_collected: 'true' }), hint: 'show' });
        return s;
      } });

    defs.push({ name: 'TraktPlusNewShows', uk: 'Нові серіали', en: 'New TV shows', index: 19, chunks: 2,
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
    if (d.method === 'tv' || d.type === 'tv' || d.card_type === 'tv' || d.first_air_date || d.number_of_seasons || (d.name && !d.title)) return 'show';
    return 'movie';
  }

  function openMore(def, title) {
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
    if (g.more && Lampa.Maker) line.onMore = function () { openMore(def, title); };
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
          getRow(def).then(function (r) {
            if (!r.cards || r.cards.length < 4) return call();
            call(lineFor(def, r));
          }).catch(function () { call(); });
        };
      }
    });
  }

  function registerRows() {
    if (!Lampa.ContentRows || typeof Lampa.ContentRows.add !== 'function') return;
    buildDefs().forEach(registerRow);

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
            call(lineFor(def, r));
          }).catch(function () { call(); });
        };
      }
    });
  }

  // ───────────── КНОПКА У КАРТЦІ ─────────────
  function hookFull() {
    Lampa.Listener.follow('full', function (e) {
      if (!e || e.type !== 'complite') return;
      try {
        var g = cfg();
        if (!g.enable || !g.fullButton || !token()) return;
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
            vote_average: 0, method: 'movie', card_type: 'movie', type: 'movie', _lib: true
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

  function registerView() {
    if (!Lampa.Maker || !Lampa.Component) return;
    registerLibrary();
    Lampa.Component.add('trakt_plus_view', function (object) {
      var comp = Lampa.Maker.make('Category', object);
      var def = ROWS[object.row];
      var shown = {}, next = 2, chunk = 2, done = false;

      function gather() {
        var out = [], tries = 0;
        function step() {
          if (done || tries >= 8 || out.length >= 20) return Promise.resolve(out);
          tries++;
          var ch = chunk++;
          return loadChunk(def, ch).then(function (r) {
            if (!r.raw) done = true;
            r.cards.forEach(function (c) {
              var k = c.method + c.id;
              if (shown[k]) return;
              shown[k] = 1;
              out.push(c);
            });
            return step();
          }, function () { done = true; return out; });
        }
        return step();
      }

      comp.use({
        onCreate: function () {
          var self = this;
          if (!def) { self.empty(); return; }
          getRow(def).then(function (r) {
            var cards = r.cards || [];
            if (!cards.length) { self.empty(); return; }
            cards.forEach(function (c) { shown[c.method + c.id] = 1; });
            chunk = r.nextChunk || 2;
            done = !!r.exhausted;
            try {
              self.build({ results: cards, total_pages: done ? 1 : 2, page: 1 });
            } catch (err) { self.empty(); }
          }, function () { self.empty(); });
        },
        onNext: function (resolve, reject) {
          var self = this;
          if (!def || done) return reject.call(self);
          gather().then(function (res) {
            if (!res.length) return reject.call(self);
            var pg = next++;
            resolve.call(self, { results: res, total_pages: done ? pg : pg + 1, page: pg });
          }, function () { reject.call(self); });
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
      method: 'movie', type: 'movie', card_type: 'movie', source: 'tmdb'
    };
  }

  var HIST_PAGE = 100;

  function pagedWatchedMovies(images) {
    // /sync/watched не пагінується на боці Trakt — один запит дає все
    return getRetry('/sync/watched/movies' + (images ? '?extended=images' : '')).then(function (arr) {
      return Array.isArray(arr) ? arr : [];
    }).catch(function () { return []; });
  }

  function pagedHistory(images, onProgress) {
    var acc = [], lastFirst = null;
    function go(page) {
      var q = '/sync/history/movies?page=' + page + '&limit=' + HIST_PAGE + (images ? '&extended=images' : '');
      return getRetry(q).then(function (arr) {
        arr = Array.isArray(arr) ? arr : [];
        if (!arr.length) return acc;
        var first = arr[0] && (arr[0].id || (arr[0].movie && arr[0].movie.ids && arr[0].movie.ids.trakt));
        if (first !== undefined && first === lastFirst) return acc;
        lastFirst = first;
        acc = acc.concat(arr);
        if (onProgress) onProgress(acc.length);
        if (arr.length < HIST_PAGE) return acc;
        return go(page + 1);
      }).catch(function () { return acc; });
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
      pagedWatchedMovies(opts.images),
      pagedHistory(opts.images, opts.progress)
    ]).then(function (res) {
      return { list: mergeWatched(res[0], res[1]), a: res[0].length, h: res[1].length };
    });
  }

  function saveLibrary(list) {
    var lib = list.map(function (it) {
      var m = it.movie;
      return { i: m.ids.tmdb, t: m.title || '', y: m.year || 0,
        p: img(m, 'poster').replace(/^https?:\/\//, ''), w: String(it.last_watched_at || '') };
    });
    lib.sort(function (x, y) { return y.w.localeCompare(x.w); });
    try {
      Lampa.Storage.set('trakt_plus_library', lib);
      Lampa.Storage.set('trakt_plus_library_t', Date.now());
      return lib.length;
    } catch (e) { return 0; }
  }

  function syncWatched(manual) {
    if (syncing) { if (manual) notify(tr('Синхронізація вже триває', 'Sync already running')); return Promise.resolve(); }
    if (!token()) { if (manual) notify(tr('Спочатку увійдіть у Trakt.TV', 'Login to Trakt.TV first')); return Promise.resolve(); }
    if (!Lampa.Favorite) { if (manual) notify(tr('Вибране недоступне', 'Favorites unavailable')); return Promise.resolve(); }

    syncing = true;
    var cancelled = false;
    if (manual && Lampa.Loading) {
      Lampa.Loading.start(function () { cancelled = true; }, tr('Завантаження переглянутого з Trakt…', 'Loading watched from Trakt…'));
    }
    function stopLoading() { if (manual && Lampa.Loading) Lampa.Loading.stop(); }

    return whenApi().then(function () {
      return fetchAllMerged({
        images: true,
        progress: function (n) {
          if (manual && Lampa.Loading && Lampa.Loading.setText) Lampa.Loading.setText(tr('Історія Trakt: ', 'Trakt history: ') + n);
        }
      });
    }).then(function (res) {
      var raw = res.list;
      if (raw.length) {
        watchedMovies = collectIds(raw, 'movie');
        persistWatched();
      }
      var libCount = raw.length ? saveLibrary(raw) : (Lampa.Storage.get('trakt_plus_library') || []).length;

      raw.sort(function (a, b) {
        return String(b.last_watched_at || '').localeCompare(String(a.last_watched_at || ''));
      });
      var cards = [];
      raw.forEach(function (it) {
        if (cards.length >= MAX_WATCHED) return;
        var c = cardFromWatched(it);
        if (c) cards.push(c);
      });

      var capSet = {};
      cards.forEach(function (c) { capSet[c.id] = 1; });
      var prev = arrToSet(Lampa.Storage.get('trakt_plus_synced') || []);
      var mine = {};
      var stats = { added: 0, skipped: 0, removed: 0 };
      var i = 0;

      return new Promise(function (resolve) {
        function finish() {
          if (!cancelled && raw.length) {
            Object.keys(prev).forEach(function (id) {
              if (!capSet[id] && !mine[id]) {
                try { Lampa.Favorite.remove('viewed', { id: Number(id) }); stats.removed++; } catch (e) {}
              }
            });
          } else {
            Object.keys(prev).forEach(function (id) { mine[id] = 1; });
          }
          Lampa.Storage.set('trakt_plus_synced', Object.keys(mine).map(Number));
          Lampa.Storage.set('trakt_plus_last_sync', Date.now());
          resolve();
        }
        function step() {
          if (cancelled) return finish();
          var end = Math.min(i + 25, cards.length);
          for (; i < end; i++) {
            var c = cards[i];
            var st = {};
            try { st = Lampa.Favorite.check(c) || {}; } catch (e) {}
            if (st.viewed) {
              if (prev[c.id]) mine[c.id] = 1;
              stats.skipped++;
              continue;
            }
            var conflict = MARK_TYPES.some(function (t) { return st[t]; });
            if (conflict) { stats.skipped++; continue; }
            try {
              Lampa.Favorite.add('viewed', c);
              mine[c.id] = 1;
              stats.added++;
            } catch (e) { stats.skipped++; }
          }
          if (manual && Lampa.Loading && Lampa.Loading.setText) {
            Lampa.Loading.setText(tr('Імпорт: ', 'Importing: ') + i + '/' + cards.length);
          }
          if (i < cards.length) setTimeout(step, 0); else finish();
        }
        step();
      }).then(function () {
        stopLoading();
        syncing = false;
        clearRowCaches();
        decorateAll();
        notify(tr('Trakt: отримано ', 'Trakt: received ') + res.a + (res.h ? ' (+' + res.h + tr(' з історії', ' from history') + ')' : '') +
          tr(', у папці ', ', in folder ') + libCount + '. ' +
          tr('Вибране: додано ', 'Favorites: added ') + stats.added +
          tr(', пропущено ', ', skipped ') + stats.skipped +
          tr(', прибрано ', ', removed ') + stats.removed);
      });
    }).catch(function () {
      stopLoading();
      syncing = false;
      notify(tr('Не вдалося синхронізувати з Trakt', 'Trakt sync failed'));
    });
  }

  function scheduleAutoSync() {
    setTimeout(function () {
      if (!cfg().enable || !cfg().autosync || !token()) return;
      var last = Number(Lampa.Storage.get('trakt_plus_last_sync') || 0);
      if (Date.now() - last > AUTO_SYNC_HOURS * 3600000) syncWatched(false);
    }, 20000);
  }

  // ───────────── ПОЗНАЧКИ НА КАРТКАХ ─────────────
  function isMarked(d, g) {
    var id = d.id || (d.ids && d.ids.tmdb);
    if (!id) return false;
    if (cardKind(d) === 'show') return !!(g.markShows && watchedShows[id]);
    return !!watchedMovies[id];
  }

  function decorate(node, data, g) {
    if (!node || !node.classList || !data) return;
    g = g || cfg();
    var on = !!(g.mark && !data._lib && isMarked(data, g));
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
      new MutationObserver(function () {
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
      tr('Працює, якщо збірка Lampa підтримує рядки в картці', 'Works if your Lampa build supports rows in the card'));
    add({ name: 'trakt_plus_full_button', type: 'trigger', 'default': true },
      tr('У картці: кнопка «Trakt: подібні»', 'In card: "Trakt: similar" button'),
      tr('Відкриває повний список подібних із Trakt', 'Opens the full list of similar titles from Trakt'));
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
          notify(tr('Фільмів: ', 'Movies: ') + Object.keys(watchedMovies).length + tr(', серіалів: ', ', shows: ') + Object.keys(watchedShows).length);
        });
      });
    add({ name: 'trakt_plus_reset_cache', type: 'button' },
      tr('Скинути кеш Trakt+', 'Reset Trakt+ cache'), '',
      function () {
        Lampa.Storage.set('trakt_plus_watched_cache', null);
        watchedPromise = null;
        watchedMovies = {};
        watchedShows = {};
        watchedStamp = '';
        lastCheck = 0;
        recCache = { t: 0, key: '', list: null };
        clearRowCaches();
        loadWatched(true).then(function () {
          decorateAll();
          notify(tr('Кеш скинуто. Фільмів: ', 'Cache cleared. Movies: ') + Object.keys(watchedMovies).length + tr(', серіалів: ', ', shows: ') + Object.keys(watchedShows).length);
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
  }

  // Рядки реєструємо ОДРАЗУ (до готовності додатку), щоб головна їх одразу підхопила
  try { registerRows(); } catch (e) {}

  var tries = 0;
  function boot() {
    api = window.TraktTV && window.TraktTV.api;
    if (!api) {
      tries++;
      if (tries < 60) setTimeout(boot, 500);
      return;
    }
    try { hydrateWatched(); } catch (e) {}
    try { injectStyle(); } catch (e) {}
    try { initSettings(); } catch (e) {}
    try { patchRecommendations(); } catch (e) {}
    try { registerView(); } catch (e) {}
    try { addMenuItem(); } catch (e) {}
    try { hookDecorations(); } catch (e) {}
    try { hookFull(); } catch (e) {}

    loadWatched().then(function () { decorateAll(); });
    scheduleAutoSync();
    ensureHome();
  }

  if (window.appready) boot();
  else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') boot(); });
})();
