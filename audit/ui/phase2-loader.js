/* Opt-in verification entry: replace ONLY a temporary native loader URL, then restore it.
 * Runs the actual loader/services from the same immutable revision. No storage writes. */
(function () {
    'use strict';
    if (window.LampaLoaderStarted) return;
    var root = new URL('../../', document.currentScript.src);
    var hadBase = Object.prototype.hasOwnProperty.call(window, 'LAMPA_PLUGINS_BASE');
    var base = window.LAMPA_PLUGINS_BASE;
    window.LAMPA_PLUGINS_BASE = root.href;
    var script = document.createElement('script');
    script.src = new URL('loader.js', root).href;
    function restore() {
        if (hadBase) window.LAMPA_PLUGINS_BASE = base;
        else delete window.LAMPA_PLUGINS_BASE;
        script.onload = script.onerror = null;
    }
    script.onload = restore;
    script.onerror = restore;
    document.head.appendChild(script);
})();
