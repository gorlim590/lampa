(function () {
    'use strict';
    if (window.LampaPhase6PreviewStarted || !window.Lampa || !Lampa.Utils || !Lampa.Utils.putScriptAsync) return;
    window.LampaPhase6PreviewStarted = true;
    var manifestUrl = new URL('manifest.json', document.currentScript.src).href;
    var report = window.LampaPhase6ModuleReport = { started: true, finished: false, modules: [] };
    function countComponents() {
        try { return Object.keys(Lampa.SettingsApi.allComponents()).length; } catch (e) { return null; }
    }
    function run(manifest) {
        var index = 0;
        function next() {
            if (index >= manifest.modules.length) { report.finished = true; return; }
            var item = manifest.modules[index++], row = { name: item.name, path: item.path, before: countComponents() };
            report.modules.push(row);
            var url = new URL(item.path, manifestUrl).href;
            row.sourceUrl = new URL(url).origin + new URL(url).pathname;
            Lampa.Utils.putScriptAsync([url], function () {
                row.loaded = true;
                row.after = countComponents();
                next();
            }, function () {
                row.loaded = false;
                row.after = countComponents();
                next();
            });
        }
        next();
    }
    fetch(manifestUrl, { credentials: 'omit', cache: 'no-store' }).then(function (response) {
        if (!response.ok) throw new Error('Local Phase 6 manifest unavailable');
        return response.json();
    }).then(run).catch(function () { report.finished = true; report.error = 'local manifest unavailable'; });
})();
