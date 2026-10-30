'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'ui/full-cast.js'), 'utf8');

function harness(options) {
  const requests = [], listeners = {}, pushed = [], styles = [];
  const category = { destroyed: false, html: { addClass(value) { category.className = value; } }, activity: { loader(value) { category.loading = value; } }, use(value) { category.options = value; }, build(value) { category.page = value; }, render() { return [{ querySelector() { return null; }, appendChild() {} }]; }, empty() { category.emptyState = true; } };
  const Lampa = {
    Component: { add(name, factory) { Lampa.component = factory; Lampa.componentName = name; } },
    Listener: { follow(name, fn) { listeners[name] = fn; } },
    Maker: { make() { return category; } },
    Api: { sources: { tmdb: { get(route, params, done, fail) { requests.push({ route, params, done, fail }); } } } },
    Activity: { push(value) { pushed.push(value); }, active() { return null; } },
    Controller: { enabled() { return null; } }
  };
  const window = { Lampa };
  if (!options || options.hybrid !== false) window.StremioHybrid = { registerStyles(name, css) { styles.push({ name, css }); } };
  const context = { window, Lampa, document: { createElement() { return { classList: { add() {} }, setAttribute() {}, appendChild() {}, querySelector() { return null; } }; } }, setTimeout, clearTimeout, Date, Object, Array, Promise, String, Number, Math, encodeURIComponent, isFinite, console };
  vm.runInNewContext(source, context, { filename: 'ui/full-cast.js' });
  return { api: window.LampaFullCast, listeners, requests, pushed, styles, Lampa, category, window };
}

function credits(count) {
  const cast = [];
  for (let i = 0; i < count; i++) cast.push({ id: i + 1, name: 'Actor ' + (i + 1), order: i, profile_path: i === 4 ? null : '/person-' + i + '.jpg', roles: [{ character: 'Role ' + (i + 1), episode_count: 3 }] });
  return { cast };
}

function buildPeopleRow(h, link, cast, items) {
  const data = { results: cast, title: 'Актори' };
  const line = { data, items: items || [], use(handler) { this.handler = handler; } };
  h.listeners.full({ type: 'build', name: 'persons', link, item: line, data });
  return line;
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

test('late Hybrid initialization receives cast CSS through the single style owner', async () => {
  const h = harness({ hybrid: false });
  assert.equal(h.styles.length, 0);
  h.window.StremioHybrid = { registerStyles(name, css) { h.styles.push({ name, css }); } };
  await new Promise(resolve => setTimeout(resolve, 120));
  assert.equal(h.styles.length, 1);
  assert.equal(h.styles[0].name, 'full-cast');
  assert.match(h.styles[0].css, /\.sh-full-cast-role/);
});

test('movie credit rows retain voice roles and normalize to the native person-card contract', () => {
  const h = harness();
  const [actor] = h.api.normalizeCredits({ cast: [{ id: 80, name: 'Voice Actor', character: 'Animated Hero / Narrator', profile_path: '/voice.jpg' }] }, 'movie');
  assert.deepEqual(JSON.parse(JSON.stringify(actor)), { id: 80, name: 'Voice Actor', character: 'Animated Hero / Narrator', profile_path: '/voice.jpg', source: 'tmdb', media_type: 'person', _shCreditOrder: 0 });
});

test('animated movie preview stays synchronous and fetches full movie credits only when All Actors opens', async () => {
  const h = harness(), activity = {}, cast = credits(4).cast, link = { destroyed: false, activity, rows: [], items: [] };
  const data = { movie: { id: 550, title: 'Animated Feature' }, persons: { cast } };
  h.listeners.full({ type: 'start', link, object: { id: 550, method: 'movie', source: 'tmdb' }, data });
  assert.equal(h.requests.length, 0, 'Details never waits for the movie credits endpoint');
  assert.equal(cast.length, 5, 'the complete-cast action remains available while native credits are the preview');
  const rowData = { results: cast, title: 'Актори' }, line = { data: rowData, items: [], use(handler) { this.handler = handler; } };
  const node = { classList: { add() {}, contains() { return false; } }, setAttribute() {} };
  const action = { data: cast[4], _shCastActionBound: false, components: [{ onEnter() {} }], render() { return [node]; } };
  line.items.push(action);
  h.listeners.full({ type: 'build', name: 'persons', link, item: line, data: rowData });
  action.components[0].onEnter();
  assert.equal(h.pushed[0].component, 'sh_full_cast_grid');
  assert.equal(h.pushed[0].cast, null, 'the preview is not mislabeled as the complete movie cast');
  const category = h.Lampa.component(h.pushed[0]);
  h.Lampa.Activity.active = () => ({ activity: h.category.activity });
  h.category.options.onCreate.call(h.category);
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].route, 'movie/550/credits');
  h.requests[0].done({ cast: [{ id: 80, name: 'Voice Actor', character: 'Animated Hero / Narrator', profile_path: null }] });
  await new Promise(setImmediate);
  assert.equal(h.category.page.results.length, 1);
  assert.equal(h.category.page.results[0]._shCastPerson.character, 'Animated Hero / Narrator');
});

test('a genuinely small TV cast does not invent additional actors or keep an unnecessary All Actors card', async () => {
  const h = harness(), cast = credits(2).cast, link = { destroyed: false, activity: {}, rows: [], items: [] };
  h.listeners.full({ type: 'start', link, object: { id: 900, method: 'tv', source: 'tmdb' }, data: { movie: { id: 900, name: 'Small Cast' }, persons: { cast } } });
  assert.equal(cast.length, 3, 'while discovery is pending the action allows retry/open');
  buildPeopleRow(h, link, cast);
  assert.equal(h.requests.length, 1);
  h.requests[0].done(credits(2));
  await new Promise(setImmediate);
  assert.equal(cast.length, 2);
  assert.equal(cast.some(person => person._shCastAction), false);
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

test('native Full start remains synchronous and later receives ten real actors plus one All Actors action', async () => {
  const h = harness();
  const cast = credits(4).cast;
  const activity = {};
  const component = { destroyed: false, activity, rows: [], items: [] };
  h.Lampa.Activity.active = () => ({ component: 'full', activity, id: 100088 });
  const data = { movie: { id: 100088, name: 'The Last of Us' }, persons: { cast } };
  h.listeners.full({ type: 'start', link: component, object: { id: 100088, method: 'tv', source: 'tmdb' }, data });
  assert.equal(h.requests.length, 0, 'extended credits do not block or run before the cast section is needed');
  assert.equal(cast.length, 5, 'the native four-person row remains usable and receives an explicit All Actors card while enrichment runs');
  buildPeopleRow(h, component, cast);
  assert.equal(h.requests.length, 1, 'the extended lookup starts only when the actor row is built');
  h.requests[0].done(credits(159));
  await new Promise(setImmediate);
  assert.equal(cast.length, 11);
  assert.equal(cast.filter(person => !person._shCastAction).length, 10);
  assert.equal(cast[0].id, 1);
  assert.equal(cast[9].id, 10);
  assert.equal(cast[10].name, 'Всі актори');
  assert.equal(cast.filter(person => person._shCastAction).length, 1);
});

test('reused native Full link binds the new activity and ignores late credits from the previous title', async () => {
  const h = harness(), firstActivity = {}, secondActivity = {}, link = { destroyed: false, activity: firstActivity, rows: [], items: [] };
  const firstCast = credits(3).cast, secondCast = credits(4).cast;
  h.Lampa.Activity.active = () => ({ component: 'full', activity: secondActivity, id: 2 });
  h.listeners.full({ type: 'start', link, object: { id: 1, method: 'tv', source: 'tmdb' }, data: { movie: { id: 1, name: 'Old' }, persons: { cast: firstCast } } });
  buildPeopleRow(h, link, firstCast);
  link.activity = secondActivity;
  h.listeners.full({ type: 'start', link, object: { id: 2, method: 'tv', source: 'tmdb' }, data: { movie: { id: 2, name: 'Current' }, persons: { cast: secondCast } } });
  buildPeopleRow(h, link, secondCast);
  assert.equal(h.requests.length, 2, 'reusing the native Full link for a new Activity starts its own coalesced lookup');
  h.requests[0].done(credits(20));
  await new Promise(setImmediate);
  assert.equal(secondCast.some(person => person.name === 'Actor 20'), false, 'the old result cannot be written into the current cast');
  h.requests[1].done(credits(15));
  await new Promise(setImmediate);
  assert.equal(secondCast.length, 11);
  assert.equal(secondCast[0].name, 'Actor 1');
  assert.equal(secondCast[10].name, 'Всі актори');
});

test('same title re-entry on a reused Full link shares lookup but applies only to the newest data owner', async () => {
  const h = harness(), activity = {}, link = { destroyed: false, activity, rows: [], items: [] };
  const firstCast = credits(4).cast, nextCast = credits(4).cast;
  h.listeners.full({ type: 'start', link, object: { id: 100088, method: 'tv', source: 'tmdb' }, data: { movie: { id: 100088, name: 'The Last of Us' }, persons: { cast: firstCast } } });
  buildPeopleRow(h, link, firstCast);
  h.listeners.full({ type: 'start', link, object: { id: 100088, method: 'tv', source: 'tmdb' }, data: { movie: { id: 100088, name: 'The Last of Us' }, persons: { cast: nextCast } } });
  buildPeopleRow(h, link, nextCast);
  assert.equal(h.requests.length, 1, 'the same title reuses the in-flight native TMDB request');
  h.requests[0].done(credits(159));
  await new Promise(setImmediate);
  assert.equal(firstCast.some(person => person.name === 'Actor 20'), false, 'retired Details data is not changed');
  assert.equal(nextCast.length, 11);
  assert.equal(nextCast[10].name, 'Всі актори');
});

test('visible All Actors person control routes to the native Category screen with the full cached cast', async () => {
  const h = harness(), activity = {}, component = { destroyed: false, activity, rows: [], items: [] }, cast = credits(4).cast;
  h.Lampa.Activity.active = () => ({ component: 'full', activity, id: 100088 });
  const data = { movie: { id: 100088, name: 'The Last of Us' }, persons: { cast } };
  h.listeners.full({ type: 'start', link: component, object: { id: 100088, method: 'tv', source: 'tmdb' }, data });
  assert.equal(h.requests.length, 0);
  const line = buildPeopleRow(h, component, cast);
  assert.equal(h.requests.length, 1);
  h.requests[0].done(credits(159)); await new Promise(setImmediate);
  const actionNode = { classList: { add(value) { this[value] = true; }, contains() { return false; } }, setAttribute() {} };
  const action = { data: cast[10], _shCastActionBound: false, components: [{ onEnter() { throw new Error('native person route must be replaced for this action'); } }], render() { return [actionNode]; } };
  const actionLine = { data: line.data, items: [action], use(handler) { this.handler = handler; } };
  h.listeners.full({ type: 'build', name: 'persons', link: component, item: actionLine, data: line.data });
  action.data = cast[10];
  action.components[0].onEnter();
  assert.equal(h.pushed.length, 1);
  assert.equal(h.pushed[0].component, 'sh_full_cast_grid');
  assert.equal(h.pushed[0].title, 'Всі актори');
  assert.equal(h.pushed[0].cast.length, 159);
  assert.equal(h.Lampa.componentName, 'sh_full_cast_grid');
  assert.equal(h.styles.length, 1);
  assert.equal(h.styles[0].name, 'full-cast');
});

test('native Category card instance shows the verified role and Enter opens that person only', async () => {
  const h = harness(), actors = h.api.normalizeCredits({ cast: credits(35).cast }, 'tv');
  const comp = h.Lampa.component({ kind: 'tv', id: 100088, title: 'Всі актори · The Last of Us', cast: actors });
  h.category.options.onCreate.call(h.category);
  assert.equal(h.category.className, 'sh-full-cast-grid');
  assert.equal(h.category.page.results.length, 30);
  assert.equal(h.category.page.results[0]._shCastPerson.name, 'Actor 1');
  let entered = null, role = null;
  const view = { appendChild(node) { role = node; } };
  const node = { classList: { add() {} }, querySelector(selector) { return selector === '.card__view' ? view : null; } };
  const card = { render() { return [node]; }, use(options) { this.options = options; } };
  h.category.options.onInstance(card, h.category.page.results[0]);
  card.options.onCreate.call({ render() { return [node]; } });
  assert.equal(role.className, 'sh-full-cast-role');
  assert.equal(role.textContent, 'Role 1');
  card.options.onlyEnter();
  assert.equal(h.pushed.length, 1);
  assert.equal(h.pushed[0].component, 'actor');
  assert.equal(h.pushed[0].id, actors[0].id);
  assert.equal(h.pushed[0].name, 'Actor 1');
});

test('large movie credits use the native Category pagination without losing source order or roles', () => {
  const h = harness(), movieCredits = credits(67).cast.map(person => ({ id: person.id, name: person.name, order: person.order, profile_path: person.profile_path, character: person.roles[0].character }));
  const actors = h.api.normalizeCredits({ cast: movieCredits }, 'movie');
  const comp = h.Lampa.component({ kind: 'movie', id: 550, title: 'Всі актори · Movie', cast: actors });
  h.category.options.onCreate.call(h.category);
  assert.equal(h.category.page.results.length, 30);
  assert.equal(h.category.page.total_pages, 3);
  assert.equal(h.category.page.results[0]._shCastPerson.id, 1);
  assert.equal(h.category.page.results[0]._shCastPerson.character, 'Role 1');

  const pages = [h.category.page.results];
  const loadNext = () => new Promise(resolve => h.category.options.onNext.call(h.category, { call(_self, page) { resolve(page.results); } }, { call() { resolve([]); } }));
  return loadNext().then(second => {
    pages.push(second);
    return loadNext();
  }).then(third => {
    pages.push(third);
    assert.deepEqual(pages.map(page => page.length), [30, 30, 7]);
    const ids = pages.flat().map(person => person._shCastPerson.id);
    assert.equal(new Set(ids).size, 67);
    assert.deepEqual(ids, Array.from({ length: 67 }, (_, index) => index + 1));
  });
});
