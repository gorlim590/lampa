(function(){
    'use strict';

    function start() {
        var pluginUrl = Lampa.Manifest.app_digital >= 300
            ? 'https://gorlim590.github.io/lampa/third-party/levende/v3/custom-favs.js'
            : 'https://gorlim590.github.io/lampa/third-party/levende/v2/custom-favs.js';

        Lampa.Utils.putScriptAsync([pluginUrl], function () { });
    }

    if (window.appready) {
        start();
    } else {
        Lampa.Listener.follow('app', function() {
            start();
        });
    }
})();