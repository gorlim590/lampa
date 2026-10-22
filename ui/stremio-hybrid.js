/* Stremio × Lampa. Presentation only: retains cards, metadata and controllers. */
(function () {
    'use strict';
    if (window.StremioHybrid) return;
    var style, ready = false, destroyed = false;
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
body.stremio-hybrid .card.focus { transform:scale(1.035) !important; z-index:20; }
body.stremio-hybrid .card .card__view { border-radius:.65em !important; transition:none !important; }
body.stremio-hybrid .card.focus .card__view { box-shadow:0 0 0 .14em #f0eef8,0 0 0 .27em #9775fa66 !important; }
body.stremio-hybrid .ydesign-card.focus::after, body.stremio-hybrid .ydesign-card .ydesign-content-layer::after { display:none !important; }
body.stremio-hybrid .ydesign-card .card__view::before { animation:none !important; }
body.stremio-hybrid .ydesign-badge, body.stremio-hybrid .ydesign-genre-badge, body.stremio-hybrid .ydesign-rating, body.stremio-hybrid .ydesign-series-pill, body.stremio-hybrid .ydesign-card-notch { backdrop-filter:none !important; -webkit-backdrop-filter:none !important; }
body.stremio-hybrid .ydesign-content-layer, body.stremio-hybrid .ydesign-desc-under { transition:opacity 160ms ease-out !important; }
body.stremio-hybrid .filter { padding:1em 1.8em; }
body.stremio-hybrid .filter__item, body.stremio-hybrid .filter--button { background:#252039; border-radius:2em; padding:.7em 1.2em; }
body.stremio-hybrid .filter__item.focus, body.stremio-hybrid .filter--button.focus { background:#7960c9 !important; color:white !important; }
body.stremio-hybrid .selectbox__content, body.stremio-hybrid .modal__content { background:#211d35; border-radius:1em; }
body.stremio-hybrid .selectbox-item.focus, body.stremio-hybrid .settings-param.focus, body.stremio-hybrid .settings-folder.focus { background:#7960c9 !important; color:white !important; border-radius:.65em; }
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
 body.stremio-hybrid .category-full .card.ydesign-vertical { width:calc(100% / 6) !important; }
}
@media(prefers-reduced-motion:reduce) {
 body.stremio-hybrid .card, body.stremio-hybrid .ydesign-content-layer, body.stremio-hybrid .ydesign-desc-under { transition:none !important; }
 body.stremio-hybrid .card.focus { transform:none !important; }
}
`;
    function enabled() { return Lampa.Storage.get('stremio_hybrid_enabled', true) !== false && Lampa.Storage.get('stremio_hybrid_enabled', true) !== 'false'; }
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
    function init() {
        if (ready || destroyed || !window.Lampa) return;
        ready = true;
        if (!window.StremioHybridSettingsRegistered) {
        Lampa.SettingsApi.addParam({component:'interface', param:{name:'stremio_hybrid_enabled',type:'trigger',default:true}, field:{name:'Stremio × Lampa',description:'Темна тема, компактна навігація та легкий фокус. Зберігає ваші картки.'},onChange:function(value){if(window.StremioHybrid) window.StremioHybrid.setEnabled(value === true || value === 'true');}});
        window.StremioHybridSettingsRegistered = true;
        }
        apply(enabled());
        $(document).off('appready.stremioHybrid', init);
    }
    window.StremioHybrid = {version:'1.0.0',setEnabled:setEnabled,destroy:function(){apply(false);destroyed=true;$(document).off('appready.stremioHybrid',init);}};
    if (window.appready) init();
    else $(document).on('appready.stremioHybrid', init);
})();
