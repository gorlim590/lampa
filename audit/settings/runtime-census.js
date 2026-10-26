/* Read-only, explicitly requested Settings census. No values, writers or probes. */
(function (root, factory) {
    'use strict';
    var api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else if (root && root.document && /(?:^|[?&])settings_audit=1(?:&|$)/.test(root.location.search)) {
        var result = api.capture(root.Lampa, root.document);
        var node = root.document.getElementById('lampa-settings-census');
        if (!node) { node = root.document.createElement('script'); node.type = 'application/json'; node.id = 'lampa-settings-census'; root.document.body.appendChild(node); }
        node.textContent = JSON.stringify(result);
    }
})(typeof window !== 'undefined' ? window : null, function () {
    'use strict';
    function text(value) {
        return typeof value === 'string' ? value.replace(/https?:\/\/\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,}/ig, '[redacted]').replace(/((?:token|api.?key|password|пароль|ключ)\s*[:=])\s*\S+/ig, '$1 [redacted]').replace(/<[^>]*>/g, '').slice(0, 240) : '';
    }
    function key(value) {
        return typeof value === 'string' ? value.replace(/_profile_.+$/, '_profile_[redacted]').replace(/_[a-f0-9]{24,}$/i, '_[redacted]').replace(/https?:\/\/\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,}/ig, '[redacted]').slice(0, 180) : '';
    }
    function safeDefault(value, name) {
        if (/key|token|secret|password|auth|account|profile|url|server|endpoint|folder|path/i.test(name)) return '[redacted]';
        if (typeof value === 'boolean' || typeof value === 'number' && isFinite(value) || value === null) return value;
        if (typeof value === 'string' && /^(true|false|yes|no|on|off|auto|default|none|uk|en|vertical|overlay|inline|\d+(?:\.\d+)?)$/.test(value)) return value;
        return '[not exported]';
    }
    function hash(value) {
        var h = 2166136261;
        for (var i = 0; i < value.length; i++) h = ((h ^ value.charCodeAt(i)) * 16777619) >>> 0;
        return h.toString(16);
    }
    function sourceFingerprint(value) {
        // Code identity only: remove string literals/comments before hashing.
        return hash(String(value).replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g, '""').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '').replace(/\s+/g, ''));
    }
    function handlerFingerprint(fn) {
        return typeof fn === 'function' ? sourceFingerprint(Function.prototype.toString.call(fn)) : '';
    }
    function htmlFields(html) {
        var rows = [], source = String(html || ''), starts = [], tags = /<div\b[^>]*>/ig, match;
        while ((match = tags.exec(source))) {
            var classes = match[0].match(/class=["']([^"']*)["']/i);
            if (classes && classes[1].split(/\s+/).indexOf('settings-param') !== -1) starts.push(match.index);
        }
        var parts = starts.map(function (start, index) { return source.slice(start, starts[index + 1] || source.length); });
        parts.forEach(function (part) {
            var tag = part.match(/^<div\b[^>]*>/i);
            if (!tag) return;
            var name = tag[0].match(/data-name=["']([^"']+)["']/i), type = tag[0].match(/data-type=["']([^"']+)["']/i);
            var label = part.match(/class=["']settings-param__name["'][^>]*>([\s\S]*?)<\/div>/i);
            rows.push({ name: name ? key(name[1]) : '', type: type ? text(type[1]) : 'static', label: label ? text(label[1]) : '', capability: /\bis--android\b/.test(tag[0]) ? 'android' : /\bis--player\b/.test(tag[0]) ? 'native-player' : 'not inspected' });
        });
        return rows;
    }
    function capture(L, doc) {
        var started = Date.now(), result = { schema: 2, generatedAt: new Date().toISOString(), currentValues: '[not read]', settings: [], components: [], scripts: [], gaps: [], metrics: {} };
        if (!L || !L.SettingsApi || typeof L.SettingsApi.allParams !== 'function' || typeof L.SettingsApi.allComponents !== 'function') {
            result.gaps.push('SettingsApi read-only enumeration unavailable'); return result;
        }
        var all = L.SettingsApi.allParams() || {}, components = L.SettingsApi.allComponents() || {}, nativeNames = {};
        Object.keys(components).forEach(function (id) { nativeNames[id] = true; result.components.push({ id: key(id), label: text(components[id].name) }); });
        try {
            var main = L.Settings && L.Settings.main && L.Settings.main(), view = main && main.render(), root = view && (view[0] || view);
            if (root && root.querySelectorAll) Array.prototype.forEach.call(root.querySelectorAll('.settings-folder[data-component]'), function (folder) {
                var id = folder.getAttribute('data-component'); nativeNames[id] = true;
                if (!components[id]) result.components.push({ id: key(id), label: text((folder.querySelector('.settings-folder__name') || {}).textContent) });
            });
        } catch (e) { result.gaps.push('Native folder metadata unavailable'); }
        function append(component, row, origin, index) {
            var name = key(row.name), label = text(row.label), id = key(component) + ':' + (name || 'anonymous-' + hash(label + ':' + row.type));
            result.settings.push({ id: id, component: key(component), key: name || '[handler-owned]', label: label, type: text(row.type), registration: origin, ordinal: index, registeredDefault: row.defaultValue, currentValue: '[not read]', onChange: !!row.onChange, onRender: !!row.onRender, onChangeFingerprint: row.onChangeFingerprint || '', onRenderFingerprint: row.onRenderFingerprint || '', capability: row.capability || 'not inspected', status: 'Not verified' });
        }
        Object.keys(all).forEach(function (component) {
            nativeNames[component] = true;
            (Array.isArray(all[component]) ? all[component] : []).forEach(function (def, index) {
                var p = def.param || {}, f = def.field || {};
                append(component, { name: p.name, label: f.name, type: p.type, defaultValue: safeDefault(p.default, p.name || f.name || ''), onChange: typeof def.onChange === 'function', onRender: typeof def.onRender === 'function', onChangeFingerprint: handlerFingerprint(def.onChange), onRenderFingerprint: handlerFingerprint(def.onRender) }, 'SettingsApi', index);
            });
        });
        Object.keys(nativeNames).forEach(function (component) {
            try {
                var html = L.Template && L.Template.get('settings_' + component, {}, true);
                if (typeof html !== 'string') { result.gaps.push('Template not a raw string: ' + key(component)); return; }
                htmlFields(html).forEach(function (row, index) { row.defaultValue = '[native binding; not read]'; append(component, row, 'template', index); });
            } catch (e) { result.gaps.push('Template unavailable: ' + key(component)); }
        });
        if (doc && doc.querySelectorAll) Array.prototype.forEach.call(doc.querySelectorAll('script[src]'), function (node) {
            var path = node.getAttribute('src').split(/[?#]/)[0], parsed = path.match(/^https?:\/\/(?:[^/@]+@)?([^/?#]+)(\/[^?#]*)?/i);
            result.scripts.push(parsed ? { host: parsed[1], path: parsed[2] || '/' } : { path: text(path) });
        });
        result.metrics = { options: result.settings.length, components: result.components.length, captureMs: Date.now() - started, directStorageReads: 0, directStorageWrites: 0, serviceProbes: 0 };
        result.gaps.push('Conditional/onRender DOM, storage-only settings and individual handlers require source attribution and targeted verification');
        return result;
    }
    return { capture: capture, htmlFields: htmlFields, safeDefault: safeDefault, sourceFingerprint: sourceFingerprint };
});
