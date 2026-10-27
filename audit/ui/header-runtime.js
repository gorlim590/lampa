/* Opt-in PR97 A/B entry replacing only the temporary loader URL.
 * Services retain their original URLs/configuration; only Interface is redirected.
 * Bounded diagnostics never read storage, headers, bodies, tokens or media IDs. */
(function () {
    'use strict';
    var query = new URL(document.currentScript.src).searchParams;
    var revision = query.get('ui') || '';
    if (!/^[a-f0-9]{40}$/.test(revision) || window.LampaLoaderStarted || !window.Lampa) return;
    var L = window.Lampa, active = true, frame = 0, pending = [], timer;
    var json = document.createElement('script');
    json.id = 'lampa-header-runtime'; json.type = 'application/json'; document.documentElement.appendChild(json);
    var report = {schema:1, uiRevision:revision, scripts:[], rows:{registrations:0, mainCalls:0, callbacks:[]}, network:{trakt:{}, tmdb:{}}, stopped:false};
    function now() { return Math.round(performance.now()*10)/10; }
    function moduleName(raw) {
        try { var path = new URL(raw, document.baseURI).pathname;
            var match = path.match(/\/(loader|trakt|trakt-plus|torrent-search|interface-plus|design-optimized|average-rating|cardify-plus|translate)\.js$/);
            return match ? match[1] : null;
        } catch (e) { return null; }
    }
    function bucket(raw) {
        try { var url = new URL(raw, document.baseURI), host = url.hostname, path = url.pathname;
            if (/trakt/i.test(host) || /api\.trakt\.tv/i.test(path)) return 'trakt';
            if (/tmdb|themoviedb/i.test(host) || /themoviedb/i.test(path)) return 'tmdb';
        } catch (e) {}
        return null;
    }
    function status(kind, code) {
        if (!active || !kind) return;
        report.network[kind][String(code)] = (report.network[kind][String(code)] || 0)+1; schedule();
    }
    function event(name, state, raw) {
        if (!active || !name || report.scripts.length>=64) return;
        var family = /^https:\/\/gorlim590\.github\.io\/lampa\//.test(raw) ? 'pages' : /^https:\/\/cdn\.jsdelivr\.net\/gh\/gorlim590\/lampa@/.test(raw) ? 'immutable-ui' : 'other';
        report.scripts.push({module:name, state:state, family:family, atMs:now()}); schedule();
    }
    function snapshot() {
        var ui=window.StremioHybrid;
        report.current={atMs:now(), appready:!!window.appready, loaderStarted:!!window.LampaLoaderStarted,
            readiness:{trakt:!!(window.TraktTV&&window.TraktTV.api), traktPlus:!!window.TraktPlus, homeHistory:!!window.LampaHomeHistory, interface:!!window.__ifx_plugin_initialized, ydesign:!!document.body&&document.body.classList.contains('ydesign-active')},
            rows:document.querySelectorAll('.items-line').length, cards:document.querySelectorAll('.card').length,
            header:{legacyStyles:document.querySelectorAll('#ifx_header_css').length, canonicalStyles:document.querySelectorAll('#stremio-hybrid-style').length, clocks:document.querySelectorAll('.head__time').length, owns:!!(ui&&ui.ownsPresentation&&ui.ownsPresentation('header'))}};
        json.textContent=JSON.stringify(report);
    }
    function schedule() { if(active&&!frame) frame=requestAnimationFrame(function(){frame=0;snapshot();}); }
    var originalPut=L.Utils.putScriptAsync;
    function put(urls, ok, fail) {
        var changed=false, list=urls.map(function(raw){
            var name=moduleName(raw), target=raw;
            if(name==='interface-plus' && /^https:\/\/gorlim590\.github\.io\/lampa\/ui\/interface-plus\.js(?:[?#]|$)/.test(raw)) { target='https://cdn.jsdelivr.net/gh/gorlim590/lampa@'+revision+'/ui/interface-plus.js'; changed=true; }
            event(name,'requested',target); return target;
        });
        var args=Array.prototype.slice.call(arguments);args[0]=changed?list:urls;
        args[1]=function(){list.forEach(function(raw){event(moduleName(raw),'completed',raw);});if(typeof ok==='function')return ok.apply(this,arguments);};
        args[2]=function(){list.forEach(function(raw){event(moduleName(raw),'failed',raw);});if(typeof fail==='function')return fail.apply(this,arguments);};
        var success=arguments[3];args[3]=function(raw){event(moduleName(raw),'loaded',raw);if(typeof success==='function')return success.apply(this,arguments);};
        return originalPut.apply(this,args);
    }
    L.Utils.putScriptAsync=put;
    var rows=L.ContentRows, originalAdd=rows&&rows.add, originalCall=rows&&rows.call;
    function add(){if(active)report.rows.registrations++;return originalAdd.apply(this,arguments);}
    function call(screen,params,calls){var before=calls&&calls.length,result=originalCall.apply(this,arguments);if(active&&screen==='main'){report.rows.mainCalls++;report.rows.callbacks.push({before:before,after:calls&&calls.length});schedule();}return result;}
    if(originalAdd)rows.add=add;if(originalCall)rows.call=call;
    var proto=window.XMLHttpRequest&&window.XMLHttpRequest.prototype, originalOpen=proto&&proto.open;
    function open(method,url){
        var kind=bucket(url), xhr=this;
        if(active&&kind){var done=function(){xhr.removeEventListener('loadend',done);pending=pending.filter(function(p){return p.fn!==done;});status(kind,xhr.status);};pending.push({xhr:xhr,fn:done});xhr.addEventListener('loadend',done);}
        return originalOpen.apply(this,arguments);
    }
    if(originalOpen)proto.open=open;
    var originalFetch=window.fetch;
    function fetchObserved(input){var kind=bucket(typeof input==='string'?input:input&&input.url),result=originalFetch.apply(this,arguments);if(active&&kind)result.then(function(r){status(kind,r.status);},function(){status(kind,0);});return result;}
    if(originalFetch)window.fetch=fetchObserved;
    function key(){schedule();}
    document.addEventListener('keydown',key);
    function stop(){
        if(!active)return;active=false;clearTimeout(timer);if(frame){cancelAnimationFrame(frame);frame=0;}
        document.removeEventListener('keydown',key);pending.forEach(function(p){p.xhr.removeEventListener('loadend',p.fn);});pending=[];
        if(L.Utils.putScriptAsync===put)L.Utils.putScriptAsync=originalPut;
        if(rows&&rows.add===add)rows.add=originalAdd;if(rows&&rows.call===call)rows.call=originalCall;
        if(proto&&proto.open===open)proto.open=originalOpen;if(window.fetch===fetchObserved)window.fetch=originalFetch;
        report.stopped=true;snapshot();
    }
    timer=setTimeout(stop,60000);
    var script=document.createElement('script');script.src='https://gorlim590.github.io/lampa/loader.js';
    script.onerror=stop;document.head.appendChild(script);snapshot();
})();
