(function () {
    'use strict';
    if ((window.SeasonBadgePlugin && window.SeasonBadgePlugin.__initialized) || window.__seasonBadgeLoading) return;
    window.__seasonBadgeLoading = true;
    // Сумісна точка входу для старих налаштувань: вся логіка в media/seasons-info.js
    Lampa.Utils.putScriptAsync([
        'https://gorlim590.github.io/lampa/media/seasons-info.js'
    ], function () { window.__seasonBadgeLoading = false; }, function () { window.__seasonBadgeLoading = false; });
})();
