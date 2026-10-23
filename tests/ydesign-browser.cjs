'use strict';
// Existing CDP tab; synthetic Storage/Favorite/Timeline/Trakt/metadata only.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),baseline=process.argv.includes('--baseline'),finalPass=process.argv.includes('--final'),out=path.join(root,'audit/issue-8');fs.mkdirSync(out,{recursive:true});
const sha=cp.execFileSync('git',['rev-parse',baseline?'fcc148f':'HEAD'],{cwd:root,encoding:'utf8'}).trim(),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const sourceKey=u=>u.pathname.endsWith('/stremio-hybrid.js')?'/ui/stremio-hybrid.js':Object.keys(files).find(k=>u.pathname.endsWith(k));
const files=Object.fromEntries(['ui/design-optimized.js','ui/stremio-hybrid.js','trakt/trakt-plus.js'].map(p=>['/'+p,baseline?cp.execFileSync('git',['show','fcc148f:'+p],{cwd:root,encoding:'utf8'}):fs.readFileSync(path.join(root,p),'utf8')]));
(async()=>{
 const report={baseline,commit:sha,checks:[],errors:[],sources:{},metrics:{},blocked:['Physical Google TV','Real player return/live accounts']};
 const check=(name,ok,data)=>report.checks.push({name,status:ok?'PASS':'FAIL',...(data===undefined?{}:{data})});
 const browser=await chromium.connectOverCDP('http://127.0.0.1:9222'),page=browser.contexts()[0].pages().find(p=>p.url().startsWith('https://siaivo.isroot.in/'));if(!page)throw Error('Existing Lampa tab unavailable');
 const originalUrl=page.url(),restoreUrl=/issue\d+_fixture/.test(originalUrl)?'https://siaivo.isroot.in/?component=main&source=tmdb&page=1':originalUrl,viewport=page.viewportSize();let capture=true,fixtureSeed=null;
 page.on('console',m=>{if(m.type()==='error'&&/YDesign/.test(m.text()))report.errors.push(m.text().slice(0,500))});
 page.on('pageerror',e=>report.errors.push(e.message.replace(/https?:\/\/\S+/g,'[URL]')));
 page.on('response',async r=>{const key=sourceKey(new URL(r.url()));if(capture&&key)try{const b=await r.body();report.sources[key]={expected:hash(files[key]),received:hash(b),commit:r.headers()['x-source-commit']};}catch{}});
 const setup=async()=>page.evaluate(({seed,finalPass})=>{
  if(window.__issue8)return;const L=Lampa,oldGet=L.Storage.get,oldField=L.Storage.field,oldSet=L.Storage.set,oldLocalGet=Storage.prototype.getItem,oldLocalSet=Storage.prototype.setItem,oldLocalRemove=Storage.prototype.removeItem;
  const state=window.__issue8={shadow:{ydesign_card_type_main:'vertical',ydesign_card_type_other:'vertical',ydesign_ua_torrents:false,ydesign_perf_mode:'fx',ydesign_font:'golos-montserrat',stremio_hybrid_enabled:true},local:{ydesign_legacy_cleaned:'1'},account:'fixture-a',credential:'synthetic-a',watched:false,phase:'ready',requests:[],probe:{timers:new Map(),observers:[],listeners:0,queries:0,mutations:0,longTasks:[]}};
  if(seed){Object.assign(state.shadow,seed.shadow);Object.assign(state.local,seed.local);state.account=seed.account;state.credential=seed.credential;state.watched=seed.watched;state.phase=seed.phase;}
  state.set=(k,v)=>{state.shadow[k]=v;L.Storage.listener.send('change',{name:k,value:v})};
  const owned=k=>/^ydesign_|^trakt_plus_/.test(k);
  L.Storage.get=function(k,d){if(k==='trakt_token')return state.credential;if(k==='trakt_refresh_token')return null;if(/^trakt_token_/.test(k))return k.endsWith('expires_in')?86400:Math.floor(Date.now()/1000)+86400;if(k==='language')return'uk';if(k==='stremio_hybrid_enabled')return state.shadow[k];if(owned(k))return k in state.shadow?state.shadow[k]:d;return oldGet.call(this,k,d)};
  L.Storage.field=function(k){if(k==='trakt_plus_autosync'||k==='trakt_plus_auto_home')return false;if(owned(k))return k in state.shadow?state.shadow[k]:undefined;return oldField.call(this,k)};
  L.Storage.set=function(k,v){if(owned(k)||/^trakt_/.test(k)||k==='stremio_hybrid_enabled'){state.shadow[k]=v;return;}if(k==='favorite')throw Error('Unexpected real Favorite write');return oldSet.call(this,k,v)};
  Storage.prototype.getItem=function(k){return /^ydesign_/.test(k)?state.local[k]??null:oldLocalGet.call(this,k)};
  Storage.prototype.setItem=function(k,v){if(/^ydesign_/.test(k)){state.local[k]=String(v);return;}return oldLocalSet.call(this,k,v)};
  Storage.prototype.removeItem=function(k){if(/^ydesign_/.test(k)){delete state.local[k];return;}return oldLocalRemove.call(this,k)};
  L.Favorite.check=()=>({viewed:true,history:true});L.Favorite.get=()=>[];L.Favorite.add=(...args)=>{(state.imports??=[]).push(args)};L.Favorite.remove=()=>{throw Error('Unexpected Favorite deletion')};L.Timeline.view=()=>({percent:95});L.Timeline.watched=()=>95;
  const ours=()=>/\/ui\/design-optimized\.js/.test((new Error().stack||'').split('\n').find(line=>/\(https?:/.test(line))||'');
  for(const [name,repeat]of [['setTimeout',false],['setInterval',true]]){const original=window[name];window[name]=function(fn,ms,...args){if(typeof fn!=='function'||!ours())return original(fn,ms,...args);const rec={ms,repeat,ticks:0},id=original(function(...a){rec.ticks++;if(!repeat)rec.done=true;return fn.apply(this,a)},ms,...args);state.probe.timers.set(id,rec);return id;};}
  for(const name of ['clearTimeout','clearInterval']){const original=window[name];window[name]=function(id){const rec=state.probe.timers.get(id);if(rec)rec.done=true;return original(id)}}
  const MO=window.MutationObserver;window.MutationObserver=function(fn){const own=ours(),rec={active:false,calls:0,records:0,target:''};const ob=new MO(function(ms,observer){if(own){rec.calls++;rec.records+=ms.length;}return fn(ms,observer)});if(own){state.probe.observers.push(rec);const observe=ob.observe,disconnect=ob.disconnect;ob.observe=function(target,opts){rec.active=true;rec.target=target===document.body?'body':target.className||target.nodeName;return observe.call(this,target,opts)};ob.disconnect=function(){rec.active=false;return disconnect.call(this)}}return ob;};window.MutationObserver.prototype=MO.prototype;
  if(!finalPass){
  const add=EventTarget.prototype.addEventListener;EventTarget.prototype.addEventListener=function(...args){if(ours())state.probe.listeners++;return add.apply(this,args)};
  for(const proto of [Document.prototype,Element.prototype])for(const name of ['querySelector','querySelectorAll','getElementsByClassName'])if(proto[name]){const original=proto[name];proto[name]=function(...a){if(ours())state.probe.queries++;return original.apply(this,a)}}
  try{new PerformanceObserver(list=>state.probe.longTasks.push(...list.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:true})}catch{}
  }
 },{seed:fixtureSeed,finalPass});
 const route=async route=>{
  const req=route.request(),u=new URL(req.url()),key=sourceKey(u);
  if(!['GET','HEAD','OPTIONS'].includes(req.method()))return route.abort();
  if(key){await setup();if(key==='/trakt/trakt-plus.js')await page.evaluate(()=>{TraktTV.api.get=async p=>{const s=__issue8;if(s.phase==='error'&&p!=='/users/me')throw Error('Synthetic API unavailable');if(p==='/users/me')return{ids:{uuid:s.account}};if(p==='/sync/last_activities')return{all:'2026-01-01T00:00:00.000Z',movies:{watched_at:'2026-01-01T00:00:00.000Z'},episodes:{watched_at:'2026-01-01T00:00:00.000Z'}};if(p.includes('/sync/watched/movies'))return s.watched?[{movie:{ids:{tmdb:438631,trakt:1},title:'Dune'}}]:[];return[];};});return route.fulfill({status:200,contentType:'application/javascript',body:files[key],headers:{'Cache-Control':'no-store','X-Source-Commit':sha}});}
  if(u.hostname==='wh.lme.isroot.in'){report.metrics.uaRequests=(report.metrics.uaRequests||0)+1;return route.fulfill({json:u.searchParams.get('serial')==='0'?{play:'https://example.org/fixture'}:{status:'error'}});}
  if(u.hostname==='api.themoviedb.org'){report.metrics.tmdbRequests=(report.metrics.tmdbRequests||0)+1;const tv=u.pathname.includes('/tv/'),id=Number(u.pathname.match(/\/(?:movie|tv)\/(\d+)/)?.[1]||0);return route.fulfill({json:{id,title:'Тестовий фільм',name:'Тестовий серіал',tagline:'Контрольоване гасло',overview:'Ізольований опис',genres:[{id:18,name:'Драма'}],vote_average:8,release_date:'2020-01-01',first_air_date:'2020-01-01',status:'Ended',number_of_seasons:1,number_of_episodes:3,seasons:[{season_number:1,episode_count:3}],last_episode_to_air:{season_number:1,episode_number:3,air_date:'2020-01-03'},next_episode_to_air:null,images:{posters:[{file_path:'/fixture-poster.svg',iso_639_1:null}],backdrops:[],logos:[{file_path:'/fixture-logo.svg',iso_639_1:'uk'}]},release_dates:{results:[{iso_3166_1:'US',release_dates:[{certification:'PG-13'}]}]},content_ratings:{results:[{iso_3166_1:'US',rating:'TV-14'}]},results:[]}});}
  if(u.hostname==='image.tmdb.org'){const logo=u.pathname.includes('logo');return route.fulfill({status:200,contentType:'image/svg+xml',headers:{'Access-Control-Allow-Origin':'*'},body:`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="${logo?80:600}"><rect width="100%" height="100%" fill="#263b55"/><text x="40" y="60" fill="white" font-size="35">FIXTURE</text></svg>`});}
  if(/(?:api\.trakt\.tv|apx\.lme\.isroot\.in)$/.test(u.hostname))return route.fulfill({json:[]});
  if(/fonts\.(googleapis|gstatic)\.com/.test(u.hostname))return route.fulfill({status:200,contentType:'text/css',body:''});
  return route.continue();
 };
 await page.route('**/*',route);
 try{
  await page.setViewportSize({width:1280,height:720});await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.YDesignLoaded&&window.StremioHybrid&&Lampa.Activity.active()?.activity,null,{timeout:50000});
  await page.waitForTimeout(8000);report.metrics.tmdbRequests=0;report.metrics.uaRequests=0;
  report.environment=await page.evaluate(()=>({userAgent:navigator.userAgent,width:innerWidth,height:innerHeight,preset:'controlled vertical / full effects',hybrid:document.body.classList.contains('stremio-hybrid')}));
  await page.evaluate(()=>{
   const cards=[{id:438631,title:'Фільм',original_title:'Dune',type:'movie',method:'movie',media_type:'movie',release_date:'2020-01-01'},{id:1396,title:'Серіал',name:'Series',type:'tv',method:'tv',media_type:'tv',first_air_date:'2020-01-01'},{id:1429,title:'Аніме',name:'Anime',type:'anime',method:'tv',media_type:'tv',first_air_date:'2020-01-01'}].map(c=>({...c,poster_path:'/fixture-poster.svg',genre_ids:[18],vote_average:8,source:'tmdb',params:{emit:{onEnter:()=>Lampa.Router.call('full',c)}}}));
   __issue8.cards=cards;Lampa.Component.add('main',function(o){const c=Lampa.Maker.make('Main',o);c.use({onCreate(){c.build([{title:'Issue8 fixtures',results:cards}])}});return c});__issue8.renderStart=performance.now();Lampa.Activity.push({component:'main',title:'Issue8 fixtures',page:1});
  });
  await page.waitForFunction(()=>document.querySelectorAll('.activity--active .ydesign-ready').length===3,null,{timeout:30000});
  report.metrics.readyMs=await page.evaluate(()=>performance.now()-__issue8.renderStart);
  await page.evaluate(()=>{const p=__issue8.probe;p.startQueries=p.queries;p.startTicks=[...p.timers.values()].reduce((n,r)=>n+r.ticks,0);p.startCallbacks=p.observers.reduce((n,r)=>n+r.calls,0)});
  for(let i=0;i<(finalPass?2:6);i++){await page.keyboard.press(i%2?'ArrowLeft':'ArrowRight');await page.waitForTimeout(80)}if(!finalPass)await page.waitForTimeout(3000);
  report.metrics={...report.metrics,...await page.evaluate(finalPass=>{const p=__issue8.probe;return{sampleMs:finalPass?160:3480,queries:p.queries-p.startQueries,timerTicks:[...p.timers.values()].reduce((n,r)=>n+r.ticks,0)-p.startTicks,activeTimers:[...p.timers.values()].filter(r=>!r.done).map(r=>({ms:r.ms,repeat:r.repeat})),observers:p.observers.map(r=>({...r})),callbacks:p.observers.reduce((n,r)=>n+r.calls,0)-p.startCallbacks,listeners:p.listeners,dom:document.querySelectorAll('.activity--active *').length,longTasks:p.longTasks,heap:performance.memory?.usedJSHeapSize,ambient:!!document.querySelector('#ydesign-ambient'),horizontal:document.querySelectorAll('.activity--active .ydesign-horizontal').length,watched:document.querySelectorAll('.activity--active .ydesign-is-watched').length,ua:document.querySelectorAll('.activity--active .ydesign-badge-ua').length,genres:document.querySelectorAll('.activity--active .ydesign-genres').length}} ,finalPass)};
  check('Three native cards render without preset switching',true);await page.screenshot({path:path.join(out,baseline?'baseline.png':finalPass?'final.png':'candidate.png')});
  if(!baseline){
   check('Exact changed sources loaded by hash',Object.keys(files).every(k=>report.sources[k]?.received===hash(files[k])&&report.sources[k]?.commit===sha),report.sources);
   const content=await page.evaluate(()=>[...document.querySelectorAll('.activity--active .ydesign-card')].map(c=>({genres:!!c.querySelector('.ydesign-genres'),age:!!c.querySelector('.ydesign-badge-age'),rating:!!c.querySelector('.ydesign-rating'),logo:!!c.querySelector('.ydesign-logo-container img'),slogan:!!c.querySelector('.ydesign-slogan'),series:!!c.querySelector('.ydesign-badge-seasons')})));
   check('First-open genre/age/rating/logo/slogan and TV/anime episodes',content.every(c=>c.genres&&c.age&&c.rating&&c.logo&&c.slogan)&&content[1].series&&content[2].series,content);
   check('UA only from supported movie payload; errors create no badge',report.metrics.ua===1);
   check('No Ambient/horizontal cards/global episode observer/poll on Home',!report.metrics.ambient&&!report.metrics.horizontal&&!report.metrics.observers.some(o=>o.active)&&!report.metrics.activeTimers.some(t=>t.repeat));
   const inspect=()=>page.evaluate(()=>{const c=document.querySelector('.activity--active .ydesign-card'),v=c.querySelector('.card__view'),cs=getComputedStyle(c),vs=getComputedStyle(v);return{transform:cs.transform,animation:cs.animationName,width:cs.width,shadow:vs.boxShadow,border:vs.borderRadius,styles:document.querySelectorAll('#ydesign-style-block').length,fonts:document.querySelectorAll('#ydesign-font-link').length,glow:getComputedStyle(c,'::after').content,hybrid:document.body.classList.contains('stremio-hybrid')}});
   await page.evaluate(()=>{document.querySelector('.activity--active .ydesign-card').classList.add('focus');__issue8.set('ydesign_focus_fx','lift')});await page.waitForTimeout(650);
   const combined=await inspect();check('Hybrid owns outer card animation/glow while YDesign lift is selected',combined.hybrid&&combined.animation==='none'&&combined.glow==='none',combined);
   await page.evaluate(()=>StremioHybrid.setEnabled(false));await page.waitForTimeout(650);const solo=await inspect();check('YDesign standalone restores its own focus with Hybrid object still present',!solo.hybrid&&solo.transform!==combined.transform,solo);
   await page.evaluate(()=>StremioHybrid.setEnabled(true));await page.waitForTimeout(400);const restored=await inspect();check('Hybrid on/off reuses singleton styles/fonts',restored.hybrid&&restored.styles===1&&restored.fonts<=1,restored);
   await page.emulateMedia({reducedMotion:'reduce'});check('Reduced motion disables card transitions and animations',await page.evaluate(()=>{const c=getComputedStyle(document.querySelector('.activity--active .ydesign-card'));return c.animationName==='none'&&c.transitionDuration==='0s'}));await page.emulateMedia({reducedMotion:'no-preference'});
   for(const [width,height]of (finalPass?[]:[[1280,720],[1920,1080],[3840,2160]])){await page.setViewportSize({width,height});await page.waitForTimeout(250);const sizes=await page.evaluate(()=>[...document.querySelectorAll('.activity--active .ydesign-card .card__view')].map(c=>({w:c.getBoundingClientRect().width,h:c.getBoundingClientRect().height})));check('Vertical cards '+width+'x'+height,sizes.every(c=>c.w>0&&c.h>c.w),sizes);}
   await page.setViewportSize({width:1280,height:720});
   await page.evaluate(()=>{__issue8.set('ydesign_card_type_main','horizontal');__issue8.set('ydesign_card_type_other','horizontal')});await page.waitForTimeout(200);check('Imported old orientation migrates without changing other preferences',await page.evaluate(()=>__issue8.shadow.ydesign_card_type_main==='vertical'&&__issue8.shadow.ydesign_card_type_other==='vertical'&&__issue8.shadow.ydesign_font==='golos-montserrat'&&!document.querySelector('.ydesign-horizontal')));
   const watched=()=>page.evaluate(()=>[...document.querySelectorAll('.activity--active .ydesign-card')].map(c=>c.getAttribute('data-ydesign-watched')));
   await page.evaluate(()=>TraktPlus.syncWatched());await page.waitForTimeout(350);check('Native local watched95% never overrides confirmed Trakt false',(await watched()).every(v=>v==='unwatched'),await watched());
   await page.evaluate(async()=>{__issue8.watched=true;await TraktPlus.syncWatched()});await page.waitForTimeout(350);check('Confirmed Trakt change updates movie dim/check/notch',await page.evaluate(()=>{const c=document.querySelector('.activity--active .ydesign-card');return c.dataset.ydesignWatched==='watched'&&!!c.querySelector('.ydesign-watched-check')&&!!c.querySelector('.ydesign-watched-dim')}));
   await page.evaluate(async()=>{__issue8.phase='error';await TraktPlus.syncWatched()});await page.waitForTimeout(350);check('API failure retains same-account last confirmed movie', (await watched())[0]==='watched',await watched());
   await page.evaluate(()=>{__issue8.account='fixture-b';__issue8.credential='synthetic-b';Lampa.Storage.listener.send('change',{name:'trakt_token'});TraktPlus.isWatched(__issue8.cards[0])});await page.waitForTimeout(650);check('New account with failed API never reuses A evidence',(await watched()).every(v=>v==='unknown'),await watched());
   await page.evaluate(async()=>{__issue8.phase='ready';__issue8.watched=false;await TraktPlus.syncWatched()});await page.waitForTimeout(350);check('Account B confirmed negative replaces unknown',(await watched()).every(v=>v==='unwatched'),await watched());
   for(const key of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'])await page.keyboard.press(key);check('Directional navigation retains native focus',await page.evaluate(()=>!!document.querySelector('.focus')));
   if(finalPass){
    // A native Activity/controller hosts synthetic provider episode DOM. No media playback.
    await page.evaluate(()=>{Lampa.Component.add('issue8_episodes',function(o){const c=Lampa.Maker.make('Main',o);c.use({onCreate(){c.build([{title:'Episode fixture',results:__issue8.cards}])}});return c});__issue8.episodeCycles=[];});
    for(let cycle=0;cycle<3;cycle++){
     await page.evaluate(()=>Lampa.Activity.push({component:'issue8_episodes',title:'Synthetic provider episodes',movie:__issue8.cards[1],page:1}));
     await page.waitForFunction(()=>Lampa.Activity.active()?.component==='issue8_episodes'&&document.querySelector('.activity--active .scroll__body'));
     await page.evaluate(()=>{const list=document.createElement('div');list.className='issue8-episode-container';list.innerHTML=Array.from({length:3},(_,i)=>`<div class="online-prestige online-prestige--full selector" data-season="1" data-episode="${i+1}"><div class="online-prestige__body"><div class="online-prestige__title">Епізод ${i+1}</div><div class="online-prestige__info">Тестове озвучення</div></div><div class="time-line"><div style="width:25%"></div></div></div>`).join('');for(const c of list.children){c.data={season:1,episode:Number(c.dataset.episode),timeline:{percent:25}};$(c).on('hover:enter',()=>{__issue8.episodeOK=(__issue8.episodeOK||0)+1});}document.querySelector('.activity--active .scroll__body').appendChild(list);});
     await page.waitForFunction(()=>document.querySelectorAll('.activity--active .online-prestige[data-fixed-layout="true"]').length===3);
     const mounted=await page.evaluate(()=>({timers:[...__issue8.probe.timers.values()].filter(t=>t.repeat&&!t.done).length,observers:__issue8.probe.observers.filter(o=>o.active).length}));
     check('Episode lifecycle mount '+(cycle+1),mounted.timers===1&&mounted.observers===1,mounted);
     if(cycle===0){
      await page.evaluate(()=>{const root=$('.activity--active .issue8-episode-container'),c=root.find('.online-prestige').first();Lampa.Controller.collectionSet(root);Lampa.Controller.collectionFocus(c,root);c[0].scrollIntoView({block:'nearest'});c[0].data.timeline.percent=70;});
      await page.waitForFunction(()=>document.querySelector('.activity--active .online-prestige__timeline')?.getAttribute('data-percent')==='70%');
      check('Episode JS timeline progress updates without new render',true);
      await page.keyboard.press('Enter');check('OK reaches existing episode action without playback',await page.evaluate(()=>__issue8.episodeOK===1));
      await page.evaluate(()=>{const c=document.querySelector('.activity--active .online-prestige');c.data.timeline.percent=0;});
      await page.waitForFunction(()=>document.querySelector('.activity--active .online-prestige__timeline')?.style.display==='none');
      check('Episode progress reset is retained',true);
      await page.screenshot({path:path.join(out,'final-episodes.png')});
     }
     await page.keyboard.press('Escape');await page.waitForFunction(()=>Lampa.Activity.active()?.component==='main');await page.waitForTimeout(150);
     const returned=await page.evaluate(()=>({timers:[...__issue8.probe.timers.values()].filter(t=>t.repeat&&!t.done).length,observers:__issue8.probe.observers.filter(o=>o.active).length,focus:!!document.querySelector('.activity--active .focus')}));
     check('Back cleans episode resources '+(cycle+1),returned.timers===0&&returned.observers===0&&returned.focus,returned);
    }
   }

  }
 }catch(e){report.errors.push(e.message.replace(/https?:\/\/\S+/g,'[URL]'));report.diagnostic=await page.evaluate(()=>({loaded:!!window.YDesignLoaded,hybrid:!!window.StremioHybrid,activity:Lampa.Activity.active()?.component,cards:[...document.querySelectorAll('.activity--active .card')].map(c=>({cls:c.className,render:c._ydesign_render,data:!!c._ydesign_data,ext:!!c._ydesign_extData,lazy:!!c._ydesign_lazyMarks,connected:c.isConnected})).slice(0,5)})).catch(()=>null)}
 finally{capture=false;await page.unroute('**/*',route);await page.goto(restoreUrl,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!window.__issue8&&window.Lampa?.Activity?.active()?.activity&&Lampa.Activity.active().component!=='issue8_fixture',null,{timeout:30000});check('Original native page restored without fixture globals',true);if(viewport)await page.setViewportSize(viewport);}
 fs.writeFileSync(path.join(out,baseline?'baseline.json':finalPass?'final-runtime.json':'runtime.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({baseline,checks:report.checks,metrics:report.metrics,errors:report.errors}));process.exit(report.errors.length||report.checks.some(c=>c.status==='FAIL')?1:0);
})().catch(e=>{console.error(e.message);process.exit(1)});
