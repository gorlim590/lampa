/* Stremio × Lampa. Presentation only: retains cards, metadata and controllers. */
(function () {
    'use strict';
    if (window.StremioHybrid) return;
    var style, ready = false, destroyed = false, waiting = false;
    var css = `
body.stremio-hybrid { --sh-bg:#121023; --sh-panel:#211d35; --sh-accent:#9775fa; --sh-muted:#aba7bd; background:#121023 !important; color:#f0eef8; }
body.stremio-hybrid .background { opacity:.12 !important; }
body.stremio-hybrid .head { background:#151127 !important; border-bottom:1px solid #ffffff09; }
body.stremio-hybrid .head__body { padding-left:1.8em; padding-right:1.8em; }
body.stremio-hybrid .head__action { border-radius:50%; }
body.stremio-hybrid .head__action.focus { background:#7960c9 !important; color:white !important; }
body.stremio-hybrid .wrap { background:#121023; }
body.stremio-hybrid .wrap__left { background:#100e20 !important; visibility:visible !important; }
body.stremio-hybrid .menu__item { margin:.15em .45em; border-radius:.7em !important; min-height:2.8em; color:#aba7bd; }
body.stremio-hybrid .menu__item.focus, body.stremio-hybrid .menu__item.traverse { background:#29233e !important; color:#b79bff !important; }
body.stremio-hybrid .menu__ico { opacity:1; }
body.stremio-hybrid .items-line { padding-bottom:2.4em; }
body.stremio-hybrid .items-line__head { padding:0 1.8em 1em; }
body.stremio-hybrid .items-line__title { font-size:1.2em; font-weight:500; letter-spacing:.01em; }
body.stremio-hybrid .items-line .scroll__content { padding-left:1.8em; padding-right:1.8em; }
body.stremio-hybrid .items-line:not(.vinyl-line) .scroll__body { gap:1.1em; }
body.stremio-hybrid .card { transition:transform 160ms ease-out !important; backface-visibility:visible !important; transform:none; }
body.stremio-hybrid .ydesign-card, body.stremio-hybrid .ydesign-card.focus { animation:none !important; }
body.stremio-hybrid .card.focus { transform:scale(1.035) !important; z-index:20; }
body.stremio-hybrid .card .card__view { border-radius:.65em !important; transition:none !important; }
body.stremio-hybrid .card.focus .card__view { box-shadow:0 0 0 .14em #f0eef8,0 0 0 .27em #9775fa66 !important; }
body.stremio-hybrid .ydesign-card.focus::after, body.stremio-hybrid .ydesign-card .ydesign-content-layer::after { display:none !important; }
body.stremio-hybrid .ydesign-card .card__view::before { animation:none !important; }
body.stremio-hybrid .ydesign-badge, body.stremio-hybrid .ydesign-genre-badge, body.stremio-hybrid .ydesign-rating, body.stremio-hybrid .ydesign-series-pill, body.stremio-hybrid .ydesign-card-notch { backdrop-filter:none !important; -webkit-backdrop-filter:none !important; }
body.stremio-hybrid .ydesign-content-layer, body.stremio-hybrid .ydesign-desc-under { transition:opacity 160ms ease-out !important; }
body.stremio-hybrid .selectbox__content, body.stremio-hybrid .settings__content, body.stremio-hybrid .modal__content { background:#211d35 !important; border-radius:1em; backdrop-filter:none !important; -webkit-backdrop-filter:none !important; }
body.stremio-hybrid .selectbox-item { border-radius:.65em; }
body.stremio-hybrid .mapping--grid { padding:.6em .8em; }
body.stremio-hybrid .mapping--grid .card { padding:0 .65em 1.8em; }
body.stremio-hybrid .selectbox-item.focus, body.stremio-hybrid .settings-param.focus, body.stremio-hybrid .settings-folder.focus { background:#7960c9 !important; color:white !important; border-radius:.65em; }
/* Keep Cardify's composition and provider actions; improve readable hierarchy. */
body.stremio-hybrid .full-start__background { opacity:.48 !important; filter:none !important; }
body.stremio-hybrid .cardify-effects-overlay { width:100% !important; background:linear-gradient(90deg,rgba(18,16,35,.76),rgba(18,16,35,.16)) !important; transition:opacity 160ms ease-out !important; }
body.stremio-hybrid .full-start-new__title { font-size:2.4em !important; line-height:1.16 !important; font-weight:600; max-width:26em; white-space:normal !important; display:block !important; overflow:visible !important; text-overflow:clip; overflow-wrap:break-word; -webkit-line-clamp:unset !important; margin:.3em 0 .5em !important; }
body.stremio-hybrid .full-start-new__head { color:#d0cadf; font-size:.95em; line-height:1.4; }
body.stremio-hybrid .ifx-original-title { opacity:.7; font-weight:400; }
body.stremio-hybrid .cardify__left { min-width:0; max-width:68%; padding-right:1.2em; }
body.stremio-hybrid .full-start-new__right { gap:1em; }
body.stremio-hybrid .full-start-new__rate-line { gap:.6em; }
body.stremio-hybrid .full-start__button { border-radius:2em !important; background:#29233e; border:1px solid #ffffff16; min-height:2.8em; animation:none !important; opacity:1 !important; transition:transform 160ms ease-out,opacity 160ms ease-out !important; backdrop-filter:none !important; -webkit-backdrop-filter:none !important; }
body.stremio-hybrid .full-start__button.focus { background:#e9e0ff !important; color:#201536 !important; box-shadow:0 0 0 .13em #9775fa !important; transform:translateY(-.08em); }
body.stremio-hybrid .custom-ghost-main { width:31% !important; padding:1.1em !important; background:rgba(24,21,43,.94); border:1px solid #ffffff12; border-radius:1em; z-index:1 !important; }
body.stremio-hybrid .custom-ghost-main .full-descr__text { text-align:left !important; font-size:1em !important; line-height:1.55 !important; max-height:15.5em !important; }
body.stremio-hybrid .full-descr__text.focus { outline:.12em solid #b79bff; outline-offset:.35em; border-radius:.3em; }
body.stremio-hybrid .full-descr { padding-left:1.8em; padding-right:1.8em; }
body.stremio-hybrid .full-descr__info-name { color:#aaa2be; }
body.stremio-hybrid .full-descr__tag { border-radius:2em; background:#29233e; }
body.stremio-hybrid .full-descr__tag.focus, body.stremio-hybrid .simple-button.focus { background:#7960c9 !important; color:white !important; }
body.stremio-hybrid .full-person__photo { border-radius:.7em; }
body.stremio-hybrid .settings__title, body.stremio-hybrid .selectbox__title { font-size:1.6em; font-weight:500; letter-spacing:.01em; }
body.stremio-hybrid .settings-param, body.stremio-hybrid .settings-folder { border-radius:.65em; border:1px solid transparent; }
body.stremio-hybrid .settings-param__descr, body.stremio-hybrid .settings-param__value { color:#bbb3ce; }
body.stremio-hybrid .settings-param.focus .settings-param__descr, body.stremio-hybrid .settings-param.focus .settings-param__value { color:#f4eeff; }
body.stremio-hybrid .settings-param.focus, body.stremio-hybrid .settings-folder.focus, body.stremio-hybrid .selectbox-item.focus { box-shadow:inset .18em 0 #d2bdff; }
body.stremio-hybrid .menu__item, body.stremio-hybrid .head__action, body.stremio-hybrid .selectbox-item, body.stremio-hybrid .settings-param, body.stremio-hybrid .settings-folder { transition:transform 140ms ease-out,opacity 140ms ease-out !important; }
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
 body.stremio-hybrid .cardify__left { max-width:100%; padding-right:0; }
 body.stremio-hybrid .custom-ghost-main { position:relative !important; width:100% !important; margin-top:1em; }
 body.stremio-hybrid .full-start-new__title { font-size:1.8em !important; }
}
@media(prefers-reduced-motion:reduce) {
 body.stremio-hybrid .card, body.stremio-hybrid .ydesign-content-layer, body.stremio-hybrid .ydesign-desc-under { transition:none !important; }
 body.stremio-hybrid .full-start__button, body.stremio-hybrid .menu__item, body.stremio-hybrid .head__action, body.stremio-hybrid .selectbox-item, body.stremio-hybrid .settings-param, body.stremio-hybrid .settings-folder, body.stremio-hybrid .cardify-effects-overlay { transition:none !important; }
 body.stremio-hybrid .card.focus, body.stremio-hybrid .full-start__button.focus { transform:none !important; }
}
`;
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
        version: '1.1.0',
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
