'use strict';
// Existing CDP tab only. Controlled HTTP fixtures; memory-only account/config writes.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=root+'/audit/issue-17';fs.mkdirSync(out,{recursive:true});
const sha=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),paths=['loader.js','providers/parsers.js','providers/parser-search.js','providers/torrent-search.js','torrents-redesign.js','ui/stremio-hybrid.js'];
const files=Object.fromEntries(paths.map(p=>['/'+p,fs.readFileSync(root+'/'+p,'utf8')])),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const sourceKey=u=>u.pathname.endsWith('/preview-loader.js')?'/loader.js':u.pathname.endsWith('/stremio-hybrid.js')?'/ui/stremio-hybrid.js':Object.keys(files).find(k=>u.pathname.endsWith(k));
const release=(letter,quality='1080p Ukr')=>({Title:'Fixture (2020) '+quality,Tracker:'fixture',Size:1073741824,Seeders:50,Peers:2,PublishDate:'2026-10-01T12:00:00Z',MagnetUri:'magnet:?xt=urn:btih:'+letter.repeat(40),AudioLanguages:[quality.includes('Ukr')?'uk':'en']});
(async()=>{
 const r={commit:sha,checks:[],errors:[],sources:{},requests:[],beforeAfter:{},limits:['Synthetic backend responses; no live endpoint health claim','No real TorrServer mutations/playback or physical Google TV test']},check=(name,ok,data)=>{r.checks.push({name,status:ok?'PASS':'FAIL',data});if(!ok)throw Error(name)};
 const b=await chromium.connectOverCDP('http://127.0.0.1:9222'),p=b.contexts()[0].pages().find(p=>p.url().includes('siaivo.isroot.in'));if(!p)throw Error('BLOCKED: existing Lampa tab not available');
 const restore=p.url();let capture=true,stage='baseline',gateResolve;const gate=new Promise(resolve=>gateResolve=resolve),jobs=[];
 const onError=e=>{if(capture)r.errors.push(e.message.replace(/https?:\/\/\S+/g,'[URL]'))};p.on('pageerror',onError);
 const onResponse=res=>{const k=sourceKey(new URL(res.url()));if(capture&&k)jobs.push(res.body().then(body=>r.sources[k]={received:hash(body),expected:hash(files[k]),commit:res.headers()['x-issue17-commit']}).catch(()=>{}))};p.on('response',onResponse);
 const setup=()=>p.evaluate(()=>{
  if(window.__issue17)return;const L=Lampa,get=L.Storage.get,field=L.Storage.field,s=window.__issue17={shadow:{},local:{},writes:[],nativeGet:L.Parser.get};
  window.LAMPA_PLUGINS_LIST=['trakt/trakt.js','trakt/trakt-plus.js','providers/torrent-search.js','providers/parsers.js','torrents-redesign.js','ui/stremio-hybrid.js'];
  s.shadow.gl_loader_plugins=window.LAMPA_PLUGINS_LIST.join(',');s.shadow.ydesign_ua_torrents=false;
  s.shadow['ps_list_combo_v0.9']=[{base:'fixture_main',name:'Fixture primary',shortName:'Fixture primary',url:'https://primary.issue17.invalid',settings:{parser_torrent_type:'jackett',key:'fixture'}},{base:'fixture_second',name:'Fixture secondary',shortName:'Fixture secondary',url:'https://secondary.issue17.invalid',settings:{parser_torrent_type:'jackett',key:'fixture'}},{base:'fixture_prow',name:'Fixture Prowlarr',shortName:'Fixture Prowlarr',url:'https://secondary.issue17.invalid',settings:{parser_torrent_type:'prowlarr',key:'fixture'}}];
  Object.assign(s.shadow,{bat_url_two:'fixture_main','ps_active_sec_v0.9':'1',parser_use:true,parser_torrent_type:'jackett',parser_use_link:'both',parse_timeout:2,parser_use_proxy:false,parse_lang:'df',torrents_filter:{},torrents_cinema_enabled:true});
  L.Storage.get=function(k,d){if(k in s.shadow)return s.shadow[k];if(/^trakt_/.test(k))return k==='trakt_token'?null:false;return get.call(this,k,d)};L.Storage.field=function(k){if(k in s.shadow)return s.shadow[k];if(/^trakt_/.test(k))return false;return field.call(this,k)};
  L.Storage.set=(k,v)=>{s.writes.push(k);s.shadow[k]=v};const localGet=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(k in s.local)return s.local[k];if(/^trakt_/.test(k))return null;return localGet.call(this,k)};Storage.prototype.setItem=function(k,v){s.local[k]=String(v)};Storage.prototype.removeItem=function(k){s.local[k]=null};
  L.Favorite.add=L.Favorite.remove=()=>{};if(L.Socket)L.Socket.send=()=>{};
 });
 const route=async route=>{const req=route.request(),u=new URL(req.url()),k=sourceKey(u);if(!['GET','HEAD','OPTIONS'].includes(req.method()))return route.abort();
  if(k){await setup();return route.fulfill({contentType:'application/javascript',body:files[k],headers:{'Cache-Control':'no-store','X-Issue17-Commit':sha}}).catch(()=>{})}
  if(/\.issue17\.invalid$/.test(u.hostname)){
   const which=u.hostname.startsWith('primary.')?'primary':'secondary',phase=stage;r.requests.push({stage:phase,role:which,path:u.pathname,query:u.searchParams.get('Query')||u.searchParams.get('query')||'',started:Date.now()});
   await new Promise(resolve=>setTimeout(resolve,which==='primary'?60:650));
   if(phase==='error'&&which==='primary')return route.fulfill({status:503,json:{error:'fixture unavailable'},headers:{'Access-Control-Allow-Origin':'*'}}).catch(()=>{});
   const a=release('a'),rows=which==='primary'?[a]:[{...a,MagnetUri:a.MagnetUri+'&tr=https://tracker.invalid'},release('b','2160p Eng')];
   const json=u.pathname==='/api/v1/search'?rows.map(row=>({protocol:'torrent',title:row.Title,indexer:row.Tracker,size:row.Size,seeders:row.Seeders,leechers:row.Peers,downloadUrl:row.MagnetUri,infoHash:row.MagnetUri.match(/btih:([a-f0-9]+)/)[1],audioLanguages:row.AudioLanguages,publishDate:row.PublishDate})):{Results:rows};
   return route.fulfill({json,headers:{'Access-Control-Allow-Origin':'*'}}).catch(()=>{});
  }
  if(u.hostname==='api.trakt.tv')return route.fulfill({json:[]});return route.continue();};
 const movie={id:170001,source:'tmdb',title:'Fixture',original_title:'Fixture',original_language:'en',release_date:'2020-01-01',genres:[]};
 const query=(term)=>p.evaluate(({movie,term})=>new Promise((resolve,reject)=>{const start=performance.now(),events=[],timer=setTimeout(()=>reject(Error('Fixture query deadline')),10000);(__issue17.baseline?__issue17.nativeGet:Lampa.Parser.get).call(Lampa.Parser,{component:'torrents',parser_streaming:true,search:term,movie},data=>{events.push({ms:performance.now()-start,pending:!!data.parser_pending,count:data.Results.length});if(!data.parser_pending){clearTimeout(timer);resolve({events,results:data.Results,stats:window.ParserProviders?.stats?.()})}},reject)}),{movie,term});
 await p.route('**/*',route);
 try{
  await p.reload({waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.appready&&window.Lampa?.Activity?.active()?.activity,null,{timeout:45000});
  if(!await p.evaluate(()=>!!window.LampaTorrentSearch))await p.addScriptTag({url:'https://gorlim590.github.io/lampa/providers/torrent-search.js?fixture='+sha});
  if(!await p.evaluate(()=>!!window.ParserProviders))await p.addScriptTag({url:'https://gorlim590.github.io/lampa/providers/parsers.js?fixture='+sha});
  await p.waitForFunction(()=>!!window.ParserProviders?.search,null,{timeout:10000});await p.evaluate(()=>{window.__issue17.baseline=true});
  r.beforeAfter.before=await query('Fixture baseline');check('Baseline native both dispatch waits for slow source and full-magnet comparison retains duplicate',r.beforeAfter.before.events.length===1&&r.beforeAfter.before.results.length===3,r.beforeAfter.before.events);
  await p.evaluate(()=>__issue17.baseline=false);stage='parallel';r.beforeAfter.after=await query('Fixture parallel');
  check('Fast result before slow source, followed by one aggregate with canonical dedup',r.beforeAfter.after.events.length===2&&r.beforeAfter.after.events[0].pending&&r.beforeAfter.after.events[0].ms<r.beforeAfter.after.events[1].ms&&r.beforeAfter.after.results.length===2,r.beforeAfter.after.events);
  const count=r.requests.length;const cached=await query('Fixture parallel');check('Warm source caches issue zero extra HTTP requests',r.requests.length===count&&cached.results.length===2&&cached.events.length===1,{requests:r.requests.length-count,events:cached.events});
  await p.evaluate(movie=>Lampa.Activity.push({component:'torrents',search:'Fixture UI',movie,page:1}),movie);await p.waitForFunction(()=>document.querySelectorAll('.activity--active .torrent-item').length===1,null,{timeout:10000});
  await p.evaluate(()=>{const row=document.querySelector('.activity--active .torrent-item');Lampa.Controller.collectionFocus(row);window.__issue17.focusKey=row.getAttribute('data-parser-release-key')});
  await p.waitForFunction(()=>document.querySelectorAll('.activity--active .torrent-item').length===2,null,{timeout:10000});
  check('One native/Cinema torrent list updates without duplicate DOM or stolen row focus',await p.evaluate(()=>{const root=document.querySelector('.activity--active');return root.querySelectorAll('.torrent-item').length===2&&root.querySelector('.torrent-item.focus')?.getAttribute('data-parser-release-key')===__issue17.focusKey&&root.querySelectorAll('.torrent-filter').length===1}));
  check('Merged source provenance remains visible in Cinema cards',await p.evaluate(()=>[...document.querySelectorAll('.activity--active .ctr-chip.parser-provenance')].some(n=>n.textContent.includes('Основний')&&n.textContent.includes('Додатковий'))));
  await p.keyboard.press('ArrowDown');await p.keyboard.press('ArrowUp');check('Native arrow navigation remains focused',await p.locator('.activity--active .focus').count()>0);
  await p.evaluate(()=>{const root=document.querySelector('.activity--active');__issue17.mount=ParserProviders.mount(root,{isAlive:()=>true,onBack:()=>Lampa.Controller.toggle('content'),onChange:()=>Lampa.Controller.toggle('content')});root.querySelector('.filter--parser:last-child').dispatchEvent(new Event('hover:enter'))});
  await p.keyboard.press('ArrowDown');await p.keyboard.press('Enter');await p.keyboard.press('ArrowDown');await p.keyboard.press('ArrowDown');await p.keyboard.press('Enter');
  // If current menu selection stayed unchanged, pick the known third fixture source through native Select's rendered item.
  await p.evaluate(()=>{const root=document.querySelector('.activity--active');if(Lampa.Storage.get('ps_active_sec_v0.9')!=='2'){root.querySelector('.filter--parser:last-child').dispatchEvent(new Event('hover:enter'));}});
  const selected=await p.evaluate(()=>({type:Lampa.Storage.get('parser_torrent_type_two'),url:Lampa.Storage.get('prowlarr_url_two'),jackett:Lampa.Storage.get('jackett_url_two')}));
  check('Native source menu selects mixed Prowlarr secondary with correct fields',selected.type==='prowlarr'&&selected.url==='https://secondary.issue17.invalid'&&!selected.jackett,selected);
  stage='mixed';const mixed=await query('Fixture mixed');check('Mixed native Jackett/Prowlarr keeps both results and language metadata',mixed.results.length===2&&mixed.results.some(row=>row.AudioLanguages?.includes('en')));
  stage='error';const partial=await query('Fixture unavailable primary');check('Primary503 leaves secondary results usable',partial.results.length===2&&partial.results.every(row=>row.parser_sources.some(s=>s.id==='secondary')));
  await p.evaluate(()=>{Lampa.Torrent.start=(row,movie)=>{__issue17.transport={magnet:row.MagnetUri,link:row.Link,id:movie.id}};$('.activity--active .torrent-item').first().trigger('hover:enter')});
  check('Native release OK preserves transport into Torrent/TorrServer boundary',await p.evaluate(()=>__issue17.transport?.id===170001&&/^magnet:\?xt=urn:btih:/.test(__issue17.transport.magnet)));
  await p.screenshot({path:out+'/torrent-list.png'});await Promise.all(jobs);check('Exact changed JS and loader actually loaded by hash/commit',Object.keys(files).every(k=>r.sources[k]?.received===hash(files[k])&&r.sources[k]?.commit===sha),r.sources);check('No JS exceptions',r.errors.length===0,r.errors);
 }catch(e){r.errors.push(e.message.replace(/https?:\/\/\S+/g,'[URL]'));r.diagnostic=await p.evaluate(()=>({component:Lampa.Activity.active()?.component,items:document.querySelectorAll('.activity--active .torrent-item').length,menu:document.querySelector('.selectbox__title')?.textContent})).catch(()=>null)}
 finally{capture=false;gateResolve();await p.unroute('**/*',route);p.off('response',onResponse);p.off('pageerror',onError);await p.goto(restore,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.Lampa?.Activity?.active()?.activity&&!window.__issue17,null,{timeout:30000});r.checks.push({name:'Original existing browser restored; no fixture globals/account writes',status:'PASS'})}
 fs.writeFileSync(out+'/browser.json',JSON.stringify(r,null,2));console.log(JSON.stringify({checks:r.checks,errors:r.errors,diagnostic:r.diagnostic}));process.exit(r.errors.length||r.checks.some(c=>c.status==='FAIL')?1:0);
})().catch(e=>{console.error(e.message);process.exit(1)});
