/* Torrent Overlay: presentation only. Hybrid owns the native torrent component. */
(function () {
    'use strict';
    if (window.LampaTorrentOverlay) return;
    var css = `
body.stremio-hybrid .sh-has-streams.sh-overlay-mode .sh-movie-column{width:100%!important;max-width:100%!important}
body.stremio-hybrid .sh-overlay-mode .sh-movie .full-start-new__buttons{order:2!important;margin:.3em -.2em .6em!important}
body.stremio-hybrid .sh-torrent-overlay[hidden]{display:none!important}
body.stremio-hybrid .sh-torrent-overlay{position:fixed!important;inset:5vh 7vw!important;width:86vw!important;height:90vh!important;max-height:none!important;z-index:20;box-sizing:border-box;padding:clamp(14px,1.25vw,48px)!important;border:1px solid #ffffff28!important;border-radius:clamp(14px,1.1vw,36px)!important;background:linear-gradient(145deg,rgba(22,25,39,.98),rgba(9,11,19,.98))!important;box-shadow:0 0 0 100vmax #03050a9c,0 1.5em 5em #0009;display:flex;flex-direction:column;gap:.65em;font:400 clamp(16px,1.1458vw,44px)/1.4 Manrope,system-ui,sans-serif;color:#eef1f8;isolation:isolate}
body.stremio-hybrid .sh-torrent-overlay .sh-stream-head{display:flex;align-items:center;gap:.7em;flex:none;padding:0!important;font-size:1em!important}
body.stremio-hybrid .sh-torrent-overlay .sh-stream-head h2{margin:0;flex:1;min-width:0;font-size:1.27em;line-height:1.3;overflow-wrap:anywhere}
body.stremio-hybrid .sh-torrent-overlay .sh-stream-head .selector,body.stremio-hybrid .sh-torrent-overlay .sh-stream-load{font-size:1em!important;min-height:2.6em;box-sizing:border-box;padding:.55em .8em!important;border-radius:.55em;border:2px solid #ffffff25;background:#ffffff08;color:#eef1f8;flex:none}
body.stremio-hybrid .sh-torrent-overlay .sh-stream-status{font-size:1em!important;color:#bfc7da;margin:0!important;flex:none;overflow-wrap:anywhere}
body.stremio-hybrid .sh-torrent-overlay .sh-stream-content{min-height:0;flex:1;overflow:hidden}
body.stremio-hybrid .sh-torrent-overlay .sh-stream-content:empty{flex:0}
body.stremio-hybrid .sh-torrent-overlay .sh-stream-explorer,body.stremio-hybrid .sh-torrent-overlay .explorer__files{height:100%!important;min-height:0}
body.stremio-hybrid .sh-torrent-overlay .ctr-tools{display:flex;align-items:center;flex-wrap:wrap;gap:.45em .8em;font-size:1em!important;padding:0 0 .5em!important;border-bottom:1px solid #ffffff17}
body.stremio-hybrid .sh-torrent-overlay .ctr-tabs,body.stremio-hybrid .sh-torrent-overlay .ctr-menus{display:flex;align-items:center;flex-wrap:wrap;gap:.4em;margin:0}
body.stremio-hybrid .sh-torrent-overlay .ctr-tracker-tabs{padding:0;border:0}
body.stremio-hybrid .sh-torrent-overlay .ctr-menus{margin-left:auto}
body.stremio-hybrid .sh-torrent-overlay .ctr-button,body.stremio-hybrid .sh-torrent-overlay .ctr-tab{min-height:2.6em;padding:.5em .85em;box-sizing:border-box;font-size:1em}
body.stremio-hybrid .sh-torrent-overlay .torrent-item.sh-cinema-row{font-size:1em!important;padding:.85em!important;margin:0 0 .6em!important;border-radius:.7em;border:2px solid #ffffff14!important;transition:border-color .12s ease,background-color .12s ease!important}
body.stremio-hybrid .sh-torrent-overlay .torrent-item.sh-cinema-row.is-best{border-color:rgba(83,220,157,.58)!important;background:linear-gradient(100deg,rgba(37,113,83,.25),rgba(255,255,255,.035))!important;box-shadow:inset .22em 0 #43d99d,0 .4em 1.4em #0004!important}
body.stremio-hybrid .sh-torrent-overlay .ctr-best{display:none!important;align-items:center;width:max-content;max-width:100%;margin:0 0 .45em;padding:.25em .6em;border:1px solid #65e6aa70;border-radius:2em;background:#28a46a25;color:#b9f6d7;font-size:.78em!important;font-weight:800;line-height:1.3;overflow-wrap:anywhere}
body.stremio-hybrid .sh-torrent-overlay .torrent-item.is-best .ctr-best{display:inline-flex!important}
body.stremio-hybrid .sh-torrent-overlay .is-best[data-best-outside-filter=true] .ctr-best{border-color:#f0c66d88;background:#a77a1d24;color:#ffe1a0}
body.stremio-hybrid .sh-torrent-overlay .ctr-row{grid-template-columns:4.2em minmax(0,1fr) 8em;gap:1em;min-height:5.5em}
body.stremio-hybrid .sh-torrent-overlay .ctr-name{font-size:1.18em!important;font-weight:650;line-height:1.4}
body.stremio-hybrid .sh-torrent-overlay .ctr-quality strong,body.stremio-hybrid .sh-torrent-overlay .ctr-size{font-size:1.1em}
body.stremio-hybrid .sh-torrent-overlay .ctr-chip,body.stremio-hybrid .sh-torrent-overlay .ctr-peers,body.stremio-hybrid .sh-torrent-overlay .ctr-best,body.stremio-hybrid .sh-torrent-overlay .ctr-quality small{font-size:.95em!important;white-space:normal;overflow-wrap:anywhere}
body.stremio-hybrid .sh-torrent-overlay .ctr-chip.is-unknown{color:#a6aec0;border:1px dashed #ffffff30}
body.stremio-hybrid .sh-torrent-overlay .ctr-chip.is-audio{color:#d4fae7;background:#36b97b20;border:1px solid #48d39148}
body.stremio-hybrid .sh-torrent-overlay .ctr-chip.is-studio{color:#e8dcff;background:#8b6ee522;border:1px solid #a78bfa48;font-weight:700}
body.stremio-hybrid .sh-torrent-overlay .ctr-chip.is-subtitle{color:#c6ddff;background:#4c86dc20;border:1px solid #70a8f044}
body.stremio-hybrid .sh-torrent-overlay .ctr-quality.q-720{color:#91d9f5;background:#39a5d11a;border-color:#39a5d155}
body.stremio-hybrid .sh-torrent-overlay .ctr-bitrate{display:none}
body.stremio-hybrid .sh-torrent-overlay .ctr-chips{gap:.3em .6em}
body.stremio-hybrid .sh-torrent-overlay .selector.focus,body.stremio-hybrid .sh-torrent-overlay .torrent-item.focus{outline:3px solid #c9b8ff!important;outline-offset:2px;box-shadow:0 0 0 .16em #9775fa88,inset .22em 0 var(--sm-accent,#bca8f0)!important;background:#302b47!important;position:relative;z-index:1}
body.stremio-hybrid .sh-torrent-overlay .empty{font-size:1em!important}
body.stremio-hybrid .sh-torrent-overlay .scroll{mask-image:none!important;-webkit-mask-image:none!important}
body.stremio-hybrid .sh-torrent-overlay .scroll__body{padding:.15em!important;min-width:0}
body.stremio-hybrid .sh-torrent-overlay .parser-providers-toolbar{font-size:1em;flex-wrap:wrap}
body.stremio-hybrid .sh-torrent-overlay .parser-search-status{display:none}
@media(max-width:900px){body.stremio-hybrid .sh-torrent-overlay{inset:4vh 4vw!important;width:92vw!important;height:92vh!important}body.stremio-hybrid .sh-torrent-overlay .ctr-row{grid-template-columns:3.5em minmax(0,1fr);gap:.65em}body.stremio-hybrid .sh-torrent-overlay .ctr-metrics{grid-column:2;text-align:left;display:flex;flex-wrap:wrap;gap:.8em}}
`;
    function installStyle() {
        if (document.getElementById('sh-torrent-overlay-style')) return;
        var style=document.createElement('style');style.id='sh-torrent-overlay-style';style.textContent=css;document.head.appendChild(style);
    }
    function session() {
        // Only non-secret identifiers; credentials/URLs never become cache keys.
        var permit=Lampa.Account&&Lampa.Account.Permit,account=permit&&permit.account||{};
        return JSON.stringify([account.id||'',account.profile&&account.profile.id||'']);
    }
    function key(params,kind,epoch) {
        return JSON.stringify([session(),epoch,kind,params.movie.source||'tmdb',params.movie.id,
            params.search,params.search_one,params.search_two,!!params.global,!!params.clarification,
            params.season,params.episode,params.filter_season,params.filter_episode,Lampa.Storage.field('parser_torrent_type')]);
    }
    function pad(n){return String(n).padStart(2,'0');}
    function coverage(raw,source) {
        var matches=Array.from(raw.matchAll(/\bS(\d{1,2})E(\d{1,3})(?:[ ._]*[-–][ ._]*(?:S(\d{1,2}))?E?(\d{1,3}))?/gi));
        if(matches.length){return matches.map(function(m){return 'S'+pad(+m[1])+'E'+pad(+m[2])+(m[4]?(m[3]&&+m[3]!==+m[1]?'–S'+pad(+m[3])+'E'+pad(+m[4]):+m[4]>=+m[2]?'–E'+pad(+m[4]):''):'');}).filter(function(v,i,a){return a.indexOf(v)===i;}).join(' · ');}
        var m=/\b(\d{1,2})x(\d{1,3})\b/i.exec(raw);if(m)return 'S'+pad(+m[1])+'E'+pad(+m[2]);
        m=/\bS(\d{1,2})\s*[-–]\s*S(\d{1,2})\b/i.exec(raw);if(m&&+m[2]>=+m[1])return 'S'+pad(+m[1])+'–S'+pad(+m[2]);
        m=/(?:\bS|\bSeason[ ._]*|Сезон[ ._:]*)(\d{1,2})(?!\d)|(?:^|[^\d])(\d{1,2})\s*сезон/iu.exec(raw);
        var season=m?+(m[1]||m[2]):null;
        var episode=/\bE(\d{1,3})(?:\s*[-–]\s*E?(\d{1,3}))?\b/i.exec(raw)||/\[(\d{1,3})\s*[-–]\s*(\d{1,3})\]/.exec(raw)||/(?:^|[^\d])(\d{1,3})\s*[-–]\s*(\d{1,3})\s*(?:сері[яїй]|эпизод|episodes)/iu.exec(raw);
        if(episode)return (season==null?'':'S'+pad(season))+'E'+pad(+episode[1])+(episode[2]&&+episode[2]>=+episode[1]?'–E'+pad(+episode[2]):'');
        function coord(v,zero){return /^\d{1,3}$/.test(String(v))&&+v>=(zero?0:1)?+v:null;}
        if(season==null)season=coord(source.Season??source.season,true);
        var ep=coord(source.Episode??source.episode,false);
        return season!=null?'S'+pad(season)+(ep==null?'':'E'+pad(ep)):ep!=null?'E'+pad(ep):'епізоди не визначено';
    }
    function releaseView(source,movie,kind,context) {
        source=source||{};movie=movie||{};var api=window.TorrentsRedesign,raw=String(source.Title||source.title||''),data=api&&api.normalizeRelease?api.normalizeRelease(source):null;
        var match=data&&api.releaseMatch?api.releaseMatch(data,movie,context||{}):null;
        // Full parser release names carry edition, voice and pack details needed on TV.
        // Keep relevance/ranking separate from display; never synthesize a replacement title.
        return {title:raw||'Назва релізу недоступна',raw:raw,release:data?data.parsed.name:'',match:match,data:data};
    }
    function decorate(row,source,movie,kind,context) {
        var view=releaseView(source,movie,kind,context),name=row.querySelector('.ctr-name'),chips=row.querySelector('.ctr-chips');
        if(name)name.textContent=view.title;
        row.title=view.raw;row.setAttribute('aria-label',view.title);
        if(!chips)return view;
        chips.textContent='';
        function chip(label,cls){var n=document.createElement('div');n.className='ctr-chip '+(cls||'');n.textContent=label;chips.appendChild(n);}
        var data=view.data,parsed=data&&data.parsed||{},audio=parsed.audio||{languages:[],label:'Невідомо',ua:false},subs=parsed.subs||{languages:[],label:'Невідомо'},audioLabel=audio.label||'Невідомо',subtitleLabel=subs.label||'Невідомо',studio=parsed.voiceover&&parsed.voiceover!=='Невідомо'?parsed.voiceover:'Студія невідома';
        if(parsed.name)chip(parsed.name);
        chip('🔊 Аудіо: '+audioLabel,(audio.ua?'is-ua ':'')+'is-audio'+(audioLabel==='Невідомо'?' is-unknown':''));
        if(studio!=='Студія невідома'||parsed.voiceoverType)chip('🎙 Озвучення: '+studio+(parsed.voiceoverType?' · '+parsed.voiceoverType:''),studio==='Студія невідома'?'is-unknown':'is-studio');
        else chip('🎙 Студія невідома','is-unknown');
        chip('CC · Субтитри: '+subtitleLabel,'is-subtitle'+(subtitleLabel==='Невідомо'?' is-unknown':''));
        chip('Якість: '+(parsed.quality?(parsed.quality==='2160'?'4K':parsed.quality+'p'):'Невідомо'),parsed.quality?'':'is-unknown');
        chip('Трекер: '+(data&&data.tracker||'Невідомо'),data&&data.tracker?'':'is-unknown');
        chip('Сіди: '+(data&&data.seeds!=null?data.seeds:'Невідомо'),data&&data.seeds!=null?'':'is-unknown');
        row.classList.remove('is-best','sh-source-pick');
        // Recommendation is conditional on actual Cinema ranking, relevance and availability, never just 4K.
        return view;
    }
    function create(pane,page) {
        installStyle();var open=false,scrolls=[],origin=null;pane.dataset.state='closed';
        pane.classList.add('sh-torrent-overlay');pane.hidden=true;pane.setAttribute('role','dialog');pane.setAttribute('aria-modal','true');document.body.appendChild(pane);page.classList.add('sh-overlay-mode');
        return {
            isOpen:function(){return open;},
            open:function(){
                if(open)return;open=true;pane.dataset.state='opening';
                origin=page.querySelector('.view--torrent.focus')||page.querySelector('.view--torrent:not(.hide)');
                scrolls=Array.from(page.querySelectorAll('.scroll')).concat(document.scrollingElement||[]).map(function(n){return {node:n,top:n.scrollTop,left:n.scrollLeft};});
                var styles=getComputedStyle(page);['--sm-accent','--sm-accent-rgb','--sm-accent2','--sm-accent2-rgb','--sm-accent-ink'].forEach(function(k){pane.style.setProperty(k,styles.getPropertyValue(k));});pane.hidden=false;
            },
            close:function(restore){if(!open)return;open=false;pane.dataset.state='closed';pane.hidden=true;if(restore){if(origin&&origin.isConnected)Lampa.Controller.collectionFocus(origin,page);scrolls.forEach(function(s){s.node.scrollTop=s.top;s.node.scrollLeft=s.left;});}},
            destroy:function(){open=false;pane.remove();page.classList.remove('sh-overlay-mode');scrolls=[];origin=null;}
        };
    }
    window.LampaTorrentOverlay={create:create,key:key,session:session,releaseView:releaseView,coverage:coverage,decorate:decorate};
})();
