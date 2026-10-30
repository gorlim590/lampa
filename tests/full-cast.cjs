'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'ui/full-cast.js'), 'utf8');

function harness(options) {
  options = options || {};
  const requests = [], listeners = {}, pushed = [], styles = [], controllerCalls = [];
  let activeActivity = null, activeController = options.controller || null, language = options.language || 'uk', hybridOwner = options.hybridActive !== false;
  const categoryRoot = { children: [], appendChild(node) { node.parentNode = this; this.children.push(node); }, querySelector(selector) { return selector === '.sh-full-cast-status' ? this.children.find(node => node.className === 'sh-full-cast-status') || null : null; } };
  const category = { destroyed: false, html: { addClass(value) { category.className = value; } }, activity: { loader(value) { category.loading = value; } }, use(value) { category.options = value; }, build(value) { category.page = value; }, render() { return [categoryRoot]; }, empty() { category.emptyState = true; }, root: categoryRoot };
  const Lampa = {
    Component: { add(name, factory) { Lampa.component = factory; Lampa.componentName = name; } },
    Listener: { follow(name, fn) { listeners[name] = fn; } },
    Maker: { make() { return category; } },
    Api: { sources: { tmdb: { get(route, params, done, fail) { requests.push({ route, params, done, fail }); } } } },
    Activity: { push(value) { pushed.push(value); }, active() { return activeActivity; } },
    Controller: { enabled() { return activeController; }, collectionSet() { controllerCalls.push('collectionSet'); }, collectionFocus() { controllerCalls.push('collectionFocus'); } },
    Storage: { field(name) { return name === 'tmdb_lang' ? language : null; }, get(name) { return name === 'tmdb_lang' ? language : null; } }
  };
  const window = { Lampa };
  if (options.hybrid !== false) window.StremioHybrid = { ownsPresentation() { return hybridOwner; }, registerStyles(name, css) { styles.push({ name, css }); } };
  function element(tag) {
    return { tagName: tag, className: '', textContent: '', children: [], attrs: {}, events: {}, classList: { add(name) { this[name] = true; }, contains(name) { return !!this[name]; } }, setAttribute(name, value) { this.attrs[name] = value; }, addEventListener(name, fn) { this.events[name] = fn; }, appendChild(child) { child.parentNode = this; this.children.push(child); }, insertBefore(child, next) { child.parentNode = this; const at = next ? this.children.indexOf(next) : -1; if (at < 0) this.children.push(child); else this.children.splice(at, 0, child); }, querySelector(selector) { if (selector === '.items-line__head') return this.head || null; if (selector === '.items-line__title') return this.title || null; if (selector === '.sh-details-zone-title--content') return this.sectionHeading || null; if (selector === '.sh-full-cast-heading-action') return this.children.find(child => String(child.className).indexOf('sh-full-cast-heading-action') >= 0) || null; return null; }, closest(selector) { return selector === '.sh-movie-page' && this.isMoviePage ? this : null; } };
  }
  const sectionHeading = element('heading'); sectionHeading.className = 'sh-details-zone-title sh-details-zone-title--content';
  const pageRoot = element('page'); pageRoot.className = 'activity--active sh-movie-page'; pageRoot.isMoviePage = true; pageRoot.sectionHeading = sectionHeading; sectionHeading.parentNode = pageRoot;
  const document = { createElement: element, createDocumentFragment() { return element('fragment'); }, querySelector(selector) { return selector.indexOf('.activity--active') >= 0 && activeActivity && activeActivity.component === 'full' && hybridOwner ? pageRoot : null; } };
  if (options.activeFull) {
    const component = options.activeFull.component || { destroyed: false, activity: {}, object: { id: options.activeFull.id || 100088, method: 'tv', source: 'tmdb', card: options.activeFull.card || { id: 100088, name: 'The Last of Us' } }, rows: [], items: [] };
    component.activity.component = component;
    const cast = options.activeFull.cast || credits(4).cast;
    component.rows = [['persons', { title: 'Актори', results: cast }]];
    activeActivity = { component: 'full', activity: component.activity, id: options.activeFull.id || 100088, method: 'tv', source: 'tmdb', card: options.activeFull.card || { id: 100088, name: 'The Last of Us' }, title: 'The Last of Us' };
  }
  const context = { window, Lampa, document, $: node => ({ on(name, fn) { node.events[name] = fn; } }), setTimeout(fn, ms) { const timer = setTimeout(fn, ms); if (timer && timer.unref) timer.unref(); return timer; }, clearTimeout, Date, Object, Array, Promise, String, Number, Math, encodeURIComponent, isFinite, console };
  vm.runInNewContext(source, context, { filename: 'ui/full-cast.js' });
  return { api: window.LampaFullCast, listeners, requests, pushed, styles, Lampa, category, window, controllerCalls, pageRoot, sectionHeading, setActivity(value) { activeActivity = value; }, setController(value) { activeController = value; }, setHybrid(value) { hybridOwner = value; }, setLanguage(value) { language = value; }, element };
}

function credits(count) {
  const cast = [];
  for (let i = 0; i < count; i++) cast.push({ id: i + 1, name: 'Actor ' + (i + 1), order: i, profile_path: i === 4 ? null : '/person-' + i + '.jpg', roles: [{ character: 'Role ' + (i + 1), episode_count: 3 }] });
  return { cast };
}

function buildPeopleRow(h, link, cast, items) {
  const data = { results: cast, title: 'Актори' };
  link.rows = [['persons', data]];
  const root = h.element('items-line'), head = h.element('head'), title = h.element('title');
  root.head = head; head.title = title; title.parentNode = head; head.children.push(title); title.nextSibling = null;
  const line = { data, items: items || [], use(handler) { this.handler = handler; }, render() { return [root]; } };
  h.listeners.full({ type: 'build', name: 'persons', link, item: line, data });
  line.root = root; line.head = head;
  return line;
}

function activateFirstCastAction(h, line) {
  const action = line.data.results.filter(person => person && person._shCastAction)[0];
  assert.ok(action, 'All Actors is the first native row item');
  assert.ok(line.handler && typeof line.handler.onInstance === 'function', 'native Full row owns the action handler');
  const card = { use(options) { this.options = options; }, render() { return [h.element('action-card')]; } };
  line.handler.onInstance(card, action);
  assert.equal(typeof card.options.onlyEnter, 'function');
  card.options.onlyEnter();
  return action;
}

function buildReplaceablePeopleRow(h, link, cast, controllerName, activityComponent, onEmit) {
  const data = { results: cast, title: 'Актори' }, focusNode = { classList: { focus: true, contains(name) { return !!this[name]; } }, closest(selector) { return selector === '.full-person' ? this : null; } };
  const parent = { insertBefore(node) { node.parentNode = this; } };
  const oldRoot = { parentNode: parent, nextSibling: null, contains(node) { return node === focusNode; } };
  const oldItems = cast.map(person => ({ data: person, render() { return [person.id === cast[0].id ? focusNode : h.element('person')]; } }));
  const oldLine = { data, items: oldItems, use(handler) { this.handler = handler; }, render() { return oldRoot; }, destroy() { this.destroyed = true; }, scroll: { render() { return [{ scrollLeft: 24 }]; } } };
  const component = link;
  component.rows = [['persons', data]];
  component.items = [oldLine];
  component.emit = function (_name, args) {
    const rowData = args[1], nextRoot = h.element('items-line'), head = h.element('head'), title = h.element('title');
    nextRoot.head = head; head.title = title; title.parentNode = head; head.children.push(title);
    const cards = rowData.results.map(person => ({ data: person, render() { const node = h.element('person'); node.__personId = person._shCastAction ? '__shCastAction' : person.id; return [node]; } }));
    this.items.push({ data: rowData, items: cards, use(handler) { this.handler = handler; }, render() { return nextRoot; }, destroy() {}, scroll: { render() { return [{ scrollLeft: 0 }]; } } });
    if (onEmit) onEmit();
  };
  const controller = { name: controllerName, controller: { link: { last: focusNode } } };
  h.setController(controller);
  h.setActivity({ component: activityComponent || 'full', activity: component.activity, id: component.id || 100088 });
  h.listeners.full({ type: 'build', name: 'persons', link: component, item: oldLine, data });
  return { data, focusNode, oldLine, controller };
}

test('credits normalization preserves response order, stable person IDs, roles and missing-photo entries', () => {
  const h = harness();
  const normalized = h.api.normalizeCredits({ cast: [
    { id: 2, name: 'Second in source', order: 9, profile_path: null, roles: [{ character: 'Voice One' }] },
    { id: 1, name: 'First later', order: 0, profile_path: '/first.jpg', roles: [{ character: 'Lead' }, { character: 'Lead' }] },
    { id: 2, name: 'Duplicate', profile_path: '/second.jpg', roles: [{ character: 'Voice Two' }] },
    { id: 3, name: 'No role', character: 'Recorded voice', profile_path: null }
  ] }, 'tv');
  assert.deepEqual(JSON.parse(JSON.stringify(normalized.map(p => [p.id, p.name, p.character, p.profile_path, p._shCreditOrder]))), [
    [2, 'Second in source', 'Voice One · Voice Two', '/second.jpg', 0],
    [1, 'First later', 'Lead', '/first.jpg', 1],
    [3, 'No role', 'Recorded voice', null, 3]
  ]);
});

test('equivalent aggregate captions collapse while distinct verified roles remain', () => {
  const h = harness();
  const [actor] = h.api.normalizeCredits({ cast: [{ id: 7, name: 'Pedro Pascal', roles: [
    { character: 'Joel Miller (uncredited)' }, { character: 'Joel Miller' }, { character: 'Joel Miller Jr.' }
  ] }] }, 'tv');
  assert.equal(actor.character, 'Joel Miller · Joel Miller Jr.');
});

test('late Hybrid initialization receives cast CSS through the single style owner', async () => {
  const h = harness({ hybrid: false });
  assert.equal(h.styles.length, 0);
  h.window.StremioHybrid = { registerStyles(name, css) { h.styles.push({ name, css }); } };
  await new Promise(resolve => setTimeout(resolve, 120));
  assert.equal(h.styles.length, 1);
  assert.equal(h.styles[0].name, 'full-cast');
  assert.match(h.styles[0].css, /\.sh-full-cast-role/);
});

test('cache and in-flight jobs are partitioned by configured TMDB language', async () => {
  const h = harness({ language: 'uk' }), first = h.api.loadCredits('tv', 100088);
  h.requests[0].done({ cast: [{ id: 1, name: 'Actor', roles: [{ character: 'Роль' }] }] });
  await first;
  h.setLanguage('en');
  const next = h.api.loadCredits('tv', 100088);
  assert.equal(h.requests.length, 2);
  h.requests[1].done({ cast: [{ id: 1, name: 'Actor', roles: [{ character: 'Role' }] }] });
  assert.equal((await next)[0].character, 'Role');
  assert.equal((await h.api.loadCredits('tv', 100088))[0].character, 'Role');
  assert.equal(h.requests.length, 2);
});

test('movie credit rows retain voice roles and normalize to the native person-card contract', () => {
  const h = harness();
  const [actor] = h.api.normalizeCredits({ cast: [{ id: 80, name: 'Voice Actor', character: 'Animated Hero / Narrator', profile_path: '/voice.jpg' }] }, 'movie');
  assert.deepEqual(JSON.parse(JSON.stringify(actor)), { id: 80, name: 'Voice Actor', character: 'Animated Hero / Narrator', profile_path: '/voice.jpg', source: 'tmdb', media_type: 'person', _shCreditOrder: 0 });
});

test('animated movie preview stays synchronous and fetches full movie credits only when the first native cast action opens', async () => {
  const h = harness(), activity = {}, cast = credits(4).cast, link = { destroyed: false, activity, rows: [], items: [] };
  const data = { movie: { id: 550, title: 'Animated Feature' }, persons: { cast } };
  h.setActivity({ component: 'full', activity, id: 550 });
  h.listeners.full({ type: 'start', link, object: { id: 550, method: 'movie', source: 'tmdb' }, data });
  assert.equal(h.requests.length, 0, 'Details never waits for the movie credits endpoint');
  assert.equal(cast.length, 5, 'native preview adds one discoverable action before the four source actors');
  const line = buildPeopleRow(h, link, cast);
  assert.equal(h.requests.length, 1, 'credits load only after the actor row is built');
  activateFirstCastAction(h, line);
  assert.equal(h.pushed[0].component, 'sh_full_cast_grid');
  assert.equal(h.pushed[0].cast, null, 'the preview is not mislabeled as the complete movie cast');
  const category = h.Lampa.component(h.pushed[0]);
  h.Lampa.Activity.active = () => ({ activity: h.category.activity });
  h.category.options.onCreate.call(h.category);
  assert.equal(h.requests[0].route, 'movie/550/credits');
  h.requests[0].done({ cast: [{ id: 80, name: 'Voice Actor', character: 'Animated Hero / Narrator', profile_path: null }] });
  await new Promise(setImmediate);
  assert.equal(h.category.page.results.length, 1);
  assert.equal(h.category.page.results[0]._shCastPerson.character, 'Animated Hero / Narrator');
});

test('a genuinely small TV cast keeps all source actors and one native first-position full-cast action', async () => {
  const h = harness(), cast = credits(2).cast, link = { destroyed: false, activity: {}, rows: [], items: [] };
  h.setActivity({ component: 'full', activity: link.activity, id: 900 });
  h.listeners.full({ type: 'start', link, object: { id: 900, method: 'tv', source: 'tmdb' }, data: { movie: { id: 900, name: 'Small Cast' }, persons: { cast } } });
  assert.equal(cast.length, 3);
  const line = buildPeopleRow(h, link, cast);
  assert.equal(line.data.results[0]._shCastAction, true);
  assert.equal(line.data.results.filter(person => person._shCastAction).length, 1);
  assert.equal(h.requests.length, 1);
  h.requests[0].done(credits(2));
  await new Promise(setImmediate);
  assert.equal(cast.length, 3);
  assert.deepEqual(cast.slice(1).map(person => person.name), ['Actor 1', 'Actor 2']);
});

test('parallel TV aggregate requests coalesce, use native TMDB transport and stay cached', async () => {
  const h = harness();
  const a = h.api.loadCredits('tv', 100088), b = h.api.loadCredits('tv', 100088);
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].route, 'tv/100088/aggregate_credits');
  assert.equal(Object.keys(h.requests[0].params).length, 0);
  h.requests[0].done(credits(159));
  const [first, second] = await Promise.all([a, b]);
  assert.equal(first, second);
  assert.equal(first.length, 159);
  assert.equal((await h.api.loadCredits('tv', 100088)).length, 159);
  assert.equal(h.requests.length, 1);
});

test('movie full cast uses the native movie credits route and deduplicates duplicate credits', async () => {
  const h = harness(), pending = h.api.loadCredits('movie', 550);
  assert.equal(h.requests[0].route, 'movie/550/credits');
  h.requests[0].done({ cast: [{ id: 7, name: 'Voice', character: 'Hero' }, { id: 7, name: 'Voice', character: 'Narrator' }] });
  const cast = await pending;
  assert.equal(cast.length, 1);
  assert.equal(cast[0].character, 'Hero · Narrator');
});

test('failed credits are not cached and can be retried without starting a second request while pending', async () => {
  const h = harness(), failed = h.api.loadCredits('tv', 100088);
  assert.equal(h.requests.length, 1);
  h.requests[0].fail({ status: 503 });
  await assert.rejects(failed);
  const retry = h.api.loadCredits('tv', 100088);
  assert.equal(h.requests.length, 2);
  h.requests[1].done(credits(2));
  assert.equal((await retry).length, 2);
  assert.equal((await h.api.loadCredits('tv', 100088)).length, 2);
  assert.equal(h.requests.length, 2);
});

test('native Full stays synchronous and later receives ten credited actors after one native first-position action', async () => {
  const h = harness();
  const cast = credits(4).cast;
  const activity = {};
  const component = { destroyed: false, activity, rows: [], items: [] };
  h.setActivity({ component: 'full', activity, id: 100088 });
  const data = { movie: { id: 100088, name: 'The Last of Us' }, persons: { cast } };
  h.listeners.full({ type: 'start', link: component, object: { id: 100088, method: 'tv', source: 'tmdb' }, data });
  assert.equal(h.requests.length, 0, 'extended credits do not block or run before the cast section is needed');
  assert.equal(cast.length, 5, 'native cast gets one action before its source actors synchronously');
  const line = buildPeopleRow(h, component, cast);
  assert.equal(h.requests.length, 1, 'the extended lookup starts only when the actor row is built');
  h.requests[0].done(credits(159));
  await new Promise(setImmediate);
  assert.equal(cast.length, 11);
  assert.equal(cast[0]._shCastAction, true);
  assert.equal(cast[1].id, 1);
  assert.equal(cast[10].id, 10);
});

test('disabled Hybrid leaves native Details untouched; delayed ownership can attach on the cast build', () => {
  const h = harness({ hybridActive: false }), activity = {}, link = { destroyed: false, activity, id: 100088, rows: [], items: [] }, cast = credits(4).cast;
  h.setActivity({ component: 'full', activity, id: 100088 });
  h.listeners.full({ type: 'start', link, object: { id: 100088, method: 'tv', source: 'tmdb' }, data: { movie: { id: 100088, name: 'The Last of Us' }, persons: { cast } } });
  const line = buildPeopleRow(h, link, cast);
  assert.equal(cast.length, 4, 'disabled Hybrid leaves the native payload untouched');
  assert.equal(line.data.results.some(person => person._shCastAction), false);
  assert.equal(h.requests.length, 0);
  h.setHybrid(true);
  h.listeners.full({ type: 'build', name: 'persons', link, item: line, data: line.data });
  assert.equal(line.data.results[0]._shCastAction, true);
  assert.equal(h.requests.length, 1);
  h.requests[0].done(credits(12));
});

test('late credits never rebind Select, Torrent Cinema or modal controller ownership', async () => {
  for (const controllerName of ['select', 'torrent_cinema', 'modal']) {
    const h = harness(), activity = {}, link = { destroyed: false, activity, id: 100088, rows: [], items: [] }, cast = credits(4).cast;
    h.setActivity({ component: 'full', activity, id: 100088 });
    h.listeners.full({ type: 'start', link, object: { id: 100088, method: 'tv', source: 'tmdb' }, data: { movie: { id: 100088, name: 'The Last of Us' }, persons: { cast } } });
    buildReplaceablePeopleRow(h, link, cast, controllerName);
    assert.equal(h.requests.length, 1);
    const heldLast = h.Lampa.Controller.enabled().controller.link.last;
    h.requests[0].done(credits(159));
    await new Promise(setImmediate);
    assert.equal(h.controllerCalls.length, 0, controllerName + ' keeps its controller collection untouched');
    assert.equal(h.Lampa.Controller.enabled().controller.link.last, heldLast, controllerName + ' keeps native Last untouched');
    assert.equal(cast.length, 11, 'only the underlying Full data gets the verified preview');
  }
});

test('late credits while another Activity owns the screen are cached without mutating its Full or focus', async () => {
  const h = harness(), activity = {}, link = { destroyed: false, activity, id: 100088, rows: [], items: [] }, cast = credits(4).cast;
  h.setActivity({ component: 'full', activity, id: 100088 });
  h.listeners.full({ type: 'start', link, object: { id: 100088, method: 'tv', source: 'tmdb' }, data: { movie: { id: 100088, name: 'The Last of Us' }, persons: { cast } } });
  buildPeopleRow(h, link, cast);
  assert.equal(h.requests.length, 1);
  h.setController({ name: 'settings', controller: { link: { last: h.element('settings') } } });
  h.setActivity({ component: 'settings', activity: {}, id: 'interface' });
  const last = h.Lampa.Controller.enabled().controller.link.last;
  h.requests[0].done(credits(159)); await new Promise(setImmediate);
  assert.equal(cast.length, 5);
  assert.equal(h.controllerCalls.length, 0);
  assert.equal(h.Lampa.Controller.enabled().controller.link.last, last);
  assert.equal((await h.api.loadCredits('tv', 100088)).length, 159, 'valid provider data remains cached');
});

test('focused Full cast refresh restores the same actor only when its native items-line owns focus', async () => {
  const h = harness(), activity = {}, link = { destroyed: false, activity, id: 100088, rows: [], items: [] }, cast = credits(4).cast;
  h.setActivity({ component: 'full', activity, id: 100088 });
  h.listeners.full({ type: 'start', link, object: { id: 100088, method: 'tv', source: 'tmdb' }, data: { movie: { id: 100088, name: 'The Last of Us' }, persons: { cast } } });
  const row = buildReplaceablePeopleRow(h, link, cast, 'items_line');
  h.requests[0].done(credits(159)); await new Promise(setImmediate);
  assert.deepEqual(h.controllerCalls, ['collectionSet', 'collectionFocus']);
  const current = h.Lampa.Controller.enabled().controller.link.last;
  assert.notEqual(current, row.focusNode);
  assert.equal(current.__personId, '__shCastAction');
});

test('Full cast refresh rechecks controller ownership after native row replacement before restoring focus', async () => {
  const h = harness(), activity = {}, link = { destroyed: false, activity, id: 100088, rows: [], items: [] }, cast = credits(4).cast;
  h.setActivity({ component: 'full', activity, id: 100088 });
  h.listeners.full({ type: 'start', link, object: { id: 100088, method: 'tv', source: 'tmdb' }, data: { movie: { id: 100088, name: 'The Last of Us' }, persons: { cast } } });
  const selectLast = h.element('select-last');
  const row = buildReplaceablePeopleRow(h, link, cast, 'items_line', undefined, () => h.setController({ name: 'select', controller: { link: { last: selectLast } } }));
  h.requests[0].done(credits(159)); await new Promise(setImmediate);
  assert.deepEqual(h.controllerCalls, [], 'a Select opened during the synchronous row event keeps ownership');
  assert.equal(h.Lampa.Controller.enabled().name, 'select');
  assert.equal(h.Lampa.Controller.enabled().controller.link.last, selectLast);
  assert.equal(cast.length, 11, 'the verified Full data still updates under the overlay');
  assert.ok(row.oldLine.destroyed);
});

test('reused native Full link binds the new activity and ignores late credits from the previous title', async () => {
  const h = harness(), firstActivity = {}, secondActivity = {}, link = { destroyed: false, activity: firstActivity, rows: [], items: [] };
  const firstCast = credits(3).cast, secondCast = credits(4).cast;
  h.setActivity({ component: 'full', activity: firstActivity, id: 1 });
  h.listeners.full({ type: 'start', link, object: { id: 1, method: 'tv', source: 'tmdb' }, data: { movie: { id: 1, name: 'Old' }, persons: { cast: firstCast } } });
  buildPeopleRow(h, link, firstCast);
  link.activity = secondActivity;
  h.setActivity({ component: 'full', activity: secondActivity, id: 2 });
  h.listeners.full({ type: 'start', link, object: { id: 2, method: 'tv', source: 'tmdb' }, data: { movie: { id: 2, name: 'Current' }, persons: { cast: secondCast } } });
  buildPeopleRow(h, link, secondCast);
  assert.equal(h.requests.length, 2, 'reusing the native Full link for a new Activity starts its own coalesced lookup');
  h.requests[0].done(credits(20));
  await new Promise(setImmediate);
  assert.equal(secondCast.some(person => person.name === 'Actor 20'), false, 'the old result cannot be written into the current cast');
  h.requests[1].done(credits(15));
  await new Promise(setImmediate);
  assert.equal(secondCast.length, 11);
  assert.equal(secondCast[0]._shCastAction, true);
});

test('same title re-entry on a reused Full link shares lookup but applies only to the newest data owner', async () => {
  const h = harness(), activity = {}, link = { destroyed: false, activity, rows: [], items: [] };
  const firstCast = credits(4).cast, nextCast = credits(4).cast;
  h.setActivity({ component: 'full', activity, id: 100088 });
  h.listeners.full({ type: 'start', link, object: { id: 100088, method: 'tv', source: 'tmdb' }, data: { movie: { id: 100088, name: 'The Last of Us' }, persons: { cast: firstCast } } });
  buildPeopleRow(h, link, firstCast);
  h.listeners.full({ type: 'start', link, object: { id: 100088, method: 'tv', source: 'tmdb' }, data: { movie: { id: 100088, name: 'The Last of Us' }, persons: { cast: nextCast } } });
  buildPeopleRow(h, link, nextCast);
  assert.equal(h.requests.length, 1, 'the same title reuses the in-flight native TMDB request');
  h.requests[0].done(credits(159));
  await new Promise(setImmediate);
  assert.equal(firstCast.some(person => person.name === 'Actor 20'), false, 'retired Details data is not changed');
  assert.equal(nextCast.length, 11);
});

test('the first native cast card opens All Actors without forcing ten ArrowRight presses', async () => {
  const h = harness(), activity = {}, component = { destroyed: false, activity, rows: [], items: [] }, cast = credits(4).cast;
  h.setActivity({ component: 'full', activity, id: 100088 });
  const data = { movie: { id: 100088, name: 'The Last of Us' }, persons: { cast } };
  h.listeners.full({ type: 'start', link: component, object: { id: 100088, method: 'tv', source: 'tmdb' }, data });
  assert.equal(h.requests.length, 0);
  const line = buildPeopleRow(h, component, cast);
  assert.equal(h.requests.length, 1);
  h.requests[0].done(credits(159)); await new Promise(setImmediate);
  const action = activateFirstCastAction(h, line);
  assert.equal(cast.length, 11);
  assert.equal(cast[0], action);
  assert.equal(cast.filter(person => person._shCastAction).length, 1);
  assert.equal(h.pushed.length, 1);
  assert.equal(h.pushed[0].component, 'sh_full_cast_grid');
  assert.equal(h.pushed[0].title, 'Всі актори');
  assert.equal(h.pushed[0].cast.length, 159);
  assert.equal(h.Lampa.componentName, 'sh_full_cast_grid');
  assert.equal(h.styles.length, 1);
  assert.equal(h.styles[0].name, 'full-cast');
});

test('deferred adapter recovers a deep-linked active Full and places All Actors first in the native row when it mounts', async () => {
  const h = harness({ activeFull: true }), component = h.Lampa.Activity.active().activity.component;
  assert.equal(component.items.length, 0, 'the existing Full currently has not mounted its hidden persons line');
  const rowData = component.rows[0][1];
  assert.equal(rowData.results[0]._shCastAction, true, 'recovered native row gets the action before its real cast');
  assert.equal(h.requests.length, 0, 'deep-link recovery does not prefetch extended credits');
  const line = buildPeopleRow(h, component, rowData.results);
  activateFirstCastAction(h, line);
  assert.equal(h.pushed.length, 1);
  assert.equal(h.pushed[0].component, 'sh_full_cast_grid');
  assert.equal(h.pushed[0].id, 100088);
  assert.equal(h.pushed[0].cast, null, 'the grid fetches full credits only after the user opens it');
  assert.equal(h.requests.length, 1, 'the actor row build starts one extended-credit request');
  h.requests[0].done(credits(159));
  await new Promise(setImmediate);
});

test('a pending deep-linked response refreshes an already-mounted row and binds its existing action card', async () => {
  const h = harness({ activeFull: true }), active = h.Lampa.Activity.active(), component = active.activity.component;
  const row = component.rows[0][1], action = { data: row.results[0], options: null, use(options) { this.options = options; }, render() { return [h.element('already-mounted-action')]; } };
  const line = { data: row, items: [action], use(handler) { this.handler = handler; }, render() { return [h.element('already-mounted-line')]; } };
  component.items = [line];
  h.listeners.full({ type: 'build', name: 'persons', link: component, item: line, data: row });
  assert.equal(h.requests.length, 1);
  assert.equal(typeof action.options.onlyEnter, 'function', 'deep-linked already-rendered action is bound by the native row adapter');
  h.requests[0].done(credits(159));
  await new Promise(setImmediate);
  assert.equal(row.results.length, 11, 'the response enriches the exact active Full row');
  assert.deepEqual(h.controllerCalls, [], 'the unmounted fixture line cannot claim controller focus');
});

test('native cast grid exposes loading, empty, retryable error and successful retry states', async () => {
  const h = harness(), comp = h.Lampa.component({ kind: 'tv', id: 100088, title: 'Всі актори' }), owner = {};
  owner.loader = value => { h.category.loading = value; }; h.category.activity = owner;
  h.Lampa.Activity.active = () => ({ activity: owner });
  comp.options.onCreate.call(h.category);
  assert.match(h.category.root.querySelector('.sh-full-cast-status').textContent, /Завантажуємо/);
  assert.equal(h.category.loading, true);
  h.requests[0].done({ cast: [] }); await new Promise(setImmediate);
  assert.equal(h.category.emptyState, true);
  assert.match(h.category.root.querySelector('.sh-full-cast-status').textContent, /немає акторських кредитів/);

  const retryHarness = harness(), retryComp = retryHarness.Lampa.component({ kind: 'movie', id: 550, title: 'Всі актори' }), retryOwner = {};
  retryOwner.loader = value => { retryHarness.category.loading = value; }; retryHarness.category.activity = retryOwner; retryHarness.Lampa.Activity.active = () => ({ activity: retryOwner });
  retryComp.options.onCreate.call(retryHarness.category);
  retryHarness.requests[0].fail({ status: 503 }); await new Promise(setImmediate);
  assert.match(retryHarness.category.root.querySelector('.sh-full-cast-status').textContent, /Повторити завантаження/);
  assert.equal(retryHarness.category.loading, false);
  const retryCard = { render() { return [retryHarness.element('retry-card')]; }, use(options) { this.options = options; } };
  retryComp.options.onInstance(retryCard, retryHarness.category.page.results[0]);
  retryCard.options.onlyEnter();
  assert.match(retryHarness.category.root.querySelector('.sh-full-cast-status').textContent, /Завантажуємо/);
  retryHarness.requests[1].done(credits(1)); await new Promise(setImmediate);
  assert.equal(retryHarness.category.page.results[0]._shCastPerson.name, 'Actor 1');
  assert.match(retryHarness.category.root.querySelector('.sh-full-cast-status').textContent, /акторів/);
});

test('native Category card instance shows the verified role and Enter opens that person only', async () => {
  const h = harness(), actors = h.api.normalizeCredits({ cast: credits(35).cast }, 'tv');
  const comp = h.Lampa.component({ kind: 'tv', id: 100088, title: 'Всі актори · The Last of Us', cast: actors });
  h.category.options.onCreate.call(h.category);
  assert.equal(h.category.className, 'sh-full-cast-grid');
  assert.equal(h.category.page.results.length, 30);
  assert.equal(h.category.page.results[0]._shCastPerson.name, 'Actor 1');
  let role = null;
  const title = { parentNode: null, nextSibling: null };
  const body = { children: [title], insertBefore(node, next) { node.parentNode = this; role = node; const at = next ? this.children.indexOf(next) : -1; this.children.splice(at < 0 ? this.children.length : at, 0, node); } };
  title.parentNode = body;
  const view = { parentNode: body };
  const node = { classList: { add() {} }, querySelector(selector) { return selector === '.card__view' ? view : selector === '.card__title' ? title : selector === '.sh-full-cast-role' ? null : null; }, appendChild(value) { value.parentNode = this; role = value; } };
  const card = { render() { return [node]; }, use(options) { this.options = options; } };
  h.category.options.onInstance(card, h.category.page.results[0]);
  card.options.onCreate.call({ render() { return [node]; } });
  assert.equal(role.className, 'sh-full-cast-role');
  assert.equal(role.textContent, 'Role 1');
  assert.equal(role.parentNode, body, 'role caption is outside the portrait and below the actor title');
  card.options.onlyEnter();
  assert.equal(h.pushed.length, 1);
  assert.equal(h.pushed[0].component, 'actor');
  assert.equal(h.pushed[0].id, actors[0].id);
  assert.equal(h.pushed[0].name, 'Actor 1');
});

test('159 native Category cards paginate in six ordered batches with truthful page metadata and image-bearing counts', () => {
  const h = harness(), movieCredits = credits(159).cast.map(person => ({ id: person.id, name: person.name, order: person.order, profile_path: person.profile_path, character: person.roles[0].character }));
  const actors = h.api.normalizeCredits({ cast: movieCredits }, 'movie');
  const comp = h.Lampa.component({ kind: 'movie', id: 550, title: 'Всі актори · Movie', cast: actors });
  h.category.options.onCreate.call(h.category);
  assert.equal(h.category.page.results.length, 30);
  assert.equal(h.category.page.page, 1);
  assert.equal(h.category.page.total_pages, 6);
  assert.equal(h.category.page.results[0]._shCastPerson.id, 1);
  assert.equal(h.category.page.results[0]._shCastPerson.character, 'Role 1');

  const pages = [h.category.page.results], pageSizes = [30];
  const pageNumbers = [];
  const loadNext = () => new Promise(resolve => h.category.options.onNext.call(h.category, { call(_self, page) { pageNumbers.push(page.page); resolve(page.results); } }, { call() { resolve([]); } }));
  let chain = Promise.resolve();
  for (let i = 0; i < 5; i++) chain = chain.then(() => loadNext()).then(page => { pages.push(page); pageSizes.push(page.length); });
  return chain.then(() => {
    assert.deepEqual(pageSizes, [30, 30, 30, 30, 30, 9]);
    assert.deepEqual(pageNumbers, [2, 3, 4, 5, 6]);
    const allCards = pages.flat(), ids = allCards.map(person => person._shCastPerson.id);
    assert.equal(new Set(ids).size, 159);
    assert.deepEqual(ids, Array.from({ length: 159 }, (_, index) => index + 1));
    assert.equal(allCards.filter(person => person._shCastPerson.profile_path).length, 158, 'one missing portrait remains a normal native fallback, not a dropped actor');
  });
});
