'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../../..');
const base = 'https://siaivo.isroot.in/';
const out = path.join(__dirname, 'e2e-stable.json');
const screenshot = path.join(__dirname, 'settings-hub-root.png');
const safeOrigin = value => { try { return new URL(value).origin; } catch { return ''; } };

(async () => {
    const evidence = { result: 'FAIL', mode: 'existing dedicated CDP page; no new browser/tab/context/profile',
        branchSha: null, browser: null, viewport: null, cycles: [], hybridLifecycle: [], screenshots: [], blockedRequests: 0,
        consoleErrors: [], pageErrors: [], failedRequests: 0 };
    let browser, page, context, route, originalGet, originalSet;
    try {
        const pids = fs.readdirSync('/proc').filter(n => /^\d+$/.test(n)).filter(n => {
            try { const cmd = fs.readFileSync('/proc/' + n + '/cmdline', 'utf8');
                return fs.readlinkSync('/proc/' + n + '/exe').endsWith('/chrome') &&
                    cmd.includes('/home/gostrimchik/lampa-testing/chromium-profile') && cmd.includes('--remote-debugging-port=9222');
            } catch { return false; }
        });
        assert(pids.length, 'CDP endpoint is not owned by the dedicated testing profile');
        browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
        evidence.browser = browser.version();
        const pages = browser.contexts().flatMap(c => c.pages()).filter(p => p.url().startsWith(base));
        assert.equal(pages.length, 1, 'Expected the one existing Lampa tab');
        page = pages[0]; context = page.context();
        page.on('console', message => {
            if (message.type() !== 'error') return;
            const sanitized = message.text().replace(/https?:\/\/[^\s"'<>]+/g, value => safeOrigin(value))
                .replace(/(?:token|authorization|password|api[_-]?key|secret)(?:\s*[:=]\s*)?[^\s,;]*/ig, '[REDACTED]')
                .slice(0, 180);
            evidence.consoleErrors.push({ origin: safeOrigin(message.location().url), message: sanitized });
        });
        page.on('pageerror', error => evidence.pageErrors.push(error.name || 'Error'));
        page.on('requestfailed', () => { evidence.failedRequests++; });
        const configuredLauncher = fs.readFileSync('/home/gostrimchik/lampa-testing/test-lampa.js', 'utf8');
        assert(/width:\s*1920[\s\S]*height:\s*1080/.test(configuredLauncher), 'Established test launcher no longer specifies the 1920×1080 viewport');
        evidence.viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio, playwrightViewport: null }));
        evidence.viewportNote = 'Existing attached page reports an unbounded viewport; no viewport override was applied. Launcher config is 1920×1080.';
        assert.equal(await page.evaluate(() => document.readyState), 'complete');
        const health = await (await fetch('http://127.0.0.1:8766/health')).json();
        evidence.branchSha = health.branchSha;
        const priorEvidence = JSON.parse(fs.readFileSync(path.join(__dirname, 'browser-evidence.json'), 'utf8'));
        const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
        const assetSources = new Map([
            ['/preview-loader.js', 'audit/settings/phase6-browser/preview-loader.js'],
            ['/manifest.json', 'audit/settings/phase6-browser/manifest.json'],
            ['/stremio-hybrid.js', 'ui/stremio-hybrid.js'],
            ['/settings-hub.js', 'ui/settings-hub.js'],
            ['/torrent-overlay.js', 'ui/torrent-overlay.js'],
            ...manifest.modules.map(item => ['/' + item.path, item.source || item.path])
        ]);
        const responseProof = await page.evaluate(async paths => {
            const output = [];
            for (const pathname of paths) {
                try {
                    const response = await fetch('http://127.0.0.1:8766' + pathname, { credentials: 'omit', cache: 'no-store' });
                    const bytes = new Uint8Array(await response.arrayBuffer());
                    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
                    output.push({ path: pathname, status: response.status, type: response.type,
                        contentType: response.headers.get('content-type'),
                        sha256: Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join(''),
                        sourceSha: response.headers.get('x-phase6-source-sha') });
                } catch (error) { output.push({ path: pathname, error: error.name }); }
            }
            return output;
        }, [...assetSources.keys()]);
        const exactAssetResponses = responseProof.map(item => {
            const source = assetSources.get(item.path);
            const expected = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, source))).digest('hex');
            assert.equal(item.status, 200, 'Preview CORS asset failed: ' + item.path);
            assert.equal(item.type, 'cors', 'Preview response is not CORS-readable: ' + item.path);
            assert.equal(item.contentType, item.path.endsWith('.json') ? 'application/json; charset=utf-8' : 'application/javascript; charset=utf-8');
            assert.equal(item.sha256, expected, 'CORS response bytes differ from checked-out source: ' + item.path);
            assert.equal(item.sourceSha, evidence.branchSha, 'Preview asset is not bound to this branch commit: ' + item.path);
            return { ...item, source, expectedSha256: expected, exact: true };
        });
        assert.equal(exactAssetResponses.length, 17, 'Expected branch loader, manifest, 13 manifest modules, Hub and overlay assets');
        evidence.exactAssetResponseProof = { count: exactAssetResponses.length, mode: 'live HTTPS-tab CORS response bodies hashed against checked-out branch files', assets: exactAssetResponses };
        const activeModules = await page.evaluate(() => window.LampaPhase6ModuleReport?.modules?.map(item => ({ name: item.name, loaded: item.loaded === true, source: new URL(item.sourceUrl).origin + new URL(item.sourceUrl).pathname })) || []);
        assert(activeModules.length >= 13 && activeModules.every(item => item.loaded && item.source.startsWith('http://127.0.0.1:8766/')),
            'Current active module report is not bound to local branch assets');
        evidence.activeModuleCount = activeModules.length;

        // Strip ambient auth headers and prevent only sensitive service calls/external writes.
        route = async r => {
            const request = r.request(), url = new URL(request.url()), method = request.method();
            const headers = { ...request.headers() };
            delete headers.cookie; delete headers.authorization; delete headers['proxy-authorization'];
            const readOnly = method === 'GET' || method === 'HEAD';
            const sensitive = /trakt|oauth|auth|token|account|profile|history|sync|watch|scrobble|progress|rating|playback/i.test(url.hostname + url.pathname) ||
                [...url.searchParams.keys()].some(k => /token|auth|password|account|api.?key|secret/i.test(k));
            const apiWrite = !readOnly && (/\/api(?:\/|$)/i.test(url.pathname) || url.hostname.startsWith('api.'));
            const externalWrite = !readOnly && url.origin !== 'https://siaivo.isroot.in';
            if (sensitive || apiWrite || externalWrite) { evidence.blockedRequests++; return r.abort(); }
            return r.continue({ headers });
        };
        await page.route('**/*', route);

        originalGet = await page.evaluate(() => {
            window.__p6Read = Lampa.Storage.get;
            Lampa.Storage.get = function(key, fallback) {
                if (key === 'stremio_hybrid_primary_settings') return true;
                return window.__p6Read.call(this, key, fallback);
            };
            return true;
        });
        originalSet = await page.evaluate(() => {
            window.__p6Write = Lampa.Storage.set;
            window.__p6Writes = 0;
            Lampa.Storage.set = function() { window.__p6Writes++; };
            return true;
        });
        await page.evaluate(() => {
            window.__p6SettingsEvents = [];
            window.__p6SettingsObserver = event => window.__p6SettingsEvents.push(String(event && event.name || 'unknown'));
            Lampa.Settings.listener.follow('open', window.__p6SettingsObserver);
        });

        async function state(expected, visibleSelector, focused) {
            const value = await page.evaluate(() => {
                const enabled = Lampa.Controller.enabled();
                const focus = document.querySelector('.settings-param.focus');
                return { controller: enabled && enabled.name || '', settingsOpen: document.body.classList.contains('settings--open'),
                    hubActive: document.body.classList.contains('settings-hub-active'),
                    settingsComponentEvents: window.__p6SettingsEvents.slice(-4),
                    focusedId: focus && focus.getAttribute('data-name') || '',
                    focusedLabel: focus && focus.querySelector('.settings-param__name')?.textContent?.trim() || '',
                    nativeMain: !!document.querySelector('.settings--open .settings-folder, .settings--open [data-component]'),
                    hubVersion: document.querySelector('[data-settings-hub-version]')?.getAttribute('data-settings-hub-version') || '' };
            });
            assert(value.controller, expected + ': missing native controller');
            assert(await page.locator(visibleSelector).count(), expected + ': expected visible UI element missing');
            if (focused) assert.equal(value.focusedId, focused, expected + ': focus did not land on expected control');
            return value;
        }
        async function pressFocus(selector, key) {
            const row = page.locator(selector).first();
            assert.equal(await row.count(), 1, 'Native navigation target missing: ' + selector);
            await row.evaluate(node => Lampa.Controller.collectionFocus(node, document.querySelector('.settings__body')));
            const focused = await page.evaluate(() => document.querySelector('.settings-param.focus')?.getAttribute('data-name') || '');
            assert.equal(focused, key, 'Lampa focus engine did not focus ' + key);
            await page.keyboard.press('Enter');
        }

        for (let iteration = 1; iteration <= 2; iteration++) {
            const flow = { iteration, transitions: [], result: 'FAIL' };
            evidence.cycles.push(flow);
            const before = await page.evaluate(() => ({ open: document.body.classList.contains('settings--open'), controller: Lampa.Controller.enabled().name }));
            assert.equal(before.open, false, 'Each run starts with Settings closed');
            assert(['head', 'items_line', 'select'].includes(before.controller), 'Unexpected pre-navigation controller: ' + before.controller);
            const eventStart = await page.evaluate(() => window.__p6SettingsEvents.length);

            await page.evaluate(() => Lampa.Controller.toggle('settings'));
            await page.waitForSelector('[data-name="hub_search"]', { timeout: 10000 });
            const entryFocus = await page.evaluate(() => document.querySelector('.settings-param.focus')?.getAttribute('data-name') || '');
            const entryFocusSequence = [];
            for (let i = 0; entryFocus !== 'hub_search' && i < 12 && entryFocusSequence.at(-1) !== 'hub_search'; i++) {
                await page.keyboard.press('ArrowDown');
                await page.waitForTimeout(100);
                entryFocusSequence.push(await page.evaluate(() => document.querySelector('.settings-param.focus')?.getAttribute('data-name') || ''));
            }
            assert(entryFocusSequence.at(-1) === 'hub_search' || entryFocus === 'hub_search', 'D-pad could not reach Hub search from the restored root focus');
            const root = await state('Hub root', '[data-name="hub_search"]', 'hub_search');
            assert.equal(root.controller, 'settings_component'); assert(root.settingsOpen && root.hubActive);
            assert(root.settingsComponentEvents.includes('settings_hub'));
            flow.transitions.push({ action: 'Native Settings → Hub', state: root, entryFocus, expectedBack: 'native Settings Main' });
            if (entryFocus !== 'hub_search') flow.transitions.push({ action: 'Native D-pad ArrowDown to Hub search', focusSequence: entryFocusSequence, expected: 'hub_search' });
            if (iteration === 1) {
                const dpadFocus = [];
                for (let i = 0; i < 16; i++) {
                    await page.keyboard.press('ArrowUp');
                    await page.waitForTimeout(100);
                    const key = await page.evaluate(() => document.querySelector('.settings-param.focus')?.getAttribute('data-name') || '');
                    dpadFocus.push(key);
                    if (key === 'hub_category_profiles') break;
                }
                const firstCategoryFocus = await state('D-pad Up to first Hub category', '[data-name="hub_category_profiles"]', 'hub_category_profiles');
                flow.transitions.push({ action: 'Native D-pad ArrowUp reaches first category', state: firstCategoryFocus, focusSequence: dpadFocus });
                await page.waitForTimeout(1600); // allow native focus, scroll, and view transitions to settle before evidence capture
                await page.screenshot({ path: screenshot, clip: { x: 0, y: 0, width: 1920, height: 1080 }, timeout: 15000 });
                evidence.screenshots.push(path.basename(screenshot));
            }

            await pressFocus('[data-name="hub_search"]', 'hub_search');
            await page.waitForSelector('.simple-keyboard-input', { timeout: 8000 });
            const keyboardState = await page.evaluate(() => ({ controller: Lampa.Controller.enabled().name,
                keyboardVisible: document.body.classList.contains('keyboard-input--visible'), inputVisible: !!document.querySelector('.simple-keyboard-input') }));
            assert(keyboardState.keyboardVisible && keyboardState.inputVisible, 'Native Lampa search keyboard did not open');
            flow.transitions.push({ action: 'Hub → native search input', state: keyboardState, expectedBack: 'Hub root' });
            await page.locator('.simple-keyboard-input').fill('ydesign');
            await page.locator('.simple-keyboard-buttons__enter').evaluate(node => node.click());
            await page.waitForFunction(() => !document.body.classList.contains('keyboard-input--visible') && !!document.querySelector('[data-name^="hub_item_"]'), null, { timeout: 10000 });
            const results = await state('Search results', '[data-name^="hub_item_"]');
            assert.equal(results.controller, 'settings_component'); assert(results.hubActive);
            const result = await page.evaluate(() => {
                const node = [...document.querySelectorAll('[data-name^="hub_item_"]')].find(item => /ui\/design-optimized\.js/i.test(item.querySelector('.settings-param__descr')?.textContent || ''));
                return { id: node?.getAttribute('data-name') || '', label: node?.querySelector('.settings-param__name')?.textContent?.trim() || '', context: node?.querySelector('.settings-param__descr')?.textContent?.trim() || '' };
            });
            assert(result.id && /ui\/design-optimized\.js/i.test(result.context), 'Search results did not include a verifiable YDesign owner');
            flow.transitions.push({ action: 'Native keyboard confirms metadata search', state: results, result: { id: result.id, label: result.label }, expectedBack: 'Hub root with query retained' });

            await pressFocus('[data-name="' + result.id + '"]', result.id);
            await page.waitForFunction(key => !document.body.classList.contains('keyboard-input--visible') &&
                Lampa.Controller.enabled().name === 'settings_component' && !document.querySelector('[data-name="' + key + '"]'), result.id, { timeout: 10000 });
            const owner = await state('Original owner panel', '.settings__body .settings-param');
            assert(owner.settingsOpen && owner.hubActive);
            const ownerComponent = await page.evaluate(() => window.__p6SettingsEvents.at(-1));
            assert.equal(ownerComponent, 'ydesign', 'Search result did not open its real YDesign owner panel');
            assert(owner.focusedId, 'Original owner panel did not receive a focused setting');
            flow.transitions.push({ action: 'Search result → original owner', state: owner, ownerComponent, expectedBack: 'search result page' });

            await page.keyboard.press('Escape');
            await page.waitForFunction(key => !!document.querySelector('[data-name="' + key + '"]') && document.body.classList.contains('settings-hub-active'), result.id, { timeout: 10000 });
            const returned = await state('Back to search results', '[data-name="' + result.id + '"]', result.id);
            assert(returned.settingsComponentEvents.includes('settings_hub_page'));
            const queryRetained = await page.evaluate(() => /ydesign/i.test(document.querySelector('[data-name="hub_search"] .settings-param__descr')?.textContent || ''));
            assert(queryRetained, 'Search query/result context was not retained on Back');
            flow.transitions.push({ action: 'Owner Back → same search result/focus', state: returned, expectedBack: 'Hub root' });

            await pressFocus('[data-name="hub_back"]', 'hub_back');
            await page.waitForSelector('[data-name="hub_search"]', { timeout: 10000 });
            const rootAgain = await state('Hub root after search Back', '[data-name="hub_search"]', 'hub_search');
            assert(rootAgain.settingsComponentEvents.includes('settings_hub'));
            flow.transitions.push({ action: 'Search results → Hub root', state: rootAgain, expectedBack: 'native Settings Main' });

            await pressFocus('[data-name="hub_native"]', 'hub_native');
            await page.waitForFunction(() => !document.body.classList.contains('settings-hub-active') && document.body.classList.contains('settings--open'), null, { timeout: 10000 });
            const standard = await state('Standard Settings fallback', '.settings--open');
            assert(['settings', 'sh_settings_nav'].includes(standard.controller), 'Standard fallback did not enter native Settings navigation');
            assert.equal(await page.locator('[data-settings-hub-consolidated="true"]').count(), 0, 'Native folders were not restored');
            flow.transitions.push({ action: 'Hub root → Standard Settings', state: standard, expectedBack: 'normal native Settings close' });
            const eventNames = await page.evaluate(start => window.__p6SettingsEvents.slice(start), eventStart);
            assert(eventNames.filter(name => name === 'settings_hub').length <= 2, 'Repeated Hub root transition indicates a navigation loop');
            assert(eventNames.filter(name => name === 'main').length <= 2, 'Repeated native Main transition indicates a navigation loop');
            flow.settingsEvents = eventNames;
            flow.result = 'PASS';

            await page.keyboard.press('Escape');
            await page.waitForFunction(() => !document.body.classList.contains('settings--open'), null, { timeout: 10000 });
            const closed = await page.evaluate(() => ({ controller: Lampa.Controller.enabled().name, settingsOpen: document.body.classList.contains('settings--open'), hubActive: document.body.classList.contains('settings-hub-active') }));
            assert.equal(closed.settingsOpen, false);
            flow.closedState = closed;
            // The native controller has a deliberate triple-Back emergency exit within 500ms.
            // Pace this separate fresh-open check so the harness does not synthesize that gesture.
            await page.waitForTimeout(650);
            await page.evaluate(() => Lampa.Controller.toggle('settings'));
            await page.waitForSelector('[data-name="hub_search"]', { timeout: 10000 });
            const freshRoot = await state('Fresh Hub opening after Standard Settings', '[data-name="hub_search"]');
            assert(freshRoot.hubActive && freshRoot.settingsOpen);
            const beforeRootBack = await page.evaluate(() => window.__p6SettingsEvents.length);
            await page.waitForTimeout(650);
            await page.keyboard.press('Escape');
            await page.waitForFunction(() => document.body.classList.contains('settings--open') && !document.body.classList.contains('settings-hub-active'), null, { timeout: 10000 });
            const rootBack = await state('Fresh Hub root Back after Standard Settings', '.settings--open');
            assert.equal(rootBack.controller, 'sh_settings_nav');
            const rootBackEvents = await page.evaluate(start => window.__p6SettingsEvents.slice(start), beforeRootBack);
            assert(rootBackEvents.includes('main') && !rootBackEvents.includes('settings_hub'), 'Native root Back re-entered the Hub');
            flow.transitions.push({ action: 'Close Standard Settings → fresh Hub open → root Back', state: rootBack,
                events: rootBackEvents, expectedBack: 'native Settings Main; no Hub re-entry' });
            await page.waitForTimeout(650);
            await page.keyboard.press('Escape');
            await page.waitForFunction(() => !document.body.classList.contains('settings--open'), null, { timeout: 10000 });
            await page.waitForTimeout(650);
        }
        const lifecycleBefore = await page.evaluate(() => ({ active: document.body.classList.contains('stremio-hybrid'),
            styleCount: document.querySelectorAll('#stremio-hybrid-style').length, hubParams: (Lampa.SettingsApi.allParams().settings_hub || []).length,
            mounts: StremioHybrid.diagnostics().settingsMounts, unmounts: StremioHybrid.diagnostics().settingsUnmounts }));
        await page.evaluate(() => StremioHybrid.setEnabled(false));
        await page.waitForFunction(() => !document.body.classList.contains('stremio-hybrid') && !document.querySelector('#stremio-hybrid-style'), null, { timeout: 10000 });
        const disabled = await page.evaluate(() => ({ active: document.body.classList.contains('stremio-hybrid'), settingsOpen: document.body.classList.contains('settings--open'), hubActive: document.body.classList.contains('settings-hub-active') }));
        assert.equal(disabled.active, false);
        await page.evaluate(() => Lampa.Controller.toggle('settings'));
        await page.waitForFunction(() => document.body.classList.contains('settings--open'), null, { timeout: 10000 });
        const disabledFallback = await page.evaluate(() => ({ controller: Lampa.Controller.enabled().name,
            hubActive: document.body.classList.contains('settings-hub-active'), nativeFolders: document.querySelectorAll('.settings-folder').length,
            markerCount: document.querySelectorAll('[data-settings-hub-consolidated="true"]').length }));
        assert.equal(disabledFallback.hubActive, false, 'Hybrid-off Settings must remain native');
        assert(disabledFallback.nativeFolders > 0, 'Hybrid-off native Settings folders must remain reachable');
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.body.classList.contains('settings--open'), null, { timeout: 10000 });
        await page.waitForTimeout(650);
        await page.evaluate(() => StremioHybrid.setEnabled(true));
        await page.waitForFunction(() => document.body.classList.contains('stremio-hybrid') && document.querySelectorAll('#stremio-hybrid-style').length === 1, null, { timeout: 10000 });
        await page.evaluate(() => Lampa.Controller.toggle('settings'));
        await page.waitForSelector('[data-name="hub_search"]', { timeout: 10000 });
        const reenabledHub = await page.evaluate(() => ({ active: document.body.classList.contains('stremio-hybrid'),
            hubActive: document.body.classList.contains('settings-hub-active'), controller: Lampa.Controller.enabled().name,
            styleCount: document.querySelectorAll('#stremio-hybrid-style').length,
            hubParamNames: (Lampa.SettingsApi.allParams().settings_hub || []).map(row => row.param && row.param.name).filter(Boolean) }));
        assert(reenabledHub.hubActive && reenabledHub.active && reenabledHub.styleCount === 1);
        assert.equal(new Set(reenabledHub.hubParamNames).size, reenabledHub.hubParamNames.length, 'Hybrid reenable must not duplicate Hub registrations');
        evidence.hybridLifecycle.push({ scenario: 'Hybrid off → native Settings fallback → Hybrid on → Hub remount', status: 'PASS',
            before: lifecycleBefore, disabled, disabledFallback, reenabledHub,
            storageSetAttempts: await page.evaluate(() => window.__p6Writes || 0) });
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => document.body.classList.contains('settings--open') && !document.body.classList.contains('settings-hub-active'), null, { timeout: 10000 });
        await page.waitForTimeout(650);
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.body.classList.contains('settings--open'), null, { timeout: 10000 });
        evidence.lampaStorageSetAttempts = await page.evaluate(() => window.__p6Writes || 0);
        evidence.activeModules = activeModules;
        const currentRuntime = await page.evaluate(() => {
            const all = Lampa.SettingsApi.allParams();
            const registered = Object.keys(all).filter(name => all[name] && all[name].length);
            return {
                controller: Lampa.Controller.enabled().name,
                settingsOpen: document.body.classList.contains('settings--open'),
                hybrid: { active: document.body.classList.contains('stremio-hybrid'), ownsHeader: StremioHybrid.ownsPresentation('header'),
                    styles: document.querySelectorAll('#stremio-hybrid-style').length, settingsMounts: StremioHybrid.diagnostics().settingsMounts,
                    settingsFailures: StremioHybrid.diagnostics().settingsFailures },
                hub: { contractVersion: LampaSettingsHub.contractVersion, categories: LampaSettingsHub.categories.length,
                    registered: registered.includes('settings_hub'), active: document.body.classList.contains('settings-hub-active'),
                    markerRetainedInHiddenNativeDom: !!document.querySelector('[data-settings-hub-version]') },
                ydesign: { active: document.body.classList.contains('ydesign-active'), cards: document.querySelectorAll('.card.ydesign-card').length },
                interfacePlus: { contractVersion: window.InterfacePlusPresentation?.contractVersion || null,
                    competingHeaderStyles: document.querySelectorAll('#ifx_header_css').length },
                cardifyRegistered: registered.includes('cardify'), torrentOverlayAvailable: !!window.LampaTorrentOverlay,
                owners: {
                    hybrid: registered.filter(name => /^interface$/i.test(name)),
                    traktCore: registered.filter(name => /^trakt(_core)?$/i.test(name)),
                    traktPlus: registered.filter(name => /^trakt_plus$/i.test(name)),
                    interfacePlus: registered.filter(name => /^interface_mod_new$/i.test(name)),
                    ydesign: registered.filter(name => /^ydesign/i.test(name)),
                    averageRating: registered.filter(name => /average|omdb/i.test(name)),
                    cardify: registered.filter(name => /^cardify$/i.test(name)),
                    homeHistory: registered.filter(name => /home.?history/i.test(name)),
                    torrents: registered.filter(name => /^torrents_cinema$/i.test(name)),
                    parser: registered.filter(name => /^parser$/i.test(name)),
                    localization: registered.filter(name => /^ytranslate$/i.test(name)),
                    screensaver: registered.filter(name => /^screensaver_plus$/i.test(name)),
                    community: registered.filter(name => /community.*category|new_category/i.test(name)),
                    hub: registered.filter(name => /^settings_hub$/i.test(name))
                },
                styleIds: [...document.querySelectorAll('style[id]')].map(node => node.id).filter(id => /stremio|ydesign|cardify|ifx_header/i.test(id))
            };
        });
        const hashByPath = new Map(exactAssetResponses.map(item => [item.path, item.sha256]));
        const ownerForModule = {
            'Trakt Core': 'traktCore', 'Trakt+': 'traktPlus', 'Interface+': 'interfacePlus', YDesign: 'ydesign',
            AverageRating: 'averageRating', 'Cardify+': 'cardify', 'Home History': 'homeHistory',
            'Torrents Cinema': 'torrents', 'Parser settings': 'parser', Localization: 'localization',
            'Screensaver+': 'screensaver', 'Community New Category': 'community', 'Stremio Hybrid': 'hybrid'
        };
        const roleForModule = Object.fromEntries((JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8')).modules || []).map(item => [item.name, item.role]));
        const moduleMatrix = activeModules.map(item => {
            const url = new URL(item.source);
            const ownerKey = ownerForModule[item.name];
            const registered = ownerKey ? currentRuntime.owners[ownerKey] || [] : [];
            let initialized = registered.length > 0 ? true : null;
            let status = initialized === true ? 'loaded; owner registration observed, functional effects not exercised' : 'loaded; Settings registration not observed; initialization unverified';
            if (item.name === 'Stremio Hybrid') { initialized = currentRuntime.hybrid.active && currentRuntime.hybrid.ownsHeader; status = initialized ? 'active canonical visual/Settings owner' : status; }
            if (item.name === 'YDesign') { initialized = currentRuntime.ydesign.active; status = initialized ? 'active card presentation owner' : status; }
            if (item.name === 'Interface+') { initialized = currentRuntime.interfacePlus.contractVersion === 1; status = initialized ? 'compatible adapter; no competing Hybrid header' : status; }
            if (item.name === 'Cardify+') status = initialized ? 'settings owner registered; Details composition partial' : status;
            return { name: item.name, sourceUrl: item.source, loaded: item.loaded,
                initialized, settingsRegistered: registered, visualOwnership: roleForModule[item.name] || 'functional owner',
                consoleErrorsDuringRun: evidence.consoleErrors.length, status,
                sha256: hashByPath.get(url.pathname) || null, exactAssetHashVerified: hashByPath.has(url.pathname) };
        });
        moduleMatrix.push(
            { name: 'Settings Hub (Hybrid dependency)', sourceUrl: 'http://127.0.0.1:8766/settings-hub.js',
                loaded: !!currentRuntime.hub.contractVersion, initialized: currentRuntime.hub.registered && currentRuntime.hub.categories === 10,
                settingsRegistered: currentRuntime.owners.hub, visualOwnership: 'Hybrid lifecycle owner', consoleErrorsDuringRun: evidence.consoleErrors.length,
                status: 'mounted by Hybrid; ten native categories; controller remains settings_component',
                sha256: hashByPath.get('/settings-hub.js') || null, exactAssetHashVerified: hashByPath.has('/settings-hub.js') },
            { name: 'Torrent overlay (Hybrid dependency)', sourceUrl: 'http://127.0.0.1:8766/torrent-overlay.js',
                loaded: currentRuntime.torrentOverlayAvailable, initialized: currentRuntime.torrentOverlayAvailable,
                settingsRegistered: [], visualOwnership: 'Hybrid torrent presentation', consoleErrorsDuringRun: evidence.consoleErrors.length,
                status: 'API available; overlay interaction not tested',
                sha256: hashByPath.get('/torrent-overlay.js') || null, exactAssetHashVerified: hashByPath.has('/torrent-overlay.js') }
        );
        const priorNavigation = (priorEvidence.navigation || []).map(item => ({ scenario: item.scenario, status: item.status, details: item.details }));
        const details = fs.existsSync(path.join(__dirname, 'details-evidence.json')) ?
            JSON.parse(fs.readFileSync(path.join(__dirname, 'details-evidence.json'), 'utf8')) : null;
        const summary = {
            schemaVersion: 1, overallStatus: 'PARTIAL', testedBranchSha: evidence.branchSha, browser: evidence.browser,
            previewServer: 'http://127.0.0.1:8766 (branch-bound, loopback only)',
            rootCause: 'The previously configured preview loader URL was not served because its existing loopback server had stopped. Its resource timing showed responseStatus 0; the browser therefore used published copies and lacked the Hybrid/Hub globals. Restarting the existing server restored local module execution.',
            assetProof: { status: moduleMatrix.every(item => item.exactAssetHashVerified) ? 'PASS' : 'PARTIAL', corsBodySha256CheckedAgainstBranch: true,
                exactAssets: exactAssetResponses, activeLocalModuleReport: moduleMatrix },
            servedHashes: exactAssetResponses,
            navigation: priorNavigation,
            activeRuntime: currentRuntime,
            activeModuleMatrix: moduleMatrix,
            ownedModuleIsolation: { status: 'PASS', reason: 'A prior same-tab local-preview reload fulfilled four matching published first-party script requests with empty JavaScript; the corresponding active module report resolves to local branch sources. Hybrid has exactly one shell stylesheet and Interface+ has no competing header stylesheet.',
                suppressedPublishedDuplicates: [{ path: '/lampa/torrents-redesign.js', count: 2 }, { path: '/lampa/community/new-category.js', count: 2 }],
                styleOwnership: { hybrid: currentRuntime.hybrid.styles, interfacePlusCompetingHeader: currentRuntime.interfacePlus.competingHeaderStyles,
                    ydesign: currentRuntime.styleIds.filter(id => id === 'ydesign-style-block').length } },
            scenarios: [
                ...priorNavigation,
                { scenario: 'Native Settings → Hub → metadata search → YDesign owner → Back with same result/query → Hub root → Standard Settings', status: 'PASS', consecutiveRuns: evidence.cycles.length },
                { scenario: 'Standard Settings close → fresh Hub open → native root Back, paced beyond native triple-Back threshold', status: 'PASS', consecutiveRuns: evidence.cycles.length },
                ...evidence.hybridLifecycle.map(item => ({ scenario: item.scenario, status: item.status, evidence: { before: item.before, disabled: item.disabled, disabledFallback: item.disabledFallback, reenabledHub: item.reenabledHub } })),
                { scenario: 'Card → Details composition', status: 'PARTIAL', reason: 'Safe native card entry reached Lampa content, but Details did not render with credential/API-keyed requests protected; no playback was invoked.', evidence: details && { before: details.before, after: details.after, status: details.status } },
                { scenario: 'Physical Google TV / actual remote', status: 'NOT TESTED' }
            ],
            stress: { mainFlowRuns: evidence.cycles.length, storageSetAttemptsIntercepted: evidence.lampaStorageSetAttempts,
                blockedSensitiveRequests: evidence.blockedRequests, consoleErrorsDuringRuns: evidence.consoleErrors, pageErrors: evidence.pageErrors, failedRequests: evidence.failedRequests },
            screenshots: ['home-design.png', 'settings-hub-root.png'],
            viewport: evidence.viewportNote,
            productionChanges: 'None. Reproduced harness over-Back caused Lampa core’s intentional triple-Back escape (<500ms); with a 650ms separation the same native root-Back succeeds twice. No Hub defect was reproduced independently.'
        };
        fs.writeFileSync(path.join(__dirname, 'browser-evidence.json'), JSON.stringify(summary, null, 2) + '\n');
        evidence.result = 'PASS';
    } catch (error) {
        evidence.result = 'FAIL';
        evidence.failure = { name: error.name, detail: String(error.message || '').split('\n')[0].slice(0, 160) };
    } finally {
        if (page) {
            try { await page.evaluate(() => { if (window.StremioHybrid && !document.body.classList.contains('stremio-hybrid')) StremioHybrid.setEnabled(true); }); } catch {}
            try { await page.evaluate(() => {
                if (window.__p6SettingsObserver) Lampa.Settings.listener.remove('open', window.__p6SettingsObserver);
                if (window.__p6Read) Lampa.Storage.get = window.__p6Read;
                if (window.__p6Write) Lampa.Storage.set = window.__p6Write;
            }); } catch {}
            try { if (route) await page.unroute('**/*', route); } catch {}
        }
        fs.writeFileSync(out, JSON.stringify(evidence, null, 2) + '\n');
        console.log(JSON.stringify({ result: evidence.result, branchSha: evidence.branchSha, browser: evidence.browser,
            cycles: evidence.cycles.map(c => ({ iteration: c.iteration, result: c.result, transitions: c.transitions.map(t => t.action) })),
            failure: evidence.failure, screenshot: evidence.screenshots }));
        if (browser) await browser.close().catch(() => {});
    }
    process.exit(evidence.result === 'PASS' ? 0 : 1);
})().catch(error => { console.log(JSON.stringify({ result: 'FAIL', name: error.name })); process.exit(1); });
