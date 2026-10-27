'use strict';

// Verify the persistent Hybrid preference and the live Hybrid Settings rail in
// the already-running dedicated Chromium. Never creates or closes a browser,
// tab, context, or profile; never reads Lampa Storage values.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../../..');
const origin = 'https://siaivo.isroot.in/';
const profilePath = process.env.LAMPA_TEST_CHROMIUM_PROFILE;
assert(profilePath, 'Set LAMPA_TEST_CHROMIUM_PROFILE locally to the dedicated test profile path');
const critical = ['ui/stremio-hybrid.js', 'ui/settings-hub.js', 'ui/design-optimized.js', 'ui/interface-plus.js', 'ui/cardify-plus.js'];
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const sourceSha = git(['rev-parse', 'HEAD']);
const blocked = { api_trakt: 0, auth_trakt: 0 };
const assetRoutes = {};
const pageErrors = [];
const cleanupErrors = [];

function chromiumPids() {
    const matches = [];
    for (const entry of fs.readdirSync('/proc')) {
        if (!/^\d+$/.test(entry)) continue;
        try {
            // Some managed browser launchers expose one flattened cmdline arg
            // instead of NUL-separated argv; test presence without exporting it.
            const args = fs.readFileSync('/proc/' + entry + '/cmdline', 'utf8');
            if (args.includes('--user-data-dir=' + profilePath) &&
                args.includes('--remote-debugging-port=9222') && !args.includes('--type=')) matches.push(Number(entry));
        } catch (_) { /* Process exited during the read. */ }
    }
    return matches.sort((a, b) => a - b);
}

async function targets() {
    const response = await fetch('http://127.0.0.1:9222/json/list', { cache: 'no-store' });
    assert.equal(response.status, 200, 'existing CDP target list must be available');
    return response.json();
}

async function assertFocus(page, expected, limit = 36, direction = 'ArrowDown') {
    const visited = [];
    for (let i = 0; i < limit; i++) {
        const current = await page.evaluate(() => document.querySelector('.sh-settings-category.focus')?.textContent.trim() || '');
        if (current === expected) return visited;
        await page.keyboard.press(direction);
        await page.waitForFunction(old => {
            const node = document.querySelector('.sh-settings-category.focus');
            return node && node.textContent.trim() !== old;
        }, current, { timeout: 1500 }).catch(() => {});
        const next = await page.evaluate(() => document.querySelector('.sh-settings-category.focus')?.textContent.trim() || '');
        visited.push(next);
        assert(next && next !== current, 'native D-pad focus must move from ' + current);
    }
    assert.fail('native D-pad did not reach ' + expected + '; visited ' + visited.join(' → '));
}

async function loadAsset(pathname) {
    const response = await fetch('http://127.0.0.1:8766/' + pathname, { cache: 'no-store' });
    assert.equal(response.status, 200, 'preview asset must be current: ' + pathname);
    assert.match(response.headers.get('content-type') || '', /javascript/);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    const bytes = Buffer.from(await response.arrayBuffer());
    const digest = sha256(bytes);
    assert.equal(response.headers.get('x-phase6-sha256'), digest, 'server body hash must match ' + pathname);
    const file = pathname.startsWith('ui/') ? pathname : 'ui/' + pathname;
    const committed = execFileSync('git', ['show', sourceSha + ':' + file], { cwd: root, maxBuffer: 16 * 1024 * 1024 });
    assert.equal(sha256(committed), digest, 'served bytes must match committed ' + file);
    assert.equal(sha256(fs.readFileSync(path.join(root, file))), digest, 'working tree must match committed ' + file);
    return { bytes, digest, sourceCommit: response.headers.get('x-phase6-source-sha') };
}

(async () => {
    let browser, page, routeHandler, pageErrorHandler, originalTargetId, originalPageCount, originalViewport, originalPids, evidenceOutput;
    let testError = null;
    try {
        originalPids = chromiumPids();
        assert.equal(originalPids.length, 1, 'exactly one Chromium process must use the declared dedicated profile and CDP port');
        const beforeTargets = await targets();
        const lampaTargets = beforeTargets.filter(t => t.type === 'page' && t.url && t.url.startsWith(origin));
        assert.equal(lampaTargets.length, 1, 'reuse exactly the existing Lampa tab');
        originalTargetId = lampaTargets[0].id;
        originalPageCount = beforeTargets.filter(t => t.type === 'page').length;
        const healthResponse = await fetch('http://127.0.0.1:8766/health', { cache: 'no-store' });
        assert.equal(healthResponse.status, 200, 'preview server must be running from a clean current checkout');
        const health = await healthResponse.json();
        assert.equal(health.branchSha, sourceSha, 'preview server must serve this exact committed branch');

        const verified = {};
        for (const file of critical) verified[file] = await loadAsset(file);

        browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
        const pages = browser.contexts().flatMap(context => context.pages()).filter(p => p.url().startsWith(origin));
        assert.equal(pages.length, 1, 'must not create another browser page or context');
        page = pages[0];
        originalViewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio }));
        assert.equal(await page.evaluate(() => document.readyState), 'complete');
        pageErrorHandler = error => pageErrors.push(error.name || 'Error');
        page.on('pageerror', pageErrorHandler);

        // Verify browser CORS from the actual HTTPS Lampa document, with no credentials.
        const cors = await page.evaluate(async () => {
            const r = await fetch('http://127.0.0.1:8766/ui/stremio-hybrid.js', { mode: 'cors', credentials: 'omit', cache: 'no-store' });
            const b = await r.arrayBuffer();
            const h = await crypto.subtle.digest('SHA-256', b);
            return { status: r.status, contentType: r.headers.get('content-type'), exposedHash: r.headers.get('x-phase6-sha256'), bodyHash: [...new Uint8Array(h)].map(x => x.toString(16).padStart(2, '0')).join('') };
        });
        assert.equal(cors.status, 200);
        assert.match(cors.contentType || '', /javascript/);
        assert.equal(cors.bodyHash, verified['ui/stremio-hybrid.js'].digest);
        assert.equal(cors.exposedHash, cors.bodyHash);

        routeHandler = async route => {
            const request = route.request();
            const url = new URL(request.url());
            if (url.hostname === 'api.trakt.tv') { blocked.api_trakt++; return route.abort('blockedbyclient'); }
            if (url.hostname === 'auth.trakt.tv') { blocked.auth_trakt++; return route.abort('blockedbyclient'); }
            const remotePath = url.origin === 'https://gorlim590.github.io' && url.pathname.startsWith('/lampa/ui/') ? url.pathname.slice('/lampa/'.length) : null;
            if (remotePath && ['ui/stremio-hybrid.js', 'ui/settings-hub.js'].includes(remotePath)) {
                const item = await loadAsset(remotePath);
                assetRoutes[remotePath] = (assetRoutes[remotePath] || 0) + 1;
                return route.fulfill({ status: 200, body: item.bytes, contentType: 'application/javascript; charset=utf-8', headers: { 'Cache-Control': 'no-store', 'X-Phase3-Source-SHA': sourceSha } });
            }
            return route.continue();
        };
        await page.route('**/*', routeHandler);
        const start = Date.now();
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForFunction(() => document.body.classList.contains('stremio-hybrid') && !!window.StremioHybrid, { timeout: 30000 });
        await page.waitForFunction(() => window.StremioHybrid?.diagnostics()?.settingsMounts >= 1, { timeout: 30000 });
        await page.waitForFunction(() => window.InterfacePlusPresentation?.contractVersion === 1 &&
            window.YDesignLoaded === true && (Lampa.SettingsApi.getParam('cardify') || []).length > 0 &&
            document.querySelectorAll('.ydesign-vertical').length > 0, { timeout: 30000 });
        const startup = await page.evaluate(() => ({
            hybrid: document.body.classList.contains('stremio-hybrid'), version: StremioHybrid.version,
            diagnostics: StremioHybrid.diagnostics(), hub: !!window.LampaSettingsHub,
            hubContract: window.LampaSettingsHub?.contractVersion, viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio }
        }));
        assert.equal(startup.hybrid, true, 'persisted Hybrid preference must activate without Storage overrides');
        assert.equal(startup.diagnostics.initCount, 1);
        assert.equal(startup.diagnostics.styleInsertions, 1);
        assert.equal(startup.diagnostics.settingsMounts, 1);
        assert.equal(startup.hub, true);
        assert.equal(startup.hubContract, 1);
        assert(assetRoutes['ui/stremio-hybrid.js'] >= 1, 'the active Hybrid entrypoint must come from exact branch bytes');
        assert(assetRoutes['ui/settings-hub.js'] >= 1, 'Hybrid must load the Hub from exact branch bytes');

        const home = await page.evaluate(() => ({
            interfaceAdapter: window.InterfacePlusPresentation?.contractVersion || 0,
            headerFallbackStyle: !!document.getElementById('ifx_header_css'),
            ydesignVersion: window.YDesignVersion || '', verticalCards: document.querySelectorAll('.ydesign-vertical').length,
            uaBadges: document.querySelectorAll('.ydesign-badge-ua').length,
            hybridStyles: document.querySelectorAll('#stremio-hybrid-style').length,
            cardifySettings: (Lampa.SettingsApi.getParam('cardify') || []).length,
            legacyCardifyScripts: [...document.scripts].filter(s => /\/ui\/cardify\.js(?:\?|$)/.test(s.src)).length
        }));
        assert.equal(home.headerFallbackStyle, false, 'Interface+ header fallback must yield to Hybrid');
        assert.equal(home.hybridStyles, 1);
        assert.equal(home.verticalCards > 0, true);
        assert.equal(home.interfaceAdapter, 1);
        assert.equal(home.ydesignVersion.length > 0, true);
        assert.equal(home.cardifySettings > 0, true);
        assert.equal(home.legacyCardifyScripts, 0);

        await page.evaluate(() => Lampa.Controller.toggle('settings'));
        await page.waitForFunction(() => document.body.classList.contains('settings--open') && !!document.querySelector('.sh-settings-rail'), { timeout: 10000 });
        await page.waitForFunction(() => document.querySelector('.sh-settings-category.focus'), { timeout: 5000 });
        const rail = await page.evaluate(() => ({
            controller: Lampa.Controller.enabled()?.name,
            labels: [...document.querySelectorAll('.sh-settings-category')].map(n => n.textContent.trim()),
            filteredHidden: [...document.querySelectorAll('.sh-settings-category')].filter(n => getComputedStyle(n).display === 'none' || getComputedStyle(n).visibility === 'hidden').map(n => n.textContent.trim())
        }));
        assert.equal(rail.controller, 'sh_settings_nav');
        assert.equal(rail.labels.includes('OMDB'), true, 'third-party hidden-folder selector must not hide Hybrid routes');
        assert.equal(rail.labels.includes('Вибір рейтингів'), true, 'native folder remains reachable through Hybrid navigation');
        assert.deepEqual(rail.filteredHidden, []);
        const pathToBandera = await assertFocus(page, 'Bandera Online');
        await page.keyboard.press('ArrowDown');
        await page.waitForFunction(() => document.querySelector('.sh-settings-category.focus')?.textContent.trim() === 'OMDB', { timeout: 2000 });
        const afterHidden = await page.evaluate(() => ({ controller: Lampa.Controller.enabled()?.name, focus: document.querySelector('.sh-settings-category.focus')?.textContent.trim() }));
        assert.equal(afterHidden.controller, 'sh_settings_nav');
        assert.equal(afterHidden.focus, 'OMDB', 'D-pad must reach the route that third-party CSS previously hid');
        const pathToHub = await assertFocus(page, 'Центр налаштувань');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => !!document.querySelector('[data-name="hub_search"]'), { timeout: 8000 });
        const hub = await page.evaluate(() => ({
            controller: Lampa.Controller.enabled()?.name,
            settingsOpen: document.body.classList.contains('settings--open'),
            focus: document.querySelector('.settings-param.focus')?.getAttribute('data-name') || '',
            searchVisible: (() => { const n = document.querySelector('[data-name="hub_search"]'); return !!n && !!(n.offsetWidth || n.offsetHeight || n.getClientRects().length); })(),
            owner: LampaSettingsHub?.owns('settings_hub') === true
        }));
        assert.equal(hub.controller, 'settings_component');
        assert.equal(hub.settingsOpen, true);
        assert.equal(hub.searchVisible, true);
        assert.equal(hub.owner, true);
        const screenshot = '/tmp/issue79-phase3-hub-root.png';
        await page.screenshot({ path: screenshot, clip: { x: 0, y: 0, width: Math.min(1920, originalViewport.width), height: Math.min(1080, originalViewport.height) }, timeout: 15000 });

        await page.keyboard.press('Escape');
        await page.waitForFunction(() => document.body.classList.contains('settings--open') && Lampa.Controller.enabled()?.name === 'sh_settings_nav', { timeout: 5000 });
        const back = await page.evaluate(() => ({ controller: Lampa.Controller.enabled()?.name, focus: document.querySelector('.sh-settings-category.focus')?.textContent.trim() || '', settingsOpen: document.body.classList.contains('settings--open'), hubSearchVisible: (() => { const n=document.querySelector('[data-name="hub_search"]'); return !!n && !!(n.offsetWidth || n.offsetHeight || n.getClientRects().length); })() }));
        assert.equal(back.settingsOpen, true, 'Hub Back must leave native Settings open');
        assert(back.focus, 'native Settings must retain a focused category');
        assert.equal(back.hubSearchVisible, false, 'explicit native return must not re-enter the Hub');
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.body.classList.contains('settings--open'), { timeout: 5000 });

        const afterTargets = await targets();
        const afterLampa = afterTargets.filter(t => t.type === 'page' && t.url && t.url.startsWith(origin));
        const viewportAtEnd = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio }));
        assert.equal(afterLampa.length, 1);
        assert.equal(afterLampa[0].id, originalTargetId, 'the same Lampa tab must survive the run');
        assert.equal(afterTargets.filter(t => t.type === 'page').length, originalPageCount, 'browser tab count must not change');
        assert.deepEqual(chromiumPids(), originalPids, 'existing Chromium process must remain alive');

        evidenceOutput = {
            result: 'PASS', branchSha: sourceSha, mode: 'existing dedicated CDP tab; reload + native controller keyboard; Trakt APIs blocked; no Storage overrides',
            browser: browser.version(), startupElapsedMs: Date.now() - start,
            assets: Object.fromEntries(Object.entries(verified).map(([name, item]) => [name, item.digest])),
            browserCors: cors, routedExactBranchAssets: assetRoutes, blocked,
            startup, home, navigation: { railCount: rail.labels.length, cssConflictingFoldersAccessible: ['OMDB', 'Вибір рейтингів'], pathToBandera, afterHidden, pathToHub, hub, back },
            pageErrors, screenshot, viewport: { beforeReload: originalViewport, afterReload: startup.viewport, atEnd: viewportAtEnd, overriddenByRunner: false },
            survival: { pidCount: originalPids.length, sameProcess: true, sameLampaTarget: true, pageCountUnchanged: true },
            cleanup: { storageFunctionsPatched: false, temporaryGlobalsAdded: false, browserCloseCalled: false }
        };
    } catch (error) {
        testError = error;
    } finally {
        if (page && routeHandler) {
            try { await page.unroute('**/*', routeHandler); } catch (error) { cleanupErrors.push('route: ' + error.name); }
        }
        if (page && pageErrorHandler) {
            try { page.off('pageerror', pageErrorHandler); } catch (error) { cleanupErrors.push('pageerror-listener: ' + error.name); }
        }
    }
    if (evidenceOutput) {
        evidenceOutput.cleanup.pageRouteRemoved = cleanupErrors.every(error => !error.startsWith('route:'));
        evidenceOutput.cleanup.pageErrorListenerRemoved = cleanupErrors.every(error => !error.startsWith('pageerror-listener:'));
        evidenceOutput.cleanup.errors = cleanupErrors;
        console.log(JSON.stringify(evidenceOutput));
    }
    if (cleanupErrors.length) console.error(JSON.stringify({ cleanupErrors }));
    if (testError) {
        console.error(testError.name + ': ' + testError.message);
        process.exitCode = 1;
    }
    if (cleanupErrors.length) process.exitCode = 1;
    // Do not call browser.close(): process exit only detaches this CDP client.
    process.exit(process.exitCode || 0);
})().catch(error => { console.error(error.name + ': ' + error.message); process.exit(1); });
