/* Torrent Overlay: presentation only. Hybrid owns the native torrent component. */
(function () {
    'use strict';
    if (window.LampaTorrentOverlay) return;
    var css = `
body.stremio-hybrid .sh-has-streams.sh-overlay-mode .sh-movie-column{width:100%!important;max-width:100%!important}
body.stremio-hybrid .sh-overlay-mode .sh-movie .full-start-new__buttons{order:2!important;margin:.3em -.2em .6em!important}
body.stremio-hybrid .sh-torrent-overlay[hidden]{display:none!important}
body.stremio-hybrid .sh-torrent-overlay{position:fixed!important;inset:5vh 7vw!important;width:86vw!important;height:90vh!important;max-height:none!important;z-index:20;box-sizing:border-box;padding:clamp(14px,1.25vw,48px)!important;border:1px solid #ffffff28!important;border-radius:clamp(14px,1.1vw,36px)!important;background:#11131e!important;box-shadow:0 0 0 100vmax #03050a80;display:flex;flex-direction:column;gap:.65em;font:400 clamp(16px,1.1458vw,44px)/1.4 Manrope,system-ui,sans-serif;color:#eef1f8;isolation:isolate}
body.stremio-hybrid .sh-torrent-overlay .sh-stream-head{display:flex;align-items:center;gap:.7em;flex:none;padding:0!important;font-size:1em!important}
body.stremio-hybrid .sh-torrent-overlay .sh-stream-head h2{margin:0;flex:1;min-width:0;font-size:1.27em;line-height:1.3;overflow-wrap:anywhere}
body.stremio-hybrid .sh-torrent-overlay .sh-stream-head .selector,body.stremio-hybrid .sh-torrent-overlay .sh-stream-load{font-size:1em!important;min-height:2.6em;box-sizing:border-box;padding:.55em .8em!important;border-radius:.55em;border:2px solid #ffffff25;background:#ffffff08;color:#eef1f8;flex:none}
body.stremio-hybrid .sh-torrent-overlay .sh-stream-status{font-size:1em!important;color:#bfc7da;margin:0!important;flex:none;overflow-wrap:anywhere}
body.stremio-hybrid .sh-torrent-overlay .sh-stream-content{min-height:0;flex:1;overflow:hidden}
body.stremio-hybrid .sh-torrent-overlay .sh-stream-content:empty{flex:0}
body.stremio-hybrid .sh-torrent-overlay .sh-stream-explorer,body.stremio-hybrid .sh-torrent-overlay .explorer__files{height:100%!important;min-height:0}
body.stremio-hybrid .sh-torrent-overlay .ctr-tools{font-size:1em!important;padding:0 0 .5em!important}
body.stremio-hybrid .sh-torrent-overlay .ctr-tabs,body.stremio-hybrid .sh-torrent-overlay .ctr-menus{gap:.5em;margin:0 0 .5em}
body.stremio-hybrid .sh-torrent-overlay .ctr-button,body.stremio-hybrid .sh-torrent-overlay .ctr-tab{min-height:2.6em;padding:.5em .85em;box-sizing:border-box;font-size:1em}
body.stremio-hybrid .sh-torrent-overlay .torrent-item.sh-cinema-row{font-size:1em!important;padding:.85em!important;margin:0 0 .6em!important;border-radius:.7em;border:2px solid #ffffff14!important;transition:none!important}
body.stremio-hybrid .sh-torrent-overlay .ctr-row{grid-template-columns:4.2em minmax(0,1fr) 8em;gap:1em;min-height:5.5em}
body.stremio-hybrid .sh-torrent-overlay .ctr-name{font-size:1.18em!important;font-weight:650;line-height:1.4}
body.stremio-hybrid .sh-torrent-overlay .ctr-quality strong,body.stremio-hybrid .sh-torrent-overlay .ctr-size{font-size:1.1em}
body.stremio-hybrid .sh-torrent-overlay .ctr-chip,body.stremio-hybrid .sh-torrent-overlay .ctr-peers,body.stremio-hybrid .sh-torrent-overlay .ctr-best,body.stremio-hybrid .sh-torrent-overlay .ctr-quality small{font-size:.95em!important;white-space:normal;overflow-wrap:anywhere}
body.stremio-hybrid .sh-torrent-overlay .ctr-bitrate{display:none}
body.stremio-hybrid .sh-torrent-overlay .ctr-chips{gap:.3em .6em}
body.stremio-hybrid .sh-torrent-overlay .focus{outline:2px solid #fff!important;outline-offset:-2px;box-shadow:inset .2em 0 var(--sm-accent,#bca8f0)!important;background:#302b47!important}
body.stremio-hybrid .sh-torrent-overlay .empty{font-size:1em!important}
body.stremio-hybrid .sh-torrent-overlay .scroll{mask-image:none!important;-webkit-mask-image:none!important}
body.stremio-hybrid .sh-torrent-overlay .scroll__body{padding:.15em!important;min-width:0}
body.stremio-hybrid .sh-torrent-overlay .parser-providers-toolbar{font-size:1em;flex-wrap:wrap}
body.stremio-hybrid .sh-torrent-overlay .parser-search-status{display:none}
body.stremio-hybrid .sh-release-details{font-size:1.15em;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}
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
    function releaseView(source,movie,kind) {
        source=source||{};movie=movie||{};var api=window.TorrentsRedesign,raw=String(source.Title||source.title||''),data=api&&api.normalizeRelease?api.normalizeRelease(source):null;
        var match=data&&api.releaseMatch?api.releaseMatch(data,movie,{}):null;
        var trusted=match&&match.eligible&&match.similarity>=.75;
        // No existing display-title normalizer in main. Extend Cinema's identity check; never mutate its input.
        var name=trusted?(movie.title||movie.name||movie.original_title||movie.original_name):raw.split(/(?:[ ._(]+(?:19|20)\d{2}(?:[ ._)]+|$)|\bS\d{1,2}(?:E|\b)|\b(?:2160p|1080p|720p|WEB[ .-]?DL|BluRay)\b)/i)[0].replace(/[._]+/g,' ').trim();
        var year=trusted?String(movie.release_date||movie.first_air_date||'').slice(0,4):data&&data.year||(/(?:^|[ ._(])((?:19|20)\d{2})(?=[ ._)]|$)/.exec(raw)||[])[1];
        var title=(name||'Назва не підтверджена')+(year?' ('+year+')':' · рік не визначено');
        if(kind==='tv')title+=' · '+coverage(raw,source);
        return {title:title,raw:raw,release:data?data.parsed.name:'',match:match,data:data};
    }
    function decorate(row,source,movie,kind) {
        var view=releaseView(source,movie,kind),name=row.querySelector('.ctr-name'),chips=row.querySelector('.ctr-chips');
        if(name)name.textContent=view.title;
        row.title=view.raw;row.setAttribute('aria-label',view.title);
        if(!chips)return view;
        chips.textContent='';
        function chip(label,cls){var n=document.createElement('div');n.className='ctr-chip '+(cls||'');n.textContent=label;chips.appendChild(n);}
        if(view.release)chip(view.release);
        // Native .m-audio tags originate from ffprobe; title tokens and subtitle tags cannot prove audio.
        var audio=Array.from(row.querySelectorAll('.m-audio')).map(function(n){return n.getAttribute('aria-label')||n.textContent;});
        var languages=source.AudioLanguages||source.audio_languages||[];
        if(!Array.isArray(languages))languages=[languages];
        var known=audio.concat(languages).join(' '),ua=/(?:^|[^a-z])(ukr?|ua|ukrainian)(?=$|[^a-z])|українськ/i.test(known),en=/(?:^|[^a-z])(en|eng|english)(?=$|[^a-z])/i.test(known);
        if(ua)chip('🇺🇦 Українська · аудіо','is-ua');if(en)chip('🇬🇧 English · аудіо');
        if(!ua&&!en)chip(audio.length?'Аудіо: '+audio.join(' · '):'Мови аудіо не підтверджено');
        if(row.querySelector('.m-subtitle'))chip('CC · субтитри');
        if(view.data&&view.data.tracker)chip(view.data.tracker);
        row.classList.remove('is-best','sh-source-pick');
        // Recommendation is conditional on actual Cinema ranking, relevance and availability, never just 4K.
        return view;
    }
    function create(pane,page,inline) {
        installStyle();var open=false,scrolls=[],origin=null;pane.dataset.state='closed';
        if(!inline){pane.classList.add('sh-torrent-overlay');pane.hidden=true;pane.setAttribute('role','dialog');pane.setAttribute('aria-modal','true');document.body.appendChild(pane);page.classList.add('sh-overlay-mode');}
        return {
            inline:inline,
            isOpen:function(){return inline||open;},
            open:function(){
                if(open)return;open=true;pane.dataset.state='opening';
                origin=page.querySelector('.view--torrent.focus')||page.querySelector('.view--torrent:not(.hide)');
                scrolls=Array.from(page.querySelectorAll('.scroll')).concat(document.scrollingElement||[]).map(function(n){return {node:n,top:n.scrollTop,left:n.scrollLeft};});
                if(!inline){var styles=getComputedStyle(page);['--sm-accent','--sm-accent-rgb','--sm-accent2','--sm-accent2-rgb','--sm-accent-ink'].forEach(function(k){pane.style.setProperty(k,styles.getPropertyValue(k));});pane.hidden=false;}
            },
            close:function(restore){if(!open)return;open=false;pane.dataset.state='closed';if(!inline)pane.hidden=true;if(restore){if(origin&&origin.isConnected)Lampa.Controller.collectionFocus(origin,page);scrolls.forEach(function(s){s.node.scrollTop=s.top;s.node.scrollLeft=s.left;});}},
            destroy:function(){open=false;pane.remove();page.classList.remove('sh-overlay-mode');scrolls=[];origin=null;}
        };
    }
    window.LampaTorrentOverlay={create:create,key:key,session:session,releaseView:releaseView,coverage:coverage,decorate:decorate};
})();
