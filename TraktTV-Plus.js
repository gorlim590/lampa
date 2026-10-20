/*
 * TraktTV Plus — надбудова для TraktTV.js (Lampa)
 * Підключати ПІСЛЯ TraktTV.js.
 *
 *  - розумні рекомендації (без переглянутих, фільтр за рейтингом/голосами/жанрами)
 *  - нові рядки на головній: жахи, трилери, фантастика, "бо ти дивився X",
 *    приховані перлини, топ непереглянутого, свіжі та варті уваги
 *  - синхронізація переглянутих фільмів з Trakt у Вибране -> "Переглянуті" (ліміт 2500)
 *  - позначка на картках: затемнення + зелена риска + бейдж "Trakt"
 *  - окрема папка "Trakt: Переглянуті" біля "Вибране" (ВСІ переглянуті фільми, без ліміту)
 *  - рядки "Зараз дивляться": фільми / серіали / мультфільми / аніме (trending + popular)
 *
 * Код навмисно написаний у ES5 (без async/arrow), щоб працювало на старих Smart TV.
 */
(function () {
  'use strict';

  if (window.trakt_plus_ready) return;
  window.trakt_plus_ready = true;

  // ───────────── НАЛАШТУВАННЯ (можна міняти тут) ─────────────
  var MAX_WATCHED = 2500;          // максимум фільмів, що кладуться у Вибране
  var AUTO_SYNC_HOURS = 12;        // як часто авто-синхронізувати
  var WATCHED_CACHE_HOURS = 24;    // максимальний вік кешу переглянутих (навіть якщо Trakt не повідомив про зміни)
  var WATCH_RECHECK_SEC = 90;      // як часто (не частіше) питати Trakt, чи змінились переглянуті (/sync/last_activities)
  var ROW_CACHE_MIN = 10;          // кеш рядків у хвилинах
  var DEFAULT_EXCLUDE = 'reality,talk-show,news,game-show,soap,sporting-event,special-interest';
  var MARK_TYPES = ['look', 'viewed', 'scheduled', 'continued', 'thrown'];

  // Жанрові рядки. Додавай свої: slug беремо з Trakt (action, comedy, crime, drama, war...)
  var GENRE_ROWS = [
    { slug: 'horror', uk: 'Жахи, які ти ще не бачив', en: "Horror you haven't seen", minRating: 6.0, minVotes: 500, index: 4 },
    { slug: 'thriller', uk: 'Трилери', en: 'Thrillers', minRating: 6.8, minVotes: 1000, index: 8 },
    { slug: 'science-fiction', uk: 'Фантастика', en: 'Sci-Fi', minRating: 6.8, minVotes: 1000, index: 9 }
  ];

  // Рядки "Зараз дивляться" (Trakt trending + добір з popular). Окремо для кожної категорії.
  // Мультфільми = жанр animation без anime. Аніме = жанр anime (фільми + серіали).
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

  var api = null;
  var watchedMovies = {};
  var watchedShows = {};
  var watchedPromise = null;
  var watchedStamp = '';
  var hydrated = false;
  var lastCheck = 0;
  var ROWS = {};
  var syncing = false;

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
  function cfg() {
    return {
      enable: bool('trakt_plus_enable', true),
      hideWatched: bool('trakt_plus_hide_watched', true),
      mark: bool('trakt_plus_mark', true),
      autosync: bool('trakt_plus_autosync', true),
      trendHide: bool('trakt_plus_trend_hide_watched', false),
      minRating: parseFloat(field('trakt_plus_min_rating', '6.5')) || 0,
      minVotes: parseInt(field('trakt_plus_min_votes', '500'), 10) || 0,
      recType: String(field('trakt_plus_rec_type', 'movies')),
      exclude: String(field('trakt_plus_exclude_genres', DEFAULT_EXCLUDE)).toLowerCase().split(',')
        .map(function (s) { return s.trim(); }).filter(Boolean)
    };
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

  // ───────────── КАРТКИ ─────────────
  function toCard(entry, hint) {
    if (!entry || typeof entry !== 'object') return null;
    var isShow = entry.show ? true : (entry.movie ? false : hint === 'show');
    var m = entry.movie || entry.show || entry;
    var ids = m.ids || {};
    if (!ids.tmdb) return null;
    var poster = img(m, 'poster');
    if (!poster) return null; // без постера не показуємо
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
      image: img(m, 'fanart') || poster,
      method: isShow ? 'tv' : 'movie',
      card_type: isShow ? 'tv' : 'movie',
      type: isShow ? 'tv' : 'movie',
      _votes: Number(m.votes || 0),
      _watchers: Number(entry.watchers || 0),
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

  function fetchCards(urls, hint) {
    return Promise.all(urls.map(function (u) {
      return api.get(u).catch(function () { return []; });
    })).then(function (res) {
      var seen = {}, out = [];
      res.forEach(function (arr) {
        (Array.isArray(arr) ? arr : []).forEach(function (e) {
          var c = toCard(e, hint);
          if (!c) return;
          var key = c.method + c.id;
          if (seen[key]) return;
          seen[key] = 1;
          out.push(c);
        });
      });
      return out;
    });
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

  // підтягуємо збережений кеш (позначки одразу є після запуску, ще до запитів у Trakt)
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

  // Кеш позначок: якщо фільм є в кеші — позначка стоїть одразу.
  // Щоб бути певними, що кеш збігається з Trakt, дешево питаємо /sync/last_activities:
  // змінилось — перезавантажуємо весь список переглянутих (додані І видалені фільми).
  function refreshWatched(force) {
    var cached = Lampa.Storage.get('trakt_plus_watched_cache') || {};
    var tooOld = !cached.t || (Date.now() - cached.t) > WATCHED_CACHE_HOURS * 3600000;
    return api.get('/sync/last_activities').then(function (a) { return activityStamp(a); }, function () { return null; })
      .then(function (stamp) {
        var same = stamp !== null && stamp === (cached.stamp || '');
        if (!force && !tooOld && (same || stamp === null)) return false; // кеш актуальний
        return Promise.all([
          fetchAllMerged({ images: false }).catch(function () { return null; }),
          api.get('/sync/watched/shows?extended=noseasons').catch(function () { return null; })
        ]).then(function (r) {
          var ok = false;
          if (r[0] && r[0].list) { watchedMovies = collectIds(r[0].list, 'movie'); ok = true; }
          if (Array.isArray(r[1])) { watchedShows = collectIds(r[1], 'show'); ok = true; }
          if (ok) { if (stamp !== null) watchedStamp = stamp; persistWatched(); }
          return ok;
        });
      });
  }

  function loadWatched(force) {
    hydrateWatched();
    if (!token()) return Promise.resolve(false);
    var now = Date.now();
    if (!force && watchedPromise && (now - lastCheck) < WATCH_RECHECK_SEC * 1000) return watchedPromise;
    lastCheck = now;
    watchedPromise = refreshWatched(force).catch(function () { return false; });
    return watchedPromise;
  }

  function isWatched(c) {
    return c.method === 'tv' ? !!watchedShows[c.id] : !!watchedMovies[c.id];
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

  // байєсівська оцінка (рейтинг з урахуванням кількості голосів) + невеликий щоденний "шум"
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

  // ───────────── РОЗУМНІ РЕКОМЕНДАЦІЇ (підміна api.recommendations) ─────────────
  var recCache = { t: 0, key: '', list: null };

  function smartRecs() {
    var g = cfg();
    var ignoreWl = bool('trakt_source_ignore_watchlisted', false) ? 'true' : 'false';
    var key = [g.recType, g.minRating, g.minVotes, g.exclude.join(), g.hideWatched, ignoreWl].join('|');
    if (recCache.list && recCache.key === key && Date.now() - recCache.t < 20 * 60000) {
      return Promise.resolve(recCache.list);
    }
    var jobs = [];
    var extra = { ignore_collected: ignoreWl, ignore_watchlisted: ignoreWl };
    if (g.recType !== 'shows') jobs.push(fetchCards([feed('/recommendations/movies', extra)], 'movie'));
    if (g.recType !== 'movies') jobs.push(fetchCards([feed('/recommendations/shows', extra)], 'show'));
    return Promise.all([loadWatched(), Promise.all(jobs)]).then(function (r) {
      var all = [];
      r[1].forEach(function (a) { all = all.concat(a); });
      var list = rank(all.filter(function (c) { return passes(c); }));
      recCache = { t: Date.now(), key: key, list: list };
      return list;
    });
  }

  function patchRecommendations() {
    var orig = api.recommendations;
    if (typeof orig !== 'function') return;
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
  }

  // ───────────── НОВІ РЯДКИ ─────────────
  function getRow(def) {
    if (def._c && Date.now() - def._t < ROW_CACHE_MIN * 60000) return Promise.resolve(def._c);
    return def.load().then(function (r) { def._c = r; def._t = Date.now(); return r; });
  }

  function registerRow(def) {
    ROWS[def.name] = def;
    Lampa.ContentRows.add({
      name: def.name,
      title: def.settingsTitle,
      index: def.index,
      screen: ['main'],
      call: function () {
        if (!cfg().enable || !token()) return;
        return function (call) {
          getRow(def).then(function (r) {
            var cards = r && r.cards;
            if (!cards || cards.length < 4) return call();
            var title = r.title || def.settingsTitle;
            var line = {
              title: title,
              trakt_line: true,
              trakt_line_title: title,
              source: 'tmdb',
              page: 1,
              total_pages: 1,
              results: cards.slice(0, 20).map(finalize)
            };
            if (Lampa.Maker) {
              line.onMore = function () {
                Lampa.Activity.push({ title: title, component: 'trakt_plus_view', row: def.name, page: 1 });
              };
            }
            call(line);
          }).catch(function () { call(); });
        };
      }
    });
  }

  function genreLoader(g) {
    return function () {
      var urls = [
        feed('/movies/popular', { genres: g.slug }),
        feed('/movies/popular', { genres: g.slug, page: 2 }),
        feed('/movies/trending', { genres: g.slug }),
        feed('/recommendations/movies', { ignore_collected: 'true' })
      ];
      return Promise.all([loadWatched(), fetchCards(urls, 'movie')]).then(function (r) {
        var cards = r[1].filter(function (c) {
          return passes(c, { genre: g.slug, minRating: g.minRating, minVotes: g.minVotes });
        });
        return { cards: rank(cards), title: tr(g.uk, g.en) };
      });
    };
  }

  function gemsLoader() {
    return Promise.all([loadWatched(), fetchCards([
      feed('/movies/popular', { page: 2 }),
      feed('/movies/popular', { page: 3 }),
      feed('/movies/popular', { page: 4 }),
      feed('/recommendations/movies', { ignore_collected: 'true' })
    ], 'movie')]).then(function (r) {
      var cards = r[1].filter(function (c) {
        return passes(c, { minRating: 7.2, minVotes: 300, maxVotes: 15000 });
      });
      return { cards: rank(cards) };
    });
  }

  function topLoader() {
    return Promise.all([loadWatched(), fetchCards([
      feed('/movies/popular', { page: 1 }),
      feed('/movies/popular', { page: 2 }),
      feed('/movies/popular', { page: 3 })
    ], 'movie')]).then(function (r) {
      var cards = r[1].filter(function (c) {
        return passes(c, { minRating: 7.5, minVotes: 3000 });
      });
      return { cards: rank(cards) };
    });
  }

  function freshLoader() {
    var y = new Date().getFullYear();
    var years = (y - 1) + '-' + y;
    return Promise.all([loadWatched(), fetchCards([
      feed('/movies/popular', { years: years }),
      feed('/movies/popular', { years: years, page: 2 }),
      feed('/movies/trending', { years: years })
    ], 'movie')]).then(function (r) {
      var cards = r[1].filter(function (c) {
        return passes(c, { minRating: 6.5, minVotes: 300 });
      });
      return { cards: rank(cards) };
    });
  }

  function becauseLoader() {
    return api.get('/sync/history/movies?limit=20').then(function (h) {
      var seen = {}, picks = [];
      (Array.isArray(h) ? h : []).forEach(function (i) {
        var m = i && i.movie;
        if (m && m.ids && m.ids.trakt && !seen[m.ids.trakt]) { seen[m.ids.trakt] = 1; picks.push(m); }
      });
      if (!picks.length) return { cards: [] };
      var p = picks[Math.floor(Math.random() * Math.min(picks.length, 10))];
      return Promise.all([loadWatched(), fetchCards([
        feed('/movies/' + p.ids.trakt + '/related', { limit: 40 })
      ], 'movie')]).then(function (r) {
        var cards = r[1].filter(function (c) {
          return passes(c, { minRating: 6.0, minVotes: 300 });
        });
        return { cards: rank(cards), title: tr('Бо ти дивився: ', 'Because you watched: ') + p.title };
      });
    });
  }

  function trendingLoader(t) {
    return function () {
      var jobs = [];
      t.loads.forEach(function (l) {
        var ex = l.genre ? { genres: l.genre } : {};
        jobs.push(fetchCards([feed(l.p + '/trending', ex)], l.hint));
        jobs.push(fetchCards([feed(l.p + '/popular', ex)], l.hint));
      });
      return Promise.all([loadWatched(), Promise.all(jobs)]).then(function (r) {
        var trend = [], pop = [];
        r[1].forEach(function (a, i) { if (i % 2 === 0) trend = trend.concat(a); else pop = pop.concat(a); });
        trend.sort(function (a, b) { return b._watchers - a._watchers; });   // найбільше глядачів зараз — зверху
        pop.sort(function (a, b) { return b._votes - a._votes; });           // далі — просто популярне
        var seen = {}, cards = [];
        var hide = cfg().trendHide;
        trend.concat(pop).forEach(function (c) {
          var key = c.method + c.id;
          if (seen[key]) return;
          if (!passes(c, { minRating: 0, minVotes: 0, hideWatched: hide, genre: t.genre, notGenres: t.skip })) return;
          seen[key] = 1;
          cards.push(c);
        });
        return { cards: cards, title: tr(t.uk, t.en) };
      });
    };
  }

  function registerRows() {
    if (!Lampa.ContentRows || typeof Lampa.ContentRows.add !== 'function') return;

    TREND_ROWS.forEach(function (t) {
      registerRow({
        name: 'TraktPlusTrend_' + t.key,
        settingsTitle: 'TraktTV+: ' + tr(t.uk, t.en),
        index: t.index,
        load: trendingLoader(t)
      });
    });

    GENRE_ROWS.forEach(function (g) {
      registerRow({
        name: 'TraktPlusGenre_' + g.slug.replace(/[^a-z]/g, ''),
        settingsTitle: 'TraktTV+: ' + tr(g.uk, g.en),
        index: g.index || 8,
        load: genreLoader(g)
      });
    });
    registerRow({ name: 'TraktPlusBecause', settingsTitle: 'TraktTV+: ' + tr('Бо ти дивився…', 'Because you watched…'), index: 5, load: becauseLoader });
    registerRow({ name: 'TraktPlusGems', settingsTitle: 'TraktTV+: ' + tr('Приховані перлини', 'Hidden gems'), index: 6, load: function () {
      return gemsLoader().then(function (r) { r.title = tr('Приховані перлини', 'Hidden gems'); return r; });
    } });
    registerRow({ name: 'TraktPlusTop', settingsTitle: 'TraktTV+: ' + tr('Топ, який ти ще не бачив', 'Top rated you have not seen'), index: 7, load: function () {
      return topLoader().then(function (r) { r.title = tr('Топ, який ти ще не бачив', 'Top rated you have not seen'); return r; });
    } });
    registerRow({ name: 'TraktPlusFresh', settingsTitle: 'TraktTV+: ' + tr('Свіже й варте уваги', 'Fresh & worth watching'), index: 10, load: function () {
      return freshLoader().then(function (r) { r.title = tr('Свіже й варте уваги', 'Fresh & worth watching'); return r; });
    } });
  }

  // ───────────── ПАПКА "Trakt: Переглянуті" ─────────────
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

  // пункт у лівому меню одразу під "Вибране"
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

  // сторінка "Показати все" для наших рядків
  function registerView() {
    if (!Lampa.Maker || !Lampa.Component) return;
    registerLibrary();
    Lampa.Component.add('trakt_plus_view', function (object) {
      var comp = Lampa.Maker.make('Category', object);
      comp.use({
        onCreate: function () {
          var self = this;
          var def = ROWS[object.row];
          if (!def) { self.empty(); return; }
          getRow(def).then(function (r) {
            self.build({ results: (r.cards || []), total_pages: 1, page: 1 });
          }).catch(function () {
            self.empty();
            if (self.activity) self.activity.loader(false);
          });
        },
        onNext: function (resolve, reject) { reject.call(this); },
        onInstance: function (card, element) {
          card.use({ onlyMenu: false, onlyEnter: function () { openFull(element); } });
        }
      });
      return comp;
    });
  }

  // ───────────── СИНХРОНІЗАЦІЯ ПЕРЕГЛЯНУТИХ → ВИБРАНЕ ("Переглянуті") ─────────────
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

  // запит з повтором
  function getRetry(path, attempt) {
    attempt = attempt || 0;
    return api.get(path).catch(function (e) {
      if (attempt < 2) {
        return new Promise(function (r) { setTimeout(r, 1500); }).then(function () { return getRetry(path, attempt + 1); });
      }
      throw e;
    });
  }

  // Історія переглядів посторінково. Йдемо, поки сторінки не закінчаться
  // (навіть якщо сервер/обгортка раптом обрізає сторінку до 100 — це не заважає).
  var HIST_PAGE = 1000, HIST_PAGE_CAP = 200;
  function pagedHistory(images, onProgress) {
    var acc = [], lastFirst = null;
    function go(page) {
      var q = '/sync/history/movies?page=' + page + '&limit=' + HIST_PAGE + (images ? '&extended=images' : '');
      return getRetry(q).then(function (arr) {
        arr = Array.isArray(arr) ? arr : [];
        if (!arr.length || page > HIST_PAGE_CAP) return acc;
        var first = arr[0] && arr[0].id;
        if (first !== undefined && first === lastFirst) return acc; // сторінка не змінилась — стоп
        lastFirst = first;
        acc = acc.concat(arr);
        if (onProgress) onProgress(acc.length);
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
    hist.forEach(function (it) { put(it, it.watched_at); });
    return out;
  }

  // Повний список переглянутих фільмів: /sync/watched/movies + (якщо щось підозріле або примусово) історія з пагінацією.
  // opts: { full, images, progress }  →  { list, a, h }
  function fetchAllMerged(opts) {
    opts = opts || {};
    var path = '/sync/watched/movies' + (opts.images ? '?extended=images' : '');
    return getRetry(path).then(function (a) {
      a = Array.isArray(a) ? a : [];
      var needHist = opts.full || a.length === 100; // рівно 100 = схоже на обрізаний список
      if (!needHist) return { list: mergeWatched(a, []), a: a.length, h: 0 };
      return pagedHistory(!!opts.images, opts.progress).catch(function () { return []; }).then(function (h) {
        return { list: mergeWatched(a, h), a: a.length, h: h.length };
      });
    });
  }

  // окрема "папка": компактний список ВСІХ переглянутих (не залежить від ліміту Вибраного)
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

  function syncWatched(manual, full) {
    if (syncing) { if (manual) notify(tr('Синхронізація вже триває', 'Sync already running')); return Promise.resolve(); }
    if (!token()) { if (manual) notify(tr('Спочатку увійдіть у Trakt.TV', 'Login to Trakt.TV first')); return Promise.resolve(); }
    if (!Lampa.Favorite) { if (manual) notify(tr('Вибране недоступне', 'Favorites unavailable')); return Promise.resolve(); }

    syncing = true;
    var cancelled = false;
    if (manual && Lampa.Loading) {
      Lampa.Loading.start(function () { cancelled = true; }, tr('Завантаження переглянутого з Trakt…', 'Loading watched from Trakt…'));
    }
    function stopLoading() { if (manual && Lampa.Loading) Lampa.Loading.stop(); }

    return fetchAllMerged({
      full: !!full, images: true,
      progress: function (n) {
        if (manual && Lampa.Loading && Lampa.Loading.setText) Lampa.Loading.setText(tr('Історія Trakt: ', 'Trakt history: ') + n);
      }
    }).then(function (res) {
      var raw = res.list;
      // всі переглянуті йдуть у фільтри/позначки/папку (без ліміту), у Вибране → "Переглянуті" — максимум MAX_WATCHED
      var allIds = collectIds(raw, 'movie');
      watchedMovies = allIds;
      persistWatched();
      var libCount = saveLibrary(raw);

      raw.sort(function (a, b) {
        return String(b.last_watched_at || '').localeCompare(String(a.last_watched_at || ''));
      });
      var cards = [];
      raw.slice(0, MAX_WATCHED * 2).forEach(function (it) {
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
          if (!cancelled) {
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
            if (conflict) { stats.skipped++; continue; } // не чіпаємо власні мітки користувача
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
        decorateAll();
        var inFav = -1;
        try { inFav = (Lampa.Favorite.get({ type: 'viewed' }) || []).length; } catch (e) {}
        notify(tr('Trakt: отримано ', 'Trakt: received ') + res.a + (res.h ? ' (+' + res.h + tr(' з історії', ' from history') + ')' : '') +
          tr(', у папці ', ', in folder ') + libCount + (inFav >= 0 ? tr(', у Вибраному ', ', in Favorites ') + inFav : '') + '. ' +
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
  function isMovieData(d) {
    return d && !(d.method === 'tv' || d.type === 'tv' || d.card_type === 'tv' || d.name || d.first_air_date || d.original_name);
  }

  function decorate(node, data) {
    if (!node || !node.classList || !data) return;
    var on = !!(cfg().mark && !data._lib && isMovieData(data) && data.id && watchedMovies[data.id]);
    var view = node.querySelector ? node.querySelector('.card__view') : null;
    if (on) {
      node.classList.add('trakt-plus-watched');
      if (view && !view.querySelector('.trakt-plus-badge')) {
        var b = document.createElement('div');
        b.className = 'trakt-plus-badge';
        b.textContent = '\u2713 Trakt';
        view.appendChild(b);
      }
    } else if (node.classList.contains('trakt-plus-watched')) {
      // фільм більше не в переглянутих на Trakt (або позначки вимкнені) — знімаємо мітку
      node.classList.remove('trakt-plus-watched');
      var old = view ? view.querySelector('.trakt-plus-badge') : null;
      if (old && old.parentNode) old.parentNode.removeChild(old);
    }
  }

  function decorateAll() {
    try {
      var nodes = document.querySelectorAll('.card');
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        var d = el.card_data || (window.jQuery ? window.jQuery(el).data('card') : null);
        if (d) decorate(el, d);
      }
    } catch (e) {}
  }

  function hookDecorations() {
    // 1) рядки на головній (перевірений у TraktTV.js спосіб)
    Lampa.Listener.follow('line', function (e) {
      if (!e || !Array.isArray(e.items)) return;
      if (['append', 'visible', 'toggle'].indexOf(e.type) < 0) return;
      e.items.forEach(function (ci) {
        try { if (ci && ci.data && ci.render) decorate(ci.render(true), ci.data); } catch (x) {}
      });
    });
    // 2) сітки/каталоги — сканування DOM
    var timer = null;
    try {
      new MutationObserver(function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          decorateAll();
          // звірка з Trakt (не частіше ніж раз на WATCH_RECHECK_SEC); якщо список змінився — оновлюємо позначки
          loadWatched().then(function (changed) { if (changed) decorateAll(); });
        }, 300);
      }).observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  }

  function injectStyle() {
    var css = '' +
      '.trakt-plus-watched .card__img{opacity:.35;-webkit-filter:grayscale(.45);filter:grayscale(.45)}' +
      '.trakt-plus-watched .card__view::after{content:"";position:absolute;left:0;right:0;bottom:0;height:.35em;background:#37ff54;z-index:4;pointer-events:none}' +
      '.trakt-plus-badge{position:absolute;top:.5em;left:.5em;z-index:5;padding:.15em .5em;font-size:.85em;line-height:1.3;font-weight:700;' +
      'color:#37ff54;background:rgba(0,0,0,.7);border-radius:.4em;pointer-events:none}';
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
        onChange: onChange
      });
    }

    add({ name: 'trakt_plus_enable', type: 'trigger', 'default': true },
      tr('Увімкнути Trakt+', 'Enable Trakt+'),
      tr('Розумні рекомендації та додаткові рядки', 'Smart recommendations and extra rows'));
    add({ name: 'trakt_plus_hide_watched', type: 'trigger', 'default': true },
      tr('Ховати переглянуте', 'Hide watched'),
      tr('Не показувати у рядках те, що вже відмічено на Trakt', 'Do not show items already watched on Trakt'));
    add({ name: 'trakt_plus_rec_type', type: 'select', 'default': 'movies',
      values: { movies: tr('Тільки фільми', 'Movies only'), shows: tr('Тільки серіали', 'Shows only'), both: tr('Фільми та серіали', 'Movies & shows') } },
      tr('Рекомендації: що показувати', 'Recommendations: content'));
    add({ name: 'trakt_plus_min_rating', type: 'select', 'default': '6.5',
      values: { '0': tr('Без фільтра', 'No filter'), '6': '6.0', '6.5': '6.5', '7': '7.0', '7.5': '7.5' } },
      tr('Мінімальний рейтинг Trakt', 'Minimum Trakt rating'));
    add({ name: 'trakt_plus_min_votes', type: 'select', 'default': '500',
      values: { '0': tr('Без фільтра', 'No filter'), '100': '100', '500': '500', '1000': '1000', '3000': '3000' } },
      tr('Мінімум голосів', 'Minimum votes'),
      tr('Відсікає маловідомі фільми з випадковим рейтингом', 'Cuts obscure titles with unreliable ratings'));
    add({ name: 'trakt_plus_exclude_genres', type: 'input', values: '', 'default': DEFAULT_EXCLUDE, placeholder: DEFAULT_EXCLUDE },
      tr('Виключені жанри (slug через кому)', 'Excluded genres (comma-separated slugs)'),
      'reality, talk-show, news, game-show, soap, ...');
    add({ name: 'trakt_plus_trend_hide_watched', type: 'trigger', 'default': false },
      tr('Ховати переглянуте у "Зараз дивляться"', 'Hide watched in "Watching now"'),
      tr('Вимкнено: переглянуті лишаються, але з позначкою Trakt', 'Off: watched items stay, marked with Trakt badge'));
    add({ name: 'trakt_plus_mark', type: 'trigger', 'default': true },
      tr('Позначати переглянуті з Trakt', 'Mark Trakt-watched cards'),
      tr('Затемнення + зелена риска + бейдж Trakt', 'Dimmed + green line + Trakt badge'));
    add({ name: 'trakt_plus_autosync', type: 'trigger', 'default': true },
      tr('Авто-синхронізація переглянутих', 'Auto-sync watched'),
      tr('Раз на ' + AUTO_SYNC_HOURS + ' год. при запуску', 'Every ' + AUTO_SYNC_HOURS + 'h on startup'));
    add({ name: 'trakt_plus_sync_now', type: 'button' },
      tr('Синхронізувати переглянуті з Trakt зараз', 'Sync watched from Trakt now'),
      tr('Вибране → Переглянуті (до ' + MAX_WATCHED + ' фільмів)', 'Favorites → Viewed (up to ' + MAX_WATCHED + ' movies)'),
      function () { syncWatched(true); });
    add({ name: 'trakt_plus_full_import', type: 'button' },
      tr('Повний імпорт з Trakt (примусово)', 'Full import from Trakt (force)'),
      tr('Тягне ВСІ переглянуті фільми (+ посторінкова історія), оновлює позначки й папку', 'Pulls ALL watched movies (+ paged history), refreshes marks and folder'),
      function () { syncWatched(true, true); });
    add({ name: 'trakt_plus_open_library', type: 'button' },
      tr('Відкрити папку "Trakt: Переглянуті"', 'Open "Trakt: Watched" folder'),
      '',
      function () { openLibrary(); });
    add({ name: 'trakt_plus_reset_cache', type: 'button' },
      tr('Скинути кеш Trakt+', 'Reset Trakt+ cache'),
      '',
      function () {
        Lampa.Storage.set('trakt_plus_watched_cache', null);
        watchedPromise = null;
        watchedMovies = {};
        watchedShows = {};
        watchedStamp = '';
        lastCheck = 0;
        recCache = { t: 0, key: '', list: null };
        Object.keys(ROWS).forEach(function (k) { ROWS[k]._c = null; });
        loadWatched(true).then(decorateAll);
        notify(tr('Кеш скинуто', 'Cache cleared'));
      });
  }

  // ───────────── СТАРТ ─────────────
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
    try { registerRows(); } catch (e) {}
    try { hookDecorations(); } catch (e) {}
    loadWatched().then(function () { decorateAll(); });
    scheduleAutoSync();
  }

  if (window.appready) boot();
  else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') boot(); });
})();
