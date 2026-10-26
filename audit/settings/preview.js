/* Explicit branch preview in an existing Lampa tab. No preference/account writes. */
(function () {
    'use strict';
    var script = document.currentScript, url = script && script.src;
    if (!url || !/(?:[?&])settings_preview=1(?:&|$)/.test(url) || window.LampaSettingsPreview) return;
    var base = new URL('../../', url), L = window.Lampa;
    function fail() { L.Noty.show('Перевірку налаштувань не завантажено. Штатні налаштування Lampa залишаються доступними.'); }
    function load(path, done) { L.Utils.putScriptAsync([new URL(path, base).href], done, fail); }
    function start() {
        var hybrid = window.StremioHybrid;
        if (document.body.classList.contains('stremio-hybrid') && hybrid && !hybrid.settingsHubVersion) {
            L.Noty.show('Перевірку Settings відкладено: потрібен сумісний єдиний UI-власник #79. Чинну тему не змінено.');
            return;
        }
        window.LampaSettingsPreview = true;
        load('ui/settings-hub.js', function () { if(window.LampaSettingsHub)window.LampaSettingsHub.install(L,window.jQuery || window.$,document); });
    }
    if (window.appready) start();
    else L.Listener.follow('app', function ready(e) { if (e.type === 'ready') { L.Listener.remove('app', ready); start(); } });
})();
