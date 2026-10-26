/* Temporary manual preview for the normal Lampa browser. Remove this extension after verification. */
(function () {
    'use strict';
    var source = new URL('../ui/stremio-hybrid.js', document.currentScript.src);
    source.search = '';source.hash = '';
    function preview() {
        setTimeout(function () {
            if (window.StremioHybrid) window.StremioHybrid.destroy();
            // Main may already have loaded an older helper. Replace it only after
            // Hybrid disposed its owners, so the pinned preview tests its own bytes.
            delete window.LampaTorrentOverlay;
            var style = document.getElementById('sh-torrent-overlay-style');
            if (style) style.remove();
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
