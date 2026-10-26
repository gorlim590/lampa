/* Temporary manual preview for the normal Lampa browser. Remove this extension after verification. */
(function () {
    'use strict';
    var source = new URL('../ui/stremio-hybrid.js', document.currentScript.src);
    source.search = '';source.hash = '';
    function preview() {
        setTimeout(function () {
            if (window.StremioHybrid) window.StremioHybrid.destroy();
            Lampa.Utils.putScriptAsync([source.href]);
        }, 1500);
    }
    if (window.appready) preview();
    else {
        var ready = function (event) {
            if (event.type !== 'ready') return;
            Lampa.Listener.remove('app', ready);preview();
        };
        Lampa.Listener.follow('app', ready);
    }
})();
