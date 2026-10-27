/* Stremio × Lampa. Scoped presentation adapters preserve native cards, filters and playback. */
(function () {
    'use strict';
    if (window.StremioHybrid) return;
    var UI_VERSION='3.0.0-early-shell-phase1';
    var bootStats={scriptStartMs:uiNow(),shellAppliedMs:null,firstShellFrameMs:null,readyMs:null,initCount:0,styleInsertions:0,shellTransitions:0,settingsLoads:0,settingsMounts:0,settingsUnmounts:0,settingsFailures:0,presentationFailures:0},shellFrame=0;
    var settingsHub=null,settingsScript=null,settingsLoading=false,settingsAttempted=false,settingsFailedApi=null;
    var overlayScriptURL=document.currentScript&&document.currentScript.src,overlayLoading=false;
    function ensureTorrentOverlay(){
        if(window.LampaTorrentOverlay||overlayLoading)return;overlayLoading=true;
        var script=document.createElement('script'),url=new URL('torrent-overlay.js',overlayScriptURL||'https://gorlim590.github.io/lampa/ui/stremio-hybrid.js');
        var version=new URL(overlayScriptURL||url.href).searchParams.get('v');url.search='';if(version)url.searchParams.set('v',version);script.src=url.href;script.onload=function(){if(!destroyed&&watching){movieRecords.forEach(removeStreams);scheduleMovie();}};
        script.onerror=function(){overlayLoading=false;};document.head.appendChild(script);
    }
    var style, ready = false, destroyed = false, waiting = false, watching = false, moreButton = null, menuOpen = false, searchNode = null, searchReturn = false, settingsRail = null, settingsFrame = 0, settingsParameter = null, settingsCategory = 'interface', settingsLeftConsumed = false, settingsPrimaryRouting = false, searchSources = null, searchRoots = [];
    var css = `
body.stremio-hybrid { --sh-bg:#121023; --sh-panel:#211d35; --sh-accent:#9775fa; --sh-muted:#aba7bd; --sh-rail:#0c0b16; --sh-text:#f0eef8; --sh-border:#ffffff16; --sh-radius:.7em; --sh-pill:2em; --sh-gap:1.1em; --sh-speed:160ms; --sh-ring:#9775fa66; --sh-focus:#7960c9; --sh-focus-soft:#3e315b; --sh-header:transparent; --sh-panel-raised:#29233e; --sh-accent-soft:#b79bff; --sh-focus-text:#e9e0ff; --sh-focus-ink:#201536; --sh-inactive:#726d86; --sh-secondary:#d0cadf; --sh-inset:1.8em; --sh-ease:ease-out; background:#121023 !important; color:#f0eef8; }
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
body.stremio-hybrid .sh-movie .sh-movie-description { order:5; position:static !important; width:100% !important; max-width:49em; padding:0 !important; margin:0 0 1.5em; pointer-events:auto !important; border:0; border-radius:0; background:none; z-index:auto !important; }
body.stremio-hybrid .sh-movie .full-descr__text { color:#e0e0e8 !important; font-size:1em !important; line-height:1.65 !important; text-align:left !important; text-shadow:none !important; max-height:8.25em !important; padding:0 !important; margin:0 !important; width:100%; }
body.stremio-hybrid .sh-movie .full-start-new__buttons { order:6; display:flex !important; flex-wrap:nowrap !important; align-items:center; gap:.6em !important; max-width:100%; overflow-x:auto; overflow-y:hidden; padding:.2em .2em 1.4em; margin:0 -.2em; scrollbar-width:none; }
body.stremio-hybrid .sh-movie .full-start__button { font-size:1em !important; flex:0 0 auto; display:flex; align-items:center; justify-content:center; min-height:2.9em !important; height:2.9em !important; width:3.1em; min-width:3.1em; margin:0 !important; padding:0 .85em !important; border-radius:.55em !important; background:rgba(255,255,255,.08) !important; border:1px solid #ffffff12; box-shadow:none; transform:none !important; }
body.stremio-hybrid .sh-movie .full-start__button span, body.stremio-hybrid .sh-movie .full-start__button .full-start__text { display:none !important; }
body.stremio-hybrid .sh-movie .full-start__button svg { width:1.25em !important; height:1.25em !important; margin:0 !important; color:inherit; }
body.stremio-hybrid .sh-movie .full-start__button.sh-movie-primary { width:auto; min-width:9em; gap:.65em; background:#7357cf !important; border-color:transparent; }
body.stremio-hybrid .sh-movie .full-start__button.sh-movie-primary span, body.stremio-hybrid .sh-movie .full-start__button.sh-movie-primary .full-start__text { display:block !important; font-size:.95em; }
body.stremio-hybrid .sh-movie .full-start__button.focus { background:#f0edf9 !important; color:#15121f !important; border-color:#fff; box-shadow:inset 0 0 0 .1em #fff !important; }
body.stremio-hybrid .sh-movie-page .full-descr { padding-top:1em; }
/* Embedded native movie torrent sources; standalone explorer styles are untouched. */
body.stremio-hybrid .sh-streams { position:absolute; top:.6em; right:1.8em; width:25vw; height:calc(100vh - 10em); max-height:42em; z-index:2; display:flex; flex-direction:column; min-height:0; padding:.75em; border-radius:.6em; background:rgba(12,12,22,.91); border:1px solid #ffffff10; color:#efeff5; }
body.stremio-hybrid .sh-stream-head { display:flex; align-items:center; justify-content:space-between; gap:1em; }
body.stremio-hybrid .sh-stream-head h2 { font-size:1.1em; font-weight:500; margin:0; }

body.stremio-hybrid .sh-stream-status { font-size:.7em; color:#aaa7b9; margin:.8em 0; }
body.stremio-hybrid .sh-stream-load { padding:.8em; font-size:.8em; background:#ffffff08; border-radius:.5em; }

body.stremio-hybrid .sh-stream-content { flex:1; min-height:0; overflow:hidden; }
body.stremio-hybrid .sh-streams .sh-stream-explorer { position:static !important; display:flex !important; padding:0 !important; width:100% !important; height:100% !important; background:transparent !important; }
body.stremio-hybrid .sh-streams .explorer__left { display:none !important; }
body.stremio-hybrid .sh-streams .explorer__files { display:flex; flex-direction:column; width:100% !important; height:100%; padding:0; min-width:0; }
body.stremio-hybrid .sh-streams .explorer__files-head { flex-shrink:0; font-size:.75em; }
body.stremio-hybrid .sh-streams .explorer__files-body { flex:1; min-height:0; }
body.stremio-hybrid .sh-streams .explorer__files-body > .scroll { height:100% !important; max-height:100% !important; }
body.stremio-hybrid .sh-streams .torrent-item { margin:0 0 .45em; padding:.8em; border-radius:.5em; background:#ffffff05; font-size:.75em; border:1px solid transparent; }
body.stremio-hybrid .sh-streams .torrent-item__title { font-size:1em; line-height:1.4; overflow-wrap:anywhere; }
body.stremio-hybrid .sh-streams .torrent-item__details { flex-wrap:wrap; font-size:.85em; gap:.4em; }
body.stremio-hybrid .sh-streams .torrent-item__ffprobe { flex-wrap:wrap; }
body.stremio-hybrid .sh-streams .torrent-item__ffprobe > div { margin:.15em .25em .15em 0; font-size:.85em; padding:.15em .3em; background:#ffffff0b; }
body.stremio-hybrid .sh-streams .watched-history { font-size:.7em; }
body.stremio-hybrid .sh-streams .empty { width:100%; font-size:.75em; padding:1em 0; }
body.stremio-hybrid .sh-streams .focus { background:#ffffff12; border-color:#baa6f1; box-shadow:inset .15em 0 #9775fa; }
body.stremio-hybrid .sh-streams .filter__item { min-width:0; }
body.stremio-hybrid .sh-streams .explorer__files-head { margin:0 0 .5em !important; padding:0 !important; }
body.stremio-hybrid .sh-streams .explorer__files-body .scroll__body,body.stremio-hybrid .sh-streams .scroll__content { padding:0 !important; }
body.stremio-hybrid .sh-streams .torrent-item { display:grid; grid-template-columns:3.5em minmax(0,1fr); gap:.3em .55em; padding:.55em !important; border:1px solid transparent !important; box-shadow:none !important; animation:none !important; transform:none !important; }
body.stremio-hybrid .sh-streams .torrent-item__title { grid-column:2; grid-row:1; display:block; -webkit-line-clamp:unset; white-space:normal; overflow:visible; }
body.stremio-hybrid .sh-streams .torrent-item__ffprobe { grid-column:1; grid-row:1 / 3; display:flex; flex-direction:row; flex-wrap:wrap; padding:0 !important; align-items:flex-start; align-content:flex-start; gap:.2em; margin:0 !important; }
body.stremio-hybrid .sh-streams .torrent-item__details { grid-column:2; grid-row:2; display:flex !important; flex-wrap:wrap; justify-content:flex-start; gap:.25em .7em; margin:0 !important; }
body.stremio-hybrid .sh-streams .torrent-item__details > * { width:auto !important; margin:0 !important; padding:0 !important; font-size:inherit !important; }
body.stremio-hybrid .sh-streams .torrent-item__details span,body.stremio-hybrid .sh-streams .torrent-item__size { box-shadow:none !important; background:transparent !important; border:0 !important; padding:0 !important; color:inherit !important; }
body.stremio-hybrid .sh-streams .torrent-item.focus { background:#ffffff12 !important; border-color:#bca8f0 !important; box-shadow:inset .15em 0 #9775fa !important; }
body.stremio-hybrid .sh-streams .sh-empty-history { display:none; }
body.stremio-hybrid .sh-streams .torrent-item__date,body.stremio-hybrid .sh-streams .torrent-item__grabs { display:none; }
body.stremio-hybrid .sh-streams .torrent-item__bitrate { font-size:inherit !important; color:#aaa7b9; }
body.stremio-hybrid .sh-streams .torrent-item.sh-source-pick { border-color:#9675dc55 !important; background:#65518c17; }
body.stremio-hybrid .sh-streams .sh-source-pick .torrent-item__title::before { content:'★ '; color:#baa4f0; }
body.stremio-hybrid .sh-streams .torrent-item.focus::after { content:none !important; }
body.stremio-hybrid .sh-streams .m-audio::before { content:none !important; }
body.stremio-hybrid .sh-streams .m-audio { font-size:1em !important; }
@media (prefers-reduced-motion:reduce) { body.stremio-hybrid .sh-movie-page .full-start__background { transition:none !important; } }
body.stremio-hybrid .sh-streams .ctr-row{display:grid;grid-template-columns:3.2em minmax(0,1fr) max(5.6em,7rem);gap:.55em;align-items:center;min-width:0;min-height:3.2em}
body.stremio-hybrid .sh-streams .ctr-quality{text-align:center;align-self:stretch;display:flex;flex-direction:column;justify-content:center;gap:.2em;border-radius:.5em;background:rgba(255,255,255,.035);color:#a8afbf;border:1px solid var(--line);min-width:0}
body.stremio-hybrid .sh-streams .ctr-quality strong{font-size:1em;font-weight:850}
body.stremio-hybrid .sh-streams .ctr-quality small{font-size:max(.8em,1rem);opacity:.8}
body.stremio-hybrid .sh-streams .ctr-quality.q-2160{color:#f1d28c;background:rgba(230,188,87,.09);border-color:rgba(230,188,87,.4)}
body.stremio-hybrid .sh-streams .ctr-quality.q-1080{color:#fff;background:rgba(var(--acc-rgb),.28);border-color:var(--acc)}
body.stremio-hybrid .sh-streams .ctr-release-info{min-width:0}
body.stremio-hybrid .sh-streams .ctr-name{font-size:max(.9em,1rem);line-height:1.35;font-weight:750;white-space:normal;overflow-wrap:anywhere}
body.stremio-hybrid .sh-streams .ctr-chips{display:flex;flex-wrap:wrap;gap:.2em .35em;margin-top:.35em;align-items:center}
body.stremio-hybrid .sh-streams .ctr-chip{font-size:max(.8em,1rem);line-height:1.25;color:#c2c8d5;border-radius:.3em;padding:.15em .3em;max-width:100%;overflow-wrap:anywhere}
body.stremio-hybrid .sh-streams .ctr-chip.is-ua{color:#c6d9ff;background:rgba(var(--acc2-rgb),.22);border:1px solid rgba(var(--acc2-rgb),.4)}
body.stremio-hybrid .sh-streams .ctr-extra{display:none}
body.stremio-hybrid .sh-streams .ctr-metrics{text-align:right;min-width:0;font-variant-numeric:tabular-nums}
body.stremio-hybrid .sh-streams .ctr-size{font-size:1em;font-weight:800;color:var(--text);white-space:nowrap;line-height:1.25}
body.stremio-hybrid .sh-streams .ctr-peers,body.stremio-hybrid .sh-streams .ctr-bitrate{font-size:max(.8em,1rem);line-height:1.4;color:var(--muted);white-space:nowrap}
body.stremio-hybrid .sh-streams .is-good{color:var(--good)}
body.stremio-hybrid .sh-streams .is-warn{color:var(--warn)}
body.stremio-hybrid .sh-streams .is-bad{color:var(--bad)}
body.stremio-hybrid .sh-streams .ctr-best{display:none;font-size:max(.8em,1rem);line-height:1.3;color:#b1f2d3;background:rgba(61,220,151,.12);border:1px solid rgba(61,220,151,.25);border-radius:.3em;padding:.1em .3em;margin-bottom:.3em}
body.stremio-hybrid .sh-streams .is-best .ctr-best{display:table}
body.stremio-hybrid .sh-streams .ctr-row{grid-template-columns:2.7em minmax(0,1fr) 5em;gap:.4em}
body.stremio-hybrid .sh-streams { --text:#eef1f8; --muted:#a6aec0; --line:#ffffff20; --good:#3ddc97; --warn:#f2b84b; --bad:#ff6b6b; --acc:var(--sm-accent,#9775fa); --acc2:var(--sm-accent2,#3a74ff); --acc-rgb:var(--sm-accent-rgb,151,117,250); --acc2-rgb:var(--sm-accent2-rgb,58,116,255); }
body.stremio-hybrid .sh-streams .torrent-item.sh-cinema-row { display:block !important; padding:.45em !important; }
body.stremio-hybrid .sh-streams .torrent-item.sh-cinema-row > :not(.ctr-row) { display:none !important; }
body.stremio-hybrid .sh-streams .ctr-row { grid-template-columns:3.7em minmax(0,1fr) 5.2em; gap:.55em; }
body.stremio-hybrid .sh-streams .ctr-name { font-size:1em; }
body.stremio-hybrid .sh-streams .ctr-quality small,body.stremio-hybrid .sh-streams .ctr-chip,body.stremio-hybrid .sh-streams .ctr-peers,body.stremio-hybrid .sh-streams .ctr-bitrate,body.stremio-hybrid .sh-streams .ctr-best { font-size:.85em; }
body.stremio-hybrid .sh-streams .ctr-quality strong { font-size:1em; letter-spacing:-.03em; }
body.stremio-hybrid .sh-streams .ctr-extra { display:inline; }
body.stremio-hybrid .sh-streams .torrent-item__title::before { content:none !important; }
body.stremio-hybrid .sh-streams .sh-source-pick { background:rgba(var(--sm-accent-rgb,151,117,250),.09) !important; border-color:rgba(var(--sm-accent-rgb,151,117,250),.45) !important; }
body.stremio-hybrid .sh-streams .torrent-item.focus { border-color:var(--sm-accent,#bca8f0) !important; box-shadow:inset .15em 0 var(--sm-accent,#9775fa) !important; }
body.stremio-hybrid .sh-movie .sh-movie-logo { display:none; order:-1; width:auto; max-width:82%; max-height:7em; object-fit:contain; object-position:left center; margin:0 0 1em; }
body.stremio-hybrid .sh-movie.sh-branded .sh-movie-logo { display:block; }
body.stremio-hybrid .sh-movie.sh-branded .full-start-new__title { font-size:1.2em !important; line-height:1.35 !important; margin:0 0 .7em !important; letter-spacing:0; }
body.stremio-hybrid .sh-movie .ifx-original-title { display:none !important; }
body.stremio-hybrid .sh-movie .sh-series-field { color:#b8b8c6 !important; background:transparent !important; font-size:.9em; }
body.stremio-hybrid .sh-movie .sh-original-title { display:block; color:var(--sm-muted); font-size:.85em; font-weight:400; }
body.stremio-hybrid .sh-movie .full-start__button.sh-movie-primary { background:var(--sm-accent,#7357cf) !important; color:var(--sm-accent-ink,#fff) !important; }
body.stremio-hybrid .sh-movie .full-start__button.sh-movie-primary.focus { background:#f0edf9 !important; color:#15121f !important; }


body.stremio-hybrid .sh-streams .sh-cinema-explorer .explorer__files-head { display:none !important; }
body.stremio-hybrid .sh-streams .torrent-item.sh-tracker-hidden{display:none!important}
body.stremio-hybrid .sh-streams .ctr-tools { flex-shrink:0; padding:.1em .2em .6em; font-size:.75em; }
body.stremio-hybrid .sh-streams .ctr-tabs,body.stremio-hybrid .sh-streams .ctr-menus { display:flex; flex-wrap:wrap; gap:.4em; margin-bottom:.4em; }
body.stremio-hybrid .sh-streams .ctr-tracker-tabs{padding:.35em 0 .1em;border-top:1px solid #ffffff18}
body.stremio-hybrid .sh-streams .ctr-button,body.stremio-hybrid .sh-streams .ctr-tab { color:var(--text); background:#ffffff09; border:1px solid var(--line); border-radius:.5em; padding:.45em .6em; min-height:2.2em; }
body.stremio-hybrid .sh-streams .ctr-tab { border-radius:2em; }
body.stremio-hybrid .sh-streams .ctr-tab.is-active { background:var(--acc); color:var(--sm-accent-ink,#fff); border-color:var(--acc); }
body.stremio-hybrid .sh-streams .ctr-tools .focus { border-color:#fff; box-shadow:inset 0 0 0 1px var(--acc); }
body.stremio-hybrid .sh-streams .ctr-name { font-size:1em; line-height:1.35; font-weight:650; overflow-wrap:anywhere; }
body.stremio-hybrid .sh-streams .ctr-release-info { min-width:0; }


body.stremio-hybrid .sh-movie-page .scroll--mask { mask-image:none !important; -webkit-mask-image:none !important; }
/* Full-height Stremio source rail; remains inside the movie scroll, so lower rows are unobstructed. */
body.stremio-hybrid .sh-movie-hero { position:relative; --sh-stream-width:42%; --sh-stream-gap:1.2em; }
body.stremio-hybrid .sh-streams { top:-2.8em; right:0; width:var(--sh-stream-width); box-sizing:border-box; height:calc(100vh - 3.7em); max-height:none; padding:.8em; border-radius:0; border:0; border-left:1px solid #ffffff10; background:rgba(9,10,18,.94); }
body.stremio-hybrid.sh-movie-active { --sh-bg:#0c0c16; }
body.stremio-hybrid.sh-movie-active .head { background:var(--sh-header) !important; border:0 !important; box-shadow:none !important; }
body.stremio-hybrid.sh-movie-active .head .open--search,body.stremio-hybrid.sh-movie-active .head .sh-head-more { background:transparent !important; background-image:none !important; }
body.stremio-hybrid.sh-movie-active .head .open--search::after { color:#f4f4f7; text-shadow:0 1px 3px #000; }
body.stremio-hybrid.sh-movie-active .head .sh-head-more.focus { box-shadow:0 0 0 .1em var(--sh-accent-soft); }

/* Native Select content, exact TorrentsRedesign panel skin; scoped to source tools. */
body.stremio-hybrid .sh-cinema-select{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;--acc:#e0243a;--acc-rgb:224,36,58;--text:#eef1f8;--muted:#9099ad;font:clamp(1rem,1.04vw,2.6rem)/1.4 Manrope,system-ui,sans-serif;color:var(--text)}
body.stremio-hybrid .sh-cinema-select:not(.animate){visibility:hidden!important;pointer-events:none!important}
body.stremio-hybrid .sh-cinema-select .selectbox__layer{background:rgba(3,5,10,.38)!important}
body.stremio-hybrid .sh-cinema-select .selectbox__content{position:absolute!important;top:max(10vh,calc(var(--ctr-head-height,8vh) + 1.5vh))!important;right:4.5vw!important;bottom:4.5vh!important;max-height:none!important;left:auto!important;width:38vw!important;min-width:min(26rem,91vw);height:auto!important;display:flex;flex-direction:column;padding:1em!important;background:rgba(9,12,22,.98)!important;border:1px solid rgba(255,255,255,.15);border-radius:1.1em;box-shadow:0 1em 3em rgba(0,0,0,.4);transform:none!important}
body.stremio-hybrid .sh-cinema-select .selectbox__head{padding:.35em .4em 1em!important;flex:none}
body.stremio-hybrid .sh-cinema-select .selectbox__title{font:750 1.3em/1.3 Unbounded,Manrope,system-ui,sans-serif!important}
body.stremio-hybrid .sh-cinema-select .selectbox__body{height:auto!important;min-height:0;flex:1;padding:0!important}
body.stremio-hybrid .sh-cinema-select .scroll{height:100%!important;mask-image:none!important;-webkit-mask-image:none!important}
body.stremio-hybrid .sh-cinema-select .scroll__body{padding:.35em!important}
body.stremio-hybrid .sh-cinema-select .selectbox-item{padding:.75em .8em!important;margin:0 0 .4em!important;min-height:2.8em;box-sizing:border-box;border:1px solid transparent!important;border-radius:.65em!important;background:rgba(255,255,255,.035)!important;color:var(--text)!important;font-size:1em!important}
body.stremio-hybrid .sh-cinema-select .selectbox-item__title{font-size:1em!important;white-space:normal;overflow-wrap:anywhere}
body.stremio-hybrid .sh-cinema-select .selectbox-item__subtitle{font-size:max(.8em,1rem)!important;color:var(--muted)}
body.stremio-hybrid .sh-cinema-select .selectbox-item.selected{border-color:rgba(var(--acc-rgb),.45)!important;background:rgba(var(--acc-rgb),.14)!important}
body.stremio-hybrid .sh-cinema-select .selectbox-item.focus,body.stremio-hybrid .sh-cinema-select .selectbox-item:hover{border-color:#fff!important;background:rgba(var(--acc-rgb),.32)!important;box-shadow:0 0 0 .12em rgba(var(--acc-rgb),.6)!important;color:#fff!important}
@media(max-width:800px){body.stremio-hybrid .sh-cinema-select .selectbox__content{width:91vw!important}}
body.stremio-hybrid .sh-movie .sh-metadata-shadow { display:none !important; }
body.stremio-hybrid .sh-movie .sh-metadata-rich { display:flex !important; flex-wrap:wrap; gap:.35em .5em; margin:0 0 1em !important; }
body.stremio-hybrid .sh-movie .sh-metadata-rich > div,body.stremio-hybrid .sh-movie .sh-metadata-rich > div > div { display:contents !important; }
body.stremio-hybrid .sh-movie .sh-metadata-rich span { color:#b8b8c6 !important; background:#ffffff06 !important; font-size:.85em !important; border:0 !important; margin:0 !important; padding:.2em .5em !important; }
body.stremio-hybrid .sh-series .full-descr__text { max-height:6.6em !important; }

`;
    css += `
body.stremio-hybrid .sh-has-streams .sh-movie-column{width:calc(100% - var(--sh-stream-width) - var(--sh-stream-gap))!important;max-width:calc(100% - var(--sh-stream-width) - var(--sh-stream-gap))!important;min-width:0}
body.stremio-hybrid .sh-streams .torrent-item{font-size:.9em}
body.stremio-hybrid .sh-streams .ctr-name,body.stremio-hybrid .sh-streams .torrent-item__title{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;-webkit-line-clamp:unset!important;max-height:none!important;overflow-wrap:anywhere}
body.stremio-hybrid .sh-streams .ctr-row{grid-template-columns:3em minmax(0,1fr) minmax(4.5em,auto)}
body.stremio-hybrid .sh-streams .ctr-release-info,body.stremio-hybrid .sh-streams .ctr-metrics{min-width:0}
body.stremio-hybrid .sh-streams .ctr-size{white-space:normal;overflow-wrap:anywhere}
@media(max-width:900px){body.stremio-hybrid .sh-movie-hero{--sh-stream-width:100%}body.stremio-hybrid .sh-has-streams .sh-movie-column{width:100%!important;max-width:100%!important}body.stremio-hybrid .sh-streams{position:relative;top:auto;right:auto;width:100%;height:60vh;border-left:0}}
body.stremio-hybrid .sh-movie .full-descr__text{display:-webkit-box!important;-webkit-box-orient:vertical;-webkit-line-clamp:3;max-height:4.95em!important;overflow:hidden;white-space:normal!important}
body.stremio-hybrid .sh-movie.sh-description-expanded .full-descr__text{display:block!important;-webkit-line-clamp:unset;max-height:none!important;overflow:visible;white-space:pre-line!important}
body.stremio-hybrid .sh-movie .sh-description-toggle{order:6;align-self:flex-start;margin:0 0 1.2em;display:flex;align-items:center;justify-content:center;width:auto;min-width:0;min-height:2.9em;flex:0 0 auto;font-size:.85em!important;color:var(--sm-text);padding:0 .8em!important;border-radius:.55em;background:#ffffff12;border:1px solid #ffffff18}\nbody.stremio-hybrid .sh-movie .sh-description-toggle.focus{background:var(--sh-focus-soft);box-shadow:0 0 0 .12em var(--sh-accent-soft)}
body.stremio-hybrid .head .head__title{max-width:20vw}
body.stremio-hybrid .sh-profile-menu .selectbox__content{position:absolute;right:1.8em;top:5em;bottom:auto;left:auto;width:23em;max-width:90vw;max-height:calc(100vh - 7em);border:1px solid var(--sh-border);box-shadow:0 .7em 2em #0005}
body.stremio-hybrid .selectbox-item{transition:opacity var(--sh-speed) var(--sh-ease)!important}
body.stremio-hybrid .selectbox-item__title{white-space:normal;overflow-wrap:anywhere}
body.stremio-hybrid .wrap__left{background:#090a12!important}
@media(prefers-reduced-motion:reduce){body.stremio-hybrid .selectbox,body.stremio-hybrid .selectbox-item,body.stremio-hybrid .sh-movie-page .full-start__background{transition:none!important;animation:none!important}}
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
    // Cardify owns the native template/data. Move nodes with their handlers, never clone them.
    var movieRecords=[], movieFrame=0, movieTimers=[];
    function restoreMovie(record) {
        if(record.ratingController&&record.ratingController.up===record.ratingUp)record.ratingController.up=record.originalRatingUp;
        (record.castLines||[]).forEach(function(entry){entry.line.unuse(entry.hook);delete entry.line._shCastHook;var rendered=entry.line.render(),node=rendered&&(rendered[0]||rendered);if(node&&node.querySelectorAll)node.querySelectorAll('.sh-cast-watched').forEach(function(n){n.remove();});});
        record.root.querySelectorAll('.sh-generated-description').forEach(function(n){n.remove();});
        (record.seriesFields||[]).forEach(function(n){n.remove();});
        (record.ratingRepairs||[]).forEach(function(item){delete item.img.dataset.shRatingFallback;if(item.img.getAttribute('src')===item.fallback)item.img.setAttribute('src',item.src);});
        clearDescription(record);
        removeMovieBrand(record);
        removeStreams(record);
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
    function setupDescription(record, description) {
        if(record.descriptionToggle&&record.descriptionToggle.isConnected)return;
        clearDescription(record);
        var button=document.createElement("div");button.className="selector sh-description-toggle";
        button.setAttribute("role","button");button.setAttribute("aria-expanded","false");button.textContent="Показати більше";
        record.descriptionToggle=button;
        record.toggleDescription=function(){
            var expanded=button.getAttribute("aria-expanded")!=="true";
            button.setAttribute("aria-expanded",String(expanded));button.textContent=expanded?"Показати менше":"Показати більше";
            record.root.classList.toggle("sh-description-expanded",expanded);
        };
        $(button).on("hover:enter.shDescription",record.toggleDescription);
        description.insertAdjacentElement('afterend',button);
    }
    function clearDescription(record) {
        if(record.descriptionToggle){$(record.descriptionToggle).off(".shDescription").remove();record.descriptionToggle=null;record.toggleDescription=null;}
        record.root.classList.remove("sh-description-expanded");
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
        if(controller.name!=='full_start'||!link||!visible.length)return;
        bindRatingNavigation(record,controller.controller);
        var primary=visible.filter(function(node){return node.classList.contains('view--torrent');})[0]||visible[0];
        var focus=record.root.querySelector('.selector.focus'),last=link.last&&(link.last[0]||link.last);
        if(!record.initialFocusDone||!focus||(last&&!record.root.contains(last))){
            var target=record.initialFocusDone&&focus?focus:primary;
            link.last=target;Lampa.Controller.collectionSet(record.root);Lampa.Controller.collectionFocus(target,record.root);
        }
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
        function move(node){if(node && node.parentNode!==left){record.moves.push({node:node,parent:node.parentNode,next:node.nextSibling});left.insertBefore(node,buttons);}}
        setupStreams(record);setupMovieBrand(record);
        root.classList.add('sh-movie');root.classList.toggle('sh-series',record.kind==='tv');consolidateMetadata(record);updateSeriesMetadata(record);root.classList.toggle('sh-movie-native',!page.querySelector('.cardify-effects-overlay')); page.classList.add('sh-movie-page');left.classList.add('sh-movie-column');
        var description=root.querySelector('.custom-ghost-main') || page.querySelector('.full-descr__text');
        var movie=streamMovie(record);
        if(!description&&movie._tp_omit_details&&movie.overview){description=document.createElement('div');description.className='full-descr__text sh-generated-description';description.textContent=movie.overview;}
        if(description){description=plainDescription(record,description);move(description);record.description=description;description.classList.add('sh-movie-description');if(description.textContent.trim()&&typeof movie.overview==='string'&&movie.overview.trim())setupDescription(record,description);}
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

    // Files skin adapted from inspected TorrentsRedesign 1.2; native handlers stay intact.
    css += `body.stremio-hybrid .sh-files-modal{--acc:#e0243a;--acc-rgb:224,36,58;--text:#eef1f8;--muted:#9099ad;font:clamp(1rem,1.04vw,2.6rem)/1.4 Manrope,system-ui,sans-serif;color:var(--text)}
.ctr-select:not(.animate){visibility:hidden!important;pointer-events:none!important}
.ctr-select .selectbox__layer{background:rgba(3,5,10,.38)!important}
.ctr-select .selectbox__content{position:absolute!important;top:max(10vh,calc(var(--ctr-head-height,8vh) + 1.5vh));right:4.5vw;bottom:4.5vh;left:auto!important;width:38vw!important;min-width:min(26rem,91vw);height:auto!important;display:flex;flex-direction:column;padding:1em!important;background:rgba(9,12,22,.98)!important;border:1px solid rgba(255,255,255,.15);border-radius:1.1em;box-shadow:0 1em 3em rgba(0,0,0,.4);transform:none!important}
.ctr-select .selectbox__head{padding:.35em .4em 1em!important;flex:none}
.ctr-select .selectbox__title{font:750 1.3em/1.3 Unbounded,Manrope,system-ui,sans-serif!important}
.ctr-select .selectbox__body{height:auto!important;min-height:0;flex:1;padding:0!important}
.ctr-select .scroll{height:100%!important;mask-image:none!important;-webkit-mask-image:none!important}
.ctr-select .scroll__body{padding:.35em!important}
.ctr-select .selectbox-item{padding:.75em .8em!important;margin:0 0 .4em!important;min-height:2.8em;box-sizing:border-box;border:1px solid transparent!important;border-radius:.65em!important;background:rgba(255,255,255,.035)!important;color:var(--text)!important;font-size:1em!important}
.ctr-select .selectbox-item__title{font-size:1em!important;white-space:normal;overflow-wrap:anywhere}
.ctr-select .selectbox-item__subtitle{font-size:max(.8em,1rem)!important;color:var(--muted)}
.ctr-select .selectbox-item.selected{border-color:rgba(var(--acc-rgb),.45)!important;background:rgba(var(--acc-rgb),.14)!important}
.ctr-select .selectbox-item.focus,.ctr-select .selectbox-item:hover{border-color:#fff!important;background:rgba(var(--acc-rgb),.32)!important;box-shadow:0 0 0 .12em rgba(var(--acc-rgb),.6)!important;color:#fff!important}
body.ctr-files-open .ctr>.explorer__files{visibility:hidden}
body.ctr-files-open .ctr-actions{opacity:.45}
body.stremio-hybrid .sh-files-modal{background:linear-gradient(90deg,rgba(7,9,16,.08) 25%,rgba(7,9,16,.3) 55%,rgba(7,9,16,.6))!important;inset:0!important;padding:0!important}
body.stremio-hybrid .sh-files-modal .modal__content{position:absolute!important;top:max(10vh,calc(var(--ctr-head-height,8vh) + 1.5vh));right:4.5vw;bottom:4.5vh;left:auto!important;width:60vw!important;max-width:none!important;max-height:none!important;margin:0!important;padding:1em!important;display:flex!important;flex-direction:column;background:rgba(9,12,22,.96)!important;border:1px solid rgba(255,255,255,.15);border-radius:1.1em;box-shadow:0 1em 3em rgba(0,0,0,.3)}
body.stremio-hybrid .sh-files-modal .modal__head{padding:.2em .4em .75em!important;flex:none}
body.stremio-hybrid .sh-files-modal .modal__title{font:750 1.35em/1.3 Unbounded,Manrope,system-ui,sans-serif!important;margin:0!important}
body.stremio-hybrid .sh-files-modal .sh-files-summary{font-size:max(.85em,1rem);color:var(--muted);margin-top:.3em}
body.stremio-hybrid .sh-files-modal .modal__body{flex:1;min-height:0;padding:0!important}
body.stremio-hybrid .sh-files-modal .scroll{height:100%!important;mask-image:none!important;-webkit-mask-image:none!important}
body.stremio-hybrid .sh-files-modal .scroll__content{max-height:100%!important}
body.stremio-hybrid .sh-files-modal .scroll__body{padding:.4em .4em 1em!important}
body.stremio-hybrid .sh-files-modal .torrnet-folder-name{font:650 1em/1.4 Manrope,system-ui,sans-serif!important;color:#b8c1d5!important;padding:.65em .5em!important;margin:0 0 .5em!important;border-radius:.5em;background:rgba(var(--acc-rgb),.08)!important;overflow-wrap:anywhere}
body.stremio-hybrid .sh-files-modal .torrent-serial,body.stremio-hybrid .sh-files-modal .torrent-file{display:grid!important;position:relative!important;grid-template-columns:7.5em minmax(0,1fr) auto;gap:.85em;align-items:center;width:100%!important;min-height:5em!important;margin:0 0 .55em!important;padding:.55em!important;border:1px solid transparent!important;border-radius:.7em!important;background:rgba(255,255,255,.04)!important;color:var(--text)!important;box-sizing:border-box;overflow:visible!important}
body.stremio-hybrid .sh-files-modal .torrent-serial.focus,body.stremio-hybrid .sh-files-modal .torrent-file.focus,body.stremio-hybrid .sh-files-modal .torrnet-folder-name.focus,body.stremio-hybrid .sh-files-modal .torrent-serial:hover,body.stremio-hybrid .sh-files-modal .torrent-file:hover{border:1px solid #fff!important;background:rgba(var(--acc-rgb),.14)!important;box-shadow:0 0 0 .12em rgba(var(--acc-rgb),.65)!important;transform:none!important}
body.stremio-hybrid .sh-files-modal .torrent-serial__img{position:static!important;width:7.5em!important;height:4.2em!important;object-fit:cover;border-radius:.4em;opacity:.95;float:none!important}
body.stremio-hybrid .sh-files-modal .torrent-serial__content{display:grid!important;grid-template-columns:minmax(0,1fr) max(5em,6rem);gap:.25em .65em;padding:0!important;margin:0!important;min-width:0;width:auto!important;grid-column:2 / 4;align-items:center}
body.stremio-hybrid .sh-files-modal .torrent-serial__body{min-width:0;float:none!important;width:auto!important}
body.stremio-hybrid .sh-files-modal .torrent-serial__title,body.stremio-hybrid .sh-files-modal .torrent-file__title{font-size:1.05em!important;font-weight:700;line-height:1.35;white-space:normal;overflow-wrap:anywhere}
body.stremio-hybrid .sh-files-modal .torrent-serial__line{font-size:max(.8em,1rem)!important;color:var(--muted);margin:.25em 0!important;display:flex;flex-wrap:wrap;gap:.2em .75em}
body.stremio-hybrid .sh-files-modal .torrent-serial__detail{position:static!important;float:none!important;text-align:right;white-space:nowrap}
body.stremio-hybrid .sh-files-modal .torrent-serial__size,body.stremio-hybrid .sh-files-modal .torrent-file__size{font-size:1em!important;font-weight:800;background:none!important;padding:0!important}
body.stremio-hybrid .sh-files-modal .torrent-serial__exe,body.stremio-hybrid .sh-files-modal .torrent-file .exe{font-size:max(.8em,1rem)!important;color:var(--muted);margin-top:.2em}
body.stremio-hybrid .sh-files-modal .torrent-serial__episode{position:absolute!important;top:.65em!important;left:.65em!important;right:auto!important;bottom:auto!important;font-size:max(.8em,1rem)!important;padding:.15em .35em!important;min-width:1.4em;border-radius:.3em;background:rgba(7,9,16,.82)!important}
body.stremio-hybrid .sh-files-modal .torrent-serial__clear{display:none!important}
body.stremio-hybrid .sh-files-modal .time-line{grid-column:1 / -1;margin:.35em 0 0!important;height:.18em!important;background:rgba(255,255,255,.12)!important;border-radius:1em}
body.stremio-hybrid .sh-files-modal .time-line>div{background:var(--acc)!important;height:100%!important;border-radius:inherit}
body.stremio-hybrid .sh-files-modal .torrent-file{grid-template-columns:minmax(0,1fr) auto;min-height:3.5em!important}
body.stremio-hybrid .sh-files-modal .torrent-file__size{position:static!important;float:none!important}

body.stremio-hybrid .sh-files-modal{position:fixed!important;width:100vw!important;height:100vh!important;transform:none!important}
body.stremio-hybrid .sh-files-modal .modal__content{transform:none!important}
@media(max-width:800px){body.stremio-hybrid .sh-files-modal .modal__content{width:91vw!important}}
body.stremio-hybrid .sh-file-rating{grid-column:1/-1;color:#f5d48d;font-size:.9em}
`;
    var filesOverlay=null;
    function streamRecord(){return movieRecords.filter(function(r){return r.streamChild&&!r.streamChild.dead&&r.page.classList.contains('activity--active');})[0];}
    function clearStreamFiles(){
        if(!filesOverlay)return;var node=filesOverlay.node;
        node.classList.remove('sh-files-modal');node.querySelectorAll('.sh-files-summary,.sh-file-rating').forEach(function(n){n.remove();});
        Object.keys(filesOverlay.tokens).forEach(function(key){var t=filesOverlay.tokens[key];if(node.style.getPropertyValue(key)===t.ours){if(t.before)node.style.setProperty(key,t.before);else node.style.removeProperty(key);}});filesOverlay=null;
    }
    function onStreamFiles(event){
        var record=streamRecord(),node=event&&event.html&&(event.html[0]||event.html);
        if(record&&node&&node.querySelector('.torrent-checklist')){record.streamPane.dataset.state='server-error';streamStatus(record,'TorrServer недоступний · Перевірте підключення у відкритій діагностиці');}
        if(record&&node&&node.querySelector('.torrent-error')){record.streamPane.dataset.state='playback-error';streamStatus(record,'Не вдалося відкрити реліз · Спробуйте інший реліз або повторіть вибір');}
        if(!node||!node.querySelector('.torrent-files'))return;
        if(!record)return;
        if(filesOverlay&&filesOverlay.node!==node)clearStreamFiles();
        if(!filesOverlay)filesOverlay={node:node,tokens:{}};
        node.classList.add('sh-files-modal');
        var styles=getComputedStyle(record.page),tokens={'--acc':styles.getPropertyValue('--sm-accent').trim()||'#9775fa','--acc-rgb':styles.getPropertyValue('--sm-accent-rgb').trim()||'151,117,250','--muted':'#aeb6c9','--text':'#eef1f8','--ctr-head-height':(document.querySelector('.head').getBoundingClientRect().height/innerHeight*100)+'vh'};
        Object.keys(tokens).forEach(function(key){if(!filesOverlay.tokens[key])filesOverlay.tokens[key]={before:node.style.getPropertyValue(key),ours:tokens[key]};node.style.setProperty(key,tokens[key]);});
        var head=node.querySelector('.modal__head'),summary=node.querySelector('.sh-files-summary');if(!summary&&head){summary=document.createElement('div');summary.className='sh-files-summary';head.appendChild(summary);}
        var movie=streamMovie(record);if(summary)summary.textContent=(movie.title||movie.name||'')+' · Файлів: '+node.querySelectorAll('.torrent-serial,.torrent-file').length;
    }
    function onStreamPlaybackError(){var record=streamRecord();if(record&&record.streamChild.started){record.streamPane.dataset.state='playback-error';streamStatus(record,'Помилка відтворення · Виберіть реліз повторно або спробуйте інший');}}
    function onStreamFile(event){
        var record=streamRecord();if(!record||record.kind!=='tv'||!event||event.type!=='render')return;
        var params=event.params||{},file=event.element||{},node=event.item&&(event.item[0]||event.item);
        if(!node||!params.movie||String(params.movie.id)!==String(streamMovie(record).id)||node.querySelector('.sh-file-rating,.ctr-episode-rating'))return;
        var season=Number(file.season),episode=Number(file.episode);
        if(file.season==null||file.episode==null||!Number.isInteger(season)||season<0||!Number.isInteger(episode)||episode<1||(file.episodes&&file.episodes.length>1))return;
        var data=params.seasons&&params.seasons[season],episodes=data&&data.episodes;
        if(!Array.isArray(episodes))return;
        var matches=episodes.filter(function(e){return e.id&&Number(e.episode_number)===episode&&(e.season_number==null||Number(e.season_number)===season);});
        if(matches.length!==1)return;var rating=Number(matches[0].vote_average);
        // Use already loaded episode metadata only; never borrow the series score or read API credentials.
        if(!(rating>0&&rating<=10))return;
        var badge=document.createElement('div');badge.className='sh-file-rating';badge.textContent='TMDB '+rating.toFixed(1);badge.title='S'+season+'E'+episode;node.querySelector('.torrent-serial__content')?.appendChild(badge);
    }
    var streamCache=[], streamGeneration=0;
    function streamMovie(record) {
        var movie=record.activity.component.props && record.activity.component.props.get('movie');
        return movie || Lampa.Activity.active().card;
    }
    function streamParams(record) {
        var movie=JSON.parse(JSON.stringify(streamMovie(record))),year=String(movie.release_date||movie.first_air_date||'0000').slice(0,4), df=movie.original_title||movie.original_name||movie.title||movie.name,lg=movie.title||movie.name||df;
        var names={df:df,df_year:df+' '+year,df_lg:df+' '+lg,df_lg_year:df+' '+lg+' '+year,lg:lg,lg_year:lg+' '+year,lg_df:lg+' '+df,lg_df_year:lg+' '+df+' '+year};
        return {component:'torrents',url:'',title:Lampa.Lang.translate('title_torrents'),search:names[Lampa.Storage.field('parse_lang')]||df,search_one:lg,search_two:df,movie:movie,page:1};
    }
    function streamStatus(record,text) {if(record.streamStatus)record.streamStatus.textContent=text;}
    function streamSession(){return window.LampaTorrentOverlay?LampaTorrentOverlay.session():String(streamGeneration);}
    function streamAlive(st){var a=Lampa.Activity.active();return !st.dead&&st.record.streamChild===st&&st.session===streamSession()&&a&&a.activity===st.record.activity;}
    function streamShellActivate(record){
        function focus(step){var items=Array.prototype.filter.call(record.streamPane.querySelectorAll('.sh-stream-head .selector,.sh-stream-load'),function(n){return !n.hidden&&n.offsetParent!==null;}),index=items.findIndex(function(n){return n.classList.contains('focus');});Lampa.Controller.collectionSet(record.streamPane);if(items.length)Lampa.Controller.collectionFocus(items[Math.max(0,Math.min(items.length-1,index+step))],record.streamPane);}
        Lampa.Controller.add('sh_movie_streams',{toggle:function(){focus(0);},up:function(){focus(-1);},left:function(){focus(-1);},down:function(){focus(1);},right:function(){focus(1);},back:function(){closeStreamOverlay(record,true);}});Lampa.Controller.toggle('sh_movie_streams');
    }
    function openStreamOverlay(record){
        if(record.streamView)record.streamView.open();
    }
    function closeStreamOverlay(record,restore){
        var st=record.streamChild;if(st){st.wantFocus=false;}
        record.streamFocused=false;
        if(restore)streamInfo(record);
        if(record.streamView)record.streamView.close(restore);
    }
    function streamInfo(record) {
        record.streamFocused=false;
        if(record.streamChild)record.streamChild.wantFocus=false;
        var start=record.activity.component.items&&record.activity.component.items[0];
        if(start&&typeof start.toggle==='function'){record.activity.component.active=0;start.toggle();}else Lampa.Controller.toggle('full_start');
        var button=record.root.querySelector('.view--torrent:not(.hide)')||record.root.querySelector('.sh-movie-primary');
        if(button)Lampa.Controller.collectionFocus(button,record.root);
    }
    function disposeStreamQuery(st) {
        if(!st.queryFilter)return;
        var filter=st.queryFilter;st.queryFilter=null;
        filter.destroy();
    }
    function streamQuery(st) {
        if(st.dead||st.queryFilter)return;
        // Reuse core Filter's clarification/keyboard UI, overriding only its result callback.
        var filter=st.queryFilter=new Lampa.Filter(st.params);
        filter.onBack=function(){disposeStreamQuery(st);if(streamAlive(st))streamActivate(st.record);};
        filter.onSearch=function(value,extra){
            disposeStreamQuery(st);if(st.dead)return;
            var record=st.record;record.streamQuery={search:String(value||''),clarification:true,global:!!(extra&&extra.global)};
            closeStreamChild(record);loadStreams(record);
        };
        filter.render().find('.filter--search').trigger('hover:enter');
    }
    function streamWindow(st,start) {
        var list=st.root.querySelector('.torrent-list');if(!list)return;
        var rows=st.displayRows||st.rows,scroll=list.closest('.scroll'),top=scroll&&scroll.scrollTop||0;
        st.windowStart=Math.max(0,Math.min(Number(start)||0,Math.max(0,rows.length-1)));st.windowing=true;
        var desired=rows.slice(st.windowStart,st.windowStart+40),current=Array.prototype.slice.call(list.querySelectorAll('.torrent-item'));
        if(current.length!==desired.length||current.some(function(node,i){return node!==desired[i];})){
            st.rows.forEach(function(node){if(node.parentNode)node.parentNode.removeChild(node);});
            desired.forEach(function(node){list.appendChild(node);});
        }
        if(scroll)scroll.scrollTop=top;st.windowing=false;
    }

    // Row view adapter extracted from inspected TorrentsRedesign 1.1.0.
    // The installed plugin supplies parseTitle/score/palette; native row handlers remain in place.
    var cinemaRows=(function(){
        function text(v){return v==null?'':String(v);}
        function number(v){var n=parseFloat(text(v).replace(',','.').replace(/[^\d.\-]/g,''));return isFinite(n)?n:null;}
        function el(cls,value,tag){var n=document.createElement(tag||'div');n.className=cls;if(value!=null)n.textContent=value;return n;}
        function parseTitle(raw){return window.TorrentsRedesign&&TorrentsRedesign.parseTitle?TorrentsRedesign.parseTitle(raw):{raw:raw,name:raw,quality:'',audio:null,subs:null,codec:''};}
        function seedClass(n){return n==null?'':n>=20?'is-good':n>=5?'is-warn':'is-bad';}
        function bitrateClass(n){return n==null?'':n>=8?'is-good':n>=3?'is-warn':'is-bad';}
  function rowData(row,source) {
    var raw=source&&(source.Title||source.title)||row.querySelector('.torrent-item__title')?.textContent||'',api=window.TorrentsRedesign,normalized=api&&api.normalizeRelease?api.normalizeRelease(source||{Title:raw}):null,parsed=normalized&&normalized.parsed||parseTitle(raw);
    function value(selector){var n=row.querySelector(selector);return n?n.textContent:'';}
    return {parsed:parsed,year:normalized&&normalized.year,seeds:normalized?normalized.seeds:number(source?source.Seeders:value('.torrent-item__seeds span')),peers:normalized?normalized.peers:number(source?source.Peers:value('.torrent-item__grabs span')),bitrate:number(source&&source.bitrate!=null?source.bitrate:value('.torrent-item__bitrate span')),bytes:normalized?normalized.bytes:number(source&&source.Size),size:text(source&&source.size||value('.torrent-item__size'))||'—',tracker:normalized&&normalized.tracker||text(source&&(source.Tracker||source.tracker)||value('.torrent-item__tracker')),date:normalized&&normalized.date||text(source&&source.date||value('.torrent-item__date')),season:normalized&&normalized.season,episode:normalized&&normalized.episode,sourceRank:normalized&&normalized.sourceRank};
  }
  function decorate(row,source) {
    if(row.getAttribute('data-parsed')==='1')return;source=source||row._ctrSource;var d=rowData(row,source);if(d.bitrate<=0)d.bitrate=null;if(d.seeds<0)d.seeds=null;if(d.peers<0)d.peers=null;row._ctrData=d;row.setAttribute('data-parsed','1');row.setAttribute('data-ctr-quality',d.parsed.quality);row._ctrOriginalTitle=row.getAttribute('title');row.title=d.parsed.raw+(d.date?'\n'+d.date:'');
    var wrap=el('ctr-row'),q=el('ctr-quality q-'+d.parsed.quality),qualityLabel=d.parsed.quality==='2160'?'4K':d.parsed.quality?d.parsed.quality+'p':'—';q.appendChild(el('',qualityLabel,'strong'));q.appendChild(el('',d.parsed.quality==='2160'?'UHD':d.parsed.quality==='1080'?'FHD':d.parsed.quality==='720'?'HD':d.parsed.quality==='480'?'SD':'Реліз','small'));wrap.appendChild(q);var info=el('ctr-release-info');info.appendChild(el('ctr-best','Найкращий вибір'));info.appendChild(el('ctr-name',d.parsed.raw||'Назва релізу недоступна'));var chips=el('ctr-chips');if(d.parsed.audio)chips.appendChild(el('ctr-chip'+(d.parsed.audio.ua?' is-ua':''),(d.parsed.audio.ua?'🇺🇦 ':'🔊 ')+d.parsed.audio.label));if(d.parsed.codec)chips.appendChild(el('ctr-chip ctr-extra',d.parsed.codec));if(d.tracker)chips.appendChild(el('ctr-chip ctr-extra',d.tracker.replace(/\.to$/i,'')));info.appendChild(chips);wrap.appendChild(info);var metrics=el('ctr-metrics');metrics.appendChild(el('ctr-size',d.size));var peers=el('ctr-peers');peers.appendChild(document.createTextNode('▲ '));peers.appendChild(el(seedClass(d.seeds),d.seeds==null?'—':d.seeds,'span'));peers.appendChild(document.createTextNode('  ▼ '+(d.peers==null?'—':d.peers)));metrics.appendChild(peers);var rate=el('ctr-bitrate');if(d.bitrate==null)rate.textContent='—';else{if(d.bitrate>=3&&d.bitrate<8)rate.appendChild(document.createTextNode('⚠ '));rate.appendChild(el(bitrateClass(d.bitrate),d.bitrate.toFixed(1),'span'));rate.appendChild(document.createTextNode(' Мбіт/с'));}metrics.appendChild(rate);wrap.appendChild(metrics);row.appendChild(wrap);
  }

        return {decorate:decorate};
    })();
    function streamTrackerKey(st){var api=window.TorrentsRedesign;return api&&api.selectedTrackerFilter?api.selectedTrackerFilter():'all';}
    function streamSortKey(){var value;try{value=Lampa.Storage.get('torrents_cinema_sort','recommended');}catch(e){}return value||'recommended';}
    function streamUpdateRows(st){
        var api=window.TorrentsRedesign,filter=streamTrackerKey(st),movie=st.params.movie||{},nativeFilter=st.child&&st.child.getFilterData?st.child.getFilterData()||{}:{},context=Object.assign({},st.params,nativeFilter),qualityFilter=Array.isArray(nativeFilter.quality)?nativeFilter.quality:[],best=null,bestScore=-Infinity,preferredQuality='1080';
        try{preferredQuality=Lampa.Storage.get('torrents_cinema_quality','1080')||'1080';}catch(e){}
        st.rows.forEach(function(row){
            var source=st.sourceData.get(row)||row._ctrSource||{Title:row.querySelector('.torrent-item__title')?.textContent||''};
            cinemaRows.decorate(row,source);row.classList.add('sh-cinema-row');
            var view=window.LampaTorrentOverlay?LampaTorrentOverlay.decorate(row,source,movie,st.record.kind,context):null,data=view&&view.data;
            if(!data&&api&&api.normalizeRelease)data=api.normalizeRelease(source);
            if(!data)data=row._ctrData;
            if(!data)return;row._ctrSource=source;row._ctrData=data;row._shMatch=view&&view.match;
            if(!row._shMatch&&api&&api.releaseMatch)row._shMatch=api.releaseMatch(data,movie,context);
            var matches=!api||!api.trackerMatches||api.trackerMatches(data.tracker,filter),qualityMatches=!qualityFilter.length||qualityFilter.some(function(q){q=String(q).toLowerCase();return q==='4k'||q==='2160'?data.parsed.quality==='2160':String(data.parsed.quality)===q.replace(/p$/,'');});row.classList.toggle('sh-tracker-hidden',!matches);row.classList.remove('is-best','sh-source-pick');
            data.sortScore=api&&api.score?api.score(data,row._shMatch,{ua:true,audio:true,subs:true,quality:preferredQuality}):0;
            if(matches&&qualityMatches&&!row.hidden&&row._shMatch&&api&&api.bestMatchAllowed&&api.bestMatchAllowed(data,movie,row._shMatch)&&data.sortScore>bestScore){best=row;bestScore=data.sortScore;}
        });
        var visible=st.rows.filter(function(row){var data=row._ctrData||{},qualityFilter=st.child&&st.child.getFilterData?st.child.getFilterData().quality:[];qualityFilter=Array.isArray(qualityFilter)?qualityFilter:[];var qualityMatches=!qualityFilter.length||qualityFilter.some(function(q){q=String(q).toLowerCase();return q==='4k'||q==='2160'?data.parsed.quality==='2160':String(data.parsed.quality)===q.replace(/p$/,'');});return !row.hidden&&qualityMatches&&!row.classList.contains('sh-tracker-hidden');});
        st.best=best;st.displayRows=api&&api.sortReleaseRows?api.sortReleaseRows(visible,streamSortKey()):visible.slice();
        if(best&&api&&api.pinBestRow)st.displayRows=api.pinBestRow(st.displayRows,best,true);else if(best){st.displayRows=st.displayRows.filter(function(row){return row!==best;});st.displayRows.unshift(best);}
        if(best){best.classList.add('is-best','sh-source-pick');var label=best.querySelector('.ctr-best');if(label)label.textContent='Найкращий вибір';}
        var focused=st.last,focusIndex=st.displayRows.indexOf(focused);if(focusIndex>=0&&st.displayRows.length>40&&(focusIndex<st.windowStart||focusIndex>=st.windowStart+40))st.windowStart=Math.floor(focusIndex/20)*20;
        streamWindow(st,st.windowStart);syncStreamTrackerTools(st);
        if(focused&&focused.classList&&focused.classList.contains('torrent-item')&&focusIndex<0){focused=st.displayRows[0]||st.trackerButtons&&st.trackerButtons.all||st.sortButton;st.last=focused;}
        if(focused&&st.wantFocus&&streamSelectOwner!==st&&!st.queryFilter)streamFocus(st,focused);
    }
    function decorateStreamRows(st){st.rows.forEach(function(row){var data=st.sourceData.get(row);cinemaRows.decorate(row,data);row.classList.add('sh-cinema-row');});streamUpdateRows(st);}
    function streamLower(record) {streamInfo(record);if(record.originalInfoDown)record.originalInfoDown();}


    var streamSelectOwner=null;
    function clearStreamSelect(){
        document.querySelectorAll('.sh-profile-menu').forEach(function(n){n.classList.remove('sh-profile-menu');});
        var st=streamSelectOwner;if(!st)return;streamSelectOwner=null;
        if(st.selectNode){st.selectNode.classList.remove('sh-cinema-select');Object.keys(st.selectTokens||{}).forEach(function(key){var entry=st.selectTokens[key];if(st.selectNode.style.getPropertyValue(key)===entry.ours){if(entry.before)st.selectNode.style.setProperty(key,entry.before);else st.selectNode.style.removeProperty(key);}});st.selectNode=null;st.selectTokens=null;}
    }
    function onStreamSelect(event){
        clearStreamSelect();
        if(menuOpen)return; // Profile owns its compact native Select surface.
        var record=movieRecords.filter(function(r){return r.streamFocused&&r.streamChild&&!r.streamChild.dead&&r.page.classList.contains('activity--active');})[0];
        if(!record)return;var st=record.streamChild,node=event&&event.html&&(event.html[0]||event.html)||Lampa.Select.render()[0];if(!node)return;
        streamSelectOwner=st;st.selectNode=node;st.selectTokens={};node.classList.add('sh-cinema-select');
        var styles=getComputedStyle(record.page),tokens={'--acc':styles.getPropertyValue('--sm-accent').trim()||'#9775fa','--acc2':styles.getPropertyValue('--sm-accent2').trim()||'#3a74ff','--acc-rgb':styles.getPropertyValue('--sm-accent-rgb').trim()||'151,117,250','--acc2-rgb':styles.getPropertyValue('--sm-accent2-rgb').trim()||'58,116,255','--ctr-head-height':(document.querySelector('.head').getBoundingClientRect().height/innerHeight*100)+'vh'};
        Object.keys(tokens).forEach(function(key){st.selectTokens[key]={before:node.style.getPropertyValue(key),ours:tokens[key]};node.style.setProperty(key,tokens[key]);});
    }
    function setupStreamTools(st){
        if(!st.providerBinding&&window.ParserProviders&&typeof ParserProviders.mount==='function')st.providerBinding=ParserProviders.mount(st.root,{
            isAlive:function(){return !st.dead&&st.record.streamChild===st;},
            onBack:function(){if(streamAlive(st))streamActivate(st.record);},
            beginChange:function(){st.providerChanging=true;},endChange:function(){st.providerChanging=false;},
            onChange:function(){if(st.dead)return;var record=st.record;streamGeneration++;streamCache=[];closeStreamChild(record);loadStreams(record);}
        });
        if(st.tools||!st.root.querySelector('.torrent-filter'))return;
        var tools=document.createElement('div');tools.className='ctr-tools';
        tools.innerHTML='<div class="ctr-tabs"></div><div class="ctr-tabs ctr-tracker-tabs"></div><div class="ctr-menus"></div>';
        st.tools=tools;st.root.classList.add('sh-cinema-explorer');
        function button(label,fn,cls){var n=document.createElement('div');n.className=(cls||'ctr-button')+' selector';n.textContent=label;n.setAttribute('role','button');var last=0;function run(e){var now=Date.now();if(now-last<180)return;last=now;st.last=n;e.stopImmediatePropagation();fn(n);}n.addEventListener('hover:enter',run);n.addEventListener('click',run);return n;}
        ['all','2160','1080','720'].forEach(function(q){var n=button(q==='all'?'Усі':q==='2160'?'4K':q+'p',function(){
            var filter=Object.assign({},st.child.getFilterData()||{});filter.quality=q==='all'?[]:[q==='2160'?'4k':q+'p'];st.child.setFilterData(filter);st.child.applyFilter();streamActivate(st.record);streamFocus(st,n);
        },'ctr-tab');n.dataset.quality=q;tools.querySelector('.ctr-tabs').appendChild(n);});
        var trackerTabs=tools.querySelector('.ctr-tracker-tabs');st.trackerButtons={};
        [['all','Усі'],['toloka','Толока'],['mazepa','Мазепа'],['source','Інші']].forEach(function(entry){var key=entry[0],n=button(entry[1],function(){
            var api=window.TorrentsRedesign;if(!api||!api.storeTrackerFilter)return;
            function apply(selected,name){if(!api.storeTrackerFilter(selected,name))return;st.last=n;decorateStreamRows(st);streamActivate(st.record);streamFocus(st,n);}
            if(key!=='source'){apply(key,'');return;}
            var options=api.trackerOptions?api.trackerOptions(st.rows.map(function(row){return row._ctrData||{};})).filter(function(option){return option.key.indexOf('source:')===0;}):[];
            if(!options.length)return Lampa.Noty.show('Інших трекерів у цих результатах немає');
            Lampa.Select.show({title:'Оберіть трекер',items:options.map(function(option){return {title:option.label+' · '+option.count,key:option.key,name:option.name};}),onBack:function(){streamActivate(st.record);streamFocus(st,n);},onSelect:function(option){apply('source:',option.name);}});
        },'ctr-tab');n.dataset.tracker=key;trackerTabs.appendChild(n);st.trackerButtons[key]=n;});
        var menus=tools.querySelector('.ctr-menus');
        st.sortButton=button('Сортування',function(){
            var items=[['recommended','Рекомендований'],['quality','Якість · 4K спочатку'],['seeders','Сіди · найбільше'],['size','Розмір · більший'],['date','Дата · новіші'],['tracker','Толока → Мазепа → інші']].map(function(entry){return {title:entry[1],key:entry[0]};});
            Lampa.Select.show({title:'Сортування релізів',items:items,onBack:function(){streamActivate(st.record);streamFocus(st,st.sortButton);},onSelect:function(item){var api=window.TorrentsRedesign;if(api&&api.storeSort&&api.storeSort(item.key)){st.last=st.sortButton;decorateStreamRows(st);streamActivate(st.record);streamFocus(st,st.sortButton);}}});
        });menus.appendChild(st.sortButton);
        if(st.root.querySelector('.filter--sort'))menus.appendChild(button('Штатне сортування',function(){st.root.querySelector('.filter--sort').dispatchEvent(new Event('hover:enter'));}));
        menus.appendChild(button('Фільтри та джерела',function(){
            var items=[['filter','Фільтри / трекери'],['parser','Джерело'],['search','Пошук']].filter(function(x){return st.root.querySelector('.filter--'+x[0]);}).map(function(x){return {title:x[1],native:x[0]};});
            Lampa.Select.show({title:'Фільтри та джерела',items:items,onBack:function(){streamActivate(st.record);},onSelect:function(item){streamActivate(st.record);st.root.querySelector('.filter--'+item.native).dispatchEvent(new Event('hover:enter'));}});
        }));
        st.root.querySelector('.explorer__files').insertBefore(tools,st.root.querySelector('.explorer__files').firstChild);
    }
    function syncStreamTools(st){
        setupStreamTools(st);if(!st.tools)return;
        var filter=st.child.getFilterData()||{},q=Array.isArray(filter.quality)&&filter.quality.length===1?String(filter.quality[0]).replace('4k','2160').replace('p',''):'all';
        st.tools.querySelectorAll('[data-quality]').forEach(function(n){n.classList.toggle('is-active',n.dataset.quality===q);n.setAttribute('aria-pressed',String(n.dataset.quality===q));});
        syncStreamTrackerTools(st);
    }
    function syncStreamTrackerTools(st){
        if(!st.trackerButtons)return;var api=window.TorrentsRedesign;if(!api||!api.trackerOptions)return;
        var options=api.trackerOptions(st.rows.map(function(row){return row._ctrData||{};})),selected=api.selectedTrackerFilter?api.selectedTrackerFilter():'all',map={};options.forEach(function(option){map[option.key]=option.count;});
        var others=options.filter(function(option){return option.key.indexOf('source:')===0;}),current=others.filter(function(option){return option.key===selected;})[0],otherCount=others.reduce(function(total,option){return total+option.count;},0);
        st.trackerButtons.all.textContent='Усі · '+(map.all||0);st.trackerButtons.toloka.textContent='Толока · '+(map.toloka||0);st.trackerButtons.mazepa.textContent='Мазепа · '+(map.mazepa||0);st.trackerButtons.source.textContent=current?'Інші: '+current.name+' · '+current.count:'Інші · '+otherCount;
        [['all','all'],['toloka','toloka'],['mazepa','mazepa'],['source','source']].forEach(function(pair){var button=st.trackerButtons[pair[0]],active=pair[0]==='source'?selected.indexOf('source:')===0:selected===pair[1];button.classList.toggle('is-active',!!active);button.setAttribute('aria-pressed',String(!!active));});
        var labels={recommended:'Рекомендований',quality:'Якість',seeders:'Сіди',size:'Розмір',date:'Дата',tracker:'Трекер'},sort;try{sort=Lampa.Storage.get('torrents_cinema_sort','recommended');}catch(e){}st.sortButton.textContent='Сортування · '+(labels[sort]||labels.recommended);
    }
    function streamSyncRows(st) {
        st.root.querySelectorAll('.torrent-item').forEach(function(row){if(st.rows.indexOf(row)<0)st.rows.push(row);});
        decorateStreamRows(st);syncStreamTools(st);
    }
    function streamFocus(st,node) {
        if(!streamAlive(st)||!st.wantFocus||!st.record.streamView?.isOpen())return;
        Lampa.Controller.collectionSet(st.record.streamPane,false,true);
        var target=node&&node.isConnected&&node.offsetParent!==null?node:st.last&&st.last.isConnected&&st.last.offsetParent!==null?st.last:st.root.querySelector('.torrent-item')||st.root.querySelector('.ctr-tools .selector')||st.root.querySelector('.selector:not(.hide)')||st.record.streamPane.querySelector('.sh-stream-head .selector');
        if(target){Lampa.Controller.collectionFocus(target,st.record.streamPane);if(target.classList.contains('torrent-item'))st.selectedRow=target;}
    }
    function streamMove(record,direction) {
        var st=record.streamChild;if(!st)return;if(st.loading)st.navigatedWhileLoading=true;
        var rows=st.displayRows||st.rows,index=rows.indexOf(st.last),filters=Array.prototype.filter.call(st.root.querySelectorAll('.ctr-tools .selector,.torrent-filter .selector'),function(n){return n.offsetParent!==null;}),headers=Array.prototype.slice.call(record.streamPane.querySelectorAll('.sh-stream-head .selector'));
        if(index>=0){
            if(direction==='left'||direction==='right'){streamFocus(st,st.trackerButtons&&st.trackerButtons.all||filters[0]||headers[0]);return;}
            if(direction==='down'&&index+1>=rows.length)st.child.next();
            var next=index+(direction==='down'?1:-1);
            if(next<0){streamFocus(st,st.sortButton||filters[filters.length-1]||headers[headers.length-1]);return;}
            if(!rows[next]){streamFocus(st,rows[index]);return;}
            if(next<st.windowStart)streamWindow(st,Math.max(0,st.windowStart-20));
            if(next>=st.windowStart+40)streamWindow(st,st.windowStart+20);
            streamFocus(st,rows[next]);return;
        }
        var qualityTabs=Array.prototype.slice.call(st.root.querySelectorAll('.ctr-tabs [data-quality]')),trackerTabs=Array.prototype.slice.call(st.root.querySelectorAll('.ctr-tracker-tabs .selector')),menus=Array.prototype.slice.call(st.root.querySelectorAll('.ctr-menus .selector'));
        var group=headers.indexOf(st.last)>=0?headers:qualityTabs.indexOf(st.last)>=0?qualityTabs:trackerTabs.indexOf(st.last)>=0?trackerTabs:menus.indexOf(st.last)>=0?menus:filters,at=group.indexOf(st.last);
        if(direction==='left'){if(at>0)streamFocus(st,group[at-1]);else streamFocus(st,group[0]||headers[0]);}
        else if(direction==='right'){var nextControl=group[at+1];if(!nextControl)nextControl=group===qualityTabs?trackerTabs[0]:group===trackerTabs?menus[0]:filters[0]||rows[0];streamFocus(st,nextControl||record.streamLoad);}
        else if(direction==='down'){var target=group===headers?qualityTabs[0]:group===qualityTabs?trackerTabs[0]:group===trackerTabs?menus[0]:rows[st.windowStart];if(target)streamFocus(st,target);else streamFocus(st,headers[0]);}
        else {var target=group===menus?trackerTabs[trackerTabs.length-1]:group===trackerTabs?qualityTabs[Math.min(at,qualityTabs.length-1)]:group===qualityTabs?headers[headers.length-1]:headers[0];streamFocus(st,target||headers[0]);}
    }
    function streamActivate(record) {
        var st=record.streamChild;if(!st||!streamAlive(st)||!record.streamView?.isOpen())return;
        st.wantFocus=true;record.streamFocused=true;
        var history=st.root.querySelector('.watched-history'),historyBody=history&&history.querySelector('.watched-history__body');if(historyBody)history.classList.toggle('sh-empty-history',historyBody.textContent.trim()===Lampa.Lang.translate('no_watch_history'));
        // Empty.start otherwise replaces start with a page-wide empty controller.
        st.child.start=function(){streamActivate(record);};
        Lampa.Controller.add('sh_movie_streams',{
            toggle:function(){streamFocus(st);},
            up:function(){streamMove(record,'up');},down:function(){streamMove(record,'down');},left:function(){streamMove(record,'left');},right:function(){streamMove(record,'right');},back:function(){closeStreamOverlay(record,true);}
        });
        Lampa.Controller.toggle('sh_movie_streams');
    }
    function closeStreamChild(record) {
        var st=record.streamChild;if(!st)return;
        st.dead=true;st.deferred=null;
        clearStreamFiles();
        if(st.providerBinding){st.providerBinding.destroy();st.providerBinding=null;}
        if(streamSelectOwner===st){clearStreamSelect();Lampa.Select.close();streamInfo(record);}
        if(st.filesBinding){st.filesBinding.destroy();st.filesBinding=null;}
        st.dead=true;record.streamChild=null;
        if(st.queryFilter){var enabled=Lampa.Controller.enabled();if(document.querySelector('.search-box')&&enabled.controller&&typeof enabled.controller.back==='function')enabled.controller.back();disposeStreamQuery(st);}
        Lampa.Listener.remove('torrent',st.onRender);st.sourceData=new WeakMap();if(st.root){st.root.removeEventListener('hover:focus',st.onFocus,true);st.root.removeEventListener('hover:enter',st.onEnter,true);}
        Lampa.Torrent.back(null);if(st.started)Lampa.Torrent.opened(null);
        st.child.destroy();st.rows.forEach(function(row){$(row).remove();});st.rows=[];
        record.streamContent.textContent='';record.streamPane.setAttribute('aria-busy','false');record.streamPane.removeAttribute('data-cache-hit');streamStatus(record,'Джерела завантажуються лише після відкриття');record.streamLoad.hidden=false;
        Lampa.Controller.add('sh_movie_streams',{toggle:function(){Lampa.Controller.toggle('content');},back:function(){Lampa.Controller.toggle('content');}});
    }
    // Core button handlers use jQuery events, which do not reach DOM capture listeners.
    // Route only this active details owner's matching torrent request; retain core handlers/APIs.
    var streamRouteHooks = [];
    function streamRouteMatches(params, movie, kind) {
        if (!params || params.component !== 'torrents' || !params.movie || !movie || !movie.id) return false;
        if (String(params.movie.id) !== String(movie.id) || (params.movie.source || 'tmdb') !== (movie.source || 'tmdb')) return false;
        var incoming = params.movie.media_type || (params.movie.name || params.movie.first_air_date ? 'tv' : 'movie');
        return incoming === kind;
    }
    function installStreamRoutes() {
        ['push', 'replace'].forEach(function (name) {
            if (streamRouteHooks.some(function (hook) { return hook.name === name; })) return;
            var original = Lampa.Activity[name]; if (typeof original !== 'function') return;
            var wrapped = function (params) {
                var active = Lampa.Activity.active(), record = watching && active && active.component === 'full' && movieRecords.filter(function (r) { return r.activity === active.activity && r.streamPane && r.page.classList.contains('activity--active'); })[0];
                if (!record || !streamRouteMatches(params, streamMovie(record), record.kind)) return original.apply(this, arguments);
                var fields = ['search', 'search_one', 'search_two', 'global', 'clarification', 'season', 'episode', 'filter_season', 'filter_episode'];
                var previous = record.streamQuery || streamParams(record), changed = fields.some(function (key) { return params[key] !== previous[key]; });
                if (changed && record.streamChild) closeStreamChild(record);
                record.streamQuery = Object.assign({}, params);
                loadStreams(record);
            };
            streamRouteHooks.push({name:name, original:original, wrapped:wrapped}); Lampa.Activity[name] = wrapped;
        });
    }
    function removeStreamRoutes() {
        streamRouteHooks = streamRouteHooks.filter(function (hook) {
            if (Lampa.Activity[hook.name] !== hook.wrapped) return true; // preserve a later plugin's chain
            Lampa.Activity[hook.name] = hook.original; return false;
        });
    }
    function loadStreams(record) {
        openStreamOverlay(record);
        if(record.streamChild&&(record.streamChild.session!==streamSession()||record.streamChild.expires&&record.streamChild.expires<Date.now()))closeStreamChild(record);
        if(record.streamChild){var existing=record.streamChild;existing.wantFocus=true;if(existing.deferred){var deferred=existing.deferred;existing.deferred=null;deferred();}streamActivate(record);return;}
        if(typeof Lampa.Component.get('torrents')!=='function'){streamStatus(record,'Модуль торрентів недоступний · Повторіть спробу');streamShellActivate(record);return;}
        var params=Object.assign(streamParams(record),record.streamQuery||{}), st={record:record,params:params,rows:[],sourceData:new WeakMap(),windowStart:0,dead:false,wantFocus:true,loading:true,session:streamSession()};
        record.streamChild=st;record.streamFocused=true;record.streamLoad.hidden=true;streamStatus(record,'Пошук джерел…');
        var key=window.LampaTorrentOverlay?LampaTorrentOverlay.key(params,record.kind,streamGeneration):[record.kind,params.movie.id,params.search,streamGeneration].join('|');st.key=key;
        try {
            st.child=Lampa.Component.create(params);st.root=st.child.render()[0];st.root.classList.add('sh-stream-explorer');record.streamContent.appendChild(st.root);
            if(window.TorrentsRedesign&&typeof TorrentsRedesign.attachFiles==='function')st.filesBinding=TorrentsRedesign.attachFiles({root:st.root,movie:params.movie,kind:record.kind,component:record.activity.component,isAlive:function(){return streamAlive(st)&&record.streamView.isOpen();}});
            st.child.activity={loader:function(on){if(!streamAlive(st)||!record.streamView?.isOpen())return;st.loading=on;record.streamPane.dataset.state=on?'loading':st.error?'parser-error':st.total===0?'empty':'ready';record.streamPane.setAttribute('aria-busy',on?'true':'false');streamStatus(record,on?'Пошук джерел…':st.error?'Парсер недоступний · Оновити — повторна спроба':st.partial?'Частина парсерів недоступна · Знайдено: '+st.total:st.total===0?'Джерел не знайдено':st.total!=null?'Знайдено: '+st.total:'Джерела');if(!on){streamSyncRows(st);if(!st.loadedOnce){st.loadedOnce=true;if(!st.navigatedWhileLoading)st.last=st.root.querySelector('.torrent-item')||st.last;}st.child.start=function(){streamActivate(record);};}},toggle:function(){if(!st.dead&&st.wantFocus)streamActivate(record);},render:function(){return $(st.root);}};
            st.child.start=function(){streamActivate(record);};st.child.back=function(){closeStreamOverlay(record,true);};
            var append=st.child.append,reset=st.child.reset,next=st.child.next,applyFilter=st.child.applyFilter;
            st.child.applyFilter=function(){params.page=1;var result=applyFilter.apply(st.child,arguments);streamSyncRows(st);return result;};
            st.onRender=function(event){if(st.appending&&event.type==='render'&&event.item&&event.element)st.sourceData.set(event.item[0]||event.item,event.element);};Lampa.Listener.follow('torrent',st.onRender);
            st.child.append=function(){st.appending=true;try{append.apply(st.child,arguments);}finally{st.appending=false;}streamSyncRows(st);};
            st.child.reset=function(){st.rows.forEach(function(row){$(row).remove();});st.rows=[];st.displayRows=[];st.windowStart=0;return reset.apply(st.child,arguments);};
            st.child.next=function(){if(!streamAlive(st)||st.windowing||!st.wantFocus)return;var focused=st.last;next.apply(st.child,arguments);if((st.displayRows||st.rows).length>st.windowStart+40){streamWindow(st,st.windowStart+20);if(focused&&focused.isConnected)streamFocus(st,focused);}};
            st.onFocus=function(event){var node=event.target.closest('.selector');if(node&&st.root.contains(node)){st.last=node;if(node.classList.contains('torrent-item'))st.selectedRow=node;}};
            st.onEnter=function(event){
                if(event.target.closest('.torrent-item')){
                    st.started=true;
                    // Native Torrent.close consumes this callback after each Files session.
                    // Arm it for every release, including a second selection after playback.
                    Lampa.Torrent.back(function(){if(streamAlive(st)&&record.streamView.isOpen())streamActivate(record);});
                }
                if(event.target.closest('.filter--back')){event.stopImmediatePropagation();closeStreamOverlay(record,true);}else if(event.target.closest('.filter--search,.empty__footer')){event.stopImmediatePropagation();streamQuery(st);}
            };
            st.root.addEventListener('hover:focus',st.onFocus,true);st.root.addEventListener('hover:enter',st.onEnter,true);
            var originalGet;
            // Scope this wrapper to initialize's synchronous Parser.get dispatch, not to global navigation.
            var getForChild=function(query,done,fail){
                if(query!==params)return originalGet.apply(this,arguments);
                streamCache=streamCache.filter(function(item){return item.expires>Date.now();});var cached=streamCache.filter(function(item){return item.key===key;})[0];
                if(cached){record.streamPane.dataset.cacheHit='true';st.total=cached.data.Results.length;st.expires=cached.expires;var data=JSON.parse(JSON.stringify(cached.data)),viewed=Lampa.Storage.cache('torrents_view',5000,[]);data.Results.forEach(function(item){item.viewed=viewed.indexOf(item.hash)>-1;});done(data);return;}
                record.streamPane.dataset.cacheHit='false';
                return originalGet.call(this,query,function(data){if(!streamAlive(st))return;st.total=data.Results.length;st.partial=(data.parser_status||[]).some(function(s){return s.status!=='ready'&&s.status!=='empty'&&s.status!=='loading';});var serialized=JSON.stringify(data);if(!data.parser_pending&&!(data.parser_status||[]).some(function(s){return s.status!=='ready'&&s.status!=='empty';})&&serialized.length<2000000){streamCache=streamCache.filter(function(item){return item.key!==key;});streamCache.push({key:key,data:JSON.parse(serialized),expires:st.expires=Date.now()+(data.Results.length?300000:60000)});while(streamCache.length>4)streamCache.shift();}if(!record.streamView.isOpen()){st.deferred=function(){done(data);};return;}done(data);},function(error){if(!streamAlive(st))return;st.error=true;if(!record.streamView.isOpen()){st.deferred=function(){fail(error);};return;}fail(error);});
            };
            var parse=st.child.parse;st.child.parse=function(){if(!streamAlive(st))return;originalGet=Lampa.Parser.get;Lampa.Parser.get=getForChild;try{return parse.apply(st.child,arguments);}finally{Lampa.Parser.get=originalGet;}};st.child.initialize();streamSyncRows(st);
            if(st.loading)streamActivate(record);
        }catch(error){if(st.child&&typeof st.child.destroy==='function')closeStreamChild(record);else record.streamChild=null;streamStatus(record,'Вбудовані джерела недоступні. Спробуйте оновити джерела.');record.streamLoad.hidden=false;streamShellActivate(record);}
    }
    function removeStreams(record) {
        if(!record.streamPane)return;
        if(Lampa.Controller.enabled().name==='sh_movie_streams')streamInfo(record);
        closeStreamOverlay(record,false);closeStreamChild(record);
        record.streamPane.removeEventListener('hover:enter',record.streamEnter,true);record.streamPane.removeEventListener('click',record.streamClick);
        record.page.removeEventListener('hover:enter',record.streamEnter,true);record.streamPane.removeEventListener('hover:focus',record.streamPaneFocus,true);
        if(record.streamView){record.streamView.destroy();record.streamView=null;}else record.streamPane.remove();record.streamPane=null;
        if(record.streamHost){var host=record.streamHost;if(host.parentNode)host.parentNode.insertBefore(record.root,host);host.remove();record.streamHost=null;}record.page.classList.remove('sh-has-streams');
        if(record.activity.component.pause===record.streamPause)record.activity.component.pause=record.originalPause;
        if(record.streamInfoController&&record.streamInfoController.down===record.streamDown)record.streamInfoController.down=record.originalInfoDown;
    }
    function setupStreams(record) {
        if(record.streamPane||!Lampa.Storage.field('parser_use')||!window.lampa_settings.torrents_use)return;
        var action=record.root.querySelector('.view--torrent'),bar=record.root.querySelector('.full-start-new__buttons');
        // Core keeps optional actions in a hidden template pool. Buttons+ used to move it.
        // Move the existing node once, preserving every handler; restore it with the theme.
        if(action&&bar&&action.closest('.buttons--container.hide')){
            record.moves.push({node:action,parent:action.parentNode,next:action.nextSibling});bar.appendChild(action);
        }
        installStreamRoutes();
        var pane=document.createElement('section');pane.className='sh-streams';pane.setAttribute('aria-label','Торрентні джерела');pane.setAttribute('aria-busy','false');
        pane.innerHTML='<div class="sh-stream-head"><h2>Торренти</h2><div class="sh-stream-retry selector" role="button" title="Повторити пошук">Оновити</div><div class="sh-stream-close selector" role="button" aria-label="Закрити торренти">Закрити · Back</div></div><div class="sh-stream-status" role="status">Джерела завантажуються лише після відкриття</div><div class="sh-stream-load selector" role="button">Показати джерела</div><div class="sh-stream-content"></div>';
        record.streamPane=pane;record.streamContent=pane.querySelector('.sh-stream-content');record.streamStatus=pane.querySelector('.sh-stream-status');record.streamLoad=pane.querySelector('.sh-stream-load');var host=document.createElement('div');host.className='sh-movie-hero';record.root.parentNode.insertBefore(host,record.root);host.appendChild(record.root);host.appendChild(pane);record.streamHost=host;record.page.classList.add('sh-has-streams');
        var inline=Lampa.Storage.get('sh_torrent_mode','overlay')==='inline'||!window.LampaTorrentOverlay;
        record.streamView=window.LampaTorrentOverlay?LampaTorrentOverlay.create(pane,record.page,inline):{inline:true,isOpen:function(){return true;},open:function(){},close:function(){},destroy:function(){pane.remove();}};
        var movie=streamMovie(record);pane.querySelector('h2').textContent='Торренти · '+(movie.title||movie.name||'')+' '+String(movie.release_date||movie.first_air_date||'').slice(0,4);
        record.streamEnter=function(event){
            if(event.target.closest('.view--torrent')&&record.root.contains(event.target)){event.stopImmediatePropagation();loadStreams(record);}
            else if(event.target.closest('.sh-stream-close')){event.stopImmediatePropagation();closeStreamOverlay(record,true);}
            else if(event.target===record.streamLoad){event.stopImmediatePropagation();loadStreams(record);}
            else if(event.target.closest('.sh-stream-retry')){event.stopImmediatePropagation();var key=record.streamChild&&record.streamChild.key;streamCache=streamCache.filter(function(item){return item.key!==key;});closeStreamChild(record);loadStreams(record);}
        };
        record.page.addEventListener('hover:enter',record.streamEnter,true);
        if(!inline)pane.addEventListener('hover:enter',record.streamEnter,true);
        record.streamClick=function(event){var button=event.target.closest('.sh-stream-head .selector,.sh-stream-load');if(button)button.dispatchEvent(new Event('hover:enter',{bubbles:true}));};pane.addEventListener('click',record.streamClick);
        record.streamPaneFocus=function(event){if(record.streamChild){var node=event.target.closest('.selector');if(node)record.streamChild.last=node;}};record.streamPane.addEventListener('hover:focus',record.streamPaneFocus,true);
        record.originalPause=record.activity.component.pause;
        record.streamPause=function(){closeStreamOverlay(record,false);closeStreamChild(record);record.streamFocused=false;return record.originalPause&&record.originalPause.apply(this,arguments);};
        record.activity.component.pause=record.streamPause;
        onStreamController({name:Lampa.Controller.enabled().name});
    }
    function onStreamController(event) {
        if(!event||!['full_start','content'].includes(event.name))return;
        var record=movieRecords.filter(function(r){return r.page.classList.contains('activity--active')&&r.streamPane;})[0];if(!record)return;
        // Native player/Files return may activate the underlying detail controller.
        // A visible overlay must retain remote ownership; leave inner menus/player alone.
        var st=record.streamChild;
        if(st&&st.wantFocus&&record.streamView&&!record.streamView.inline&&record.streamView.isOpen()&&streamAlive(st)){
            streamActivate(record);return;
        }
        if(event.name!=='full_start')return;
        var controller=Lampa.Controller.enabled().controller;
        bindRatingNavigation(record,controller);
        if(controller.down===record.streamDown)return;
        record.streamInfoController=controller;record.originalInfoDown=controller.down;
        // Preserve native Down to cast/recommendations; sources open through the real torrent action.
        record.streamDown=controller.down;
    }
    function onStreamProfile(){streamGeneration++;streamCache=[];movieRecords.forEach(function(record){closeStreamOverlay(record,false);closeStreamChild(record);});}
    function onStreamSettings(event) {
        if(event&&/^(account|account_user|account_email|sh_torrent_mode)$/.test(event.name)){onStreamProfile();if(event.name==='sh_torrent_mode'){movieRecords.forEach(removeStreams);scheduleMovie();}return;}
        if(event&&/^(jackett_|prowlarr_|parser_|parse_)/.test(event.name)){if(movieRecords.some(function(r){return r.streamChild&&r.streamChild.providerChanging;}))return;streamGeneration++;streamCache=[];movieRecords.forEach(function(r){closeStreamOverlay(r,false);closeStreamChild(r);});}
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
        movieRecords.forEach(closeStreamChild);
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
        if (!watching) { Lampa.Listener.follow('activity', onActivity); Lampa.Listener.follow('full',onMovieFull); Lampa.Controller.listener.follow('toggle',onStreamController); Lampa.Modal.listener.follow('fullshow',onStreamFiles); Lampa.Modal.listener.follow('update',onStreamFiles); Lampa.Modal.listener.follow('close',clearStreamFiles); Lampa.Listener.follow('torrent_file',onStreamFile); if(Lampa.PlayerVideo&&Lampa.PlayerVideo.listener)Lampa.PlayerVideo.listener.follow('error',onStreamPlaybackError); Lampa.Select.listener.follow('fullshow',onStreamSelect); Lampa.Select.listener.follow('hide',clearStreamSelect); Lampa.Storage.listener.follow('change',onStreamSettings); if(Lampa.Account&&Lampa.Account.listener)Lampa.Account.listener.follow('profile_select',onStreamProfile); Lampa.Search.listener.follow('close', onSearchClose); Lampa.Search.listener.follow('sources',onSearchSources); Lampa.Settings.listener.follow('open',onSettingsOpen); Lampa.Settings.listener.follow('close',onSettingsClose); document.addEventListener('error',onRatingError,true); document.addEventListener('traktplus:watched',onCastWatched); document.addEventListener('keydown',onSettingsKey,true); document.addEventListener('keyup',onSettingsKey,true); installSettingsController(); watching=true; installBackdropPacing(); }
        ensureTorrentOverlay();setupHeader(); scheduleMovie();setupHome();
        if(document.body.classList.contains('settings--open')) onSettingsOpen({name:'resume'});
    }
    function removeUI() {
        removeBackdropPacing();
        removeStreamRoutes();
        if (watching) { Lampa.Listener.remove('activity', onActivity); Lampa.Listener.remove('full',onMovieFull); Lampa.Controller.listener.remove('toggle',onStreamController); Lampa.Modal.listener.remove('fullshow',onStreamFiles); Lampa.Modal.listener.remove('update',onStreamFiles); Lampa.Modal.listener.remove('close',clearStreamFiles); Lampa.Listener.remove('torrent_file',onStreamFile); if(Lampa.PlayerVideo&&Lampa.PlayerVideo.listener)Lampa.PlayerVideo.listener.remove('error',onStreamPlaybackError); clearStreamFiles(); Lampa.Select.listener.remove('fullshow',onStreamSelect); Lampa.Select.listener.remove('hide',clearStreamSelect); Lampa.Storage.listener.remove('change',onStreamSettings); if(Lampa.Account&&Lampa.Account.listener)Lampa.Account.listener.remove('profile_select',onStreamProfile); streamCache=[]; brandPending={}; Lampa.Search.listener.remove('close', onSearchClose); Lampa.Search.listener.remove('sources',onSearchSources); Lampa.Settings.listener.remove('open',onSettingsOpen); Lampa.Settings.listener.remove('close',onSettingsClose); document.removeEventListener('error',onRatingError,true); document.removeEventListener('traktplus:watched',onCastWatched); document.removeEventListener('keydown',onSettingsKey,true); document.removeEventListener('keyup',onSettingsKey,true); settingsLeftConsumed=false; watching=false; }
        homePolicies.slice().forEach(function(r){releaseHome(r,false);});
        removeSettingsUI();
        removeMovies();clearStreamSelect();
        clearSearchSources();
        searchReturn=false;document.querySelectorAll('.sh-profile-menu').forEach(function(n){n.classList.remove('sh-profile-menu');});
        if (searchNode) { $(searchNode).off('hover:enter.shHybrid', onSearchEnter); searchNode=null; }
        if (menuOpen) { menuOpen=false; Lampa.Select.close(); }
        if(headTimeMove){var t=headTimeMove;headTimeMove=null;t.parent.insertBefore(t.node,t.next&&t.next.parentNode===t.parent?t.next:null);}
        if (moreButton) { $(moreButton).off('hover:enter', openActions).remove(); moreButton=null; }
        document.querySelectorAll('.sh-head-secondary').forEach(function (node) { node.classList.remove('sh-head-secondary'); });
        document.body.removeAttribute('data-sh-page');document.body.classList.remove('sh-movie-active');
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
    // One static shell owner; native functional adapters still wait for appready.
    function applyShell(on) {
        if (destroyed || !document.body) return;
        if (on && !style) {
            style=document.getElementById('stremio-hybrid-style');
            if(!style){style=document.createElement('style');style.id='stremio-hybrid-style';style.textContent=css;style.setAttribute('data-ui-version',UI_VERSION);document.head.appendChild(style);bootStats.styleInsertions++;}
        }
        if(document.body.classList.contains('stremio-hybrid')!==on)bootStats.shellTransitions++;
        document.body.classList.toggle('stremio-hybrid', on);
        if(on){
            if(bootStats.shellAppliedMs===null)bootStats.shellAppliedMs=uiNow();
            if(bootStats.firstShellFrameMs===null && !shellFrame && typeof requestAnimationFrame==='function')shellFrame=requestAnimationFrame(function(){shellFrame=0;if(!destroyed && document.body.classList.contains('stremio-hybrid'))bootStats.firstShellFrameMs=uiNow();});
        }else if(shellFrame){cancelAnimationFrame(shellFrame);shellFrame=0;}
        if (!on && style) { style.remove(); style = null; }
        syncHeaderPresentation();
    }
    function syncHeaderPresentation() {
        var api=window.InterfacePlusPresentation;
        if(api && api.contractVersion===1 && typeof api.syncHeader==='function'){
            try{api.syncHeader();}catch(e){bootStats.presentationFailures=(bootStats.presentationFailures||0)+1;}
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
        document.removeEventListener('DOMContentLoaded', onDOM);
        if (waiting && window.Lampa && Lampa.Listener) Lampa.Listener.remove('app', onApp);
        waiting = false;
    }
    function onApp(event) { if (event && event.type === 'ready') init(); }
    function onDOM() {
        prepareShell();
        if (window.appready) init();
        else if (!waiting && window.Lampa && Lampa.Listener) {
            Lampa.Listener.follow('app', onApp);
            waiting = true;
        }
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
        if(!params.some(function(item){return item.param&&item.param.name==='sh_torrent_mode';}))Lampa.SettingsApi.addParam({component:'interface',param:{name:'sh_torrent_mode',type:'select',values:{overlay:'Вікно',inline:'Вбудована панель'},default:'overlay'},field:{name:'Торренти · вигляд',description:'Вікно відкривається кнопкою Торренти. Обидва режими використовують той самий пошук і плеєр.'}});
        if(!params.some(function(item){return item.param&&item.param.name==='stremio_hybrid_primary_settings';}))Lampa.SettingsApi.addParam({component:'interface',param:{name:'stremio_hybrid_primary_settings',type:'trigger',values:true,default:false},field:{name:'Центр налаштувань як головний',description:'Опційно відкривати Центр налаштувань замість головної сторінки Lampa. Стандартні налаштування залишаються доступними в Центрі.'}});
        apply(enabled());
    }
    window.StremioHybrid = {
        version: UI_VERSION,
        settingsHubVersion: 1,
        presentationVersion: 1,
        ownsPresentation: function (region) { return region==='header' && !destroyed && !!style && !!document.body && document.body.classList.contains('stremio-hybrid'); },
        openUtilities: openHeaderUtilities,
        setEnabled: setEnabled,
        refresh: function () { if (ready) apply(enabled()); },
        diagnostics: function () {return {version:UI_VERSION,scriptStartMs:bootStats.scriptStartMs,shellAppliedMs:bootStats.shellAppliedMs,firstShellFrameMs:bootStats.firstShellFrameMs,readyMs:bootStats.readyMs,initCount:bootStats.initCount,styleInsertions:bootStats.styleInsertions,shellTransitions:bootStats.shellTransitions,settingsLoads:bootStats.settingsLoads,settingsMounts:bootStats.settingsMounts,settingsUnmounts:bootStats.settingsUnmounts,settingsFailures:bootStats.settingsFailures,presentationFailures:bootStats.presentationFailures||0};},
        destroy: function () {
            apply(false);
            removeHeaderUtilitiesSetting();
            backdropResume=null;movieBrands=[];movieEnglish=[];paletteCache=[];
            destroyed = true;
            stopWaiting();
            if(settingsScript){settingsScript.onload=null;settingsScript.onerror=null;if(settingsLoading)settingsScript.remove();settingsScript=null;}
            delete window.StremioHybrid;
        }
    };
    prepareShell();
    if (window.appready) init();
    else {
        onDOM();
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onDOM);
    }
})();
