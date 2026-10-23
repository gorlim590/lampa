"""Reproducible, reviewed local changes to the pinned MIT mirror; no downloads."""
from pathlib import Path

s = Path('vendor/ua-comments/uacoments.upstream.js').read_text()
def replace(old, new):
    global s
    assert old in s, old[:120]
    s = s.replace(old, new, 1)

replace("    'use strict';", """    'use strict';
    // Original: Ярослав / @Yaroslav_Films. MIT mirror: marv2on.
    // See vendor/ua-comments/NOTICE.md and LICENSE. Local lifecycle adapter 1.0.0.
    if (window.UAComments || window.uacomentsy_plugin_started) return;
    var scope = null, instance = null, cache = [], fullHandler = null;
    function stopScope() {
        if (!scope) return;
        var old = scope; old.dead = true; scope = null;
        old.timers.forEach(clearTimeout);
        old.jobs.slice().forEach(function(job) { if (job && job.abort) job.abort(); });
        old.jobs.length = old.timers.length = 0;
    }
    function scopedTimeout(fn, ms) {
        var owner = scope;
        if (!owner || owner.dead) return null;
        var id = setTimeout(function() {
            if (owner) owner.timers = owner.timers.filter(function(n) { return n !== id; });
            if (owner && !owner.dead) fn();
        }, ms);
        if (owner) owner.timers.push(id);
        return id;
    }
    function scopedAjax(options) {
        var owner = scope;
        if (!owner || owner.dead) return;
        var opts = $.extend({}, options), job;
        ['success', 'error', 'complete'].forEach(function(name) {
            var callback = options[name];
            opts[name] = function() {
                if (name === 'complete') owner.jobs = owner.jobs.filter(function(n) { return n !== job; });
                if (!owner.dead && callback) return callback.apply(this, arguments);
            };
        });
        job = $.ajax(opts);
        if (job && job.readyState !== 4) owner.jobs.push(job);
        return job;
    }
    function pageRoot() {
        var active = Lampa.Activity.active();
        return active && active.activity ? $(active.activity.render()) : $();
    }
    window.UAComments = {
        version: '1.0.0',
        state: function() { return {active: !!scope, requests: scope ? scope.jobs.length : 0,
            timers: scope ? scope.timers.length : 0, cacheEntries: cache.length,
            cards: scope ? scope.page.find('.ua-comment-card').length : 0}; },
        destroy: function() {
            if (instance) instance.destroy();
            if (fullHandler) Lampa.Listener.remove('full', fullHandler);
            $('#ua-comments-style').remove();
            // Settings remain registered once; complete unload is by disabling the plugin + reload.
        }
    };
""")
replace("typeof body !== 'string' || body.length < 20", "typeof body !== 'string' || (body.length < 20 && !/^\\s*[\\[{]/.test(body))")
# Only the owner's two AJAX call sites; never replace the global jQuery API.
s = s.replace('            $.ajax({', '            scopedAjax({')
assert s.count('scopedAjax({') == 2
replace('            document.head.appendChild(style);', '''            style.id = 'ua-comments-style';
            style.innerHTML += '\\n.ua-comment-card,.uacom-modal,.uacom-overlay{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;transition:transform 160ms,opacity 160ms!important}\\nbody.stremio-hybrid .ua-comment-card,body.stremio-hybrid .ua-status-card{background:#171820;border:1px solid #30313d;border-radius:.65em;box-shadow:none}body.stremio-hybrid .ua-comment-card.focus{border-color:#b9a6ef;transform:scale(1.025)}body.stremio-hybrid .uacom-modal{background:#16171f;box-shadow:none}.ua-comments-page{flex:0 0 auto;align-self:center;padding:1em;border-radius:.6em;background:#282936}.ua-comments-page.focus{background:#66548b}';
            document.head.appendChild(style);''')
replace("window.Lampa.Listener.follow('full', function(e) {", "fullHandler = function(e) {")
replace("console.error('UaComentsY Listener Error:', err);\n                    }\n                });", "console.error('UaComentsY Listener Error:', err);\n                    }\n                };\n                window.Lampa.Listener.follow('full', fullHandler);")
replace('            UaCommentViewer.close();', '            stopScope();\n            UaCommentViewer.close();')
replace("            $('.ua-comments-root').remove();", "            $('.ua-comments-root').remove();")
# Guard modal focus restoration after a page was destroyed, and cancel its owned timers.
start = s.index('    var UaCommentViewer =')
end = s.index('    function getProxyUrl', start)
s = s[:start] + s[start:end].replace('setTimeout(', 'scopedTimeout(') + s[end:]
replace('var target = targetCard.length ? targetCard[0] : initialCard;', 'var target = targetCard.length ? targetCard[0] : initialCard;\n                if (!target || !document.documentElement.contains(target)) return;')
replace('        this.fetch = function(movie) {\n            var _this = this;', '''        this.fetch = function(movie) {
            var _this = this;
            stopScope();
            var owner = scope = {dead:false, jobs:[], timers:[], page:pageRoot(), offset:0};
            var settings = ['uacom_src_uakino','uacom_src_uaflix','uacom_src_uaserials','uacom_src_kinobaza','uacom_src_kinostrain','uacom_custom_proxies'].map(function(k) { return Lampa.Storage.get(k, null); });
            owner.key = JSON.stringify([movie.type || (movie.first_air_date ? 'tv' : 'movie'), movie.id, movie.imdb_id, movie.original_title || movie.original_name, movie.release_date || movie.first_air_date, settings]);
            cache = cache.filter(function(n) { return n.until > Date.now(); });
            var hit = cache.filter(function(n) { return n.key === owner.key; })[0];
            if (hit) { fetchedComments = hit.comments; isSearchFinished = true; _this.startObserver(); return; }''')
replace('                var finalizeFetch = function(finalList) {\n                    fetchedComments = finalList;', '''                var finalizeFetch = function(finalList) {
                    if (owner.dead) return;
                    // Cache successful content only; an outage/empty response must remain retryable.
                    if (finalList.length && finalList.length <= 1000) {
                        cache = cache.filter(function(n) { return n.key !== owner.key; });
                        cache.push({key:owner.key, comments:finalList.slice(), until:Date.now()+300000});
                        if (cache.length > 8) cache.shift();
                    }
                    fetchedComments = finalList;''')
start = s.index('        this.fetch = function(movie)')
end = s.index('        this.startObserver', start)
s = s[:start] + s[start:end].replace('setTimeout(', 'scopedTimeout(') + s[end:]
replace('            observer.observe(document.body, { childList: true, subtree: true });', '''            if (scope && scope.page[0]) observer.observe(scope.page[0], { childList: true, subtree: true });''')
replace('                if (shouldInject) _this.inject();', '''                if (shouldInject && scope && !scope.framePending) {
                    scope.framePending = true;
                    scopedTimeout(function() { if (scope) scope.framePending = false; _this.inject(); }, 0);
                }''')
replace('            try {\n                var focusedRemoved = false;', '''            try {
                if (!scope || scope.dead) return;
                var page = scope.page;
                var focusedRemoved = false;''')
replace("                $('.items-line').each(function() {", "                page.find('.items-line').each(function() {")
replace("if ($('.ua-comments-slider').length && fetchedComments.length > 0) return;", "if (page.find('.ua-comments-slider').length && fetchedComments.length > 0) return;")
replace("                $('.full-descr__details').each(function() {", "                page.find('.full-descr__details').each(function() {")
replace("                var root = $('.ua-comments-root');", "                var root = page.find('.ua-comments-root');")
replace('                    fetchedComments.forEach(function(comment, idx) {', '''                    var offset = scope.offset;
                    function pager(label, nextOffset) {
                        var button = $('<div class="ua-comments-page selector"></div>').text(label);
                        button.on('hover:enter', function() {
                            if (!scope || scope.dead) return;
                            scope.offset = nextOffset;
                            root.empty(); _this.inject();
                            var first = root.find('.ua-comment-card')[0];
                            if (first) { Lampa.Controller.collectionSet(root[0]); Lampa.Controller.collectionFocus(first, root[0]); }
                        });
                        slider.append(button);
                    }
                    if (offset) pager('Попередні коментарі', Math.max(0, offset - 40));
                    fetchedComments.slice(offset, offset + 40).forEach(function(comment, localIndex) {
                        var idx = offset + localIndex;''')
replace('                    root.append(slider);', "                    if (offset + 40 < fetchedComments.length) pager('Наступні коментарі', offset + 40);\n                    root.append(slider);")
replace('                    setTimeout(function() {\n                        slider.find', '                    scopedTimeout(function() {\n                        slider.find')
replace('if (window.Lampa) new InlineComments().init();', 'if (window.Lampa) { instance = new InlineComments(); instance.init(); }')
replace("+ this.data.author +", "+ safeText(this.data.author) +")
Path('media/ua-comments.js').write_text('\n'.join(line.rstrip(' \t') for line in s.splitlines()) + '\n')
