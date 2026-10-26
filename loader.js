/*
 * lampa loader — один плагін замість десяти.
 *
 * Підключи в Lampa лише цей файл. Він вантажить плагіни по черзі у фіксованому
 * порядку, ізолює помилки (один зламаний плагін не зупиняє решту) і додає ?v=
 * до URL, щоб ТВ-браузер не тримав застарілий кеш.
 *
 * Налаштування (необов'язково, ставляться до підключення loader.js):
 *   window.LAMPA_PLUGINS_BASE    — базовий URL репозиторію (за замовчуванням GitHub Pages)
 *   window.LAMPA_PLUGINS_VERSION — рядок для ?v= (змінюй, щоб скинути кеш)
 *   window.LAMPA_PLUGINS_LIST    — масив шляхів, що замінює список за замовчуванням
 *   Lampa.Storage 'gl_loader_plugins' — те саме, але рядком через кому
 *
 * Код у ES5 (без async/arrow) для старих Smart TV / Android TV.
 */
(function () {
  'use strict';

  if (window.LampaLoaderStarted) return;
  window.LampaLoaderStarted = true;

  var BASE = String(window.LAMPA_PLUGINS_BASE || 'https://gorlim590.github.io/lampa/').replace(/\/?$/, '/');
  var VERSION = String(window.LAMPA_PLUGINS_VERSION || '20261026-trakt-rating-widgets-3.4.1');
  var TIMEOUT_MS = 8000;

  // Базовий порядок з README: Trakt → Trakt+ → Interface+ → YDesign → решта за потреби.
  var DEFAULT_LIST = [
    'trakt/trakt.js',
    'trakt/trakt-plus.js',
    'providers/torrent-search.js',
    'ui/interface-plus.js',
    'ui/design-optimized.js',
    'media/average-rating.js',
    'ui/cardify-plus.js',
    'localization/translate.js'
  ];

  function readList() {
    if (Object.prototype.toString.call(window.LAMPA_PLUGINS_LIST) === '[object Array]') return window.LAMPA_PLUGINS_LIST;
    try {
      var stored = window.Lampa && Lampa.Storage && Lampa.Storage.get('gl_loader_plugins');
      if (stored) {
        var parts = String(stored).split(',');
        var out = [];
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i].replace(/^\s+|\s+$/g, '');
          if (p) out.push(p);
        }
        if (out.length) return out;
      }
    } catch (e) { /* ігноруємо — візьмемо список за замовчуванням */ }
    return DEFAULT_LIST;
  }

  function log(msg) {
    try { if (window.console && console.log) console.log('[lampa-loader] ' + msg); } catch (e) { /* ігноруємо */ }
  }

  function buildUrl(path) {
    if (/^https?:\/\//i.test(path)) return path;
    var sep = path.indexOf('?') === -1 ? '?' : '&';
    return BASE + path.replace(/^\//, '') + sep + 'v=' + encodeURIComponent(VERSION);
  }

  function loadOne(path, done) {
    var finished = false;
    function finish(ok) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      log((ok ? 'OK  ' : 'FAIL ') + path);
      done();
    }
    var timer = setTimeout(function () { finish(false); }, TIMEOUT_MS);
    try {
      Lampa.Utils.putScriptAsync([buildUrl(path)], function () { finish(true); }, function () { finish(false); });
    } catch (e) {
      finish(false);
    }
  }

  function run() {
    var list = readList();
    var index = 0;
    (function next() {
      if (index >= list.length) return;
      var path = list[index++];
      loadOne(path, next);
    })();
  }

  if (window.appready) run();
  else if (window.Lampa && Lampa.Listener) {
    Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') run(); });
  }
})();
