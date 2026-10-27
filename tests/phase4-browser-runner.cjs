'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/../audit/settings/phase6-browser/run-phase4-startup.cjs','utf8');

test('Phase 4 browser runner attaches only to the authorized existing profile and tab',()=>{
 assert(source.includes("chromium.connectOverCDP('http://127.0.0.1:9222')"));
 assert(source.includes("p.url().startsWith(origin)"));
 assert(source.includes("assert.equal(pages.length, 1"));
 assert(!/chromium\.(launch|launchPersistentContext)\s*\(/.test(source));
 assert(!/\.new(Context|Page)\s*\(/.test(source));
 assert(!/browser\.close\s*\(/.test(source));
});

test('runner uses the full default deferred graph and blocks Trakt auth/API calls',()=>{
 for(const file of ['trakt/trakt.js','trakt/trakt-plus.js','providers/torrent-search.js','media/average-rating.js','ui/cardify-plus.js','localization/translate.js'])assert(source.includes(file));
 assert(source.includes("url.hostname === 'api.trakt.tv'"));
 assert(source.includes("url.hostname === 'auth.trakt.tv'"));
 assert(source.includes('duplicateOwnModulePaths.push(url.origin + url.pathname)'));
 assert(!source.includes("LAMPA_PLUGINS_LIST = ['ui/cardify-plus.js']"));
});

test('all temporary instrumentation has checked cleanup and original tab/process survival checks',()=>{
 for(const token of ["page.unroute('**/*', routeHandler)","page.off('console', pageConsoleHandler)","page.off('pageerror', pageErrorHandler)",'paintObserver.disconnect()','observer.disconnect()','window.removeEventListener(\'error\', onError)','Page.removeScriptToEvaluateOnNewDocument','cdp.detach()','cleanupFailures.length','dedicated Chromium process survives cleanup','existing tab count is preserved'])assert(source.includes(token),token);
 assert(source.includes("startup-probe.js"));
 assert(source.includes("phase7Startup: window.__lampaPhase7Probe?.snapshot()"));
 assert(source.includes("page.evaluate(() => window.__lampaPhase7Probe?.stop()"));
 assert(!/cleanup\([^\n]*\.catch\(/.test(source));
});
