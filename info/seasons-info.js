(function () {
    'use strict';
    if ((window.SeasonBadgePlugin && window.SeasonBadgePlugin.__initialized) || window.__seasonBadgeLoading) return;
    window.__seasonBadgeLoading = true;
    // Сумісний URL-вхід для адаптера нативних сезонів у media/seasons-info.js
    Lampa.Utils.putScriptAsync([
        'https://gorlim590.github.io/lampa/media/seasons-info.js'
    ], function () { window.__seasonBadgeLoading = false; }, function () { window.__seasonBadgeLoading = false; });
})();
