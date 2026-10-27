'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const root = __dirname + '/..';
const hybrid = fs.readFileSync(root + '/ui/stremio-hybrid.js', 'utf8');
const overlay = fs.readFileSync(root + '/ui/torrent-overlay.js', 'utf8');
const redesign = fs.readFileSync(root + '/torrents-redesign.js', 'utf8');
function extract(source, name) {
  const start = source.indexOf('    function ' + name + '(');
  assert(start >= 0, 'Missing production function ' + name);
  if (name === 'streamWindow') {
    const end = source.indexOf('\n    // Row view adapter', start);
    assert(end > start, 'Missing end of production function streamWindow');
    return source.slice(start, end);
  }
  const next = source.indexOf('\n    function ', start + 13);
  return source.slice(start, next < 0 ? source.length : next);
}
class Node {
  constructor(classes = '') {
    this.children = []; this.parentNode = null; this.attrs = {}; this.dataset = {}; this.listeners = {};
    this.className = classes; this.classes = new Set(classes.split(/\s+/).filter(Boolean));
    this.classList = { add: x => { this.classes.add(x); this.className = [...this.classes].join(' '); }, remove: x => { this.classes.delete(x); this.className = [...this.classes].join(' '); }, contains: x => this.classes.has(x), toggle: (x, on) => { if (on === undefined ? !this.classes.has(x) : on) this.classes.add(x); else this.classes.delete(x); this.className = [...this.classes].join(' '); } };
    this.isConnected = true; this.offsetParent = {}; this.hidden = false; this._text = '';
    Object.defineProperty(this, 'textContent', { get: () => this._text + this.children.map(n => n.textContent).join(''), set: value => { this._text = String(value); this.children.forEach(n => { n.parentNode = null; }); this.children = []; } });
  }
  appendChild(node) { if (node.parentNode) node.parentNode.removeChild(node); this.children.push(node); node.parentNode = this; return node; }
  insertBefore(node, before) { if (node.parentNode) node.parentNode.removeChild(node); const i = this.children.indexOf(before); this.children.splice(i < 0 ? this.children.length : i, 0, node); node.parentNode = this; return node; }
  removeChild(node) { const i = this.children.indexOf(node); if (i >= 0) this.children.splice(i, 1); node.parentNode = null; return node; }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  getAttribute(key) { return this.attrs[key] == null ? null : this.attrs[key]; }
  addEventListener(type, fn) { this.listeners[type] = fn; }
  dispatch(type) { this.listeners[type]({ stopImmediatePropagation() {} }); }
  querySelector(selector) { return this.nodes && this.nodes[selector] || null; }
  querySelectorAll(selector) { if (selector === '.torrent-item') return this.children.filter(n => n.classList.contains('torrent-item')); return []; }
  closest(selector) { return selector === '.scroll' ? this.scroll || null : null; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); this.isConnected = false; }
}
function fixture() {
  const stored = {}, selections = [], focus = { current: null }, list = new Node(), scroll = { scrollTop: 17 };
  list.scroll = scroll;
  const localStorage = { getItem: key => Object.hasOwn(stored, key) ? String(stored[key]) : null, setItem: (key, value) => { stored[key] = String(value); } };
  const Lampa = {
    Storage: { get: (key, fallback) => Object.hasOwn(stored, key) ? stored[key] : fallback, set: (key, value) => { stored[key] = value; localStorage.setItem(key, value); }, field: () => '' },
    Account: { Permit: { account: { id: 'fixture', profile: { id: 'profile' } } } },
    Activity: { active: () => ({ activity: record.activity }) },
    Controller: { collectionSet() {}, collectionFocus: node => { focus.current = node; } },
    Select: { show: options => selections.push(options) }, Noty: { show() {} }
  };
  const document = { createElement: () => new Node(), createTextNode: text => { const n = new Node(); n.textContent = text; return n; } };
  const context = { window: { localStorage }, Lampa, document, console, Date, Set, WeakMap, Event: function () {} };
  vm.createContext(context); vm.runInContext(redesign, context);
  context.window.Lampa = Lampa; vm.runInContext(overlay, context);
  context.TorrentsRedesign = context.window.TorrentsRedesign; context.LampaTorrentOverlay = context.window.LampaTorrentOverlay;
  const adapterStart = hybrid.indexOf('    // Row view adapter');
  const adapterEnd = hybrid.indexOf('    function streamTrackerKey', adapterStart);
  assert(adapterStart >= 0 && adapterEnd > adapterStart, 'Missing production embedded row adapter');
  vm.runInContext(hybrid.slice(adapterStart, adapterEnd), context);
  const files = new Node(), filters = new Node(), sortNative = new Node(), rootNode = new Node();
  rootNode.querySelector = selector => selector === '.torrent-list' ? list : selector === '.explorer__files' ? files : selector === '.torrent-filter' ? filters : selector === '.filter--sort' ? sortNative : null;
  rootNode.querySelectorAll = selector => {
    if (selector === '.torrent-item') return list.querySelectorAll(selector);
    const tools = files.children.find(node => node.classList.contains('ctr-tools'));
    if (!tools) return [];
    if (selector === '.ctr-tools .selector,.torrent-filter .selector') return Object.values(nodes).flatMap(group => group.children).filter(node => node.classList.contains('selector'));
    if (selector === '.ctr-tabs [data-quality]') return nodes['.ctr-tabs'].children.filter(node => node.dataset.quality);
    if (selector === '.ctr-tracker-tabs .selector') return nodes['.ctr-tracker-tabs'].children;
    if (selector === '.ctr-menus .selector') return nodes['.ctr-menus'].children;
    return [];
  };
  rootNode.classList.add('sh-cinema-explorer');
  const pane = new Node(); pane.querySelectorAll = () => [];
  const page = { classList: { contains: () => true } };
  const record = { activity: {}, streamPane: pane, streamView: { isOpen: () => true }, page };
  const movie = { id: 21, source: 'tmdb', media_type: 'movie', title: 'The Others', original_title: 'The Others', release_date: '2001-08-02' };
  const child = { getFilterData: () => ({}) };
  const st = { record, params: { movie }, child, root: rootNode, rows: [], sourceData: new WeakMap(), windowStart: 0, dead: false, wantFocus: true, session: context.LampaTorrentOverlay.session(), trackerButtons: null };
  record.streamChild = st;
  function release(title, tracker, extra = {}) {
    const row = new Node('torrent-item selector'); row.nodes = { '.ctr-name': new Node('ctr-name'), '.ctr-chips': new Node('ctr-chips'), '.ctr-best': new Node('ctr-best'), '.torrent-item__title': new Node() };
    row.querySelector = selector => row.nodes[selector] || null;
    const source = { Title: title, Tracker: tracker, Seeders: 10, Peers: 2, Size: 1000000000, ...extra };
    st.rows.push(row); st.sourceData.set(row, source); return { row, source };
  }
  const nodes = {
    '.ctr-tabs': new Node('ctr-tabs'), '.ctr-tracker-tabs': new Node('ctr-tabs ctr-tracker-tabs'), '.ctr-menus': new Node('ctr-menus')
  };
  // Template-backed toolbar fixture: preserve the production setupStreamTools handlers.
  const filesInsert = files.insertBefore.bind(files);
  files.insertBefore = (node, before) => { node.nodes = nodes; node.querySelector = selector => nodes[selector] || null; node.classList.add('ctr-tools'); return filesInsert(node, before); };
  const sourceFunctions = ['streamSession', 'streamAlive', 'streamTrackerKey', 'streamSortKey', 'streamWindow', 'streamUpdateRows', 'decorateStreamRows', 'syncStreamTrackerTools', 'streamFocus', 'streamMove', 'setupStreamTools'];
  context.streamActivate = () => {};
  context.streamSelectOwner = null;
  vm.runInContext(sourceFunctions.map(name => extract(hybrid, name)).join('\n'), context);
  // setupStreamTools uses innerHTML to create these three native control groups.
  Object.defineProperty(Node.prototype, 'innerHTML', { set() { this.nodes = nodes; this.querySelector = selector => nodes[selector] || null; }, configurable: true });
  return { context, api: context.TorrentsRedesign, overlay: context.LampaTorrentOverlay, stored, selections, focus, list, scroll, files, record, st, movie, release, nodes };
}

test('Hybrid embedded list uses shared metadata, exact matching, tracker filters, sorting and Best Choice pinning', () => {
  const f = fixture();
  const toloka = f.release('The Others (2001) 1080p', 'Toloka', { AudioLanguages: ['uk'], SubtitleLanguages: ['ru'], VoiceoverStudio: 'UA Studio', Size: 900000000 });
  const mazepa = f.release('The Others (2001) 2160p', 'Mazepa', { AudioLanguages: ['en'], SubtitleLanguages: ['uk'], Seeders: 80, Size: 4000000000 });
  const wrongYear = f.release('The Others (2024) 2160p', 'Mazepa', { AudioLanguages: ['uk'], Seeders: 500, ReleaseGroup: 'Амоногава' });
  f.context.streamUpdateRows(f.st);
  assert.equal(f.st.displayRows.length, 3);
  assert.equal(f.st.displayRows[0], toloka.row, 'the confirmed Ukrainian-audio release is the single Best Choice');
  assert.equal(toloka.row.nodes['.ctr-chips'].textContent.includes('Аудіо: Українська'), true);
  assert.equal(toloka.row.nodes['.ctr-chips'].textContent.includes('Озвучення: UA Studio'), true);
  assert.equal(toloka.row.nodes['.ctr-chips'].textContent.includes('Субтитри: Російська'), true);
  assert.equal(mazepa.row.nodes['.ctr-chips'].textContent.includes('Аудіо: Українська'), false, 'Ukrainian subtitles never become Ukrainian audio');
  assert.equal(mazepa.row.nodes['.ctr-chips'].textContent.includes('Субтитри: Українська'), true);
  assert.equal(wrongYear.row.classList.contains('is-best'), false);
  assert.equal(wrongYear.row.nodes['.ctr-chips'].textContent.includes('Амоногава'), false, 'a release group alone is not a studio identity');
  f.api.storeSort('quality'); f.context.streamUpdateRows(f.st);
  assert.equal(f.st.displayRows[0], toloka.row, 'Best Choice stays first despite quality sorting');
  assert.equal(f.list.children[0], toloka.row, 'the first displayed DOM row is physically pinned');
  f.api.storeTrackerFilter('mazepa'); f.context.streamUpdateRows(f.st);
  assert.equal(f.st.displayRows.length, 3);
  assert.equal(f.st.displayRows[0], toloka.row, 'global Toloka recommendation stays pinned when Mazepa is selected');
  assert.equal(toloka.row.getAttribute('data-best-outside-filter'), 'true');
  assert.match(toloka.row.nodes['.ctr-best'].textContent, /Toloka поза фільтром/);
  assert.equal(f.st.displayRows.filter(row => row === toloka.row).length, 1, 'pinned release is not repeated in ordinary results');
  assert.equal(f.st.displayRows[1], mazepa.row);
  assert.equal(f.st.displayRows[2], wrongYear.row);
  assert.equal(f.st.best, toloka.row, 'the global Best Choice is independent of the ordinary tracker filter');
  assert.equal(f.list.children[0], toloka.row);
});

test('popup exposes exactly one Best Choice badge and none when no qualified candidate exists', () => {
  assert.match(overlay, /\.sh-torrent-overlay \.ctr-best\{display:none!important/);
  assert.match(overlay, /\.sh-torrent-overlay \.torrent-item\.is-best \.ctr-best\{display:inline-flex!important\}/);
  const f = fixture();
  const qualified = f.release('The Others (2001) 1080p', 'Toloka', { AudioLanguages: ['uk'] });
  const ordinary = f.release('The Others (2001) 720p', 'Mazepa', { AudioLanguages: ['en'] });
  f.context.streamUpdateRows(f.st);
  let visibleBadges = f.st.rows.filter(row => row.classList.contains('is-best'));
  assert.deepEqual(visibleBadges, [qualified.row], 'only the recommendation owner can reveal its badge');
  assert.equal(visibleBadges[0].nodes['.ctr-best'].textContent.includes('Найкращий вибір'), true);
  assert.equal(ordinary.row.nodes['.ctr-best'].textContent, '', 'ordinary rows keep their badge node empty');

  const unrelated = f.release('Unrelated release (1999) 1080p', 'Toloka');
  f.st.rows = [unrelated.row]; f.st.sourceData = new WeakMap([[unrelated.row, unrelated.source]]);
  f.context.streamUpdateRows(f.st);
  visibleBadges = f.st.rows.filter(row => row.classList.contains('is-best'));
  assert.equal(f.st.best, null);
  assert.equal(visibleBadges.length, 0, 'an unqualified list reveals no Best Choice badge');
});

test('Hybrid popup rows display confirmed anime audio/studio tracks and reject the wrong season', () => {
  const f = fixture();
  f.st.params.movie = { id: 55, source: 'tmdb', media_type: 'tv', name: 'Frieren', original_name: 'Frieren', first_air_date: '2023-10-01' };
  f.st.params.season = 1;
  f.st.child.getFilterData = () => ({ season: 1 });
  const amanogawa = f.release('Frieren S01E03 1080p Amanogawa Multi-voice', 'Toloka', {
    AudioTracks: [{ language: 'uk', type: 'audio' }, { language: 'ja', type: 'audio' }],
    SubtitleLanguages: ['en'], VoiceoverStudio: 'Amanogawa', VoiceoverType: 'multi-voice'
  });
  const wrongSeason = f.release('Frieren S02E03 2160p', 'Mazepa', { AudioLanguages: ['uk'], VoiceoverStudio: 'Далі Буде' });
  const ambiguousGroup = f.release('Frieren S01E03 1080p Japanese audio', 'Nyaa', { AudioLanguages: ['ja'], ReleaseGroup: 'Далі Буде' });
  f.context.streamUpdateRows(f.st);
  const chips = amanogawa.row.nodes['.ctr-chips'].textContent;
  assert.match(chips, /Аудіо: Українська \/ Японська/);
  assert.match(chips, /Озвучення: Амоногава · Багатоголосе/);
  assert.match(chips, /Субтитри: English/);
  assert.equal(wrongSeason.row.classList.contains('is-best'), false);
  assert.match(ambiguousGroup.row.nodes['.ctr-chips'].textContent, /Студія невідома/);
});

test('Hybrid embedded controls invoke native tracker/sort handlers; async rows re-rank and empty/singleton results are safe', async () => {
  const f = fixture();
  const toloka = f.release('The Others (2001) 1080p', 'Toloka', { AudioLanguages: ['en'], Seeders: 5 });
  const mazepa = f.release('The Others (2001) 2160p', 'Mazepa', { AudioLanguages: ['en'], Seeders: 20 });
  const other = f.release('The Others (2001) 720p', 'Nyaa', { AudioLanguages: ['ja'], Seeders: 2 });
  f.context.streamUpdateRows(f.st);
  f.context.setupStreamTools(f.st);
  f.context.syncStreamTrackerTools(f.st);
  const allButton = f.st.trackerButtons.all, tolokaButton = f.st.trackerButtons.toloka, mazepaButton = f.st.trackerButtons.mazepa, sourceButton = f.st.trackerButtons.source;
  assert.match(tolokaButton.textContent, /Толока · 1/); assert.match(mazepaButton.textContent, /Мазепа · 1/);
  assert.match(sourceButton.textContent, /Інші · 1/);
  tolokaButton.dispatch('hover:enter');
  assert.equal(f.api.selectedTrackerFilter(), 'toloka', 'the embedded control persists through the shared preference helper');
  assert.equal(f.st.displayRows.length, 1);
  assert.equal(f.st.displayRows[0], toloka.row);
  assert.equal(f.focus.current, tolokaButton, 'native Lampa focus returns to the active tracker button');
  allButton.dispatch('click');
  sourceButton.dispatch('hover:enter');
  const sourceSelect = f.selections.at(-1);
  sourceSelect.onSelect(sourceSelect.items[0]);
  assert.equal(f.api.selectedTrackerFilter(), 'source:nyaa');
  assert.equal(f.st.displayRows.length, 2, 'the global pinned release remains alongside the source-filtered ordinary row');
  assert.equal(f.st.displayRows[0], toloka.row);
  assert.equal(f.st.displayRows[1], other.row);
  assert.equal(f.focus.current, sourceButton, 'focus returns from the native tracker picker to its owner control');
  await new Promise(resolve => setTimeout(resolve, 190));
  allButton.dispatch('hover:enter');
  assert.equal(f.api.selectedTrackerFilter(), 'all');
  f.st.sortButton.dispatch('hover:enter');
  const sortSelect = f.selections.at(-1);
  sortSelect.onSelect({ key: 'seeders' });
  assert.equal(f.stored.torrents_cinema_sort, 'seeders');
  assert.equal(f.focus.current, f.st.sortButton, 'focus returns from sorting to the native embedded sort control');
  assert.equal(f.st.displayRows[0], toloka.row, 'Best Choice remains pinned above the selected seeders sort');
  assert.equal(f.st.displayRows[1], mazepa.row, 'the remaining rows follow the requested seeders sort');
  assert.equal(f.st.displayRows.includes(other.row), true);
  f.st.last = toloka.row; f.context.streamMove(f.record, 'left');
  assert.equal(f.focus.current, allButton, 'D-pad left from a release returns to the tracker toolbar');
  assert.equal(f.st.root.querySelectorAll('.ctr-tracker-tabs .selector').includes(allButton), true, 'active tracker control belongs to the tracker group');
  f.st.last = allButton; f.context.streamMove(f.record, 'down');
  assert.equal(f.focus.current, f.st.sortButton, 'D-pad down from tracker filters enters sort controls');
  f.st.last = toloka.row; f.context.streamMove(f.record, 'down');
  assert.equal(f.focus.current, mazepa.row, 'D-pad down selects the next release in the real sorted order');
  const third = f.release('The Others (2001) 1080p', 'Mazepa', { AudioLanguages: ['uk'], Seeders: 120 });
  f.context.streamUpdateRows(f.st);
  assert.match(mazepaButton.textContent, /Мазепа · 2/);
  assert.equal(f.st.best, third.row, 'late parser row updates recommendation and order');
  f.api.storeTrackerFilter('source:', 'Missing Tracker'); f.context.streamUpdateRows(f.st);
  assert.equal(f.st.displayRows.length, 1, 'a global recommendation remains when the ordinary filter has no matches');
  assert.equal(f.st.displayRows[0], third.row); assert.equal(f.st.best, third.row);
  f.api.storeTrackerFilter('all');
  const unrelated = f.release('Unrelated title (1999) 1080p', 'Toloka'); f.context.streamUpdateRows(f.st);
  f.st.rows = [unrelated.row]; f.st.sourceData = new WeakMap([[unrelated.row, unrelated.source]]); f.context.streamUpdateRows(f.st);
  assert.equal(f.st.best, null, 'no trustworthy title match means no Best Choice');
  f.api.storeTrackerFilter('all'); f.st.rows = [toloka.row]; f.st.sourceData = new WeakMap([[toloka.row, toloka.source]]); f.context.streamUpdateRows(f.st);
  assert.equal(f.st.displayRows.length, 1); assert.equal(f.st.displayRows[0], toloka.row); assert.equal(f.st.best, toloka.row, 'a single valid release can be Best Choice');
});
