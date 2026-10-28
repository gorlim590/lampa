'use strict';

// Bounded acceptance runner for the already-running dedicated Lampa test tab.
// It never launches/closes a browser, creates a page/context, changes viewport,
// enumerates/exports Storage, or sends real Trakt/torrent requests. Web Storage
// writes are shadowed in memory; Trakt/auth endpoints are blocked.
// Manual opt-in: set LAMPA_TEST_CHROMIUM_PROFILE and optionally LAMPA_TEST_CDP,
// then run only while that dedicated Chromium and its Lampa tab already exist.
// The runner reloads that tab once, shadows Storage in memory, and restores the
// original URL before removing routes. Evidence contains no machine path/account data.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const cdp = process.env.LAMPA_TEST_CDP || 'http://127.0.0.1:9222';
const profile = process.env.LAMPA_TEST_CHROMIUM_PROFILE;
const localOrigin = 'http://127.0.0.1:8766';
const evidenceDir = path.join(root, 'audit/settings/phase6-browser');
const evidenceFile = path.join(evidenceDir, 'issue79-browser-acceptance.json');
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const manifestPath = path.join(evidenceDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const tracked = new Set(execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).trim().split('\n'));
const alias = {
    'preview-loader.js': 'audit/settings/phase6-browser/preview-loader.js',
    'manifest.json': 'audit/settings/phase6-browser/manifest.json',
    'stremio-hybrid.js': 'ui/stremio-hybrid.js',
    'settings-hub.js': 'ui/settings-hub.js',
    'torrent-overlay.js': 'ui/torrent-overlay.js'
};
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function exactAsset(relative) {
    if (!relative || !tracked.has(relative)) return null;
    const committed = execFileSync('git', ['show', sourceSha + ':' + relative], { cwd: root, maxBuffer: 16 * 1024 * 1024 });
    const working = fs.readFileSync(path.join(root, relative));
    if (!committed.equals(working)) throw new Error('Refusing dirty test asset: ' + relative);
    const type = relative.endsWith('.json') ? 'application/json; charset=utf-8' : relative.endsWith('.css') ? 'text/css; charset=utf-8' : 'application/javascript; charset=utf-8';
    return { body: committed, hash: sha256(committed), type };
}
function relativeFor(url) {
    if (url.origin === localOrigin) {
        const file = decodeURIComponent(url.pathname).replace(/^\//, '');
        return alias[file] || file;
    }
    if (url.hostname === 'gorlim590.github.io' && url.pathname.startsWith('/lampa/')) return decodeURIComponent(url.pathname.slice('/lampa/'.length));
    return null;
}
function makeStorageShim() {
    return `(()=>{if(!window.Storage||window.__issue79Storage)return;const p=Storage.prototype,o={get:p.getItem,set:p.setItem,remove:p.removeItem,clear:p.clear};const maps=new WeakMap(),cleared=new WeakSet();function m(s){let x=maps.get(s);if(!x){x=new Map();maps.set(s,x)}return x}p.getItem=function(k){k=String(k);if(cleared.has(this))return m(this).has(k)?m(this).get(k):null;if(m(this).has(k))return m(this).get(k);return o.get.call(this,k)};p.setItem=function(k,v){m(this).set(String(k),String(v));cleared.delete(this)};p.removeItem=function(k){m(this).set(String(k),null)};p.clear=function(){cleared.add(this);m(this).clear()};window.__issue79Storage={restore(){p.getItem=o.get;p.setItem=o.set;p.removeItem=o.remove;p.clear=o.clear;delete window.__issue79Storage}}})();`;
}
function profilePids() {
    if (!profile) throw new Error('Set LAMPA_TEST_CHROMIUM_PROFILE to the existing dedicated profile path');
    const matches = [];
    for (const entry of fs.readdirSync('/proc')) {
        if (!/^\d+$/.test(entry)) continue;
        try {
            const args = fs.readFileSync('/proc/' + entry + '/cmdline', 'utf8');
            if (args.includes('--user-data-dir=' + profile) && args.includes('--remote-debugging-port=9222') && !args.includes('--type=')) matches.push(Number(entry));
        } catch (_) { /* Process exited during the snapshot. */ }
    }
    return matches.sort((a, b) => a - b);
}
async function targets() {
    const response = await fetch('http://127.0.0.1:9222/json/list', { cache: 'no-store' });
    assert.equal(response.status, 200);
    return response.json();
}

(async () => {
    let browser, page, session, preloadId, route, pageError, consoleError, responseHandler, requestFailedHandler, originalUrl;
    let restored = false;
    const pidsBefore = profilePids();
    assert.equal(pidsBefore.length, 1, 'must attach to exactly one process using the declared dedicated profile');
    const beforeTargets = await targets();
    const tabsBefore = beforeTargets.filter(target => target.type === 'page' && target.url && target.url.startsWith('https://siaivo.isroot.in/'));
    assert.equal(tabsBefore.length, 1, 'must reuse the one existing Lampa tab');

    const report = {
        commit: sourceSha,
        mode: 'existing-CDP-tab; synthetic media/metadata; Trakt and torrent providers blocked/mocked',
        viewport: null,
        assets: {},
        modulesLoaded: null,
        checks: [],
        metrics: {},
        screenshots: { capture: 'element crops from the existing viewport; no viewport change; synthetic content only', files: ['issue79-home-fixture.png', 'issue79-home-enriched.png', 'issue79-details-movie.png', 'issue79-torrent-popup.png'] },
        exceptions: [],
        consoleDiagnostics: { scope: 'whole page reload including host/plugin background; category counts are not attributed to PR #106', mixedContentBlocked: 0, certificateErrors: 0, http404: 0, accountRequestFailures: 0, otherConsoleErrors: 0 },
        changedAssetFailures: [],
        limits: ['No baseline comparison in this run', 'Synthetic metadata/parser responses', 'Physical Google TV not tested']
    };
    const check = (name, passed, details) => {
        report.checks.push({ name, status: passed ? 'PASS' : 'FAIL', ...(details === undefined ? {} : { details }) });
        assert.ok(passed, name);
    };
    const safeError = error => String(error && error.message || error).replace(/https?:\/\/\S+/g, '[URL]').slice(0, 300);

    try {
        browser = await chromium.connectOverCDP(cdp);
        const pages = browser.contexts().flatMap(context => context.pages()).filter(candidate => candidate.url().startsWith('https://siaivo.isroot.in/'));
        assert.equal(pages.length, 1, 'no new page or context may be used');
        page = pages[0];
        originalUrl = page.url(); // Kept only in memory and never written to evidence.
        report.viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio }));
        pageError = error => report.exceptions.push(safeError(error));
        consoleError = message => {
            if (message.type() !== 'error') return;
            const text = message.text();
            const diagnostics = report.consoleDiagnostics;
            if (text.startsWith('Mixed Content:')) diagnostics.mixedContentBlocked++;
            else if (text.includes('ERR_CERT_')) diagnostics.certificateErrors++;
            else if (/status of 404/.test(text)) diagnostics.http404++;
            else if (/\[Account\].*(bookmarks|cache)/i.test(text)) diagnostics.accountRequestFailures++;
            else diagnostics.otherConsoleErrors++;
        };
        page.on('pageerror', pageError);
        page.on('console', consoleError);
        const critical = new Set(['ui/design-optimized.js', 'ui/stremio-hybrid.js', 'ui/interface-plus.js', 'ui/cardify-plus.js', 'ui/settings-hub.js', 'ui/torrent-overlay.js']);
        responseHandler = response => {
            const url = new URL(response.url());
            const relative = relativeFor(url);
            if (relative && critical.has(relative)) {
                response.body().then(body => {
                    report.assets[relative] = { sha256: sha256(body), status: response.status(), sourceCommit: response.headers()['x-issue79-commit'] || '' };
                }).catch(() => {});
            }
        };
        page.on('response', responseHandler);
        requestFailedHandler = request => {
            const relative = relativeFor(new URL(request.url()));
            if (relative && critical.has(relative)) report.changedAssetFailures.push(relative);
        };
        page.on('requestfailed', requestFailedHandler);
        session = await page.context().newCDPSession(page);
        await session.send('Page.enable');
        const preload = await session.send('Page.addScriptToEvaluateOnNewDocument', { source: makeStorageShim() });
        preloadId = preload.identifier;

        route = async intercepted => {
            const request = intercepted.request();
            const url = new URL(request.url());
            if (request.method() === 'OPTIONS') return intercepted.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
            if (!['GET', 'HEAD'].includes(request.method())) return intercepted.continue();
            if (url.hostname === 'api.trakt.tv' || url.hostname === 'auth.trakt.tv') return intercepted.abort('blockedbyclient');
            if (url.hostname === 'api.themoviedb.org') {
                const match = url.pathname.match(/^\/3\/(movie|tv)\/(\d+)$/);
                const id = match ? Number(match[2]) : 0;
                const fixture = windowFixtureIds.has(id);
                if (!fixture) return intercepted.abort('blockedbyclient');
                report.metrics.tmdbFixtureRequests = (report.metrics.tmdbFixtureRequests || 0) + 1;
                await new Promise(resolve => setTimeout(resolve, 700));
                if (id === windowFixtureFailureId) return intercepted.fulfill({ status: 503, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{}' });
                const tv = match[1] === 'tv';
                return intercepted.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({
                    id, title: 'QA enriched movie', name: 'QA enriched series', tagline: 'Synthetic metadata', overview: 'Synthetic overview',
                    genres: [{ id: 18, name: 'Drama' }], vote_average: 8, vote_count: 100, release_date: '2024-01-01', first_air_date: '2024-01-01',
                    status: 'Ended', number_of_seasons: 1, number_of_episodes: 2, seasons: [{ season_number: 1, episode_count: 2 }],
                    last_episode_to_air: { season_number: 1, episode_number: 2, air_date: '2024-01-02' }, next_episode_to_air: null,
                    images: { posters: [{ file_path: '/issue79-enriched-' + id + '.svg', iso_639_1: 'uk' }], backdrops: [], logos: [{ file_path: '/issue79-logo.svg', iso_639_1: 'uk' }] },
                    release_dates: { results: [{ iso_3166_1: 'US', release_dates: [{ certification: 'PG-13' }] }] },
                    content_ratings: { results: [{ iso_3166_1: 'US', rating: 'TV-14' }] }, results: [], _fixtureType: tv ? 'tv' : 'movie'
                }) });
            }
            if (url.hostname === 'image.tmdb.org') {
                const label = url.pathname.includes('enriched') ? 'ENRICHED' : 'SOURCE';
                return intercepted.fulfill({ status: 200, contentType: 'image/svg+xml', headers: { 'Access-Control-Allow-Origin': '*' }, body: `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="480"><rect width="320" height="480" fill="#293b56"/><text x="20" y="60" fill="white" font-size="28">${label}</text></svg>` });
            }
            const relative = relativeFor(url);
            const asset = exactAsset(relative);
            if (asset) {
                report.assets[relative] = { sha256: asset.hash, sourceCommit: sourceSha };
                return intercepted.fulfill({ status: 200, body: request.method() === 'HEAD' ? '' : asset.body, contentType: asset.type, headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store', 'X-Issue79-Commit': sourceSha, 'X-Issue79-SHA256': asset.hash } });
            }
            if (url.origin === localOrigin) return intercepted.abort('blockedbyclient');
            return intercepted.continue();
        };
        await page.route('**/*', route);
        const ids = [990010101, 990010102, 990010103, 990010104];
        const windowFixtureIds = new Set(ids);
        const windowFixtureFailureId = ids[3];
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForFunction(() => window.appready && window.StremioHybrid && window.YDesignLoaded && window.Lampa?.Activity?.active()?.component === 'main' && window.LampaPhase6ModuleReport?.finished, null, { timeout: 60000 });
        await page.waitForFunction(() => window.LampaPhase6ModuleReport.modules.length === 13 && window.LampaPhase6ModuleReport.modules.every(module => module.loaded), null, { timeout: 30000 });
        report.modulesLoaded = 13;
        const sourceDigests = Object.fromEntries([...critical].map(file => [file, report.assets[file]?.sha256 || null]));
        check('Exact PR Hybrid, YDesign, Interface+, Cardify+, Hub and Torrent modules loaded', [...critical].every(file => !!sourceDigests[file]), sourceDigests);
        check('Changed visual assets returned successfully without failed requests', [...critical].every(file => report.assets[file]?.status === 200) && report.changedAssetFailures.length === 0, { statuses: Object.fromEntries([...critical].map(file => [file, report.assets[file]?.status || null])), failures: report.changedAssetFailures.length });
        const active = await page.evaluate(() => ({ hybrid: document.body.classList.contains('stremio-hybrid'), ydesign: !!window.YDesignLoaded, styles: document.querySelectorAll('#ydesign-style-block').length, activity: Lampa.Activity.active()?.component, controller: Lampa.Controller.enabled()?.name }));
        check('Hybrid and YDesign are active with one YDesign stylesheet', active.hybrid && active.ydesign && active.styles === 1 && active.activity === 'main', active);

        await page.evaluate(ids => {
            const L = window.Lampa;
            const qa = window.__issue79Qa = { ids, writes: Object.create(null), parserCalls: 0, apiFullCalls: 0, started: 0, cards: [], original: {} };
            qa.original.storageGet = L.Storage.get; qa.original.storageSet = L.Storage.set; qa.original.storageField = L.Storage.field;
            L.Storage.get = function (key, fallback) {
                if (key === 'trakt_token') return 'synthetic-browser-token';
                if (key === 'trakt_refresh_token') return null;
                if (Object.prototype.hasOwnProperty.call(qa.writes, key)) return qa.writes[key];
                return qa.original.storageGet.call(this, key, fallback);
            };
            L.Storage.set = function (key, value) { qa.writes[key] = value; };
            L.Storage.field = function (key) { if (key === 'parser_use' || key === 'trakt_plus_enable') return true; return qa.original.storageField.call(this, key); };
            qa.original.torrentsUse = window.lampa_settings && window.lampa_settings.torrents_use;
            window.lampa_settings = window.lampa_settings || {}; window.lampa_settings.torrents_use = true;
            qa.original.apiFull = L.Api.full;
            L.Api.full = function (params, done, fail) {
                const card = params.card || params.movie || params;
                const id = Number(params.id || card.id);
                if (!qa.ids.includes(id)) return qa.original.apiFull.apply(this, arguments);
                qa.apiFullCalls++;
                const movie = Object.assign({}, card, { id, overview: 'Synthetic details overview', genres: [{ id: 18, name: 'Drama' }], vote_average: 8, vote_count: 100, runtime: 100, poster_path: '/issue79-source-' + id + '.svg', backdrop_path: '/issue79-source-' + id + '.svg', images: { logos: [] }, external_ids: { imdb_id: 'tt1234567' }, production_companies: [], keywords: { keywords: [] } });
                setTimeout(() => done({ movie, persons: { cast: [], crew: [] }, collection: null, recomend: { results: [] }, simular: { results: [] }, videos: { results: [] }, discuss: { result: [] } }), 15);
            };
            qa.original.parserGet = L.Parser.get;
            L.Parser.get = function (params, done) { qa.parserCalls++; setTimeout(() => done({ Results: [], total: 0 }), 20); };
            qa.original.favorite = { check: L.Favorite.check, add: L.Favorite.add, remove: L.Favorite.remove, get: L.Favorite.get };
            L.Favorite.check = () => ({}); L.Favorite.add = () => {}; L.Favorite.remove = () => {}; L.Favorite.get = () => [];
            const cards = ids.map((id, index) => {
                const type = index === 1 || index === 3 ? 'tv' : 'movie';
                const card = { id, ids: { tmdb: id, trakt: 880000 + index }, source: 'tmdb', type, method: type, media_type: type, card_type: type, title: type === 'movie' ? 'QA Movie ' + index : undefined, original_title: type === 'movie' ? 'QA Movie ' + index : undefined, name: type === 'tv' ? 'QA Series ' + index : undefined, original_name: type === 'tv' ? 'QA Series ' + index : undefined, release_date: type === 'movie' ? '2024-01-01' : undefined, first_air_date: type === 'tv' ? '2024-01-01' : undefined, number_of_seasons: type === 'tv' ? 1 : undefined, number_of_episodes: type === 'tv' ? 2 : undefined, poster_path: '/issue79-source-' + id + '.svg', backdrop_path: '/issue79-source-' + id + '.svg', genre_ids: [18], vote_average: 8, vote_count: 100 };
                card.params = { emit: { onEnter: () => L.Router.call('full', card) } };
                return card;
            });
            qa.cards = cards;
            L.Component.add('main', function (options) { const component = L.Maker.make('Main', options); component.use({ onCreate() { qa.started = performance.now(); component.build([{ title: 'Browser acceptance fixtures', results: cards }]); } }); return component; });
            L.Activity.push({ component: 'main', source: 'tmdb', title: 'Browser acceptance fixtures', page: 1 });
        }, ids);
        await page.waitForFunction(() => document.querySelectorAll('.activity--active .ydesign-card.ydesign-ready').length === 4, null, { timeout: 25000 });
        report.metrics.homeDataToFirstPosterMs = await page.evaluate(() => performance.now() - window.__issue79Qa.started);
        const firstFocus = await page.evaluate(() => {
            const qa = window.__issue79Qa;
            const card = document.querySelector('.activity--active .ydesign-card.ydesign-ready');
            const row = card?.closest('.items-line');
            if (!card || !row) return { ready: false };
            Lampa.Controller.collectionSet($(row));
            Lampa.Controller.collectionFocus($(card), $(row));
            return { ready: card.classList.contains('focus') || !!document.querySelector('.activity--active .focus'), elapsed: performance.now() - qa.started };
        });
        report.metrics.homeDataToFirstUsableFocusMs = firstFocus.elapsed;
        check('First native Home card becomes focusable after data arrives', firstFocus.ready && Number.isFinite(firstFocus.elapsed), firstFocus);
        const pending = await page.evaluate(() => [...document.querySelectorAll('.activity--active .ydesign-card')].map(card => ({ ready: card.classList.contains('ydesign-ready'), title: !!card.querySelector('.ydesign-initial-title')?.textContent.trim(), sourcePoster: (card._ydesign_bg_applied || '').includes('issue79-source-'), enriched: !!card._ydesign_extData })));
        check('All synthetic Home cards show title and source poster before delayed TMDb detail responses', pending.length === 4 && pending.every(card => card.ready && card.title && card.sourcePoster && !card.enriched), pending);
        await page.locator('.activity--active .ydesign-card.ydesign-ready').first().screenshot({ path: path.join(evidenceDir, 'issue79-home-fixture.png'), timeout: 8000 });
        await page.waitForFunction(() => { const cards = [...document.querySelectorAll('.activity--active .ydesign-card')]; return cards.filter(card => card._ydesign_extData && !card._ydesign_extFailed).length >= 3 && cards.some(card => card._ydesign_extFailed); }, null, { timeout: 12000 });
        const enriched = await page.evaluate(() => [...document.querySelectorAll('.activity--active .ydesign-card')].map(card => ({ success: !!card._ydesign_extData && !card._ydesign_extFailed, failed: !!card._ydesign_extFailed, fallbackTitle: !!card.querySelector('.ydesign-text-title')?.textContent.trim(), poster: card._ydesign_bg_applied || '', imageLoaded: !!card.querySelector('.ydesign-img-layer.loaded') })));
        const goodEnrichment = enriched.filter(card => card.success);
        const failedFallback = enriched.find(card => card.failed);
        check('Delayed metadata enriches the matching poster and 503 keeps source poster/title', goodEnrichment.length >= 3 && goodEnrichment.every(card => card.poster.includes('issue79-enriched-') && card.imageLoaded) && !!failedFallback?.fallbackTitle && failedFallback.poster.includes('issue79-source-') && failedFallback.imageLoaded, { successes: goodEnrichment.length, failedFallback: !!failedFallback });
        await page.locator('.activity--active .ydesign-card.ydesign-ready').first().screenshot({ path: path.join(evidenceDir, 'issue79-home-enriched.png'), timeout: 8000 });

        // Exercise Trakt+'s real watched pipeline with a synthetic API boundary
        // whose TMDB identity exactly matches the synthetic Home card.
        await page.evaluate(() => {
            const qa = window.__issue79Qa;
            qa.watched = false; qa.account = 'synthetic-account-a'; qa.phase = 'ready';
            const get = async endpoint => {
                if (endpoint === '/users/me') return { ids: { uuid: qa.account } };
                if (endpoint === '/sync/last_activities') return { all: '2026-01-01T00:00:00.000Z', movies: { watched_at: '2026-01-01T00:00:00.000Z' }, episodes: { watched_at: '2026-01-01T00:00:00.000Z' } };
                if (endpoint.indexOf('/sync/watched/movies') === 0) return qa.watched ? [{ id: 1, movie: { ids: { tmdb: qa.ids[0], trakt: 880000 }, title: 'QA Movie 0', year: 2024 } }] : [];
                if (endpoint.indexOf('/sync/watched/shows') === 0) return [];
                return [];
            };
            if (!window.TraktTV || !TraktTV.api) throw new Error('Trakt API adapter unavailable');
            TraktTV.api.get = get;
        });
        await page.evaluate(() => TraktPlus.syncWatched());
        await page.waitForFunction(() => { const card = [...document.querySelectorAll('.activity--active .ydesign-card')].find(node => node._ydesign_id === String(window.__issue79Qa.ids[0])); return card?.dataset.ydesignWatched === 'unwatched'; }, null, { timeout: 5000 });
        await page.evaluate(() => { window.__issue79Qa.watched = true; });
        await page.evaluate(() => TraktPlus.syncWatched());
        await page.waitForFunction(() => { const card = [...document.querySelectorAll('.activity--active .ydesign-card')].find(node => node._ydesign_id === String(window.__issue79Qa.ids[0])); return card?.dataset.ydesignWatched === 'watched'; }, null, { timeout: 5000 });
        check('Trakt watched-state logic accepts the matching synthetic TMDB identity and updates its UI', await page.evaluate(() => { const card = [...document.querySelectorAll('.activity--active .ydesign-card')].find(node => node._ydesign_id === String(window.__issue79Qa.ids[0])); return !!card?.querySelector('.ydesign-watched-check') && !!card?.querySelector('.ydesign-watched-dim'); }));

        const homeCount = await page.locator('.activity--active .ydesign-card').count();
        const styleCount = await page.locator('#ydesign-style-block').count();
        const nativeController = await page.evaluate(() => Lampa.Controller.enabled()?.name || '');
        check('Fixture Home uses native Lampa item controller', nativeController === 'items_line', nativeController);
        await page.evaluate(() => {
            const qa = window.__issue79Qa, cards = [...document.querySelectorAll('.activity--active .ydesign-card')];
            qa.nodes = cards; qa.row = cards[0]?.closest('.items-line');
            qa.scroll = { left: qa.row?.scrollLeft || 0, top: qa.row?.closest('.scroll__body')?.scrollTop || 0 };
            qa.poster = cards[0]?._ydesign_bg_applied || '';
            Lampa.Controller.collectionSet($(qa.row)); Lampa.Controller.collectionFocus($(cards[0]), $(qa.row));
        });
        await page.keyboard.press('ArrowRight');
        const moved = await page.evaluate(() => document.querySelector('.activity--active .focus') !== window.__issue79Qa.nodes[0]);
        check('D-pad Right moves native focus to another card', moved);

        async function openCard(index, kind) {
            await page.evaluate(i => { const qa = window.__issue79Qa, card = qa.nodes[i], row = card.closest('.items-line'); qa.target = card; qa.targetRow = row; qa.before = { left: row.scrollLeft, top: row.closest('.scroll__body')?.scrollTop || 0, poster: card._ydesign_bg_applied || '' }; Lampa.Controller.collectionSet($(row)); Lampa.Controller.collectionFocus($(card), $(row)); }, index);
            const t0 = Date.now();
            await page.keyboard.press('Enter');
            await page.waitForFunction(() => Lampa.Activity.active()?.component === 'full' && document.querySelector('.activity--active .full-start-new'), null, { timeout: 12000 });
            const state = await page.evaluate(() => ({ controller: Lampa.Controller.enabled()?.name || '', torrentAction: !!document.querySelector('.activity--active .view--torrent.selector'), details: !!document.querySelector('.activity--active .full-start-new'), kind: Lampa.Activity.active()?.method || '' }));
            check(kind + ' opens native Full through the focused card', state.details && state.controller, state);
            return { elapsed: Date.now() - t0, state };
        }
        async function backToHome(label) {
            const startedAt = Date.now();
            await page.keyboard.press('Escape');
            await page.waitForFunction(() => Lampa.Activity.active()?.component === 'main', null, { timeout: 8000 });
            const restored = await page.evaluate(() => { const qa = window.__issue79Qa, focus = document.querySelector('.activity--active .focus'); return { sameNode: qa.target?.isConnected && qa.target === focus, count: document.querySelectorAll('.activity--active .ydesign-card').length, left: qa.targetRow?.scrollLeft || 0, top: qa.targetRow?.closest('.scroll__body')?.scrollTop || 0, poster: qa.target?._ydesign_bg_applied || '' }; });
            check(label + ' Back restores the same card, poster and row scroll without duplicates', restored.sameNode && restored.count === homeCount && restored.left === await page.evaluate(() => window.__issue79Qa.before.left) && restored.top === await page.evaluate(() => window.__issue79Qa.before.top) && restored.poster === await page.evaluate(() => window.__issue79Qa.before.poster), restored);
            return Date.now() - startedAt;
        }

        const navigationDurations = [];
        for (const run of [1, 2]) {
            const opened = await openCard(0, 'Movie Details run ' + run);
            await page.locator('.activity--active .full-start-new__title').screenshot({ path: path.join(evidenceDir, 'issue79-details-movie.png'), timeout: 8000 });
            const backMs = await backToHome('Movie Details run ' + run);
            navigationDurations.push({ homeToDetailsMs: opened.elapsed, detailsToHomeMs: backMs });
        }
        for (const run of [1, 2]) {
            const opened = await openCard(1, 'TV Details run ' + run);
            const backMs = await backToHome('TV Details run ' + run);
            navigationDurations.push({ homeToDetailsMs: opened.elapsed, detailsToHomeMs: backMs });
        }
        report.metrics.navigation = navigationDurations;

        await openCard(0, 'Movie Details for Torrent Popup');
        const actionReady = await page.evaluate(() => {
            const action = document.querySelector('.activity--active .view--torrent.selector');
            if (!action) return false;
            const root = action.closest('.full-start-new__buttons') || action.parentElement;
            Lampa.Controller.collectionSet($(root)); Lampa.Controller.collectionFocus($(action), $(root)); return true;
        });
        check('Native Details exposes the Torrent action', actionReady);
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => { const node = document.querySelector('.sh-torrent-overlay'); return node && !node.hidden; }, null, { timeout: 10000 });
        const popup = await page.evaluate(() => ({ count: document.querySelectorAll('.sh-torrent-overlay:not([hidden])').length, controller: Lampa.Controller.enabled()?.name || '', parserCalls: window.__issue79Qa.parserCalls }));
        check('Torrent button opens one real Hybrid Torrent Popup without live parser calls', popup.count === 1 && popup.parserCalls > 0, popup);
        await page.locator('.sh-torrent-overlay:not([hidden]) .sh-stream-head').screenshot({ path: path.join(evidenceDir, 'issue79-torrent-popup.png'), timeout: 8000 });
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => { const node = document.querySelector('.sh-torrent-overlay'); return Lampa.Activity.active()?.component === 'full' && (!node || node.hidden); }, null, { timeout: 8000 });
        check('Popup Back returns to native Full Details', await page.evaluate(() => Lampa.Activity.active()?.component === 'full'));
        const popupBackMs = await backToHome('Torrent Popup');
        report.metrics.navigation.push({ torrentPopupBackMs: popupBackMs });
        report.metrics.afterNavigation = { cards: await page.locator('.activity--active .ydesign-card').count(), ydesignStyles: await page.locator('#ydesign-style-block').count(), hybrid: await page.evaluate(() => document.body.classList.contains('stremio-hybrid')), controller: await page.evaluate(() => Lampa.Controller.enabled()?.name || '') };
        check('Repeated routes leave one YDesign style and the original Home card count', report.metrics.afterNavigation.cards === homeCount && report.metrics.afterNavigation.ydesignStyles === styleCount && report.metrics.afterNavigation.hybrid, report.metrics.afterNavigation);
        check('No uncaught JavaScript exceptions during exercised navigation', report.exceptions.length === 0, { count: report.exceptions.length });

        await page.goto(originalUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForFunction(() => window.appready && window.StremioHybrid && window.YDesignLoaded && Lampa.Activity.active()?.component === 'main' && window.LampaPhase6ModuleReport?.finished === true && LampaPhase6ModuleReport.modules.length === 13 && LampaPhase6ModuleReport.modules.every(module => module.loaded), null, { timeout: 60000 });
        await page.unroute('**/*', route); route = null;
        await session.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: preloadId }); preloadId = null;
        await page.evaluate(() => window.__issue79Storage?.restore());
        restored = true;
        const afterTargets = await targets();
        const tabsAfter = afterTargets.filter(target => target.type === 'page' && target.url && target.url.startsWith('https://siaivo.isroot.in/'));
        check('Original single Lampa tab and dedicated Chromium process survive cleanup', tabsAfter.length === 1 && profilePids().join(',') === pidsBefore.join(','), { lampaTabs: tabsAfter.length, processSurvived: profilePids().join(',') === pidsBefore.join(',') });
    } catch (error) {
        report.exceptions.push(safeError(error));
    } finally {
        // Even an assertion failure must leave the existing tab on its original
        // Lampa URL with real persisted Storage untouched. Keep the safe asset
        // and storage routes installed until the original application is ready.
        if (page && route && originalUrl && !restored) {
            try {
                await page.goto(originalUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
                await page.waitForFunction(() => window.appready && window.StremioHybrid && window.YDesignLoaded && Lampa.Activity.active()?.component === 'main' && window.LampaPhase6ModuleReport?.finished === true && LampaPhase6ModuleReport.modules.length === 13 && LampaPhase6ModuleReport.modules.every(module => module.loaded), null, { timeout: 60000 });
                restored = true;
            } catch (error) {
                report.exceptions.push('original tab restoration: ' + safeError(error));
            }
        }
        if (page && route) await page.unroute('**/*', route).catch(error => report.exceptions.push('route cleanup: ' + safeError(error)));
        if (session && preloadId) await session.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: preloadId }).catch(error => report.exceptions.push('preload cleanup: ' + safeError(error)));
        if (page && restored) await page.evaluate(() => window.__issue79Storage?.restore()).catch(error => report.exceptions.push('Storage shim cleanup: ' + safeError(error)));
        if (page && pageError) page.off('pageerror', pageError);
        if (page && consoleError) page.off('console', consoleError);
        if (page && responseHandler) page.off('response', responseHandler);
        if (page && requestFailedHandler) page.off('requestfailed', requestFailedHandler);
        if (session) await session.detach().catch(error => report.exceptions.push('CDP detach: ' + safeError(error)));
        fs.writeFileSync(evidenceFile, JSON.stringify(report, null, 2) + '\n');
    }
    // Do not call browser.close(): Playwright is only attached to the existing Chromium.
    console.log(JSON.stringify({ commit: report.commit, checks: report.checks.map(item => ({ name: item.name, status: item.status })), metrics: report.metrics, exceptions: report.exceptions, evidence: path.relative(root, evidenceFile) }));
    process.exit(report.exceptions.length || report.checks.some(item => item.status === 'FAIL') ? 1 : 0);
})().catch(error => { console.error(String(error && error.message || error)); process.exit(1); });
