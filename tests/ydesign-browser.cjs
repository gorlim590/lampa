'use strict';
// Existing CDP tab; synthetic Storage/Favorite/Timeline/Trakt/metadata only.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),baseline=process.argv.includes('--baseline'),out=path.join(root,'audit/issue-8');fs.mkdirSync(out,{recursive:true});
const sha=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const files=Object.fromEntries(['ui/design-optimized.js','ui/stremio-hybrid.js','trakt/trakt-plus.js'].map(p=>['/'+p,fs.readFileSync(path.join(root,p),'utf8')]));
(async()=>{
 const report={baseline,commit:sha,checks:[],errors:[],sources:{},metrics:{},blocked:['Physical Google TV','Real player return/live accounts']};
 const check=(name,ok,data)=>report.checks.push({name,status:ok?'PASS':'FAIL',...(data===undefined?{}:{data})});
 const browser=await chromium.connectOverCDP('http://127.0.0.1:9222'),page=browser.contexts()[0].pages().find(p=>p.url().startsWith('https://siaivo.isroot.in/'));if(!page)throw Error('Existing Lampa tab unavailable');
 const originalUrl=page.url(),restoreUrl=/issue\d+_fixture/.test(originalUrl)?'https://siaivo.isroot.in/?component=main&source=tmdb&page=1':originalUrl,viewport=page.viewportSize();let capture=true;
 page.on('pageerror',e=>report.errors.push(e.message.replace(/https?:\/\/\S+/g,'[URL]')));
 page.on('response',async r=>{const key=Object.keys(files).find(k=>new URL(r.url()).pathname.endsWith(k));if(capture&&key)try{const b=await r.body();report.sources[key]={expected:hash(files[key]),received:hash(b),commit:r.headers()['x-source-commit']};}catch{}});
 const setup=async()=>page.evaluate(()=>{
  if(window.__issue8)return;const L=Lampa,oldGet=L.Storage.get,oldField=L.Storage.field,oldSet=L.Storage.set,oldLocalGet=Storage.prototype.getItem,oldLocalSet=Storage.prototype.setItem,oldLocalRemove=Storage.prototype.removeItem;
  const state=window.__issue8={shadow:{ydesign_card_type_main:'vertical',ydesign_card_type_other:'vertical',ydesign_ua_torrents:false,ydesign_perf_mode:'fx',ydesign_font:'golos-montserrat',stremio_hybrid_enabled:true},local:{ydesign_legacy_cleaned:'1'},account:'fixture-a',credential:'synthetic-a',watched:false,phase:'ready',requests:[],probe:{timers:new Map(),observers:[],listeners:0,queries:0,mutations:0,longTasks:[]}};
  const owned=k=>/^ydesign_|^trakt_plus_/.test(k);
  L.Storage.get=function(k,d){if(k==='trakt_token')return state.credential;if(k==='trakt_refresh_token')return null;if(/^trakt_token_/.test(k))return k.endsWith('expires_in')?86400:Math.floor(Date.now()/1000)+86400;if(k==='language')return'uk';if(k==='stremio_hybrid_enabled')return state.shadow[k];if(owned(k))return k in state.shadow?state.shadow[k]:d;return oldGet.call(this,k,d)};
  L.Storage.field=function(k){if(k==='trakt_plus_autosync'||k==='trakt_plus_auto_home')return false;if(owned(k))return k in state.shadow?state.shadow[k]:undefined;return oldField.call(this,k)};
  L.Storage.set=function(k,v){if(owned(k)||/^trakt_/.test(k)||k==='stremio_hybrid_enabled'){state.shadow[k]=v;return;}if(k==='favorite')throw Error('Unexpected real Favorite write');return oldSet.call(this,k,v)};
  Storage.prototype.getItem=function(k){return /^ydesign_/.test(k)?state.local[k]??null:oldLocalGet.call(this,k)};
  Storage.prototype.setItem=function(k,v){if(/^ydesign_/.test(k)){state.local[k]=String(v);return;}return oldLocalSet.call(this,k,v)};
  Storage.prototype.removeItem=function(k){if(/^ydesign_/.test(k)){delete state.local[k];return;}return oldLocalRemove.call(this,k)};
  L.Favorite.check=()=>({viewed:true,history:true});L.Favorite.get=()=>[];L.Favorite.add=()=>{throw Error('Unexpected real Favorite import')};L.Favorite.remove=()=>{throw Error('Unexpected Favorite deletion')};L.Timeline.view=()=>({percent:95});L.Timeline.watched=()=>95;
  const ours=()=>/\/ui\/design-optimized\.js/.test((new Error().stack||'').split('\n').find(line=>/\(https?:/.test(line))||'');
  for(const [name,repeat]of [['setTimeout',false],['setInterval',true]]){const original=window[name];window[name]=function(fn,ms,...args){if(typeof fn!=='function'||!ours())return original(fn,ms,...args);const rec={ms,repeat,ticks:0},id=original(function(...a){rec.ticks++;if(!repeat)rec.done=true;return fn.apply(this,a)},ms,...args);state.probe.timers.set(id,rec);return id;};}
  for(const name of ['clearTimeout','clearInterval']){const original=window[name];window[name]=function(id){const rec=state.probe.timers.get(id);if(rec)rec.done=true;return original(id)}}
  const MO=window.MutationObserver;window.MutationObserver=function(fn){const own=ours(),rec={active:false,calls:0,records:0,target:''};const ob=new MO(function(ms,observer){if(own){rec.calls++;rec.records+=ms.length;}return fn(ms,observer)});if(own){state.probe.observers.push(rec);const observe=ob.observe,disconnect=ob.disconnect;ob.observe=function(target,opts){rec.active=true;rec.target=target===document.body?'body':target.className||target.nodeName;return observe.call(this,target,opts)};ob.disconnect=function(){rec.active=false;return disconnect.call(this)}}return ob;};window.MutationObserver.prototype=MO.prototype;
  const add=EventTarget.prototype.addEventListener;EventTarget.prototype.addEventListener=function(...args){if(ours())state.probe.listeners++;return add.apply(this,args)};
  for(const proto of [Document.prototype,Element.prototype])for(const name of ['querySelector','querySelectorAll','getElementsByClassName'])if(proto[name]){const original=proto[name];proto[name]=function(...a){if(ours())state.probe.queries++;return original.apply(this,a)}}
  try{new PerformanceObserver(list=>state.probe.longTasks.push(...list.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:true})}catch{}
 });
 const route=async route=>{
  const req=route.request(),u=new URL(req.url()),key=Object.keys(files).find(k=>u.pathname.endsWith(k));
  if(!['GET','HEAD','OPTIONS'].includes(req.method()))return route.abort();
  if(key){await setup();if(key==='/trakt/trakt-plus.js')await page.evaluate(()=>{TraktTV.api.get=async p=>{const s=__issue8;if(p==='/users/me')return{ids:{uuid:s.account}};if(p==='/sync/last_activities')return{all:'2026-01-01T00:00:00.000Z',movies:{watched_at:'2026-01-01T00:00:00.000Z'},episodes:{watched_at:'2026-01-01T00:00:00.000Z'}};if(p.includes('/sync/watched/movies'))return s.watched?[{movie:{ids:{tmdb:438631,trakt:1},title:'Dune'}}]:[];return[];};});return route.fulfill({status:200,contentType:'application/javascript',body:files[key],headers:{'Cache-Control':'no-store','X-Source-Commit':sha}});}
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
   __issue8.cards=cards;Lampa.Component.add('issue8_fixture',function(o){const c=Lampa.Maker.make('Main',o);c.use({onCreate(){c.build([{title:'Issue8 fixtures',results:cards}])}});return c});__issue8.renderStart=performance.now();Lampa.Activity.push({component:'issue8_fixture',title:'Issue8 fixtures',page:1});
  });
  await page.waitForFunction(()=>document.querySelectorAll('.activity--active .ydesign-ready').length===3,null,{timeout:30000});
  report.metrics.readyMs=await page.evaluate(()=>performance.now()-__issue8.renderStart);
  await page.evaluate(()=>{const p=__issue8.probe;p.startQueries=p.queries;p.startTicks=[...p.timers.values()].reduce((n,r)=>n+r.ticks,0);p.startCallbacks=p.observers.reduce((n,r)=>n+r.calls,0)});
  for(let i=0;i<6;i++){await page.keyboard.press(i%2?'ArrowLeft':'ArrowRight');await page.waitForTimeout(80)}await page.waitForTimeout(3000);
  report.metrics={...report.metrics,...await page.evaluate(()=>{const p=__issue8.probe;return{sampleMs:3480,queries:p.queries-p.startQueries,timerTicks:[...p.timers.values()].reduce((n,r)=>n+r.ticks,0)-p.startTicks,activeTimers:[...p.timers.values()].filter(r=>!r.done).map(r=>({ms:r.ms,repeat:r.repeat})),observers:p.observers.map(r=>({...r})),callbacks:p.observers.reduce((n,r)=>n+r.calls,0)-p.startCallbacks,listeners:p.listeners,dom:document.querySelectorAll('.activity--active *').length,longTasks:p.longTasks,heap:performance.memory?.usedJSHeapSize,ambient:!!document.querySelector('#ydesign-ambient'),horizontal:document.querySelectorAll('.activity--active .ydesign-horizontal').length,watched:document.querySelectorAll('.activity--active .ydesign-is-watched').length,ua:document.querySelectorAll('.activity--active .ydesign-badge-ua').length,genres:document.querySelectorAll('.activity--active .ydesign-genres').length}})};
  check('Three native cards render without preset switching',true);await page.screenshot({path:path.join(out,baseline?'baseline.png':'candidate.png')});
 }catch(e){report.errors.push(e.message.replace(/https?:\/\/\S+/g,'[URL]'))}
 finally{capture=false;await page.unroute('**/*',route);await page.goto(restoreUrl,{waitUntil:'domcontentloaded'});if(viewport)await page.setViewportSize(viewport);}
 fs.writeFileSync(path.join(out,baseline?'baseline.json':'runtime.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({baseline,checks:report.checks,metrics:report.metrics,errors:report.errors}));process.exit(report.errors.length||report.checks.some(c=>c.status==='FAIL')?1:0);
})().catch(e=>{console.error(e.message);process.exit(1)});
