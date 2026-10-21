/* Lampa AI Diagnostics — safe read-only runtime reporter.
 * Configure the bridge URL in window.LampaAIDiagnostics.configure().
 * Never sends API keys, local storage values, or Trakt tokens.
 */
(function () {
    'use strict';
    if (window.LampaAIDiagnostics) return;

    var state = { bridgeUrl: '', bridgeToken: '', lastReport: null };
    var MAX_ERRORS = 80;
    var errors = [];

    function safeString(value, limit) {
        try { return String(value == null ? '' : value).slice(0, limit || 500); }
        catch (e) { return '[unavailable]'; }
    }

    function redact(value) {
        return safeString(value, 2000)
            .replace(/(token|apikey|api_key|authorization|password|secret)(\s*[:=]\s*)[^\s&,;]+/ig, '$1$2[REDACTED]')
            .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/ig, 'Bearer [REDACTED]')
            .replace(/[?&](api_key|apikey|token|access_token)=[^&\s]+/ig, '?$1=[REDACTED]');
    }

    window.addEventListener('error', function (event) {
        errors.push({
            type: 'error',
            message: redact(event.message || 'Unknown error'),
            source: safeString(event.filename, 300),
            line: Number(event.lineno) || 0,
            column: Number(event.colno) || 0,
            at: new Date().toISOString()
        });
        if (errors.length > MAX_ERRORS) errors.shift();
    });

    window.addEventListener('unhandledrejection', function (event) {
        errors.push({
            type: 'unhandledrejection',
            message: redact(event.reason && (event.reason.message || event.reason) || 'Unknown rejection'),
            at: new Date().toISOString()
        });
        if (errors.length > MAX_ERRORS) errors.shift();
    });

    function pluginFlags() {
        var names = [
            'YDesignLoaded', 'trakt_plus_ready', 'CardifyLoaded', 'InterfacePlusLoaded',
            'PosterStatusLoaded', 'TVStatusLoaded'
        ];
        var result = {};
        names.forEach(function (name) {
            result[name] = typeof window[name] === 'boolean' ? window[name] :
                (window[name] == null ? false : typeof window[name]);
        });
        return result;
    }

    function collect() {
        var report = {
            schema: 'lampa-ai-diagnostics/v1',
            createdAt: new Date().toISOString(),
            app: {
                userAgent: safeString(navigator.userAgent, 300),
                language: safeString(navigator.language, 30),
                viewport: { width: Number(window.innerWidth) || 0, height: Number(window.innerHeight) || 0 },
                online: navigator.onLine !== false
            },
            runtime: {
                lampaAvailable: !!window.Lampa,
                jqueryAvailable: !!window.jQuery,
                pluginFlags: pluginFlags(),
                registeredPlugins: []
            },
            errors: errors.slice(-MAX_ERRORS)
        };

        try {
            if (window.Lampa && Lampa.Manifest && typeof Lampa.Manifest.app_digital === 'function') {
                report.app.version = safeString(Lampa.Manifest.app_digital(), 80);
            }
        } catch (e) { /* optional metadata */ }

        try {
            if (window.Lampa && Lampa.Plugin && typeof Lampa.Plugin.get === 'function') {
                var list = Lampa.Plugin.get();
                if (Array.isArray(list)) {
                    report.runtime.registeredPlugins = list.slice(0, 100).map(function (item) {
                        return safeString(item && (item.name || item.url || item.id), 200);
                    });
                }
            }
        } catch (e) { /* API differs across Lampa versions */ }

        state.lastReport = report;
        return report;
    }

    function configure(options) {
        options = options || {};
        if (typeof options.bridgeUrl === 'string') state.bridgeUrl = options.bridgeUrl.replace(/\/+$/, '');
        if (typeof options.bridgeToken === 'string') state.bridgeToken = options.bridgeToken;
        return { bridgeConfigured: !!state.bridgeUrl, tokenConfigured: !!state.bridgeToken };
    }

    function exportReport() {
        var report = collect();
        var json = JSON.stringify(report, null, 2);
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(json);
            }
        } catch (e) { /* TV clipboard APIs are not universal */ }
        return json;
    }

    function sendReport() {
        if (!state.bridgeUrl) return Promise.reject(new Error('Bridge URL is not configured'));
        if (!state.bridgeToken) return Promise.reject(new Error('Bridge token is not configured'));
        return fetch(state.bridgeUrl + '/api/diagnostics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + state.bridgeToken
            },
            body: JSON.stringify(collect())
        }).then(function (response) {
            if (!response.ok) throw new Error('Bridge returned HTTP ' + response.status);
            return response.json();
        });
    }

    window.LampaAIDiagnostics = {
        version: '0.1.0',
        configure: configure,
        collect: collect,
        exportReport: exportReport,
        sendReport: sendReport,
        getErrors: function () { return errors.slice(); },
        clearErrors: function () { errors = []; }
    };
})();
