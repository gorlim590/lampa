/* Full, remote-friendly cast browsing built on native Lampa Full, Category and Person components. */
(function () {
  'use strict';

  if (window.LampaFullCast && window.LampaFullCast.version === '1.0.1') return;
  if (!window.Lampa || !Lampa.Component || !Lampa.Maker || !Lampa.Listener || !Lampa.Api) return;

  var PREVIEW_LIMIT = 10;
  var PAGE_SIZE = 30;
  var CACHE_TTL = 6 * 60 * 60 * 1000;
  var CACHE_LIMIT = 16;
  var REQUEST_TIMEOUT = 15000;
  var cache = [];
  var jobs = Object.create(null);
  var states = [];
  var componentRegistered = false;
  var styleInstallAttempts = 0;
  var styleInstallTimer = null;

  var css = [
    'body.stremio-hybrid .items-line .sh-full-cast-open-card .card__view{display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,#302a45,#191822)}',
    'body.stremio-hybrid .items-line .sh-full-cast-open-card .card__view:after{content:"↗";display:flex;align-items:center;justify-content:center;width:2.1em;height:2.1em;border:1px solid var(--sh-border);border-radius:50%;background:#17151fd9;color:var(--sh-accent-soft);font-size:1.25em}',
    'body.stremio-hybrid .items-line .sh-full-cast-open-card .card__title{color:var(--sh-accent-soft);font-weight:700;white-space:normal}',
    'body.stremio-hybrid .sh-full-cast-grid .card__title{font-size:1.04em;font-weight:600;line-height:1.3;white-space:normal}',
    'body.stremio-hybrid .sh-full-cast-grid .sh-full-cast-role{position:static;display:-webkit-box;margin:.28em .4em .65em;max-height:3.9em;overflow:hidden;color:var(--sh-muted);font-size:.82em;line-height:1.3;white-space:normal;-webkit-line-clamp:3;-webkit-box-orient:vertical;pointer-events:none}',
    'body.stremio-hybrid .sh-full-cast-grid .card.focus .sh-full-cast-role{color:var(--sh-text)}',
    'body.stremio-hybrid .sh-full-cast-grid .sh-full-cast-status{padding:.7em 1em;color:#d6d1e2;font-size:.9em}',
    'body.stremio-hybrid .sh-full-cast-grid .card.sh-full-cast-retry .card__view{display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,#2b2640,#171725)}',
    'body.stremio-hybrid .sh-full-cast-grid .card.sh-full-cast-retry .card__view:after{content:"↻";font-size:3em;color:#d4c6ff}'
  ].join('\n');

  function validId(value) {
    return value !== undefined && value !== null && String(value).trim() !== '';
  }

  function roleText(person, kind) {
    var values = [];
    if (kind === 'tv' && Array.isArray(person.roles)) {
      person.roles.forEach(function (role) {
        var value = role && String(role.character || '').trim();
        if (value) values = mergeRole(values, value);
      });
    }
    if (!values.length && person.character) values = mergeRole(values, String(person.character).trim());
    return values.join(' · ');
  }

  function roleKey(value) {
    return String(value || '').replace(/\([^)]*\)/g, ' ').toLowerCase().replace(/[.,:;!?"'`~@#$%^&*+=<>\[\]{}|\\/\-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function mergeRole(values, value) {
    var key = roleKey(value);
    if (!key) return values;
    for (var i = 0; i < values.length; i++) {
      if (roleKey(values[i]) === key) {
        if (values[i].length > value.length) values[i] = value;
        return values;
      }
    }
    values.push(value);
    return values;
  }

  function mergeRoleText(existing, value) {
    var roles = existing ? existing.split(' · ') : [];
    return mergeRole(roles, value).join(' · ');
  }

  function normalizeCredits(payload, kind) {
    var raw = payload && Array.isArray(payload.cast) ? payload.cast : [];
    var actors = [], byId = Object.create(null);
    raw.forEach(function (person, index) {
      if (!person || !validId(person.id) || !String(person.name || '').trim()) return;
      var id = String(person.id), role = roleText(person, kind), existing = byId[id];
      if (existing) {
        if (role) role.split(' · ').forEach(function (caption) { existing.character = mergeRoleText(existing.character, caption); });
        if (!existing.profile_path && person.profile_path) existing.profile_path = person.profile_path;
        return;
      }
      var actor = {
        id: person.id,
        name: String(person.name).trim(),
        character: role,
        profile_path: typeof person.profile_path === 'string' ? person.profile_path : null,
        source: 'tmdb',
        media_type: 'person',
        _shCreditOrder: index
      };
      byId[id] = actor;
      actors.push(actor);
    });
    return actors;
  }

  function currentLanguage() {
    try {
      var storage = Lampa.Storage;
      var language = storage && (typeof storage.field === 'function' ? storage.field('tmdb_lang') : storage.get('tmdb_lang'));
      return String(language || 'uk').toLowerCase();
    } catch (error) { return 'uk'; }
  }

  function keyFor(kind, id, language) { return kind + ':' + String(id) + ':' + String(language || currentLanguage()); }

  function cached(kind, id, language) {
    var key = keyFor(kind, id, language), found;
    cache = cache.filter(function (entry) {
      if (entry.key === key) found = entry;
      return Date.now() - entry.time < CACHE_TTL;
    });
    if (!found) return null;
    found.time = Date.now();
    return found.actors;
  }

  function store(kind, id, language, actors) {
    var key = keyFor(kind, id, language);
    cache = cache.filter(function (entry) { return entry.key !== key && Date.now() - entry.time < CACHE_TTL; });
    cache.push({ key: key, time: Date.now(), actors: actors });
    while (cache.length > CACHE_LIMIT) cache.shift();
    return actors;
  }

  function loadCredits(kind, id) {
    if ((kind !== 'movie' && kind !== 'tv') || !validId(id)) return Promise.reject({ invalid: true });
    var language = currentLanguage();
    var ready = cached(kind, id, language);
    if (ready) return Promise.resolve(ready);
    var key = keyFor(kind, id, language);
    if (jobs[key]) return jobs[key];
    jobs[key] = new Promise(function (resolve, reject) {
      var settled = false, timer = setTimeout(function () { finish(null, { timeout: true }); }, REQUEST_TIMEOUT);
      function finish(data, error) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) { delete jobs[key]; reject(error); return; }
        var actors = normalizeCredits(data, kind);
        delete jobs[key];
        resolve(store(kind, id, language, actors));
      }
      var api = Lampa.Api.sources && Lampa.Api.sources.tmdb;
      if (!api || typeof api.get !== 'function') { finish(null, { unavailable: true }); return; }
      var path = kind + '/' + encodeURIComponent(String(id)) + '/' + (kind === 'tv' ? 'aggregate_credits' : 'credits');
      try { api.get(path, {}, function (data) { finish(data); }, function (error) { finish(null, error || { unavailable: true }); }); }
      catch (error) { finish(null, { unavailable: true }); }
    });
    return jobs[key];
  }

  function previewActors(actors) {
    return [{ id: '__sh_full_cast_action__', name: 'Всі актори', character: 'Повний акторський склад', profile_path: null, source: 'tmdb', media_type: 'person', _shCastAction: true }].concat((actors || []).slice(0, PREVIEW_LIMIT));
  }

  function hybridOwnsDetails() {
    var hybrid = window.StremioHybrid;
    try { return !!(hybrid && typeof hybrid.ownsPresentation === 'function' && hybrid.ownsPresentation('details')); }
    catch (error) { return false; }
  }

  function stateFor(component, data, id) {
    for (var i = states.length - 1; i >= 0; i--) {
      if (states[i].component === component && (data === undefined || states[i].data === data) && (id === undefined || String(states[i].id) === String(id))) return states[i];
    }
    return null;
  }

  function liveOwner(state) {
    if (!state || !state.component || state.component.destroyed) return false;
    var active = Lampa.Activity && Lampa.Activity.active && Lampa.Activity.active();
    return !!(active && active.component === 'full' && active.activity === state.activity && String(active.id) === String(state.id));
  }

  function actorRowData(state) {
    var rows = state.component && state.component.rows || [];
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (Array.isArray(row) && row[0] === 'persons' && row[1] && row[1].results === state.cast) return row[1];
    }
    return null;
  }

  function bindCastAction(line, state) {
    if (!line || !state || line._shFullCastActionBound || !hybridOwnsDetails()) return;
    line._shFullCastActionBound = true;
    var bindCard = function (card, data) {
      if (!data || !data._shCastAction || !card || typeof card.use !== 'function') return;
      card.use({ onlyMenu: false, onlyEnter: function () {
        if (hybridOwnsDetails() && liveOwner(state)) openCastGrid(state);
      }, onCreate: function () {
        var node = this.render && this.render()[0];
        if (node && node.classList) node.classList.add('sh-full-cast-open-card');
      } });
      var node = card.render && card.render()[0];
      if (node && node.classList) node.classList.add('sh-full-cast-open-card');
    };
    line.use({ onInstance: bindCard });
    (line.items || []).forEach(function (card) { bindCard(card, card && card.data); });
  }

  function stateFromActiveFull() {
    if (!hybridOwnsDetails() || !Lampa.Activity || !Lampa.Activity.active) return null;
    var active = Lampa.Activity.active(), activity = active && active.activity, component = activity && activity.component;
    if (!active || active.component !== 'full' || !component || !Array.isArray(component.rows)) return null;
    var route = component.object || {}, kind = active.method === 'tv' || route.method === 'tv' ? 'tv' : 'movie';
    var source = active.source || route.source || 'tmdb', id = active.id || route.id || route.card && route.card.id;
    if (source !== 'tmdb' || !validId(id)) return null;
    var people = null;
    for (var i = 0; i < component.rows.length; i++) {
      var row = component.rows[i];
      if (Array.isArray(row) && row[0] === 'persons' && row[1] && Array.isArray(row[1].results)) { people = row[1].results; break; }
    }
    if (!people) return null;
    var card = active.card || route.card || {}, data = { movie: card, persons: { cast: people } }, existing = stateFor(component, undefined, id);
    if (existing) return existing;
    var state = { component: component, activity: component.activity, id: id, kind: kind, title: card.name || card.title || active.title || '', data: data, cast: people, actors: normalizeCredits({ cast: people }, kind), complete: false };
    states.push(state);
    while (states.length > 12) states.shift();
    applyCast(state, state.actors, false);
    return state;
  }

  function recoverActiveFull() {
    var state = stateFromActiveFull();
    if (state) return state;
  }

  function replaceCastLine(state, rowData) {
    var component = state.component, oldLine = null;
    if (!component || !Array.isArray(component.items)) return;
    for (var i = 0; i < component.items.length; i++) {
      if (component.items[i].data === rowData) { oldLine = component.items[i]; break; }
    }
    if (!oldLine) return;
    var oldNode = oldLine.render && oldLine.render(true), parent = oldNode && oldNode.parentNode;
    if (!parent) return;
    var index = component.items.indexOf(oldLine), next = oldNode.nextSibling, oldCards = oldLine.items || [], focused = null;
    var native = Lampa.Controller && Lampa.Controller.enabled && Lampa.Controller.enabled();
    var nativeLast = native && native.controller && native.controller.link && native.controller.link.last;
    nativeLast = nativeLast && (nativeLast[0] || nativeLast);
    var ownsCastFocus = !!(hybridOwnsDetails() && liveOwner(state) && native && native.name === 'items_line' && nativeLast && oldNode.contains(nativeLast));
    if (ownsCastFocus) {
      var personNode = nativeLast.closest && nativeLast.closest('.full-person');
      if (personNode) {
        var oldPerson = oldCards.filter(function (person) { return person.render && person.render()[0] === personNode; })[0];
        if (oldPerson) focused = { id: oldPerson.data && (oldPerson.data._shCastAction ? '__shCastAction' : oldPerson.data.id) };
      }
    }
    var left = oldLine.scroll && oldLine.scroll.render && oldLine.scroll.render()[0], oldLeft = left ? left.scrollLeft : 0;
    component.items.splice(index, 1);
    oldLine.destroy();
    component.fragment = document.createDocumentFragment();
    component.emit('createAndAppend', ['persons', rowData]);
    var replacement = component.items.pop();
    if (!replacement) return;
    var newNode = replacement.render(true);
    if (newNode.parentNode) newNode.parentNode.removeChild(newNode);
    parent.insertBefore(newNode, next && next.parentNode === parent ? next : null);
    component.items.splice(index, 0, replacement);
    component.fragment = null;
    var newScroll = replacement.scroll && replacement.scroll.render && replacement.scroll.render()[0];
    if (newScroll) newScroll.scrollLeft = oldLeft;
    bindCastAction(replacement, state);
    if (focused && ownsCastFocus) {
      var target = (replacement.items || []).filter(function (person) {
        return String(person.data && (person.data._shCastAction ? '__shCastAction' : person.data.id)) === String(focused.id);
      })[0];
      var targetNode = target && target.render && target.render()[0], active = Lampa.Controller && Lampa.Controller.enabled && Lampa.Controller.enabled();
      if (targetNode && active && active.name === 'items_line' && active.controller && active.controller.link && hybridOwnsDetails() && liveOwner(state)) {
        Lampa.Controller.collectionSet(replacement.render(), null, true);
        var focusedController = Lampa.Controller.enabled && Lampa.Controller.enabled();
        if (focusedController && focusedController.name === 'items_line' && focusedController.controller && focusedController.controller.link && hybridOwnsDetails() && liveOwner(state)) {
          Lampa.Controller.collectionFocus(targetNode, replacement.render());
          focusedController.controller.link.last = targetNode;
        }
      }
    }
  }

  function applyCast(state, actors, knownComplete) {
    if (!state || !state.data || !state.data.persons || !Array.isArray(state.data.persons.cast) || !hybridOwnsDetails() || !liveOwner(state)) return;
    state.actors = actors;
    state.complete = !!knownComplete;
    var list = previewActors(actors);
    state.cast.splice.apply(state.cast, [0, state.cast.length].concat(list));
    state.applied = true;
    var rowData = actorRowData(state);
    if (rowData) replaceCastLine(state, rowData);
  }

  function ensureFullCredits(state) {
    if (!state || state.complete || state.requested) return;
    if (!hybridOwnsDetails() || !liveOwner(state)) return;
    state.requested = true;
    loadCredits(state.kind, state.id).then(function (actors) {
      if (state.component.destroyed || state.component.activity !== state.activity || stateFor(state.component, state.data, state.id) !== state) return;
      state.actors = actors;
      state.complete = true;
      if (hybridOwnsDetails() && liveOwner(state)) applyCast(state, actors, true);
    }, function () {
      if (state.component.destroyed || state.component.activity !== state.activity || stateFor(state.component, state.data, state.id) !== state) return;
      state.failed = true;
      applyCast(state, state.actors, false);
    });
  }

  function cardData(person) {
    if (person && person._shCastRetry) return { id: '__sh_cast_retry__', title: 'Повторити завантаження', name: 'Повторити завантаження', source: 'tmdb', media_type: 'movie', type: 'movie', poster_path: null, _shCastRetry: true, character: 'Повний склад тимчасово недоступний' };
    return {
      id: person.id,
      title: person.name,
      name: person.name,
      original_title: person.character || '',
      poster_path: person.profile_path || null,
      source: 'tmdb',
      media_type: 'person',
      type: 'person',
      _shCastPerson: person,
      character: person.character || ''
    };
  }

  function openActor(person) {
    if (!person || !validId(person.id)) return;
    Lampa.Activity.push({ url: '', title: person.name, component: 'actor', source: 'tmdb', id: person.id, name: person.name });
  }

  function showGridStatus(comp, text) {
    var root = comp && comp.render && comp.render()[0];
    if (!root) return;
    var status = root.querySelector('.sh-full-cast-status');
    if (!text) { if (status) status.remove(); return; }
    if (!status) { status = document.createElement('div'); status.className = 'sh-full-cast-status'; root.appendChild(status); }
    status.textContent = text;
  }

  function createCastGrid(object) {
    var comp = Lampa.Maker.make('Category', object), all = [], offset = 0, built = false, ownerActivity = null;
    function display(actors, isError) {
      if (comp.destroyed) return;
      all = (actors || []).map(cardData);
      if (isError) all.push(cardData({ _shCastRetry: true }));
      offset = 0; built = true;
      if (!all.length) { comp.empty(); showGridStatus(comp, 'У джерелі немає акторських кредитів.'); return; }
      var first = all.slice(0, PAGE_SIZE); offset = first.length;
      comp.build({ title: object.title || 'Всі актори', results: first, page: 1, total_pages: Math.max(1, Math.ceil(all.length / PAGE_SIZE)) });
      comp.activity.loader(false);
      showGridStatus(comp, isError ? 'Повний склад не завантажився. Оберіть «Повторити завантаження».' : (all.length + ' акторів · повний склад'));
    }
    function retry() {
      showGridStatus(comp, 'Завантажуємо повний склад акторів…');
      comp.activity.loader(true);
      loadCredits(object.kind, object.id).then(function (actors) {
        if (comp.destroyed || Lampa.Activity.active().activity !== ownerActivity) return;
        display(actors, false);
      }, function () {
        if (comp.destroyed || Lampa.Activity.active().activity !== ownerActivity) return;
        comp.activity.loader(false);
        display(object.seed || [], true);
      });
    }
    comp.use({
      onCreate: function () {
        ownerActivity = this.activity;
        this.html.addClass('sh-full-cast-grid');
        this.activity.loader(true);
        showGridStatus(this, object.kind === 'tv' ? 'Завантажуємо повний акторський склад…' : 'Відкриваємо акторський склад…');
        var ready = object.cast && object.cast.length ? object.cast : cached(object.kind, object.id);
        if (ready) display(ready, false);
        else retry();
      },
      onNext: function (resolve, reject) {
        if (!built || offset >= all.length) {
          showGridStatus(comp, 'Усі ' + all.length + ' акторів завантажено.');
          reject.call(this);
          return;
        }
        var page = Math.floor(offset / PAGE_SIZE) + 1, cards = all.slice(offset, offset + PAGE_SIZE);
        offset += cards.length;
        resolve.call(this, { title: object.title || 'Всі актори', results: cards, page: page, total_pages: Math.max(1, Math.ceil(all.length / PAGE_SIZE)) });
        if (offset >= all.length) showGridStatus(comp, 'Усі ' + all.length + ' акторів завантажено.');
      },
      onInstance: function (card, data) {
        card.use({ onlyMenu: false, onlyEnter: function () {
          if (data && data._shCastRetry) { retry(); return; }
          openActor(data && data._shCastPerson);
        }, onCreate: function () {
          var person = data && data._shCastPerson, node = this.render && this.render()[0];
          if (!node || !person || !person.character) return;
          var role = node.querySelector('.sh-full-cast-role') || document.createElement('div');
          role.className = 'sh-full-cast-role'; role.textContent = person.character;
          var title = node.querySelector('.card__title'), view = node.querySelector('.card__view');
          if (title && title.parentNode) title.parentNode.insertBefore(role, title.nextSibling);
          else if (view && view.parentNode) view.parentNode.insertBefore(role, view.nextSibling);
          else node.appendChild(role);
        } });
        if (data && data._shCastRetry && card.render) card.render()[0].classList.add('sh-full-cast-retry');
      }
    });
    return comp;
  }

  function openCastGrid(state) {
    if (!state) return;
    Lampa.Activity.push({
      url: '', title: 'Всі актори', component: 'sh_full_cast_grid',
      kind: state.kind, id: state.id, titleName: state.title,
      cast: state.complete ? state.actors : null,
      seed: state.actors || [],
      source: 'tmdb'
    });
  }

  function onFull(event) {
    if (!event || (event.type !== 'start' && event.type !== 'build')) return;
    if (event.type === 'build' && event.name === 'persons') {
      var ownerState = stateFor(event.link) || stateFromActiveFull();
      if (!ownerState || !event.item || !event.item.data) return;
      if (!hybridOwnsDetails() || !liveOwner(ownerState)) return;
      if (event.item.data.results === ownerState.cast) {
        if (!ownerState.applied) applyCast(ownerState, ownerState.actors, false);
        bindCastAction(event.item, ownerState);
      }
      ensureFullCredits(ownerState);
      return;
    }
    if (event.type !== 'start' || !event.data || !event.data.movie || !event.link) return;
    var route = event.object || {}, method = route.method === 'tv' ? 'tv' : 'movie', source = route.source || 'tmdb';
    if (source !== 'tmdb' || !validId(event.data.movie.id) || event.data.movie.adult || !event.data.persons) return;
    var prior = stateFor(event.link, event.data, event.data.movie.id);
    if (prior) return;
    // Native Full reuses its component link between activity instances. Retire the
    // previous owner before binding a new title so late credits cannot target it.
    states = states.filter(function (entry) { return entry.component !== event.link; });
    var cast = Array.isArray(event.data.persons.cast) ? event.data.persons.cast : [];
    var state = {
      component: event.link,
      activity: event.link.activity,
      id: event.data.movie.id,
      kind: method,
      title: event.data.movie.name || event.data.movie.title || '',
      data: event.data,
      cast: cast,
      actors: normalizeCredits({ cast: cast }, method),
      complete: false
    };
    states.push(state);
    while (states.length > 12) states.shift();
    // Keep Full start synchronous. Extended credits load only when the cast row
    // is built or the user opens the full-cast screen.
    if (hybridOwnsDetails() && liveOwner(state)) applyCast(state, state.actors, false);
  }

  function register() {
    if (componentRegistered) return;
    componentRegistered = true;
    installOwnedStyles();
    Lampa.Component.add('sh_full_cast_grid', createCastGrid);
    Lampa.Listener.follow('full', onFull);
    recoverActiveFull();
  }

  function installOwnedStyles() {
    var hybrid = window.StremioHybrid;
    if (hybrid && typeof hybrid.registerStyles === 'function') {
      hybrid.registerStyles('full-cast', css);
      styleInstallTimer = null;
      recoverActiveFull();
      return;
    }
    // The built-in loader waits for native appready, but a deep-linked Full
    // screen can initialize the adapter before Hybrid finishes its own setup.
    // Retry for a bounded window; never inject a competing stylesheet owner.
    if (styleInstallAttempts++ < 80) styleInstallTimer = setTimeout(installOwnedStyles, 100);
  }

  register();
  window.LampaFullCast = {
    version: '1.0.1',
    normalizeCredits: normalizeCredits,
    loadCredits: loadCredits,
    open: function (kind, id, cast, title) {
      Lampa.Activity.push({ url: '', title: title || 'Всі актори', component: 'sh_full_cast_grid', kind: kind, id: id, cast: cast || null, seed: cast || [], titleName: title || '', source: 'tmdb' });
    }
  };
}());
