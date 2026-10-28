'use strict';
// Runs ONLY in the existing authorized Lampa tab, behind shadow Web Storage.
// No replacement application/HTML page, account request, real torrent or player.
module.exports=function installFixture(){
    const L=Lampa,qa=window.__tcQa={mode:'ready',parserCalls:0,pending:[],selected:null,returnFn:null};
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
        AudioLanguages:i===4?[]:i%3===0?['uk','en']:['en'],SubtitleLanguages:i%2?['uk']:['en'],VoiceoverStudio:i%3===0?'Контрольна студія':'',
        Quality:['4k','1080p','1080p','720p','1080p','4k'][i%6],PublishDate:'2024-02-01'
    }));
    qa.baseMovie=Object.assign({},movie);qa.baseResults=JSON.parse(JSON.stringify(qa.results));
    qa.restoreMovie=function(){delete movie.number_of_seasons;Object.assign(movie,qa.baseMovie);qa.results=JSON.parse(JSON.stringify(qa.baseResults));L.Storage.set('torrents_filter',{season:[],voice:[],tracker:[]});qa.push();};
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
    // Replace only the transport entry for synthetic releases. Native row OK,
    // Template, Modal/controller and the return callback remain exercised.
    qa.originalStart=L.Torrent.start;qa.originalBack=L.Torrent.back;
    L.Torrent.back=function(fn){qa.returnFn=fn;return qa.originalBack.apply(this,arguments);};
    L.Torrent.start=function(element){
        if(!qa.results.some(row=>row.InfoHash===element.InfoHash))throw Error('Refusing a non-fixture torrent selection');
        qa.selected={title:element.Title,hash:element.InfoHash,magnet:element.MagnetUri};
        const body=$('<div class="torrent-files"></div>');
        const file=L.Template.get('torrent_file',{title:'Silent Orbit (2024).mkv',size:'18 ГБ',exe:'MKV'});body.append(file);
        L.Modal.open({title:'Файли · контрольна відповідь',html:body,onBack:function(){L.Modal.close();const callback=qa.returnFn;qa.returnFn=null;if(callback)callback();}});
    };
    if(L.Account?.Permit){qa.originalPermit=L.Account.Permit;qa.account={id:'qa117-account',profile:{id:'qa117-a'}};const permit=Object.create(qa.originalPermit);Object.defineProperty(permit,'account',{value:qa.account});L.Account.Permit=permit;qa.isolatedAccount=L.Account.Permit===permit;}
    // Hide only the pre-existing host delivery toast for feature screenshots.
    // Its failure diagnostics are captured separately; no source error is ignored.
    const noty=L.Noty.render();qa.hiddenToast=!!noty?.length;if(noty?.css)noty.css('visibility','hidden');
    qa.push=()=>L.Activity.push({component:'full',id:movie.id,method:movie.media_type==='tv'?'tv':'movie',source:'tmdb',card:movie});qa.push();
};
