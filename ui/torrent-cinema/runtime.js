/* Native Lampa Full/torrent/Files adapter; moved from Hybrid, no second search/player. */
function createCinemaRuntime(metadata) {
    var movieRecords=[],running=false,frame=0,subscriptions=[];
    var filesOverlay=null;
    function markNativeSurface(record,node,className){
        if(!record||!node||!node.classList)return;
        node.classList.add(className);record.nativeSurfaces=record.nativeSurfaces||[];
        if(!record.nativeSurfaces.some(function(item){return item.node===node&&item.className===className;}))record.nativeSurfaces.push({node:node,className:className});
    }
    function clearNativeSurfaces(record,className){
        if(!record||!record.nativeSurfaces)return;
        record.nativeSurfaces=record.nativeSurfaces.filter(function(item){if(item.node&&item.node.classList&&(!className||item.className===className))item.node.classList.remove(item.className);return className&&item.className!==className;});
    }
    function scanTransitionSurfaces(record){
        if(!record)return;
        var loadingFound=false;
        if(record.selectionArmed&&record.streamStage==='loading')document.querySelectorAll('.loading-layer,.media-loading--standalone').forEach(function(node){markNativeSurface(record,node,'tc-native-loading');loadingFound=true;});
        if(record.streamFocused&&record.streamView&&record.streamView.isOpen()&&record.streamStage==='search')document.querySelectorAll('.search-box,.search').forEach(function(node){markNativeSurface(record,node,'tc-native-search');});
        if(record.selectionArmed&&record.streamStage==='player')document.querySelectorAll('.player,.youtube-player').forEach(function(node){markNativeSurface(record,node,'tc-native-player');});
        return loadingFound;
    }
    function watchTransitionSurfaces(record){
        var loadingFound=scanTransitionSurfaces(record);if(record.nativeObserver||!document.body||typeof MutationObserver==='undefined'||record.streamStage==='loading'&&loadingFound)return;
        record.nativeObserver=new MutationObserver(function(){var found=scanTransitionSurfaces(record);if(record.streamStage==='loading'&&found)stopWatchingSurfaces(record);});
        record.nativeObserver.observe(document.body,{childList:true,subtree:true});
        // Native Loading.start switches controller immediately, then inserts its
        // generic surface after 500 ms (MediaLoading inserts synchronously). The
        // observer only waits for that surface, not for the duration of playback.
        record.nativeObserverTimer=setTimeout(function(){if(record.nativeObserver){record.nativeObserver.disconnect();record.nativeObserver=null;}record.nativeObserverTimer=0;},record.streamStage==='loading'?1500:10000);
    }
    function stopWatchingSurfaces(record){
        if(!record)return;if(record.nativeObserver){record.nativeObserver.disconnect();record.nativeObserver=null;}
        if(record.nativeObserverTimer){clearTimeout(record.nativeObserverTimer);record.nativeObserverTimer=0;}
    }
    function streamRecord(){return movieRecords.filter(function(r){return r.streamChild&&!r.streamChild.dead&&r.page.classList.contains('activity--active');})[0];}
    function clearStreamFiles(){
        if(!filesOverlay)return;var node=filesOverlay.node;
        node.classList.remove('sh-files-modal','tc-native-torrent-modal');node.querySelectorAll('.sh-files-summary,.sh-file-rating').forEach(function(n){n.remove();});
        Object.keys(filesOverlay.tokens).forEach(function(key){var t=filesOverlay.tokens[key];if(node.style.getPropertyValue(key)===t.ours){if(t.before)node.style.setProperty(key,t.before);else node.style.removeProperty(key);}});filesOverlay=null;
    }
    function ownStreamFilesSurface(record,node){
        if(!record||!node||!node.classList)return;
        if(record.selectionArmed){
            if(record.streamStage!=='player'&&record.streamStage!=='loading')record.streamStage=node.querySelector('.torrent-files')?'files':'torrent';
            markNativeSurface(record,node,'tc-native-torrent-modal');
            return;
        }
        if(record.streamFocused&&record.streamView&&record.streamView.isOpen()&&record.streamStage==='search'&&(node.matches('.search-box,.search')||node.querySelector('.search-box,.search')))markNativeSurface(record,node,'tc-native-search');
    }
    function onStreamFiles(event){
        var record=streamRecord(),node=event&&event.html&&(event.html[0]||event.html);
        ownStreamFilesSurface(record,node);
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
        if(record.streamChild&&record.streamChild.selectedRow)filesOverlay.row=record.streamChild.selectedRow;
        if(!filesOverlay.studios)filesOverlay.studios=[];
        var movie=streamMovie(record);if(summary)summary.textContent=(movie.title||movie.name||'')+' · Файлів: '+node.querySelectorAll('.torrent-serial,.torrent-file').length;
    }
    function onStreamPlaybackError(){var record=streamRecord();if(record&&record.streamChild.started){record.streamStage='player';watchTransitionSurfaces(record);record.streamPane.dataset.state='playback-error';streamStatus(record,'Помилка відтворення · Виберіть реліз повторно або спробуйте інший');}}
    function streamEpisodeDetails(record,params,season,episode,done){
        var seasons=params.seasons||{},current=seasons[season],found=current&&Array.isArray(current.episodes)?current.episodes.filter(function(item){return Number(item.episode_number)===episode&&(item.season_number==null||Number(item.season_number)===season);}):[];
        if(found.length===1)return done(found[0]);
        var source=Lampa.Api&&Lampa.Api.sources&&Lampa.Api.sources.tmdb;if(!source||typeof source.seasons!=='function'||!params.movie)return;
        var key=[params.movie.source||'tmdb',params.movie.id,season].join(':');record.streamSeasonRequests=record.streamSeasonRequests||{};var request=record.streamSeasonRequests[key];
        if(request){if(request.data){var cached=request.data[season];var cachedEpisodes=cached&&cached.episodes||[];var cachedMatch=cachedEpisodes.filter(function(item){return Number(item.episode_number)===episode&&(item.season_number==null||Number(item.season_number)===season);});if(cachedMatch.length===1)done(cachedMatch[0]);}else request.callbacks.push({episode:episode,done:done});return;}
        request=record.streamSeasonRequests[key]={callbacks:[{episode:episode,done:done}],data:null};
        try{source.seasons(params.movie,[season],function(data){request.data=data||{};var seasonData=request.data[season],episodes=seasonData&&seasonData.episodes||[];request.callbacks.splice(0).forEach(function(pending){var match=episodes.filter(function(item){return Number(item.episode_number)===pending.episode&&(item.season_number==null||Number(item.season_number)===season);});if(match.length===1)pending.done(match[0]);});});}catch(e){delete record.streamSeasonRequests[key];}
    }
    function streamEpisodeWatched(record,params,season,episode){
        // Only Trakt+'s fresh, active-account cache of exact watched episodes can
        // authorize a spoiler still. Show completion, local Timeline and TMDb
        // metadata are not episode-level watch evidence.
        var api=window.TraktPlus,movie=params&&params.movie;
        if(!api||typeof api.cachedHomeProgress!=='function'||!movie||!movie.id)return false;
        try{
            var progress=api.cachedHomeProgress({id:movie.id,source:movie.source||'tmdb',media_type:'tv',type:'tv'});
            return !!(progress&&(progress.watched===true||progress.watched===false)&&Array.isArray(progress.episodes)&&progress.episodes.some(function(item){return Number(item.season)===season&&Number(item.episode)===episode;}));
        }catch(e){return false;}
    }
    function restoreStreamEpisodePreview(node){
        var image=node&&node.querySelector('.torrent-serial__img');if(!image)return;
        if(image.getAttribute('data-sh-episode-preview')==='tmdb'){
            var current=image.getAttribute('src'),preview=image.__shEpisodePreviewSrc;
            if(current!==preview)image.__shEpisodePreviewBaseSrc=current;
            var base=image.__shEpisodePreviewBaseSrc;
            if(base==null)image.removeAttribute('src');else image.setAttribute('src',base);
            image.removeAttribute('data-sh-episode-preview');image.__shEpisodePreviewSrc=undefined;
        }
    }
    function clearStreamEpisodePreviews(record){
        if(!record)return;record.streamPreviewSequence=(record.streamPreviewSequence||0)+1;record.streamPreviewEpoch=(record.streamPreviewEpoch||0)+1;
        (record.streamEpisodePreviewNodes||[]).forEach(function(node){if(node)node.__shEpisodePreviewToken=0;restoreStreamEpisodePreview(node);});
        record.streamEpisodePreviewNodes=[];
    }
    function applyStreamEpisodePreview(record,node,params,season,episode){
        if(!node)return;
        var image=node.querySelector('.torrent-serial__img');if(!image)return;
        record.streamEpisodePreviewNodes=record.streamEpisodePreviewNodes||[];
        var currentSrc=image.getAttribute('src');
        if(image.__shEpisodePreviewBaseSrc===undefined||image.getAttribute('data-sh-episode-preview')!=='tmdb'&&currentSrc!==image.__shEpisodePreviewBaseSrc)image.__shEpisodePreviewBaseSrc=currentSrc;
        restoreStreamEpisodePreview(node);
        var trackedIndex=record.streamEpisodePreviewNodes.indexOf(node);if(trackedIndex>=0)record.streamEpisodePreviewNodes.splice(trackedIndex,1);
        var token=(record.streamPreviewSequence||0)+1;record.streamPreviewSequence=token;node.__shEpisodePreviewToken=token;
        if(!streamEpisodeWatched(record,params,season,episode))return;
        var selected=record.streamChild&&record.streamChild.selectedRow,movie=params&&params.movie,identity=[movie&&movie.source||'tmdb',movie&&movie.id,season,episode].join(':'),generation=record.streamPreviewEpoch||0;node.__shEpisodePreviewIdentity=identity;
        streamEpisodeDetails(record,params,season,episode,function(metadata){
            if(!node.isConnected||!record.page.classList.contains('activity--active')||!metadata||!metadata.still_path||Number(metadata.episode_number)!==episode||(metadata.season_number!=null&&Number(metadata.season_number)!==season)||node.__shEpisodePreviewToken!==token||node.__shEpisodePreviewIdentity!==identity||(record.streamPreviewEpoch||0)!==generation)return;
            if(selected&&record.streamChild&&record.streamChild.selectedRow!==selected)return;
            if(!streamEpisodeWatched(record,params,season,episode))return;
            var latestNativeSrc=image.getAttribute('src');if(image.getAttribute('data-sh-episode-preview')!=='tmdb'&&latestNativeSrc!==image.__shEpisodePreviewBaseSrc)image.__shEpisodePreviewBaseSrc=latestNativeSrc;
            var src=Lampa.Api.img(metadata.still_path,'w300');if(!src)return;
            image.setAttribute('src',src);image.__shEpisodePreviewSrc=src;image.setAttribute('data-sh-episode-preview','tmdb');
            if(record.streamEpisodePreviewNodes.indexOf(node)<0)record.streamEpisodePreviewNodes.push(node);
        });
    }
    function applyStreamFileStudios(record,file){
        var modal=filesOverlay,row=modal&&modal.row||record.streamChild&&record.streamChild.selectedRow;
        if(!row||!row.isConnected||!window.TorrentsRedesign||typeof window.TorrentsRedesign.normalizeRelease!=='function')return;
        var raw=[file&&file.title,file&&file.name,file&&file.path].filter(Boolean).join(' ');if(!raw)return;
        var parsed=window.TorrentsRedesign.normalizeRelease({Title:raw}).parsed,names=parsed&&parsed.voiceoverStudios||[];if(!names.length)return;
        row._shVerifiedStudios=row._shVerifiedStudios||[];names.forEach(function(name){if(row._shVerifiedStudios.indexOf(name)<0)row._shVerifiedStudios.push(name);});
        var chip=row.querySelector('[data-ctr-role="studio"]');if(chip)chip.textContent=row._shVerifiedStudios.join(', ');else{delete row._tcSignature;window.LampaTorrentOverlay.decorate(row,row._ctrSource,streamMovie(record),record.kind,record.streamChild.params);}
    }
    function onStreamFile(event){
        var record=streamRecord();if(!record||record.kind!=='tv'||!event||event.type!=='render')return;
        var params=event.params||{},file=event.element||{},node=event.item&&(event.item[0]||event.item);
        if(!node||!params.movie||String(params.movie.id)!==String(streamMovie(record).id))return;
        applyStreamFileStudios(record,file);
        var season=Number(file.season),episode=Number(file.episode);
        if(file.season==null||file.episode==null||!Number.isInteger(season)||season<0||!Number.isInteger(episode)||episode<1||(file.episodes&&file.episodes.length>1))return;
        applyStreamEpisodePreview(record,node,params,season,episode);
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
    function streamHeaderTitle(params){var movie=params.movie||{},title=movie.title||movie.name||movie.original_title||movie.original_name||'Торренти',year=String(movie.release_date||movie.first_air_date||'').slice(0,4),season=Number(params.season||params.filter_season),episode=Number(params.episode||params.filter_episode),parts=[title];if(year)parts.push(year);if(season>0)parts.push('Сезон '+season);if(episode>0)parts.push('Серія '+episode);return parts.join(' · ');}
    function streamStatus(record,text) {if(record.streamStatus)record.streamStatus.textContent=text;}
    function streamResultStatus(st) {
        if(st.error)return 'Парсер недоступний · Оновити — повторна спроба';
        if(st.total===0)return 'Джерел не знайдено';
        if(st.total==null)return 'Джерела';
        var loaded=(st.displayRows||st.rows||[]).length,filter=st.child&&st.child.getFilterData?st.child.getFilterData()||{}:{},season=Array.isArray(filter.season)?filter.season:filter.season==null?[]:[filter.season],quality=Array.isArray(filter.quality)?filter.quality:filter.quality==null?[]:[filter.quality],tracker=window.TorrentsRedesign&&window.TorrentsRedesign.selectedTrackerFilter?window.TorrentsRedesign.selectedTrackerFilter():'all',filtered=season.length>0||quality.length>0||!!st.uaOnly||tracker!=='all';
        var count='Знайдено загалом: '+st.total;
        if(filtered){var scope=[];if(season.length)scope.push('сезон '+season.map(function(value){var n=Number(value);return isFinite(n)?'S'+('0'+n).slice(-2):String(value);}).join(', '));if(quality.length||st.uaOnly||tracker!=='all')scope.push('поточні фільтри');count+=' · '+scope.join(' + ')+': завантажено '+loaded;}
        else if(loaded<st.total)count+=' · завантажено '+loaded+' із '+st.total;
        else count+=' · у списку '+loaded;
        return (st.partial?'Частина парсерів недоступна · ':'')+count;
    }
    function streamSession(){return window.LampaTorrentOverlay?LampaTorrentOverlay.session():String(streamGeneration);}
    function streamAlive(st){var a=Lampa.Activity.active();return running&&!st.dead&&st.record.streamChild===st&&st.session===streamSession()&&a&&a.activity===st.record.activity;}
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
        st.record.streamStage='search';watchTransitionSurfaces(st.record);
        var filter=st.queryFilter=new Lampa.Filter(st.params);
        filter.onBack=function(){disposeStreamQuery(st);setTimeout(function(){if(streamAlive(st)&&Lampa.Controller.enabled().name==='sh_movie_streams'&&!(Lampa.Select.opened&&Lampa.Select.opened()))streamActivate(st.record);},0);};
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
    var raw=source&&(source.Title||source.Name||source.title||source.name)||row.querySelector('.torrent-item__title')?.textContent||'',api=window.TorrentsRedesign,normalized=api&&api.normalizeRelease?api.normalizeRelease(source||{Title:raw}):null,parsed=normalized&&normalized.parsed||parseTitle(raw);
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
        var api=window.TorrentsRedesign,filter=streamTrackerKey(st),movie=st.params.movie||{},nativeFilter=st.child&&st.child.getFilterData?st.child.getFilterData()||{}:{},context=Object.assign({},st.params,nativeFilter),qualityFilter=Array.isArray(nativeFilter.quality)?nativeFilter.quality:[],best=null,bestScore=-Infinity,preferredQuality='1080',seen=Object.create(null);
        try{preferredQuality=Lampa.Storage.get('torrents_cinema_quality','1080')||'1080';}catch(e){}
        st.rows.forEach(function(row){
            var source=st.sourceData.get(row)||row._ctrSource||{Title:row.querySelector('.torrent-item__title')?.textContent||''};
            cinemaRows.decorate(row,source);row.classList.add('sh-cinema-row');
            var view=window.LampaTorrentOverlay?LampaTorrentOverlay.decorate(row,source,movie,st.record.kind,context):null,data=view&&view.data;
            if(!data&&api&&api.normalizeRelease)data=api.normalizeRelease(source);
            if(!data)data=row._ctrData;
            if(!data)return;var hash=String(source.InfoHash||source.infohash||source.hash||'').toLowerCase(),duplicate=/^[a-f0-9]{40}$/.test(hash)&&!!seen[hash];if(/^[a-f0-9]{40}$/.test(hash))seen[hash]=true;row.classList.toggle('sh-duplicate-hidden',metadata.flag('dedupe',false)&&duplicate);row._ctrSource=source;row._ctrData=data;row._shMatch=view&&view.match;bindInline(st,row);
            if(!row._shMatch&&api&&api.releaseMatch)row._shMatch=api.releaseMatch(data,movie,context);
            var matches=(!st.uaOnly||!!data.parsed.audio&&data.parsed.audio.ua)&&(!api||!api.trackerMatches||api.trackerMatches(data.tracker,filter)),qualityMatches=!qualityFilter.length||qualityFilter.some(function(q){q=String(q).toLowerCase();return q==='4k'||q==='2160'?data.parsed.quality==='2160':String(data.parsed.quality)===q.replace(/p$/,'');});row.classList.toggle('sh-tracker-hidden',!matches);row.classList.remove('is-best','sh-source-pick');
            data.sortScore=api&&api.score?api.score(data,row._shMatch,{ua:metadata.flag('ua',true),audio:metadata.flag('ua_audio',true),subs:metadata.flag('ua_subs',true),quality:preferredQuality}):0;
            if(metadata.flag('auto',true)&&(!st.uaOnly||data.parsed.audio&&data.parsed.audio.ua)&&qualityMatches&&!row.hidden&&!row.classList.contains('sh-duplicate-hidden')&&row._shMatch&&api&&api.bestMatchAllowed&&api.bestMatchAllowed(data,movie,row._shMatch)&&data.sortScore>bestScore){best=row;bestScore=data.sortScore;}
        });
        var visible=st.rows.filter(function(row){var data=row._ctrData||{},qualityFilter=st.child&&st.child.getFilterData?st.child.getFilterData().quality:[];qualityFilter=Array.isArray(qualityFilter)?qualityFilter:[];var qualityMatches=!qualityFilter.length||qualityFilter.some(function(q){q=String(q).toLowerCase();return q==='4k'||q==='2160'?data.parsed.quality==='2160':String(data.parsed.quality)===q.replace(/p$/,'');});return !row.hidden&&qualityMatches&&!row.classList.contains('sh-tracker-hidden')&&!row.classList.contains('sh-duplicate-hidden');});
        st.best=best;var ordinary=visible.filter(function(row){return row!==best;});ordinary=api&&api.sortReleaseRows?api.sortReleaseRows(ordinary,streamSortKey()):ordinary.slice();
        var ordered=best?[best].concat(ordinary):ordinary;st.displayRows=best&&api&&api.pinBestRow?api.pinBestRow(ordered,best,true):ordered;
        if(best){
            st.displayRows=st.displayRows.filter(function(row,index){return index===0||row!==best;});
            best.classList.remove('sh-tracker-hidden');
            best.classList.add('is-best','sh-source-pick');
            var label=best.querySelector('.ctr-best'),outside=api&&api.trackerMatches&&!api.trackerMatches(best._ctrData.tracker,filter),reasons=[];
            if(best._shMatch&&best._shMatch.similarity>=.99)reasons.push('точний збіг');
            if(best._ctrData.parsed.audio&&best._ctrData.parsed.audio.ua)reasons.push('українське аудіо');
            if(best._ctrData.tracker)reasons.push(best._ctrData.tracker);
            if(best._ctrData.parsed.quality)reasons.push(best._ctrData.parsed.quality==='2160'?'4K':best._ctrData.parsed.quality+'p');
            if(label)label.textContent=outside?'Найкращий вибір · '+best._ctrData.tracker+' поза фільтром'+(best._ctrData.parsed.audio&&best._ctrData.parsed.audio.ua?' · українське аудіо':''):'Найкращий вибір · '+reasons.slice(0,3).join(' · ');
            if(label)label.textContent='★ Найкращий вибір'+(outside?' · поза фільтром':'');
            best.setAttribute('data-best-outside-filter',outside?'true':'false');
        }
        if(st.pendingSelectionKey){var restored=st.displayRows.find(function(row){return streamRowKey(st.sourceData.get(row)||row._ctrSource)===st.pendingSelectionKey;});if(restored){st.last=restored;st.pendingSelectionKey=null;}}
        var focused=st.last,focusIndex=st.displayRows.indexOf(focused);if(focusIndex>=0&&st.displayRows.length>40&&(focusIndex<st.windowStart||focusIndex>=st.windowStart+40))st.windowStart=Math.floor(focusIndex/20)*20;
        streamWindow(st,st.windowStart);syncStreamTrackerTools(st);
        if(st.expandedRow&&st.displayRows.indexOf(st.expandedRow)<0)collapseInline(st);
        if(focused&&focused.classList&&focused.classList.contains('torrent-item')&&focusIndex<0){focused=st.displayRows[0]||st.trackerButtons&&st.trackerButtons.all||st.sortButton;st.last=focused;}
        if(focused&&st.wantFocus&&streamSelectOwner!==st&&!st.queryFilter)streamFocus(st,focused);
    }
    function decorateStreamRows(st){st.rows.forEach(function(row){var data=st.sourceData.get(row);cinemaRows.decorate(row,data);row.classList.add('sh-cinema-row');});streamUpdateRows(st);}


    var streamSelectOwner=null,streamSelectRestore=null;
    function clearStreamSelect(keepOwner){
        var st=streamSelectOwner;if(!st)return;if(!keepOwner)streamSelectOwner=null;
        if(st.selectNode){st.selectNode.classList.remove('sh-cinema-select');Object.keys(st.selectTokens||{}).forEach(function(key){var entry=st.selectTokens[key];if(st.selectNode.style.getPropertyValue(key)===entry.ours){if(entry.before)st.selectNode.style.setProperty(key,entry.before);else st.selectNode.style.removeProperty(key);}});st.selectNode=null;st.selectTokens=null;}
    }
    function onStreamSelectHide(){
        var st=streamSelectOwner;if(!st)return;
        streamSelectRestore={state:st,node:st.selectNode};st.selectTransition=false;clearStreamSelect();
    }
    function onStreamSelectClose(){
        var pending=streamSelectRestore;if(!pending)return;streamSelectRestore=null;
        if(Lampa.Select.opened&&Lampa.Select.opened()||Lampa.Select.render&&Lampa.Select.render()[0]!==pending.node)return;
        var st=pending.state;
        if(!streamAlive(st)||!st.wantFocus)return;
        var controller=Lampa.Controller.enabled().name;
        if(controller==='select')Lampa.Controller.toggle('sh_movie_streams');
        if(controller==='sh_movie_streams'||controller==='select')streamFocus(st,st.last);
    }
    function onStreamSelect(event){
        streamSelectRestore=null;clearStreamSelect();
        if(Lampa.Controller.enabled().name==='sh_profile')return; // Profile owns its compact native Select surface.
        var record=movieRecords.filter(function(r){return r.streamFocused&&r.streamChild&&!r.streamChild.dead&&r.page.classList.contains('activity--active');})[0];
        if(!record)return;var st=record.streamChild,node=event&&event.html&&(event.html[0]||event.html)||Lampa.Select.render()[0];if(!node)return;
        streamSelectOwner=st;st.selectNode=node;st.selectTokens={};node.classList.add('sh-cinema-select');
        var styles=getComputedStyle(record.page),tokens={'--acc':styles.getPropertyValue('--sm-accent').trim()||'#9775fa','--acc2':styles.getPropertyValue('--sm-accent2').trim()||'#3a74ff','--acc-rgb':styles.getPropertyValue('--sm-accent-rgb').trim()||'151,117,250','--acc2-rgb':styles.getPropertyValue('--sm-accent2-rgb').trim()||'58,116,255','--ctr-head-height':(document.querySelector('.head').getBoundingClientRect().height/innerHeight*100)+'vh'};
        Object.keys(tokens).forEach(function(key){st.selectTokens[key]={before:node.style.getPropertyValue(key),ours:tokens[key]};node.style.setProperty(key,tokens[key]);});
    }
    function setupStreamTools(st){
        if(!st.providerBinding&&window.ParserProviders&&typeof ParserProviders.mount==='function')st.providerBinding=ParserProviders.mount(st.root,{
            isAlive:function(){return running&&!st.dead&&st.record.streamChild===st;},
            onBack:function(){if(streamAlive(st))streamActivate(st.record);},
            beginChange:function(){st.providerChanging=true;},endChange:function(){st.providerChanging=false;},
            onChange:function(){if(st.dead)return;var record=st.record;streamGeneration++;streamCache=[];closeStreamChild(record);loadStreams(record);}
        });
        if(st.tools||!st.root.querySelector('.torrent-filter'))return;
        var tools=document.createElement('div');tools.className='ctr-tools';
        tools.innerHTML='<div class="ctr-tabs"></div><div class="ctr-tabs ctr-tracker-tabs"></div><div class="ctr-menus"></div>';
        st.tools=tools;st.root.classList.add('sh-cinema-explorer');
        function button(label,fn,cls){var n=document.createElement('div');n.className=(cls||'ctr-button')+' selector';n.textContent=label;n.setAttribute('role','button');var entering=false;function run(e){if(entering)return;entering=true;Promise.resolve().then(function(){entering=false;});st.last=n;e.stopImmediatePropagation();fn(n);}n.addEventListener('hover:enter',run);n.addEventListener('click',run);$(n).on('hover:enter.tcCinema',run);return n;}
        ['all','2160','1080','720'].forEach(function(q){var n=button(q==='all'?'Усі':q==='2160'?'4K':q+'p',function(){
            var filter=Object.assign({},st.child.getFilterData()||{});filter.quality=q==='all'?[]:[q==='2160'?'4k':q+'p'];st.child.setFilterData(filter);st.child.applyFilter();streamActivate(st.record);streamFocus(st,n);
        },'ctr-tab');n.dataset.quality=q;tools.querySelector('.ctr-tabs').appendChild(n);});
        var menus=tools.querySelector('.ctr-menus');
        st.uaButton=button('Українське аудіо',function(n){st.uaOnly=!st.uaOnly;n.classList.toggle('is-active',st.uaOnly);n.setAttribute('aria-pressed',String(st.uaOnly));decorateStreamRows(st);streamActivate(st.record);streamFocus(st,n);},'ctr-tab');
        tools.querySelector('.ctr-tabs').appendChild(st.uaButton);
        st.trackerButtons={};
        var allTrackers=button('Усі трекери',function(n){var api=window.TorrentsRedesign;api.storeTrackerFilter('all','');decorateStreamRows(st);streamActivate(st.record);streamFocus(st,n);},'ctr-tab');allTrackers.dataset.tracker='all';tools.querySelector('.ctr-tracker-tabs').appendChild(allTrackers);st.trackerButtons.all=allTrackers;
        [['toloka','Толока'],['mazepa','Мазепа'],['source','Інші']].forEach(function(entry){
            var n=button(entry[1],function(){
                var api=window.TorrentsRedesign;
                function apply(key,name){api.storeTrackerFilter(key.indexOf('source:')===0?'source:':key,name);decorateStreamRows(st);streamActivate(st.record);streamFocus(st,n);}
                if(entry[0]!=='source'){apply(api.selectedTrackerFilter()===entry[0]?'all':entry[0],'');return;}
                var options=api.trackerOptions(st.rows.map(function(row){return row._ctrData||{};})).filter(function(o){return o.key.indexOf('source:')===0;});
            Lampa.Select.show({title:'Інші трекери',items:[{title:'Усі трекери',key:'all'}].concat(options.map(function(o){return {title:o.label+' · '+o.count,key:o.key,name:o.name};})),onSelect:function(o){apply(o.key,o.name);}});
            },'ctr-tab');st.trackerButtons[entry[0]]=n;n.dataset.tracker=entry[0];tools.querySelector('.ctr-tracker-tabs').appendChild(n);
        });st.trackerButton=st.trackerButtons.all;
        st.sortButton=button('Сортування',function(){
            var items=[['recommended','Рекомендований'],['quality','Якість · 4K спочатку'],['seeders','Сіди · найбільше'],['size','Розмір · більший'],['date','Дата · новіші'],['tracker','Толока → Мазепа → інші']].map(function(entry){return {title:entry[1],key:entry[0]};});
            Lampa.Select.show({title:'Сортування релізів',items:items,onSelect:function(item){var api=window.TorrentsRedesign;if(api&&api.storeSort&&api.storeSort(item.key)){st.last=st.sortButton;decorateStreamRows(st);}}});
        });menus.appendChild(st.sortButton);

        var filterMenuButton=button('⚲ Фільтри',function(){
            var items=[['filter','Фільтри / трекери'],['parser','Джерело'],['search','Пошук']].filter(function(x){return st.root.querySelector('.filter--'+x[0]);}).map(function(x){return {title:x[1],native:x[0]};});
            var parsers=st.root.querySelectorAll('.filter--parser');if(st.providerBinding&&parsers.length>1)items.push({title:'Основний / додатковий парсер',node:parsers[parsers.length-1]});
            Lampa.Select.show({title:'Фільтри та джерела',items:items,onSelect:function(item){st.record.streamStage=item.native==='search'?'search':'filter';watchTransitionSurfaces(st.record);(item.node||st.root.querySelector('.filter--'+item.native)).dispatchEvent(new Event('hover:enter'));}});
        });filterMenuButton.dataset.navGroup='filters';menus.appendChild(filterMenuButton);
        var head=st.record.streamPane.querySelector('.sh-stream-head'),before=head.querySelector('.sh-stream-retry');while(menus.firstChild)head.insertBefore(menus.firstChild,before);
        st.root.querySelector('.explorer__files').insertBefore(tools,st.root.querySelector('.explorer__files').firstChild);
    }
    function syncStreamTools(st){
        setupStreamTools(st);if(!st.tools)return;
        var filter=st.child.getFilterData()||{},q=Array.isArray(filter.quality)&&filter.quality.length===1?String(filter.quality[0]).replace('4k','2160').replace('p',''):'all';
        st.tools.querySelectorAll('[data-quality]').forEach(function(n){n.classList.toggle('is-active',n.dataset.quality===q);n.setAttribute('aria-pressed',String(n.dataset.quality===q));});
        syncStreamTrackerTools(st);
    }
    function syncStreamTrackerTools(st){
        if(!st.trackerButtons)return;var api=window.TorrentsRedesign,options=api.trackerOptions(st.rows.map(function(row){return row._ctrData||{};})),selected=api.selectedTrackerFilter(),counts={};options.forEach(function(o){counts[o.key]=o.count;});
        var all=st.trackerButtons.all;all.textContent='Усі трекери · '+st.rows.length;all.classList.toggle('is-active',selected==='all');all.setAttribute('aria-pressed',String(selected==='all'));
        [['toloka','Толока'],['mazepa','Мазепа'],['source','Інші']].forEach(function(entry){var n=st.trackerButtons[entry[0]],count=entry[0]==='source'?options.filter(function(o){return o.key.indexOf('source:')===0;}).reduce(function(sum,o){return sum+o.count;},0):counts[entry[0]]||0,active=entry[0]==='source'?selected.indexOf('source:')===0:selected===entry[0];n.textContent=entry[1]+' · '+count;n.classList.toggle('is-active',active);n.setAttribute('aria-pressed',String(active));});
        st.tools.querySelectorAll('[data-quality]').forEach(function(n){var q=n.dataset.quality,count=st.rows.filter(function(row){return q==='all'||row._ctrData&&row._ctrData.parsed.quality===q;}).length;n.textContent=(q==='all'?'Усі':q==='2160'?'4K':q+'p')+' · '+count;});
        var uaCount=st.rows.filter(function(row){return row._ctrData&&row._ctrData.parsed.audio.ua;}).length;st.uaButton.textContent='🇺🇦 UA · '+uaCount;
        var labels={recommended:'↕ Рекомендовані',quality:'↕ Якість',seeders:'↕ Сіди',size:'↕ Розмір',date:'↕ Дата',tracker:'↕ Трекер'};st.sortButton.textContent=labels[streamSortKey()]||labels.recommended;
    }
    function streamRowKey(source){source=source||{};var hash=String(source.InfoHash||source.infohash||source.hash||'').toLowerCase();return /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(hash)?'hash:'+hash:JSON.stringify([source.Title||source.title||'',source.Tracker||source.tracker||'',source.Size||source.size||'']);}
    function streamSyncRows(st) {
        st.root.querySelectorAll('.torrent-item').forEach(function(row){if(st.rows.indexOf(row)<0)st.rows.push(row);});
        decorateStreamRows(st);syncStreamTools(st);
        if(!st.loading&&st.total!=null)streamStatus(st.record,streamResultStatus(st));
    }
    function streamFocus(st,node) {
        if(!streamAlive(st)||!st.wantFocus||!st.record.streamView?.isOpen())return;
        if(streamSelectOwner===st||st.selectTransition||Lampa.Select.opened&&Lampa.Select.opened())return;
        function usable(n){return !!(n&&n.isConnected&&!n.hidden&&!n.disabled&&n.getAttribute('aria-disabled')!=='true'&&n.offsetParent!==null&&getComputedStyle(n).visibility!=='hidden'&&getComputedStyle(n).display!=='none');}
        var target=usable(node)?node:usable(st.last)?st.last:null;
        if(!target)target=(st.displayRows||st.rows).filter(usable)[0]||Array.prototype.find.call(st.root.querySelectorAll('.ctr-tools .selector,.torrent-filter .selector,.sh-stream-head .selector'),usable);
        if(target){target.scrollIntoView({block:'nearest',inline:'nearest'});if(!usable(target))return;Lampa.Controller.collectionSet(st.record.streamPane,false,true);st.last=target;Lampa.Controller.collectionFocus(target,st.record.streamPane);if(target.classList.contains('torrent-item'))st.selectedRow=target;}
    }
    function streamNavGroups(st){
        function controls(selector){return Array.prototype.filter.call(st.record.streamPane.querySelectorAll(selector),function(n){return !n.hidden&&!n.disabled&&n.getAttribute('aria-disabled')!=='true'&&n.offsetParent!==null;});}
        return [
            controls('.sh-stream-head .selector:not([data-nav-group="filters"])'),
            controls('.ctr-tabs:not(.ctr-tracker-tabs) .selector'),
            controls('.ctr-tracker-tabs .selector'),
            controls('.sh-stream-head [data-nav-group="filters"],.torrent-filter .selector,.parser-providers-toolbar .selector')
        ].filter(function(group){return group.length;});
    }
    function streamMove(record,direction) {
        var st=record.streamChild;if(!st||streamSelectOwner===st||st.selectTransition)return;if(st.loading)st.navigatedWhileLoading=true;
        // The native remote controller may move its `.focus` marker before the
        // overlay's focus listener runs. Use that live marker as the navigation
        // origin so a stale row reference cannot skip the tracker band.
        var focused=st.record.streamPane.querySelector('.focus.selector');
        if(focused&&focused.classList.contains('tc-info'))focused=focused.closest('.torrent-item')||focused;
        if(focused&&focused.offsetParent!==null)st.last=focused;
        var rows=st.displayRows||st.rows,index=rows.indexOf(st.last),groups=streamNavGroups(st),rowIndex=-1;
        if(index>=0){
            if(direction==='right'){streamFocus(st,rows[index].querySelector('.tc-info'));return;}
            if(direction==='left'){streamFocus(st,rows[index]);return;}
            var next=index+(direction==='down'?1:-1);
            if(direction==='down'&&next>=rows.length){st.child.next();next=index+1;}
            if(next<0){var lastGroup=groups[groups.length-1]||[];streamFocus(st,lastGroup[lastGroup.length-1]||record.streamPane.querySelector('.sh-stream-head .selector'));return;}
            if(!rows[next]){streamFocus(st,rows[index]);return;}
            if(next<st.windowStart)streamWindow(st,Math.max(0,st.windowStart-20));
            if(next>=st.windowStart+40)streamWindow(st,st.windowStart+20);
            streamFocus(st,rows[next]);return;
        }
        for(var i=0;i<groups.length;i++)if(groups[i].indexOf(st.last)>=0){rowIndex=i;break;}
        if(rowIndex<0){streamFocus(st,rows[st.windowStart]||groups[0]&&groups[0][0]);return;}
        var group=groups[rowIndex],at=group.indexOf(st.last);
        if(direction==='left'||direction==='right')streamFocus(st,group[Math.max(0,Math.min(group.length-1,at+(direction==='right'?1:-1)))]);
        else if(direction==='up'){var previous=groups[rowIndex-1];if(previous)streamFocus(st,previous[previous.length-1]);}
        else if(direction==='down'){var following=groups[rowIndex+1];streamFocus(st,following?following[0]:rows[st.windowStart]);}
    }

    function streamActivate(record) {
        var st=record.streamChild;if(!st||!streamAlive(st)||!record.streamView?.isOpen())return;
        if(streamSelectOwner===st||st.selectTransition||Lampa.Select.opened&&Lampa.Select.opened())return;
        st.wantFocus=true;record.streamFocused=true;
        var history=st.root.querySelector('.watched-history'),historyBody=history&&history.querySelector('.watched-history__body');if(historyBody)history.classList.toggle('sh-empty-history',historyBody.textContent.trim()===Lampa.Lang.translate('no_watch_history'));
        // Empty.start otherwise replaces start with a page-wide empty controller.
        st.child.start=function(){streamActivate(record);};
        Lampa.Controller.add('sh_movie_streams',{
            toggle:function(){streamFocus(st);},
            up:function(){if(!moveInline(st,'up'))streamMove(record,'up');},down:function(){if(!moveInline(st,'down'))streamMove(record,'down');},left:function(){if(!moveInline(st,'left'))streamMove(record,'left');},right:function(){if(!moveInline(st,'right'))streamMove(record,'right');},back:function(){if(!collapseInline(st))closeStreamOverlay(record,true);}
        });
        Lampa.Controller.toggle('sh_movie_streams');
    }
    function closeStreamChild(record) {
        var st=record.streamChild;if(!st)return;
        clearStreamEpisodePreviews(record);
        collapseInline(st);
        st.rows.forEach(function(row){$(row).off('.tcCinema').find('.tc-info').off('.tcCinema');});
        st.dead=true;st.deferred=null;
        clearStreamFiles();
        if(st.providerBinding){st.providerBinding.destroy();st.providerBinding=null;}
        if(streamSelectOwner===st){clearStreamSelect();Lampa.Select.close();streamInfo(record);}
        st.record.streamPane.querySelectorAll('.sh-stream-head .ctr-button').forEach(function(n){n.remove();});
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
                var active = Lampa.Activity.active(), record = running && active && active.component === 'full' && movieRecords.filter(function (r) { return r.activity === active.activity && r.streamPane && r.page.classList.contains('activity--active'); })[0];
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
        var header=record.streamPane.querySelector&&record.streamPane.querySelector('.sh-stream-head h2');if(header)header.textContent=streamHeaderTitle(params);
        record.streamChild=st;record.streamFocused=true;record.streamLoad.hidden=true;streamStatus(record,'Пошук джерел…');
        var key=window.LampaTorrentOverlay?LampaTorrentOverlay.key(params,record.kind,streamGeneration):[record.kind,params.movie.id,params.search,streamGeneration].join('|');st.key=key;
        try {
            st.child=Lampa.Component.create(params);st.root=st.child.render()[0];st.root.classList.add('sh-stream-explorer');record.streamContent.appendChild(st.root);
            if(window.TorrentsRedesign&&typeof TorrentsRedesign.attachFiles==='function')st.filesBinding=TorrentsRedesign.attachFiles({root:st.root,movie:params.movie,kind:record.kind,component:record.activity.component,isAlive:function(){return streamAlive(st)&&record.streamView.isOpen();}});
            st.child.activity={loader:function(on){if(!streamAlive(st)||!record.streamView?.isOpen())return;st.loading=on;record.streamPane.dataset.state=on?'loading':st.error?'parser-error':st.total===0?'empty':'ready';record.streamPane.setAttribute('aria-busy',on?'true':'false');streamStatus(record,on?'Пошук джерел…':streamResultStatus(st));if(!on){streamSyncRows(st);if(!st.loadedOnce){st.loadedOnce=true;if(!st.navigatedWhileLoading)st.last=st.root.querySelector('.torrent-item')||st.last;}st.child.start=function(){streamActivate(record);};}},toggle:function(){if(!st.dead&&st.wantFocus)streamActivate(record);},render:function(){return $(st.root);}};
            st.child.start=function(){streamActivate(record);};st.child.back=function(){closeStreamOverlay(record,true);};
            var append=st.child.append,reset=st.child.reset,next=st.child.next,applyFilter=st.child.applyFilter;
            st.child.applyFilter=function(){params.page=1;var result=applyFilter.apply(st.child,arguments);streamSyncRows(st);return result;};
            st.onRender=function(event){if(st.appending&&event.type==='render'&&event.item&&event.element)st.sourceData.set(event.item[0]||event.item,event.element);};Lampa.Listener.follow('torrent',st.onRender);
            st.child.append=function(){st.appending=true;try{append.apply(st.child,arguments);}finally{st.appending=false;}streamSyncRows(st);};
            st.child.reset=function(){var selected=st.selectedRow||st.last&&st.last.closest&&st.last.closest('.torrent-item');if(selected)st.pendingSelectionKey=streamRowKey(st.sourceData.get(selected)||selected._ctrSource);collapseInline(st);st.rows.forEach(function(row){$(row).remove();});st.rows=[];st.displayRows=[];st.windowStart=0;return reset.apply(st.child,arguments);};
            st.child.next=function(){if(!streamAlive(st)||st.windowing||!st.wantFocus)return;var focused=st.last;next.apply(st.child,arguments);if((st.displayRows||st.rows).length>st.windowStart+40){streamWindow(st,st.windowStart+20);if(focused&&focused.isConnected)streamFocus(st,focused);}};
            st.onFocus=function(event){var node=event.target.closest('.selector');if(node&&st.root.contains(node)){st.last=node;if(node.classList.contains('torrent-item'))st.selectedRow=node;}};
            st.onEnter=function(event){
                if(inlineEnter(st,event))return;
                if(event.target.closest('.torrent-item')){
                    armRelease(st,event.target.closest('.torrent-item'));
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
        stopWatchingSurfaces(record);clearNativeSurfaces(record);record.selectionArmed=false;record.streamStage='idle';
        if(Lampa.Controller.enabled().name==='sh_movie_streams')streamInfo(record);
        closeStreamOverlay(record,false);closeStreamChild(record);
        $(record.streamPane).off('.tcCinema');
        record.streamPane.removeEventListener('hover:enter',record.streamEnter,true);record.streamPane.removeEventListener('click',record.streamClick);
        record.page.removeEventListener('hover:enter',record.streamEnter,true);record.streamPane.removeEventListener('hover:focus',record.streamPaneFocus,true);
        if(record.streamView){record.streamView.destroy();record.streamView=null;}else record.streamPane.remove();record.streamPane=null;
        record.page.classList.remove('sh-has-streams');
        record.moves.reverse().forEach(function(m){if(m.parent&&m.node.parentNode)m.parent.insertBefore(m.node,m.next&&m.next.parentNode===m.parent?m.next:null);});record.moves=[];
        if(record.activity.component.pause===record.streamPause)record.activity.component.pause=record.originalPause;
        if(record.streamInfoController&&record.streamInfoController.down===record.streamDown)record.streamInfoController.down=record.originalInfoDown;
    }
    function setupStreams(record) {
        if(!metadata.enabled()||record.streamPane||!Lampa.Storage.field('parser_use')||!window.lampa_settings.torrents_use||!window.LampaTorrentOverlay)return;
        var action=record.root.querySelector('.view--torrent'),bar=record.root.querySelector('.full-start-new__buttons');
        // Core keeps optional actions in a hidden template pool. Buttons+ used to move it.
        // Move the existing node once, preserving every handler; restore it with the theme.
        if(action&&bar&&action.closest('.buttons--container.hide')){
            record.moves.push({node:action,parent:action.parentNode,next:action.nextSibling});bar.appendChild(action);
        }
        installStreamRoutes();
        var pane=document.createElement('section');pane.className='sh-streams';pane.setAttribute('aria-label','Торрентні джерела');pane.setAttribute('aria-busy','false');
        pane.innerHTML='<div class="sh-stream-head"><h2>Торренти</h2><div class="sh-stream-retry selector" role="button" title="Повторити пошук">Оновити</div><div class="sh-stream-close selector" role="button" aria-label="Закрити торренти">Закрити · Back</div></div><div class="sh-stream-status" role="status">Джерела завантажуються лише після відкриття</div><div class="sh-stream-load selector" role="button">Показати джерела</div><div class="sh-stream-content"></div>';
        record.streamPane=pane;record.streamContent=pane.querySelector('.sh-stream-content');record.streamStatus=pane.querySelector('.sh-stream-status');record.streamLoad=pane.querySelector('.sh-stream-load');record.page.classList.add('sh-has-streams');
        record.streamView=LampaTorrentOverlay.create(pane,record.page);
        pane.querySelector('h2').textContent='Торренти · '+streamHeaderTitle(streamParams(record));
        record.streamEnter=function(event){
            if(event.target.closest('.view--torrent')&&record.root.contains(event.target)){event.stopImmediatePropagation();loadStreams(record);}
            else if(event.target.closest('.sh-stream-close')){event.stopImmediatePropagation();closeStreamOverlay(record,true);}
            else if(event.target===record.streamLoad){event.stopImmediatePropagation();loadStreams(record);}
            else if(event.target.closest('.sh-stream-retry')){event.stopImmediatePropagation();if(window.ParserProviders&&window.ParserProviders.retry)window.ParserProviders.retry();var key=record.streamChild&&record.streamChild.key;streamCache=streamCache.filter(function(item){return item.key!==key;});closeStreamChild(record);loadStreams(record);}
        };
        record.page.addEventListener('hover:enter',record.streamEnter,true);
        pane.addEventListener('hover:enter',record.streamEnter,true);
        $(pane).on('hover:enter.tcCinema','.sh-stream-head .selector,.sh-stream-load',record.streamEnter);
        record.streamClick=function(event){var button=event.target.closest('.sh-stream-head .selector,.sh-stream-load');if(button)button.dispatchEvent(new Event('hover:enter',{bubbles:true}));};pane.addEventListener('click',record.streamClick);
        record.streamPaneFocus=function(event){if(record.streamChild){var node=event.target.closest('.selector');if(node)record.streamChild.last=node;}};record.streamPane.addEventListener('hover:focus',record.streamPaneFocus,true);
        record.originalPause=record.activity.component.pause;
        record.streamPause=function(){closeStreamOverlay(record,false);closeStreamChild(record);record.streamFocused=false;return record.originalPause&&record.originalPause.apply(this,arguments);};
        record.activity.component.pause=record.streamPause;
        onStreamController({name:Lampa.Controller.enabled().name});
    }
    function onStreamController(event) {
        if(!event)return;
        var record=movieRecords.filter(function(r){return r.page.classList.contains('activity--active')&&r.streamPane;})[0];if(!record)return;
        var previousStage=record.streamStage;
        if(streamSelectRestore&&event.name!=='select'){
            var pending=streamSelectRestore;streamSelectRestore=null;
            if(event.name==='sh_movie_streams'&&!Lampa.Select.opened()&&streamAlive(pending.state)&&pending.state.wantFocus)streamFocus(pending.state,pending.state.last);
        }
        if(record.selectionArmed&&event.name==='loading'){record.streamStage='loading';watchTransitionSurfaces(record);}
        if(record.selectionArmed&&['player','player_video','youtube'].indexOf(event.name)>=0){record.streamStage='player';watchTransitionSurfaces(record);}
        if(record.streamFocused&&record.streamView&&record.streamView.isOpen()&&['search','keyboard'].indexOf(event.name)>=0){record.streamStage='search';watchTransitionSurfaces(record);}
        if(previousStage==='loading'&&event.name!=='loading'){stopWatchingSurfaces(record);clearNativeSurfaces(record,'tc-native-loading');if(record.streamStage==='loading')record.streamStage='files';}
        var settingsWasOwned=!!(record.nativeSurfaces&&record.nativeSurfaces.some(function(item){return item.className==='tc-native-settings';}));
        if(record.streamFocused&&record.streamView&&record.streamView.isOpen()){
            if(/settings/.test(event.name))document.querySelectorAll('.settings').forEach(function(node){markNativeSurface(record,node,'tc-native-settings');});
            else if(record.nativeSurfaces&&record.nativeSurfaces.some(function(item){return item.className==='tc-native-settings';}))clearNativeSurfaces(record,'tc-native-settings');
        }
        if(settingsWasOwned&&event.name==='head'){
            var settingsState=record.streamChild;
            if(settingsState&&settingsState.wantFocus&&record.streamView&&record.streamView.isOpen()&&streamAlive(settingsState))streamActivate(record);
            return;
        }
        if(!['full_start','content'].includes(event.name))return;
        // Native player/Files return may activate the underlying detail controller.
        // A visible overlay must retain remote ownership; leave inner menus/player alone.
        var st=record.streamChild;
        if(st&&st.wantFocus&&streamSelectOwner!==st&&!st.selectTransition&&record.streamView&&record.streamView.isOpen()&&streamAlive(st)){
            streamActivate(record);return;
        }
        if(event.name!=='full_start')return;
        var controller=Lampa.Controller.enabled().controller;

        if(controller.down===record.streamDown)return;
        record.streamInfoController=controller;record.originalInfoDown=controller.down;
        // Preserve native Down to cast/recommendations; sources open through the real torrent action.
        record.streamDown=controller.down;
    }
    function onStreamProfile(){streamGeneration++;streamCache=[];clearStreamSelect();streamSelectRestore=null;movieRecords.forEach(function(record){record.selectionArmed=false;record.streamStage='idle';stopWatchingSurfaces(record);clearNativeSurfaces(record);clearStreamEpisodePreviews(record);closeStreamOverlay(record,false);closeStreamChild(record);});}
    function onStreamSettings(event) {
        if(event&&/^(account|account_user|account_email)$/.test(event.name)){onStreamProfile();return;}
        if(event&&/^(jackett_|prowlarr_|parser_|parse_|ps_|bat_)/.test(event.name)){if(movieRecords.some(function(r){return r.streamChild&&r.streamChild.providerChanging;}))return;streamGeneration++;streamCache=[];movieRecords.forEach(function(r){closeStreamOverlay(r,false);closeStreamChild(r);});}
    }


    function collapseInline(st){
        var row=st&&st.expandedRow;if(!row)return false;
        var details=row.querySelector('.tc-details'),info=row.querySelector('.tc-info');if(details)details.hidden=true;if(info)info.setAttribute('aria-expanded','false');
        st.expandedRow=null;streamFocus(st,row);return true;
    }
    function toggleInline(st,row){
        if(st.expandedRow===row){collapseInline(st);return;}
        collapseInline(st);st.expandedRow=row;row.querySelector('.tc-details').hidden=false;row.querySelector('.tc-info').setAttribute('aria-expanded','true');streamFocus(st,row.querySelector('.tc-info'));
    }
    function inlineEnter(st,event){
        var control=event.target.closest('.tc-info');if(!control)return false;
        event.stopImmediatePropagation();if(event.preventDefault)event.preventDefault();toggleInline(st,control.closest('.torrent-item'));return true;
    }
    function armRelease(st,row){
        st.started=true;st.selectedRow=row;
        st.record.selectionArmed=true;st.record.streamStage='torrent';
        Lampa.Torrent.back(function(){if(streamAlive(st)&&st.record.streamView.isOpen()){st.record.selectionArmed=false;st.record.streamStage='idle';stopWatchingSurfaces(st.record);clearNativeSurfaces(st.record);streamActivate(st.record);}});
    }
    function bindInline(st,row){
        $(row).find('.tc-info').off('.tcCinema').on('hover:enter.tcCinema click.tcCinema',function(event){inlineEnter(st,event);});
        // Core remote OK is a jQuery event and does not reach DOM capture listeners.
        $(row).off('hover:enter.tcCinema').on('hover:enter.tcCinema',function(event){if(event.target===row)armRelease(st,row);});
    }
    function moveInline(st,direction){
        var n=st.last;if(!n||!n.closest)return false;var control=n.closest('.tc-info');if(!control)return false;
        var row=control.closest('.torrent-item');
        if(direction==='left')streamFocus(st,row);
        else if(direction==='up'||direction==='down'){st.last=row;streamMove(st.record,direction);}
        return true;
    }
    function subscribe(owner,event,callback){if(!owner||typeof owner.follow!=='function')return;owner.follow(event,callback);subscriptions.push(function(){owner.remove(event,callback);});}
    function adapt(){
        frame=0;if(!running)return;
        var activities=Lampa.Activity.all();movieRecords.slice().forEach(function(record){if(!record.page.isConnected||!activities.some(function(a){return a.activity===record.activity;})){removeStreams(record);movieRecords.splice(movieRecords.indexOf(record),1);}});
        var active=Lampa.Activity.active();if(!active||active.component!=='full'||!active.activity)return;
        var page=active.activity.render()[0],root=page.querySelector('.full-start-new');if(!root)return;
        var record=movieRecords.filter(function(r){return r.root===root;})[0];
        if(!record){record={root:root,page:page,activity:active.activity,kind:active.method==='tv'?'tv':'movie',moves:[]};movieRecords.push(record);}
        setupStreams(record);
    }
    function schedule(){if(running&&!frame)frame=requestAnimationFrame(adapt);}
    function fileEvent(event){
        if(!running||!event||event.type!=='render')return;
        onStreamFile(event);
        var node=event.item&&(event.item[0]||event.item),st=metadata.overlayState();
        if(node&&event.element&&st&&metadata.fileOwnerMatches(event,st.movie,st.kind))metadata.ratingNode(st,node,{season:event.element.season,episode:event.element.episode,ambiguous:!!(event.element.episodes&&event.element.episodes.length>1),verified:metadata.verifiedEpisode(event),filmVerified:st.kind!=='movie'||metadata.filmFileMatches(event,st.movie),path:event.element.path||''});
    }
    function onFilesClose(){var st=metadata.overlayState();if(st)metadata.clearFileRatings(st);var record=streamRecord();clearStreamFiles();if(!record||!record.selectionArmed)return;
        clearNativeSurfaces(record,'tc-native-torrent-modal');
        // Files can close before the transport starts native Loading. Keep the
        // release armed until Controller's native transition identifies Loading,
        // player, Files return, or the registered Torrent.back callback runs.
    }
    function start(){
        if(running)return;running=true;
        subscribe(Lampa.Listener,'activity',schedule);subscribe(Lampa.Listener,'full',schedule);
        subscribe(Lampa.Controller.listener,'toggle',onStreamController);
        subscribe(Lampa.Modal.listener,'fullshow',onStreamFiles);subscribe(Lampa.Modal.listener,'update',onStreamFiles);subscribe(Lampa.Modal.listener,'close',onFilesClose);
        subscribe(Lampa.Listener,'torrent_file',fileEvent);
        if(Lampa.PlayerVideo)subscribe(Lampa.PlayerVideo.listener,'error',onStreamPlaybackError);
        subscribe(Lampa.Select.listener,'fullshow',onStreamSelect);subscribe(Lampa.Select.listener,'hide',onStreamSelectHide);subscribe(Lampa.Select.listener,'close',onStreamSelectClose);
        subscribe(Lampa.Storage.listener,'change',onStreamSettings);
        if(Lampa.Account)subscribe(Lampa.Account.listener,'profile_select',onStreamProfile);
        if(Lampa.Search)subscribe(Lampa.Search.listener,'sources',onStreamProfile);
        schedule();
    }
    function stop(){
        if(frame){cancelAnimationFrame(frame);frame=0;}
        movieRecords.slice().forEach(removeStreams);movieRecords=[];streamSelectRestore=null;streamSelectOwner=null;
        removeStreamRoutes();clearStreamFiles();clearStreamSelect();streamCache=[];streamGeneration++;
        subscriptions.splice(0).reverse().forEach(function(remove){remove();});running=false;
        var style=document.getElementById('torrent-cinema-style');if(style)style.remove();
    }
    return {start:start,stop:stop,invalidate:onStreamProfile,refresh:function(){movieRecords.forEach(function(record){if(record.streamChild)streamSyncRows(record.streamChild);});},status:function(){return {running:running,records:movieRecords.length,subscriptions:subscriptions.length,children:movieRecords.filter(function(r){return !!r.streamChild;}).length,cacheEntries:streamCache.length};}};

}
