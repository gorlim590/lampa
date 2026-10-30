/* Stremio × Lampa. Scoped presentation adapters preserve native cards, filters and playback. */
(function () {
    'use strict';
    var UI_VERSION='3.1.0-single-presentation-owner';
    if (window.StremioHybrid) {
        if (window.StremioHybrid.version === UI_VERSION) return;
        if (typeof window.StremioHybrid.destroy !== 'function') return;
        try { window.StremioHybrid.destroy(); } catch (e) { return; }
        if (window.StremioHybrid) return;
    }
    var styleIdsByOwner={ 'ydesign-cards':'ydesign-style-block', 'ydesign-font':'ydesign-font-css', 'cardify-plus':'cardify-plus-styles' };
    function standaloneStyleId(owner){return styleIdsByOwner[owner]||('stremio-hybrid-module-'+String(owner).replace(/[^a-z0-9_-]/gi,''));}
    function writeStandaloneStyle(owner, value){
        if(!value || !document.createElement)return;
        var id=standaloneStyleId(owner),node=document.getElementById(id);
        if(!node){node=document.createElement('style');node.id=id;(document.head||document.documentElement).appendChild(node);}
        if(node.textContent!==value)node.textContent=value;
    }
    function restoreStyleModules(store){
        if(!store||!Array.isArray(store.order)||!store.modules)return;
        store.order.forEach(function(owner){if(styleIdsByOwner[owner])writeStandaloneStyle(owner,String(store.modules[owner]||''));});
    }
    var previousStyleStore=window.__StremioHybridStyleStore;
    if(previousStyleStore&&previousStyleStore.version!==UI_VERSION){
        restoreStyleModules(previousStyleStore);
        var previousCanonicalStyle=document.getElementById('stremio-hybrid-style');
        if(previousCanonicalStyle){if(previousCanonicalStyle.remove)previousCanonicalStyle.remove();else if(previousCanonicalStyle.parentNode&&previousCanonicalStyle.parentNode.removeChild)previousCanonicalStyle.parentNode.removeChild(previousCanonicalStyle);}
    }
    var bootStats={scriptStartMs:uiNow(),shellAppliedMs:null,firstShellFrameMs:null,readyMs:null,initCount:0,styleInsertions:0,styleUpdates:0,styleCompositions:0,styleCacheHits:0,shellTransitions:0,settingsLoads:0,settingsMounts:0,settingsUnmounts:0,settingsFailures:0,presentationFailures:0},shellFrame=0;
    var settingsHub=null,settingsScript=null,settingsLoading=false,settingsAttempted=false,settingsFailedApi=null;
    var overlayScriptURL=document.currentScript&&document.currentScript.src;if(!/^https?:\/\//i.test(overlayScriptURL||''))overlayScriptURL='';
    function ensureTorrentOverlay(){
        if(window.LampaTorrentCinema||document.querySelector('script[data-torrent-cinema]'))return;
        var script=document.createElement('script'),url=new URL('torrent-cinema.js',overlayScriptURL||'https://gorlim590.github.io/lampa/ui/stremio-hybrid.js');
        var version=new URL(overlayScriptURL||url.href).searchParams.get('v');url.search='';if(version)url.searchParams.set('v',version);script.src=url.href;script.setAttribute('data-torrent-cinema','');
        script.onerror=function(){script.remove();};document.head.appendChild(script);
    }
    var style, ready = false, destroyed = false, waiting = false, watching = false, nativeWaitTimer = 0, nativeWaitAttempts = 0, moreButton = null, menuOpen = false, searchNode = null, searchReturn = false, settingsRail = null, settingsFrame = 0, settingsParameter = null, settingsCategory = 'interface', settingsLeftConsumed = false, settingsPrimaryRouting = false, searchSources = null, searchRoots = [];
    // Readiness polling calls applyShell repeatedly. Cache the combined 54 KB
    // owner stylesheet so those calls do not rejoin every adapter module.
    var styleModuleRevision=0,styleContentCache={valid:false,active:null,destroyed:null,revision:-1,value:''};
    var styleStore = previousStyleStore&&previousStyleStore.version===UI_VERSION&&Array.isArray(previousStyleStore.order)&&previousStyleStore.modules
        ? previousStyleStore : { version:UI_VERSION, order:[], modules:{} };
    styleStore.version=UI_VERSION;
    window.__StremioHybridStyleStore = styleStore;
    var NATIVE_WAIT_MS=100, NATIVE_WAIT_MAX=300;
    var css = `
body.stremio-hybrid { --sh-bg:#121023; --sh-panel:#211d35; --sh-accent:#9775fa; --sh-muted:#aba7bd; --sh-rail:#090a12; --sh-text:#f0eef8; --sh-border:#ffffff16; --sh-radius:.7em; --sh-pill:2em; --sh-gap:1.1em; --sh-speed:160ms; --sh-ring:#9775fa66; --sh-focus:#7960c9; --sh-focus-soft:#3e315b; --sh-header:transparent; --sh-panel-raised:#29233e; --sh-accent-soft:#b79bff; --sh-focus-text:#e9e0ff; --sh-focus-ink:#201536; --sh-inactive:#726d86; --sh-secondary:#d0cadf; --sh-inset:1.8em; --sh-ease:ease-out; background:#121023 !important; color:#f0eef8; }
body.stremio-hybrid .background { opacity:.12 !important; }
body.stremio-hybrid .head { color:#f4f4f7; background:transparent !important; background-image:none !important; border:0 !important; box-shadow:none !important; backdrop-filter:none !important; -webkit-backdrop-filter:none !important; }
/* The native collapsed navigation rail occupies 4.4em. The header itself spans
   the viewport so search stays centered; reserve the rail only for its content. */
body.stremio-hybrid .head__body { padding-left:calc(4.4em + var(--sh-inset)); padding-right:var(--sh-inset); }
body.stremio-hybrid .head__action { border-radius:50%; }
body.stremio-hybrid .head__action.focus { background:var(--sh-focus) !important; color:white !important; }
body.stremio-hybrid .wrap { background:var(--sh-bg); }
body.stremio-hybrid .wrap__left { background:var(--sh-rail) !important; visibility:visible !important; }
body.stremio-hybrid .menu__item { margin:.15em .45em; border-radius:var(--sh-radius) !important; min-height:2.8em; color:var(--sh-inactive); }
body.stremio-hybrid .menu__item.focus, body.stremio-hybrid .menu__item.traverse { background:var(--sh-panel-raised) !important; color:var(--sh-accent-soft) !important; }
body.stremio-hybrid .menu__item.traverse:not(.focus) { box-shadow:inset .18em 0 var(--sh-accent); }
body.stremio-hybrid .menu__ico { opacity:1; }
body.stremio-hybrid .items-line { padding-bottom:2.4em; }
body.stremio-hybrid .items-line__head { padding:0 1.8em 1em; }
body.stremio-hybrid .items-line__title { font-size:1.2em; font-weight:500; letter-spacing:.01em; }
body.stremio-hybrid .items-line .scroll__content { padding-left:1.8em; padding-right:var(--sh-inset); }
body.stremio-hybrid .items-line:not(.vinyl-line) .scroll__body { gap:var(--ydesign-card-gap,var(--sh-gap)); }
body.stremio-hybrid .card { transition:transform var(--sh-speed) var(--sh-ease) !important; backface-visibility:visible !important; transform:none; }
body.stremio-hybrid .ydesign-card, body.stremio-hybrid .ydesign-card.focus { animation:none !important; }
body.stremio-hybrid .card.focus { transform:scale(1.035) !important; z-index:20; }
body.stremio-hybrid .card .card__view { border-radius:var(--sh-radius) !important; transition:none !important; }
body.stremio-hybrid .card.ydesign-card .card__view { border-radius:var(--yd-r,var(--sh-radius)) !important; }
body.stremio-hybrid .card.focus .card__view, body.stremio-hybrid .card.hover .card__view { box-shadow:0 0 0 .14em var(--sh-text),0 0 0 .27em var(--sh-ring) !important; }
/* One outer card focus renderer; native/Interface pseudo-rings yield to the shell. */
body.stremio-hybrid .card.focus .card__view::after, body.stremio-hybrid .card.hover .card__view::after { border:0 !important; box-shadow:none !important; }
body.stremio-hybrid .ydesign-card.focus::after, body.stremio-hybrid .ydesign-card .ydesign-content-layer::after { display:none !important; }
body.stremio-hybrid .ydesign-card .card__view::before { animation:none !important; }
body.stremio-hybrid .ydesign-badge, body.stremio-hybrid .ydesign-genre-badge, body.stremio-hybrid .ydesign-rating, body.stremio-hybrid .ydesign-series-pill, body.stremio-hybrid .ydesign-card-notch { backdrop-filter:none !important; -webkit-backdrop-filter:none !important; }
body.stremio-hybrid .ydesign-content-layer { transition:opacity var(--sh-speed) var(--sh-ease) !important; }
body.stremio-hybrid .selectbox__content, body.stremio-hybrid .settings__content, body.stremio-hybrid .modal__content { background:rgba(17,18,29,.96) !important; border-radius:1em; backdrop-filter:none !important; -webkit-backdrop-filter:none !important; }
body.stremio-hybrid .selectbox-item { border-radius:var(--sh-radius); }
body.stremio-hybrid .mapping--grid { padding:.6em .8em; }
body.stremio-hybrid .mapping--grid .card { padding:0 .65em 1.8em; }
body.stremio-hybrid .selectbox-item.focus, body.stremio-hybrid .settings-param.focus, body.stremio-hybrid .settings-folder.focus { background:var(--sh-focus) !important; color:white !important; border-radius:var(--sh-radius); }
/* Native search and native action nodes are retained. Only known secondary actions move into Select. */
body.stremio-hybrid .head__body { gap:1em; }
body.stremio-hybrid .head__title { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:1em; opacity:.7; max-width:26vw; }
body.stremio-hybrid .head__actions { margin-left:auto; flex-shrink:0; gap:.65em; }
body.stremio-hybrid .head__actions > .sh-head-secondary { display:none !important; }
body.stremio-hybrid .head__time, body.stremio-hybrid .head__split { display:none; }
body.stremio-hybrid .open--search { width:clamp(12em,29vw,24em) !important; height:2.65em; border-radius:var(--sh-pill) !important; background:var(--sh-panel); display:flex; align-items:center; justify-content:flex-start; gap:.8em; padding:0 1.2em; margin:0 !important; }
body.stremio-hybrid .open--search { position:absolute; left:50%; transform:translateX(-50%) !important; }
body.stremio-hybrid .open--search svg { width:1.2em; height:1.2em; flex-shrink:0; opacity:.75; }
body.stremio-hybrid .open--search::after { content:'Пошук фільмів і серіалів'; font-size:.8em; color:var(--sh-muted); white-space:nowrap; }
body.stremio-hybrid .open--search.focus { box-shadow:0 0 0 .1em var(--sh-accent-soft); }
body.stremio-hybrid .open--search.focus::after { color:white; }
body.stremio-hybrid .sh-head-more { width:2.65em; height:2.65em; margin:0 !important; background:var(--sh-panel); display:flex; justify-content:center; align-items:center; }
body.stremio-hybrid .sh-head-more svg { width:1.1em; height:1.1em; }
body.stremio-hybrid[data-sh-page="main"] .menu__item[data-action="main"], body.stremio-hybrid[data-sh-page="category_full"] .menu__item[data-action="filter"], body.stremio-hybrid[data-sh-page="search"] .menu__item[data-action="search"] { color:#a68ae7; background:#ffffff06; }
/* Native Search sources, keyboard and empty states share the same visual system. */
body.stremio-hybrid .main-search { background:var(--sh-bg); color:var(--sh-text); }
body.stremio-hybrid .main-search .search__body { padding:1em 1.8em 2em; }
body.stremio-hybrid .main-search .head-backward { padding:1.4em 1.8em .7em; }
body.stremio-hybrid .main-search .head-backward__title { font-size:1.4em; font-weight:500; }
body.stremio-hybrid .main-search .simple-keyboard-input { background:var(--sh-panel); color:var(--sh-text); border:1px solid var(--sh-border); border-radius:var(--sh-pill); padding:.8em 1.1em; }
body.stremio-hybrid .main-search .simple-keyboard-input.focus { border-color:var(--sh-accent); }
body.stremio-hybrid .main-search .search__sources { gap:.7em; margin:1.2em 0; }
body.stremio-hybrid .main-search .search-source { border-radius:var(--sh-pill); background:var(--sh-panel); color:var(--sh-muted); padding:.8em 1.2em; }
body.stremio-hybrid .main-search .search-source.active { color:var(--sh-text); box-shadow:inset 0 -.12em var(--sh-accent); }
body.stremio-hybrid .main-search .search-source.focus { background:var(--sh-focus-soft); color:white; }
body.stremio-hybrid .main-search .search-source__count { background:#ffffff0d; border-radius:var(--sh-pill); }
body.stremio-hybrid .search-empty, body.stremio-hybrid .search-looking, body.stremio-hybrid .empty { color:var(--sh-muted); }
body.stremio-hybrid .main-search .items-line__title { font-size:1.15em; }
body.stremio-hybrid .main-search .card.ydesign-vertical { width:13.2vw !important; }
body.stremio-hybrid .sh-search-grid { width:13.2vw; min-height:12em; flex:0 0 auto; display:flex; align-items:center; justify-content:center; padding:1em; text-align:center; background:var(--sh-panel); border:1px solid var(--sh-border); border-radius:var(--sh-radius); color:var(--sh-muted); }
body.stremio-hybrid .sh-search-grid.focus { color:white; background:var(--sh-focus-soft); box-shadow:0 0 0 .12em var(--sh-accent); }
body.stremio-hybrid .filter__item, body.stremio-hybrid .filter--filter, body.stremio-hybrid .filter--sort { border-radius:var(--sh-pill); background:var(--sh-panel); }
body.stremio-hybrid .filter__item.focus, body.stremio-hybrid .filter--filter.focus, body.stremio-hybrid .filter--sort.focus { background:var(--sh-focus-soft); box-shadow:0 0 0 .1em var(--sh-accent); }
/* A full Settings screen; the right pane remains Lampa's original component. */
body.stremio-hybrid.settings--open .settings { position:fixed; inset:0; width:100vw; height:100vh; }
body.stremio-hybrid.settings--open .settings__layer { display:none; }
body.stremio-hybrid.settings--open .settings__content { width:100% !important; max-width:none; height:100vh !important; background:var(--sh-bg) !important; pointer-events:auto; display:grid; grid-template-columns:minmax(13em,23%) minmax(0,1fr); grid-template-rows:auto minmax(0,1fr); gap:1em 1.8em; padding:var(--sh-inset); box-sizing:border-box; border-radius:0; }
body.stremio-hybrid.settings--open .settings__head { grid-column:1 / -1; padding:0 0 .8em; }
body.stremio-hybrid.settings--open .settings__body { grid-column:2; grid-row:2; min-height:0; min-width:0; overflow:hidden; background:var(--sh-panel); padding:1em; border-radius:var(--sh-radius); }
body.stremio-hybrid.settings--open .settings__body > .scroll { height:100% !important; max-height:100% !important; }
body.stremio-hybrid .sh-settings-rail { grid-column:1; grid-row:2; min-height:0; overflow-y:auto; overscroll-behavior:contain; padding:.2em .5em .8em .1em; }
body.stremio-hybrid .sh-settings-category { color:var(--sh-muted); padding:.85em 1em; margin-bottom:.3em; border-radius:var(--sh-pill); font-size:.95em; cursor:pointer; }
body.stremio-hybrid .sh-settings-category[aria-current="page"] { background:#ffffff09; color:var(--sh-text); }
body.stremio-hybrid .sh-settings-category.focus { color:white; background:var(--sh-focus-soft); box-shadow:inset .18em 0 var(--sh-accent); }
/* #79 owns presentation; #73 only mounts native controls/navigation. */
body.stremio-hybrid.settings-hub-active .settings__body { grid-column:1 / -1; width:100%; max-width:70em; margin:0 auto; }
body.stremio-hybrid.settings-hub-active .sh-settings-rail { display:none; }
body.stremio-hybrid.settings-hub-active .settings-folder[data-settings-hub-consolidated="true"] { display:none !important; }
body.stremio-hybrid.settings-hub-active .settings-param { border-radius:var(--sh-radius); }
body.stremio-hybrid.settings-hub-active .settings-param__name { font-size:1.1em; line-height:1.35; white-space:normal; overflow-wrap:anywhere; }
body.stremio-hybrid.settings-hub-active .settings-param__descr { overflow-wrap:anywhere; line-height:1.4; color:var(--sh-muted); }
body.stremio-hybrid.settings-hub-active .settings-param.settings-hub-status-unverified { border-left:.22em solid var(--sh-inactive); }
body.stremio-hybrid.settings-hub-active .settings-param.settings-hub-status-partial { border-left:.22em solid #d6ac63; }
body.stremio-hybrid.settings-hub-active .settings-param.settings-hub-status-broken { border-left:.22em solid #e37878; }
body.stremio-hybrid.settings-hub-active .settings-param.settings-hub-status-unavailable { border-left:.22em solid #777386; opacity:.78; }
body.stremio-hybrid.settings-hub-active .settings-param.focus { background:var(--sh-focus-soft); box-shadow:inset .2em 0 var(--sh-accent); }
body.stremio-hybrid .settings-param { padding:1em; margin-bottom:.25em; }
body.stremio-hybrid .settings-param__name { font-size:1em; }
body.stremio-hybrid .settings-param__value { font-size:.85em; }
/* Keep Cardify's composition and provider actions; improve readable hierarchy. */
/* Reveal the existing native poster and recompose Cardify without replacing its DOM. */
body.stremio-hybrid .cardify .full-start-new__body { height:auto !important; min-height:36em; padding-top:2em; align-items:flex-start !important; }
body.stremio-hybrid .cardify .full-start-new__left { display:block !important; width:12vw; flex:0 0 12vw; max-width:12em; margin-right:var(--sh-inset); align-self:flex-start; }
body.stremio-hybrid .cardify .full-start-new__poster { border-radius:var(--sh-radius); box-shadow:0 .5em 1.5em #0005; overflow:hidden; }
body.stremio-hybrid .cardify .full-start-new__right { flex:1; min-width:0; width:auto; align-items:flex-start !important; }
body.stremio-hybrid .cardify .cardify__left { max-width:58%; padding-right:0; }
body.stremio-hybrid .cardify .full-start-new__title { font-size:2.1em !important; margin-top:0 !important; }
body.stremio-hybrid .cardify .custom-ghost-main { top:2em !important; }
body.stremio-hybrid .cardify .cardify__right-box { position:absolute; bottom:1em; right:var(--sh-inset); }
body.stremio-hybrid .full-episode { border-radius:var(--sh-radius); background:var(--sh-panel); padding:.7em; }
body.stremio-hybrid .full-episode__img { border-radius:.45em; }
body.stremio-hybrid .full-episode.focus { box-shadow:0 0 0 .12em var(--sh-accent); }
body.stremio-hybrid .activity:not(.sh-movie-page) .full-start__background { opacity:.48 !important; filter:none !important; }
body.stremio-hybrid .cardify-effects-overlay { width:100% !important; background:linear-gradient(90deg,rgba(18,16,35,.76),rgba(18,16,35,.16)) !important; transition:opacity var(--sh-speed) var(--sh-ease) !important; }
body.stremio-hybrid .full-start-new__title { font-size:2.4em !important; line-height:1.16 !important; font-weight:600; max-width:26em; white-space:normal !important; display:block !important; overflow:visible !important; text-overflow:clip; overflow-wrap:break-word; -webkit-line-clamp:unset !important; margin:.3em 0 .5em !important; }
body.stremio-hybrid .full-start-new__head { color:var(--sh-secondary); font-size:.95em; line-height:1.4; }
body.stremio-hybrid .ifx-original-title { opacity:.7; font-weight:400; }
body.stremio-hybrid .cardify__left { min-width:0; max-width:68%; padding-right:1.2em; }
body.stremio-hybrid .full-start-new__right { gap:1em; }
body.stremio-hybrid .full-start-new__rate-line { gap:.6em; }
body.stremio-hybrid .full-start__button { border-radius:var(--sh-pill) !important; background:var(--sh-panel-raised); border:1px solid var(--sh-border); min-height:2.8em; animation:none !important; opacity:1 !important; transition:transform var(--sh-speed) var(--sh-ease),opacity var(--sh-speed) var(--sh-ease) !important; backdrop-filter:none !important; -webkit-backdrop-filter:none !important; }
body.stremio-hybrid .full-start__button.focus { background:var(--sh-focus-text) !important; color:var(--sh-focus-ink) !important; box-shadow:0 0 0 .13em var(--sh-accent) !important; transform:translateY(-.08em); }
body.stremio-hybrid .custom-ghost-main { width:31% !important; padding:1.1em !important; background:rgba(24,21,43,.94); border:1px solid #ffffff12; border-radius:1em; z-index:1 !important; }
body.stremio-hybrid .custom-ghost-main .full-descr__text { text-align:left !important; font-size:1em !important; line-height:1.55 !important; max-height:15.5em !important; }
body.stremio-hybrid .full-descr__text.focus { outline:.12em solid var(--sh-accent-soft); outline-offset:.35em; border-radius:.3em; }
body.stremio-hybrid .full-descr { padding-left:1.8em; padding-right:var(--sh-inset); }
body.stremio-hybrid .full-descr__info-name { color:#aaa2be; }
body.stremio-hybrid .full-descr__tag { border-radius:var(--sh-pill); background:var(--sh-panel-raised); }
body.stremio-hybrid .full-descr__tag.focus, body.stremio-hybrid .simple-button.focus { background:var(--sh-focus) !important; color:white !important; }
body.stremio-hybrid .full-person__photo { border-radius:var(--sh-radius); }
body.stremio-hybrid .settings__title, body.stremio-hybrid .selectbox__title { font-size:1.6em; font-weight:500; letter-spacing:.01em; }
body.stremio-hybrid .settings-param, body.stremio-hybrid .settings-folder { border-radius:var(--sh-radius); border:1px solid transparent; }
body.stremio-hybrid .settings-param__descr, body.stremio-hybrid .settings-param__value { color:var(--sh-muted); }
body.stremio-hybrid .settings-param.focus .settings-param__descr, body.stremio-hybrid .settings-param.focus .settings-param__value { color:var(--sh-text); }
body.stremio-hybrid .settings-param.focus, body.stremio-hybrid .settings-folder.focus, body.stremio-hybrid .selectbox-item.focus { box-shadow:inset .18em 0 var(--sh-accent-soft); }
body.stremio-hybrid .menu__item, body.stremio-hybrid .head__action, body.stremio-hybrid .selectbox-item, body.stremio-hybrid .settings-param, body.stremio-hybrid .settings-folder { transition:transform var(--sh-speed) var(--sh-ease),opacity var(--sh-speed) var(--sh-ease) !important; }
@media(min-width:769px) {
 /* The transparent Hybrid header does not reserve a row above the desktop/TV rail.
    Keep native Scroll full-height and retain device safe-area padding. */
 body.stremio-hybrid .wrap__left { padding-top:0; }
 body.stremio-hybrid .wrap__left > .scroll { height:100% !important; -webkit-mask-image:linear-gradient(to bottom,transparent,#fff .5em,#fff calc(100% - .5em),transparent); mask-image:linear-gradient(to bottom,transparent,#fff .5em,#fff calc(100% - .5em),transparent); }
 body.stremio-hybrid .wrap__left > .scroll > .scroll__content { padding-top:.5em; padding-bottom:.5em; padding-top:max(.5em,env(safe-area-inset-top,0px)); padding-bottom:max(.5em,env(safe-area-inset-bottom,0px)); }
 body.stremio-hybrid .wrap__content { flex:1; min-width:0; width:calc(100% - 4.4em) !important; }
 body.stremio-hybrid .activity { width:100% !important; }
 body.stremio-hybrid .wrap__left.wrap__left--hidden { margin-left:0 !important; width:4.4em !important; min-width:4.4em; }
 body.stremio-hybrid .wrap__left--hidden .menu { width:4.4em !important; }
 body.stremio-hybrid .wrap__left--hidden .menu__item { padding:.8em; justify-content:center; }
 body.stremio-hybrid .wrap__left--hidden .menu__ico { margin:0; }
 body.stremio-hybrid .wrap__left--hidden .menu__text { display:none; }
 body.stremio-hybrid .wrap__left--hidden .menu__version { font-size:.45em; }
 body.stremio-hybrid .wrap__left { transition:width var(--sh-speed) var(--sh-ease),min-width var(--sh-speed) var(--sh-ease); }
 body.stremio-hybrid.sh-navigation-expanded .wrap__left { position:fixed; inset:0 auto 0 0; z-index:50; width:15em !important; min-width:15em; box-shadow:.8em 0 2em #0007; }
 body.stremio-hybrid.sh-navigation-expanded .head__body { padding-left:calc(15em + var(--sh-inset)); }
 body.stremio-hybrid.sh-navigation-expanded .wrap__left .menu { width:15em !important; }
 body.stremio-hybrid.sh-navigation-expanded .wrap__left .menu__item { justify-content:flex-start; padding:.8em 1em; }
 body.stremio-hybrid.sh-navigation-expanded .wrap__left .menu__ico { width:1.35em; margin:0 .8em 0 0; flex:0 0 1.35em; }
 body.stremio-hybrid.sh-navigation-expanded .wrap__left .menu__text { display:block !important; opacity:1; max-width:11em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
 body.stremio-hybrid .items-line:not(.vinyl-line) .card.ydesign-vertical { width:calc((100% + var(--ydesign-card-gap,var(--sh-gap))) / var(--ydesign-grid-items-v,5) - var(--ydesign-card-gap,var(--sh-gap))) !important; margin-left:0 !important; margin-right:0 !important; }
 body.stremio-hybrid .mapping--grid .card.ydesign-vertical { width:calc(100% / var(--ydesign-grid-items-v,5)) !important; }
}
@media(max-width:768px) {
 body.stremio-hybrid .cardify .full-start-new__left { display:none !important; }
 body.stremio-hybrid .cardify .cardify__left { max-width:100%; }
 body.stremio-hybrid .cardify__left { max-width:100%; padding-right:0; }
 body.stremio-hybrid .custom-ghost-main { position:relative !important; width:100% !important; margin-top:1em; }
 body.stremio-hybrid .full-start-new__title { font-size:1.8em !important; }
}
@media(prefers-reduced-motion:reduce) {
 body.stremio-hybrid .card, body.stremio-hybrid .ydesign-content-layer { transition:none !important; }
 body.stremio-hybrid .full-start__button, body.stremio-hybrid .menu__item, body.stremio-hybrid .head__action, body.stremio-hybrid .selectbox-item, body.stremio-hybrid .settings-param, body.stremio-hybrid .settings-folder, body.stremio-hybrid .cardify-effects-overlay { transition:none !important; }
 body.stremio-hybrid .card.focus, body.stremio-hybrid .full-start__button.focus { transform:none !important; }
}

/* Shared auxiliary surfaces; native modal stacking and callbacks stay intact. */
body.stremio-hybrid .lang { background:var(--sh-bg); color:var(--sh-text); }
body.stremio-hybrid .lang__body { background:var(--sh-bg); }
body.stremio-hybrid .lang__selector-item { border-radius:var(--sh-pill); color:var(--sh-muted); }
body.stremio-hybrid .lang__selector-item.focus { background:var(--sh-focus-soft); color:var(--sh-text); box-shadow:inset .18em 0 var(--sh-accent); }
body.stremio-hybrid .modal__title { font-size:1.4em; font-weight:500; }
body.stremio-hybrid .modal__button, body.stremio-hybrid .search-history-key { background:var(--sh-panel-raised); border:1px solid var(--sh-border); border-radius:var(--sh-pill); }
body.stremio-hybrid .modal__button.focus, body.stremio-hybrid .search-history-key.focus, body.stremio-hybrid .simple-keyboard-mic.focus { background:var(--sh-focus-soft); color:var(--sh-text); box-shadow:0 0 0 .1em var(--sh-accent); }
body.stremio-hybrid .settings-input__content, body.stremio-hybrid .noty__body, body.stremio-hybrid .notice { background:var(--sh-panel); color:var(--sh-text); border-radius:var(--sh-radius); border:1px solid var(--sh-border); backdrop-filter:none !important; -webkit-backdrop-filter:none !important; }
body.stremio-hybrid .notice.focus { box-shadow:0 0 0 .12em var(--sh-accent); }
body.stremio-hybrid .broadcast__text, body.stremio-hybrid .notice__time, body.stremio-hybrid .notice__author-text { color:var(--sh-muted); }
body.stremio-hybrid .broadcast__scan > div { background:var(--sh-accent); }
body.stremio-hybrid .activity__loader { border-top-color:var(--sh-accent); }
body.stremio-hybrid .sh-movie .cardify__right-box .full-start__status > *, body.stremio-hybrid .sh-movie .cardify__right-box .full-start__pg > * { background:none !important; color:inherit !important; padding:0 !important; font-size:inherit !important; }
body.stremio-hybrid .sh-movie .full-start-new__buttons { position:relative; padding-bottom:1.4em; }
body.stremio-hybrid .sh-movie .full-start-new__buttons::after { content:attr(data-sh-action); position:absolute; bottom:.1em; left:.2em; font-size:.7em; color:var(--sm-muted); white-space:nowrap; pointer-events:none; }
body.stremio-hybrid .sh-movie .cardify__right-box > .full-start-new__rate-line { border:0; padding:0; background:none !important; }
body.stremio-hybrid .sh-movie .full-start__status, body.stremio-hybrid .sh-movie .full-start__pg { background:rgba(255,255,255,.05) !important; color:var(--sm-muted) !important; font-size:.8em !important; border:1px solid #ffffff26; padding:.25em .6em; border-radius:.3em; }
body.stremio-hybrid .sh-movie-page .full-start__background { position:fixed; left:0 !important; top:0 !important; width:100vw !important; height:100vh !important; max-width:none; object-fit:cover; object-position:center; transform:none !important; }
body.stremio-hybrid .sh-movie-native { position:relative; z-index:0; }
/* Own the shade outside native .scroll__body: its transform makes fixed descendants
   scroll-sized and clips their top edge below the header (Issue #49). The image and
   shade now share the same viewport containing block, including Cardify layouts. */
body.stremio-hybrid .activity.sh-movie-page::before { content:''; position:fixed; left:0; top:0; width:100vw; height:100vh; pointer-events:none; z-index:-1; background:linear-gradient(90deg,rgba(8,9,17,.92),rgba(8,9,17,.72) 37%,rgba(8,9,17,.12) 76%),linear-gradient(0deg,#0c0c16,transparent 34%); }
body.stremio-hybrid .sh-movie .full-start-new__tagline { order:1; font-size:.9em !important; color:var(--sm-muted); margin:0 0 .8em; }
body.stremio-hybrid .sh-movie .full-start-new__rate-line { order:2; margin:0 0 .8em !important; gap:.8em; }
body.stremio-hybrid .sh-movie .full-start-new__details { order:3; }
/* Movie-only Cardify adapter: backdrop + one information column, no right description card. */
body.stremio-hybrid .activity.sh-movie-page { --sm-bg:#0c0c16; --sm-text:#f4f4f7; --sm-muted:#b8b8c6; }
/* Native activity translate3d changes the containing block of fixed backdrop/mask layers.
   Keep that entry animation off only for this full-viewport details composition. */
body.stremio-hybrid .activity.sh-movie-page > .activity__body { -webkit-animation:none !important; animation:none !important; }
body.stremio-hybrid .sh-movie-page .full-start__background { z-index:-2 !important; opacity:.78; transition:opacity 800ms ease-in-out !important; mask-image:none !important; -webkit-mask-image:none !important; filter:none !important; }
body.stremio-hybrid .sh-movie-page .cardify-effects-overlay { background:none !important; }
body.stremio-hybrid .sh-movie { transition:none !important; color:var(--sm-text); }
body.stremio-hybrid .sh-movie .full-start-new__body { display:block !important; min-height:calc(100vh - 5em); height:auto !important; padding:1.8em .6em 2.8em !important; }
body.stremio-hybrid .sh-movie .full-start-new__left { display:none !important; }
body.stremio-hybrid .sh-movie .full-start-new__right { display:block !important; width:100%; }
body.stremio-hybrid .sh-movie .sh-movie-column { display:flex !important; flex-direction:column; align-items:flex-start; width:65%; max-width:65% !important; padding:0; }
body.stremio-hybrid .sh-movie .full-start-new__title { order:0; font-size:3.05em !important; line-height:1.12 !important; font-weight:500; letter-spacing:.015em; max-width:100%; margin:0 0 .5em !important; text-shadow:none; }
body.stremio-hybrid .sh-movie .full-start-new__head { order:1; font-size:.9em; color:var(--sm-muted); margin:0 0 .7em; line-height:1.5; text-shadow:none; }
body.stremio-hybrid .sh-movie .ifx-original-title { display:inline; border:0; padding:0; margin-left:1em; color:var(--sm-muted); font-size:1em; font-weight:400; text-shadow:none; }
body.stremio-hybrid .sh-movie .omdb-mdb-yarik-rate, body.stremio-hybrid .sh-movie .rate-fix { order:2; display:flex; flex-wrap:wrap; gap:.9em !important; margin:0 0 1em !important; align-items:center; }
body.stremio-hybrid .sh-movie .full-start__rate { font-size:var(--sh-details-rating-size,1.25em) !important; background:transparent !important; padding:0 !important; border:0; border-radius:0; min-height:0; gap:.35em; margin:0 !important; color:var(--sm-text) !important; }
body.stremio-hybrid .sh-movie .full-start__rate > div { color:var(--sm-text) !important; }
body.stremio-hybrid .sh-movie .rating-icon-wrap, body.stremio-hybrid .sh-movie .rating-icon-wrap img { width:1.25em !important; height:1.25em !important; min-width:0 !important; }
body.stremio-hybrid .sh-movie .cardify__details { order:3; width:100%; }
body.stremio-hybrid .sh-movie .full-start-new__details { margin:0 0 1em !important; font-size:.9em !important; line-height:1.5; gap:.5em; }
body.stremio-hybrid .sh-movie .full-start-new__details > div { margin:0 !important; gap:.5em !important; }
body.stremio-hybrid .sh-movie .full-start-new__details > div > div { margin:0 !important; gap:.5em !important; }
body.stremio-hybrid .sh-movie .full-start-new__details span:not(.full-start-new__split) { background:rgba(255,255,255,.07) !important; color:var(--sm-muted) !important; font-size:.95em !important; font-weight:400; border:0 !important; border-radius:2em !important; padding:.3em .8em !important; margin:0 !important; }
body.stremio-hybrid .sh-movie .cardify__right-box { order:4; position:static !important; margin:0 0 .9em; gap:.7em; }
body.stremio-hybrid .sh-movie .cardify__right-box > * { margin:0 !important; font-size:.8em; background:rgba(255,255,255,.06) !important; color:var(--sm-muted) !important; border:1px solid #ffffff26; padding:.2em .6em; border-radius:.3em; }
body.stremio-hybrid .sh-movie-page .sh-movie-description { display:block; position:static; width:100%; max-width:72ch; padding:0; margin:0 0 1.1em; pointer-events:auto; border:0; border-radius:0; background:none; z-index:auto; }
body.stremio-hybrid .sh-movie .full-descr__text { color:#e0e0e8 !important; font-size:1em !important; line-height:1.65 !important; text-align:left !important; text-shadow:none !important; max-height:8.25em !important; padding:0 !important; margin:0 !important; width:100%; }
body.stremio-hybrid .sh-movie .full-start-new__buttons { order:5; display:flex !important; flex-wrap:nowrap !important; align-items:center; gap:.6em !important; max-width:100%; overflow-x:auto; overflow-y:hidden; padding:.2em .2em 1.4em; margin:0 -.2em; scrollbar-width:none; }
body.stremio-hybrid .sh-movie .full-start__button { font-size:1em !important; flex:0 0 auto; display:flex; align-items:center; justify-content:center; min-height:2.9em !important; height:2.9em !important; width:3.1em; min-width:3.1em; margin:0 !important; padding:0 .85em !important; border-radius:.55em !important; background:rgba(255,255,255,.08) !important; border:1px solid #ffffff12; box-shadow:none; transform:none !important; }
body.stremio-hybrid .sh-movie .full-start__button span, body.stremio-hybrid .sh-movie .full-start__button .full-start__text { display:none !important; }
body.stremio-hybrid .sh-movie .full-start__button svg { width:1.25em !important; height:1.25em !important; margin:0 !important; color:inherit; }
body.stremio-hybrid .sh-movie .full-start__button.sh-movie-primary { width:auto; min-width:9em; gap:.65em; background:#7357cf !important; border-color:transparent; }
body.stremio-hybrid .sh-movie .full-start__button.sh-movie-primary span, body.stremio-hybrid .sh-movie .full-start__button.sh-movie-primary .full-start__text { display:block !important; font-size:.95em; }
body.stremio-hybrid .sh-movie .full-start__button.focus { background:#f0edf9 !important; color:#15121f !important; border-color:#fff; box-shadow:inset 0 0 0 .1em #fff !important; }
body.stremio-hybrid .sh-movie-page .full-descr { padding-top:1em; }
/* Embedded torrent content is mounted only by the owned full-screen popup adapter. */


@media (prefers-reduced-motion:reduce) { body.stremio-hybrid .sh-movie-page .full-start__background { transition:none !important; } }
body.stremio-hybrid .sh-movie .sh-movie-logo { display:none; order:-1; width:auto; max-width:82%; max-height:7em; object-fit:contain; object-position:left center; margin:0 0 1em; }
body.stremio-hybrid .sh-movie.sh-branded .sh-movie-logo { display:block; }
body.stremio-hybrid .sh-movie.sh-branded .full-start-new__title { font-size:1.2em !important; line-height:1.35 !important; margin:0 0 .7em !important; letter-spacing:0; }
body.stremio-hybrid .sh-movie .ifx-original-title { display:none !important; }
body.stremio-hybrid .sh-movie .sh-series-field { color:#b8b8c6 !important; background:transparent !important; font-size:.9em; }
body.stremio-hybrid .sh-movie .sh-original-title { display:block; color:var(--sm-muted); font-size:.85em; font-weight:400; }
body.stremio-hybrid .sh-movie .full-start__button.sh-movie-primary { background:var(--sm-accent,#7357cf) !important; color:var(--sm-accent-ink,#fff) !important; }
body.stremio-hybrid .sh-movie .full-start__button.sh-movie-primary.focus { background:#f0edf9 !important; color:#15121f !important; }




body.stremio-hybrid .sh-movie-page .scroll--mask { mask-image:none !important; -webkit-mask-image:none !important; }
body.stremio-hybrid.sh-movie-active { --sh-bg:#0c0c16; }
body.stremio-hybrid.sh-movie-active .head { background:var(--sh-header) !important; border:0 !important; box-shadow:none !important; }
body.stremio-hybrid.sh-movie-active .head .open--search,body.stremio-hybrid.sh-movie-active .head .sh-head-more { background:transparent !important; background-image:none !important; }
body.stremio-hybrid.sh-movie-active .head .open--search::after { color:#f4f4f7; text-shadow:0 1px 3px #000; }
body.stremio-hybrid.sh-movie-active .head .sh-head-more.focus { box-shadow:0 0 0 .1em var(--sh-accent-soft); }

/* Native Select content, exact TorrentsRedesign panel skin; scoped to source tools. */
body.stremio-hybrid .sh-movie .sh-metadata-shadow { display:none !important; }
body.stremio-hybrid .sh-movie .sh-metadata-rich { display:flex !important; flex-wrap:wrap; gap:.35em .5em; margin:0 0 1em !important; }
body.stremio-hybrid .sh-movie .sh-metadata-rich > div,body.stremio-hybrid .sh-movie .sh-metadata-rich > div > div { display:contents !important; }
body.stremio-hybrid .sh-movie .sh-metadata-rich span { color:#b8b8c6 !important; background:#ffffff06 !important; font-size:.85em !important; border:0 !important; margin:0 !important; padding:.2em .5em !important; }
body.stremio-hybrid .sh-series .full-descr__text { max-height:6.6em !important; }

`;
    css += `
body.stremio-hybrid .sh-movie .full-descr__text{display:block!important;-webkit-line-clamp:unset;max-height:none!important;overflow:visible;white-space:pre-line!important}
body.stremio-hybrid .head .head__title{max-width:20vw}
body.stremio-hybrid .sh-profile-menu .selectbox__content{position:absolute;right:1.8em;top:5em;bottom:auto;left:auto;width:23em;max-width:90vw;max-height:calc(100vh - 7em);border:1px solid var(--sh-border);box-shadow:0 .7em 2em #0005}
body.stremio-hybrid .selectbox-item{transition:opacity var(--sh-speed) var(--sh-ease)!important}
body.stremio-hybrid .selectbox-item__title{white-space:normal;overflow-wrap:anywhere}
@media(prefers-reduced-motion:reduce){body.stremio-hybrid .wrap__left,body.stremio-hybrid .selectbox,body.stremio-hybrid .selectbox-item,body.stremio-hybrid .sh-movie-page .full-start__background{transition:none!important;animation:none!important}}
`;
    css += `
body.stremio-hybrid .full-person:not(.full-person--small){width:9.5em;display:flex;flex-direction:column;align-items:stretch;gap:.55em;padding:.45em;border-radius:.75em;background:#ffffff06;transition:transform var(--sh-speed) ease-out}
body.stremio-hybrid .full-person:not(.full-person--small) .full-person__photo{width:100%;height:11em;flex-shrink:0;overflow:hidden;border-radius:.6em}
body.stremio-hybrid .full-person__photo img{width:100%;height:100%;object-fit:cover}
body.stremio-hybrid .full-person:not(.full-person--small) .full-person__body{padding:0;min-width:0}
body.stremio-hybrid .full-person__name{color:var(--sh-text);font-size:.95em;line-height:1.3;white-space:normal}
body.stremio-hybrid .full-person__role{font-size:.8em;line-height:1.3;color:var(--sh-muted);white-space:normal}
body.stremio-hybrid .full-person.focus{transform:scale(1.025);box-shadow:0 0 0 .12em var(--sh-accent-soft)}
body.stremio-hybrid .tp-person-watch{position:absolute;bottom:.5em;left:.5em;right:.5em;z-index:8;font-size:.8em;color:#d3c4ff;background:#10111be8;border-radius:.4em;padding:.3em .5em;pointer-events:none}\nbody.stremio-hybrid .sh-cast-watched{font-size:.75em;color:var(--sh-accent-soft);margin-top:.4em}
body.stremio-hybrid .tp-person-tools{display:flex;flex-wrap:wrap;align-items:center;gap:.6em}
body.stremio-hybrid .tp-person-tool{padding:.65em 1em;background:var(--sh-panel);border-radius:var(--sh-pill);color:var(--sh-text)}
body.stremio-hybrid .tp-person-tool.focus{box-shadow:0 0 0 .12em var(--sh-accent-soft)}
body.stremio-hybrid .tp-person-unknown{font-size:.8em;color:var(--sh-muted)}
@media(prefers-reduced-motion:reduce){body.stremio-hybrid .full-person{transition:none!important;transform:none!important}}
`;
    css += `
body.stremio-hybrid .sh-movie-page .sh-genre-chips{display:flex;flex-wrap:wrap;align-items:center;gap:.45em;margin:.15em 0 1.15em;max-width:62em}
body.stremio-hybrid .sh-movie-page .sh-genre-chip{display:inline-flex;align-items:center;min-height:2em;padding:.25em .8em;border:1px solid #ffffff20;border-radius:var(--sh-pill);background:linear-gradient(135deg,#ffffff12,#ffffff06);color:#e8e5f1;font-size:.82em;line-height:1.25;white-space:normal;transition:background .16s ease,border-color .16s ease,transform .16s ease}
body.stremio-hybrid .sh-movie-page .ifx-series-info .sh-genre-chips{display:flex!important;flex-wrap:wrap!important;gap:.4em .5em!important;margin:.1em 0 .2em!important}
body.stremio-hybrid .sh-movie-page .ifx-series-info .sh-genre-chip{display:inline-flex!important;align-items:center!important;min-height:2em!important;padding:.25em .8em!important;border:1px solid #ffffff20!important;border-radius:var(--sh-pill)!important;background:linear-gradient(135deg,#ffffff12,#ffffff06)!important;color:#e8e5f1!important;font-size:.84em!important;font-weight:400!important;line-height:1.25!important;white-space:normal!important;margin:0!important}
body.stremio-hybrid .sh-movie-page .sh-genre-chip{cursor:default}
body.stremio-hybrid .sh-movie-page .full-start-new__head{display:flex;align-items:center;gap:.35em;color:#c5c3cf;letter-spacing:.015em}
body.stremio-hybrid .sh-movie-page .full-start-new__details{display:flex;flex-direction:column;gap:.35em;margin-top:.3em!important;margin-bottom:.9em!important}
body.stremio-hybrid .sh-movie-page .sh-series-field{display:inline-flex;align-items:center;min-height:1.8em;padding:.2em .7em;border:1px solid #ffffff14;border-radius:var(--sh-pill);background:#ffffff09;color:#c7c4d1;font-size:.82em;line-height:1.35;white-space:normal}
body.stremio-hybrid .sh-movie-page .sh-detail-section{width:100%;margin:.35em 0;padding:.65em .8em;border:1px solid #ffffff12;border-radius:.8em;background:linear-gradient(120deg,#ffffff0a,#ffffff04);box-sizing:border-box}
body.stremio-hybrid .sh-movie-page .sh-detail-panels{display:flex;align-self:stretch;width:100%;max-width:100%;min-width:0;flex-direction:column;gap:.35em;margin:.35em 0;box-sizing:border-box}
body.stremio-hybrid .sh-movie-page .sh-detail-panels>.sh-detail-section{width:100%;margin:0}
body.stremio-hybrid .sh-movie-page .tmdb-networks.sh-detail-panels-empty{display:none!important}
body.stremio-hybrid .sh-movie-page .sh-detail-toggle{position:relative;display:flex;align-items:center;justify-content:space-between;gap:1em;min-height:2.6em;padding:.2em 2.65em .2em .35em;color:#f0eef7;font-size:.95em;font-weight:500;cursor:pointer}
body.stremio-hybrid .sh-movie-page .sh-detail-toggle::after{content:'';position:absolute;top:50%;right:.35em;display:block;width:1.8em;height:1.8em;border:1px solid #ffffff20;border-radius:50%;background:linear-gradient(135deg,#ffffff0d,#ffffff04);box-sizing:border-box;transform:translateY(-50%)}
body.stremio-hybrid .sh-movie-page .sh-detail-toggle::before{content:'';position:absolute;top:50%;right:1.02em;width:.42em;height:.42em;border-right:1.5px solid #c9b9ff;border-bottom:1.5px solid #c9b9ff;transform:translateY(-68%) rotate(45deg);transition:transform .16s ease}
body.stremio-hybrid .sh-movie-page .sh-detail-toggle[aria-expanded="true"]::before{transform:translateY(-30%) rotate(225deg)}
body.stremio-hybrid .sh-movie-page .sh-detail-toggle.focus{color:#fff;text-shadow:0 0 1em #ab91ff66;outline:2px solid var(--sh-accent-soft);outline-offset:2px;border-radius:.45em}
body.stremio-hybrid .sh-movie-page .sh-detail-toggle,body.stremio-hybrid .sh-movie-page .full-person{transition:none!important;animation:none!important;scroll-behavior:auto!important}
body.stremio-hybrid .sh-movie-page .sh-detail-toggle.focus,body.stremio-hybrid .sh-movie-page .full-person.focus{transform:none!important}
body.stremio-hybrid .sh-movie-page .sh-detail-section__body{display:flex;flex-wrap:wrap;align-items:center;gap:.65em;padding:.55em .35em .25em;border-top:1px solid #ffffff10}
body.stremio-hybrid .sh-movie-page .sh-detail-section__body[hidden]{display:none!important}
body.stremio-hybrid .sh-movie-page .sh-details-secondary{display:flex;flex-direction:column;align-items:flex-start;gap:.15em;width:100%;box-sizing:border-box;margin:1em 0 1.4em;padding:1.1em clamp(1em,3vw,2.2em);border:1px solid #ffffff1b;border-radius:1em;background:rgba(13,15,22,.42);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);}
body.stremio-hybrid .sh-movie-page .sh-details-secondary>.sh-movie-description{order:0!important;}
body.stremio-hybrid .sh-movie-page .sh-details-secondary>.sh-detail-panels{order:1!important;}
body.stremio-hybrid .sh-movie-page .sh-details-zone-title{align-self:stretch;margin:0 0 .8em;padding:0 0 .45em;border-bottom:1px solid #ffffff12;color:#b9a5f3;font-size:.78em;font-weight:600;letter-spacing:.08em;text-transform:uppercase;}
body.stremio-hybrid .sh-movie-page .sh-details-zone-title--content{margin:1.4em 0 .6em;}
body.stremio-hybrid .sh-movie-page .items-line.sh-details-empty-native-row{display:none;}
body.stremio-hybrid .sh-movie-page .sh-movie-description,body.stremio-hybrid .sh-movie-page .sh-movie-description .full-descr__text{display:block;color:#f4f2fa!important;-webkit-text-fill-color:#f4f2fa!important;text-shadow:0 1px 2px #0009!important;background:none!important;filter:none!important;opacity:1!important;-webkit-line-clamp:unset;-webkit-mask-image:none!important;mask-image:none!important;max-height:none!important;overflow:visible!important;white-space:pre-line;line-height:1.7!important;}
body.stremio-hybrid .sh-movie-page .sh-detail-section__body .tag-count{flex:0 0 auto;margin:0!important}
body.stremio-hybrid .sh-movie-page .sh-detail-section__body .platforms-group,body.stremio-hybrid .sh-movie-page .sh-detail-section__body .studios-group{display:flex;flex:1 1 100%;flex-wrap:wrap;align-items:center;gap:.55em}
body.stremio-hybrid .sh-movie-page .sh-detail-section__body .platforms-group::before,body.stremio-hybrid .sh-movie-page .sh-detail-section__body .studios-group::before{display:block;flex:0 0 100%;color:#aaa6b6;font-size:.72em;letter-spacing:.08em;text-transform:uppercase}
body.stremio-hybrid .sh-movie-page .sh-detail-section__body .platforms-group::before{content:'Мережа / платформа'}
body.stremio-hybrid .sh-movie-page .sh-detail-section__body .studios-group::before{content:'Студії / виробники'}
body.stremio-hybrid .sh-movie-page .sh-detail-section__body .network-separator{display:none!important}
body.stremio-hybrid .sh-movie-page .sh-detail-section__body .network-logo{display:inline-flex!important;align-items:center!important;justify-content:flex-start!important;gap:.55em!important;width:auto!important;max-width:min(24em,100%)!important;height:3.1em!important;min-height:3.1em!important;padding:.45em .8em!important;border-radius:.65em!important;background:rgba(248,248,252,.9)!important;color:#171720!important;border:1px solid #ffffff65!important;box-sizing:border-box!important}
body.stremio-hybrid .sh-movie-page .sh-detail-section__body .network-logo img{display:block!important;flex:0 1 auto!important;width:auto!important;max-width:5em!important;height:auto!important;max-height:2.1em!important;object-fit:contain}
body.stremio-hybrid .sh-movie-page .sh-detail-section__body .network-logo[data-sh-name]::after{content:attr(data-sh-name);display:block;min-width:0;overflow:hidden;color:#171720;font-size:.76em;font-weight:600;line-height:1.2;text-overflow:ellipsis;white-space:nowrap}
body.stremio-hybrid .sh-movie-page .tag-count.selector.sh-production-count-hidden{display:none!important}
body.stremio-hybrid .sh-movie-page .networks-wrapper .sh-detail-section{margin:0;width:100%}
body.stremio-hybrid .sh-movie-page .tmdb-networks{margin:.35em 0!important;padding:0!important}
body.stremio-hybrid .sh-movie-page .tmdb-networks > .items-line__body{margin:0!important}
body.stremio-hybrid .sh-movie-page .ua-comments-root{width:auto;max-width:44em;margin:.6em 0!important}
body.stremio-hybrid .sh-movie-page .sh-detail-section--comments .ua-comments-root{width:100%;max-width:none;margin:.35em 0!important}
body.stremio-hybrid .sh-movie-page .sh-detail-section--comments .ua-comments-slider{max-width:100%}
body.stremio-hybrid .sh-movie-page .sh-detail-section--comments .ua-comment-card{flex-basis:min(34ch,72vw);width:min(34ch,72vw);max-width:min(34ch,72vw)}
body.stremio-hybrid .sh-movie-page .items-line__head.sh-details-heading-hidden,body.stremio-hybrid .sh-movie-page .items-line__title.sh-details-heading-hidden{display:none}
body.stremio-hybrid .sh-movie-page .ua-status-card{width:auto!important;max-width:100%;min-height:0!important;padding:.5em .8em!important;border:1px solid #ffffff12!important;border-radius:var(--sh-pill)!important;background:#ffffff07!important;color:#b9b5c4!important;font-size:.78em!important;line-height:1.4;white-space:normal}
body.stremio-hybrid .sh-movie-page .items-line__head{margin:.5em 0 .4em!important}
body.stremio-hybrid .sh-movie-page .items-line__title{font-size:1.05em;font-weight:600;letter-spacing:.01em}
body.stremio-hybrid .sh-movie-page .full-episode--small{border-radius:.75em;overflow:hidden}
@media(max-width:1360px){body.stremio-hybrid .sh-movie-page .sh-genre-chips{gap:.35em;margin-bottom:.8em}body.stremio-hybrid .sh-movie-page .sh-detail-section{padding:.5em .65em}body.stremio-hybrid .sh-movie-page .ua-comments-root{max-width:34em}}
@media(prefers-reduced-motion:reduce){body.stremio-hybrid .sh-movie-page .sh-genre-chip{transition:none!important;transform:none!important}body.stremio-hybrid .sh-movie-page .sh-detail-toggle::before{transition:none}}
`;
    // Cardify owns the native template/data. Move nodes with their handlers, never clone them.
    var movieRecords=[], movieFrame=0, movieTimers=[];
    function restoreMovie(record) {
        restoreDetailsPresentation(record);
        if(record.ratingController&&record.ratingController.up===record.ratingUp)record.ratingController.up=record.originalRatingUp;
        (record.castLines||[]).forEach(function(entry){entry.line.unuse(entry.hook);delete entry.line._shCastHook;var rendered=entry.line.render(),node=rendered&&(rendered[0]||rendered);if(node&&node.querySelectorAll)node.querySelectorAll('.sh-cast-watched').forEach(function(n){n.remove();});});
        record.root.querySelectorAll('.sh-generated-description').forEach(function(n){n.remove();});
        (record.seriesFields||[]).forEach(function(n){n.remove();});
        (record.ratingRepairs||[]).forEach(function(item){delete item.img.dataset.shRatingFallback;if(item.img.getAttribute('src')===item.fallback)item.img.setAttribute('src',item.src);});
        clearDescription(record);
        removeMovieBrand(record);

        if(record.buttons){record.buttons.removeEventListener('hover:focus',movieButtonFocus,true);record.buttons.removeAttribute('data-sh-action');}
        record.moves.slice().reverse().forEach(function(move){
            if(move.parent) move.parent.insertBefore(move.node,move.next && move.next.parentNode===move.parent ? move.next : null);
        });
        record.column.classList.remove('sh-movie-column');record.root.querySelectorAll('.sh-metadata-rich,.sh-metadata-shadow').forEach(function(n){n.classList.remove('sh-metadata-rich','sh-metadata-shadow');});record.root.classList.remove('sh-movie','sh-movie-native','sh-series'); record.page.classList.remove('sh-movie-page');
        if(record.description)record.description.classList.remove('sh-movie-description');
        (record.plainDescriptions||[]).forEach(function(pair){if(pair.plain.parentNode)pair.plain.parentNode.replaceChild(pair.original,pair.plain);});record.plainDescriptions=[];
        record.root.querySelectorAll('.sh-movie-primary,.sh-movie-description').forEach(function(n){n.classList.remove('sh-movie-primary','sh-movie-description');});
        record.labels.forEach(function(item){if(item.node.getAttribute('title')===item.title)item.node.removeAttribute('title');});
    }
    function stopMovieQueue() {
        if(movieFrame) cancelAnimationFrame(movieFrame);movieFrame=0;
        movieTimers.forEach(clearTimeout);movieTimers=[];
    }
    function removeMovies() {
        stopMovieQueue(); movieRecords.forEach(restoreMovie); movieRecords=[];
    }
    function setDetailDisclosure(panel,open){
        if(!panel||!panel.toggle||!panel.body)return;
        panel.toggle.setAttribute('aria-expanded',String(!!open));panel.body.hidden=!open;panel.root.classList.toggle('is-open',!!open);
    }
    function nativeOverlayOwnsInput(){
        return [['Select','opened'],['Modal','opened'],['Torrent','opened'],['Player','opened']].some(function(pair){var api=Lampa[pair[0]];return api&&typeof api[pair[1]]==='function'&&api[pair[1]]();});
    }
    function detailsInputOwner(record,controller){
        var active=Lampa.Activity&&Lampa.Activity.active&&Lampa.Activity.active();
        if(!active||active.component!=='full'||!active.activity||!record.page.isConnected||!record.page.classList.contains('activity--active'))return null;
        if(typeof active.activity.render==='function'&&active.activity.render()[0]!==record.page)return null;
        var enabled=Lampa.Controller&&Lampa.Controller.enabled&&Lampa.Controller.enabled();
        if(!enabled||['full_start','full_descr'].indexOf(enabled.name)<0||!enabled.controller||(controller&&enabled.controller!==controller)||nativeOverlayOwnsInput())return null;
        return {active:active,controller:enabled.controller,scroll:active.activity.component&&active.activity.component.scroll};
    }
    function detailsPageOwner(record){
        var active=Lampa.Activity&&Lampa.Activity.active&&Lampa.Activity.active();
        if(!active||active.component!=='full'||!active.activity||!record.page.isConnected||!record.page.classList.contains('activity--active'))return null;
        if(typeof active.activity.render==='function'&&active.activity.render()[0]!==record.page)return null;
        if(nativeOverlayOwnsInput())return null;
        return active;
    }
    function detailsNeedsScroll(node){
        var box=node&&node.getBoundingClientRect&&node.getBoundingClientRect(),viewport=window.innerHeight||document.documentElement&&document.documentElement.clientHeight||0;
        return !box||!viewport||box.top<0||box.bottom>viewport;
    }
    function detailsZoneTarget(record,preferred){
        var scope=record.detailsHostLine||record.page,focused=record.page&&record.page.querySelector('.selector.focus'),candidates=[preferred,record.detailLastFocus,focused,record.descriptionToggle];
        (record.detailPanels||[]).forEach(function(panel){candidates.push(panel.toggle);});
        for(var i=0;i<candidates.length;i++){var node=candidates[i];if(node&&node.isConnected&&node.offsetParent!==null&&scope.contains(node)&&node.classList.contains('selector'))return node;}
        var selectors=scope.querySelectorAll?scope.querySelectorAll('.selector'):[];
        for(var j=0;j<selectors.length;j++)if(selectors[j].isConnected&&selectors[j].offsetParent!==null)return selectors[j];
        return null;
    }
    function enterDetailsZone(record,preferred){
        var enabled=Lampa.Controller&&Lampa.Controller.enabled&&Lampa.Controller.enabled(),scope=record.detailsHostLine||record.page,target=detailsZoneTarget(record,preferred);
        if(!enabled||enabled.name!=='full_start'||!enabled.controller||!target||!scope)return false;
        // This Lampa runtime has one native Full Start controller for both the
        // hero and Details content. Switch its native collection instead of
        // toggling an unregistered synthetic `full_descr` controller.
        Lampa.Controller.collectionSet(scope,null,true);Lampa.Controller.collectionFocus(target,scope);
        enabled=Lampa.Controller.enabled();if(!enabled||enabled.name!=='full_start'||!enabled.controller)return false;
        if(enabled.controller.link)enabled.controller.link.last=target;
        record.detailsZoneActive=true;record.detailLastFocus=target;
        var active=Lampa.Activity&&Lampa.Activity.active&&Lampa.Activity.active(),scroll=active&&active.activity&&active.activity.component&&active.activity.component.scroll;
        if(scroll&&typeof scroll.immediate==='function'&&detailsNeedsScroll(target))scroll.immediate(target);
        return true;
    }
    function leaveDetailsZone(record,preferred){
        var enabled=Lampa.Controller&&Lampa.Controller.enabled&&Lampa.Controller.enabled(),torrent=record.root&&record.root.querySelector('.view--torrent'),focus=preferred||record.page&&record.page.querySelector('.selector.focus'),scope=record.detailsHostLine||record.page;
        if(!enabled||enabled.name!=='full_start'||!enabled.controller||!torrent||!torrent.isConnected||torrent.offsetParent===null)return false;
        if(!record.detailsZoneActive&&!(scope&&focus&&scope.contains(focus)))return false;
        Lampa.Controller.collectionSet(record.root,null,true);Lampa.Controller.collectionFocus(torrent,record.root);
        enabled=Lampa.Controller.enabled();if(enabled&&enabled.name==='full_start'&&enabled.controller&&enabled.controller.link)enabled.controller.link.last=torrent;
        record.detailsZoneActive=false;
        var active=Lampa.Activity&&Lampa.Activity.active&&Lampa.Activity.active(),scroll=active&&active.activity&&active.activity.component&&active.activity.component.scroll;
        if(scroll&&typeof scroll.reset==='function')scroll.reset();
        return true;
    }
    function restoreDetailSelectFocus(record,attempt){
        if(!record||!record.detailSelectOrigin)return;
        attempt=attempt||0;
        if(Lampa.Select&&Lampa.Select.opened&&Lampa.Select.opened()){
            if(attempt<30)record.detailSelectFrame=requestAnimationFrame(function(){record.detailSelectFrame=0;restoreDetailSelectFocus(record,attempt+1);});
            else record.detailSelectOrigin=null;
            return;
        }
        // Native Select hides its surface before the controller/route handoff
        // finishes. Wait two rendered frames after opened() becomes false so
        // its late focus restoration cannot overwrite the invoking control.
        if(attempt<2){record.detailSelectFrame=requestAnimationFrame(function(){record.detailSelectFrame=0;restoreDetailSelectFocus(record,attempt+1);});return;}
        var origin=record.detailSelectOrigin;record.detailSelectOrigin=null;
        var active=detailsPageOwner(record),enabled=Lampa.Controller&&Lampa.Controller.enabled&&Lampa.Controller.enabled();
        if(!active||!origin.isConnected||!enabled||['full_start','full_descr','items_line'].indexOf(enabled.name)<0)return;
        if(enabled.name==='items_line')Lampa.Controller.toggle('full_start');
        enabled=Lampa.Controller.enabled();if(!enabled||['full_start','full_descr'].indexOf(enabled.name)<0)return;
        var scope=enabled.name==='full_descr'||(record.detailsHostLine&&record.detailsHostLine.contains(origin))?(record.detailsHostLine||record.page):record.root;
        record.detailsZoneActive=!!record.detailsHostLine&&scope===record.detailsHostLine;
        if(record.detailsZoneActive)record.detailLastFocus=origin;
        Lampa.Controller.collectionSet(scope,null,true);Lampa.Controller.collectionFocus(origin,scope);if(enabled.controller&&enabled.controller.link)enabled.controller.link.last=origin;
        var scroll=active.activity.component&&active.activity.component.scroll;if(scroll&&typeof scroll.immediate==='function'&&detailsNeedsScroll(origin))scroll.immediate(origin);
    }
    function bindDetailSelectFocus(record,controls){
        controls=controls||[];var previous=record.detailSelectControls||[];
        previous.forEach(function(node){if(controls.indexOf(node)<0)$(node).off('.shDetailsFocus');});
        controls.forEach(function(node){if(previous.indexOf(node)<0)$(node).on('hover:enter.shDetailsFocus click.shDetailsFocus',function(){
            record.detailSelectOrigin=null;
            var capture=record.detailSelectCapture=(record.detailSelectCapture||0)+1;
            if(Lampa.Select&&Lampa.Select.opened&&Lampa.Select.opened())record.detailSelectOrigin=node;
            requestAnimationFrame(function(){if(record.detailSelectCapture===capture&&Lampa.Select&&Lampa.Select.opened&&Lampa.Select.opened())record.detailSelectOrigin=node;});
        });});
        record.detailSelectControls=controls.slice();
        if(!controls.length){unbindDetailSelectFocus(record);return;}
        if(record.detailSelectBound||!Lampa.Select||!Lampa.Select.listener||typeof Lampa.Select.listener.follow!=='function')return;
        record.detailSelectBound=true;
        record.detailSelectClose=function(){if(!record.detailSelectOrigin)return;if(record.detailSelectFrame)cancelAnimationFrame(record.detailSelectFrame);record.detailSelectFrame=requestAnimationFrame(function(){record.detailSelectFrame=0;restoreDetailSelectFocus(record);});};
        Lampa.Select.listener.follow('close',record.detailSelectClose);
    }
    function unbindDetailSelectFocus(record){
        if(!record)return;
        (record.detailSelectControls||[]).forEach(function(node){$(node).off('.shDetailsFocus');});record.detailSelectControls=[];
        if(!record.detailSelectBound){record.detailSelectOrigin=null;return;}
        if(Lampa.Select&&Lampa.Select.listener&&typeof Lampa.Select.listener.remove==='function')Lampa.Select.listener.remove('close',record.detailSelectClose);
        if(record.detailSelectFrame)cancelAnimationFrame(record.detailSelectFrame);record.detailSelectFrame=0;
        record.detailSelectBound=false;record.detailSelectOrigin=null;
    }
    function installDetailsDown(record){
        var owner=detailsInputOwner(record),controller=owner&&owner.controller;
        if(!controller||typeof controller.down!=='function')return;
        if(record.detailsDownController===controller)return;
        restoreDetailsDown(record);
        var original=controller.down;
        var wrapped=function(){
            var inputOwner=detailsInputOwner(record,controller),enabled=Lampa.Controller&&Lampa.Controller.enabled&&Lampa.Controller.enabled();
            var torrent=record.root&&record.root.querySelector('.view--torrent');
            var focused=record.page&&record.page.querySelector('.selector.focus');
            if(inputOwner&&enabled&&enabled.name==='full_start'&&torrent&&focused===torrent&&record.detailGroup&&record.detailGroup.isConnected){
                // The native Full controller continues its ArrowDown dispatch
                // after `down()` returns. Defer only this controller handoff
                // until that dispatch finishes, then revalidate ownership.
                if(record.detailsDownFrame)cancelAnimationFrame(record.detailsDownFrame);
                record.detailsDownFrame=requestAnimationFrame(function(){
                    record.detailsDownFrame=0;
                    var current=detailsInputOwner(record,controller),active=Lampa.Controller&&Lampa.Controller.enabled&&Lampa.Controller.enabled();
                    if(!current||!active||active.name!=='full_start'||record.page.querySelector('.selector.focus')!==torrent)return;
                    enterDetailsZone(record,record.detailLastFocus||null);
                });
                return;
            }
            return original.apply(this,arguments);
        };
        controller.down=wrapped;record.detailsDownController=controller;record.detailsDownOriginal=original;record.detailsDownWrapper=wrapped;
    }
    function restoreDetailsDown(record){
        if(record&&record.detailsDownFrame)cancelAnimationFrame(record.detailsDownFrame);
        if(record)record.detailsDownFrame=0;
        if(record&&record.detailsDownController&&record.detailsDownController.down===record.detailsDownWrapper)record.detailsDownController.down=record.detailsDownOriginal;
        if(record){record.detailsDownController=null;record.detailsDownOriginal=null;record.detailsDownWrapper=null;}
    }
    function installDetailsBack(record){
        var owner=detailsInputOwner(record),controller=owner&&owner.controller;
        if(!controller||typeof controller.back!=='function')return;
        if(record.detailsBackController===controller)return;
        restoreDetailsBack(record);
        var original=controller.back;
        var wrapped=function(){
            var inputOwner=detailsInputOwner(record,controller);if(!inputOwner)return original.apply(this,arguments);
            var focused=record.page.querySelector('.sh-detail-toggle.focus, .sh-detail-section__body .focus');
            var panel=(record.detailPanels||[]).filter(function(item){return item.root.isConnected&&item.toggle.getAttribute('aria-expanded')==='true'&&(focused===item.toggle||item.body.contains(focused));})[0];
            if(panel){setDetailDisclosure(panel,false);refreshMovieCollection(record,panel.toggle);return;}
            var enabled=Lampa.Controller&&Lampa.Controller.enabled&&Lampa.Controller.enabled();
            if(enabled&&enabled.name==='full_start'&&leaveDetailsZone(record,focused))return;
            if(enabled&&enabled.name==='full_descr'){
                var torrent=record.root&&record.root.querySelector('.view--torrent');
                if(torrent&&torrent.isConnected&&torrent.offsetParent!==null){
                    Lampa.Controller.toggle('full_start');
                    if(inputOwner.scroll&&typeof inputOwner.scroll.reset==='function')inputOwner.scroll.reset();
                    // Controller.toggle() restores Lampa's native Full Start
                    // collection and its cross-controller Down route. Replacing
                    // that shared collection with the hero-only subset makes
                    // the next Down skip Full Description and land in items_line.
                    Lampa.Controller.collectionFocus(torrent);
                    enabled=Lampa.Controller.enabled();if(enabled&&enabled.name==='full_start'&&enabled.controller&&enabled.controller.link)enabled.controller.link.last=torrent;
                    return;
                }
            }
            return original.apply(this,arguments);
        };
        controller.back=wrapped;record.detailsBackController=controller;record.detailsBackOriginal=original;record.detailsBackWrapper=wrapped;
    }
    function restoreDetailsBack(record){
        if(record&&record.detailsBackFrame)cancelAnimationFrame(record.detailsBackFrame);
        if(record&&record.detailsBackController&&record.detailsBackController.back===record.detailsBackWrapper)record.detailsBackController.back=record.detailsBackOriginal;
        if(record){record.detailsBackFrame=0;record.detailsBackController=null;record.detailsBackOriginal=null;record.detailsBackWrapper=null;}
    }
    function installDetailsScroll(record){
        if(record.detailScrollBound||!record.detailGroup)return;
        var initialOwner=detailsInputOwner(record);if(!initialOwner||!initialOwner.scroll)return;
        record.detailScrollOwner=initialOwner.scroll;
        record.detailKeydown=function(event){
            if(!event||event.defaultPrevented||!/^Arrow(Up|Down|Left|Right)$/.test(event.key)||!detailsInputOwner(record))return;
            var vertical=/^Arrow(Up|Down)$/.test(event.key);
            var currentController=Lampa.Controller.enabled(),currentFocus=record.page&&record.page.querySelector('.selector.focus');
            if(currentController&&['full_descr','full_start'].indexOf(currentController.name)>=0&&currentFocus&&currentFocus.isConnected&&currentFocus.offsetParent!==null&&(record.detailsHostLine||record.page).contains(currentFocus))record.detailLastFocus=currentFocus;
            if(record.detailScrollFrame)cancelAnimationFrame(record.detailScrollFrame);
            record.detailScrollFrame=requestAnimationFrame(function(){
                record.detailScrollFrame=0;
                var owner=detailsInputOwner(record);if(!owner||owner.scroll!==record.detailScrollOwner)return;
                // Full Details controls above the disclosure group (notably
                // the description expander) use the same native scroll area.
                // Keep any currently focused Full selector in view, not only
                // selectors nested in the three disclosure panels.
                var focused=record.page&&record.page.querySelector('.selector.focus');
                var enabled=Lampa.Controller&&Lampa.Controller.enabled&&Lampa.Controller.enabled(),scope=record.detailsHostLine||record.page;
                if(enabled&&['full_descr','full_start'].indexOf(enabled.name)>=0&&enabled.controller===owner.controller&&enabled.controller.link&&focused&&focused.isConnected&&focused.offsetParent!==null&&scope.contains(focused)){
                    enabled.controller.link.last=focused;
                    if(enabled.name==='full_descr'||record.detailsZoneActive)record.detailLastFocus=focused;
                }
                if(vertical&&focused&&focused.isConnected&&focused.offsetParent!==null&&owner.scroll&&typeof owner.scroll.immediate==='function'&&detailsNeedsScroll(focused))owner.scroll.immediate(focused);
            });
        };
        document.addEventListener('keydown',record.detailKeydown,true);record.detailScrollBound=true;
    }
    function restoreDetailsPresentation(record) {
        unbindDetailSelectFocus(record);restoreDetailsDown(record);restoreDetailsBack(record);
        if(record.relatedListObserver){record.relatedListObserver.disconnect();record.relatedListObserver=null;}
        if(record.relatedListFrame)cancelAnimationFrame(record.relatedListFrame);record.relatedListFrame=0;record.relatedListsPending=false;
        if(record.detailScrollFrame)cancelAnimationFrame(record.detailScrollFrame);record.detailScrollFrame=0;record.detailScrollOwner=null;
        if(record.detailScrollBound)document.removeEventListener('keydown',record.detailKeydown,true);record.detailScrollBound=false;record.detailKeydown=null;
        (record.detailPanels||[]).slice().reverse().forEach(function(panel){
            if(panel.toggle){$(panel.toggle).off('.shDetails');panel.toggle.removeEventListener('click',panel.activate);}
            (panel.nodes||[]).slice().reverse().forEach(function(item){
                if(item.node&&item.parent)item.parent.insertBefore(item.node,item.next&&item.next.parentNode===item.parent?item.next:null);
            });
            if(panel.root&&panel.root.parentNode)panel.root.parentNode.removeChild(panel.root);
        });
        record.detailPanels=[];
        if(record.detailGroup&&record.detailGroup.parentNode)record.detailGroup.parentNode.removeChild(record.detailGroup);record.detailGroup=null;
        restoreInertCommentStatuses(record);
        (record.hiddenProductionCounts||[]).forEach(function(node){node.classList.remove('sh-production-count-hidden');});record.hiddenProductionCounts=[];
        restoreProductionLabels(record);
        if(record.networkPlaceholder)record.networkPlaceholder.classList.remove('sh-detail-panels-empty');record.networkPlaceholder=null;
        if(record.relatedListMove){var related=record.relatedListMove;if(related.node&&related.parent)related.parent.insertBefore(related.node,related.next&&related.next.parentNode===related.parent?related.next:null);record.relatedListMove=null;}
        (record.hiddenDetailHeadings||[]).forEach(function(node){node.classList.remove('sh-details-heading-hidden');});record.hiddenDetailHeadings=[];
        (record.emptyDetailsRows||[]).forEach(function(node){node.classList.remove('sh-details-empty-native-row');});record.emptyDetailsRows=[];
        if(record.detailsSecondary&&record.detailsSecondary.parentNode)record.detailsSecondary.parentNode.removeChild(record.detailsSecondary);
        if(record.detailsPeopleHeading&&record.detailsPeopleHeading.parentNode)record.detailsPeopleHeading.parentNode.removeChild(record.detailsPeopleHeading);
        record.detailsSecondary=null;record.detailsSecondaryHeading=null;record.detailsPeopleHeading=null;
        (record.nativeGenreRows||[]).forEach(function(entry){if(entry.row&&!entry.rowHadClass)entry.row.classList.remove('sh-genre-chips');(entry.chips||[]).forEach(function(chip,index){$(chip).off('.shDetails');if(!entry.genreHad[index])chip.classList.remove('sh-genre-chip');if(!entry.selectorHad[index])chip.classList.remove('selector');if(entry.roles[index]===null)chip.removeAttribute('role');else chip.setAttribute('role',entry.roles[index]);});});record.nativeGenreRows=[];
        if(record.genreChips){record.genreChips.querySelectorAll('.sh-genre-chip').forEach(function(chip){$(chip).off('.shDetails');});if(record.genreChips.parentNode)record.genreChips.parentNode.removeChild(record.genreChips);}
        record.genreChips=null;
    }
    function refreshMovieCollection(record,focus){
        var active=Lampa.Controller.enabled();
        if(!active||['full_start','full_descr'].indexOf(active.name)<0||!active.controller)return;
        var nativeLast=active.controller.link&&active.controller.link.last,visual=focus||record.page.querySelector('.selector.focus'),detailsScope=record.detailsHostLine;
        var inDetails=active.name==='full_descr'||(active.name==='full_start'&&detailsScope&&(record.detailsZoneActive||(visual&&detailsScope.contains(visual))||(nativeLast&&detailsScope.contains(nativeLast))||(focus&&detailsScope.contains(focus))));
        var scope=inDetails?(detailsScope||record.page):record.root;if(inDetails)record.detailsZoneActive=active.name==='full_start';
        var staleNativeFocus=nativeLast&&(!nativeLast.isConnected||nativeLast.offsetParent===null||!scope.contains(nativeLast));
        var target=focus&&focus.isConnected&&focus.offsetParent!==null?focus:(staleNativeFocus?null:record.page.querySelector('.selector.focus'));
        if(!target||!target.isConnected||target.offsetParent===null||!scope.contains(target)){
            var visualToggles=record.page.querySelectorAll?Array.prototype.slice.call(record.page.querySelectorAll('.sh-detail-toggle')):(record.detailPanels||[]).map(function(panel){return panel.toggle;});
            target=[record.descriptionToggle].concat(visualToggles).filter(function(node){return node&&node.isConnected&&node.offsetParent!==null&&scope.contains(node);})[0]||null;
        }
        // Native collectionSet defaults to every `.selector`, including
        // descendants hidden by collapsed disclosures. Its third argument
        // uses Lampa's own offsetParent visibility filter.
        Lampa.Controller.collectionSet(scope,null,true);
        if(target&&target.isConnected&&target.offsetParent!==null&&scope.contains(target)){Lampa.Controller.collectionFocus(target,scope);if(active.controller.link)active.controller.link.last=target;if(inDetails)record.detailLastFocus=target;}
    }
    function refreshActiveDetailsCollection(record,focus){
        var enabled=Lampa.Controller&&Lampa.Controller.enabled&&Lampa.Controller.enabled();
        if(!enabled||enabled.name!=='full_descr'&&!(enabled.name==='full_start'&&record.detailsZoneActive))return false;
        refreshMovieCollection(record,focus);return true;
    }
    function hideEmptyNativeDetailsRow(record,line){
        if(!line||!line.classList||!line.classList.contains('items-line'))return false;
        var body=line.querySelector('.items-line__body')||line;
        if(body.textContent&&body.textContent.replace(/\s/g,''))return false;
        if(['.selector','img','video','audio','input','button','a','.full-episode','.full-person','.card'].some(function(selector){return !!body.querySelector(selector);}))return false;
        record.emptyDetailsRows=record.emptyDetailsRows||[];
        if(record.emptyDetailsRows.indexOf(line)<0){record.emptyDetailsRows.push(line);line.classList.add('sh-details-empty-native-row');}
        return true;
    }
    function hideNativeDetailsHeading(record,line){
        if(record.nativeDetailsHeading)record.nativeDetailsHeading.classList.remove('sh-details-heading-hidden');
        record.nativeDetailsHeading=null;
        var head=line&&line.querySelector('.items-line__head'),title=head&&head.querySelector('.items-line__title');if(!title)return;
        var controls=head.querySelector('.selector,button,a,input,[role="button"]'),target=!controls&&head.children.length===1&&head.children[0]===title?head:title;
        target.classList.add('sh-details-heading-hidden');record.hiddenDetailHeadings=record.hiddenDetailHeadings||[];
        if(record.hiddenDetailHeadings.indexOf(target)<0)record.hiddenDetailHeadings.push(target);record.nativeDetailsHeading=target;
    }
    function organizeDetailsZones(record){
        var root=record.root;if(!root)return;
        var lines=record.page.querySelectorAll('.items-line'),host=record.descriptionNativeLine&&record.descriptionNativeLine.isConnected?record.descriptionNativeLine:(record.detailsHostLine&&record.detailsHostLine.isConnected?record.detailsHostLine:null);
        if(!host)Array.prototype.some.call(lines,function(line){if(line.querySelector('.full-descr')){host=line;return true;}return false;});
        hideNativeDetailsHeading(record,host);
        record.detailsHostLine=host;
        var hostBody=host&&(Array.prototype.filter.call(host.children,function(child){return child.classList&&child.classList.contains('items-line__body');})[0]||host.querySelector('.items-line__body')||host),parent=hostBody||root;
        if(!record.detailsSecondary){
            record.detailsSecondary=document.createElement('section');record.detailsSecondary.className='sh-details-secondary';
            record.detailsSecondaryHeading=document.createElement('div');record.detailsSecondaryHeading.className='sh-details-zone-title';record.detailsSecondaryHeading.textContent='Опис і додаткова інформація';
            record.detailsSecondary.appendChild(record.detailsSecondaryHeading);
        }
        if(record.detailsSecondary.parentNode!==parent)parent.appendChild(record.detailsSecondary);
        [record.description,record.descriptionToggle,record.genreChips,record.detailGroup].forEach(function(node){if(node&&node.isConnected&&node.parentNode!==record.detailsSecondary)record.detailsSecondary.appendChild(node);});
        var firstContent=null;
        Array.prototype.some.call(lines,function(line){
            if(line===host||line===record.detailsSecondary)return false;
            if(hideEmptyNativeDetailsRow(record,line))return false;
            // Native providers may populate a line after the first adaptation.
            // Re-evaluate previously hidden rows before skipping them so text,
            // actions and media cards can re-enter the visible native feed.
            line.classList.remove('sh-details-empty-native-row');
            if(line.querySelector('.full-episode')||line.querySelector('.full-person')||line.querySelector('.card.selector')){firstContent=line;return true;}
            return false;
        });
        if(firstContent){
            if(!record.detailsPeopleHeading){record.detailsPeopleHeading=document.createElement('div');record.detailsPeopleHeading.className='sh-details-zone-title sh-details-zone-title--content';}
            record.detailsPeopleHeading.textContent=record.kind==='tv'?'Епізоди, актори та схоже':'Актори та схоже';
            if(record.detailsPeopleHeading.parentNode!==firstContent.parentNode)firstContent.parentNode.insertBefore(record.detailsPeopleHeading,firstContent);
            else if(record.detailsPeopleHeading.nextSibling!==firstContent)firstContent.parentNode.insertBefore(record.detailsPeopleHeading,firstContent);
        }else if(record.detailsPeopleHeading&&record.detailsPeopleHeading.parentNode)record.detailsPeopleHeading.parentNode.removeChild(record.detailsPeopleHeading);
    }
    function detailDisclosure(record,parent,label,key,nodes,initiallyOpen) {
        if(!parent||!nodes||!nodes.length)return null;
        record.detailPanels=record.detailPanels||[];
        var existing=record.detailPanels.filter(function(panel){return panel.key===key&&panel.root.isConnected;})[0];
        if(existing){
            nodes.filter(function(node){return node&&node.parentNode&&!existing.nodes.some(function(item){return item.node===node;});}).forEach(function(node){existing.nodes.push({node:node,parent:node.parentNode,next:node.nextSibling});existing.body.appendChild(node);});
            return existing;
        }
        nodes=nodes.filter(function(node){return node&&node.parentNode;});if(!nodes.length)return null;
        var section=document.createElement('section');section.className='sh-detail-section sh-detail-section--'+key;
        var toggle=document.createElement('div');toggle.className='selector sh-detail-toggle';toggle.setAttribute('role','button');toggle.setAttribute('aria-expanded',String(!!initiallyOpen));toggle.setAttribute('aria-controls','sh-detail-panel-'+key);toggle.textContent=label;
        var body=document.createElement('div');body.className='sh-detail-section__body';body.id='sh-detail-panel-'+key;body.hidden=!initiallyOpen;
        var panel={key:key,root:section,toggle:toggle,body:body,nodes:[]};
        nodes.forEach(function(node){panel.nodes.push({node:node,parent:node.parentNode,next:node.nextSibling});});
        parent.insertBefore(section,nodes[0]);section.appendChild(toggle);section.appendChild(body);nodes.forEach(function(node){body.appendChild(node);});if(initiallyOpen)section.classList.add('is-open');
        panel.activate=function(){var open=toggle.getAttribute('aria-expanded')!=='true';setDetailDisclosure(panel,open);refreshMovieCollection(record,toggle);};
        $(toggle).on('hover:enter.shDetails',panel.activate);toggle.addEventListener('click',panel.activate);
        record.detailPanels.push(panel);
        return panel;
    }
    function decorateProductionLabels(record,networks){
        if(!record||!networks||!networks.querySelectorAll)return;
        record.productionLabelAttrs=record.productionLabelAttrs||[];
        Array.prototype.forEach.call(networks.querySelectorAll('.network-logo'),function(node){
            var image=node.querySelector&&node.querySelector('img'),name=image&&(image.getAttribute('alt')||'').trim();
            if(!name)name=(node.getAttribute('aria-label')||node.getAttribute('title')||'').trim();
            if(!name)return;
            if(!record.productionLabelAttrs.some(function(item){return item.node===node;}))record.productionLabelAttrs.push({node:node,attrs:['data-sh-name','aria-label','title'].map(function(key){return {key:key,value:node.getAttribute(key)};})});
            node.setAttribute('data-sh-name',name);
            if(!node.getAttribute('aria-label'))node.setAttribute('aria-label',name);
            if(!node.getAttribute('title'))node.setAttribute('title',name);
        });
    }
    function restoreProductionLabels(record){
        (record.productionLabelAttrs||[]).forEach(function(item){item.attrs.forEach(function(attr){if(attr.value===null)item.node.removeAttribute(attr.key);else item.node.setAttribute(attr.key,attr.value);});});record.productionLabelAttrs=[];
    }
    function stripInertCommentStatuses(record,comments){
        var changed=false,focused=false;
        if(!record||!comments||!comments.querySelectorAll)return {changed:false,focused:false};
        record.inertCommentStatuses=record.inertCommentStatuses||[];
        Array.prototype.forEach.call(comments.querySelectorAll('.ua-status-card.selector'),function(node){
            if(!record.inertCommentStatuses.some(function(item){return item.node===node;}))record.inertCommentStatuses.push({node:node,selector:node.classList.contains('selector'),focus:node.classList.contains('focus')});
            var enabled=Lampa.Controller&&Lampa.Controller.enabled&&Lampa.Controller.enabled(),last=enabled&&enabled.controller&&enabled.controller.link&&enabled.controller.link.last;
            last=last&&(last[0]||last);
            if(node.classList.contains('focus')||document.activeElement===node||last===node)focused=true;
            node.classList.remove('selector');node.classList.remove('focus');changed=true;
        });
        return {changed:changed,focused:focused};
    }
    function restoreInertCommentStatuses(record){
        (record.inertCommentStatuses||[]).forEach(function(item){if(!item.node||!item.node.classList)return;if(item.selector)item.node.classList.add('selector');if(item.focus)item.node.classList.add('focus');});
        record.inertCommentStatuses=[];
    }
    function watchRelatedLists(record){
        if(!record||record.relatedListObserver||typeof MutationObserver!=='function'||record.page.querySelector('.trakttv-lists'))return;
        var observer=new MutationObserver(function(){
            if(!record.page.isConnected){observer.disconnect();record.relatedListObserver=null;return;}
            if(!record.page.querySelector('.trakttv-lists'))return;
            observer.disconnect();record.relatedListObserver=null;
            var active=detailsPageOwner(record);if(!active){record.relatedListsPending=true;return;}
            if(record.relatedListFrame)cancelAnimationFrame(record.relatedListFrame);
            record.relatedListFrame=requestAnimationFrame(function(){record.relatedListFrame=0;if(detailsPageOwner(record)){record.relatedListsPending=false;adaptMovie();}else record.relatedListsPending=true;});
        });
        record.relatedListObserver=observer;observer.observe(record.page,{childList:true,subtree:true});
    }
    function setupDetailsPresentation(record,movie) {
        var page=record.page,root=record.root,tagBlock=page.querySelector('.full-descr__tags:not(.networks-wrapper)'),networks=page.querySelector('.tmdb-networks');
        var previousPanelCount=(record.detailPanels||[]).length,previousGenreSignature=record.genreSignature||'',genreSignature='',productionCountFocus=false;
        var genreControl=record.genreControl&&record.genreControl.isConnected?record.genreControl:null,detailControls=[];
        if(tagBlock){
            var relatedLists=page.querySelector('.trakttv-lists');
            if(!relatedLists)watchRelatedLists(record);
            if(relatedLists&&relatedLists.parentNode&&relatedLists.parentNode!==tagBlock&&!(record.detailPanels||[]).some(function(panel){return panel.key==='additional'&&panel.body.contains(relatedLists);})){if(!record.relatedListMove)record.relatedListMove={node:relatedLists,parent:relatedLists.parentNode,next:relatedLists.nextSibling};tagBlock.appendChild(relatedLists);}
            Array.prototype.forEach.call(tagBlock.querySelectorAll('.tag-count.selector'),function(node){
                var name=(node.querySelector('.tag-count__name')||node).textContent.trim().toLowerCase();
                if(name.indexOf('жанр')===0)genreControl=node;
            });
            if(genreControl)record.genreControl=genreControl;
            // This native row can label keyword filters as "Ключові слова"
            // (and plugins may localize them differently). Every non-production
            // selector moved into Additional Information needs Select focus
            // restoration; identify the Studio control by ownership, not label.
            detailControls=Array.prototype.filter.call(tagBlock.querySelectorAll('.tag-count.selector'),function(node){var name=(node.querySelector('.tag-count__name')||node).textContent.trim().toLowerCase();return name.indexOf('виробниц')!==0;});
            if(detailControls.length)detailDisclosure(record,tagBlock,'Додаткова інформація','additional',detailControls);
        }
        if(genreControl&&detailControls.indexOf(genreControl)<0)detailControls.push(genreControl);
        var productionCount=tagBlock&&Array.prototype.filter.call(tagBlock.querySelectorAll('.tag-count.selector'),function(node){return (node.querySelector('.tag-count__name')||node).textContent.trim().toLowerCase().indexOf('виробниц')===0;})[0];
        if(productionCount&&productionCount.parentNode===tagBlock){var enabledBeforeProduction=Lampa.Controller&&Lampa.Controller.enabled&&Lampa.Controller.enabled();productionCountFocus=productionCount.classList.contains('focus')||document.activeElement===productionCount||!!(enabledBeforeProduction&&enabledBeforeProduction.controller&&enabledBeforeProduction.controller.link&&enabledBeforeProduction.controller.link.last===productionCount);record.hiddenProductionCounts=record.hiddenProductionCounts||[];if(!record.hiddenProductionCounts.some(function(node){return node===productionCount;})){record.hiddenProductionCounts.push(productionCount);productionCount.classList.add('sh-production-count-hidden');}}
        if(networks){
            decorateProductionLabels(record,networks);
            var studioGroup=networks.querySelector('.studios-group'),platformGroup=networks.querySelector('.platforms-group'),separator=networks.querySelector('.network-separator'),networkWrapper=networks.querySelector('.networks-wrapper');
            var hasProductionLogos=!!((platformGroup&&platformGroup.querySelectorAll('.network-logo').length)||(studioGroup&&studioGroup.querySelectorAll('.network-logo').length));
            var studioNodes=hasProductionLogos?[platformGroup,separator,studioGroup].filter(Boolean):[];
            if(studioNodes.length)detailDisclosure(record,networkWrapper||networks,'Студії та виробництво','production',studioNodes);
        }
        var comments=page.querySelector('.ua-comments-root'),commentStatus=stripInertCommentStatuses(record,comments);
        if(comments&&comments.parentNode)detailDisclosure(record,comments.parentNode,'Коментарі','comments',[comments],true);
        var genres=Array.isArray(movie&&movie.genres)?movie.genres.filter(function(g){return g&&typeof g.name==='string'&&g.name.trim();}).filter(function(g,i,all){return all.findIndex(function(x){return String(x.id||x.name)===String(g.id||g.name);})===i;}):[];
        genreSignature=genres.slice(0,6).map(function(g){return String(g.id||'')+':'+g.name.trim();}).join('|');
        var knownGenreNames=genres.map(function(g){return g.name.trim().toLowerCase();}),nativeGenreRow=null;
        if(knownGenreNames.length){
            Array.prototype.some.call(root.querySelectorAll('.full-start-new__details .ifx-series-info > div'),function(row){
                var labels=Array.prototype.map.call(row.querySelectorAll('span'),function(span){return span.textContent.trim().toLowerCase();}).filter(Boolean);
                if(labels.length&&labels.every(function(label){return knownGenreNames.indexOf(label)>=0;})){nativeGenreRow=row;return true;}return false;
            });
        }
        if(nativeGenreRow){record.nativeGenreRows=record.nativeGenreRows||[];if(!record.nativeGenreRows.some(function(entry){return entry.row===nativeGenreRow;})){var nativeChips=Array.prototype.slice.call(nativeGenreRow.querySelectorAll('span'));record.nativeGenreRows.push({row:nativeGenreRow,rowHadClass:nativeGenreRow.classList.contains('sh-genre-chips'),chips:nativeChips,roles:nativeChips.map(function(chip){return chip.getAttribute('role');}),selectorHad:nativeChips.map(function(chip){return chip.classList.contains('selector');}),genreHad:nativeChips.map(function(chip){return chip.classList.contains('sh-genre-chip');})});}nativeGenreRow.classList.add('sh-genre-chips');Array.prototype.forEach.call(nativeGenreRow.querySelectorAll('span'),function(chip){chip.classList.add('sh-genre-chip');$(chip).off('.shDetails');if(!record.nativeGenreRows.some(function(entry){return entry.chips.indexOf(chip)>=0&&entry.selectorHad[entry.chips.indexOf(chip)];})){chip.classList.remove('selector');chip.removeAttribute('role');}});}
        if(genres.length&&!nativeGenreRow){
            if(!record.genreChips){record.genreChips=document.createElement('div');record.genreChips.className='sh-genre-chips';record.genreChips.setAttribute('aria-label','Жанри');var anchor=record.descriptionToggle||record.description||root.querySelector('.full-start-new__details')||root.querySelector('.full-start-new__buttons');if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(record.genreChips,anchor.nextSibling);}
            if(record.genreSignature!==genreSignature){record.genreChips.querySelectorAll('.sh-genre-chip').forEach(function(chip){$(chip).off('.shDetails');});record.genreChips.textContent='';
                genres.slice(0,6).forEach(function(genre){var chip=document.createElement('span');chip.className='sh-genre-chip';chip.textContent=genre.name.trim();record.genreChips.appendChild(chip);});record.genreSignature=genreSignature;}
        }
        if((!genres.length||nativeGenreRow)&&record.genreChips){record.genreChips.querySelectorAll('.sh-genre-chip').forEach(function(chip){$(chip).off('.shDetails');});record.genreChips.remove();record.genreChips=null;record.genreSignature='';}
        var commentPanel=(record.detailPanels||[]).filter(function(panel){return panel.key==='comments';})[0],productionPanel=(record.detailPanels||[]).filter(function(panel){return panel.key==='production';})[0],additionalPanel=(record.detailPanels||[]).filter(function(panel){return panel.key==='additional';})[0];
        if(commentPanel||productionPanel||additionalPanel){if(root){if(!record.detailGroup){record.detailGroup=document.createElement('div');record.detailGroup.className='sh-detail-panels';}if(record.detailGroup.parentNode!==root&&record.detailGroup.parentNode!==record.detailsSecondary)root.appendChild(record.detailGroup);[commentPanel,productionPanel,additionalPanel].forEach(function(panel){if(panel&&panel.root.isConnected)record.detailGroup.appendChild(panel.root);});if(networks){record.networkPlaceholder=networks;networks.classList.add('sh-detail-panels-empty');}installDetailsScroll(record);}}else if(record.detailGroup){record.detailGroup.remove();record.detailGroup=null;record.detailPanels=[];restoreDetailsBack(record);}
        if(record.detailGroup){var commentPanelForHeading=(record.detailPanels||[]).filter(function(panel){return panel.key==='comments';})[0];Array.prototype.forEach.call(page.querySelectorAll('.items-line__title'),function(title){if(title.textContent.trim()!=='Детально'||!title.parentNode)return;var line=title.parentNode;while(line&&line!==page&&!line.classList.contains('items-line'))line=line.parentNode;var emptyTags=line&&line.querySelector('.full-descr__tags:not(.networks-wrapper)'),ownsMovedComments=commentPanelForHeading&&commentPanelForHeading.nodes.some(function(item){return item.parent===line;});if(line&&(ownsMovedComments||(emptyTags&&!emptyTags.querySelector('.tag-count.selector')))){record.hiddenDetailHeadings=record.hiddenDetailHeadings||[];if(record.hiddenDetailHeadings.indexOf(title)<0)record.hiddenDetailHeadings.push(title);title.classList.add('sh-details-heading-hidden');}});}
        // Bind the controls actually mounted in the disclosure. Interface and
        // Trakt can move/add selectors between adaptations, so the source row's
        // pre-move query is not authoritative for Select return focus.
        var mountedSelectControls=additionalPanel?Array.prototype.slice.call(additionalPanel.body.querySelectorAll('.tag-count.selector')):detailControls.slice();
        if(genreControl&&mountedSelectControls.indexOf(genreControl)<0)mountedSelectControls.push(genreControl);
        bindDetailSelectFocus(record,mountedSelectControls);
        if((record.detailPanels||[]).length)installDetailsBack(record);else restoreDetailsBack(record);
        if(commentStatus.focused&&commentPanel)refreshMovieCollection(record,commentPanel.toggle);
        else if(commentStatus.changed)refreshMovieCollection(record);
        else if(productionCountFocus)refreshMovieCollection(record,(productionPanel||commentPanel||additionalPanel)&&((productionPanel||commentPanel||additionalPanel).toggle));
        else if((record.detailPanels||[]).length!==previousPanelCount||previousGenreSignature!==genreSignature)refreshMovieCollection(record);
    }
    function removeDescriptionToggles(record){
        record.moves=record.moves||[];
        var nodes=record.root&&record.root.querySelectorAll?record.root.querySelectorAll('.sh-description-toggle'):[];
        Array.prototype.forEach.call(nodes,function(node){
            if(!record.moves.some(function(item){return item.node===node;})&&node.parentNode)record.moves.push({node:node,parent:node.parentNode,next:node.nextSibling});
            if(node.parentNode)node.parentNode.removeChild(node);
        });
    }
    function setupDescription(record, description) {
        if(record.descriptionPrepared===description){removeDescriptionToggles(record);return;}
        clearDescription(record);record.descriptionPrepared=description;record.description=description;record.descriptionToggle=null;record.toggleDescription=null;
        removeDescriptionToggles(record);
        record.root.classList.add("sh-description-expanded");record.page.classList.add("sh-description-expanded");
    }
    function clearDescription(record) {
        if(record.descriptionToggle){$(record.descriptionToggle).off(".shDescription").remove();record.descriptionToggle=null;record.toggleDescription=null;}
        record.descriptionPrepared=null;record.root.classList.remove("sh-description-expanded");if(record.page)record.page.classList.remove("sh-description-expanded");
    }
    function plainDescription(record, description) {
        if(description.classList.contains('sh-generated-description'))return description;
        var nodes=description.matches('.full-descr__text')?[description]:Array.prototype.slice.call(description.querySelectorAll('.full-descr__text'));
        nodes.forEach(function(node){
            if(node.hasAttribute('data-sh-plain-description'))return;
            var plain=document.createElement('div');plain.className='full-descr__text';plain.setAttribute('data-sh-plain-description','');plain.textContent=node.textContent;
            if(node.parentNode)node.parentNode.replaceChild(plain,node);
            record.plainDescriptions=record.plainDescriptions||[];record.plainDescriptions.push({original:node,plain:plain});
            if(description===node)description=plain;
        });
        return description;
    }
    function focusMovieActions(record, visible) {
        var controller=Lampa.Controller.enabled(),link=controller.controller&&controller.controller.link;
        if(controller.name!=='full_start'||!link||!visible.length||nativeOverlayOwnsInput())return;
        bindRatingNavigation(record,controller.controller);
        var primary=visible.filter(function(node){return node.classList.contains('view--torrent');})[0]||visible[0],focus=record.page&&record.page.querySelector('.selector.focus'),focusVisible=focus&&focus.isConnected!==false&&focus.offsetParent!==null;
        var detailsScope=record.detailsHostLine||record.page,detailsOwned=record.detailsZoneActive&&detailsScope&&((focusVisible&&detailsScope.contains(focus))||(link.last&&detailsScope.contains(link.last))),scope=detailsOwned?detailsScope:record.root;
        var inScope=function(node){return node&&node.isConnected!==false&&node.offsetParent!==null&&scope.contains(node);},focusInScope=focusVisible&&inScope(focus),lastInScope=inScope(link.last),safePrimary=detailsOwned?detailsZoneTarget(record,record.detailLastFocus):primary;
        if(!record.initialFocusDone){
            if(detailsOwned&&safePrimary){link.last=safePrimary;Lampa.Controller.collectionSet(scope,null,true);Lampa.Controller.collectionFocus(safePrimary,scope);record.detailLastFocus=safePrimary;}
            else{link.last=primary;Lampa.Controller.collectionSet(record.root,null,true);Lampa.Controller.collectionFocus(primary,record.root);}
        }
        else if(focusInScope)link.last=focus;
        else if(!lastInScope)link.last=safePrimary||primary;
        record.initialFocusDone=true;
    }
    function bindRatingNavigation(record,controller) {
        if(!controller||typeof controller.up!=='function'||controller.up===record.ratingUp)return;
        if(record.ratingController&&record.ratingController.up===record.ratingUp)record.ratingController.up=record.originalRatingUp;
        var original=controller.up;
        record.ratingController=controller;record.originalRatingUp=original;
        record.ratingUp=function(){
            var from=record.root.querySelector('.full-start-new__buttons .selector.focus'),rating=record.root.querySelector('.tp-personal-rating');
            if(from&&rating&&rating.getClientRects().length&&record.root.isConnected){
                if(controller.link)controller.link.last=rating;
                Lampa.Controller.collectionSet(record.root);Lampa.Controller.collectionFocus(rating,record.root);return;
            }
            return original.apply(this,arguments);
        };
        controller.up=record.ratingUp;
    }
    function movieButtonFocus(event) {
        var row=event.currentTarget, button=event.target.closest('.full-start__button,.sh-description-toggle');
        if(button && row.contains(button)) {
            row.setAttribute('data-sh-action',button.classList.contains('sh-movie-primary')?'':button.getAttribute('title') || button.textContent.trim());
            var box=button.getBoundingClientRect(), bounds=row.getBoundingClientRect();
            if(box.right>bounds.right)row.scrollLeft+=box.right-bounds.right+8;
            else if(box.left<bounds.left)row.scrollLeft-=bounds.left-box.left+8;
        }
    }

    function ratingFallback(key){
        if(key==='oscar'||key==='award')return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="#e9c65c" d="M9 3h14v5h6v5c0 5-4 8-9 8v4h5v4H7v-4h5v-4C7 21 3 18 3 13V8h6zm0 8H6v2c0 3 2 4 4 5zm14 0-1 7c2-1 4-2 4-5v-2z"/></svg>');
        var label=({imdb:'IMDb',tmdb:'TMDB',cub:'CUB',trakt:'Trakt',rt:'RT',mc:'MC',letterboxd:'LB',avg:'AVG'})[key]||'★';
        return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32"><rect width="48" height="32" rx="5" fill="#252536"/><text x="24" y="21" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#eee">'+label+'</text></svg>');
    }
    function repairRatingImage(img){
        if(!img||img.dataset.shRatingFallback)return;
        var page=img.closest('.sh-movie-page'),record=movieRecords.filter(function(r){return r.page===page;})[0];if(!record)return;
        var block=img.closest('[data-rating-key]'),key=block&&block.dataset.ratingKey||'',src=img.getAttribute('src'),fallback=ratingFallback(key);
        record.ratingRepairs=record.ratingRepairs||[];record.ratingRepairs.push({img:img,src:src,fallback:fallback});img.dataset.shRatingFallback='true';img.alt=key||'Рейтинг';img.src=fallback;
    }
    function onRatingError(event){if(event.target.matches&&event.target.matches('.custom-rating .rating-icon-wrap img'))repairRatingImage(event.target);}
    function consolidateMetadata(record){
        var root=record.root,plain=root.querySelector('.cardify__details .full-start-new__details:not(.trakt)'),rich=Array.prototype.find.call(root.querySelectorAll('.full-start-new__details'),function(n){return !n.querySelector('.trakt-icon')&&!!n.querySelector('span[style]')&&/Тривалість|duration|runtime/i.test(n.textContent);});
        if(!rich)return;rich.classList.add('sh-metadata-rich');
        if(!plain||plain===rich)return;
        plain.classList.add('sh-metadata-shadow');
        if(rich.parentNode!==plain.parentNode){record.moves.push({node:rich,parent:rich.parentNode,next:rich.nextSibling});plain.parentNode.insertBefore(rich,plain);}
    }
    function updateSeriesMetadata(record){
        if(record.kind!=='tv'||record.root.querySelector('[data-series-info]'))return;
        var movie=streamMovie(record),details=record.root.querySelector('.sh-metadata-rich')||record.root.querySelector('.cardify__details .full-start-new__details:not(.trakt)')||record.root.querySelector('.full-start-new__details:not(.trakt)');if(!details)return;
        (record.seriesFields||[]).forEach(function(n){n.remove();});record.seriesFields=[];
        function add(key,value){if(!value||record.seriesFields.some(function(n){return n.dataset.shField===key;}))return;var n=document.createElement('span');n.className='sh-series-field';n.dataset.shField=key;n.textContent=value;details.appendChild(n);record.seriesFields.push(n);}
        var text=details.textContent;
        // Series/episode counts and next-episode numbering belong to Trakt+.
        // Keep only the pre-existing runtime fallback when Interface+ is absent.
        if(Array.isArray(movie.episode_run_time)&&movie.episode_run_time.length&&!/тривалість|runtime|хв|mins/i.test(text)){var times=movie.episode_run_time.filter(function(n){return n>0;});if(times.length)add('runtime','Тривалість серії: '+Math.min.apply(Math,times)+(times.length>1?'–'+Math.max.apply(Math,times):'')+' хв');}
    }
    function adaptMovie() {
        if(!watching)return;
        var active=Lampa.Activity.active();
        if(!active || active.component!=='full' || (active.method!=='movie'&&active.method!=='tv') || !active.activity)return;
        var page=active.activity.render()[0], root=page.querySelector('.full-start-new');
        if(!root)return;
        var left=root.querySelector('.cardify__left') || root.querySelector('.full-start-new__right'), buttons=root.querySelector('.full-start-new__buttons');
        if(!left || !buttons)return;
        var record=movieRecords.filter(function(r){return r.root===root;})[0];
        if(!record){record={root:root,page:page,column:left,activity:active.activity,kind:active.method==='tv'?'tv':'movie',moves:[],labels:[]};movieRecords.push(record);}
        page.querySelectorAll('.full-descr__details').forEach(function(fields){if(fields.parentNode){record.moves.push({node:fields,parent:fields.parentNode,next:fields.nextSibling});fields.remove();}});
        function move(node,afterButtons){
            if(!node)return;
            var placed=node.parentNode===left&&(afterButtons?node.previousSibling===buttons:node.nextSibling===buttons)||(node===record.description&&record.detailsSecondary&&node.parentNode===record.detailsSecondary);
            if(placed)return;
            if(!record.moves.some(function(item){return item.node===node;}))record.moves.push({node:node,parent:node.parentNode,next:node.nextSibling});
            var reference=afterButtons?buttons.nextSibling:buttons;
            if(reference!==node)left.insertBefore(node,reference);
        }
        setupMovieBrand(record);
        root.classList.add('sh-movie');root.classList.toggle('sh-series',record.kind==='tv');consolidateMetadata(record);updateSeriesMetadata(record);root.classList.toggle('sh-movie-native',!page.querySelector('.cardify-effects-overlay')); page.classList.add('sh-movie-page');left.classList.add('sh-movie-column');
        var description=root.querySelector('.custom-ghost-main') || page.querySelector('.full-descr__text');
        var movie=streamMovie(record);
        if(!description&&movie._tp_omit_details&&movie.overview){description=document.createElement('div');description.className='full-descr__text sh-generated-description';description.textContent=movie.overview;}
        if(description){description=plainDescription(record,description);record.description=description;var sourceLine=description.parentNode;while(sourceLine&&sourceLine!==page&&!(sourceLine.classList&&sourceLine.classList.contains('items-line')))sourceLine=sourceLine.parentNode;if(sourceLine&&sourceLine!==page)record.descriptionNativeLine=sourceLine;move(description,true);description.classList.add('sh-movie-description');if(description.textContent.trim()&&typeof movie.overview==='string'&&movie.overview.trim())setupDescription(record,description);}
        setupDetailsPresentation(record,movie);
        organizeDetailsZones(record);
        move(root.querySelector('.cardify__right-box'));
        root.querySelectorAll('.sh-movie-primary').forEach(function(n){n.classList.remove('sh-movie-primary');});
        var visible=Array.prototype.filter.call(buttons.querySelectorAll('.full-start__button'),function(n){return n.classList.contains('selector')&&!n.classList.contains('hide')&&!n.classList.contains('hidden')&&n.getAttribute('aria-disabled')!=='true'&&!n.disabled&&n.getClientRects().length>0&&getComputedStyle(n).visibility!=='hidden';});
        var primary=visible.filter(function(n){return n.classList.contains('view--torrent');})[0]||visible[0];
        if(primary)primary.classList.add('sh-movie-primary');
        visible.forEach(function(node){
            if(!node.hasAttribute('title')){var title=node.textContent.trim() || (node.classList.contains('button--edit-order')?'Порядок дій':'Дія плагіна');node.setAttribute('title',title);record.labels.push({node:node,title:title});}
        });
        if(record.buttons && record.buttons!==buttons)record.buttons.removeEventListener('hover:focus',movieButtonFocus,true);
        record.buttons=buttons;buttons.addEventListener('hover:focus',movieButtonFocus,true);
        page.querySelectorAll('.custom-rating img').forEach(function(img){if(img.complete&&!img.naturalWidth)repairRatingImage(img);});
        movieButtonFocus({currentTarget:buttons,target:buttons.querySelector('.focus')||visible[0]||buttons});
        (record.castLines||[]).forEach(function(entry){(entry.line.items||[]).forEach(decoratePerson);});
        // Interface+ can replace a button after core FullStart cached it as last focus.
        focusMovieActions(record,visible);
    }
    function scheduleMovie() {
        stopMovieQueue();var active=Lampa.Activity.active();if(!active || active.component!=='full'||(active.method!=='movie'&&active.method!=='tv'))return;
        movieFrame=requestAnimationFrame(function(){movieFrame=0;adaptMovie();});
        // Interface+ inserts/reorders metadata and buttons asynchronously after full/complite.
        // Two bounded passes accommodate that work; no observer or recurring polling.
        [180,650].forEach(function(delay){movieTimers.push(setTimeout(adaptMovie,delay));});
    }
    function decoratePerson(person) {
        if(!watching||!person||!person.render)return;
        var rendered=person.render(),node=rendered&&(rendered[0]||rendered);if(!node||!node.querySelector)return;
        var api=window.TraktPlus,data=person.data||{},view=api&&api.cachedFilmography&&api.cachedFilmography(data),badge=node.querySelector('.sh-cast-watched');
        if(!view||!view.complete||!view.all.length){if(badge)badge.remove();return;}
        if(!badge){badge=document.createElement('div');badge.className='sh-cast-watched';(node.querySelector('.full-person__body')||node).appendChild(badge);}
        badge.textContent='Trakt · '+view.watched.length+' переглянуто';
    }
    function onCastWatched(){movieRecords.forEach(function(record){if(record.page.isConnected)(record.castLines||[]).forEach(function(entry){(entry.line.items||[]).forEach(decoratePerson);});});}
    function onMovieFull(event) {
        if(!watching||!event)return;
        if(event.type==='build'&&(event.name==='description'||event.name==='persons')){
            adaptMovie();var record=movieRecords.filter(function(r){return r.activity.component===event.link;})[0];if(!record)return;
            if(event.name==='description'){
                var fields=event.item.render()[0].querySelector('.full-descr__details');
                if(fields&&fields.parentNode){record.moves.push({node:fields,parent:fields.parentNode,next:fields.nextSibling});fields.remove();}
            }else if(!event.item._shCastHook){
                var hook={onInstance:function(person){person.use({onCreate:function(){decoratePerson(this);}});}};
                event.item._shCastHook=hook;event.item.use(hook);record.castLines=record.castLines||[];record.castLines.push({line:event.item,hook:hook});(event.item.items||[]).forEach(decoratePerson);
            }
        }
        if(event.type==='complite'||event.type==='archive')scheduleMovie();
    }

    // Native torrent Component hosted inside Full. Parser, rows, filters and playback stay native.

    var movieBrands=[],brandPending={},movieEnglish=[];
    function cachedBrand(id){return movieBrands.filter(function(x){return x.id===id;})[0];}
    function acceptMovieImages(id,data){
        brandPending[id]=false;movieBrands=movieBrands.filter(function(x){return x.id!==id;});movieBrands.push({id:id,images:data});while(movieBrands.length>8)movieBrands.shift();
        movieRecords.forEach(function(r){if(r.kind+':'+String(streamMovie(r).id)===String(id))applyMovieBrand(r,data);});
    }
    var paletteCache=[];
    function applyMoviePalette(record,url){
        if(!url||!window.TorrentsRedesign||!TorrentsRedesign.palette)return;
        if(record.accentImage)record.accentImage.onload=record.accentImage.onerror=null;
        var movie=streamMovie(record),urls=[{url:url,source:record.logo?'logo':'poster'}];
        [movie.poster_path,movie.backdrop_path].forEach(function(path,i){if(path){var next=Lampa.Api.img(path,'w500');if(!urls.some(function(x){return x.url===next;}))urls.push({url:next,source:i===0?'poster':'backdrop'});}});
        var generation=(record.paletteGeneration||0)+1;record.paletteGeneration=generation;
        function apply(p,source){
            var rgb=p.rgb.split(',').map(Number),light=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
            record.page.style.setProperty('--sm-accent',p.acc);record.page.style.setProperty('--sm-accent-rgb',p.rgb);record.page.style.setProperty('--sm-accent2',p.acc2);record.page.style.setProperty('--sm-accent2-rgb',p.rgb2);record.page.style.setProperty('--sm-accent-ink',light>165?'#080910':'#fff');record.root.dataset.shPalette=source;
        }
        function load(){
            if(record.brandDead||generation!==record.paletteGeneration)return;
            var item=urls.shift();if(!item){record.root.dataset.shPalette='fallback';return;}
            var cached=paletteCache.filter(function(x){return x.url===item.url;})[0];if(cached){if(cached.palette)apply(cached.palette,item.source);else load();return;}
            var image=new Image();record.accentImage=image;image.crossOrigin='anonymous';
            function finish(p){image.onload=image.onerror=null;if(record.brandDead||generation!==record.paletteGeneration)return;paletteCache.push({url:item.url,palette:p});while(paletteCache.length>16)paletteCache.shift();if(p)apply(p,item.source);else load();}
            image.onload=function(){try{
                var canvas=document.createElement('canvas');canvas.width=48;canvas.height=24;var ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,48,24);var pixels=ctx.getImageData(0,0,48,24).data,colored=0;
                for(var i=0;i<pixels.length;i+=4)if(pixels[i+3]>127&&Math.max(pixels[i],pixels[i+1],pixels[i+2])-Math.min(pixels[i],pixels[i+1],pixels[i+2])>40)colored++;
                finish(colored>3?TorrentsRedesign.palette(pixels):null);
            }catch(e){finish(null);}};
            image.onerror=function(){finish(null);};
            // Separate a CORS canvas response from an older opaque display-image cache entry.
            image.src=item.url+(item.url.indexOf('?')>=0?'&':'?')+'sh_palette=1';
        }load();
    }
    function applyMovieBrand(record,data){
        if(record.brandDead||record.logo)return;
        var logos=(data&&data.logos||[]).filter(function(x){return ['uk','en',null,''].indexOf(x.iso_639_1)>=0&&/\.(png|svg)$/i.test(x.file_path||'');});
        logos.sort(function(a,b){function rank(x){return x.iso_639_1==='uk'?0:x.iso_639_1==='en'?1:2;}return rank(a)-rank(b);});
        if(!logos.length){record.root.dataset.shLogo='unavailable';return;}
        var movie=streamMovie(record),logo=document.createElement('img');logo.className='sh-movie-logo';logo.alt=movie.title||movie.name||movie.original_title||movie.original_name||'';logo.decoding='async';record.logo=logo;
        logo.onload=function(){if(record.brandDead)return;record.root.classList.add('sh-branded');record.root.dataset.shLogo='loaded';applyMoviePalette(record,logo.src);};
        logo.onerror=function(){record.root.dataset.shLogo='unavailable';logo.remove();};record.column.insertBefore(logo,record.column.firstChild);logo.src=Lampa.Api.img(logos[0].file_path,'w500');
    }
    function setupMovieBrand(record){
        if(record.brandStarted)return;record.brandStarted=true;record.brandDead=false;
        var movie=streamMovie(record),kind=record.kind,id=String(movie.id),key=kind+':'+id,title=record.root.querySelector('.full-start-new__title');
        if(title&&(movie.original_title||movie.original_name)){var original=document.createElement('span');original.className='sh-original-title';original.textContent=movie.original_title||movie.original_name;title.appendChild(original);record.originalTitle=original;}
        if(record.originalTitle&&movie.original_language&&movie.original_language!=='en'){
            var english=movieEnglish.filter(function(x){return x.id===key;})[0];
            if(english&&english.title)record.originalTitle.textContent=english.title;
            else if(!english)Lampa.Api.sources.tmdb.get(kind+'/'+id+'/translations',{},function(data){
                var found=(data.translations||[]).filter(function(x){return x.iso_639_1==='en'&&x.data&&(x.data.title||x.data.name);})[0],name=found&&(found.data.title||found.data.name);
                movieEnglish.push({id:key,title:name||''});while(movieEnglish.length>8)movieEnglish.shift();if(name&&!record.brandDead&&record.originalTitle)record.originalTitle.textContent=name;
            },function(){});
        }

        var image=movie.poster_path||movie.backdrop_path;if(image)applyMoviePalette(record,Lampa.Api.img(image,'w500'));
        if(movie.images&&movie.images.logos)return applyMovieBrand(record,movie.images);
        var cached=cachedBrand(key);if(cached)return applyMovieBrand(record,cached.images);
        if(brandPending[key])return;brandPending[key]=true;
        Lampa.Api.sources.tmdb.get(kind+'/'+id+'/images?include_image_language=uk,en,null',{},function(data){if(watching)acceptMovieImages(key,data);else brandPending[key]=false;},function(){brandPending[key]=false;if(!record.brandDead)record.root.dataset.shLogo='unavailable';});
    }
    function removeMovieBrand(record){
        record.brandDead=true;if(record.logo){record.logo.onload=record.logo.onerror=null;record.logo.remove();}if(record.accentImage)record.accentImage.onload=record.accentImage.onerror=null;if(record.originalTitle)record.originalTitle.remove();
        record.root.classList.remove('sh-branded');delete record.root.dataset.shLogo;delete record.root.dataset.shPalette;
        ['--sm-accent','--sm-accent-rgb','--sm-accent2','--sm-accent2-rgb','--sm-accent-ink'].forEach(function(key){record.page.style.removeProperty(key);});
    }

    // Torrent Cinema independently owns the native Full/torrent integration.
    function streamMovie(record) {
        var movie=record.activity.component.props && record.activity.component.props.get('movie');
        return movie || Lampa.Activity.active().card;
    }
    function onStreamController(event) {
        syncNavigationState(event&&event.name);
        if(!event||['full_start','full_descr'].indexOf(event.name)<0)return;
        var active=Lampa.Activity.active(),record=movieRecords.filter(function(r){return active&&r.activity===active.activity;})[0];
        if(record){var controller=Lampa.Controller.enabled().controller;if(event.name==='full_start'){bindRatingNavigation(record,controller);installDetailsDown(record);}if(record.detailsBackFrame)cancelAnimationFrame(record.detailsBackFrame);record.detailsBackFrame=requestAnimationFrame(function(){record.detailsBackFrame=0;if(record.page.isConnected){if(event.name==='full_descr'||event.name==='full_start'&&record.detailsZoneActive)refreshActiveDetailsCollection(record,record.detailLastFocus);installDetailsDown(record);installDetailsBack(record);}});}
    }
    function actionLabel(node) {
        var map = {'notice--icon':'Сповіщення', 'open--settings':'Налаштування', 'open--profile':'Профіль', 'full--screen':'Повний екран', 'open--broadcast':'Трансляція', 'trakt-head-action':'Trakt · статус та списки'};
        var keys = Object.keys(map);
        for (var i=0;i<keys.length;i++) if (node.classList.contains(keys[i])) return map[keys[i]];
        return node.getAttribute('aria-label') || node.getAttribute('title') || node.textContent.trim();
    }
    function headerUtility(node) {
        return ['notice--icon','open--profile','trakt-head-action'].some(function(name){return node.classList.contains(name);});
    }
    function headerItems(utilities) {
        var items=secondaryActions().filter(function(node){return headerUtility(node)===utilities;}).map(function(node){return {title:actionLabel(node),shNode:node};});
        if(utilities)items.push({title:'Навігація',shAction:function(){Lampa.Controller.toggle('menu');}});
        return items;
    }
    function secondaryActions() {
        return Array.prototype.filter.call(document.querySelectorAll('.head__actions > .head__action'), function (node) {
            if (node === moreButton || node.classList.contains('open--search') || node.classList.contains('hide') || node.classList.contains('hidden') || node.style.display === 'none' || node.querySelector('input,select,textarea')) return false;
            var label = actionLabel(node);
            if (label) node.classList.add('sh-head-secondary');
            return !!label;
        });
    }
    css += `
body.stremio-hybrid .head .head__time{display:flex!important;position:static;transform:none;margin:0!important;gap:0;max-width:none;color:#f4f4f7;pointer-events:none;flex-shrink:0;align-items:center;-webkit-align-items:center}
body.stremio-hybrid .head .head__actions{display:flex;align-items:center;gap:.8em;flex:1;min-width:0;justify-content:flex-end}
body.stremio-hybrid .head .head__time-now{font-size:1.5em!important;line-height:1.15;margin:0 .55em 0 0;font-variant-numeric:tabular-nums;font-feature-settings:"tnum"}
body.stremio-hybrid .head .head__time > div:last-child{text-align:left}
body.stremio-hybrid .head .head__time-date,body.stremio-hybrid .head .head__time-week{font-size:.72em!important;line-height:1.3;white-space:nowrap}
body.stremio-hybrid .head .head__time-week{display:block}
body.stremio-hybrid .head .head__logo-icon,body.stremio-hybrid .head .head__backward{display:none!important}
body.stremio-hybrid .head .sh-head-more{position:relative;right:auto;top:auto;transform:none!important;flex-shrink:0;border-radius:.8em!important;overflow:hidden}
body.stremio-hybrid .head .open--search,body.stremio-hybrid.sh-movie-active .head .open--search,body.stremio-hybrid .head .sh-head-more,body.stremio-hybrid.sh-movie-active .head .sh-head-more{background:rgba(255,255,255,.055)!important;background-image:none!important;border:1px solid #ffffff14}
body.stremio-hybrid .head .head__body,body.stremio-hybrid .head .head__actions{position:static!important;background:transparent!important;background-image:none!important;box-shadow:none!important}\nbody.stremio-hybrid .head::before,body.stremio-hybrid .head::after{background:none!important;box-shadow:none!important;backdrop-filter:none!important}\nbody.stremio-hybrid .head .open--search{position:absolute;left:50%;transform:translateX(-50%)!important;margin:0!important;width:clamp(12em,30vw,26em)!important;max-width:36vw;border-radius:var(--sh-pill)!important}
body.stremio-hybrid .head .sh-profile-avatar{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit}
body.stremio-hybrid .head .sh-head-more.focus{box-shadow:0 0 0 .1em var(--sh-accent-soft)}
`;
    function avatarURL(value){try{if(typeof value!=='string'||!value.trim()||value.length>2048)return '';var u=new URL(value);return /^(https?:)$/.test(u.protocol)&&!u.username&&!u.password?u.href:'';}catch(e){return '';}}
    function updateAvatar(){
        if(!moreButton)return;var url=avatarURL(Lampa.Storage.get('sh_profile_avatar','')),img=moreButton.querySelector('.sh-profile-avatar');
        if(!url){if(img)img.remove();return;}
        if(!img){img=document.createElement('img');img.className='sh-profile-avatar';img.alt='';img.referrerPolicy='no-referrer';img.onerror=function(){this.style.display='none';};moreButton.appendChild(img);}
        if(img.getAttribute('src')!==url){img.style.display='block';img.src=url;}
    }
    function restoreHead(target) {
        Lampa.Controller.toggle('head');
        if (target && target.isConnected) Lampa.Controller.collectionFocus($(target), Lampa.Head.render());
    }
    function openActions() {
        var items = headerItems(false), panel;
        items.push({title:'Назад',shAction:function(){Lampa.Controller.back();}});
        menuOpen = true;
        Lampa.Select.show({title:'Профіль', items:items, onBack:function () { menuOpen=false;if(panel)panel.classList.remove('sh-profile-menu');restoreHead(moreButton); }, onSelect:function (item) {
            menuOpen=false;
            if(panel)panel.classList.remove('sh-profile-menu');
            Lampa.Select.hide();
            Lampa.Activity.mixState();
            restoreHead(moreButton);
            if(item.shAction)item.shAction();else if (item.shNode && item.shNode.isConnected) $(item.shNode).trigger('hover:enter');
        }});
        panel=Lampa.Select.render()[0];if(panel)panel.classList.add('sh-profile-menu');
    }
    function openHeaderUtilities() {
        var current=Lampa.Controller.enabled(),previous=current&&current.name||'settings_component';
        function restore(){Lampa.Controller.toggle(previous);}
        menuOpen=true;
        Lampa.Select.show({title:'Додаткові дії панелі',items:headerItems(true),onBack:function(){menuOpen=false;Lampa.Select.hide();restore();},onSelect:function(item){
            menuOpen=false;Lampa.Select.hide();Lampa.Activity.mixState();restore();
            if(item.shAction)item.shAction();else if(item.shNode&&item.shNode.isConnected)$(item.shNode).trigger('hover:enter');
        }});
    }
    function onHeaderUtilitiesSetting(){if(window.StremioHybrid)window.StremioHybrid.openUtilities();}
    function removeHeaderUtilitiesSetting(){
        if(!window.Lampa||!Lampa.SettingsApi||!Lampa.SettingsApi.getParam)return;
        var params=Lampa.SettingsApi.getParam('interface')||[];
        for(var i=params.length-1;i>=0;i--)if(params[i].param&&params[i].param.name==='sh_header_utilities'&&params[i].onChange===onHeaderUtilitiesSetting)params.splice(i,1);
    }
    function onSearchEnter() { searchReturn = true; }
    function onSearchClose() { clearSearchSources();scheduleMovie(); if (searchReturn) { searchReturn=false;restoreHead(searchNode); } }
    function clearSearchSources() {
        if(searchSources) searchSources.listener.remove('finded',onSearchFound);
        searchSources=null;
        searchRoots.forEach(function(root){$(root).find('.sh-search-grid').off('.shHybrid').remove();});
        searchRoots=[];
    }
    function onSearchSources(event) {

        clearSearchSources(); searchSources=event.sources;
        searchSources.listener.follow('finded',onSearchFound);
    }
    function onSearchFound(event) {
        // Only TMDB's documented native search/movie and search/tv routes are adapted.
        // Third-party discovery sources retain their own navigation contract.
        if(!event.source || event.source.title!=='TMDB' || !event.data)return;
        var root=event.result.render(true);
        if(searchRoots.indexOf(root)<0)searchRoots.push(root);
        $(root).find('.sh-search-grid').off('.shHybrid').remove();
        var lines=root.querySelectorAll('.items-line');
        event.data.forEach(function(group,index){
            if((group.type!=='movie' && group.type!=='tv') || !lines[index])return;
            var body=lines[index].querySelector('.mapping--line');
            if(!body)return;
            var button=$('<div class="sh-search-grid selector" role="button"></div>');
            button.text(group.title+' · Сітка результатів');
            button.on('hover:enter.shHybrid',function(){
                var input=document.querySelector('.main-search .simple-keyboard-input');
                var query=input?input.value:'';
                if(!query)return;
                var source=searchSources;
                if(source)source.listener.send('select');else Lampa.Search.close();
                Lampa.Activity.push({url:'search/'+group.type,title:'Пошук · '+group.title,component:'category_full',page:1,query:encodeURIComponent(query),source:'tmdb'});
            });
            body.appendChild(button[0]);
        });
    }
    function setupHeader() {
        if (!moreButton && document.querySelector('.head__actions')) {
            var button = $('<div class="head__action selector sh-head-more" role="button" aria-label="Профіль" title="Профіль"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2"/></svg></div>');
            moreButton = Lampa.Head.addElement(button, openActions)[0];
            document.querySelector('.head__actions').appendChild(moreButton);
        }
        var nativeSearch = document.querySelector('.head .open--search');
        if (nativeSearch !== searchNode) {
            if (searchNode) $(searchNode).off('hover:enter.shHybrid', onSearchEnter);
            searchNode=nativeSearch;
            if (searchNode) $(searchNode).on('hover:enter.shHybrid', onSearchEnter);
        }
        var clock=document.querySelector('.head .head__time');
        if(clock&&moreButton&&!headTimeMove){headTimeMove={node:clock,parent:clock.parentNode,next:clock.nextSibling};moreButton.parentNode.insertBefore(clock,moreButton);}
        secondaryActions();updateAvatar();
        var active = Lampa.Activity.active();
        document.body.setAttribute('data-sh-page', active ? active.component : 'main');
        document.body.classList.toggle('sh-movie-active',!!(active&&active.component==='full'&&(active.method==='movie'||active.method==='tv')));
        var controller=Lampa.Controller.enabled();
        syncNavigationState(controller&&controller.name);
    }
    function syncNavigationState(name) {
        if(document.body)document.body.classList.toggle('sh-navigation-expanded',name==='menu');
    }
    css += '\nbody.stremio-hybrid .sh-home-duplicate{display:none!important}';
    var homePolicies=[],headTimeMove=null;
    function continueLine(item){var data=item.data||{};if(!data.results||!data.results.length)return false;return /^Продовжити перегляд(?:\s|\(|$)|^Continue watching(?:\s|\(|$)/i.test(data.title||'')||(data.results||[]).some(function(c){return c.ydesign_row==='cont';});}
    function pruneHome(record){
        // A managed history row can disappear while Home stays mounted.
        record.original=record.original.filter(function(item){return !!item.render(true).parentNode;});
        record.hidden=record.hidden.filter(function(item){return !!item.render(true).parentNode;});
    }
    function orderHome(record){
        var component=record.component;if(record.dead)return;
        if(window.LampaHomeHistory&&window.LampaHomeHistory.policyReady){window.LampaHomeHistory.applyOrder(component);return;}
        pruneHome(record);
        component.items.forEach(function(item){if(record.original.indexOf(item)<0)record.original.push(item);});
        var selected=component.items[component.active],rows=record.original.slice(),resumes=rows.filter(continueLine),resume=resumes[0];
        if(!resume)return;
        // Collapse only exact duplicate continuation datasets, preserving different providers' data.
        function signature(item){return JSON.stringify((item.data.results||[]).map(function(c){return [c.media_type||'',c.id];}));}
        var key=signature(resume);record.hidden=[];
        rows=rows.filter(function(item){if(item!==resume&&continueLine(item)&&signature(item)===key){record.hidden.push(item);item.render(true).classList.add('sh-home-duplicate');return false;}return item!==resume;});
        rows.splice(Math.min(2,rows.length),0,resume);component.items=rows;
        rows.forEach(function(item){var node=item.render(true);if(node.parentNode)node.parentNode.appendChild(node);});
        component.active=Math.max(0,rows.indexOf(selected));
    }
    function releaseHome(record,destroying){
        if(record.dead)return;record.dead=true;if(record.frame)cancelAnimationFrame(record.frame);record.component.unuse(record.hook);
        if(destroying){record.hidden.forEach(function(item){item.destroy();});}
        else if(window.LampaHomeHistory&&window.LampaHomeHistory.policyReady){window.LampaHomeHistory.applyOrder(record.component);}
        else{pruneHome(record);var selected=record.component.items[record.component.active];record.component.items=record.original;record.original.forEach(function(item){var node=item.render(true);node.classList.remove('sh-home-duplicate');if(node.parentNode)node.parentNode.appendChild(node);});record.component.active=Math.max(0,record.original.indexOf(selected));}
        homePolicies=homePolicies.filter(function(r){return r!==record;});
    }
    function setupHome(){
        var active=Lampa.Activity.active(),component=active&&active.activity&&active.activity.component;
        if(!active||active.component!=='main'||!component||typeof component.use!=='function'||typeof component.unuse!=='function'||!Array.isArray(component.items)||homePolicies.some(function(r){return r.component===component;}))return;
        var record={component:component,original:component.items.slice(),hidden:[],dead:false,frame:0};
        function queue(){if(record.dead||record.frame)return;record.frame=requestAnimationFrame(function(){record.frame=0;orderHome(record);});}
        record.hook={shHomePolicy:true,onAppend:queue,onBuild:queue,onHomeHistoryChanged:queue,onDestroy:function(){releaseHome(record,true);}};homePolicies.push(record);component.use(record.hook);queue();
    }
    function onActivity(event) {
        if (!event || event.type === 'start') {setupHeader();scheduleMovie();setupHome();}
        if(event&&event.type==='destroy'&&backdropRotation&&backdropRotation.activity===event.object.activity)backdropRotation=null;
        if(event && event.type==='destroy')movieRecords=movieRecords.filter(function(record){if(record.activity===event.object.activity){restoreMovie(record);return false;}return true;});
    }
    var backdropApi=null,backdropGet=null,backdropWrapper=null,backdropRotation=null,backdropResume=null;
    function installBackdropPacing() {
        if(backdropWrapper)return;
        var api=Lampa.Api.sources.tmdb;if(!api||typeof api.get!=='function')return;
        backdropApi=api;backdropGet=api.get;var baseGet=api.get;
        var resume=backdropResume,active=Lampa.Activity.active();backdropResume=null;
        if(resume&&active&&active.activity===resume.activity.deref()&&window.cardifyRotationTimer===resume.timer){
            var fn=resume.fn.deref();if(fn){clearInterval(resume.timer);var timer=setInterval(fn,Math.max(25000,Number(resume.delay)||8000));window.cardifyRotationTimer=timer;backdropRotation={activity:active.activity,fn:fn,delay:resume.delay,timer:timer};}
        }
        backdropWrapper=function(path,params,success){
            var active=Lampa.Activity.active(),args=Array.prototype.slice.call(arguments);
            if(watching&&active&&active.component==='full'&&(active.method==='movie'||active.method==='tv')&&/^(movie|tv)\/\d+\/images(?:\?|$)/.test(path)&&typeof success==='function'){
                var activity=active.activity,id=active.method+':'+String(active.id);brandPending[id]=true;
                args[2]=function(){
                    if(watching)acceptMovieImages(id,arguments[0]);else brandPending[id]=false;
                    if(!watching||!Lampa.Activity.active()||Lampa.Activity.active().activity!==activity)return success.apply(this,arguments);
                    var interval=window.setInterval;
                    window.setInterval=function(fn,delay){
                        // Only the inspected Cardify rotation callback; all other timers pass through.
                        if(typeof fn==='function'&&String(fn).indexOf('cardifyCurrentItemId')>=0&&String(fn).indexOf('full-start__background')>=0){
                            var timer=interval(fn,Math.max(25000,Number(delay)||8000));
                            backdropRotation={activity:activity,id:id,fn:fn,delay:delay,timer:timer};return timer;
                        }
                        return interval.apply(window,arguments);
                    };
                    try{return success.apply(this,arguments);}finally{window.setInterval=interval;}
                };
            }
            return baseGet.apply(this,args);
        };api.get=backdropWrapper;
    }
    function removeBackdropPacing() {
        if(backdropApi&&backdropApi.get===backdropWrapper)backdropApi.get=backdropGet;
        var rotation=backdropRotation,active=Lampa.Activity.active();
        if(rotation&&active&&active.activity===rotation.activity&&window.cardifyRotationTimer===rotation.timer){clearInterval(rotation.timer);window.cardifyRotationTimer=setInterval(rotation.fn,rotation.delay);
            if(typeof WeakRef==='function')backdropResume={activity:new WeakRef(rotation.activity),fn:new WeakRef(rotation.fn),delay:rotation.delay,timer:window.cardifyRotationTimer};
        }
        backdropApi=null;backdropGet=null;backdropWrapper=null;backdropRotation=null;
    }
    function setupUI() {
        if (!watching) { Lampa.Listener.follow('activity', onActivity); Lampa.Listener.follow('full',onMovieFull); Lampa.Controller.listener.follow('toggle',onStreamController); Lampa.Search.listener.follow('close', onSearchClose); Lampa.Search.listener.follow('sources',onSearchSources); Lampa.Settings.listener.follow('open',onSettingsOpen); Lampa.Settings.listener.follow('close',onSettingsClose); document.addEventListener('error',onRatingError,true); document.addEventListener('traktplus:watched',onCastWatched); document.addEventListener('keydown',onSettingsKey,true); document.addEventListener('keyup',onSettingsKey,true); installSettingsController(); watching=true; installBackdropPacing(); }
        ensureTorrentOverlay();setupHeader(); scheduleMovie();setupHome();
        if(document.body.classList.contains('settings--open')) onSettingsOpen({name:'resume'});
    }
    function removeUI() {
        removeBackdropPacing();

        if (watching) { Lampa.Listener.remove('activity', onActivity); Lampa.Listener.remove('full',onMovieFull); Lampa.Controller.listener.remove('toggle',onStreamController); brandPending={}; Lampa.Search.listener.remove('close', onSearchClose); Lampa.Search.listener.remove('sources',onSearchSources); Lampa.Settings.listener.remove('open',onSettingsOpen); Lampa.Settings.listener.remove('close',onSettingsClose); document.removeEventListener('error',onRatingError,true); document.removeEventListener('traktplus:watched',onCastWatched); document.removeEventListener('keydown',onSettingsKey,true); document.removeEventListener('keyup',onSettingsKey,true); settingsLeftConsumed=false; watching=false; }
        homePolicies.slice().forEach(function(r){releaseHome(r,false);});
        removeSettingsUI();
        removeMovies();
        clearSearchSources();
        searchReturn=false;document.querySelectorAll('.sh-profile-menu').forEach(function(n){n.classList.remove('sh-profile-menu');});
        if (searchNode) { $(searchNode).off('hover:enter.shHybrid', onSearchEnter); searchNode=null; }
        if (menuOpen) { menuOpen=false; Lampa.Select.close(); }
        if(headTimeMove){var t=headTimeMove;headTimeMove=null;t.parent.insertBefore(t.node,t.next&&t.next.parentNode===t.parent?t.next:null);}
        if (moreButton) { $(moreButton).off('hover:enter', openActions).remove(); moreButton=null; }
        document.querySelectorAll('.sh-head-secondary').forEach(function (node) { node.classList.remove('sh-head-secondary'); });
        document.body.removeAttribute('data-sh-page');document.body.classList.remove('sh-movie-active','sh-navigation-expanded');
    }
    // Categories route through the native folder callbacks. Parameters are never cloned.
    function nativeSettingsFolders() {
        return Lampa.Settings.main().render().find('.settings-folder[data-component]').filter(function () {
            return !this.classList.contains('hide') && !this.classList.contains('hidden') && this.style.display !== 'none';
        }).toArray();
    }
    function updateSettingsRail() {
        var content = Lampa.Settings.render()[0].querySelector('.settings__content');
        if (!settingsRail) {
            settingsRail=document.createElement('div'); settingsRail.className='sh-settings-rail';
            settingsRail.setAttribute('aria-label','Категорії налаштувань');
            settingsRail.addEventListener('click',onSettingsCategory,true);
            content.appendChild(settingsRail);
        }
        var folders=nativeSettingsFolders();
        var signature=folders.map(function(n){return n.getAttribute('data-component')+':'+n.querySelector('.settings-folder__name').textContent;}).join('|');
        if (settingsRail.getAttribute('data-signature') !== signature) {
            settingsRail.textContent='';
            folders.forEach(function(node){
                var item=document.createElement('div'); item.className='sh-settings-category selector';
                // Keep native component IDs off copied rail nodes. Plugin CSS may
                // target a broad div[data-component] selector and hide a route.
                item.setAttribute('data-sh-settings-component',node.getAttribute('data-component'));
                item.textContent=node.querySelector('.settings-folder__name').textContent;
                settingsRail.appendChild(item);
            });
            settingsRail.setAttribute('data-signature',signature);
        }
        settingsRail.querySelectorAll('.sh-settings-category').forEach(function(node){
            if(node.getAttribute('data-sh-settings-component')===settingsCategory) node.setAttribute('aria-current','page'); else node.removeAttribute('aria-current');
        });
    }
    function focusSettingsCategory(delta) {
        if (!settingsRail) return;
        var items=Array.prototype.slice.call(settingsRail.querySelectorAll('.sh-settings-category'));
        var index=items.indexOf(settingsRail.querySelector('.focus'));
        index=Math.max(0,Math.min(items.length-1,(index<0?0:index)+delta));
        if(items[index]) { Lampa.Controller.collectionFocus(items[index],settingsRail); items[index].scrollIntoView({block:'nearest'}); }
    }
    function releaseSettingsParameter() {
        if (settingsParameter) {
            var current=settingsParameter; settingsParameter=null; current.back();
            for(var i=0;i<6 && Lampa.Controller.enabled().name==='settings_component';i++) Lampa.Controller.back();
        } else if (Lampa.Controller.enabled().name !== 'settings') Lampa.Controller.toggle('settings');
    }
    function chooseSettingsCategory(name, initial) {
        if(name===settingsCategory && settingsParameter) { Lampa.Controller.toggle('settings_component');return; }
        releaseSettingsParameter();
        var target=nativeSettingsFolders().filter(function(n){return n.getAttribute('data-component')===name;})[0];
        if(!target) return;
        // Detach, rather than remove: preserve the folder handlers and the native Main instance.
        Lampa.Settings.main().render().detach();
        settingsCategory=name;
        $(target).trigger('hover:enter');
        if(window.LampaSettingsHub && window.LampaSettingsHub.owns(name)) return;
        if(Lampa.Controller.enabled().name==='settings_component') settingsParameter=Lampa.Controller.enabled().controller;
        updateSettingsRail();
        if(initial) Lampa.Controller.toggle('sh_settings_nav');
    }
    function onSettingsCategory(event) {
        var item=event.target.closest('.sh-settings-category');
        if(item && settingsRail.contains(item)) { event.stopPropagation();chooseSettingsCategory(item.getAttribute('data-sh-settings-component'),false); }
    }
    function settingsNavToggle() {
        if(!settingsRail) { Lampa.Controller.toggle('settings'); return; }
        Lampa.Controller.collectionSet(settingsRail);
        var node=settingsRail.querySelector('[aria-current="page"]') || settingsRail.querySelector('.sh-settings-category');
        Lampa.Controller.collectionFocus(node,settingsRail);
        if(node) node.scrollIntoView({block:'nearest'});
    }
    function settingsNavBack() {
        releaseSettingsParameter();
        if(Lampa.Controller.enabled().name!=='settings') Lampa.Controller.toggle('settings');
        Lampa.Controller.back();
    }
    function installSettingsController() {
        Lampa.Controller.add('sh_settings_nav',{
            toggle:settingsNavToggle,
            enter:function(){var item=settingsRail && settingsRail.querySelector('.sh-settings-category.focus');if(item)chooseSettingsCategory(item.getAttribute('data-sh-settings-component'),false);},
            up:function(){focusSettingsCategory(-1);}, down:function(){focusSettingsCategory(1);},
            right:function(){if(settingsParameter)Lampa.Controller.toggle('settings_component');},
            left:settingsNavBack, back:settingsNavBack
        });
    }
    function onSettingsKey(event) {
        if(event.key==='ArrowLeft' && event.type==='keyup' && settingsLeftConsumed) { settingsLeftConsumed=false;event.preventDefault();event.stopImmediatePropagation();return; }
        if(event.type==='keydown' && event.key==='ArrowLeft' && document.body.classList.contains('settings--open') && settingsRail && Lampa.Controller.enabled().name==='settings_component') {
            settingsLeftConsumed=true; event.preventDefault(); event.stopImmediatePropagation(); Lampa.Controller.toggle('sh_settings_nav');
        }
    }
    function onSettingsOpen(event) {
        if(settingsFrame) cancelAnimationFrame(settingsFrame);
        if(event.name!=='main' && window.LampaSettingsHub && window.LampaSettingsHub.owns(event.name)) { settingsCategory=''; onSettingsClose(); return; }
        var bypassPrimary=false;
        if(event.name==='main' && settingsHub && window.LampaSettingsHub===settingsHub && settingsHub.contractVersion===1 && typeof settingsHub.consumeNativeMainBypass==='function') {
            try { bypassPrimary=settingsHub.consumeNativeMainBypass()===true; } catch(e) { bypassPrimary=false; }
        }
        settingsFrame=requestAnimationFrame(function(){
            settingsFrame=0;
            if(!watching || !document.body.classList.contains('settings--open'))return;
            if(event.name==='main' && !bypassPrimary && !settingsPrimaryRouting && settingsHub && window.LampaSettingsHub===settingsHub && settingsHub.contractVersion===1 && typeof settingsHub.openPrimary==='function' && typeof settingsHub.owns==='function') {
                var primary=false;
                try { var preference=Lampa.Storage.get('stremio_hybrid_primary_settings',false);primary=settingsHub.owns('settings_hub') && (preference===true || preference==='true' || preference===1 || preference==='1'); } catch(e) { primary=false; }
                if(primary) {
                    settingsPrimaryRouting=true;
                    try { if(settingsHub.openPrimary()===true)return; } catch(e) { /* Keep native Settings as the fallback. */ }
                    finally { settingsPrimaryRouting=false; }
                }
            }
            updateSettingsRail();
            if(event.name==='main') {
                settingsParameter=null;
                var folders=nativeSettingsFolders();
                if(!folders.some(function(n){return n.getAttribute('data-component')===settingsCategory;})) settingsCategory=folders[0] ? folders[0].getAttribute('data-component') : '';
                if(settingsCategory) chooseSettingsCategory(settingsCategory,true);
            } else {
                if(nativeSettingsFolders().some(function(n){return n.getAttribute('data-component')===event.name;})) settingsCategory=event.name;
                if(Lampa.Controller.enabled().name==='settings_component') settingsParameter=Lampa.Controller.enabled().controller;
                updateSettingsRail();
            }
        });
    }
    function onSettingsClose() {
        if(settingsFrame) cancelAnimationFrame(settingsFrame); settingsFrame=0;
        if(settingsRail){settingsRail.removeEventListener('click',onSettingsCategory,true);settingsRail.remove();settingsRail=null;}
        settingsParameter=null;
    }
    function removeSettingsUI() {
        if(settingsFrame) cancelAnimationFrame(settingsFrame); settingsFrame=0;
        if(Lampa.Controller.enabled().name==='sh_settings_nav') {
            if(settingsParameter) Lampa.Controller.toggle('settings_component'); else Lampa.Controller.toggle('settings');
        }
        onSettingsClose();
        // Controller has no public remove API: replace our single registry slot with a small native fallback.
        Lampa.Controller.add('sh_settings_nav',{toggle:function(){Lampa.Controller.toggle('settings');}});
    }
    function enabled() {
        var value = Lampa.Storage.get('stremio_hybrid_enabled', true);
        return value !== false && value !== 'false' && value !== 0 && value !== '0';
    }
    function uiNow(){return window.performance && typeof window.performance.now==='function'?Math.round(window.performance.now()*10)/10:null;}
    function renderOwnedStyles() {
        if (!document.head || !document.body) return;
        var active = document.body.classList.contains('stremio-hybrid');
        var content;
        if(!styleContentCache.valid||styleContentCache.active!==active||styleContentCache.destroyed!==destroyed||styleContentCache.revision!==styleModuleRevision){
            content = active && !destroyed ? css : '';
            for (var i = 0; i < styleStore.order.length; i++) {
                var name = styleStore.order[i];
                if (styleStore.modules[name]) content += '\n' + styleStore.modules[name];
            }
            styleContentCache={valid:true,active:active,destroyed:destroyed,revision:styleModuleRevision,value:content};
            bootStats.styleCompositions++;
        }else{
            content=styleContentCache.value;
            bootStats.styleCacheHits++;
        }
        if (content) {
            if (!style) {
                style = document.getElementById('stremio-hybrid-style');
                if (!style) {
                    style = document.createElement('style');
                    style.id = 'stremio-hybrid-style';
                    style.setAttribute('data-ui-version', UI_VERSION);
                    document.head.appendChild(style);
                    bootStats.styleInsertions++;
                }
            }
            if (style.textContent !== content) {
                style.textContent = content;
                bootStats.styleUpdates++;
            }
        } else if (style) {
            style.remove();
            style = null;
        }
    }
    function registerStyles(owner, value) {
        var name = String(owner || '').replace(/[^a-z0-9_-]/gi, '');
        if (!name) return false;
        if (!Object.prototype.hasOwnProperty.call(styleStore.modules, name)) styleStore.order.push(name);
        var text = String(value || '');
        if (styleStore.modules[name] === text) return true;
        styleStore.modules[name] = text;
        styleModuleRevision++;
        renderOwnedStyles();
        return true;
    }
    function unregisterStyles(owner) {
        var name = String(owner || '').replace(/[^a-z0-9_-]/gi, '');
        if (!name || !Object.prototype.hasOwnProperty.call(styleStore.modules, name)) return false;
        delete styleStore.modules[name];
        styleStore.order = styleStore.order.filter(function (item) { return item !== name; });
        styleModuleRevision++;
        renderOwnedStyles();
        return true;
    }
    function adoptAdapterStyles() {
        Object.keys(styleIdsByOwner).map(function(owner){return [styleIdsByOwner[owner],owner];}).forEach(function (entry) {
            var existing = document.getElementById(entry[0]);
            if (!existing || !existing.textContent) return;
            registerStyles(entry[1], existing.textContent);
            if(existing.remove)existing.remove();
            else if(existing.parentNode&&existing.parentNode.removeChild)existing.parentNode.removeChild(existing);
        });
    }
    function ownsPresentation(region) {
        var regions = { theme: 1, header: 1, navigation: 1, cards: 1, details: 1, overlays: 1, settings: 1 };
        return !!regions[region] && !destroyed && !!style && !!document.body && document.body.classList.contains('stremio-hybrid');
    }
    function releaseStyleModules(){
        styleStore.order.forEach(function(owner){writeStandaloneStyle(owner,String(styleStore.modules[owner]||''));});
        styleStore.order=[];styleStore.modules={};
        styleModuleRevision++;
        if(style){if(style.remove)style.remove();else if(style.parentNode&&style.parentNode.removeChild)style.parentNode.removeChild(style);}
        style=null;
        if(window.__StremioHybridStyleStore===styleStore)delete window.__StremioHybridStyleStore;
    }
    // One static shell and stylesheet owner; feature adapters register their
    // existing CSS here while retaining their data and native event behavior.
    function applyShell(on) {
        if (destroyed || !document.body) return;
        if(document.body.classList.contains('stremio-hybrid')!==on)bootStats.shellTransitions++;
        document.body.classList.toggle('stremio-hybrid', on);
        renderOwnedStyles();
        if(on){
            if(bootStats.shellAppliedMs===null)bootStats.shellAppliedMs=uiNow();
            if(bootStats.firstShellFrameMs===null && !shellFrame && typeof requestAnimationFrame==='function')shellFrame=requestAnimationFrame(function(){shellFrame=0;if(!destroyed && document.body.classList.contains('stremio-hybrid'))bootStats.firstShellFrameMs=uiNow();});
        }else if(shellFrame){cancelAnimationFrame(shellFrame);shellFrame=0;}
        syncHeaderPresentation();
    }
    function syncHeaderPresentation() {
        var api=window.InterfacePlusPresentation;
        if(api && api.contractVersion===1 && typeof api.syncHeader==='function'){
            try{api.syncHeader();}catch(e){bootStats.presentationFailures=(bootStats.presentationFailures||0)+1;}
        }
        if(api && api.contractVersion===1 && typeof api.setThemeOwner==='function'){
            try{api.setThemeOwner(ownsPresentation('theme'));}catch(e){bootStats.presentationFailures=(bootStats.presentationFailures||0)+1;}
        }
    }
    function prepareShell() {
        if(window.Lampa && Lampa.Storage && document.body)applyShell(enabled());
    }
    function mountSettings() {
        if(destroyed || !ready || !watching || settingsHub)return;
        var api=window.LampaSettingsHub;
        if(api && api===settingsFailedApi)return;
        if(api){
            if(api.contractVersion===1 && typeof api.install==='function' && typeof api.destroy==='function'){
                try{if(api.install(Lampa,$,document)){settingsHub=api;bootStats.settingsMounts++;}}
                catch(e){settingsFailedApi=api;bootStats.settingsFailures++;try{api.destroy();}catch(cleanupError){/* Native Settings remains the fallback. */}}
            }
            return;
        }
        if(settingsLoading || settingsAttempted)return;
        settingsLoading=true;settingsAttempted=true;bootStats.settingsLoads++;
        var url=new URL('settings-hub.js',overlayScriptURL || 'https://gorlim590.github.io/lampa/ui/stremio-hybrid.js');
        url.search='';url.searchParams.set('v',UI_VERSION);
        settingsScript=document.createElement('script');settingsScript.src=url.href;
        settingsScript.onload=function(){settingsLoading=false;if(!destroyed && watching)mountSettings();};
        settingsScript.onerror=function(){settingsLoading=false;bootStats.settingsFailures++;settingsScript.onload=null;settingsScript.onerror=null;settingsScript.remove();settingsScript=null;};
        document.head.appendChild(settingsScript);
    }
    function unmountSettings() {
        settingsFailedApi=null;
        if(!settingsLoading)settingsAttempted=false;
        if(settingsHub){var api=settingsHub;settingsHub=null;try{api.destroy();}catch(e){bootStats.settingsFailures++;}bootStats.settingsUnmounts++;}
    }
    function apply(on) {
        if (destroyed) return;
        applyShell(on);
        if(!ready)return;
        if(on){if(!watching)setupUI();else updateAvatar();mountSettings();}
        else {unmountSettings();if(watching)removeUI();}
    }
    function setEnabled(on) { Lampa.Storage.set('stremio_hybrid_enabled', !!on); apply(!!on); }
    function stopWaiting() {
        if(nativeWaitTimer){clearTimeout(nativeWaitTimer);nativeWaitTimer=0;}
        document.removeEventListener('DOMContentLoaded', onDOM);
        if (waiting && window.Lampa && Lampa.Listener) Lampa.Listener.remove('app', onApp);
        waiting = false;
    }
    function onApp(event) { if (event && event.type === 'ready') init(); }
    function scheduleNativeReadiness() {
        if(nativeWaitTimer || ready || destroyed)return;
        nativeWaitTimer=setTimeout(function(){nativeWaitTimer=0;checkNativeReadiness();},NATIVE_WAIT_MS);
    }
    function checkNativeReadiness() {
        if(ready || destroyed)return;
        nativeWaitAttempts++;
        prepareShell();
        if(window.appready && window.Lampa && Lampa.SettingsApi){init();return;}
        if(window.Lampa && Lampa.Listener && Lampa.Listener.follow && Lampa.Listener.remove && !waiting){
            try{waiting=true;Lampa.Listener.follow('app',onApp);}
            catch(e){waiting=false;bootStats.readinessSubscribeFailures=(bootStats.readinessSubscribeFailures||0)+1;}
        }
        if(nativeWaitAttempts>=NATIVE_WAIT_MAX){bootStats.nativeReadinessTimedOut=true;stopWaiting();return;}
        scheduleNativeReadiness();
    }
    function onDOM() {
        checkNativeReadiness();
    }
    function init() {
        if (ready || destroyed || !window.Lampa || !Lampa.SettingsApi) return;
        ready = true;
        bootStats.initCount++;
        bootStats.readyMs=uiNow();
        stopWaiting();
        var params = Lampa.SettingsApi.getParam('interface') || [];
        if (!params.some(function (item) { return item.param && item.param.name === 'stremio_hybrid_enabled'; })) {
            Lampa.SettingsApi.addParam({
                component: 'interface',
                param: {name:'stremio_hybrid_enabled', type:'trigger', values:true, default:true},
                field: {name:'Stremio × Lampa', description:'Темна тема, компактна навігація та легкий фокус. Зберігає ваші картки.'},
                onChange: function () { if (window.StremioHybrid) window.StremioHybrid.refresh(); }
            });
        }
        if(!params.some(function(item){return item.param&&item.param.name==='sh_profile_avatar';}))Lampa.SettingsApi.addParam({component:'interface',param:{name:'sh_profile_avatar',type:'input',values:'',placeholder:'https://example.org/avatar.jpg',default:''},field:{name:'Фото профілю · URL',description:'Адреса HTTP(S) зображення. Порожнє поле повертає стандартний значок; саме фото не зберігається в localStorage.'},onChange:function(){if(window.StremioHybrid)window.StremioHybrid.refresh();}});
        if(!params.some(function(item){return item.param&&item.param.name==='sh_header_utilities';}))Lampa.SettingsApi.addParam({component:'interface',param:{name:'sh_header_utilities',type:'button'},field:{name:'Додаткові дії панелі',description:'Сповіщення, профіль, Trakt і перехід до навігації. Використовує чинні дії Lampa.'},onChange:onHeaderUtilitiesSetting});
        if(!params.some(function(item){return item.param&&item.param.name==='stremio_hybrid_primary_settings';}))Lampa.SettingsApi.addParam({component:'interface',param:{name:'stremio_hybrid_primary_settings',type:'trigger',values:true,default:false},field:{name:'Центр налаштувань як головний',description:'Опційно відкривати Центр налаштувань замість головної сторінки Lampa. Стандартні налаштування залишаються доступними в Центрі.'}});
        apply(enabled());
    }
    window.StremioHybrid = {
        version: UI_VERSION,
        settingsHubVersion: 1,
        presentationVersion: 1,
        ownsPresentation: ownsPresentation,
        registerStyles: registerStyles,
        unregisterStyles: unregisterStyles,
        openUtilities: openHeaderUtilities,
        setEnabled: setEnabled,
        refresh: function () { if (ready) apply(enabled()); },
        diagnostics: function () {return {version:UI_VERSION,styleOwner:'hybrid',styleStoreVersion:styleStore.version,registeredStyleModules:styleStore.order.length,registeredStyleOwners:styleStore.order.slice(),registeredStyleBytes:styleStore.order.reduce(function(total,name){return total+(styleStore.modules[name]||'').length;},0),scriptStartMs:bootStats.scriptStartMs,shellAppliedMs:bootStats.shellAppliedMs,firstShellFrameMs:bootStats.firstShellFrameMs,readyMs:bootStats.readyMs,initCount:bootStats.initCount,styleInsertions:bootStats.styleInsertions,styleUpdates:bootStats.styleUpdates,styleCompositions:bootStats.styleCompositions,styleCacheHits:bootStats.styleCacheHits,shellTransitions:bootStats.shellTransitions,settingsLoads:bootStats.settingsLoads,settingsMounts:bootStats.settingsMounts,settingsUnmounts:bootStats.settingsUnmounts,settingsFailures:bootStats.settingsFailures,presentationFailures:bootStats.presentationFailures||0,nativeReadinessTimedOut:!!bootStats.nativeReadinessTimedOut,readinessSubscribeFailures:bootStats.readinessSubscribeFailures||0};},
        destroy: function () {
            apply(false);
            removeHeaderUtilitiesSetting();
            backdropResume=null;movieBrands=[];movieEnglish=[];paletteCache=[];
            releaseStyleModules();
            destroyed = true;
            stopWaiting();
            if(settingsScript){settingsScript.onload=null;settingsScript.onerror=null;if(settingsLoading)settingsScript.remove();settingsScript=null;}
            delete window.StremioHybrid;
        }
    };
    adoptAdapterStyles();
    prepareShell();
    if (window.appready && window.Lampa && Lampa.SettingsApi) init();
    else {
        onDOM();
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onDOM);
    }
})();
