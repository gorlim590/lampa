/*
 * Lampa single-entry loader. Keep startup-critical code ES5 for TV WebViews.
 * Hybrid and its essential presentation adapters load before appready; optional
 * providers wait for the native app lifecycle and never block the first shell.
 */
(function () {
  'use strict';

  if (window.LampaLoaderStarted) return;
  window.LampaLoaderStarted = true;

  var BASE = String(window.LAMPA_PLUGINS_BASE || 'https://gorlim590.github.io/lampa/').replace(/\/?$/, '/');
  var VERSION = String(window.LAMPA_PLUGINS_VERSION || '20261027-ui-first-1');
  var TIMEOUT_MS = 8000;
  var READY_CHECK_MS = 100;
  var READY_MAX_CHECKS = 300;
  var CRITICAL = ['ui/stremio-hybrid.js', 'ui/interface-plus.js', 'ui/design-optimized.js'];
  var DEFAULT_DEFERRED = [
    'trakt/trakt.js', 'trakt/trakt-plus.js', 'providers/torrent-search.js',
    'media/average-rating.js', 'ui/cardify-plus.js', 'localization/translate.js'
  ];
  var seen = {};
  var state = {
    version: VERSION, startedAt: now(), appreadyAtStart: !!window.appready,
    stage: 'critical', criticalStartedAt: now(),
    criticalFinishedAt: null, deferredStartedAt: null, deferredFinishedAt: null,
    waitingForAppReady: false, requested: 0, loaded: 0, failed: 0, timedOut: 0,
    lateLoads: 0, skipped: 0, activeDeferredLanes: 0,
    readinessChecks: 0, readinessFailure: null
  };
  window.LampaLoaderDiagnostics = state;
  var readinessTimer = null, readinessListener = null, readinessOwner = null, readinessActive = false;

  function now() {
    try { if (window.performance && typeof window.performance.now === 'function') return Math.round(window.performance.now() * 10) / 10; }
    catch (e) { /* Use the legacy clock below. */ }
    return new Date().getTime();
  }

  function log(stage, index, result) {
    try { if (window.console && console.log) console.log('[lampa-loader] ' + stage + ' ' + index + ' ' + result); }
    catch (e) { /* Startup must not depend on diagnostics. */ }
  }

  function pathKey(path) {
    var value = String(path || '').replace(/^\s+|\s+$/g, '');
    try {
      var base = new URL(BASE, document.location && document.location.href);
      var url = new URL(value, base.href);
      var pathname = url.pathname.replace(/^\//, '');
      var known = CRITICAL.concat(DEFAULT_DEFERRED);
      for (var i = 0; i < known.length; i++) if (pathname === known[i] || pathname.slice(-known[i].length) === known[i]) return known[i];
      if (url.origin === base.origin && url.pathname.indexOf(base.pathname) === 0) return url.pathname.slice(base.pathname.length);
      return url.origin + url.pathname;
    } catch (e) {
      return value.split(/[?#]/)[0];
    }
  }

  function isCritical(path) {
    var key = pathKey(path);
    for (var i = 0; i < CRITICAL.length; i++) if (key === CRITICAL[i]) return true;
    return false;
  }

  function readDeferredList() {
    var list = null, explicit = false;
    if (Object.prototype.toString.call(window.LAMPA_PLUGINS_LIST) === '[object Array]') { list = window.LAMPA_PLUGINS_LIST; explicit = true; }
    else {
      try {
        var stored = window.Lampa && Lampa.Storage && Lampa.Storage.get('gl_loader_plugins');
        if (stored) {
          var parts = String(stored).split(',');
          list = [];
          for (var i = 0; i < parts.length; i++) {
            var part = parts[i].replace(/^\s+|\s+$/g, '');
            if (part) list.push(part);
          }
        }
      } catch (e) { list = null; }
    }
    if (!list || !list.length && !explicit) list = DEFAULT_DEFERRED;
    var output = [], localSeen = {};
    for (var n = 0; n < list.length; n++) {
      var item = String(list[n] || '').replace(/^\s+|\s+$/g, '');
      if (!item || !/^https?:\/\//i.test(item) && /^[a-z]+:/i.test(item)) continue;
      var key = pathKey(item);
      if (isCritical(item) || localSeen[key]) continue;
      localSeen[key] = true;
      output.push(item);
    }
    return output;
  }

  function buildUrl(path) {
    var value = String(path || '').replace(/^\s+|\s+$/g, '');
    if (/^https?:\/\//i.test(value)) return value;
    var separator = value.indexOf('?') === -1 ? '?' : '&';
    return BASE + value.replace(/^\//, '') + separator + 'v=' + encodeURIComponent(VERSION);
  }

  function loadOne(path, stage, index, done) {
    var key = pathKey(path);
    if (seen[key]) {
      state.skipped++;
      done('duplicate');
      return;
    }
    seen[key] = true;
    var script, timer, finished = false, timedOut = false;
    state.requested++;

    function finish(result) {
      if (finished) return false;
      finished = true;
      if (timer) clearTimeout(timer);
      if (result === 'loaded') state.loaded++;
      else if (result === 'timeout') { state.failed++; state.timedOut++; timedOut = true; }
      else state.failed++;
      log(stage, index, result);
      done(result);
      return true;
    }

    try {
      script = document.createElement('script');
      script.async = false;
      script.src = buildUrl(path);
      script.onload = function () {
        if (!finish('loaded')) { if (timedOut) state.lateLoads++; }
      };
      script.onerror = function () {
        if (!finish('failed') && timedOut) state.lateLoads++;
        if (script.parentNode && script.parentNode.removeChild) script.parentNode.removeChild(script);
      };
      timer = setTimeout(function () { finish('timeout'); }, TIMEOUT_MS);
      var parent = document.head || document.getElementsByTagName('head')[0] || document.documentElement;
      if (!parent || !parent.appendChild) throw new Error('script host unavailable');
      parent.appendChild(script);
    } catch (e) {
      finish('failed');
      if (script && script.parentNode && script.parentNode.removeChild) script.parentNode.removeChild(script);
    }
  }

  function loadSeries(list, stage, index, done) {
    if (index >= list.length) { done(); return; }
    loadOne(list[index], stage, index + 1, function () { loadSeries(list, stage, index + 1, done); });
  }

  function removeReadyListener() {
    if (!readinessListener) return;
    try {
      if (readinessOwner && readinessOwner.remove) readinessOwner.remove('app', readinessListener);
    } catch (e) { state.readinessListenerRemoveFailed = true; }
    readinessListener = null;
    readinessOwner = null;
  }

  function finishReadiness() {
    if (readinessTimer !== null) clearTimeout(readinessTimer);
    readinessTimer = null;
    readinessActive = false;
    state.waitingForAppReady = false;
    removeReadyListener();
  }

  function onNativeReady() {
    if (!readinessActive || !window.Lampa) return;
    finishReadiness();
    startDeferred();
  }

  function checkNativeReady() {
    if (!readinessActive) return;
    state.readinessChecks++;
    if (window.appready && window.Lampa) { onNativeReady(); return; }

    var L = window.Lampa;
    if (!readinessListener && L && L.Listener && L.Listener.follow && L.Listener.remove) {
      readinessOwner = L.Listener;
      readinessListener = function (event) {
        if (event && event.type === 'ready') onNativeReady();
      };
      try { readinessOwner.follow('app', readinessListener); }
      catch (e) {
        readinessListener = null;
        readinessOwner = null;
        state.readinessSubscribeFailed = true;
      }
      if (window.appready && window.Lampa) { onNativeReady(); return; }
    }

    if (state.readinessChecks >= READY_MAX_CHECKS) {
      finishReadiness();
      state.readinessFailure = 'lampa-readiness-timeout';
      state.stage = 'deferred-unavailable';
      log('readiness', 0, 'timeout');
      return;
    }
    readinessTimer = setTimeout(checkNativeReady, READY_CHECK_MS);
  }

  function startDeferred() {
    if (state.deferredStartedAt !== null) return;
    state.waitingForAppReady = false;
    state.stage = 'deferred';
    state.deferredStartedAt = now();
    var configured = readDeferredList();
    var traktCore = [], traktPlus = [], independent = [];
    for (var i = 0; i < configured.length; i++) {
      var key = pathKey(configured[i]);
      if (key === 'trakt/trakt.js') traktCore.push(configured[i]);
      else if (key === 'trakt/trakt-plus.js') traktPlus.push(configured[i]);
      else independent.push(configured[i]);
    }
    state.activeDeferredLanes = 0;
    var completed = 0;
    function laneDone() {
      completed++;
      if (completed === 2) {
        state.activeDeferredLanes = 0;
        state.deferredFinishedAt = now();
        state.stage = 'complete';
      }
    }

    state.activeDeferredLanes = 2;
    var coreOk = traktCore.length === 0;
    function finishTraktCore() {
      if (traktCore.length) {
        loadOne(traktCore[0], 'deferred', 1, function (result) {
          coreOk = result === 'loaded';
          if (traktPlus.length && coreOk) loadOne(traktPlus[0], 'deferred', 2, function () { laneDone(); });
          else {
            if (traktPlus.length) state.skipped++;
            laneDone();
          }
        });
      } else if (traktPlus.length && coreOk) {
        state.skipped++;
        laneDone();
      } else laneDone();
    }

    function finishIndependent() {
      loadSeries(independent, 'deferred', 0, laneDone);
    }
    finishTraktCore();
    finishIndependent();
  }

  function waitForAppReady() {
    if (readinessActive || state.deferredStartedAt !== null) return;
    readinessActive = true;
    state.waitingForAppReady = true;
    state.stage = 'waiting-for-appready';
    checkNativeReady();
  }

  loadSeries(CRITICAL, 'critical', 0, function () {
    state.criticalFinishedAt = now();
    state.stage = 'waiting-for-appready';
    waitForAppReady();
  });
})();
