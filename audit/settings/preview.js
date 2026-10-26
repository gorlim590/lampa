/* Explicit branch preview in an existing Lampa tab. No preference/account writes. */
(function () {
    'use strict';
    var script = document.currentScript, url = script && script.src;
    if (!url || !/(?:[?&])settings_preview=1(?:&|$)/.test(url) || window.LampaSettingsPreview) return;
    window.LampaSettingsPreview = true;
    var base = new URL('../../', url), L = window.Lampa;
    function fail() { L.Noty.show('Попередній перегляд налаштувань не завантажено. Штатні налаштування доступні; перезавантажте Lampa для відновлення початкової теми.'); }
    function load(path, done) { L.Utils.putScriptAsync([new URL(path, base).href], done, fail); }
    function start() {
        var hybrid = window.StremioHybrid;
        if (hybrid && !hybrid.settingsHubVersion && typeof hybrid.destroy === 'function') {
            // Supported lifecycle teardown, then the exact same branch's updated adapter.
            hybrid.destroy();
            load('ui/stremio-hybrid.js', function () { load('ui/settings-hub.js', function () {}); });
        } else load('ui/settings-hub.js', function () {});
    }
    if (window.appready) start();
    else L.Listener.follow('app', function ready(e) { if (e.type === 'ready') { L.Listener.remove('app', ready); start(); } });
})();
