/*
 * Screensaver Plus v2.1 — відео-заставка для Lampa: папка з відео + годинник + погода.
 *
 * «Папка з відео» (Налаштування → Скрінсейвер+) приймає:
 *   • локальний шлях:  /storage/emulated/0/Movies/wallpapers   (пробуємо file://, потім сервер на 127.0.0.1:8000/8080)
 *   • HTTP-адресу:     http://192.168.0.10:8000/               (serve.py, nginx autoindex, python -m http.server)
 *   • .json / .m3u зі списком посилань
 *
 * Код у ES5 (без async/arrow) для старих Smart TV / Android TV.
 */
(function () {
  'use strict';

  if (window.screensaver_plus_ready) return;
  window.screensaver_plus_ready = true;

  var VIDEO_RE = /\.(mp4|webm|m4v|mov|mkv)(\?|$)/i;

  var root = null, vA = null, vB = null, front = null;
  var active = false, starting = false, runGeneration = 0, booted = false;
  var lastAct = Date.now();
  var sources = [], sourcesT = 0, sourcesErr = '', sourcesVia = '';
  var order = [], pos = -1, failStreak = 0;
  var timers = { clock: null, sw: null, weather: null, corner: null, sleep: null, watch: null };
  var weather = null, weatherT = 0, lastWeatherHtml = '';
  var corner = null, watchT = -1, watchN = 0;
  var nativeOwner = null, inputBindings = [];

  // ───────────── ХЕЛПЕРИ ─────────────
  function lang() { return String(Lampa.Storage.get('language', 'en')); }
  function uk() { return lang() === 'uk'; }
  function tr(u, e) { return uk() ? u : e; }
  function notify(t) { try { Lampa.Bell.push({ text: t }); } catch (e) {} }
  function field(n, d) {
    var v = Lampa.Storage.field(n);
    return (v === undefined || v === null || v === '') ? d : v;
  }
  function bool(n, d) {
    var v = Lampa.Storage.field(n);
    if (v === undefined || v === null) return d;
    return v === true || v === 'true' || v === 1 || v === '1';
  }
  function cfg() {
    return {
      enable: bool('ssp_enable', true),
      idleMin: parseFloat(field('ssp_idle', '5')) || 5,
      folder: String(field('ssp_folder', '')).trim(),
      urls: String(field('ssp_urls', '')),
      mode: String(field('ssp_mode', 'timer')),
      interval: parseInt(field('ssp_interval', '60'), 10) || 60,
      shuffle: bool('ssp_shuffle', true),
      randStart: bool('ssp_randstart', true),
      fade: parseFloat(field('ssp_fade', '1.5')),
      dim: parseInt(field('ssp_dim', '20'), 10) || 0,
      night: String(field('ssp_night', '22-7')),
      showName: bool('ssp_name', false),
      style: String(field('ssp_style', 'card')),
      clock: bool('ssp_clock', true),
      seconds: bool('ssp_seconds', false),
      h24: bool('ssp_h24', true),
      date: bool('ssp_date', true),
      greeting: bool('ssp_greeting', true),
      weather: bool('ssp_weather', true),
      forecast: bool('ssp_forecast', true),
      sun: bool('ssp_sun', true),
      fahrenheit: bool('ssp_fahrenheit', false),
      city: String(field('ssp_city', '')).trim(),
      pos: String(field('ssp_pos', 'br')),
      scale: parseFloat(field('ssp_scale', '1')) || 1,
      rotate: bool('ssp_rotate', true),
      sleepH: parseFloat(field('ssp_sleep', '0')) || 0,
      killNative: bool('ssp_kill_native', true)
    };
  }

  function http(url, asJson) {
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest();
      x.open('GET', url, true);
      x.timeout = /^file:/i.test(url) ? 4000 : 12000;
      x.onload = function () {
        if (x.status !== 0 && (x.status < 200 || x.status >= 300)) return reject(new Error('HTTP ' + x.status));
        if (!asJson) return resolve(x.responseText);
        try { resolve(JSON.parse(x.responseText)); } catch (e) { reject(e); }
      };
      x.onerror = function () { reject(new Error('network/CORS')); };
      x.ontimeout = function () { reject(new Error('timeout')); };
      try { x.send(); } catch (e) { reject(e); }
    });
  }

  function resolveUrl(href, base) {
    href = href.replace(/&amp;/g, '&');
    if (/^(https?|file):\/\//i.test(href)) return href;
    var m = base.match(/^((?:https?|file):\/\/[^\/]*)/i);
    var origin = m ? m[1] : '';
    if (href.charAt(0) === '/') return origin + href;
    return base.replace(/[^\/]*$/, '').replace(/\/?$/, '/') + href.replace(/^\.\//, '');
  }

  // ───────────── ДЖЕРЕЛА ВІДЕО ─────────────
  function parseListing(text, base) {
    var out = [], t = String(text).replace(/^\s+/, '');
    if (t.charAt(0) === '[' || t.charAt(0) === '{') {
      try {
        var j = JSON.parse(t);
        if (!Array.isArray(j)) j = j.files || j.videos || j.items || [];
        j.forEach(function (it) {
          var u = typeof it === 'string' ? it : (it && (it.url || it.src || it.file || it.path));
          if (u && VIDEO_RE.test(u)) out.push(resolveUrl(u, base));
        });
        return out;
      } catch (e) {}
    }
    if (t.indexOf('#EXTM3U') === 0) {
      t.split(/\r?\n/).forEach(function (l) {
        l = l.trim();
        if (l && l.charAt(0) !== '#' && VIDEO_RE.test(l)) out.push(resolveUrl(l, base));
      });
      return out;
    }
    var m;
    // лістинг каталогу Chromium для file:// — addRow("name","url-name",isDir,...)
    var rr = /addRow\("([^"]*)","([^"]*)",(\d)/g;
    while ((m = rr.exec(t))) { if (m[3] === '0' && VIDEO_RE.test(m[2])) out.push(resolveUrl(m[2], base)); }
    var re = /href\s*=\s*["']([^"'#]+?\.(?:mp4|webm|m4v|mov|mkv)(?:\?[^"']*)?)["']/gi;
    while ((m = re.exec(t))) out.push(resolveUrl(m[1], base));
    return out;
  }

  function candidates(f) {
    if (!f) return [];
    if (/^https?:\/\//i.test(f)) return [f];
    if (/^file:\/\//i.test(f) || f.charAt(0) === '/') {
      var p = f.replace(/^file:\/\//i, '').replace(/\/?$/, '/');
      return ['file://' + p, 'http://127.0.0.1:8000/', 'http://127.0.0.1:8080/'];
    }
    return ['http://' + f];
  }

  function tryCandidates(list, i) {
    if (i >= list.length) return Promise.resolve({ list: [], via: '' });
    var base = list[i];
    return http(base, false).then(function (txt) {
      var l = parseListing(txt, base);
      if (l.length) return { list: l, via: base };
      return tryCandidates(list, i + 1);
    }, function () { return tryCandidates(list, i + 1); });
  }

  function cacheKey(c) { return c.folder + '|' + c.urls; }

  function loadSources(force) {
    var c = cfg();
    if (!force && sources.length && Date.now() - sourcesT < 10 * 60000) return Promise.resolve(sources);
    var manual = c.urls.split(/[,;\s]+/).filter(function (u) { return /^(https?|file):\/\//i.test(u); });
    sourcesErr = '';
    return tryCandidates(candidates(c.folder), 0).then(function (r) {
      if (c.folder && !r.list.length) {
        sourcesErr = /^(file:|\/)/i.test(c.folder)
          ? tr('Lampa не може прочитати цю папку напряму. Запустіть serve.py (на приставці через Termux або на ПК) і вкажіть http://IP:8000/',
               'Lampa cannot read this folder directly. Run serve.py (on the box via Termux or on a PC) and use http://IP:8000/')
          : tr('Не вдалося отримати список з ', 'Could not get the list from ') + c.folder;
      }
      var seen = {}, all = [];
      r.list.concat(manual).forEach(function (u) { if (!seen[u]) { seen[u] = 1; all.push(u); } });
      sourcesVia = r.via;
      if (all.length) {
        sources = all; sourcesT = Date.now();
        try { Lampa.Storage.set('ssp_cache', { k: cacheKey(c), l: all }); } catch (e) {}
      }
      return sources;
    });
  }

  // миттєвий старт зі збереженого списку, оновлення — у фоні
  function warmSources() {
    if (sources.length) return;
    var c = cfg(), ch = Lampa.Storage.get('ssp_cache');
    if (ch && ch.k === cacheKey(c) && ch.l && ch.l.length) { sources = ch.l; sourcesT = 0; }
  }

  function makeOrder(shuffle) {
    order = sources.map(function (u, i) { return i; });
    if (shuffle) {
      for (var i = order.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1)), t = order[i];
        order[i] = order[j]; order[j] = t;
      }
    }
    pos = -1;
  }
  function nextUrl(shuffle) {
    if (!order.length || order.length !== sources.length) makeOrder(shuffle);
    pos++;
    if (pos >= order.length) { makeOrder(shuffle); pos = 0; }
    return sources[order[pos]];
  }

  // ───────────── ПОГОДА ─────────────
  var WCODE = [
    [[0], '☀️', 'Ясно', 'Clear'],
    [[1], '🌤️', 'Переважно ясно', 'Mostly clear'],
    [[2], '⛅', 'Мінлива хмарність', 'Partly cloudy'],
    [[3], '☁️', 'Хмарно', 'Overcast'],
    [[45, 48], '🌫️', 'Туман', 'Fog'],
    [[51, 53, 55, 56, 57], '🌦️', 'Мряка', 'Drizzle'],
    [[61, 63, 65, 66, 67], '🌧️', 'Дощ', 'Rain'],
    [[71, 73, 75, 77], '🌨️', 'Сніг', 'Snow'],
    [[80, 81, 82], '🌦️', 'Зливи', 'Showers'],
    [[85, 86], '🌨️', 'Снігопад', 'Snow showers'],
    [[95, 96, 99], '⛈️', 'Гроза', 'Thunderstorm']
  ];
  function wdesc(code, isDay) {
    for (var i = 0; i < WCODE.length; i++) {
      if (WCODE[i][0].indexOf(code) > -1) {
        var ico = WCODE[i][1];
        if ((code === 0 || code === 1) && isDay === 0) ico = '🌙';
        return { ico: ico, text: uk() ? WCODE[i][2] : WCODE[i][3] };
      }
    }
    return { ico: '🌡️', text: '' };
  }

  function getLocation(c) {
    var cached = Lampa.Storage.get('ssp_loc');
    if (cached && cached.t && Date.now() - cached.t < 24 * 3600000 && cached.key === (c.city || 'auto')) return Promise.resolve(cached);
    function save(o) { o.t = Date.now(); o.key = c.city || 'auto'; Lampa.Storage.set('ssp_loc', o); return o; }
    if (c.city) {
      return http('https://geocoding-api.open-meteo.com/v1/search?count=1&language=' + (uk() ? 'uk' : 'en') + '&name=' + encodeURIComponent(c.city), true)
        .then(function (r) {
          var g = r && r.results && r.results[0];
          if (!g) throw new Error('city not found');
          return save({ lat: g.latitude, lon: g.longitude, city: g.name });
        });
    }
    return http('https://ipwho.is/', true).then(function (r) {
      if (!r || r.success === false) throw new Error('geo');
      return save({ lat: r.latitude, lon: r.longitude, city: r.city || '' });
    }).catch(function () {
      return http('https://ipapi.co/json/', true).then(function (r) {
        return save({ lat: r.latitude, lon: r.longitude, city: r.city || '' });
      });
    });
  }

  function loadWeather(force) {
    var c = cfg();
    if (!c.weather) return Promise.resolve(null);
    if (!force && weather && Date.now() - weatherT < 15 * 60000) return Promise.resolve(weather);
    return getLocation(c).then(function (loc) {
      var u = 'https://api.open-meteo.com/v1/forecast?latitude=' + loc.lat + '&longitude=' + loc.lon +
        '&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m' +
        '&hourly=temperature_2m,weather_code,is_day' +
        '&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&forecast_days=2&timezone=auto' +
        (c.fahrenheit ? '&temperature_unit=fahrenheit&wind_speed_unit=mph' : '&wind_speed_unit=ms');
      return http(u, true).then(function (r) {
        var cur = r.current || {}, d = r.daily || {}, h = r.hourly || {};
        var hours = [];
        if (h.time && cur.time) {
          var i0 = 0;
          while (i0 < h.time.length && h.time[i0] <= cur.time) i0++;
          [2, 5, 8].forEach(function (off) {
            var i = i0 + off - 1;
            if (i < h.time.length) hours.push({ t: h.time[i].slice(11, 16), v: h.temperature_2m[i], code: h.weather_code[i], day: h.is_day[i] });
          });
        }
        weather = {
          city: loc.city, t: cur.temperature_2m, feels: cur.apparent_temperature, code: cur.weather_code,
          day: cur.is_day, wind: cur.wind_speed_10m,
          max: d.temperature_2m_max && d.temperature_2m_max[0], min: d.temperature_2m_min && d.temperature_2m_min[0],
          rise: d.sunrise && d.sunrise[0] && d.sunrise[0].slice(11, 16), set: d.sunset && d.sunset[0] && d.sunset[0].slice(11, 16),
          hours: hours,
          unit: c.fahrenheit ? '°F' : '°C', wu: c.fahrenheit ? 'mph' : tr('м/с', 'm/s')
        };
        weatherT = Date.now();
        return weather;
      });
    }).catch(function () { return weather; });
  }

  // ───────────── ОВЕРЛЕЙ ─────────────
  function injectStyle() {
    if (document.querySelector('style[data-ssp]')) return;
    var css = '' +
      '#ssp-root{position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483000;background:#000;overflow:hidden;color:#fff}' +
      '#ssp-root video{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;opacity:0;background:#000;will-change:opacity}' +
      '#ssp-root video.ssp-on{opacity:1}' +
      '#ssp-dim{position:absolute;top:0;left:0;right:0;bottom:0;background:#000;pointer-events:none;transition:opacity 2s}' +
      '#ssp-vig{position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none}' +
      '#ssp-vig.tl{background:radial-gradient(ellipse at 0 0,rgba(0,0,0,.55),rgba(0,0,0,0) 60%)}' +
      '#ssp-vig.tr{background:radial-gradient(ellipse at 100% 0,rgba(0,0,0,.55),rgba(0,0,0,0) 60%)}' +
      '#ssp-vig.bl{background:radial-gradient(ellipse at 0 100%,rgba(0,0,0,.55),rgba(0,0,0,0) 60%)}' +
      '#ssp-vig.br{background:radial-gradient(ellipse at 100% 100%,rgba(0,0,0,.55),rgba(0,0,0,0) 60%)}' +
      '#ssp-w{position:absolute;margin:2.2em 3em;transition:opacity 1s;max-width:55%;text-shadow:0 .06em .35em rgba(0,0,0,.7)}' +
      '#ssp-w.tl{top:0;left:0}#ssp-w.tr{top:0;right:0;text-align:right}' +
      '#ssp-w.bl{bottom:0;left:0}#ssp-w.br{bottom:0;right:0;text-align:right}' +
      '.ssp-card #ssp-w{padding:1.2em 1.6em;background:rgba(10,12,18,.42);border-radius:1.1em;border:1px solid rgba(255,255,255,.12)}' +
      '#ssp-hello{font-size:1.5em;opacity:.9;margin-bottom:.15em}' +
      '#ssp-time{font-size:6.4em;font-weight:200;line-height:1;letter-spacing:.01em}' +
      '#ssp-date{font-size:1.7em;opacity:.92;margin-top:.2em}' +
      '#ssp-weather{margin-top:.8em;padding-top:.7em;border-top:1px solid rgba(255,255,255,.22)}' +
      '.ssp-t{font-size:2.9em;font-weight:300;line-height:1.1}' +
      '.ssp-s{font-size:1.4em;opacity:.88;margin-top:.2em}' +
      '.ssp-h{display:flex;margin-top:.7em}.br .ssp-h,.tr .ssp-h{justify-content:flex-end}' +
      '.ssp-h div{margin-left:1.2em;text-align:center;font-size:1.25em;opacity:.92}.ssp-h div:first-child{margin-left:0}' +
      '.ssp-h b{display:block;font-weight:400;opacity:.75;font-size:.85em}' +
      '#ssp-name{position:absolute;left:50%;bottom:1.4em;transform:translateX(-50%);font-size:1.2em;opacity:.55;text-shadow:0 .06em .3em #000;white-space:nowrap;max-width:60%;overflow:hidden;text-overflow:ellipsis}';
    var s = document.createElement('style');
    s.setAttribute('data-ssp', '1');
    s.textContent = css;
    document.head.appendChild(s);
  }

  function mkVideo() {
    var v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.autoplay = true; v.playsInline = true;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
    v.setAttribute('disablePictureInPicture', ''); v.setAttribute('controlsList', 'nodownload nofullscreen noremoteplayback');
    v.preload = 'auto';
    return v;
  }

  function two(n) { return n < 10 ? '0' + n : '' + n; }
  var DAYS_UK = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П’ятниця', 'Субота'];
  var DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON_UK = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
  var MON_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function setText(el, t) { if (el.textContent !== t) el.textContent = t; }
  function setShow(el, on) { var d = on ? '' : 'none'; if (el.style.display !== d) el.style.display = d; }

  function nightActive(c) {
    if (c.night === 'off') return false;
    var p = c.night.split('-'), a = parseInt(p[0], 10), b = parseInt(p[1], 10), h = new Date().getHours();
    return a > b ? (h >= a || h < b) : (h >= a && h < b);
  }

  function tickClock() {
    if (!root) return;
    var c = cfg(), d = new Date();
    var h = d.getHours(), suffix = '';
    if (!c.h24) { suffix = h >= 12 ? ' PM' : ' AM'; h = h % 12 || 12; }
    var el = root.querySelector('#ssp-time');
    setShow(el, c.clock);
    setText(el, (c.h24 ? two(h) : h) + ':' + two(d.getMinutes()) + (c.seconds ? ':' + two(d.getSeconds()) : '') + suffix);
    var de = root.querySelector('#ssp-date');
    setShow(de, c.date);
    if (c.date) {
      setText(de, uk()
        ? DAYS_UK[d.getDay()] + ', ' + d.getDate() + ' ' + MON_UK[d.getMonth()]
        : DAYS_EN[d.getDay()] + ', ' + MON_EN[d.getMonth()] + ' ' + d.getDate());
    }
    var he = root.querySelector('#ssp-hello');
    setShow(he, c.greeting);
    if (c.greeting) {
      var hr = d.getHours();
      setText(he, hr < 5 ? tr('Доброї ночі', 'Good night') : hr < 12 ? tr('Доброго ранку', 'Good morning') :
        hr < 18 ? tr('Доброго дня', 'Good afternoon') : tr('Доброго вечора', 'Good evening'));
    }
    var dm = root.querySelector('#ssp-dim');
    var dv = String(Math.max(c.dim, nightActive(c) ? 60 : 0) / 100);
    if (dm.style.opacity !== dv) dm.style.opacity = dv;
  }

  function renderWeather() {
    if (!root) return;
    var c = cfg(), el = root.querySelector('#ssp-weather');
    if (!c.weather || !weather) { setShow(el, false); return; }
    var w = weather, ds = wdesc(w.code, w.day);
    var r = function (n) { return Math.round(n); };
    var html = '<div class="ssp-t">' + ds.ico + ' ' + r(w.t) + w.unit + '</div>' +
      '<div class="ssp-s">' + (w.city ? w.city + ' · ' : '') + ds.text + '</div>' +
      '<div class="ssp-s">' + tr('Відчувається ', 'Feels ') + r(w.feels) + w.unit +
      (w.max != null ? ' · ' + r(w.min) + '…' + r(w.max) + w.unit : '') + ' · ' + tr('вітер ', 'wind ') + r(w.wind) + ' ' + w.wu + '</div>';
    if (c.forecast && w.hours.length) {
      html += '<div class="ssp-h">' + w.hours.map(function (x) {
        return '<div><b>' + x.t + '</b>' + wdesc(x.code, x.day).ico + ' ' + r(x.v) + '°</div>';
      }).join('') + '</div>';
    }
    if (c.sun && w.rise && w.set) html += '<div class="ssp-s">🌅 ' + w.rise + '  ·  🌇 ' + w.set + '</div>';
    setShow(el, true);
    if (html !== lastWeatherHtml) { el.innerHTML = html; lastWeatherHtml = html; }
  }

  var CORNERS = ['tl', 'tr', 'br', 'bl'];
  function applyCorner() {
    if (!root) return;
    var c = cfg(), w = root.querySelector('#ssp-w');
    if (!corner) corner = c.pos;
    w.className = corner;
    root.querySelector('#ssp-vig').className = c.style === 'card' ? '' : corner;
    w.style.fontSize = (c.scale * 0.85) + 'em';
  }
  function rotateCorner() {
    var w = root && root.querySelector('#ssp-w');
    if (!w) return;
    w.style.opacity = '0';
    setTimeout(function () {
      if (!root) return;
      corner = CORNERS[(CORNERS.indexOf(corner) + 1) % 4];
      applyCorner();
      w.style.opacity = '1';
    }, 1000);
  }

  // ───────────── ВІДТВОРЕННЯ ─────────────
  function fileName(u) {
    try { return decodeURIComponent(u.split('?')[0].split('/').pop()).replace(/\.[a-z0-9]+$/i, '').replace(/[_]+/g, ' '); } catch (e) { return ''; }
  }

  function playNext() {
    if (!active || !sources.length) return;
    var c = cfg();
    var url = nextUrl(c.shuffle);
    var back = front === vA ? vB : vA;
    back.loop = c.mode === 'timer';
    back.onerror = function () {
      if (!active || back.getAttribute('src') !== url) return;
      failStreak++;
      if (sources.length > 1 && failStreak < 4) setTimeout(playNext, 300);
      else { notify(tr('Скрінсейвер+: відео не відтворюється', 'Screensaver+: video cannot be played')); stopSaver(); }
    };
    back.onloadedmetadata = function () {
      back.onloadedmetadata = null;
      var dur = back.duration;
      if (c.randStart && c.mode === 'timer' && dur && isFinite(dur) && dur > c.interval * 1.5) {
        try { back.currentTime = Math.random() * (dur - c.interval); } catch (e) {}
      }
    };
    back.oncanplay = function () {
      back.oncanplay = null;
      if (!active) return;
      failStreak = 0;
      var p = back.play();
      if (p && p.catch) p.catch(function () {});
      var tf = 'opacity ' + c.fade + 's ease';
      back.style.transition = tf; front.style.transition = tf;
      back.className = 'ssp-on';
      var old = front;
      if (old !== back) old.className = '';
      front = back;
      if (c.showName && root) {
        var nm = root.querySelector('#ssp-name');
        setText(nm, fileName(url));
      }
      setTimeout(function () { if (old !== front) { try { old.pause(); } catch (e) {} } }, c.fade * 1000 + 200);
      clearTimeout(timers.sw);
      if (c.mode === 'timer') timers.sw = setTimeout(playNext, c.interval * 1000);
    };
    back.onended = function () { if (active && cfg().mode === 'end' && back === front) playNext(); };
    back.src = url;
    try { back.load(); } catch (e) {}
  }

  // сторож: якщо відео «зависло» — перемикаємо
  function watchdog() {
    if (!active || !front) return;
    var t = front.currentTime;
    if (!front.paused && t === watchT) {
      if (++watchN >= 3) { watchN = 0; playNext(); }
    } else { watchN = 0; if (front.paused && front.readyState > 2) { var p = front.play(); if (p && p.catch) p.catch(function () {}); } }
    watchT = t;
  }

  function startSaver(manual) {
    if (active || starting) return;
    var c = cfg();
    if (!manual && !c.enable) return;
    starting = true;
    var generation = ++runGeneration;
    warmSources();
    var ready = sources.length && !manual ? Promise.resolve(sources) : loadSources(manual);
    ready.then(function (list) {
      if(generation !== runGeneration) return;
      starting = false;
      if (active) return;
      if (!list.length) {
        if (manual) notify(sourcesErr || tr('Немає відео: вкажіть папку або посилання', 'No videos: set a folder or links'));
        return;
      }
      injectStyle();
      root = document.createElement('div');
      root.id = 'ssp-root';
      if (c.style === 'card') root.className = 'ssp-card';
      vA = mkVideo(); vB = mkVideo();
      root.appendChild(vA); root.appendChild(vB);
      var dim = document.createElement('div'); dim.id = 'ssp-dim'; dim.style.opacity = '0';
      var vig = document.createElement('div'); vig.id = 'ssp-vig';
      var w = document.createElement('div'); w.id = 'ssp-w';
      w.innerHTML = '<div id="ssp-hello"></div><div id="ssp-time"></div><div id="ssp-date"></div><div id="ssp-weather" style="display:none"></div>';
      var nm = document.createElement('div'); nm.id = 'ssp-name';
      if (!c.showName) nm.style.display = 'none';
      root.appendChild(dim); root.appendChild(vig); root.appendChild(w); root.appendChild(nm);
      document.body.appendChild(root);
      active = true;
      front = vA; corner = c.pos; order = []; pos = -1; failStreak = 0; lastWeatherHtml = ''; watchT = -1; watchN = 0;
      applyCorner(); tickClock(); renderWeather();
      timers.clock = setInterval(tickClock, c.seconds ? 1000 : 5000);
      timers.watch = setInterval(watchdog, 6000);
      if (c.rotate) timers.corner = setInterval(rotateCorner, 10 * 60000);
      if (c.sleepH > 0) timers.sleep = setTimeout(sleepScreen, c.sleepH * 3600000);
      loadWeather().then(renderWeather);
      timers.weather = setInterval(function () { loadWeather().then(renderWeather); }, 15 * 60000);
      playNext();
      // у фоні оновлюємо список (якщо стартували зі збереженого)
      if (!manual && Date.now() - sourcesT > 10 * 60000) loadSources(true);
    }, function () { if(generation === runGeneration) starting = false; });
  }

  function sleepScreen() {
    if (!active || !root) return;
    clearTimeout(timers.sw); clearInterval(timers.watch);
    [vA, vB].forEach(function (v) { try { v.pause(); } catch (e) {} });
    root.innerHTML = '';
  }

  function stopSaver() {
    runGeneration++;starting = false;
    if (!active) return;
    active = false;
    clearInterval(timers.clock); clearInterval(timers.weather); clearInterval(timers.corner); clearInterval(timers.watch);
    clearTimeout(timers.sw); clearTimeout(timers.sleep);
    [vA, vB].forEach(function (v) {
      if (!v) return;
      try { v.onerror = null; v.oncanplay = null; v.onended = null; v.onloadedmetadata = null; v.pause(); v.removeAttribute('src'); v.load(); } catch (e) {}
    });
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = vA = vB = front = null;
    lastAct = Date.now();
  }

  // ───────────── ПРОСТІЙ ТА ПРОБУДЖЕННЯ ─────────────
  function playerOpen() {
    try { return !!(Lampa.Player && Lampa.Player.opened && Lampa.Player.opened()); } catch (e) { return false; }
  }

  function hookActivity() {
    ['keydown', 'mousedown', 'click', 'touchstart', 'wheel', 'mousemove'].forEach(function (ev) {
      var handler = function (e) {
        if (active || starting) {
          if (ev === 'mousemove') return;
          e.preventDefault(); e.stopImmediatePropagation();
          stopSaver();
          return;
        }
        lastAct = Date.now();
      };window.addEventListener(ev,handler,true);inputBindings.push({target:window,event:ev,handler:handler});
    });
    var keyup = function (e) {
      if (active) { e.preventDefault(); e.stopImmediatePropagation(); }
    };window.addEventListener('keyup',keyup,true);inputBindings.push({target:window,event:'keyup',handler:keyup});
    var visibility = function(){if(document.hidden)stopSaver();};document.addEventListener('visibilitychange',visibility);inputBindings.push({target:document,event:'visibilitychange',handler:visibility});

    timers.idle = setInterval(function () {
      if (active || document.hidden) return;
      var c = cfg();
      if (!c.enable) return;
      if (playerOpen()) { lastAct = Date.now(); return; }
      if (Date.now() - lastAct >= c.idleMin * 60000) { lastAct = Date.now(); startSaver(false); }
    }, 5000);
  }

  function ownsNative() { var c=cfg();return c.enable && c.killNative && !!(sources.length || c.folder || c.urls); }
  function restoreNative() {
    if(!nativeOwner)return;var owner=nativeOwner;nativeOwner=null;
    if(owner.saver.show===owner.show)owner.saver.show=owner.originalShow;
    if(owner.saver.resetTimer===owner.reset)owner.saver.resetTimer=owner.originalReset;
    owner.saver.resetTimer();
  }
  function patchNative() {
    var S=Lampa.Screensaver;if(!S||typeof S.show!=='function'||typeof S.resetTimer!=='function')return;
    if(!ownsNative()){restoreNative();return;}
    if(nativeOwner)return;
    var owner={saver:S,originalShow:S.show,originalReset:S.resetTimer};nativeOwner=owner;
    owner.show=function(){if(ownsNative())return startSaver(false);return owner.originalShow.apply(this,arguments);};
    owner.reset=function(){if(ownsNative()){clearTimeout(this.timer);this.timer=null;this.time_reset=Date.now();return;}return owner.originalReset.apply(this,arguments);};
    S.show=owner.show;S.resetTimer=owner.reset;
    if(S.worked)S.stopSlideshow();S.resetTimer();
  }
  function nativeSettingsChanged(event){if(event&&/^ssp_/.test(event.name)){if(!cfg().enable)stopSaver();patchNative();}}
  function destroy(){
    stopSaver();Object.keys(timers).forEach(function(k){clearTimeout(timers[k]);clearInterval(timers[k]);});
    inputBindings.forEach(function(b){b.target.removeEventListener(b.event,b.handler,true);b.target.removeEventListener(b.event,b.handler,false);});inputBindings=[];
    Lampa.Storage.listener.remove('change',nativeSettingsChanged);restoreNative();
    var style=document.querySelector('style[data-ssp]');if(style)style.parentNode.removeChild(style);
    Lampa.SettingsApi.removeParams('screensaver_plus');Lampa.SettingsApi.removeComponent('screensaver_plus');
    Lampa.Listener.remove('app',onAppReady);window.screensaver_plus_ready=false;delete window.ScreensaverPlus;
  }

  // ───────────── НАЛАШТУВАННЯ ─────────────
  function initSettings() {
    if (!Lampa.SettingsApi) return;
    var icon = '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M21 3H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7v2H8v2h8v-2h-2v-2h7a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 14H3V5h18v12zM9 8l7 4-7 4z"/></svg>';
    Lampa.SettingsApi.addComponent({ component: 'screensaver_plus', name: tr('Скрінсейвер+', 'Screensaver+'), icon: icon, before: 'more' });

    function add(param, name, descr, onChange) {
      Lampa.SettingsApi.addParam({
        component: 'screensaver_plus', param: param,
        field: { name: name, description: descr || '' },
        onChange: function (v) { if (onChange) onChange(v); }
      });
    }
    function head(t) { add({ name: 'ssp_h_' + t.length + t.charCodeAt(0), type: 'title' }, t); }
    function reset() { sources = []; sourcesT = 0; weather = null; weatherT = 0; Lampa.Storage.set('ssp_loc', null); Lampa.Storage.set('ssp_cache', null); }
    var S = tr('с', 's'), M = tr('хв', 'min'), H = tr('год', 'h');

    add({ name: 'ssp_enable', type: 'trigger', 'default': true }, tr('Увімкнути Скрінсейвер+', 'Enable Screensaver+'));
    add({ name: 'ssp_idle', type: 'select', 'default': '5',
      values: { '1': '1 ' + M, '2': '2 ' + M, '3': '3 ' + M, '5': '5 ' + M, '10': '10 ' + M, '15': '15 ' + M, '30': '30 ' + M, '60': '60 ' + M } },
      tr('Запускати після простою', 'Start after idle'));
    add({ name: 'ssp_preview', type: 'button' }, tr('▶ Запустити заставку зараз', '▶ Start screensaver now'), '',
      function () { setTimeout(function () { startSaver(true); }, 300); });

    head(tr('Відео', 'Video'));
    add({ name: 'ssp_folder', type: 'input', values: '', 'default': '', placeholder: '/storage/emulated/0/Movies/wallpapers' },
      tr('Папка з відео', 'Video folder'),
      tr('Шлях на пристрої або http://IP:8000/ (serve.py). Спершу натисніть «Перевірити»', 'Device path or http://IP:8000/ (serve.py). Press "Test" first'), reset);
    add({ name: 'ssp_urls', type: 'input', values: '', 'default': '', placeholder: 'http://…/a.mp4, http://…/b.mp4' },
      tr('Додаткові посилання', 'Extra links'), tr('Через кому; додаються до папки', 'Comma-separated; added to the folder'), reset);
    add({ name: 'ssp_test', type: 'button' }, tr('🔍 Перевірити папку', '🔍 Test folder'), '',
      function () {
        loadSources(true).then(function (l) {
          if (l.length) notify(tr('Знайдено відео: ', 'Videos found: ') + l.length + (sourcesVia ? ' (' + sourcesVia + ')' : ''));
          else notify(sourcesErr || tr('Відео не знайдено', 'No videos found'));
        });
      });
    add({ name: 'ssp_mode', type: 'select', 'default': 'timer',
      values: { timer: tr('За таймером', 'By timer'), end: tr('Коли відео закінчиться', 'When video ends') } },
      tr('Перемикання відео', 'Switch videos'));
    add({ name: 'ssp_interval', type: 'select', 'default': '60',
      values: { '15': '15 ' + S, '30': '30 ' + S, '60': '1 ' + M, '120': '2 ' + M, '300': '5 ' + M, '600': '10 ' + M, '1800': '30 ' + M } },
      tr('Інтервал (режим таймера)', 'Interval (timer mode)'));
    add({ name: 'ssp_shuffle', type: 'trigger', 'default': true }, tr('Випадковий порядок', 'Shuffle'));
    add({ name: 'ssp_randstart', type: 'trigger', 'default': true }, tr('Випадковий момент старту', 'Random start point'),
      tr('Довгі відео щоразу починаються з іншого місця', 'Long videos start from a different spot each time'));
    add({ name: 'ssp_fade', type: 'select', 'default': '1.5',
      values: { '0': tr('Без плавності', 'None'), '0.8': '0.8 ' + S, '1.5': '1.5 ' + S, '3': '3 ' + S } },
      tr('Плавний перехід', 'Crossfade'));
    add({ name: 'ssp_name', type: 'trigger', 'default': false }, tr('Показувати назву файлу', 'Show file name'));

    head(tr('Вигляд', 'Look'));
    add({ name: 'ssp_style', type: 'select', 'default': 'card',
      values: { card: tr('Картка (напівпрозора)', 'Card (translucent)'), minimal: tr('Мінімалістичний', 'Minimal') } },
      tr('Стиль віджета', 'Widget style'));
    add({ name: 'ssp_pos', type: 'select', 'default': 'br',
      values: { tl: tr('Угорі зліва', 'Top left'), tr: tr('Угорі справа', 'Top right'), bl: tr('Внизу зліва', 'Bottom left'), br: tr('Внизу справа', 'Bottom right') } },
      tr('Розташування', 'Position'));
    add({ name: 'ssp_scale', type: 'select', 'default': '1',
      values: { '0.7': tr('Менший', 'Smaller'), '1': tr('Звичайний', 'Normal'), '1.3': tr('Більший', 'Larger'), '1.6': tr('Великий', 'Large') } },
      tr('Розмір', 'Size'));
    add({ name: 'ssp_dim', type: 'select', 'default': '20',
      values: { '0': tr('Без затемнення', 'None'), '20': '20%', '35': '35%', '50': '50%', '65': '65%' } },
      tr('Затемнення відео', 'Video dimming'));
    add({ name: 'ssp_night', type: 'select', 'default': '22-7',
      values: { 'off': tr('Вимкнено', 'Off'), '22-7': '22:00 – 7:00', '23-6': '23:00 – 6:00', '21-8': '21:00 – 8:00' } },
      tr('Нічний режим (темніше)', 'Night mode (darker)'), tr('Вночі заставка не світить у кімнаті', 'Keeps the room dark at night'));
    add({ name: 'ssp_rotate', type: 'trigger', 'default': true }, tr('Змінювати кут кожні 10 хв', 'Rotate corner every 10 min'),
      tr('Захист OLED/плазми від вигорання', 'Protects OLED/plasma from burn-in'));

    head(tr('Годинник', 'Clock'));
    add({ name: 'ssp_clock', type: 'trigger', 'default': true }, tr('Показувати час', 'Show time'));
    add({ name: 'ssp_seconds', type: 'trigger', 'default': false }, tr('Секунди', 'Seconds'));
    add({ name: 'ssp_h24', type: 'trigger', 'default': true }, tr('24-годинний формат', '24-hour format'));
    add({ name: 'ssp_date', type: 'trigger', 'default': true }, tr('Дата та день тижня', 'Date and weekday'));
    add({ name: 'ssp_greeting', type: 'trigger', 'default': true }, tr('Привітання за часом доби', 'Time-of-day greeting'));

    head(tr('Погода', 'Weather'));
    add({ name: 'ssp_weather', type: 'trigger', 'default': true }, tr('Показувати погоду', 'Show weather'), tr('Open-Meteo, оновлення кожні 15 хв', 'Open-Meteo, refreshed every 15 min'));
    add({ name: 'ssp_city', type: 'input', values: '', 'default': '', placeholder: 'Київ' },
      tr('Місто', 'City'), tr('Порожньо — автоматично за IP', 'Empty — detect by IP'), reset);
    add({ name: 'ssp_forecast', type: 'trigger', 'default': true }, tr('Прогноз на найближчі години', 'Next hours forecast'));
    add({ name: 'ssp_sun', type: 'trigger', 'default': true }, tr('Схід і захід сонця', 'Sunrise and sunset'));
    add({ name: 'ssp_fahrenheit', type: 'trigger', 'default': false }, tr('Температура у °F', 'Temperature in °F'), '', reset);

    head(tr('Інше', 'Other'));
    add({ name: 'ssp_sleep', type: 'select', 'default': '0',
      values: { '0': tr('Ніколи', 'Never'), '1': '1 ' + H, '2': '2 ' + H, '4': '4 ' + H, '8': '8 ' + H } },
      tr('Чорний екран після', 'Black screen after'), tr('Зупиняє відео, якщо заставка йде надто довго', 'Stops video if the saver runs too long'));
    add({ name: 'ssp_kill_native', type: 'trigger', 'default': true }, tr('Вимкнути стандартну заставку Lampa', 'Disable stock Lampa screensaver'));
  }

  // ───────────── СТАРТ ─────────────
  function boot() {
    if(booted)return;booted=true;
    Lampa.Storage.listener.follow('change',nativeSettingsChanged);
    try { initSettings(); } catch (e) {}
    try { hookActivity(); } catch (e) {}
    try { patchNative(); } catch (e) {}
    timers.patch = setTimeout(patchNative, 3000);
    timers.warm = setTimeout(function () { warmSources(); if (cfg().enable && (cfg().folder || cfg().urls)) loadSources(false); }, 4000);
    window.ScreensaverPlus = { version:'2.1.0', destroy:destroy, state:function(){return {active:active,starting:starting,nativeOwned:!!nativeOwner};}, start: function () { startSaver(true); }, stop: stopSaver, reload: function () { return loadSources(true); } };
  }

  function onAppReady(e){if(e.type==='ready')boot();}
  if (window.appready) boot();
  else Lampa.Listener.follow('app', onAppReady);
})();
