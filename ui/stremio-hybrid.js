/* Stremio × Lampa. Presentation only: retains cards, metadata and controllers. */
(function () {
    'use strict';
    if (window.StremioHybrid) return;
    var style, ready = false, destroyed = false, waiting = false, watching = false, moreButton = null, menuOpen = false, searchNode = null, searchReturn = false, settingsRail = null, settingsFrame = 0, settingsParameter = null, settingsCategory = 'interface', settingsLeftConsumed = false, searchSources = null, searchRoots = [];
    var css = `
body.stremio-hybrid { --sh-bg:#121023; --sh-panel:#211d35; --sh-accent:#9775fa; --sh-muted:#aba7bd; --sh-rail:#0c0b16; --sh-text:#f0eef8; --sh-border:#ffffff16; --sh-radius:.7em; --sh-pill:2em; --sh-gap:1.1em; --sh-speed:160ms; --sh-ring:#9775fa66; --sh-focus:#7960c9; --sh-focus-soft:#3e315b; --sh-header:#151127; --sh-panel-raised:#29233e; --sh-accent-soft:#b79bff; --sh-focus-text:#e9e0ff; --sh-focus-ink:#201536; --sh-inactive:#726d86; --sh-secondary:#d0cadf; --sh-inset:1.8em; --sh-ease:ease-out; background:#121023 !important; color:#f0eef8; }
body.stremio-hybrid .background { opacity:.12 !important; }
body.stremio-hybrid .head { background:var(--sh-header) !important; border-bottom:1px solid #ffffff09; }
body.stremio-hybrid .head__body { padding-left:1.8em; padding-right:var(--sh-inset); }
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
body.stremio-hybrid .items-line:not(.vinyl-line) .scroll__body { gap:var(--sh-gap); }
body.stremio-hybrid .card { transition:transform var(--sh-speed) var(--sh-ease) !important; backface-visibility:visible !important; transform:none; }
body.stremio-hybrid .ydesign-card, body.stremio-hybrid .ydesign-card.focus { animation:none !important; }
body.stremio-hybrid .card.focus { transform:scale(1.035) !important; z-index:20; }
body.stremio-hybrid .card .card__view { border-radius:var(--sh-radius) !important; transition:none !important; }
body.stremio-hybrid .card.focus .card__view { box-shadow:0 0 0 .14em var(--sh-text),0 0 0 .27em var(--sh-ring) !important; }
body.stremio-hybrid .ydesign-card.focus::after, body.stremio-hybrid .ydesign-card .ydesign-content-layer::after { display:none !important; }
body.stremio-hybrid .ydesign-card .card__view::before { animation:none !important; }
body.stremio-hybrid .ydesign-badge, body.stremio-hybrid .ydesign-genre-badge, body.stremio-hybrid .ydesign-rating, body.stremio-hybrid .ydesign-series-pill, body.stremio-hybrid .ydesign-card-notch { backdrop-filter:none !important; -webkit-backdrop-filter:none !important; }
body.stremio-hybrid .ydesign-content-layer, body.stremio-hybrid .ydesign-desc-under { transition:opacity var(--sh-speed) var(--sh-ease) !important; }
body.stremio-hybrid .selectbox__content, body.stremio-hybrid .settings__content, body.stremio-hybrid .modal__content { background:var(--sh-panel) !important; border-radius:1em; backdrop-filter:none !important; -webkit-backdrop-filter:none !important; }
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
body.stremio-hybrid .full-start__background { opacity:.48 !important; filter:none !important; }
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
 body.stremio-hybrid .wrap__content { flex:1; min-width:0; width:calc(100% - 4.4em) !important; }
 body.stremio-hybrid .activity { width:100% !important; }
 body.stremio-hybrid .wrap__left.wrap__left--hidden { margin-left:0 !important; width:4.4em !important; min-width:4.4em; }
 body.stremio-hybrid .wrap__left--hidden .menu { width:4.4em !important; }
 body.stremio-hybrid .wrap__left--hidden .menu__item { padding:.8em; justify-content:center; }
 body.stremio-hybrid .wrap__left--hidden .menu__ico { margin:0; }
 body.stremio-hybrid .wrap__left--hidden .menu__text { display:none; }
 body.stremio-hybrid .wrap__left--hidden .menu__version { font-size:.45em; }
 body.stremio-hybrid .items-line:not(.vinyl-line) .card.ydesign-vertical { width:13.2vw !important; }
 body.stremio-hybrid .items-line:not(.vinyl-line) .card.ydesign-horizontal { width:27vw !important; }
 body.stremio-hybrid .mapping--grid .card.ydesign-vertical { width:calc(100% / 6) !important; }
}
@media(max-width:768px) {
 body.stremio-hybrid .cardify .full-start-new__left { display:none !important; }
 body.stremio-hybrid .cardify .cardify__left { max-width:100%; }
 body.stremio-hybrid .cardify__left { max-width:100%; padding-right:0; }
 body.stremio-hybrid .custom-ghost-main { position:relative !important; width:100% !important; margin-top:1em; }
 body.stremio-hybrid .full-start-new__title { font-size:1.8em !important; }
}
@media(prefers-reduced-motion:reduce) {
 body.stremio-hybrid .card, body.stremio-hybrid .ydesign-content-layer, body.stremio-hybrid .ydesign-desc-under { transition:none !important; }
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
body.stremio-hybrid .sh-movie-native::before { content:''; position:fixed; inset:0; pointer-events:none; z-index:-1; background:linear-gradient(90deg,rgba(8,9,17,.92),rgba(8,9,17,.72) 37%,rgba(8,9,17,.12) 76%),linear-gradient(0deg,#0c0c16,transparent 34%); }
body.stremio-hybrid .sh-movie .full-start-new__tagline { order:1; font-size:.9em !important; color:var(--sm-muted); margin:0 0 .8em; }
body.stremio-hybrid .sh-movie .full-start-new__rate-line { order:2; margin:0 0 .8em !important; gap:.8em; }
body.stremio-hybrid .sh-movie .full-start-new__details { order:3; }
/* Movie-only Cardify adapter: backdrop + one information column, no right description card. */
body.stremio-hybrid .activity.sh-movie-page { --sm-bg:#0c0c16; --sm-text:#f4f4f7; --sm-muted:#b8b8c6; }
body.stremio-hybrid .sh-movie-page .full-start__background { opacity:.78 !important; mask-image:none !important; -webkit-mask-image:none !important; filter:none !important; }
body.stremio-hybrid .sh-movie-page .cardify-effects-overlay { background:linear-gradient(90deg,rgba(8,9,17,.92) 0%,rgba(8,9,17,.72) 37%,rgba(8,9,17,.12) 76%),linear-gradient(0deg,#0c0c16 0%,transparent 34%) !important; }
body.stremio-hybrid .sh-movie-page .cardify-effects-overlay.cardify-scrolled { background-color:rgba(8,9,17,.7) !important; }
body.stremio-hybrid .sh-movie { transition:none !important; color:var(--sm-text); }
body.stremio-hybrid .sh-movie .full-start-new__body { display:block !important; min-height:calc(100vh - 5em); height:auto !important; padding:1.8em .6em 2.8em !important; }
body.stremio-hybrid .sh-movie .full-start-new__left { display:none !important; }
body.stremio-hybrid .sh-movie .full-start-new__right { display:block !important; width:100%; }
body.stremio-hybrid .sh-movie .sh-movie-column { display:flex !important; flex-direction:column; align-items:flex-start; width:65%; max-width:65% !important; padding:0; }
body.stremio-hybrid .sh-movie .full-start-new__title { order:0; font-size:3.05em !important; line-height:1.12 !important; font-weight:500; letter-spacing:.015em; max-width:100%; margin:0 0 .5em !important; text-shadow:none; }
body.stremio-hybrid .sh-movie .full-start-new__head { order:1; font-size:.9em; color:var(--sm-muted); margin:0 0 .7em; line-height:1.5; text-shadow:none; }
body.stremio-hybrid .sh-movie .ifx-original-title { display:inline; border:0; padding:0; margin-left:1em; color:var(--sm-muted); font-size:1em; font-weight:400; text-shadow:none; }
body.stremio-hybrid .sh-movie .omdb-mdb-yarik-rate, body.stremio-hybrid .sh-movie .rate-fix { order:2; display:flex; flex-wrap:wrap; gap:.9em !important; margin:0 0 1em !important; align-items:center; }
body.stremio-hybrid .sh-movie .full-start__rate { font-size:.95em !important; background:transparent !important; padding:0 !important; border:0; border-radius:0; min-height:0; gap:.35em; margin:0 !important; color:var(--sm-text) !important; }
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
body.stremio-hybrid .sh-streams { position:fixed; top:6em; bottom:1.8em; right:1.8em; width:30vw; z-index:2; display:flex; flex-direction:column; min-height:0; padding:1em; border-radius:.7em; background:rgba(12,12,22,.93); border:1px solid #ffffff10; color:#efeff5; }
body.stremio-hybrid .sh-stream-head { display:flex; align-items:center; justify-content:space-between; gap:1em; }
body.stremio-hybrid .sh-stream-head h2 { font-size:1.1em; font-weight:500; margin:0; }
body.stremio-hybrid .sh-stream-advanced { padding:.1em .6em; border-radius:.4em; }
body.stremio-hybrid .sh-stream-status { font-size:.7em; color:#aaa7b9; margin:.8em 0; }
body.stremio-hybrid .sh-stream-load,body.stremio-hybrid .sh-stream-details { padding:.8em; font-size:.8em; background:#ffffff08; border-radius:.5em; }
body.stremio-hybrid .sh-stream-details { margin-top:.7em; flex-shrink:0; }
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
body.stremio-hybrid .sh-streams .torrent-item__ffprobe > div { margin:.15em .25em .15em 0; font-size:.85em; background:#ffffff0b; }
body.stremio-hybrid .sh-streams .watched-history { font-size:.7em; }
body.stremio-hybrid .sh-streams .empty { width:100%; font-size:.75em; padding:1em 0; }
body.stremio-hybrid .sh-streams .focus { background:#ffffff12; border-color:#baa6f1; box-shadow:inset .15em 0 #9775fa; }
body.stremio-hybrid .sh-streams .filter__item { min-width:0; }
body.stremio-hybrid .sh-streams .explorer__files-head { margin:0 0 .5em !important; padding:0 !important; }
body.stremio-hybrid .sh-streams .explorer__files-body .scroll__body,body.stremio-hybrid .sh-streams .scroll__content { padding:0 !important; }
body.stremio-hybrid .sh-streams .torrent-item { display:grid; grid-template-columns:3.7em minmax(0,1fr); gap:.45em .6em; padding:.7em !important; border:1px solid transparent !important; box-shadow:none !important; animation:none !important; transform:none !important; }
body.stremio-hybrid .sh-streams .torrent-item__title { grid-column:2; grid-row:1; }
body.stremio-hybrid .sh-streams .torrent-item__ffprobe { grid-column:1; grid-row:1 / 3; display:flex; flex-direction:column; align-items:flex-start; align-content:flex-start; gap:.2em; margin:0 !important; }
body.stremio-hybrid .sh-streams .torrent-item__details { grid-column:2; grid-row:2; display:flex !important; flex-wrap:wrap; justify-content:flex-start; gap:.25em .7em; margin:0 !important; }
body.stremio-hybrid .sh-streams .torrent-item__details > * { width:auto !important; margin:0 !important; padding:0 !important; font-size:inherit !important; }
body.stremio-hybrid .sh-streams .torrent-item__details span,body.stremio-hybrid .sh-streams .torrent-item__size { box-shadow:none !important; background:transparent !important; border:0 !important; padding:0 !important; color:inherit !important; }
body.stremio-hybrid .sh-streams .torrent-item.focus { background:#ffffff12 !important; border-color:#bca8f0 !important; box-shadow:inset .15em 0 #9775fa !important; }
body.stremio-hybrid .sh-streams .sh-empty-history { display:none; }
`;
    // Cardify owns the native template/data. Move nodes with their handlers, never clone them.
    var movieRecords=[], movieFrame=0, movieTimers=[], movieModal=null;
    function restoreMovie(record) {
        removeStreams(record);
        if(record.buttons){record.buttons.removeEventListener('hover:focus',movieButtonFocus,true);record.buttons.removeAttribute('data-sh-action');}
        record.moves.slice().reverse().forEach(function(move){
            if(move.parent) move.parent.insertBefore(move.node,move.next && move.next.parentNode===move.parent ? move.next : null);
        });
        record.column.classList.remove('sh-movie-column');record.root.classList.remove('sh-movie','sh-movie-native'); record.page.classList.remove('sh-movie-page');
        if(record.description){record.description.removeEventListener('hover:enter',movieDescriptionEnter,true);record.description.classList.remove('sh-movie-description');}
        if(movieModal===record.root){movieModal=null;Lampa.Modal.close();if(Lampa.Activity.active() && Lampa.Activity.active().activity===record.activity)Lampa.Controller.toggle('full_start');}
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
    function movieDescriptionEnter(event) {
        var root=event.currentTarget.closest('.sh-movie');if(!root)return;
        var text=root.querySelector('.full-descr__text');if(!text)return;
        movieModal=root;
        Lampa.Modal.open({title:root.querySelector('.full-start-new__title').textContent,html:$('<div></div>').text(text.textContent.trim()).css({lineHeight:'1.65',whiteSpace:'pre-line'}),onBack:function(){
            movieModal=null;Lampa.Modal.close();
            if(root.isConnected && root.closest('.activity--active')){Lampa.Controller.toggle('full_start');Lampa.Controller.collectionFocus(text,root);}
            else Lampa.Controller.toggle('content');
        }});
    }
    function movieButtonFocus(event) {
        var row=event.currentTarget, button=event.target.closest('.full-start__button');
        if(button && row.contains(button)) {
            row.setAttribute('data-sh-action',button.classList.contains('sh-movie-primary')?'':button.getAttribute('title') || button.textContent.trim());
            var box=button.getBoundingClientRect(), bounds=row.getBoundingClientRect();
            if(box.right>bounds.right)row.scrollLeft+=box.right-bounds.right+8;
            else if(box.left<bounds.left)row.scrollLeft-=bounds.left-box.left+8;
        }
    }
    function adaptMovie() {
        if(!watching)return;
        var active=Lampa.Activity.active();
        if(!active || active.component!=='full' || active.method!=='movie' || !active.activity)return;
        var page=active.activity.render()[0], root=page.querySelector('.full-start-new');
        if(!root)return;
        var left=root.querySelector('.cardify__left') || root.querySelector('.full-start-new__right'), buttons=root.querySelector('.full-start-new__buttons');
        if(!left || !buttons)return;
        var record=movieRecords.filter(function(r){return r.root===root;})[0];
        if(!record){record={root:root,page:page,column:left,activity:active.activity,moves:[],labels:[]};movieRecords.push(record);}
        function move(node){if(node && node.parentNode!==left){record.moves.push({node:node,parent:node.parentNode,next:node.nextSibling});left.insertBefore(node,buttons);}}
        setupStreams(record);
        root.classList.add('sh-movie');root.classList.toggle('sh-movie-native',!page.querySelector('.cardify-effects-overlay')); page.classList.add('sh-movie-page');left.classList.add('sh-movie-column');
        var description=root.querySelector('.custom-ghost-main') || page.querySelector('.full-descr__text');
        if(description){move(description);record.description=description;description.classList.add('sh-movie-description');description.addEventListener('hover:enter',movieDescriptionEnter,true);}
        move(root.querySelector('.cardify__right-box'));
        root.querySelectorAll('.sh-movie-primary').forEach(function(n){n.classList.remove('sh-movie-primary');});
        var visible=Array.prototype.filter.call(buttons.querySelectorAll('.full-start__button'),function(n){return !n.classList.contains('hide')&&!n.classList.contains('hidden')&&getComputedStyle(n).display!=='none';});
        if(visible[0])visible[0].classList.add('sh-movie-primary');
        visible.forEach(function(node){
            if(!node.hasAttribute('title')){var title=node.textContent.trim() || (node.classList.contains('button--edit-order')?'Порядок дій':'Дія плагіна');node.setAttribute('title',title);record.labels.push({node:node,title:title});}
        });
        if(record.buttons && record.buttons!==buttons)record.buttons.removeEventListener('hover:focus',movieButtonFocus,true);
        record.buttons=buttons;buttons.addEventListener('hover:focus',movieButtonFocus,true);
        movieButtonFocus({currentTarget:buttons,target:buttons.querySelector('.focus')||visible[0]||buttons});
        // Interface+ can replace a button after core FullStart cached it as last focus.
        var controller=Lampa.Controller.enabled(), link=controller.controller && controller.controller.link;
        if(controller.name==='full_start' && link && visible[0] && (!root.querySelector('.selector.focus') || (link.last && !root.contains(link.last)))) {
            link.last=visible[0];Lampa.Controller.collectionSet(root);Lampa.Controller.collectionFocus(visible[0],root);
        }
    }
    function scheduleMovie() {
        stopMovieQueue();var active=Lampa.Activity.active();if(!active || active.component!=='full'||active.method!=='movie')return;
        movieFrame=requestAnimationFrame(function(){movieFrame=0;adaptMovie();});
        // Interface+ inserts/reorders metadata and buttons asynchronously after full/complite.
        // Two bounded passes accommodate that work; no observer or recurring polling.
        [180,650].forEach(function(delay){movieTimers.push(setTimeout(adaptMovie,delay));});
    }
    function onMovieFull(event) { if(event && (event.type==='complite'||event.type==='archive'))scheduleMovie(); }

    // Native torrent Component hosted inside Full. Parser, rows, filters and playback stay native.
    var streamCache=[], streamGeneration=0;
    function streamMovie(record) {
        var movie=record.activity.component.props && record.activity.component.props.get('movie');
        return movie || Lampa.Activity.active().card;
    }
    function streamParams(record) {
        var movie=JSON.parse(JSON.stringify(streamMovie(record))),year=String(movie.release_date||'0000').slice(0,4), df=movie.original_title||movie.title,lg=movie.title||df;
        var names={df:df,df_year:df+' '+year,df_lg:df+' '+lg,df_lg_year:df+' '+lg+' '+year,lg:lg,lg_year:lg+' '+year,lg_df:lg+' '+df,lg_df_year:lg+' '+df+' '+year};
        return {component:'torrents',url:'',title:Lampa.Lang.translate('title_torrents'),search:names[Lampa.Storage.field('parse_lang')]||df,search_one:lg,search_two:df,movie:movie,page:1};
    }
    function streamStatus(record,text) {if(record.streamStatus)record.streamStatus.textContent=text;}
    function streamInfo(record) {
        record.streamFocused=false;
        if(record.streamChild)record.streamChild.wantFocus=false;
        Lampa.Controller.toggle('full_start');
        var button=record.root.querySelector('.view--torrent:not(.hide)')||record.root.querySelector('.sh-movie-primary');
        if(button)Lampa.Controller.collectionFocus(button,record.root);
    }
    function streamFallback(record) {var params=streamParams(record);Lampa.Activity.push(params);}
    function streamWindow(st,start) {
        var row=st.root.querySelector('.torrent-list');if(!row)return;
        st.windowStart=Math.max(0,start);st.windowing=true;
        st.rows.forEach(function(node,i){if(i<st.windowStart||i>=st.windowStart+40)$(node).detach();else row.appendChild(node);});
        st.windowing=false;
    }
    function streamSyncRows(st) {
        st.root.querySelectorAll('.torrent-item').forEach(function(row){if(st.rows.indexOf(row)<0)st.rows.push(row);});
        if(st.rows.length>40)streamWindow(st,st.windowStart);
    }
    function streamFocus(st,node) {
        if(st.dead||!st.wantFocus)return;
        Lampa.Controller.collectionSet(st.record.streamPane,false,true);
        var target=node&&node.isConnected&&node.offsetParent!==null?node:st.last&&st.last.isConnected&&st.last.offsetParent!==null?st.last:st.root.querySelector('.torrent-item')||st.root.querySelector('.selector:not(.hide)');
        if(target)Lampa.Controller.collectionFocus(target,st.root);
    }
    function streamMove(record,direction) {
        var st=record.streamChild;if(!st)return;if(st.loading)st.navigatedWhileLoading=true;
        var index=st.rows.indexOf(st.last),filters=Array.prototype.filter.call(st.root.querySelectorAll('.torrent-filter .selector'),function(n){return n.offsetParent!==null;}),headers=Array.prototype.slice.call(record.streamPane.querySelectorAll('.sh-stream-head .selector')),footer=record.streamPane.querySelector('.sh-stream-details');
        if(index>=0){
            if(direction==='left'){streamInfo(record);return;}
            if(direction==='right'){streamFocus(st,filters[0]||headers[0]);return;}
            if(direction==='down'&&index+1>=st.rows.length)st.child.next();
            var next=index+(direction==='down'?1:-1);
            if(next<0){streamFocus(st,filters[filters.length-1]||headers[headers.length-1]);return;}
            if(!st.rows[next]){streamFocus(st,footer);return;}
            if(next<st.windowStart)streamWindow(st,Math.max(0,st.windowStart-20));
            if(next>=st.windowStart+40)streamWindow(st,st.windowStart+20);
            streamFocus(st,st.rows[next]);return;
        }
        if(st.last===footer){if(direction==='up')streamFocus(st,st.rows[Math.min(st.rows.length-1,st.windowStart+39)]||filters[0]||headers[0]);else if(direction==='left')streamInfo(record);return;}
        var group=headers.indexOf(st.last)>=0?headers:filters,at=group.indexOf(st.last);
        if(direction==='left'){if(at>0)streamFocus(st,group[at-1]);else streamInfo(record);}
        else if(direction==='right')streamFocus(st,group[at+1]||filters[0]||st.rows[0]||footer);
        else if(direction==='down')streamFocus(st,group===headers&&filters.length?filters[0]:st.rows[st.windowStart]||footer);
        else if(group===headers)streamInfo(record);else streamFocus(st,headers[headers.length-1]);
    }
    function streamActivate(record) {
        var st=record.streamChild;if(!st||st.dead)return;
        st.wantFocus=true;record.streamFocused=true;
        var history=st.root.querySelector('.watched-history'),historyBody=history&&history.querySelector('.watched-history__body');if(historyBody)history.classList.toggle('sh-empty-history',historyBody.textContent.trim()===Lampa.Lang.translate('no_watch_history'));
        // Empty.start otherwise replaces start with a page-wide empty controller.
        st.child.start=function(){streamActivate(record);};
        Lampa.Controller.add('sh_movie_streams',{
            toggle:function(){streamFocus(st);},
            up:function(){streamMove(record,'up');},down:function(){streamMove(record,'down');},left:function(){streamMove(record,'left');},right:function(){streamMove(record,'right');},back:function(){streamInfo(record);}
        });
        Lampa.Controller.toggle('sh_movie_streams');
    }
    function closeStreamChild(record) {
        var st=record.streamChild;if(!st)return;
        st.dead=true;record.streamChild=null;
        st.root.removeEventListener('hover:focus',st.onFocus,true);st.root.removeEventListener('hover:enter',st.onEnter,true);
        Lampa.Torrent.back(null);if(st.started)Lampa.Torrent.opened(null);
        st.child.destroy();st.rows.forEach(function(row){$(row).remove();});st.rows=[];
        record.streamContent.textContent='';record.streamPane.setAttribute('aria-busy','false');record.streamPane.removeAttribute('data-cache-hit');streamStatus(record,'Джерела завантажуються лише після відкриття');record.streamLoad.hidden=false;
        Lampa.Controller.add('sh_movie_streams',{toggle:function(){Lampa.Controller.toggle('content');},back:function(){Lampa.Controller.toggle('content');}});
    }
    function loadStreams(record) {
        if(record.streamChild){streamActivate(record);return;}
        if(typeof Lampa.Component.get('torrents')!=='function'){streamFallback(record);return;}
        var params=streamParams(record), st={record:record,params:params,rows:[],windowStart:0,dead:false,wantFocus:true,loading:true};
        record.streamChild=st;record.streamFocused=true;record.streamLoad.hidden=true;streamStatus(record,'Пошук джерел…');
        var key=[params.movie.id,params.movie.source||'tmdb',params.search,Lampa.Storage.field('parser_torrent_type'),streamGeneration].join('|');st.key=key;
        try {
            st.child=Lampa.Component.create(params);st.root=st.child.render()[0];st.root.classList.add('sh-stream-explorer');record.streamContent.appendChild(st.root);
            st.child.activity={loader:function(on){if(st.dead)return;st.loading=on;record.streamPane.setAttribute('aria-busy',on?'true':'false');streamStatus(record,on?'Пошук джерел…':st.error?'Парсер недоступний':st.total===0?'Джерел не знайдено':st.total!=null?'Знайдено: '+st.total:'Джерела');if(!on){streamSyncRows(st);if(!st.loadedOnce){st.loadedOnce=true;if(!st.navigatedWhileLoading)st.last=st.root.querySelector('.torrent-item')||st.last;}st.child.start=function(){streamActivate(record);};}},toggle:function(){if(!st.dead&&st.wantFocus)streamActivate(record);},render:function(){return $(st.root);}};
            st.child.start=function(){streamActivate(record);};st.child.back=function(){streamInfo(record);};
            var append=st.child.append,reset=st.child.reset,next=st.child.next,applyFilter=st.child.applyFilter;
            st.child.applyFilter=function(){params.page=1;return applyFilter.apply(st.child,arguments);};
            st.child.append=function(){append.apply(st.child,arguments);streamSyncRows(st);};
            st.child.reset=function(){st.rows.forEach(function(row){$(row).remove();});st.rows=[];st.windowStart=0;return reset.apply(st.child,arguments);};
            st.child.next=function(){if(st.dead||st.windowing||!st.wantFocus)return;var focused=st.last;next.apply(st.child,arguments);if(st.rows.length>st.windowStart+40){streamWindow(st,st.windowStart+20);if(focused&&focused.isConnected)streamFocus(st,focused);}};
            st.onFocus=function(event){var node=event.target.closest('.selector');if(node&&st.root.contains(node))st.last=node;};
            st.onEnter=function(event){if(event.target.closest('.torrent-item'))st.started=true;if(event.target.closest('.filter--back')){event.stopImmediatePropagation();streamInfo(record);}else if(event.target.closest('.filter--search,.empty__footer')){event.stopImmediatePropagation();streamFallback(record);}};
            st.root.addEventListener('hover:focus',st.onFocus,true);st.root.addEventListener('hover:enter',st.onEnter,true);
            var originalGet=Lampa.Parser.get;
            // Scope this wrapper to initialize's synchronous Parser.get dispatch, not to global navigation.
            Lampa.Parser.get=function(query,done,fail){
                if(query!==params)return originalGet.apply(this,arguments);
                streamCache=streamCache.filter(function(item){return item.expires>Date.now();});var cached=streamCache.filter(function(item){return item.key===key;})[0];
                if(cached){record.streamPane.dataset.cacheHit='true';st.total=cached.data.Results.length;var data=JSON.parse(JSON.stringify(cached.data)),viewed=Lampa.Storage.cache('torrents_view',5000,[]);data.Results.forEach(function(item){item.viewed=viewed.indexOf(item.hash)>-1;});done(data);return;}
                record.streamPane.dataset.cacheHit='false';
                return originalGet.call(this,query,function(data){if(st.dead)return;st.total=data.Results.length;var serialized=JSON.stringify(data);if(serialized.length<2000000){streamCache=streamCache.filter(function(item){return item.key!==key;});streamCache.push({key:key,data:JSON.parse(serialized),expires:Date.now()+(data.Results.length?300000:60000)});while(streamCache.length>4)streamCache.shift();}done(data);},function(error){if(st.dead)return;st.error=true;fail(error);});
            };
            try{st.child.initialize();}finally{Lampa.Parser.get=originalGet;}
            if(st.loading)streamActivate(record);
            Lampa.Torrent.back(function(){if(!st.dead&&record.streamChild===st)streamActivate(record);else if(Lampa.Activity.active()?.component==='full')streamInfo(record);});
        }catch(error){if(st.child&&typeof st.child.destroy==='function')closeStreamChild(record);else record.streamChild=null;streamStatus(record,'Вбудовані джерела недоступні. Скористайтеся розширеним режимом.');record.streamLoad.hidden=false;}
    }
    function removeStreams(record) {
        if(!record.streamPane)return;
        if(Lampa.Controller.enabled().name==='sh_movie_streams')streamInfo(record);
        closeStreamChild(record);
        record.page.removeEventListener('hover:enter',record.streamEnter,true);record.streamPane.removeEventListener('hover:focus',record.streamPaneFocus,true);
        record.streamPane.remove();record.streamPane=null;record.page.classList.remove('sh-has-streams');
        if(record.activity.component.pause===record.streamPause)record.activity.component.pause=record.originalPause;
        if(record.streamInfoController&&record.streamInfoController.down===record.streamDown)record.streamInfoController.down=record.originalInfoDown;
    }
    function setupStreams(record) {
        if(record.streamPane||!Lampa.Storage.field('parser_use')||!window.lampa_settings.torrents_use)return;
        var pane=document.createElement('section');pane.className='sh-streams';pane.setAttribute('aria-label','Торрентні джерела');pane.setAttribute('aria-busy','false');
        pane.innerHTML='<div class="sh-stream-head"><h2>Джерела</h2><div class="sh-stream-retry selector" title="Оновити джерела">↻</div><div class="sh-stream-advanced selector" title="Розширений режим торрентів">⋯</div></div><div class="sh-stream-status" role="status">Джерела завантажуються лише після відкриття</div><div class="sh-stream-load selector">Показати джерела</div><div class="sh-stream-content"></div><div class="sh-stream-details selector">Деталі й актори ↓</div>';
        record.streamPane=pane;record.streamContent=pane.querySelector('.sh-stream-content');record.streamStatus=pane.querySelector('.sh-stream-status');record.streamLoad=pane.querySelector('.sh-stream-load');record.page.appendChild(pane);record.page.classList.add('sh-has-streams');
        record.streamEnter=function(event){
            if(event.target.closest('.view--torrent')&&record.root.contains(event.target)){event.stopImmediatePropagation();loadStreams(record);}
            else if(event.target===record.streamLoad){event.stopImmediatePropagation();loadStreams(record);}
            else if(event.target.closest('.sh-stream-retry')){event.stopImmediatePropagation();var key=record.streamChild&&record.streamChild.key;streamCache=streamCache.filter(function(item){return item.key!==key;});closeStreamChild(record);loadStreams(record);}
            else if(event.target.closest('.sh-stream-advanced')){event.stopImmediatePropagation();streamFallback(record);}
            else if(event.target.closest('.sh-stream-details')){event.stopImmediatePropagation();streamInfo(record);if(record.originalInfoDown)record.originalInfoDown();}
        };
        record.page.addEventListener('hover:enter',record.streamEnter,true);
        record.streamPaneFocus=function(event){if(record.streamChild){var node=event.target.closest('.selector');if(node)record.streamChild.last=node;}};record.streamPane.addEventListener('hover:focus',record.streamPaneFocus,true);
        record.originalPause=record.activity.component.pause;
        record.streamPause=function(){closeStreamChild(record);record.streamFocused=false;return record.originalPause&&record.originalPause.apply(this,arguments);};
        record.activity.component.pause=record.streamPause;
        onStreamController({name:Lampa.Controller.enabled().name});
    }
    function onStreamController(event) {
        if(!event||event.name!=='full_start')return;
        var record=movieRecords.filter(function(r){return r.page.classList.contains('activity--active')&&r.streamPane;})[0];if(!record)return;
        var controller=Lampa.Controller.enabled().controller;
        if(controller.down===record.streamDown)return;
        record.streamInfoController=controller;record.originalInfoDown=controller.down;
        record.streamDown=function(){loadStreams(record);};controller.down=record.streamDown;
    }
    function onStreamSettings(event) {
        if(event&&/^(jackett_|prowlarr_|parser_|parse_)/.test(event.name)){streamGeneration++;streamCache=[];movieRecords.forEach(closeStreamChild);}
    }

    function actionLabel(node) {
        var map = {'notice--icon':'Сповіщення', 'open--settings':'Налаштування', 'open--profile':'Профіль', 'full--screen':'Повний екран', 'open--broadcast':'Трансляція', 'trakt-head-action':'Trakt · статус та списки'};
        var keys = Object.keys(map);
        for (var i=0;i<keys.length;i++) if (node.classList.contains(keys[i])) return map[keys[i]];
        return node.getAttribute('aria-label') || node.getAttribute('title') || node.textContent.trim();
    }
    function secondaryActions() {
        return Array.prototype.filter.call(document.querySelectorAll('.head__actions > .head__action'), function (node) {
            if (node === moreButton || node.classList.contains('open--search') || node.classList.contains('hide') || node.classList.contains('hidden') || node.style.display === 'none' || node.querySelector('input,select,textarea')) return false;
            var label = actionLabel(node);
            if (label) node.classList.add('sh-head-secondary');
            return !!label;
        });
    }
    function restoreHead(target) {
        Lampa.Controller.toggle('head');
        if (target && target.isConnected) Lampa.Controller.collectionFocus($(target), Lampa.Head.render());
    }
    function openActions() {
        var nodes = secondaryActions();
        var items = nodes.map(function (node) { return {title:actionLabel(node), shNode:node}; });
        var clock = document.querySelector('.head__time');
        if (clock) items.push({title:clock.textContent.trim().replace(/\s+/g,' '), subtitle:'Час і дата'});
        menuOpen = true;
        Lampa.Select.show({title:'Меню', items:items, onBack:function () { menuOpen=false;restoreHead(moreButton); }, onSelect:function (item) {
            menuOpen=false;
            Lampa.Select.hide();
            Lampa.Activity.mixState();
            restoreHead(moreButton);
            if (item.shNode && item.shNode.isConnected) $(item.shNode).trigger('hover:enter');
        }});
    }
    function onSearchEnter() { searchReturn = true; }
    function onSearchClose() { clearSearchSources(); if (searchReturn) { searchReturn=false;restoreHead(searchNode); } }
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
            var button = $('<div class="head__action selector sh-head-more" role="button" aria-label="Меню" title="Меню"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></div>');
            moreButton = Lampa.Head.addElement(button, openActions)[0];
            document.querySelector('.head__actions').appendChild(moreButton);
        }
        var nativeSearch = document.querySelector('.head .open--search');
        if (nativeSearch !== searchNode) {
            if (searchNode) $(searchNode).off('hover:enter.shHybrid', onSearchEnter);
            searchNode=nativeSearch;
            if (searchNode) $(searchNode).on('hover:enter.shHybrid', onSearchEnter);
        }
        secondaryActions();
        var active = Lampa.Activity.active();
        document.body.setAttribute('data-sh-page', active ? active.component : 'main');
    }
    function onActivity(event) {
        if (!event || event.type === 'start') {setupHeader();scheduleMovie();}
        if(event && event.type==='destroy')movieRecords=movieRecords.filter(function(record){if(record.activity===event.object.activity){restoreMovie(record);return false;}return true;});
    }
    function setupUI() {
        if (!watching) { Lampa.Listener.follow('activity', onActivity); Lampa.Listener.follow('full',onMovieFull); Lampa.Controller.listener.follow('toggle',onStreamController); Lampa.Storage.listener.follow('change',onStreamSettings); Lampa.Search.listener.follow('close', onSearchClose); Lampa.Search.listener.follow('sources',onSearchSources); Lampa.Settings.listener.follow('open',onSettingsOpen); Lampa.Settings.listener.follow('close',onSettingsClose); document.addEventListener('keydown',onSettingsKey,true); document.addEventListener('keyup',onSettingsKey,true); installSettingsController(); watching=true; }
        setupHeader(); scheduleMovie();
        if(document.body.classList.contains('settings--open')) onSettingsOpen({name:'resume'});
    }
    function removeUI() {
        if (watching) { Lampa.Listener.remove('activity', onActivity); Lampa.Listener.remove('full',onMovieFull); Lampa.Controller.listener.remove('toggle',onStreamController); Lampa.Storage.listener.remove('change',onStreamSettings); streamCache=[]; Lampa.Search.listener.remove('close', onSearchClose); Lampa.Search.listener.remove('sources',onSearchSources); Lampa.Settings.listener.remove('open',onSettingsOpen); Lampa.Settings.listener.remove('close',onSettingsClose); document.removeEventListener('keydown',onSettingsKey,true); document.removeEventListener('keyup',onSettingsKey,true); settingsLeftConsumed=false; watching=false; }
        removeSettingsUI();
        removeMovies();
        clearSearchSources();
        searchReturn=false;
        if (searchNode) { $(searchNode).off('hover:enter.shHybrid', onSearchEnter); searchNode=null; }
        if (menuOpen) { menuOpen=false; Lampa.Select.close(); }
        if (moreButton) { $(moreButton).off('hover:enter', openActions).remove(); moreButton=null; }
        document.querySelectorAll('.sh-head-secondary').forEach(function (node) { node.classList.remove('sh-head-secondary'); });
        document.body.removeAttribute('data-sh-page');
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
                item.setAttribute('data-component',node.getAttribute('data-component'));
                item.textContent=node.querySelector('.settings-folder__name').textContent;
                settingsRail.appendChild(item);
            });
            settingsRail.setAttribute('data-signature',signature);
        }
        settingsRail.querySelectorAll('.sh-settings-category').forEach(function(node){
            if(node.getAttribute('data-component')===settingsCategory) node.setAttribute('aria-current','page'); else node.removeAttribute('aria-current');
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
        if(Lampa.Controller.enabled().name==='settings_component') settingsParameter=Lampa.Controller.enabled().controller;
        updateSettingsRail();
        if(initial) Lampa.Controller.toggle('sh_settings_nav');
    }
    function onSettingsCategory(event) {
        var item=event.target.closest('.sh-settings-category');
        if(item && settingsRail.contains(item)) { event.stopPropagation();chooseSettingsCategory(item.getAttribute('data-component'),false); }
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
            enter:function(){var item=settingsRail && settingsRail.querySelector('.sh-settings-category.focus');if(item)chooseSettingsCategory(item.getAttribute('data-component'),false);},
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
        settingsFrame=requestAnimationFrame(function(){
            settingsFrame=0;
            if(!watching || !document.body.classList.contains('settings--open'))return;
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
    function apply(on) {
        if (destroyed) return;
        document.body.classList.toggle('stremio-hybrid', on);
        if (on && !style) {
            style = document.createElement('style');
            style.id = 'stremio-hybrid-style';
            style.textContent = css;
            document.head.appendChild(style);
        }
        if (!on && style) { style.remove(); style = null; }
        if (on) setupUI(); else removeUI();
    }
    function setEnabled(on) { Lampa.Storage.set('stremio_hybrid_enabled', !!on); apply(!!on); }
    function stopWaiting() {
        document.removeEventListener('DOMContentLoaded', onDOM);
        if (waiting && window.Lampa && Lampa.Listener) Lampa.Listener.remove('app', onApp);
        waiting = false;
    }
    function onApp(event) { if (event && event.type === 'ready') init(); }
    function onDOM() {
        if (window.appready) init();
        else if (!waiting && window.Lampa && Lampa.Listener) {
            Lampa.Listener.follow('app', onApp);
            waiting = true;
        }
    }
    function init() {
        if (ready || destroyed || !window.Lampa || !Lampa.SettingsApi) return;
        ready = true;
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
        apply(enabled());
    }
    window.StremioHybrid = {
        version: '2.2.0',
        setEnabled: setEnabled,
        refresh: function () { if (ready) apply(enabled()); },
        destroy: function () {
            apply(false);
            destroyed = true;
            stopWaiting();
            delete window.StremioHybrid;
        }
    };
    if (window.appready) init();
    else {
        onDOM();
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onDOM);
    }
})();
