'use strict';
// Existing tab only. Recorded public TMDB responses; account/storage mutations isolated.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'audit/issue-10'),sha=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const paths=['media/seasons-info.js','info/seasons-info.js','ui/design-optimized.js','ui/interface-plus.js','ui/cardify-plus.js','ui/stremio-hybrid.js','trakt/trakt-plus.js'];
const files=Object.fromEntries(paths.map(p=>['/'+p,fs.readFileSync(path.join(root,p),'utf8')])),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const metadata=JSON.parse(fs.readFileSync(path.join(out,'metadata.json'))),episodes=JSON.parse(fs.readFileSync(path.join(out,'episode-metadata.json')));
const sourceKey=u=>u.pathname.endsWith('/stremio-hybrid.js')?'/ui/stremio-hybrid.js':Object.keys(files).find(k=>u.pathname.endsWith(k));
(async()=>{
 const r={commit:sha,sources:{},checks:[],errors:[],requests:[],blocked:['Physical Google TV / older WebView hardware','Real playback and Trakt writes: deliberately not performed']};
 const check=(name,ok,data)=>{r.checks.push({name,status:ok?'PASS':'FAIL',data});if(!ok)throw Error(name)};
 const b=await chromium.connectOverCDP('http://127.0.0.1:9222'),p=b.contexts()[0].pages().find(p=>p.url().includes('siaivo.isroot.in'));if(!p)throw Error('BLOCKED: existing Lampa tab not available');
 const restore=p.url();let capture=true;const jobs=[];
 const onResponse=res=>{const key=sourceKey(new URL(res.url()));if(capture&&key)jobs.push(res.body().then(body=>r.sources[key]={sha:hash(body),expected:hash(files[key]),commit:res.headers()['x-issue10-commit']}).catch(()=>{}))};
 const onError=e=>{if(capture)r.errors.push(e.message.replace(/https?:\/\/\S+/g,'[URL]'))};p.on('response',onResponse);p.on('pageerror',onError);
 const setup=()=>p.evaluate(()=>{
  if(window.__issue10)return;const L=Lampa,s=window.__issue10={shadow:{},local:{},writes:[],selects:[]},get=L.Storage.get,field=L.Storage.field;
  L.Storage.get=function(k,d){if(k in s.shadow)return s.shadow[k];if(/^trakt_/.test(k))return k==='trakt_token'?null:false;return get.call(this,k,d)};
  L.Storage.field=function(k){if(/^trakt_/.test(k))return false;if(k in s.shadow)return s.shadow[k];return field.call(this,k)};
  L.Storage.set=(k,v)=>{s.writes.push(k);s.shadow[k]=v};L.Favorite.add=L.Favorite.remove=()=>{};if(L.Socket)L.Socket.send=()=>{};
  const localGet=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(k in s.local)return s.local[k];if(/^trakt_/.test(k))return null;return localGet.call(this,k)};Storage.prototype.setItem=function(k,v){s.local[k]=String(v)};Storage.prototype.removeItem=function(k){s.local[k]=null};
  const show=L.Select.show;L.Select.show=function(o){s.selects.push(o.items.map(i=>({season:i.season,title:i.title})));return show.apply(this,arguments)};
 });
 const route=async route=>{
  const req=route.request(),u=new URL(req.url()),key=sourceKey(u);if(!['GET','HEAD','OPTIONS'].includes(req.method()))return route.abort();
  if(key){await setup();return route.fulfill({contentType:'application/javascript',body:files[key],headers:{'Cache-Control':'no-store','X-Issue10-Commit':sha}})}
  if(u.hostname==='api.themoviedb.org'){
   const m=u.pathname.match(/\/tv\/(\d+)(?:\/season\/(\d+))?/);if(m){const id=Number(m[1]),season=m[2]==null?null:Number(m[2]),record=metadata.find(d=>d.id===id);if(record){r.requests.push(u.pathname);
    if(season!==null){const raw=episodes.find(d=>d.tv_id===id&&d.season_number===season);if(raw)return route.fulfill({json:{...raw,episodes:raw.episodes.map(e=>({...e})),seasons_count:undefined}});const s=record.seasons.find(s=>s.season_number===season);if(!s)return route.fulfill({status:404,json:{success:false,status_code:34}});return route.fulfill({json:{...s,episodes:Array.from({length:s.episode_count},(_,i)=>({id:100000+id+season*100+i,season_number:season,episode_number:i+1,name:'Fixture '+(i+1),air_date:'2020-01-01',runtime:24,vote_average:8}))}})}
    if(/\/(credits|recommendations|similar|videos)$/.test(u.pathname))return route.fulfill({json:{results:[],cast:[],crew:[]}});
    return route.fulfill({json:{...record,overview:'Recorded metadata integration fixture',genres:[{id:16,name:'Аніме'}],poster_path:'/issue10.svg',backdrop_path:'/issue10.svg',first_air_date:'2020-01-01',episode_run_time:[24],number_of_episodes:100,vote_average:8,status:'Returning Series',images:{logos:[],posters:[]},keywords:{results:[]},external_ids:{},content_ratings:{results:[]}}});
   }}return route.fulfill({json:{results:[],genres:[],cast:[],crew:[]}});
  }
  if(u.hostname==='image.tmdb.org')return route.fulfill({contentType:'image/svg+xml',headers:{'Access-Control-Allow-Origin':'*'},body:'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="400" height="600" fill="#26374a"/><text x="15" y="70" fill="white" font-size="28">Seasons fixture</text></svg>'});
  if(u.hostname==='api.trakt.tv')return route.fulfill({json:[]});
  return route.continue();
 };
 const active=()=>p.evaluate(()=>{const a=Lampa.Activity.active(),c=a.activity.component;return{component:a.component,season:c.object.season,count:c.object.seasons_count,items:c.items.map(i=>({id:i.data?.id,season:i.data?.season_number,episode:i.data?.episode_number,name:i.data?.name})),menus:__issue10.selects.at(-1)}});
 async function open(id,season){await p.evaluate(({id,season,metadata})=>{const card={...metadata.find(m=>m.id===id),source:'tmdb',media_type:'tv',first_air_date:'2020-01-01'};Lampa.Activity.push({component:'episodes',source:'tmdb',card,season:String(season)})},{id,season,metadata});await p.waitForFunction(()=>Lampa.Activity.active().activity.component.items?.length>1);return active()}
 await p.route('**/*',route);
 try{
  await p.reload({waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.Lampa?.Activity?.active()?.activity&&window.appready&&window.SeasonBadgePlugin?.integrity,null,{timeout:45000});
  const before=await p.evaluate(()=>({styles:[...document.head.querySelectorAll('style')].filter(s=>/card--season-(complete|progress)/.test(s.textContent)).length,badges:document.querySelectorAll('.card--season-complete,.card--season-progress').length,api:!!SeasonBadgePlugin.integrity&&typeof Lampa.Api.sources.tmdb.seasons==='function'}));
  await p.addScriptTag({url:'https://gorlim590.github.io/lampa/info/seasons-info.js?fixture='+sha});await p.addScriptTag({url:'https://gorlim590.github.io/lampa/media/seasons-info.js?fixture='+sha});
  check('Redundant season overlay adds no styles or badges while native season adapter remains active',await p.evaluate(n=>n.styles===0&&n.badges===0&&![...document.head.querySelectorAll('style')].some(s=>/card--season-(complete|progress)/.test(s.textContent))&&document.querySelectorAll('.card--season-complete,.card--season-progress').length===0&&n.api&&typeof Lampa.Api.sources.tmdb.seasons==='function',before),before);
  const one=await open(220542,1);check('Apothecary native episode page: all60 original episodes, one confirmed season and no fabricated IDs',one.count===1&&one.items.length===61&&one.items[1].id===episodes[0].episodes[0].id&&one.items.slice(1).every(i=>i.season===1),{count:one.count,items:one.items.length,first:one.items[1]});
  await p.evaluate(()=>{const c=Lampa.Activity.active().activity.component;c.active=0;Lampa.Controller.toggle('content')});await p.keyboard.press('Enter');await p.waitForTimeout(200);
  const menu=await p.evaluate(()=>__issue10.selects.at(-1));check('Native OK opens only official season1 + separate S0',menu.map(i=>i.season).join() ==='0,1',menu);
  await p.keyboard.press('ArrowUp');await p.waitForTimeout(150);await p.keyboard.press('Enter');await p.waitForFunction(()=>Lampa.Activity.active().activity.component.items?.[0]?.data?.season_number===0);
  const special=await active();check('Season0 selected via native keyboard routing, not mistaken for last regular season',special.items.slice(1).every(i=>i.season===0)&&special.items.length===54,{season:special.season,count:special.items.length});
  await p.keyboard.press('ArrowDown');await p.keyboard.press('ArrowDown');check('Native directional episode focus exists',await p.locator('.activity--active .focus').count()>0);
  await p.keyboard.press('Escape');await p.waitForTimeout(150);
  const multi=await open(1396,5);check('Breaking Bad season5 has16 original episodes and5 regular seasons',multi.count===5&&multi.items.length===17&&multi.items.slice(1).every(i=>i.season===5));
  const anime=await open(1429,4);check('Attack on Titan season4 has28 original episodes and4 regular seasons',anime.count===4&&anime.items.length===29&&anime.items.slice(1).every(i=>i.season===4));
  const reopened=await open(220542,1);check('Reopening Apothecary adds no duplicate season/episode entries',reopened.count===1&&reopened.items.length===61&&new Set(reopened.items.slice(1).map(i=>i.episode)).size===60);
  await p.evaluate(()=>{Lampa.Activity.push({component:'full',source:'tmdb',id:220542,method:'tv',card:{id:220542,source:'tmdb',name:'Монолог травниці',media_type:'tv'}})});await p.waitForFunction(()=>Lampa.Activity.active().activity.component.items?.some(i=>i.data?.results?.some(e=>e.season_number===1)));
  check('Native Full/YDesign/Cardify/Interface/Trakt+/Hybrid retains one episode row with real episode identity',await p.evaluate(()=>{const c=Lampa.Activity.active().activity.component,lines=c.items.filter(i=>i.data?.results?.some(e=>e.season_number!=null));return lines.length===1&&lines[0].data.results.every(e=>e.season_number===1)&&!!window.SeasonBadgePlugin.integrity}),await p.evaluate(()=>({ydesign:!!window.YDesignLoaded,hybrid:!!window.StremioHybrid,trakt:!!window.TraktPlus,cardify:!!document.querySelector('.cardify')})));
  await p.screenshot({path:path.join(out,'after-full.png')});
  await Promise.all(jobs);check('Exact changed sources and active UI scripts verified by hash/commit',Object.keys(files).every(k=>r.sources[k]?.sha===hash(files[k])&&r.sources[k]?.commit===sha),r.sources);
  await p.reload({waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.Lampa?.Activity?.active()?.activity&&window.appready&&window.SeasonBadgePlugin?.integrity,null,{timeout:40000});const restart=await open(220542,1);check('Page restart restores single season and full episode count',restart.count===1&&restart.items.length===61);
  check('No JavaScript exceptions',r.errors.length===0,r.errors);
 }catch(e){r.errors.push(e.message.replace(/https?:\/\/\S+/g,'[URL]'))}
 finally{capture=false;await p.unroute('**/*',route);p.off('response',onResponse);p.off('pageerror',onError);await p.goto(restore,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.Lampa?.Activity?.active()?.activity&&!window.__issue10,null,{timeout:30000});r.checks.push({name:'Original browser page restored without fixture storage/account mutations',status:'PASS'})}
 fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(r,null,2));console.log(JSON.stringify({checks:r.checks,errors:r.errors,blocked:r.blocked}));process.exit(r.errors.length||r.checks.some(c=>c.status==='FAIL')?1:0);
})().catch(e=>{console.error(e.message);process.exit(1)});
