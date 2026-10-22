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
`;
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
    function onActivity(event) { if (!event || event.type === 'start') setupHeader(); }
    function setupUI() {
        if (!watching) { Lampa.Listener.follow('activity', onActivity); Lampa.Search.listener.follow('close', onSearchClose); Lampa.Search.listener.follow('sources',onSearchSources); Lampa.Settings.listener.follow('open',onSettingsOpen); Lampa.Settings.listener.follow('close',onSettingsClose); document.addEventListener('keydown',onSettingsKey,true); document.addEventListener('keyup',onSettingsKey,true); installSettingsController(); watching=true; }
        setupHeader();
        if(document.body.classList.contains('settings--open')) onSettingsOpen({name:'resume'});
    }
    function removeUI() {
        if (watching) { Lampa.Listener.remove('activity', onActivity); Lampa.Search.listener.remove('close', onSearchClose); Lampa.Search.listener.remove('sources',onSearchSources); Lampa.Settings.listener.remove('open',onSettingsOpen); Lampa.Settings.listener.remove('close',onSettingsClose); document.removeEventListener('keydown',onSettingsKey,true); document.removeEventListener('keyup',onSettingsKey,true); settingsLeftConsumed=false; watching=false; }
        removeSettingsUI();
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
        version: '2.0.0',
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
