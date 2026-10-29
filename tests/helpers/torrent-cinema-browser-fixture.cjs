'use strict';
// Runs ONLY in the existing authorized Lampa tab, behind shadow Web Storage.
// No replacement application/HTML page, account request, real torrent or player.
module.exports=function installFixture(){
    const L=Lampa,qa=window.__tcQa={mode:'ready',parserCalls:0,pending:[],selected:null,returnFn:null};
    qa.activityPushes=[];qa.originalActivityPush=L.Activity.push;L.Activity.push=function(params){if(params&&params.component==='torrents'){const active=L.Activity.active(),fullMovie=active?.activity?.component?.props?.get?.('movie'),page=active?.activity?.render?.()[0];qa.activityPushes.push({component:params.component,movieId:params.movie?.id||null,source:params.movie?.source||null,mediaType:params.movie?.media_type||null,search:params.search||'',activeComponent:active?.component||null,activeCardId:active?.card?.id||null,fullMovieId:fullMovie?.id||null,pageActive:!!page?.classList?.contains('activity--active'),diagnostics:LampaTorrentCinema.diagnostics(),hasStreamPane:!!document.querySelector('.sh-streams')});}return qa.originalActivityPush.apply(this,arguments);};
    // Isolated browser context only: enable the same feature prerequisites as the owner's configured install.
    L.Storage.set('parser_use',true);window.lampa_settings=window.lampa_settings||{};window.lampa_settings.torrents_use=true;
    qa.originalComponentCreate=L.Component.create;
    L.Component.create=function(params){
        const child=qa.originalComponentCreate.apply(this,arguments);
        if(params&&params.component==='torrents')qa.lastTorrentChild=child;
        if(params&&params.component==='torrents'&&qa.pendingSelectedSeason!=null&&typeof child.setFilterData==='function'){
            child.setFilterData({season:[String(qa.pendingSelectedSeason)],voice:[],tracker:[]});
            qa.lastNativeSeasonFilter=child.getFilterData();qa.pendingSelectedSeason=null;
        }
        return child;
    };
    // Test-only setting override is held by the runner's shadow Storage and
    // keeps the existing user's filter out of fixture assumptions.
    L.Storage.set('torrents_cinema_tracker','all');
    const movie={id:99117001,title:'Тиха орбіта',original_title:'Silent Orbit',media_type:'movie',source:'tmdb',release_date:'2024-01-01',overview:'Контрольний фільм для перевірки Torrent Cinema. Метадані релізів синтетичні; відтворення не запускається.',genres:[],runtime:112,vote_average:7.5,images:{logos:[]},production_companies:[],production_countries:[],origin_country:[],spoken_languages:[],status:'Released'};
    qa.movie=movie;qa.originalFull=L.Api.full;qa.originalParser=L.Parser.get;
    L.Api.full=function(params,done){
        if(Number(params.id||params.card?.id)!==movie.id)return qa.originalFull.apply(this,arguments);
        setTimeout(()=>done({movie,persons:{cast:[],crew:[]},collection:null,recomend:{results:[]},simular:{results:[]},videos:{results:[]},discuss:{result:[]}}),10);
    };
    qa.results=Array.from({length:12},(_,i)=>({
        Title:`Silent Orbit (2024) ${['2160p WEB-DL HDR HEVC Ukr Eng','1080p BluRay Ukr Eng','1080p WEB-DL Eng','720p WEBRip Ukr','1080p WEB-DL','2160p HDR10 DV Eng'][i%6]} ${i>5?'Extended Edition Дуже довга назва релізу 葬送のフリーレン':''}`,
        Tracker:['toloka.to','mazepa.to','other.example'][i%3],Size:(18-i)*1024**3,Seeders:i===4?0:120-i*7,Peers:i*2,
        InfoHash:String(i+1).padStart(40,'0'),MagnetUri:'magnet:?xt=urn:btih:'+String(i+1).padStart(40,'0'),hash:String(i+1).padStart(40,'0'),
        AudioLanguages:['uk','en'],SubtitleLanguages:i%2?['uk']:['en'],VoiceoverStudio:i%3===0?'Контрольна студія':'',
        Quality:['4k','1080p','1080p','720p','1080p','4k'][i%6],PublishDate:'2024-02-01'
    }));
    qa.baseMovie=Object.assign({},movie);qa.baseResults=JSON.parse(JSON.stringify(qa.results));
    qa.restoreMovie=function(){delete movie.number_of_seasons;delete movie.seasons;Object.assign(movie,qa.baseMovie);qa.results=JSON.parse(JSON.stringify(qa.baseResults));L.Storage.set('torrents_filter',{season:[],voice:[],tracker:[]});qa.push();};
    qa.installSeries=function(){
        Object.assign(movie,{id:99117002,media_type:'tv',title:'Нічний архів',original_title:'Night Archive',name:'Нічний архів',original_name:'Night Archive',first_air_date:'2021-01-01'});
        qa.results=[{Title:'Нічний архів / Night Archive — 夜のアーカイブ — 별빛 항로 — S02E01-E03 2024 1080p WEB-DL HEVC Ukr Eng DVO',Tracker:'toloka.to',Size:7340032000,Seeders:84,Peers:11,InfoHash:'9'.repeat(40),MagnetUri:'magnet:?xt=urn:btih:'+'9'.repeat(40),hash:'9'.repeat(40),AudioLanguages:['uk','en'],SubtitleLanguages:['uk'],VoiceoverStudio:'Студія Переклад / Studio Переклад',Quality:'1080p',PublishDate:'2024-02-01'}];
        qa.push();
    };
    qa.installSeasonContext=function(){
        Object.assign(movie,{id:99117003,media_type:'tv',title:'Атака титанів',original_title:'Attack on Titan',name:'Атака титанів',original_name:'Attack on Titan',first_air_date:'2013-04-07',release_date:undefined,number_of_seasons:4});
        qa.results=[{Title:'Attack on Titan (2018) S02E01-E12 1080p WEB-DL HEVC Ukr Eng',Tracker:'toloka.to',Size:7340032000,Seeders:84,Peers:11,InfoHash:'3'.repeat(40),MagnetUri:'magnet:?xt=urn:btih:'+'3'.repeat(40),hash:'3'.repeat(40),AudioLanguages:['uk','en'],SubtitleLanguages:['uk'],VoiceoverStudio:'ТакТреба',Quality:'1080p',PublishDate:'2018-04-01'}];
        qa.push();
    };
    qa.installCoverageContext=function(){
        Object.assign(movie,{id:99117004,media_type:'tv',title:'Надприродне',original_title:'Supernatural',name:'Надприродне',original_name:'Supernatural',first_air_date:'2005-09-13',release_date:undefined,number_of_seasons:15,seasons:Array.from({length:15},(_,i)=>({season_number:i+1,name:'Season '+(i+1),air_date:(2005+i)+'-09-01',episode_count:22}))});
        qa.results=[
            {Title:'Supernatural S08E01-E23 2012 1080p WEB-DL Ukr',Tracker:'toloka.to',Size:7340032000,Seeders:84,Peers:11,InfoHash:'8'.repeat(40),MagnetUri:'magnet:?xt=urn:btih:'+'8'.repeat(40),hash:'8'.repeat(40),AudioLanguages:['uk'],SubtitleLanguages:['uk'],Quality:'1080p',PublishDate:'2012-10-01'},
            {Title:'Supernatural S01-S15 Complete Collection 1080p BluRay',Tracker:'mazepa.to',Size:73400320000,Seeders:184,Peers:31,InfoHash:'a'.repeat(40),MagnetUri:'magnet:?xt=urn:btih:'+'a'.repeat(40),hash:'a'.repeat(40),AudioLanguages:['en'],SubtitleLanguages:['uk'],Quality:'1080p',PublishDate:'2020-01-01'},
            {Title:'Supernatural S01-S03 Collection 720p WEB-DL',Tracker:'other.example',Size:17340000000,Seeders:24,Peers:5,InfoHash:'b'.repeat(40),MagnetUri:'magnet:?xt=urn:btih:'+'b'.repeat(40),hash:'b'.repeat(40),AudioLanguages:['en'],SubtitleLanguages:[],Quality:'720p',PublishDate:'2010-01-01'},
            {Title:'Supernatural Complete Series 1080p',Tracker:'other.example',Size:53400000000,Seeders:14,Peers:2,InfoHash:'c'.repeat(40),MagnetUri:'magnet:?xt=urn:btih:'+'c'.repeat(40),hash:'c'.repeat(40),AudioLanguages:['en'],SubtitleLanguages:[],Quality:'1080p',PublishDate:'2020-01-01'}
        ];qa.push();
    };
    qa.installLongSeasonContext=function(){
        Object.assign(movie,{id:99117005,media_type:'tv',title:'Long Archive',original_title:'Long Archive',name:'Long Archive',original_name:'Long Archive',first_air_date:'1977-01-01',release_date:undefined,number_of_seasons:47,seasons:Array.from({length:47},(_,i)=>({season_number:i+1,name:'Season '+(i+1),air_date:(1977+i)+'-01-01',episode_count:12}))});
        qa.results=[{Title:'Long Archive S47E01-E12 2023 1080p WEB-DL',Tracker:'toloka.to',Size:7340032000,Seeders:84,Peers:11,InfoHash:'d'.repeat(40),MagnetUri:'magnet:?xt=urn:btih:'+'d'.repeat(40),hash:'d'.repeat(40),AudioLanguages:['uk'],SubtitleLanguages:['uk'],Quality:'1080p',PublishDate:'2023-01-01'}];qa.push();
    };
    qa.selectSeasonForNextOpen=function(season){qa.pendingSelectedSeason=season;};
    qa.installCase=function(testCase){
        const mediaId=99117010+testCase.index,metadataName=testCase.metadataName||'Catalog Alias MUST NOT APPEAR';
        Object.assign(movie,{id:mediaId,media_type:testCase.kind==='tv'?'tv':'movie',title:metadataName,original_title:metadataName,name:metadataName,original_name:metadataName,release_date:testCase.premiere||'2024-01-01',first_air_date:testCase.premiere||'2024-01-01'});
        qa.results=[Object.assign({Tracker:'toloka.to',Size:7340032000,Seeders:84,Peers:11,InfoHash:String(mediaId).padStart(40,'0'),MagnetUri:'magnet:?xt=urn:btih:'+String(mediaId).padStart(40,'0'),hash:String(mediaId).padStart(40,'0'),AudioLanguages:testCase.audio||[],SubtitleLanguages:testCase.subtitles||[],VoiceoverStudio:testCase.studio||'',Quality:testCase.quality||'',PublishDate:'2024-02-01'},testCase.source)];
        qa.push();
    };
    L.Parser.get=function(params,done,fail){
        if(Number(params.movie?.id)!==movie.id)return qa.originalParser.apply(this,arguments);
        qa.parserCalls++;const mode=qa.mode;
        function deliver(){if(mode==='error')fail('controlled offline provider');else done({Results:mode==='empty'?[]:JSON.parse(JSON.stringify(qa.results))});}
        if(mode==='delayed')qa.pending.push(deliver);else setTimeout(deliver,80);
    };
    // Keep native Torrent.start, Loading, Template, Files, Modal and their
    // controllers. Only the TorrServer wire methods and final Player.play call
    // are shadowed; no live server or media is contacted.
    qa.transportMode='success';qa.playRequested=null;
    qa.originalBack=L.Torrent.back;
    L.Torrent.back=function(fn){qa.returnFn=fn;return qa.originalBack.apply(this,arguments);};
    qa.setTransportMode=function(mode){qa.transportMode=String(mode||'success');};
    qa.originalTorserver={url:L.Torserver.url,connected:L.Torserver.connected,hash:L.Torserver.hash,files:L.Torserver.files,ip:L.Torserver.ip,stream:L.Torserver.stream};
    L.Torserver.url=()=> 'http://tc-fixture.invalid';
    L.Torserver.ip=()=> 'tc-fixture.invalid';
    L.Torserver.connected=function(done,fail){if(qa.transportMode==='server-failure')return setTimeout(()=>fail&&fail('controlled fixture failure'),20);setTimeout(()=>done&&done(),20);};
    L.Torserver.hash=function(params,done){setTimeout(()=>done({hash:'a'.repeat(40)}),20);};
    L.Torserver.files=function(hash,done){setTimeout(()=>done({file_stats:[{id:1,path:'Silent.Orbit.2024.mkv',path_human:'Silent Orbit (2024).mkv',length:19327352832}]}),qa.transportMode==='delayed-files'?800:30);};
    L.Torserver.stream=function(path,hash,id){return 'http://tc-fixture.invalid/preload/'+encodeURIComponent(qa.transportMode)+'/'+id+'?preload';};
    qa.originalPlayerPlay=L.Player.play;L.Player.play=function(element){qa.playRequested={title:element.title,urlHost:new URL(element.url).hostname};};
    if(L.Account?.Permit){qa.originalPermit=L.Account.Permit;qa.account={id:'qa117-account',profile:{id:'qa117-a'}};const permit=Object.create(qa.originalPermit);Object.defineProperty(permit,'account',{value:qa.account});L.Account.Permit=permit;qa.isolatedAccount=L.Account.Permit===permit;}
    // Hide only the pre-existing host delivery toast for feature screenshots.
    // Its failure diagnostics are captured separately; no source error is ignored.
    const noty=L.Noty.render();qa.hiddenToast=!!noty?.length;if(noty?.css)noty.css('visibility','hidden');
    qa.push=()=>L.Activity.push({component:'full',id:movie.id,method:movie.media_type==='tv'?'tv':'movie',source:'tmdb',card:movie});qa.push();
};
