'use strict';

// Runs in the existing dedicated Chromium tab. Never creates/closes a browser,
// page, context, profile, or Lampa Storage; all exact-source routing is temporary.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../../..');
const origin = 'https://siaivo.isroot.in/';
const profile = process.env.LAMPA_TEST_CHROMIUM_PROFILE || '/home/gostrimchik/lampa-testing/chromium-profile';
const version = '20261027-ui-first-1';
const assets = [
    'loader.js', 'ui/stremio-hybrid.js', 'ui/settings-hub.js', 'ui/torrent-overlay.js',
    'ui/interface-plus.js', 'ui/design-optimized.js', 'ui/cardify-plus.js'
];
const bytes = Object.fromEntries(assets.map(name => [name, fs.readFileSync(path.join(root, name))]));
const hashes = Object.fromEntries(assets.map(name => [name, crypto.createHash('sha256').update(bytes[name]).digest('hex')]));
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const pageCount = async () => (await (await fetch('http://127.0.0.1:9222/json/list')).json()).filter(t => t.type === 'page').length;
const profilePids = () => fs.readdirSync('/proc').filter(n => /^\d+$/.test(n)).filter(n => {
    try { const c = fs.readFileSync('/proc/' + n + '/cmdline', 'utf8'); return c.includes('--user-data-dir=' + profile) && c.includes('--remote-debugging-port=9222') && !c.includes('--type='); }
    catch (_) { return false; }
});

function safeBrowserMarksSource() {
    return `(() => {
      const m = window.__lampaPhase4Marks = { firstPaint: null, fcp: null, hybridShell: null, homeCards: null, pageErrors: [] };
      window.addEventListener('error', e => { if (m.pageErrors.length < 20) { const u = e.filename ? new URL(e.filename, location.href) : null; m.pageErrors.push({ name: e.error && e.error.name || 'Error', source: u ? u.origin + u.pathname : '', line: e.lineno || 0 }); } });
      const recordPaint = entries => entries.getEntries().forEach(e => { if (e.name === 'first-paint' && m.firstPaint === null) m.firstPaint = e.startTime; if (e.name === 'first-contentful-paint' && m.fcp === null) m.fcp = e.startTime; });
      try { new PerformanceObserver(recordPaint).observe({ type: 'paint', buffered: true }); } catch (_) {}
      const inspect = () => {
        if (document.body && document.body.classList.contains('stremio-hybrid') && m.hybridShell === null) m.hybridShell = performance.now();
        const card = document.querySelector('.ydesign-vertical');
        if (card && card.getClientRects().length && m.homeCards === null) m.homeCards = performance.now();
        if (m.hybridShell !== null && m.homeCards !== null && observer) observer.disconnect();
      };
      let observer = null;
      try { observer = new MutationObserver(inspect); observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }); } catch (_) {}
      window.__lampaPhase4StopMarks = () => { if (observer) observer.disconnect(); clearTimeout(window.__lampaPhase4MarkTimer); };
      document.addEventListener('DOMContentLoaded', inspect, { once: true });
      inspect();
      window.__lampaPhase4MarkTimer = setTimeout(() => { if (observer) observer.disconnect(); }, 45000);
    })();`;
}

(async () => {
    let browser, page, cdp, marksScriptId, listScriptId, routeHandler;
    const routes = [], blocked = { traktApi: 0, traktAuth: 0, duplicateUi: 0 };
    const consoleErrors = [], pageErrors = [];
    const startSamples = { baseline: [], optimized: [] };
    const originalPageCount = await pageCount();
    const pidsBefore = profilePids();
    assert.equal(pidsBefore.length, 1, 'must attach to the one dedicated Chromium process');
    assert.equal(originalPageCount > 0, true, 'CDP must expose the existing pages');
    try {
        browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
        const pages = browser.contexts().flatMap(context => context.pages()).filter(p => p.url().startsWith(origin));
        assert.equal(pages.length, 1, 'reuse the existing Lampa tab only');
        page = pages[0];
        const targetBefore = (await (await fetch('http://127.0.0.1:9222/json/list')).json()).find(t => t.type === 'page' && t.url.startsWith(origin));
        assert(targetBefore, 'existing Lampa target must be present');
        const targetId = targetBefore.id;
        const originalViewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio }));
        startSamples.baseline.push(await page.evaluate(() => {
            const d = window.StremioHybrid?.diagnostics?.() || {}, paints = performance.getEntriesByType('paint');
            const paint = name => paints.find(entry => entry.name === name)?.startTime ?? null;
            return { source: 'existing page before route; local Phase 6 preview deployment (not latest-main exact)',
                firstPaintMs: paint('first-paint'), firstContentfulPaintMs: paint('first-contentful-paint'),
                hybridScriptStartMs: d.scriptStartMs ?? null, hybridShellMs: d.shellAppliedMs ?? null, firstHybridFrameMs: d.firstShellFrameMs ?? null,
                appready: !!window.appready, previewModuleCount: window.LampaPhase6ModuleReport?.modules?.length || 0,
                loaderStarted: !!window.LampaLoaderStarted, hybrid: !!window.StremioHybrid, verticalCards: document.querySelectorAll('.ydesign-vertical').length };
        }));
        page.on('console', message => { if (message.type() === 'error') { const location=message.location();let source='unknown';try{const u=new URL(location.url);source=u.origin+u.pathname;}catch(_){}consoleErrors.push({kind:'console.error',source,line:location.lineNumber||0}); } });
        page.on('pageerror', error => { let source='unknown',line=0;const match=String(error.stack||'').match(/(https?:\/\/[^\s)]+):(\d+):(\d+)/);if(match){try{const u=new URL(match[1]);source=u.origin+u.pathname;line=Number(match[2])||0;}catch(_){}}pageErrors.push({name:error.name||'Error',source,line}); });
        cdp = await page.context().newCDPSession(page);
        await cdp.send('Page.enable');
        const init = await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: safeBrowserMarksSource() });
        marksScriptId = init.identifier;

        // Scoped safety: service-auth calls are blocked; ordinary Lampa POSTs and
        // metadata/catalog requests continue untouched. The opt-list override is
        // a one-document synthetic global, never a Storage write.
        let mode = 'baseline';
        routeHandler = async route => {
            const request = route.request(), url = new URL(request.url());
            if (url.hostname === 'api.trakt.tv') { blocked.traktApi++; return route.abort('blockedbyclient'); }
            if (url.hostname === 'auth.trakt.tv') { blocked.traktAuth++; return route.abort('blockedbyclient'); }
            if (mode === 'optimized') {
                const local = url.hostname === '127.0.0.1' && url.port === '8766';
                let name = null;
                if (local && url.pathname.endsWith('/preview-loader.js')) name = 'loader.js';
                else if (local && /\/(stremio-hybrid|interface-plus|design-optimized|cardify-plus)\.js$/.test(url.pathname)) {
                    blocked.duplicateUi++;
                    return route.abort('blockedbyclient');
                }
                else if (url.origin === 'https://gorlim590.github.io' && url.pathname.startsWith('/lampa/')) name = url.pathname.slice('/lampa/'.length);
                if (name && Object.prototype.hasOwnProperty.call(bytes, name)) {
                    const isEntrypoint = name === 'loader.js';
                    const correctVersion = isEntrypoint || url.searchParams.get('v') === version;
                    if (correctVersion) {
                        routes.push({ url: url.origin + url.pathname, source: name, sha256: hashes[name] });
                        return route.fulfill({ status: 200, body: bytes[name], contentType: 'application/javascript; charset=utf-8', headers: { 'Cache-Control': 'no-store', 'X-Lampa-Phase4-SHA256': hashes[name] } });
                    }
                    if (/^ui\/(stremio-hybrid|interface-plus|design-optimized|cardify-plus)\.js$/.test(name)) {
                        blocked.duplicateUi++;
                        return route.abort('blockedbyclient');
                    }
                }
            }
            return route.continue();
        };
        await page.route('**/*', routeHandler);

        async function sample(variant) {
            mode = variant;
            const began = Date.now();
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
            await page.waitForFunction(() => window.appready === true, null, { timeout: 45000 });
            await page.waitForFunction(() => window.StremioHybrid && document.body.classList.contains('stremio-hybrid'), null, { timeout: 45000 });
            await page.waitForFunction(() => { const n = document.querySelector('.ydesign-vertical'); if(!n || !n.checkVisibility())return false;const m=window.__lampaPhase4Marks;if(m && m.homeCards===null)m.homeCards=performance.now();return true; }, null, { timeout: 20000 }).catch(() => {});
            const row = await page.evaluate(() => {
                const d = window.LampaLoaderDiagnostics || {};
                const paints = performance.getEntriesByType('paint');
                const paintTime = name => paints.find(entry => entry.name === name)?.startTime ?? null;
                const resources = performance.getEntriesByType('resource').filter(e => /preview-loader\.js|\/loader\.js|ui\/(stremio-hybrid|interface-plus|design-optimized|cardify-plus|settings-hub|torrent-overlay)\.js/.test(e.name)).map(e => ({ path: (() => { const u = new URL(e.name); return u.origin + u.pathname; })(), startMs: Math.round(e.startTime), durationMs: Math.round(e.duration), responseEndMs: Math.round(e.responseEnd) }));
                const m = window.__lampaPhase4Marks || {};
                const h = window.StremioHybrid?.diagnostics?.() || {};
                return { firstPaintMs: m.firstPaint ?? paintTime('first-paint'), firstContentfulPaintMs: m.fcp ?? paintTime('first-contentful-paint'), hybridShellMs: h.shellAppliedMs ?? m.hybridShell, homeCardsMs: m.homeCards,
                    paintTimingApi: { firstPaintMs: paintTime('first-paint'), firstContentfulPaintMs: paintTime('first-contentful-paint') },
                    hybridScriptStartMs: h.scriptStartMs ?? null, hybridAppliedShellMs: h.shellAppliedMs ?? null, firstHybridFrameMs: h.firstShellFrameMs ?? null,
                    appready: !!window.appready, appreadyAtLoaderStart: d.appreadyAtStart === true, criticalMs: d.criticalStartedAt != null && d.criticalFinishedAt != null ? Math.round(d.criticalFinishedAt-d.criticalStartedAt) : null,
                    deferredMs: d.deferredStartedAt != null && d.deferredFinishedAt != null ? Math.round(d.deferredFinishedAt-d.deferredStartedAt) : null,
                    loaderStage: d.stage || 'absent', loaderLoaded: d.loaded || 0, loaderFailed: d.failed || 0,
                    cards: document.querySelectorAll('.ydesign-vertical').length, uaBadges: document.querySelectorAll('.ydesign-badge-ua').length,
                    hybridStyles: document.querySelectorAll('#stremio-hybrid-style').length, hybrid: !!window.StremioHybrid,
                    hub: !!window.LampaSettingsHub, cardifySettings: (window.Lampa?.SettingsApi?.getParam('cardify') || []).length,
                    resources };
            });
            row.wallToReadyMs = Date.now() - began;
            startSamples[variant].push(row);
            return row;
        }

        // Keep these bounded and in the same tab. Baseline is the currently
        // installed local preview manifest; optimized is the branch loader routed
        // to the exact checked-out allowlist. No cache/profile clearing occurs.
        listScriptId = (await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: "window.LAMPA_PLUGINS_LIST = ['ui/cardify-plus.js'];" })).identifier;
        for (let i = 0; i < 3; i++) {
            const row = await sample('optimized');
            if (row.cards === 0) break;
        }
        await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: listScriptId });
        listScriptId = null;

        const finalUi = await page.evaluate(() => ({
            viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
            bodyClasses: [...document.body.classList].filter(c => /^(stremio-hybrid|ydesign-active|orientation--portrait)$/.test(c)),
            controller: window.Lampa?.Controller?.enabled?.()?.name || '',
            hybridOwner: !!window.StremioHybrid && document.body.classList.contains('stremio-hybrid'),
            hybridInitCount: window.StremioHybrid?.diagnostics?.().initCount || 0,
            hybridStyleCount: document.querySelectorAll('#stremio-hybrid-style').length,
            interfaceAdapter: window.InterfacePlusPresentation?.contractVersion || 0,
            interfaceFallbackHeaderStyle: !!document.getElementById('ifx_header_css'),
            ydesignReady: window.YDesignLoaded === true,
            verticalCards: document.querySelectorAll('.ydesign-vertical').length,
            uaBadges: document.querySelectorAll('.ydesign-badge-ua').length,
            hubContract: window.LampaSettingsHub?.contractVersion || 0,
            settingsOpen: document.body.classList.contains('settings--open')
        }));
        assert.equal(finalUi.hybridOwner, true);
        assert.equal(finalUi.hybridStyleCount, 1);
        assert.equal(finalUi.interfaceAdapter, 1);
        assert.equal(finalUi.interfaceFallbackHeaderStyle, false);
        assert.equal(finalUi.ydesignReady, true);
        assert(finalUi.verticalCards > 0);
        assert.equal(finalUi.hubContract, 1);

        // One real D-pad move on the existing Home is safe; preserve the logical
        // starting focus by returning with the opposite key when possible.
        const focusState = () => page.evaluate(() => { const n=document.querySelector('.focus');const row=n?.closest('.items-line');const rows=[...document.querySelectorAll('.items-line')];return {controller:window.Lampa?.Controller?.enabled?.()?.name||'',focus:n?{tag:n.tagName,name:n.getAttribute('data-name')||'',action:n.getAttribute('data-action')||'',class:n.classList[0]||'',rowIndex:row?rows.indexOf(row):-1,itemIndex:row?[...row.querySelectorAll('.card')].indexOf(n):-1}:null}; });
        const beforeFocus = await focusState();
        await page.keyboard.press('ArrowDown');
        await page.waitForFunction(previous => { const n=document.querySelector('.focus');const row=n?.closest('.items-line');const rows=[...document.querySelectorAll('.items-line')];const next=n?JSON.stringify({name:n.getAttribute('data-name')||'',action:n.getAttribute('data-action')||'',rowIndex:row?rows.indexOf(row):-1,itemIndex:row?[...row.querySelectorAll('.card')].indexOf(n):-1}):'';return next&&next!==previous; }, JSON.stringify(beforeFocus.focus), { timeout: 1500 }).catch(() => {});
        const afterFocus = await focusState();
        const dpadMoved = !!beforeFocus.focus && !!afterFocus.focus && JSON.stringify(beforeFocus.focus)!==JSON.stringify(afterFocus.focus);
        if (dpadMoved) {
            await page.keyboard.press('ArrowUp');
            await page.waitForFunction(previous => { const n=document.querySelector('.focus');const row=n?.closest('.items-line');const rows=[...document.querySelectorAll('.items-line')];const now=n?JSON.stringify({name:n.getAttribute('data-name')||'',action:n.getAttribute('data-action')||'',rowIndex:row?rows.indexOf(row):-1,itemIndex:row?[...row.querySelectorAll('.card')].indexOf(n):-1}):'';return now===previous; }, JSON.stringify(beforeFocus.focus), { timeout: 1500 }).catch(() => {});
        }

        async function focusSettingsCategory(component) {
            for (let i = 0; i < 40; i++) {
                const before = await page.evaluate(() => document.querySelector('.sh-settings-category.focus')?.getAttribute('data-sh-settings-component') || '');
                if (before === component) return true;
                await page.keyboard.press('ArrowDown');
                await page.waitForFunction(previous => { const n=document.querySelector('.sh-settings-category.focus'); return n && n.getAttribute('data-sh-settings-component') !== previous; }, before, { timeout: 1200 }).catch(() => {});
            }
            return false;
        }
        async function focusHubParameter(name, limit = 25) {
            for (let i = 0; i < limit; i++) {
                const before = await page.evaluate(() => document.querySelector('.settings-param.focus')?.getAttribute('data-name') || '');
                if (before === name) return true;
                await page.keyboard.press('ArrowDown');
                await page.waitForFunction(previous => { const n=document.querySelector('.settings-param.focus'); return n && n.getAttribute('data-name') !== previous; }, before, { timeout: 1200 }).catch(() => {});
            }
            return false;
        }
        await page.evaluate(() => window.Lampa.Controller.toggle('settings'));
        await page.waitForFunction(() => document.body.classList.contains('settings--open') && window.Lampa.Controller.enabled()?.name === 'sh_settings_nav', null, { timeout: 12000 });
        assert(await focusSettingsCategory('settings_hub'), 'native D-pad reaches the registered Hub route');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.querySelector('[data-settings-hub-version]')?.checkVisibility() && document.querySelector('[data-name="hub_search"]')?.checkVisibility(), null, { timeout: 12000 });
        const hubParamsBefore = await page.evaluate(() => (window.Lampa.SettingsApi.getParam('settings_hub') || []).length);
        assert(await focusHubParameter('hub_search'), 'native D-pad focuses Hub search');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.querySelector('input.simple-keyboard-input')?.checkVisibility(), null, { timeout: 10000 });
        const searchInput = page.locator('input.simple-keyboard-input');
        await searchInput.fill('ydesign_grid_items_v');
        // The native Lampa keyboard may first process Enter as a key event; wait
        // for its controller state, then confirm through that same input if needed.
        await searchInput.press('Enter');
        await page.waitForFunction(() => window.Lampa.Controller.enabled()?.name !== 'keybord' && !document.querySelector('input.simple-keyboard-input')?.checkVisibility(), null, { timeout: 1800 }).catch(async () => {
            const activeInput = page.locator('input.simple-keyboard-input');
            if (await activeInput.count()) await activeInput.press('Enter');
        });
        await page.waitForFunction(() => document.querySelector('[data-name^="hub_item_"]')?.checkVisibility() || document.querySelector('[data-name="hub_empty"]')?.checkVisibility(), null, { timeout: 10000 });
        const queryResults = await page.evaluate(() => ({ controller: window.Lampa.Controller.enabled()?.name || '', visibleResults: [...document.querySelectorAll('[data-name^="hub_item_"]')].filter(n => n.checkVisibility()).length, empty: !!document.querySelector('[data-name="hub_empty"]')?.checkVisibility(), queryPreserved: document.querySelector('[data-name="hub_search"]')?.textContent.includes('ydesign_grid_items_v') || false }));
        assert.equal(queryResults.visibleResults, 1, 'synthetic key search resolves one real Registry result');
        assert.equal(queryResults.queryPreserved, true);
        assert(await focusHubParameter('hub_item_0'), 'D-pad reaches the real owner result');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.querySelector('[data-name="ydesign_grid_items_v"]')?.checkVisibility(), null, { timeout: 12000 });
        const ownerPanel = await page.evaluate(() => ({ controller: window.Lampa.Controller.enabled()?.name || '', settingVisible: !!document.querySelector('[data-name="ydesign_grid_items_v"]')?.checkVisibility(), hubActive: document.body.classList.contains('settings-hub-active') }));
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => document.querySelector('.settings-param.focus')?.getAttribute('data-name') === 'hub_item_0' && document.querySelector('[data-name="hub_item_0"]')?.checkVisibility(), null, { timeout: 12000 });
        const ownerBack = await page.evaluate(() => ({ controller: window.Lampa.Controller.enabled()?.name || '', focus: document.querySelector('.settings-param.focus')?.getAttribute('data-name') || '', queryPreserved: document.querySelector('[data-name="hub_search"]')?.textContent.includes('ydesign_grid_items_v') || false }));
        assert.equal(ownerBack.focus, 'hub_item_0');
        assert.equal(ownerBack.queryPreserved, true);
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => document.querySelector('[data-settings-hub-version]')?.checkVisibility() && document.querySelector('[data-name="hub_search"]')?.checkVisibility(), null, { timeout: 12000 });
        const hubRoot = await page.evaluate(() => ({ controller: window.Lampa.Controller.enabled()?.name || '', focus: document.querySelector('.settings-param.focus')?.getAttribute('data-name') || '', queryPreserved: document.querySelector('[data-name="hub_search"]')?.textContent.includes('ydesign_grid_items_v') || false }));
        await page.locator('[data-settings-hub-version]').screenshot({ path: '/tmp/issue79-phase4-settings-hub.png', timeout: 15000 });
        assert.equal(hubRoot.queryPreserved, true);
        assert(await focusHubParameter('hub_native'), 'D-pad reaches Standard Lampa Settings');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => window.Lampa.Controller.enabled()?.name === 'sh_settings_nav' && !document.body.classList.contains('settings-hub-active'), null, { timeout: 10000 });
        const standardFallback = await page.evaluate(() => ({ controller: window.Lampa.Controller.enabled()?.name || '', nativeRailVisible: !!document.querySelector('.sh-settings-rail')?.checkVisibility(), hubActive: document.body.classList.contains('settings-hub-active') }));
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.body.classList.contains('settings--open'), null, { timeout: 10000 });
        await page.evaluate(() => window.Lampa.Controller.toggle('settings'));
        await page.waitForFunction(() => window.Lampa.Controller.enabled()?.name === 'sh_settings_nav', null, { timeout: 12000 });
        assert(await focusSettingsCategory('settings_hub'));
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.querySelector('[data-settings-hub-version]')?.checkVisibility(), null, { timeout: 12000 });
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => window.Lampa.Controller.enabled()?.name === 'sh_settings_nav' && !document.body.classList.contains('settings-hub-active'), null, { timeout: 10000 });
        const rootBack = await page.evaluate(() => ({ controller: window.Lampa.Controller.enabled()?.name || '', nativeRailVisible: !!document.querySelector('.sh-settings-rail')?.checkVisibility(), hubActive: document.body.classList.contains('settings-hub-active') }));
        const hubParamsAfter = await page.evaluate(() => (window.Lampa.SettingsApi.getParam('settings_hub') || []).length);
        assert.equal(hubParamsAfter, hubParamsBefore, 'repeat install/open did not duplicate Hub registrations');
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.body.classList.contains('settings--open'), null, { timeout: 10000 });
        const navigation = { settingsOpen: 'PASS', dpadCategory: 'PASS', metadataSearch: 'PASS', ownerRoute: 'PASS', ownerBackFocusAndQuery: 'PASS', standardFallback: 'PASS', hubRootBack: 'PASS', repeatedEntryRegistrations: 'PASS', queryResults, ownerPanel, ownerBack, hubRoot, standardFallback, rootBack, hubParamsBefore, hubParamsAfter };

        const targetAfter = (await (await fetch('http://127.0.0.1:9222/json/list')).json()).find(t => t.type === 'page' && t.id === targetId);
        assert(targetAfter && targetAfter.url.startsWith(origin), 'the original Lampa target remains available');
        assert.equal(await pageCount(), originalPageCount, 'no browser tabs were created or closed');
        assert.equal(profilePids().length, 1, 'the original dedicated Chromium process remains alive');
        assert.deepEqual(await page.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio })), originalViewport, 'the original viewport is preserved');

        const results = {
            testedCommit: commit,
            mode: 'existing dedicated Chromium; warm reloads only; no storage clearing',
            viewport: originalViewport,
            baseline: startSamples.baseline,
            optimized: startSamples.optimized,
            routeAssets: routes,
            exactAssetHashes: hashes,
            blockedServiceCounts: blocked,
            consoleErrorCount: consoleErrors.length,
            consoleErrorKinds: consoleErrors.slice(0, 20),
            pageErrorNames: pageErrors.slice(0, 10),
            scriptErrors: await page.evaluate(() => window.__lampaPhase4Marks?.pageErrors || []),
            finalUi,
            navigation,
            dpad: { status: dpadMoved ? 'PASS' : 'PARTIAL', focusRestored: dpadMoved ? JSON.stringify(await focusState()).includes(JSON.stringify(beforeFocus.focus)) : false, before: beforeFocus, after: afterFocus },
            browserSurvival: { matchingProfileProcesses: profilePids().length, pageCount: await pageCount(), sameTarget: !!targetAfter }
        };
        fs.writeFileSync(path.join(__dirname, 'phase4-browser-results.json'), JSON.stringify(results, null, 2) + '\n');
        console.log(JSON.stringify({ ok: true, baselineRuns: results.baseline.length, optimizedRuns: results.optimized.length,
            browserSurvival: results.browserSurvival, finalUi, blocked, routeAssetCount: routes.length,
            median: { baselineHybridMs: median(results.baseline.map(r => r.hybridShellMs)), optimizedHybridMs: median(results.optimized.map(r => r.hybridShellMs)), baselineCardsMs: median(results.baseline.map(r => r.homeCardsMs)), optimizedCardsMs: median(results.optimized.map(r => r.homeCardsMs)) } }, null, 2));
    } finally {
        if (page && routeHandler) await page.unroute('**/*', routeHandler).catch(error => { console.error('route_cleanup_failed', error.name); });
        if (page) await page.evaluate(() => { if (window.__lampaPhase4StopMarks) window.__lampaPhase4StopMarks(); clearTimeout(window.__lampaPhase4MarkTimer); delete window.__lampaPhase4Marks; delete window.__lampaPhase4StopMarks; delete window.__lampaPhase4MarkTimer; }).catch(error => { console.error('marks_cleanup_failed', error.name); });
        if (cdp && marksScriptId) await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: marksScriptId }).catch(error => { console.error('marks_script_cleanup_failed', error.name); });
        if (cdp && listScriptId) await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: listScriptId }).catch(error => { console.error('list_script_cleanup_failed', error.name); });
        if (cdp) await cdp.detach().catch(error => { console.error('cdp_detach_failed', error.name); });
        // Deliberately never call browser.close(): CDP owns a user-visible process.
    }
})().catch(error => { console.error('phase4_browser_failed', error.name, error.message); process.exitCode = 1; });

function median(values) {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
}
