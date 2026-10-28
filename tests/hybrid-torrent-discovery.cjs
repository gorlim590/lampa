'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const root = __dirname + '/..';
const hybrid = fs.readFileSync(root + '/ui/torrent-cinema/runtime.js', 'utf8');
const overlay = fs.readFileSync(root + '/ui/torrent-cinema.js', 'utf8');
const redesign = fs.readFileSync(root + '/ui/torrent-cinema.js', 'utf8');
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
    this.className = classes; this.classes = new Set(classes.split(/\s+/).filter(Boolean));Object.defineProperty(this,'className',{get:()=>[...this.classes].join(' '),set:value=>{this.classes=new Set(String(value).split(/\s+/).filter(Boolean));}});
    this.classList = { add: x => { this.classes.add(x); this.className = [...this.classes].join(' '); }, remove: x => { this.classes.delete(x); this.className = [...this.classes].join(' '); }, contains: x => this.classes.has(x), toggle: (x, on) => { if (on === undefined ? !this.classes.has(x) : on) this.classes.add(x); else this.classes.delete(x); this.className = [...this.classes].join(' '); } };
    this.isConnected = true; this.offsetParent = {}; this.hidden = false; this._text = '';
    Object.defineProperty(this, 'textContent', { get: () => this._text + this.children.map(n => n.textContent).join(''), set: value => { this._text = String(value); this.children.forEach(n => { n.parentNode = null; }); this.children = []; } });
  }
  appendChild(node) { if (node.parentNode) node.parentNode.removeChild(node); this.children.push(node); node.parentNode = this; return node; }
  insertBefore(node, before) { if (node.parentNode) node.parentNode.removeChild(node); const i = this.children.indexOf(before); this.children.splice(i < 0 ? this.children.length : i, 0, node); node.parentNode = this; return node; }
  removeChild(node) { const i = this.children.indexOf(node); if (i >= 0) this.children.splice(i, 1); node.parentNode = null; return node; }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  getAttribute(key) { return this.attrs[key] == null ? null : this.attrs[key]; }
  removeAttribute(key) { delete this.attrs[key]; }
  addEventListener(type, fn) { this.listeners[type] = fn; }
  dispatch(type) { this.listeners[type]({ stopImmediatePropagation() {} }); }
  matches(selector){if(selector==='[data-ctr-role="studio"]')return this.getAttribute('data-ctr-role')==='studio';return selector.split(',').some(part=>part.trim().split('.').filter(Boolean).every(cls=>(this.className||'').split(/\s+/).includes(cls)));}
  querySelector(selector) {if(this.nodes&&this.nodes[selector])return this.nodes[selector];return this.querySelectorAll(selector)[0]||null;}
  querySelectorAll(selector){const out=[],queue=[...this.children];while(queue.length){const node=queue.shift();if(node.matches?.(selector))out.push(node);queue.push(...(node.children||[]));}return out;}
  closest(selector) {if(selector==='.scroll')return this.scroll||null;for(let n=this;n;n=n.parentNode)if(n.matches?.(selector))return n;return null;}
  contains(node){for(let n=node;n;n=n.parentNode)if(n===this)return true;return false;}
  scrollIntoView(){}
  get firstChild(){return this.children[0]||null;}
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
  const trakt = { progress: { watched: null, episodes: [] }, reads: 0 };
  const context = { window: { localStorage, TraktPlus: { cachedHomeProgress(card) { trakt.reads++; return String(card.id) === '55' ? trakt.progress : { watched: null, episodes: [] }; } } }, Lampa, document, console, Date, Set, WeakMap, Event: function () {} };
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
    if (selector === '.ctr-tools .selector,.torrent-filter .selector') return [...nodes['.ctr-tabs'].children,...nodes['.ctr-tracker-tabs'].children].filter(node => node.className.split(/\s+/).includes('selector'));
    if (selector === '.ctr-tabs [data-quality]') return nodes['.ctr-tabs'].children.filter(node => node.dataset.quality);
    if (selector === '.ctr-tracker-tabs .selector') return nodes['.ctr-tracker-tabs'].children;
    if (selector === '.ctr-menus .selector') return nodes['.ctr-menus'].children;
    return [];
  };
  rootNode.classList.add('sh-cinema-explorer');
  const pane = new Node(),head=new Node(),retry=new Node();head.nodes={'.sh-stream-retry':retry};head.appendChild(retry);pane.nodes={'.sh-stream-head':head};pane.appendChild(head);
  const page = { classList: { contains: () => true } };
  const record = { activity: {}, streamPane: pane, streamView: { isOpen: () => true }, page };
  const movie = { id: 21, source: 'tmdb', media_type: 'movie', title: 'The Others', original_title: 'The Others', release_date: '2001-08-02' };
  const child = { getFilterData: () => ({}) };
  const st = { record, params: { movie }, child, root: rootNode, rows: [], sourceData: new WeakMap(), windowStart: 0, dead: false, wantFocus: true, session: context.LampaTorrentOverlay.session(), trackerButtons: null };
  record.streamChild = st;
  function release(title, tracker, extra = {}) {
    const row = new Node('torrent-item selector'); row.nodes = { '.ctr-name': new Node('ctr-name'), '.ctr-chips': new Node('ctr-chips'), '.ctr-best': new Node('ctr-best'), '.torrent-item__title': new Node() };
    row.querySelector = selector => row.nodes[selector] || Node.prototype.querySelector.call(row, selector);
    const source = { Title: title, Tracker: tracker, Seeders: 10, Peers: 2, Size: 1000000000, ...extra };
    const wrap=new Node('ctr-row'),info=new Node('ctr-release-info'),metrics=new Node('ctr-metrics');info.appendChild(row.nodes['.ctr-best']);info.appendChild(row.nodes['.ctr-name']);info.appendChild(row.nodes['.ctr-chips']);wrap.appendChild(info);wrap.appendChild(metrics);row.appendChild(wrap);row.setAttribute('data-parsed','1');
    st.rows.push(row); st.sourceData.set(row, source); return { row, source };
  }
  const nodes = {
    '.ctr-tabs': new Node('ctr-tabs'), '.ctr-tracker-tabs': new Node('ctr-tabs ctr-tracker-tabs'), '.ctr-menus': new Node('ctr-menus')
  };
  // Template-backed toolbar fixture: preserve the production setupStreamTools handlers.
  const filesInsert = files.insertBefore.bind(files);
  files.insertBefore = (node, before) => { node.nodes = nodes; node.querySelector = selector => nodes[selector] || null; node.classList.add('ctr-tools'); return filesInsert(node, before); };
  const sourceFunctions = ['streamRowKey', 'streamSession', 'streamAlive', 'streamTrackerKey', 'streamSortKey', 'streamWindow', 'streamUpdateRows', 'decorateStreamRows', 'syncStreamTrackerTools', 'streamFocus', 'streamMove', 'setupStreamTools', 'streamEpisodeDetails', 'streamEpisodeWatched', 'restoreStreamEpisodePreview', 'clearStreamEpisodePreviews', 'applyStreamEpisodePreview', 'applyStreamFileStudios', 'onStreamFile'];
  context.$=node=>({on(type,fn){node.jqueryEnter=fn;return this;}});context.running=true;context.metadata=context.TorrentsRedesign;context.bindInline=()=>{};context.collapseInline=()=>false;context.moveInline=()=>false;
  context.streamActivate = () => {};
  context.streamSelectOwner = null;
  context.streamRecord = () => record;
  context.streamMovie = () => record.movie;
  context.filesOverlay = null;
  record.kind = 'tv'; record.movie = {id:55,source:'tmdb',name:'Frieren'}; record.page.classList.contains = name => name === 'activity--active';
  Lampa.Api = {img:(path,size)=>'https://image.tmdb.org/t/p/'+size+path,sources:{tmdb:{seasons:(movie,seasons,done)=>{record.seasonRequests=(record.seasonRequests||0)+1;record.seasonCallback=done;}}}};
  vm.runInContext(sourceFunctions.map(name => extract(hybrid, name)).join('\n'), context);
  // setupStreamTools uses innerHTML to create these three native control groups.
  Object.defineProperty(Node.prototype, 'innerHTML', { set() { this.nodes = nodes; this.querySelector = selector => nodes[selector] || null; }, configurable: true });
  return { context, api: context.TorrentsRedesign, overlay: context.LampaTorrentOverlay, stored, selections, focus, list, scroll, files, record, st, movie, release, nodes, trakt };
}

test('Hybrid embedded list uses shared metadata, exact matching, tracker filters, sorting and Best Choice pinning', () => {
  const f = fixture();
  const toloka = f.release('The Others (2001) 1080p', 'Toloka', { AudioLanguages: ['uk'], SubtitleLanguages: ['ru'], VoiceoverStudio: 'UA Studio', Size: 900000000 });
  const mazepa = f.release('The Others (2001) 2160p', 'Mazepa', { AudioLanguages: ['en'], SubtitleLanguages: ['uk'], Seeders: 80, Size: 4000000000 });
  const wrongYear = f.release('The Others (2024) 2160p', 'Mazepa', { AudioLanguages: ['uk'], Seeders: 500, ReleaseGroup: 'Амоногава' });
  f.context.streamUpdateRows(f.st);
  assert.equal(f.st.displayRows.length, 3);
  assert.equal(f.st.displayRows[0], toloka.row, 'the confirmed Ukrainian-audio release is the single Best Choice');
  assert.match(toloka.row.querySelector('.tc-audio-label').textContent, /Українська/);
  assert.match(toloka.row.querySelector('.tc-voice').textContent, /UA Studio/);
  assert.match(toloka.row.querySelector('.tc-subtitles').textContent, /Російська/);
  assert.doesNotMatch(mazepa.row.querySelector('.tc-audio-label').textContent, /Українська/, 'Ukrainian subtitles never become Ukrainian audio');
  assert.match(mazepa.row.querySelector('.tc-subtitles').textContent, /Українська/);
  assert.equal(wrongYear.row.classList.contains('is-best'), false);
  assert.equal(wrongYear.row.textContent.includes('Амоногава'), false, 'a release group alone is not a studio identity');
  f.api.storeSort('quality'); f.context.streamUpdateRows(f.st);
  assert.equal(f.st.displayRows[0], toloka.row, 'Best Choice stays first despite quality sorting');
  assert.equal(f.list.children[0], toloka.row, 'the first displayed DOM row is physically pinned');
  f.api.storeTrackerFilter('mazepa'); f.context.streamUpdateRows(f.st);
  assert.equal(f.st.displayRows.length, 3);
  assert.equal(f.st.displayRows[0], toloka.row, 'global Toloka recommendation stays pinned when Mazepa is selected');
  assert.equal(toloka.row.getAttribute('data-best-outside-filter'), 'true');
  assert.match(toloka.row.nodes['.ctr-best'].textContent, /поза фільтром/);
  assert.equal(f.st.displayRows.filter(row => row === toloka.row).length, 1, 'pinned release is not repeated in ordinary results');
  assert.equal(f.st.displayRows[1], mazepa.row);
  assert.equal(f.st.displayRows[2], wrongYear.row);
  assert.equal(f.st.best, toloka.row, 'the global Best Choice is independent of the ordinary tracker filter');
  assert.equal(f.list.children[0], toloka.row);
});

test('popup exposes exactly one Best Choice badge and none when no qualified candidate exists', () => {
  assert.match(fs.readFileSync(root+'/ui/torrent-cinema/style.css','utf8'), /\.sh-torrent-overlay \.ctr-best\{display:none/);
  assert.match(fs.readFileSync(root+'/ui/torrent-cinema/style.css','utf8'), /\.sh-torrent-overlay \.is-best \.ctr-best\{display:block/);
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
  const nestedVoice = f.release('Frieren S01E03 1080p', 'Toloka', { info: { Voices: ['Далі Буде'] } });
  f.context.streamUpdateRows(f.st);
  const chips = amanogawa.row.textContent;
  assert.match(amanogawa.row.querySelector('.tc-audio-label').textContent, /Українська \/ Японська/);
  assert.match(chips, /Амоногава/);
  assert.match(amanogawa.row.querySelector('.tc-voice').textContent, /Багатоголосе/);
  assert.match(amanogawa.row.querySelector('.tc-subtitles').textContent, /English/);
  assert.equal(wrongSeason.row.classList.contains('is-best'), false);
  assert.doesNotMatch(ambiguousGroup.row.textContent, /Студія невідома/);
  assert.match(nestedVoice.row.textContent, /Далі Буде/);
});

test('generic voice tags are not presented as studios, while dedicated studio fields remain supported', () => {
  const f = fixture();
  const generic = f.api.normalizeRelease({Title:'Anime S01E01 1080p', info:{Voices:['Tori','UKR']}});
  const explicit = f.api.normalizeRelease({Title:'Anime S01E01 1080p', VoiceoverStudio:'Tori'});
  const named = f.api.normalizeRelease({Title:'Anime S01E01 1080p [Далі Буде]', voices:['UKR']});
  const many = f.api.normalizeRelease({Title:'Anime S01E01 1080p', VoiceoverStudios:'Amanogawa, Dali Bude, UKR'});
  const marked = f.api.normalizeRelease({Title:'Anime S01E01 1080p Озвучення: Nova Team'});
  assert.equal(generic.parsed.voiceover, 'Невідомо');
  assert.equal(explicit.parsed.voiceover, 'Tori');
  assert.equal(named.parsed.voiceover, 'Далі Буде');
  assert.equal(many.parsed.voiceover, 'Амоногава, Далі Буде');
  assert.equal(marked.parsed.voiceover, 'Nova Team');
});

test('real Hybrid torrent_file handler applies exact episode stills and verified studios from filenames', () => {
  const f = fixture();
  f.st.params.movie = {id:55,source:'tmdb',media_type:'tv',name:'Frieren',seasons:[{season_number:3}]};
  f.trakt.progress = { watched: false, episodes: [{ season: 3, episode: 1 }] };
  f.st.selectedRow = f.release('Frieren S03E01 1080p', 'Toloka', {VoiceoverStudio:'Tori'}).row;
  f.st.selectedRow.setAttribute('data-ctr-role','studio');
  const chips = f.st.selectedRow.nodes['.ctr-chips'];
  const studio = new Node('ctr-chip is-studio'); studio.setAttribute('data-ctr-role','studio'); studio.textContent='🎙 Tori'; chips.appendChild(studio);
  const content = new Node(), image = new Node(); image.setAttribute('src','');
  const item = new Node('torrent-serial'); item.nodes={'.torrent-serial__img':image,'.torrent-serial__content':content};
  item.querySelector = selector => item.nodes[selector] || null;
  const metadata={id:301,season_number:3,episode_number:1,still_path:'/episode-301.jpg',vote_average:0};
  f.context.onStreamFile({type:'render',params:{movie:f.st.params.movie,seasons:{3:{episodes:[metadata]}}},element:{season:3,episode:1,title:'Frieren S03E01 [Далі Буде].mkv'},item});
  assert.equal(image.getAttribute('src'),'https://image.tmdb.org/t/p/w300/episode-301.jpg');
  assert.equal(f.record.seasonRequests||0,0,'already available episode metadata does not trigger another request');
  assert.equal(studio.textContent,'Далі Буде');
  f.context.onStreamFile({type:'render',params:{movie:f.st.params.movie,seasons:{3:{episodes:[metadata]}}},element:{season:3,episode:2,title:'Frieren S03E02 [Amanogawa].mkv'},item:{0:item}});
  assert.equal(image.getAttribute('src'), '', 'an unwatched episode does not reuse the prior still');
  assert.equal(studio.textContent,'Далі Буде, Амоногава');
  f.overlay.decorate(f.st.selectedRow,f.st.selectedRow._ctrSource,f.st.params.movie,'tv',{});
  assert.equal(f.st.selectedRow.querySelector('[data-ctr-role="studio"]').textContent,'Далі Буде, Амоногава','verified file names survive overlay redecoration');
});

test('missing season metadata is requested once, episode callbacks retain identity, and detached rows stay untouched', () => {
  const f = fixture();
  f.trakt.progress = { watched: false, episodes: [{ season: 3, episode: 1 }, { season: 3, episode: 2 }] };
  const selected=f.release('Frieren S03E01 1080p','Toloka').row;f.st.selectedRow=selected;
  const image=new Node();image.setAttribute('src','');const item=new Node('torrent-serial');item.nodes={'.torrent-serial__img':image};item.querySelector=selector=>item.nodes[selector]||null;
  const event={type:'render',params:{movie:{id:55,source:'tmdb'}},element:{season:3,episode:1,title:'Frieren S03E01'},item};
  f.context.onStreamFile(event);f.context.onStreamFile({...event,element:{season:3,episode:2,title:'Frieren S03E02'}});
  assert.equal(f.record.seasonRequests,1,'the same season is fetched once for multiple file rows');
  f.record.seasonCallback({3:{episodes:[{season_number:3,episode_number:1,still_path:'/one.jpg'},{season_number:3,episode_number:2,still_path:'/two.jpg'}]}});
  assert.equal(image.getAttribute('src'),'https://image.tmdb.org/t/p/w300/two.jpg','reused row shows only its most recently rendered episode');
  const staleImage=new Node();staleImage.setAttribute('src','');const staleItem=new Node('torrent-serial');staleItem.nodes={'.torrent-serial__img':staleImage};staleItem.querySelector=selector=>staleItem.nodes[selector]||null;
  f.st.selectedRow=selected;
  f.context.onStreamFile({...event,params:{movie:{id:55,source:'tmdb'}},item:staleItem,element:{season:4,episode:1,title:'Frieren S04E01'}});
  staleItem.isConnected=false;f.record.seasonCallback({4:{episodes:[{season_number:4,episode_number:1,still_path:'/stale.jpg'}]}});
  assert.equal(staleImage.getAttribute('src'),'','closed/stale episode DOM is not mutated');
});

test('episode stills require exact, current-account Trakt confirmation before metadata requests', () => {
  for (const progress of [
    { watched: null, episodes: [{ season: 3, episode: 1 }] }, // logged out, pending, failed or stale
    { watched: false, episodes: [] }, // show is incomplete and this episode is not watched
    { watched: true, episodes: [{ season: 2, episode: 1 }] }, // whole show says complete but exact episode is absent
    null
  ]) {
    const f = fixture(); f.trakt.progress = progress;
    const image = new Node(); image.setAttribute('src', 'https://image.invalid/non-spoiler.jpg');
    const item = new Node('torrent-serial'); item.nodes = { '.torrent-serial__img': image }; item.querySelector = selector => item.nodes[selector] || null;
    f.context.onStreamFile({ type: 'render', params: { movie: { id: 55, source: 'tmdb', media_type: 'tv' }, seasons: {} }, element: { season: 3, episode: 1 }, item });
    assert.equal(f.record.seasonRequests || 0, 0, 'unconfirmed episode does not fetch spoiler still metadata');
    assert.equal(image.getAttribute('src'), 'https://image.invalid/non-spoiler.jpg');
    assert.equal(image.getAttribute('data-sh-episode-preview'), null);
  }
  const f = fixture(); f.trakt.progress = { watched: false, episodes: [{ season: 3, episode: 1 }] };
  const image = new Node(); image.setAttribute('src', ''); const item = new Node('torrent-serial'); item.nodes = { '.torrent-serial__img': image }; item.querySelector = selector => item.nodes[selector] || null;
  f.context.onStreamFile({ type: 'render', params: { movie: { id: 55, source: 'tmdb', media_type: 'tv', seasons: {} } }, element: { season: 3, episode: 1 }, item });
  assert.equal(f.record.seasonRequests, 1, 'an exact cached episode starts a single metadata lookup');
  f.trakt.progress = { watched: false, episodes: [] }; // active account/profile changed while the public request was pending
  f.record.seasonCallback({ 3: { episodes: [{ season_number: 3, episode_number: 1, still_path: '/watched-only.jpg' }] } });
  assert.equal(image.getAttribute('src'), '', 'a stale callback cannot reveal an episode after confirmation disappears');
});

test('reused file row invalidates an earlier async preview when its episode identity changes', () => {
  const f = fixture(); f.trakt.progress = { watched: false, episodes: [{ season: 3, episode: 1 }, { season: 3, episode: 2 }] };
  const image = new Node(); image.setAttribute('src', 'https://image.invalid/base.jpg');
  const item = new Node('torrent-serial'); item.nodes = { '.torrent-serial__img': image }; item.querySelector = selector => item.nodes[selector] || null;
  const params = { movie: { id: 55, source: 'tmdb', media_type: 'tv' } };
  f.context.onStreamFile({ type: 'render', params, element: { season: 3, episode: 1 }, item });
  f.context.onStreamFile({ type: 'render', params, element: { season: 3, episode: 2 }, item });
  assert.equal(f.record.streamSeasonRequests['tmdb:55:3'].callbacks.length, 2, 'both current and stale row generations share one request');
  f.record.seasonCallback({ 3: { episodes: [
    { season_number: 3, episode_number: 1, still_path: '/stale.jpg' },
    { season_number: 3, episode_number: 2, still_path: '/current.jpg' }
  ] } });
  assert.equal(image.getAttribute('src'), 'https://image.tmdb.org/t/p/w300/current.jpg', 'only the reused row current episode can receive its still');
});

test('profile teardown restores the non-spoiler image and invalidates pending episode callbacks', () => {
  const f = fixture(); f.trakt.progress = { watched: false, episodes: [{ season: 3, episode: 1 }] };
  const image = new Node(); image.setAttribute('src', 'https://image.invalid/base.jpg');
  const item = new Node('torrent-serial'); item.nodes = { '.torrent-serial__img': image }; item.querySelector = selector => item.nodes[selector] || null;
  const params = { movie: { id: 55, source: 'tmdb', media_type: 'tv' }, seasons: { 3: { episodes: [{ season_number: 3, episode_number: 1, still_path: '/watched.jpg' }] } } };
  f.context.onStreamFile({ type: 'render', params, element: { season: 3, episode: 1 }, item });
  assert.equal(image.getAttribute('data-sh-episode-preview'), 'tmdb');
  f.context.clearStreamEpisodePreviews(f.record);
  assert.equal(image.getAttribute('src'), 'https://image.invalid/base.jpg');
  assert.equal(image.getAttribute('data-sh-episode-preview'), null);
  assert.equal(f.record.streamEpisodePreviewNodes.length, 0);
});

test('native replacement image survives watched, unwatched, watched DOM reuse and account change', () => {
  const f = fixture(), image = new Node(); image.setAttribute('src', 'https://image.invalid/native-placeholder-a.jpg');
  const item = new Node('torrent-serial'); item.nodes = { '.torrent-serial__img': image }; item.querySelector = selector => item.nodes[selector] || null;
  const movie = { id: 55, source: 'tmdb', media_type: 'tv' };
  const render = (episode, watched, still) => {
    f.trakt.progress = { watched: false, episodes: watched ? [{ season: 3, episode }] : [] };
    f.context.onStreamFile({ type: 'render', params: { movie, seasons: { 3: { episodes: [{ season_number: 3, episode_number: episode, still_path: still }] } } }, element: { season: 3, episode }, item });
  };
  render(1, true, '/episode-one.jpg');
  assert.equal(image.getAttribute('src'), 'https://image.tmdb.org/t/p/w300/episode-one.jpg');
  image.setAttribute('src', 'https://image.invalid/native-placeholder-b.jpg'); // native row reuse changed its placeholder
  render(2, false, '/episode-two-hidden.jpg');
  assert.equal(image.getAttribute('src'), 'https://image.invalid/native-placeholder-b.jpg');
  render(3, true, '/episode-three.jpg');
  assert.equal(image.getAttribute('src'), 'https://image.tmdb.org/t/p/w300/episode-three.jpg');
  f.trakt.progress = { watched: false, episodes: [] }; // account/profile no longer confirms the preview
  f.context.clearStreamEpisodePreviews(f.record);
  assert.equal(image.getAttribute('src'), 'https://image.invalid/native-placeholder-b.jpg');
});

test('latest native placeholder is retained when it changes while a confirmed still request is pending', () => {
  const f = fixture(); f.trakt.progress = { watched: false, episodes: [{ season: 3, episode: 1 }] };
  const image = new Node(); image.setAttribute('src', 'https://image.invalid/placeholder-a.jpg');
  const item = new Node('torrent-serial'); item.nodes = { '.torrent-serial__img': image }; item.querySelector = selector => item.nodes[selector] || null;
  f.context.onStreamFile({ type: 'render', params: { movie: { id: 55, source: 'tmdb', media_type: 'tv' }, seasons: {} }, element: { season: 3, episode: 1 }, item });
  image.setAttribute('src', 'https://image.invalid/placeholder-b.jpg');
  f.record.seasonCallback({ 3: { episodes: [{ season_number: 3, episode_number: 1, still_path: '/watched.jpg' }] } });
  assert.equal(image.getAttribute('src'), 'https://image.tmdb.org/t/p/w300/watched.jpg');
  f.context.clearStreamEpisodePreviews(f.record);
  assert.equal(image.getAttribute('src'), 'https://image.invalid/placeholder-b.jpg', 'teardown restores the latest native source, not the earlier placeholder');
});

test('parallel watched episode rows still receive their own shared-season stills', () => {
  const f = fixture(); f.trakt.progress = { watched: false, episodes: [{ season: 3, episode: 1 }, { season: 3, episode: 2 }] };
  const makeItem = () => { const image = new Node(); const item = new Node('torrent-serial'); item.nodes = { '.torrent-serial__img': image }; item.querySelector = selector => item.nodes[selector] || null; return { image, item }; };
  const first = makeItem(), second = makeItem(), params = { movie: { id: 55, source: 'tmdb', media_type: 'tv' }, seasons: {} };
  f.context.onStreamFile({ type: 'render', params, element: { season: 3, episode: 1 }, item: first.item });
  f.context.onStreamFile({ type: 'render', params, element: { season: 3, episode: 2 }, item: second.item });
  assert.equal(f.record.seasonRequests, 1);
  f.record.seasonCallback({ 3: { episodes: [{ season_number: 3, episode_number: 1, still_path: '/one.jpg' }, { season_number: 3, episode_number: 2, still_path: '/two.jpg' }] } });
  assert.equal(first.image.getAttribute('src'), 'https://image.tmdb.org/t/p/w300/one.jpg');
  assert.equal(second.image.getAttribute('src'), 'https://image.tmdb.org/t/p/w300/two.jpg');
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
  assert.equal(typeof tolokaButton.jqueryEnter,'function','native remote jQuery enter must be bound');tolokaButton.jqueryEnter({stopImmediatePropagation(){}});
  assert.equal(f.api.selectedTrackerFilter(), 'toloka', 'the embedded control persists through the shared preference helper');
  assert.equal(f.st.displayRows.length, 1);
  assert.equal(f.st.displayRows[0], toloka.row);
  assert.equal(f.focus.current, tolokaButton, 'native Lampa focus returns to the active tracker button');
  f.api.storeTrackerFilter('all');f.context.streamUpdateRows(f.st);
  sourceButton.dispatch('hover:enter');
  const sourceSelect = f.selections.at(-1);
  sourceSelect.onSelect(sourceSelect.items.find(item=>item.key==='source:nyaa'));
  assert.equal(f.api.selectedTrackerFilter(), 'source:nyaa');
  assert.equal(f.st.displayRows.length, 2, 'the global pinned release remains alongside the source-filtered ordinary row');
  assert.equal(f.st.displayRows[0], toloka.row);
  assert.equal(f.st.displayRows[1], other.row);
  assert.equal(f.focus.current, sourceButton, 'focus returns from the native tracker picker to its owner control');
  await new Promise(resolve => setTimeout(resolve, 190));
  f.api.storeTrackerFilter('all');f.context.streamUpdateRows(f.st);
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
  f.st.last = allButton; f.context.streamMove(f.record, 'left');
  assert.equal(f.focus.current, f.nodes['.ctr-tabs'].children.at(-1), 'D-pad left enters the preceding control in the unified toolbar');
  f.st.last = allButton; f.context.streamMove(f.record, 'down');
  assert.equal(f.focus.current, toloka.row, 'D-pad down from the single toolbar enters the first release');
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

test('embedded parser status distinguishes total results from currently loaded rows', () => {
  const f = fixture();
  const status = { textContent: '' }, record = { streamStatus: status };
  const rows = [{}, {}];
  const st = { record, root: { querySelectorAll: () => rows }, rows: [], total: 34, partial: true, loading: false };
  f.context.decorateStreamRows = () => {};
  f.context.syncStreamTools = () => {};
  vm.runInContext([
    extract(hybrid, 'streamStatus'),
    extract(hybrid, 'streamResultStatus'),
    extract(hybrid, 'streamSyncRows')
  ].join('\n'), f.context);

  f.context.streamSyncRows(st);
  assert.equal(status.textContent, 'Частина парсерів недоступна · Знайдено: 34 · завантажено: 2 із 34');
  rows.push({}, {});
  f.context.streamSyncRows(st);
  assert.equal(status.textContent, 'Частина парсерів недоступна · Знайдено: 34 · завантажено: 4 із 34');
  st.loading = true;
  status.textContent = 'Пошук джерел…';
  f.context.streamSyncRows(st);
  assert.equal(status.textContent, 'Пошук джерел…', 'incremental results do not overwrite the active loading status');
  st.loading = false;
  st.error = true;
  assert.equal(f.context.streamResultStatus(st), 'Парсер недоступний · Оновити — повторна спроба');
});

test('quality and tracker filter bands remain independent and ordered for remote navigation',()=>{
 const f=fixture();f.release('The Others (2001) 2160p','Toloka',{AudioLanguages:['uk']});f.release('The Others (2001) 1080p','Mazepa');
 let quality=[];f.st.child.getFilterData=()=>({quality});f.st.child.setFilterData=value=>{quality=value.quality;};f.st.child.applyFilter=()=>{};
 f.context.setupStreamTools(f.st);f.context.syncStreamTrackerTools(f.st);
 const qualityAll=f.nodes['.ctr-tabs'].children.find(node=>node.dataset.quality==='all'),ua=f.nodes['.ctr-tabs'].children.at(-1),all=f.st.trackerButtons.all,mazepa=f.st.trackerButtons.mazepa;
 assert.deepEqual(f.nodes['.ctr-tabs'].children.map(node=>node.dataset.quality),['all','2160','1080','720',undefined]);
 assert.deepEqual(f.nodes['.ctr-tracker-tabs'].children.map(node=>node.dataset.tracker),['all','toloka','mazepa','source']);
 f.nodes['.ctr-tabs'].children.find(node=>node.dataset.quality==='2160').dispatch('hover:enter');
 assert.deepEqual(Array.from(quality),['4k']);
 mazepa.dispatch('hover:enter');assert.equal(f.api.selectedTrackerFilter(),'mazepa');assert.deepEqual(Array.from(quality),['4k'],'tracker action cannot reset the quality filter');
 all.dispatch('hover:enter');assert.equal(f.api.selectedTrackerFilter(),'all');assert.deepEqual(Array.from(quality),['4k'],'All trackers clears only the tracker filter');
 f.st.last=all;f.context.streamMove(f.record,'left');assert.equal(f.focus.current,ua,'left from tracker row returns to the last quality action');
 f.st.last=qualityAll;f.context.streamMove(f.record,'down');assert.equal(f.focus.current,f.st.displayRows[0],'down from quality row enters the release list');
});

test('compact cards lead with the actual release identity, then technical badges and verified audio',()=>{
 const f=fixture(),source=f.release('The.Last.of.Us.S02E01-E03.2025.2160p.WEB-DL.HDR10.DV.HEVC.Ukr.Eng','Toloka',{AudioLanguages:['uk','en'],VoiceoverType:'multi-voice',VoiceoverStudio:'Контрольна студія'});
 f.context.streamUpdateRows(f.st);const row=source.row,raw=source.source.Title;
 assert.equal(row.querySelector('.ctr-name').textContent,'The Last of Us (2025)');
 assert.match(row.querySelector('.tc-priority-row').textContent,/S02E01–E03/);
 assert.match(row.querySelector('.tc-priority-row').textContent,/UA/);
 assert.match(row.querySelector('.tc-priority-row').textContent,/Toloka/);
 assert.match(row.querySelector('.tc-secondary-row').textContent,/4K/);assert.match(row.querySelector('.tc-secondary-row').textContent,/WEB-DL/);assert.match(row.querySelector('.tc-secondary-row').textContent,/HDR10/);assert.match(row.querySelector('.tc-secondary-row').textContent,/HEVC/);
 assert.match(row.querySelector('.tc-audio-label').textContent,/Українська \/ English/);assert.match(row.querySelector('.tc-voice').textContent,/Багатоголосе · Контрольна студія/);
 assert.equal(row.querySelector('.tc-raw-title').textContent,raw,'expanded detail preserves the original torrent title');
});


test('streaming replacement restores the selected source identity without reusing a different row',()=>{
 const f=fixture(),first=f.release('The Others (2001) 1080p','Toloka',{InfoHash:'a'.repeat(40)}),second=f.release('The Others (2001) 720p','Mazepa',{InfoHash:'b'.repeat(40)});
 f.context.streamUpdateRows(f.st);f.st.pendingSelectionKey=f.context.streamRowKey(second.source);
 const replacement=f.release('The Others (2001) 720p','Mazepa',{InfoHash:'b'.repeat(40)});f.st.rows=[first.row,replacement.row];f.context.streamUpdateRows(f.st);
 assert.equal(f.st.last,replacement.row);assert.equal(f.st.pendingSelectionKey,null);
 const malformed='f'.repeat(42);assert.notEqual(f.context.streamRowKey({InfoHash:malformed,Title:'First release'}),f.context.streamRowKey({InfoHash:malformed,Title:'Another release'}),'malformed hashes cannot conflate streamed row identities');
 assert.notEqual(f.context.streamRowKey({Title:'Same title',Tracker:'Toloka',Size:1}),f.context.streamRowKey({Title:'Same title',Tracker:'Mazepa',Size:1}));
});


test('expanded video details retain quality, HDR/Dolby Vision and codec from the existing metadata adapter',()=>{
 const f=fixture(),release=f.release('The Others (2001) 2160p WEB-DL HDR10 Dolby Vision HEVC','Toloka',{AudioLanguages:['uk']});
 f.context.streamUpdateRows(f.st);const details=release.row.querySelector('.tc-technical').textContent;
  assert.match(details,/Відео2160p \/ 4K/);assert.match(details,/HDR10/);assert.match(details,/Dolby Vision/);assert.match(details,/HEVC/);
  assert.match(details,/АудіоУкраїнська/);assert.match(details,/Субтитри/);assert.match(details,/Файли/);
 assert.equal(release.row.querySelector('.tc-open-files'),null);
});
