'use strict';
// Existing tab only. Recorded public TMDB responses; account/storage mutations isolated.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'audit/issue-10-details'),sha=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const paths=['media/seasons-info.js','info/seasons-info.js','ui/design-optimized.js','ui/interface-plus.js','ui/cardify-plus.js','ui/stremio-hybrid.js','trakt/trakt-plus.js','trakt/trakt.js'];
const files=Object.fromEntries(paths.map(p=>['/'+p,fs.readFileSync(path.join(root,p),'utf8')])),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const metadata=JSON.parse(fs.readFileSync(path.join(root,'audit/issue-10/metadata.json'))),episodes=JSON.parse(fs.readFileSync(path.join(root,'audit/issue-10/episode-metadata.json')));
const sourceKey=u=>u.pathname.endsWith('/stremio-hybrid.js')?'/ui/stremio-hybrid.js':Object.keys(files).find(k=>u.pathname.endsWith(k));
(async()=>{
 const r={commit:sha,sources:{},checks:[],errors:[],requests:[],blocked:['Physical Google TV / older WebView hardware','Real playback and Trakt writes: deliberately not performed']};
 const check=(name,ok,data)=>{r.checks.push({name,status:ok?'PASS':'FAIL',data});if(!ok)throw Error(name)};
 const b=await chromium.connectOverCDP('http://127.0.0.1:9222'),p=b.contexts()[0].pages().find(p=>p.url().includes('siaivo.isroot.in'));if(!p)throw Error('BLOCKED: existing Lampa tab not available');
 const metrics=await p.context().newCDPSession(p);await metrics.send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
 const restore=p.url();let capture=true;const jobs=[];
 const onResponse=res=>{const key=sourceKey(new URL(res.url()));if(capture&&key)jobs.push(res.body().then(body=>r.sources[key]={sha:hash(body),expected:hash(files[key]),commit:res.headers()['x-issue10-commit']}).catch(()=>{}))};
 const onError=e=>{if(capture)r.errors.push(e.message.replace(/https?:\/\/\S+/g,'[URL]'))};p.on('response',onResponse);p.on('pageerror',onError);
 const setup=()=>p.evaluate(()=>{
  if(window.__issue10)return;const L=Lampa,s=window.__issue10={shadow:{},local:{},writes:[],selects:[]},get=L.Storage.get,field=L.Storage.field;
  L.Storage.get=function(k,d){if(k in s.shadow)return s.shadow[k];if(k==='trakt_token')return s.authorized?'synthetic-browser-fixture':null;if(/^trakt_/.test(k))return k==='trakt_plus_enable'?s.authorized===true:false;return get.call(this,k,d)};
  L.Storage.field=function(k){if(/^trakt_/.test(k))return k==='trakt_plus_enable'?s.authorized===true:false;if(k in s.shadow)return s.shadow[k];return field.call(this,k)};
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
  await p.addScriptTag({url:'https://gorlim590.github.io/lampa/trakt/trakt.js?fixture='+sha});
  await p.addScriptTag({url:'https://gorlim590.github.io/lampa/trakt/trakt-plus.js?fixture='+sha});
  await p.addScriptTag({url:'https://gorlim590.github.io/lampa/ui/interface-plus.js?fixture='+sha});
  async function openFull(id){await p.evaluate(id=>Lampa.Activity.push({component:'full',source:'tmdb',id,method:'tv',card:{id,source:'tmdb',media_type:'tv',name:'Details fixture'}}),id);await p.waitForFunction(()=>!!document.querySelector('.activity--active [data-series-info]'));}
  const top=()=>p.evaluate(()=>{const root=document.querySelector('.activity--active');return {sections:root.querySelectorAll('[data-series-info]').length,legacy:root.querySelectorAll('.full-start-new__details.trakt,.trakt-details-progress').length,fields:[...root.querySelectorAll('[data-series-field]')].map(n=>({key:n.dataset.seriesField,text:n.textContent})),text:root.querySelector('[data-series-info]')?.textContent};});
  await openFull(220542);
  const off=await top();check('Trakt off: one upper section, no invented counters or duplicated badges',off.sections===1&&off.legacy===0&&!off.fields.some(f=>/^(watched|seasons|episodes|next)$/.test(f.key)),off);
  await p.evaluate(()=>{
   const s=__issue10;s.authorized=true;s.phase='loading';s.calls=[];
   TraktTV.api.get=async function(path){s.calls.push(path);if(path==='/users/me')return {ids:{uuid:'synthetic-details-account'}};
    if(path.startsWith('/search/tmdb/'))return [{show:{ids:{tmdb:Number(path.match(/tmdb\/(\d+)/)[1]),trakt:202569}}}];
    if(path.startsWith('/shows/')){if(s.phase==='loading')await new Promise(resolve=>s.release=resolve);if(s.phase==='error')throw Object.assign(Error('fixture offline'),{status:401});return {aired:52,completed:s.completed==null?52:s.completed,seasons:[{number:1,aired:52,completed:s.completed==null?52:s.completed}],last_episode:{season:1,number:52,title:'The Last Volume',ids:{tmdb:7810341},first_aired:'2026-10-23T14:40:00Z'},next_episode:{season:1,number:53,title:'Next verified volume',ids:{tmdb:7810342},first_aired:'2026-10-30T14:40:00Z'}};}
    if(path==='/sync/last_activities')return {all:'2026-01-01T00:00:00.000Z',movies:{watched_at:'2026-01-01T00:00:00.000Z'},episodes:{watched_at:'2026-01-01T00:00:00.000Z'}};return [];
   };
   document.dispatchEvent(new CustomEvent('traktplus:watched'));
  });
  await p.waitForFunction(()=>typeof __issue10.release==='function');
  check('Loading does not show fake zero or restore duplicate legacy badge',(await top()).legacy===0&&!(await top()).text.includes('Переглянуто: 0'));
  await p.evaluate(()=>{__issue10.phase='ready';__issue10.release();});
  await p.waitForFunction(()=>document.querySelector('.activity--active [data-series-field="watched"]')?.textContent.includes('52/52'));
  const ready=await top();check('Confirmed Trakt progress appears exactly once, without TMDB totals or absolute S1E52',ready.sections===1&&ready.legacy===0&&ready.fields.filter(f=>f.key==='watched').length===1&&!ready.fields.some(f=>/^(seasons|episodes)$/.test(f.key))&&!ready.text.includes('S1E52')&&ready.text.includes('The Last Volume'),ready);
  check('Average episode runtime remains available',ready.fields.some(f=>f.key==='runtime'&&/≈[1-9]/.test(f.text)));
  await p.screenshot({path:path.join(out,'after-full.png')});
  await p.keyboard.press('ArrowRight');await p.keyboard.press('Escape');
  // Re-enter through the native Full route after keyboard interaction.
  await openFull(220542);check('Reopening keeps a single upper section',(await top()).sections===1&&(await top()).legacy===0);
  await p.evaluate(()=>{__issue10.completed=51;document.dispatchEvent(new CustomEvent('traktplus:watched'))});
  await p.waitForFunction(()=>document.querySelector('.activity--active [data-series-field="watched"]')?.textContent.includes('51/52'));
  check('Confirmed watched refresh updates the same section once',(await top()).fields.filter(f=>f.key==='watched').length===1);
  await p.evaluate(()=>{__issue10.phase='error';document.dispatchEvent(new CustomEvent('traktplus:watched'))});
  await p.waitForTimeout(250);check('Error retains previous verified progress, never zero',(await top()).text.includes('51/52'));
  for(const id of [1396,1429]){await p.evaluate(()=>__issue10.phase='ready');await openFull(id);await p.waitForFunction(()=>document.querySelector('.activity--active [data-series-field="watched"]')?.textContent.includes('51/52'));const state=await top();check('Other TV/anime '+id+': one upper section, no duplicate provider counters',state.sections===1&&state.legacy===0&&!state.fields.some(f=>/^(seasons|episodes)$/.test(f.key)));}
  await Promise.all(jobs);check('Exact changed sources and active UI scripts verified by hash/commit',Object.keys(files).filter(k=>k!=='/info/seasons-info.js').every(k=>r.sources[k]?.sha===hash(files[k])&&r.sources[k]?.commit===sha),r.sources);
  check('No JavaScript exceptions',r.errors.length===0,r.errors);
 }catch(e){r.errors.push(e.message.replace(/https?:\/\/\S+/g,'[URL]'))}
 finally{capture=false;await metrics.send('Emulation.clearDeviceMetricsOverride');await metrics.detach();await p.unroute('**/*',route);p.off('response',onResponse);p.off('pageerror',onError);await p.goto(restore,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.Lampa?.Activity?.active()?.activity&&!window.__issue10,null,{timeout:30000});r.checks.push({name:'Original browser page restored without fixture storage/account mutations',status:'PASS'})}
 fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(r,null,2));console.log(JSON.stringify({checks:r.checks,errors:r.errors,blocked:r.blocked}));process.exit(r.errors.length||r.checks.some(c=>c.status==='FAIL')?1:0);
})().catch(e=>{console.error(e.message);process.exit(1)});
