/* Temporary, test-only startup instrumentation. Never reads Storage or content values. */
(function (root, factory) {
    'use strict';
    if (typeof module === 'object' && module.exports) module.exports = factory;
    else factory(root, root.document);
})(typeof window !== 'undefined' ? window : globalThis, function installLampaStartupProbe(win, doc) {
    'use strict';
    if (!win || !doc || win.__lampaPhase7Probe) throw new Error('Startup probe requires a fresh document');

    var started = win.performance && typeof win.performance.now === 'function' ? win.performance.now() : Date.now();
    var marks = Object.create(null), resources = [], longTasks = [], removers = [], observers = [], frames = [];
    var support = { lampaGlobal: false, appready: false, contentRows: false, mutationObserver: false, longTaskObserver: false, resourceObserver: false };
    var active = true, maxResources = 250, maxLongTasks = 100;

    function now() {
        try { if (win.performance && typeof win.performance.now === 'function') return win.performance.now(); } catch (ignore) {}
        return Date.now();
    }
    function mark(name, detail) {
        if (!active || Object.prototype.hasOwnProperty.call(marks, name)) return;
        marks[name] = { ms: Math.round((now() - started) * 10) / 10 };
        if (detail && typeof detail === 'object') marks[name].detail = detail;
    }
    function getController() {
        try {
            var api = win.Lampa && win.Lampa.Controller;
            var enabled = api && typeof api.enabled === 'function' && api.enabled();
            return enabled && typeof enabled.name === 'string' ? enabled.name : '';
        } catch (ignore) { return ''; }
    }
    function visible(node) {
        if (!node || typeof node.getClientRects !== 'function') return false;
        try {
            var rects = node.getClientRects();
            if (!rects || !rects.length || !(rects[0].width > 0 && rects[0].height > 0)) return false;
            if (typeof node.checkVisibility === 'function') return node.checkVisibility();
            return true;
        } catch (ignore) { return false; }
    }
    function isHomeCard(node) {
        try {
            if (!node || !node.matches || !node.matches('.card') || !node.closest('.items-line')) return false;
            var activity = win.Lampa && win.Lampa.Activity && typeof win.Lampa.Activity.active === 'function' && win.Lampa.Activity.active();
            return !activity || !activity.component || activity.component === 'main';
        } catch (ignore) { return false; }
    }
    function inspectNode(node) {
        if (!node || node.nodeType !== 1) return;
        var candidates = [];
        if (node.matches && (node.matches('.card, .ydesign-vertical') || node.matches('.items-line'))) candidates.push(node);
        if (node.querySelectorAll) {
            try {
                var found = node.querySelectorAll('.card, .ydesign-vertical, .items-line');
                for (var i = 0; i < found.length; i++) candidates.push(found[i]);
            } catch (ignore) {}
        }
        for (var j = 0; j < candidates.length; j++) {
            var item = candidates[j];
            if (item.matches && item.matches('.card') && !item.matches('.ydesign-vertical') && isHomeCard(item) && visible(item)) mark('firstNativeHomeCardDom');
            if (item.matches && item.matches('.ydesign-vertical') && isHomeCard(item) && visible(item)) mark('firstYDesignHomeCardDom');
            if (item.matches && item.matches('.card.focus') && isHomeCard(item) && visible(item)) {
                var controller = getController();
                if (controller) mark('firstHomeControllerFocus', { controller: controller });
            }
        }
        try {
            if (doc.body && doc.body.classList && doc.body.classList.contains('stremio-hybrid')) mark('hybridShellApplied');
        } catch (ignore) {}
    }
    function inspectShell() {
        try { if (doc.body && doc.body.classList && doc.body.classList.contains('stremio-hybrid')) mark('hybridShellApplied'); } catch (ignore) {}
    }
    function inspectDocument() {
        inspectNode(doc.documentElement);
        if (doc.body && doc.body !== doc.documentElement) inspectNode(doc.body);
    }
    function onMutation(records) {
        for (var i = 0; i < records.length; i++) {
            var record = records[i];
            if (record.type === 'attributes') inspectNode(record.target);
            for (var j = 0; record.addedNodes && j < record.addedNodes.length; j++) inspectNode(record.addedNodes[j]);
        }
        inspectShell();
    }
    function addEvent(target, name, listener, options) {
        if (!target || !target.addEventListener) return;
        target.addEventListener(name, listener, options);
        removers.push(function () { target.removeEventListener(name, listener, options); });
    }
    function tapProperty(target, key, onSet) {
        if (!target) return false;
        var descriptor;
        try { descriptor = Object.getOwnPropertyDescriptor(target, key); } catch (ignore) { return false; }
        if (descriptor && (!descriptor.configurable || descriptor.get || descriptor.set || descriptor.writable === false)) return false;
        var value = descriptor ? descriptor.value : target[key];
        try {
            Object.defineProperty(target, key, {
                configurable: true,
                enumerable: descriptor ? descriptor.enumerable : true,
                get: function () { return value; },
                set: function (next) { value = onSet ? onSet(next) : next; }
            });
        } catch (ignore) { return false; }
        removers.push(function () {
            var current;
            try { current = target[key]; } catch (ignore) { return; }
            while (current && current.__lampaPhase7Wrapper && current.__lampaPhase7Original) current = current.__lampaPhase7Original;
            if (descriptor) Object.defineProperty(target, key, Object.assign({}, descriptor, { value: current }));
            else Object.defineProperty(target, key, { configurable: true, enumerable: true, writable: true, value: current });
        });
        if (value !== undefined && onSet) value = onSet(value);
        return true;
    }
    function hasResults(value) { return !!(value && typeof value === 'object' && Array.isArray(value.results)); }
    function instrumentContentRows(rows) {
        if (!rows || typeof rows !== 'object') return rows;
        var ok = tapProperty(rows, 'call', function (original) {
            if (typeof original !== 'function' || original.__lampaPhase7Wrapper) return original;
            var wrapped = function (screen, params, calls) {
                if (!active) return original.apply(this, arguments);
                var isMain = screen === 'main';
                if (isMain) mark('firstHomeContentRowsRequest');
                var result = original.apply(this, arguments);
                if (isMain && Array.isArray(calls)) {
                    for (var i = 0; i < calls.length; i++) {
                        if (typeof calls[i] !== 'function' || calls[i].__lampaPhase7Callback) continue;
                        (function (callback, index, target) {
                            var callbackProbe = function (deliver) {
                                var args = Array.prototype.slice.call(arguments);
                                if (typeof deliver === 'function') {
                                    args[0] = function (data) {
                                        if (hasResults(data)) mark('firstHomeDataCallback', { resultCount: data.results.length });
                                        return deliver.apply(this, arguments);
                                    };
                                } else if (hasResults(deliver)) mark('firstHomeDataCallback', { resultCount: deliver.results.length });
                                var returned = callback.apply(this, args);
                                if (target[index] === callbackProbe) target[index] = callback;
                                return returned;
                            };
                            callbackProbe.__lampaPhase7Callback = true;
                            target[index] = callbackProbe;
                        })(calls[i], i, calls);
                    }
                }
                return result;
            };
            wrapped.__lampaPhase7Wrapper = true;
            wrapped.__lampaPhase7Original = original;
            return wrapped;
        });
        if (ok) support.contentRows = true;
        return rows;
    }
    function instrumentLampa(value) {
        if (!value || typeof value !== 'object') return value;
        mark('nativeLampaObjectAvailable');
        var ok = tapProperty(value, 'ContentRows', instrumentContentRows);
        if (ok) support.contentRows = true;
        return value;
    }
    support.lampaGlobal = tapProperty(win, 'Lampa', instrumentLampa);
    support.appready = tapProperty(win, 'appready', function (value) {
        if (value === true) mark('nativeAppready');
        return value;
    });
    if (win.appready === true) mark('nativeAppready');

    addEvent(doc, 'DOMContentLoaded', function () { mark('domContentLoaded'); inspectDocument(); }, { once: true });
    addEvent(doc, 'keydown', function (event) {
        if (!event || !/^Arrow(Up|Down|Left|Right)$/.test(event.key || '') || typeof win.requestAnimationFrame !== 'function') return;
        var before = doc.querySelector && doc.querySelector('.items-line .card.focus');
        if (!before) return;
        var frame = win.requestAnimationFrame(function () {
            frames = frames.filter(function (id) { return id !== frame; });
            var after = doc.querySelector && doc.querySelector('.items-line .card.focus');
            var controller = getController();
            if (after && after !== before && controller && isHomeCard(after) && visible(after)) mark('firstHomeDpadResponse', { key: event.key, controller: controller });
        });
        frames.push(frame);
    }, true);
    if (doc.readyState !== 'loading') mark('domContentLoaded');
    var MutationObserverCtor = win.MutationObserver;
    if (typeof MutationObserverCtor === 'function' && doc.documentElement) {
        try {
            var mutationObserver = new MutationObserverCtor(onMutation);
            mutationObserver.observe(doc.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
            observers.push(mutationObserver); support.mutationObserver = true;
        } catch (ignore) {}
    }
    function observe(type, callback, flag) {
        if (typeof win.PerformanceObserver !== 'function') return;
        try {
            var observer = new win.PerformanceObserver(function (list) {
                var entries = list.getEntries();
                for (var i = 0; i < entries.length; i++) callback(entries[i]);
            });
            observer.observe({ type: type, buffered: true }); observers.push(observer); support[flag] = true;
        } catch (ignore) {}
    }
    observe('longtask', function (entry) {
        if (longTasks.length >= maxLongTasks) return;
        longTasks.push({ startMs: Math.round(entry.startTime * 10) / 10, durationMs: Math.round(entry.duration * 10) / 10 });
    }, 'longTaskObserver');
    var allowedAssets = /(?:^|\/)(?:loader|stremio-hybrid|settings-hub|torrent-overlay|interface-plus|design-optimized|cardify-plus|trakt|trakt-plus|torrent-search|average-rating|translate)\.js$/;
    observe('resource', function (entry) {
        if (resources.length >= maxResources) return;
        var label = '[external]';
        try {
            var url = new URL(entry.name, win.location && win.location.href);
            if ((url.hostname === '127.0.0.1' || url.hostname === 'gorlim590.github.io') && allowedAssets.test(url.pathname)) label = url.pathname;
            else label = url.origin + '/[redacted]';
        } catch (ignore) {}
        resources.push({ label: label, kind: entry.initiatorType || 'other', startMs: Math.round(entry.startTime * 10) / 10, durationMs: Math.round(entry.duration * 10) / 10, responseEndMs: Math.round(entry.responseEnd * 10) / 10 });
    }, 'resourceObserver');
    inspectDocument();

    var api = {
        version: 1,
        support: support,
        snapshot: function () {
            return { version: 1, markers: Object.assign({}, marks), support: Object.assign({}, support), resources: resources.slice(), longTasks: longTasks.slice(), longTaskTotalMs: Math.round(longTasks.reduce(function (sum, item) { return sum + item.durationMs; }, 0) * 10) / 10, longTaskMaxMs: longTasks.reduce(function (max, item) { return Math.max(max, item.durationMs); }, 0) };
        },
        stop: function () {
            if (!active) return [];
            active = false;
            var errors = [];
            frames.forEach(function (frame) { try { win.cancelAnimationFrame(frame); } catch (error) { errors.push('animation-frame:' + (error.name || 'Error')); } });
            frames = [];
            observers.forEach(function (observer) { try { observer.disconnect(); } catch (error) { errors.push('observer:' + (error.name || 'Error')); } });
            removers.reverse().forEach(function (remove) { try { remove(); } catch (error) { errors.push('property-or-event:' + (error.name || 'Error')); } });
            try { if (win.__lampaPhase7Probe === api) delete win.__lampaPhase7Probe; } catch (error) { errors.push('global:' + (error.name || 'Error')); }
            return errors;
        }
    };
    try { Object.defineProperty(win, '__lampaPhase7Probe', { configurable: true, enumerable: false, value: api }); }
    catch (ignore) { win.__lampaPhase7Probe = api; }
    return api;
});
