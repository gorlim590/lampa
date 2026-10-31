/*
 * Lampa single-entry loader. Keep startup-critical code ES5 for TV WebViews.
 * Trakt Home is assembled before the first visible Home; optional providers
 * wait for the native app lifecycle.
 */
(function () {
  'use strict';

  if (window.LampaLoaderStarted) return;
  window.LampaLoaderStarted = true;

  var BASE = String(window.LAMPA_PLUGINS_BASE || 'https://gorlim590.github.io/lampa/').replace(/\/?$/, '/');
  var VERSION = String(window.LAMPA_PLUGINS_VERSION || '20261031-trakt-home-first-2');
  // Lampa requests Home rows lazily. Only the first few registered Trakt rows
  // are part of startup; waiting for every catalogue row can deadlock Home.
  var INITIAL_TRAKT_ROW_COUNT = 4;
  var TIMEOUT_MS = 8000;
  var READY_CHECK_MS = 100;
  var READY_MAX_CHECKS = 300;
  var CRITICAL = [
    'ui/stremio-hybrid.js', 'ui/interface-plus.js', 'ui/design-optimized.js',
    'trakt/trakt.js', 'trakt/trakt-plus.js',
    'plugins-to-enable/home-policy.js', 'plugins-to-enable/home-history.js'
  ];
  var DEFAULT_DEFERRED = [
    'providers/torrent-search.js', 'media/average-rating.js', 'ui/cardify-plus.js',
    'localization/translate.js'
  ];
  // The optional full-cast browser is a built-in Hybrid capability. Load it
  // after appready even when an installation has an explicit optional list.
  var BUILTIN_DEFERRED = ['ui/full-cast.js'];
  var TORRENT_ENTRY='ui/torrent-cinema.js';
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

  function installTraktHomeGate() {
    if (window.LAMPA_TRAKT_HOME_FIRST === false) return null;
    var root = document.documentElement;
    if (!root || !root.classList || typeof document.createElement !== 'function') return null;
    var gate = {
      policyReady: false, rowsReady: false, requested: false, building: false,
      expected: [], totalExpected: 0, completed: {}, timer: null, poll: null, deadline: 0, node: null,
      status: 'waiting', reason: null
    };
    var style = document.createElement('style');
    style.id = 'lampa-trakt-home-gate-style';
    style.textContent = 'html.lampa-trakt-home-pending .activity--active{visibility:hidden!important}#lampa-trakt-home-gate{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:4vw;box-sizing:border-box;background:#121023;color:#f0eef8;font:500 clamp(18px,2vw,32px)/1.45 system-ui,sans-serif;text-align:center}#lampa-trakt-home-gate button{display:block;margin:1.4em auto 0;padding:.7em 1.4em;border:1px solid #9775fa;border-radius:.6em;background:#29233e;color:#fff;font:inherit;cursor:pointer}';
    if (document.head && document.head.appendChild) document.head.appendChild(style);
    root.classList.add('lampa-trakt-home-pending');
    state.traktHomeGate = { status: 'waiting', reason: null };

    function update(message, retry) {
      if (!document.body) return;
      if (!gate.node) {
        gate.node = document.createElement('div'); gate.node.id = 'lampa-trakt-home-gate';
        document.body.appendChild(gate.node);
      }
      while (gate.node.firstChild) gate.node.removeChild(gate.node.firstChild);
      var text = document.createElement('div'); text.textContent = message; gate.node.appendChild(text);
      if (retry) {
        var button = document.createElement('button'); button.type = 'button'; button.textContent = 'Спробувати ще';
        button.onclick = function () { gate.completed = {}; gate.building = false; gate.requested = true; gate.deadline = now() + 45000; gate.status = 'waiting'; gate.reason = null; state.traktHomeGate = { status: gate.status, reason: null }; update('Завантажую категорії Trakt…'); tryBuild(); };
        gate.node.appendChild(button);
      }
    }
    function release(status, reason) {
      gate.status = status; gate.reason = reason || null; state.traktHomeGate = { status: status, reason: gate.reason };
      root.classList.remove('lampa-trakt-home-pending');
      if (gate.node && gate.node.parentNode) gate.node.parentNode.removeChild(gate.node);
      if (style.parentNode) style.parentNode.removeChild(style);
      if (gate.timer) clearTimeout(gate.timer); if (gate.poll) clearTimeout(gate.poll);
    }
    function hasTraktRows() {
      var active = window.Lampa && Lampa.Activity && Lampa.Activity.active && Lampa.Activity.active();
      var comp = active && active.component === 'main' && active.activity && active.activity.component;
      return !!(comp && Array.isArray(comp.items) && comp.items.some(function (item) {
        var data = item && item.data;
        return data && data.home_row_origin === 'trakt' && Array.isArray(data.results) && data.results.length > 0;
      }));
    }
    function pollRows() {
      if (gate.status !== 'waiting') return;
      if (hasTraktRows() && gate.expected.every(function (name) { return !!gate.completed[name]; })) return release('ready', null);
      if (now() >= gate.deadline) {
        gate.status = 'error'; gate.reason = hasTraktRows() ? 'trakt-rows-incomplete' : 'no-trakt-rows';
        state.traktHomeGate = { status: gate.status, reason: gate.reason };
        update('Не вдалося завантажити категорії Trakt. Перевір авторизацію та мережу.', true); return;
      }
      gate.poll = setTimeout(pollRows, 150);
    }
    function tryBuild() {
      if (!gate.requested || !gate.policyReady || !gate.rowsReady || gate.building || gate.status !== 'waiting') return;
      var active = window.Lampa && Lampa.Activity && Lampa.Activity.active && Lampa.Activity.active();
      if (active && active.component !== 'main') return release('bypassed', 'initial-route-not-home');
      if (!active || !Lampa.Activity.replace) { gate.poll = setTimeout(tryBuild, 120); return; }
      gate.building = true; gate.deadline = now() + 45000; state.traktHomeGate = { status: 'building', reason: null };
      update('Завантажую категорії Trakt…');
      try { Lampa.Activity.replace({ url: '', title: 'Main', component: 'main', source: active.source || 'tmdb', page: 1 }); }
      catch (error) { gate.building = false; gate.reason = 'home-build-failed'; gate.status = 'error'; state.traktHomeGate = { status: gate.status, reason: gate.reason }; update('Не вдалося відкрити категорії Trakt.', true); return; }
      gate.poll = setTimeout(pollRows, 150);
    }
    gate.homePolicyReady = function () {
      gate.policyReady = true;
      var active = window.Lampa && Lampa.Activity && Lampa.Activity.active && Lampa.Activity.active();
      if (active && active.component !== 'main') return release('bypassed', 'initial-route-not-home');
      if (active && active.component === 'main' && !gate.requested) { gate.requested = true; gate.deadline = now() + 45000; }
      tryBuild();
    };
    gate.traktRowsReady = function (names) {
      var all = Array.isArray(names) ? names : [];
      gate.totalExpected = all.length;
      gate.expected = all.slice(0, Math.min(INITIAL_TRAKT_ROW_COUNT, all.length));
      gate.rowsReady = gate.expected.length > 0;
      tryBuild();
    };
    gate.requestHomeBuild = function () {
      if (gate.status === 'ready' || gate.status === 'bypassed') return;
      gate.requested = true; gate.deadline = now() + 45000; tryBuild();
    };
    gate.homeRowComplete = function (name) { if (gate.expected.indexOf(name) >= 0) gate.completed[name] = true; };
    gate.fail = function (reason) { gate.status = 'error'; gate.reason = reason || 'startup-dependency-failed'; state.traktHomeGate = { status: gate.status, reason: gate.reason }; update('Не вдалося завантажити категорії Trakt.', true); };
    gate.timer = setTimeout(function () { if (gate.status === 'waiting' && !gate.building) gate.fail('startup-dependency-timeout'); }, 45000);
    update('Завантажую категорії Trakt…');
    window.LampaTraktHomeGate = gate;
    return gate;
  }

  var traktHomeGate = installTraktHomeGate();

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
      if((url.origin===base.origin||url.hostname==='gorlim590.github.io')&&/(?:^|\/)(?:torrents-redesign\.js|ui\/torrent-overlay\.js|ui\/torrent-cinema\.js)$/.test(pathname))return TORRENT_ENTRY;
      var known = CRITICAL.concat(DEFAULT_DEFERRED, BUILTIN_DEFERRED);
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
    if(pathKey(value)===TORRENT_ENTRY)value=TORRENT_ENTRY;
    if (/^https?:\/\//i.test(value)) return value;
    var separator = value.indexOf('?') === -1 ? '?' : '&';
    return BASE + value.replace(/^\//, '') + separator + 'v=' + encodeURIComponent(VERSION);
  }

  function loadOne(path, stage, index, done) {
    var key = pathKey(path);
    if (seen[key] || key===TORRENT_ENTRY&&(window.LampaTorrentCinema||document.querySelector&&document.querySelector('script[data-torrent-cinema]'))) {
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

  // Start the visual adapters' downloads together. Dynamic scripts with
  // async=false still execute in insertion order, while network latency no
  // longer accumulates across the critical shell lane.
  function loadParallelOrdered(list, stage, done) {
    if (!list.length) { done(); return; }
    var remaining = list.length;
    for (var i = 0; i < list.length; i++) {
      loadOne(list[i], stage, i + 1, function () {
        remaining--;
        if (!remaining) done();
      });
    }
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
      if (BUILTIN_DEFERRED.indexOf(key) >= 0) continue;
      if (key === 'trakt/trakt.js') traktCore.push(configured[i]);
      else if (key === 'trakt/trakt-plus.js') traktPlus.push(configured[i]);
      else independent.push(configured[i]);
    }
    independent = BUILTIN_DEFERRED.concat(independent);
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

  loadParallelOrdered(CRITICAL, 'critical', function () {
    state.criticalFinishedAt = now();
    state.stage = 'waiting-for-appready';
    waitForAppReady();
  });
})();
