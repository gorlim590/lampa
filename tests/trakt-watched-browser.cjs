'use strict';
// Existing authorized desktop tab only. All Trakt HTTP mutations are blocked;
// tested Trakt+, Storage and Favorite operations use in-memory fixtures.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'audit/issue-7-account');fs.mkdirSync(out,{recursive:true});
const commit=require('node:child_process').execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
(async()=>{
 const r={commit,kind:'Real current Lampa/CDP + exact modified source; Trakt responses/Favorite/owned cache are fixtures, never live-account verification',checks:[],errors:[],blockedMutations:[],sources:{},blocked:['Real Trakt sync/account954-vs911 reconciliation','Physical Google TV/performance/player']},check=(name,ok,data)=>r.checks.push({name,status:ok?'PASS':'FAIL',...(data===undefined?{}:{data})});
 const browser=await chromium.connectOverCDP('http://127.0.0.1:9222'),page=browser.contexts()[0].pages().find(p=>p.url().startsWith('https://siaivo.isroot.in/'));if(!page)throw Error('Existing Lampa tab not found');
 page.on('pageerror',e=>r.errors.push(e.message.replace(/https?:\/\/[^\s)]+/g,'[URL]')));
 const files={'/loader.js':fs.readFileSync(path.join(root,'loader.js'),'utf8'),'/trakt/trakt.js':fs.readFileSync(path.join(root,'trakt/trakt.js'),'utf8'),'/trakt/trakt-plus.js':fs.readFileSync(path.join(root,'trakt/trakt-plus.js'),'utf8'),'/ui/design-optimized.js':fs.readFileSync(path.join(root,'ui/design-optimized.js'),'utf8')};
 const responseJobs=[];page.on('response',response=>{const url=new URL(response.url()),key=Object.keys(files).find(k=>url.pathname.endsWith(k));if(key)responseJobs.push(response.body().then(b=>r.sources[key]={expected:hash(files[key]),received:hash(b),commit:response.headers()['x-codex-source-commit']}).catch(()=>{}));});
 let livePhase=false,liveDone=true,fixtureSeed=null; // This suite never samples a real account.
 if(liveDone){try{r.readOnlyTrakt=JSON.parse(fs.readFileSync(path.join(out,'browser-report.json'),'utf8')).readOnlyTrakt;r.readOnlyTrakt.note='Prior read-only schema/count observations; not repeated for this source revision';}catch{r.readOnlyTrakt={status:'BLOCKED',reason:'Read-only live sampling skipped'}}}
 const route=async route=>{
  const req=route.request(),url=new URL(req.url());
  if(!['GET','HEAD','OPTIONS'].includes(req.method())){r.blockedMutations.push({method:req.method(),path:url.pathname});return route.abort();}
  const key=Object.keys(files).find(k=>url.pathname.endsWith(k));
  if(key==='/trakt/trakt-plus.js'&&!liveDone){
   liveDone=true;livePhase=true;
   r.readOnlyTrakt=await page.evaluate(async()=>{
    let firstShow;
    const read=async(kind,query='?extended=full')=>{try{const data=await Promise.race([TraktTV.api.get('/sync/watched/'+kind+query),new Promise((_,reject)=>setTimeout(()=>reject(Error('read timeout')),12000))]);if(!Array.isArray(data))return{status:'BLOCKED',reason:'non-array response'};const key=kind==='shows'?'show':'movie';if(kind==='shows')firstShow=data[0];return{status:'PASS',records:data.length,withTMDB:data.filter(x=>x[key]?.ids?.tmdb).length,withAiredTotal:kind==='shows'?data.filter(x=>Number(x.show?.aired_episodes)>0).length:undefined,withSeasons:kind==='shows'?data.filter(x=>Array.isArray(x.seasons)).length:undefined};}catch(e){return{status:'BLOCKED',reason:e.status?'HTTP '+e.status:e.name||'request error'}}};
    const progress=async()=>{try{if(!firstShow?.show?.ids?.trakt)return{status:'BLOCKED',reason:'No Trakt show ID'};const p=await Promise.race([TraktTV.api.get('/shows/'+firstShow.show.ids.trakt+'/progress/watched?hidden=true&specials=false&count_specials=false'),new Promise((_,reject)=>setTimeout(()=>reject(Error('timeout')),12000))]);return{status:'PASS',keys:Object.keys(p||{}),aired:p?.aired,completed:p?.completed,withSeasons:Array.isArray(p?.seasons)};}catch(e){return{status:'BLOCKED',reason:e.status?'HTTP '+e.status:e.name||'request error'}}};
    const history=async()=>{try{const a=await TraktTV.api.get('/sync/history/movies?page=1&limit=100'),b=await TraktTV.api.get('/sync/history/movies?page=2&limit=100');return{status:'PASS',page1:a.length,page2:b.length,firstEventRepeated:!!a.length&&!!b.length&&a[0].id===b[0].id};}catch(e){return{status:'BLOCKED',reason:e.status?'HTTP '+e.status:e.name||'request error'}}};
    const movies=await read('movies'),shows=await read('shows'),showsDefault=await read('shows',''),showsEpisodes=await read('shows','?extended=full,episodes');
    return{kind:'Existing native API GET only; aggregate schema/counts, no token extraction or account writes; native API cache may apply',movies,shows,showsDefault,showsEpisodes,progress:await progress(),history:await history()};
   });livePhase=false;
  }
  if(key==='/trakt/trakt-plus.js')await page.evaluate(seed=>{
   if(window.__issue7)return;
   const L=Lampa,keys=['favorite','trakt_plus_synced','trakt_plus_library','trakt_plus_library_t','trakt_plus_last_sync','trakt_plus_last_sync_owner','trakt_plus_watched_cache'],oldGet=L.Storage.get,oldSet=L.Storage.set,oldField=L.Storage.field;
   const original=Object.fromEntries(keys.map(k=>[k,JSON.stringify(oldGet.call(L.Storage,k,null))]));
   const state=window.__issue7={original,oldGet,oldSet,oldField,oldApiGet:TraktTV.api.get,oldFavorite:{check:L.Favorite.check,add:L.Favorite.add,remove:L.Favorite.remove},oldRowsAdd:L.ContentRows.add,oldTimelineView:L.Timeline.view,account:seed?.account||'runtime-a',credential:seed?.credential||'synthetic-runtime-a',movieWatched:seed?.movieWatched!==false,holdIdentity:!!seed?.holdIdentity,activityMode:'valid',activityCalls:0,rows:[],stripped:true,mode:'partial',calls:[],adds:[],removes:[],fakeViewed:new Set(),cache:{trakt_plus_synced:['movie:99','tv:1396'],trakt_plus_library:[{i:99,t:'Earlier fixture',w:'2020-01-01',p:''}],trakt_plus_last_sync:123,trakt_plus_watched_cache:{v:4,t:Date.now(),m:[],s:['1396']}}};if(seed?.cache)state.cache=seed.cache;
   L.Storage.get=function(k,d){if(k==='trakt_token')return state.credential;if(k in state.cache)return state.cache[k];if(/^trakt_plus_(watched_cache|synced|library|library_t|last_sync|last_sync_owner)$/.test(k))return d;return oldGet.call(this,k,d)};
   L.Storage.field=function(k,...a){if(k==='trakt_plus_autosync')return false;if(k==='trakt_plus_auto_home')return false;return oldField.call(this,k,...a)};
   L.Storage.set=function(k,v){if(/^trakt_plus_(watched_cache|synced|library|library_t|last_sync|last_sync_owner)$/.test(k)){state.cache[k]=v;return;}if(k==='favorite')throw Error('Unexpected real Favorite write');return oldSet.call(this,k,v)};
   L.ContentRows.add=function(row){state.rows.push(row.name);return state.oldRowsAdd.call(this,row)};
   L.Timeline.view=()=>({percent:0});
   L.Favorite.check=c=>({viewed:state.fakeViewed.has((c.method||c.type||'movie')+':'+c.id)});
   L.Favorite.add=(kind,c)=>{state.adds.push({kind,id:c.id});state.fakeViewed.add((c.method||c.type||'movie')+':'+c.id)};
   L.Favorite.remove=(...a)=>state.removes.push(a);
   const stamp={movies:{watched_at:'2026-01-01T00:00:00.000Z'},episodes:{watched_at:'2026-01-01T00:00:00.000Z'},all:'2026-01-01T00:00:00.000Z'};
   const m={ids:{tmdb:438631,trakt:100},title:'Dune',year:2021,images:{poster:['image.tmdb.org/t/p/w300/9BfGggdaTOgdKJ7MdiBVjGKy3IE.jpg']},genres:['science-fiction'],rating:8,votes:10000,released:'2021-01-01'};
   TraktTV.api.get=async function(p){state.calls.push(p);if(p==='/users/settings'){if(state.holdIdentity)return new Promise(resolve=>state.identityResolve=resolve);return {user:{ids:{uuid:state.account}}};}if(p==='/sync/last_activities'){state.activityCalls++;return state.activityMode==='invalid'||state.activityMode==='invalid-final'&&state.activityCalls%2===0?{movies:{},episodes:{}}:stamp;}if(p.startsWith('/sync/watched/movies')){if(state.mode==='error')throw Object.assign(Error('synthetic unavailable'),{status:401});return state.movieWatched?[{movie:m}]:[]};if(p.startsWith('/sync/history/movies'))return [];if(p.startsWith('/sync/watched/shows'))return [1396,1429].map(id=>({show:{ids:{tmdb:id,trakt:id},title:id===1396?'Breaking Bad':'Attack on Titan',aired_episodes:3},seasons:state.stripped?undefined:[{number:1,episodes:(state.mode==='complete'?[1,2,3]:[1]).map(n=>({number:n,plays:1}))}]}));if(p.startsWith('/shows/'))return{aired:3,completed:state.mode==='complete'?3:1};return Array.from({length:8},(_,i)=>({movie:{...m,ids:{tmdb:438631+i,trakt:100+i}},watchers:100}));};
  },fixtureSeed);
  if(key)return route.fulfill({status:200,contentType:'application/javascript',body:files[key],headers:{'Cache-Control':'no-store','X-Codex-Source-Commit':commit}});
  if(livePhase&&(/\/sync\/(watched|history)\/(movies|shows)/.test(url.pathname)||/\/shows\/[^/]+\/progress\/watched/.test(url.pathname)))return route.continue();
  if(/(?:apx\.lme\.isroot\.in|api\.trakt\.tv)$/.test(url.hostname)&&url.pathname.includes('/'))return route.fulfill({status:200,contentType:'application/json',body:'[]'});
  return route.continue();
 };
 await page.route('**/*',route);
 let originalViewport=page.viewportSize();
 try{
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.TraktPlus?.version==='3.2.1-issue7-account'&&window.YDesignLoaded&&Lampa.Activity.active()?.activity,null,{timeout:50000});
  await Promise.all(responseJobs);
  check('Exact modified Trakt+ and unchanged baseline YDesign loaded by SHA256, not stale cache',Object.keys(files).every(k=>r.sources[k]?.received===hash(files[k])&&r.sources[k]?.commit===commit),r.sources);
  await page.waitForFunction(()=>TraktPlus.isWatchedShow({id:1396,type:'tv'})===false&&TraktPlus.isWatched({id:438631,method:'movie'})===true);
  check('Known partial TV/anime are false; confirmed watched movie is true',await page.evaluate(()=>TraktPlus.isWatched({id:438631,method:'movie'})&&!TraktPlus.isWatched({id:1396,type:'tv'})&&!TraktPlus.isWatched({id:1429,type:'anime'})));
  const first=await page.evaluate(()=>TraktPlus.syncWatched());check('Browser import succeeds additively on complete transport with partial-series evidence',first.status==='complete'&&first.removed===0,first);
  await page.evaluate(()=>{__issue7.mode='error'});const failed=await page.evaluate(()=>TraktPlus.syncWatched());check('Browser API error preserves prior records and reports unknown, not false',failed.status==='failed'&&await page.evaluate(()=>TraktPlus.isWatched({id:438631})===null&&TraktPlus.watchedStatus({id:438631}).phase==='error')&&await page.evaluate(()=>__issue7.cache.trakt_plus_synced.includes('movie:99')&&__issue7.removes.length===0));
  await page.evaluate(()=>{__issue7.mode='complete'});const full=await page.evaluate(()=>TraktPlus.syncWatched());check('All aired episodes mark series/anime without losing previous imports',full.status==='complete'&&await page.evaluate(()=>TraktPlus.isWatchedShow({id:1396,type:'tv'})&&TraktPlus.isWatchedShow({id:1429,type:'anime'})&&__issue7.cache.trakt_plus_synced.includes('movie:99')));
  const again=await page.evaluate(()=>TraktPlus.syncWatched());check('Repeated browser import does not duplicate Favorite additions',again.added===0&&again.removed===0);
  await page.evaluate(()=>{
   const cards=[{id:438631,title:'Дюна',original_title:'Dune',release_date:'2021-01-01',poster_path:'/9BfGggdaTOgdKJ7MdiBVjGKy3IE.jpg',method:'movie',type:'movie'},{id:1396,title:'Пуститися берега',name:'Breaking Bad',original_name:'Breaking Bad',first_air_date:'2008-01-20',poster_path:'/3v1Bj3cdjW96f7XvQVv6veRmsE.jpg',method:'tv',type:'tv'},{id:1429,title:'Атака титанів',name:'Attack on Titan',original_name:'Attack on Titan',first_air_date:'2013-04-06',method:'tv',type:'tv'}];
   cards.forEach(c=>{c.source='tmdb';c.params={emit:{onEnter:()=>Lampa.Router.call('full',c)}}});
   Lampa.Component.add('issue7_fixture',function(o){const c=Lampa.Maker.make('Main',o);c.use({onCreate:function(){c.build([{title:'Issue7 · native cards / mock watch data',results:cards}])}});return c});Lampa.Activity.push({component:'issue7_fixture',title:'Issue7 fixtures',page:1});
  });
  await page.waitForFunction(()=>document.querySelectorAll('.activity--active .card').length>=3,null,{timeout:20000});
  await page.waitForFunction(()=>document.querySelector('.activity--active .ydesign-card'),null,{timeout:20000});
  check('Real native cards are decorated by existing YDesign with no duplicate Trakt badge',await page.evaluate(()=>document.querySelectorAll('.activity--active .ydesign-card').length>=3&&!document.querySelector('.activity--active .trakt-plus-badge')));
  await page.waitForFunction(()=>document.querySelectorAll('.activity--active .card.ydesign-is-watched').length===3,null,{timeout:15000});
  check('Confirmed complete fixtures produce real YDesign watched dim/check marks',await page.locator('.activity--active .card.ydesign-is-watched .ydesign-watched-check').count()===3);
  await page.evaluate(async()=>{__issue7.mode='partial';await TraktPlus.syncWatched()});
  check('API reports known partial-series false independently of existing local rendered marks',await page.evaluate(()=>TraktPlus.isWatchedShow({id:1396,type:'tv'})===false&&TraktPlus.isWatchedShow({id:1429,type:'anime'})===false));
  await page.evaluate(()=>{__issue7.account='runtime-b';__issue7.credential='synthetic-runtime-b';__issue7.movieWatched=false});
  check('Account change immediately returns null instead of A watched status',await page.evaluate(()=>TraktPlus.isWatched({id:438631})===null));
  check('Account B empty watched response becomes false with its own owner cache',(await page.evaluate(()=>TraktPlus.syncWatched())).status==='complete'&&await page.evaluate(()=>TraktPlus.isWatched({id:438631})===false&&__issue7.cache.trakt_plus_watched_cache.owner==='uuid:runtime-b'));
  await page.evaluate(()=>{__issue7.credential='synthetic-rotated-b'});
  check('Same-user credential rotation is unknown until identity reverified',await page.evaluate(()=>TraktPlus.isWatched({id:438631})===null));
  await page.waitForFunction(()=>TraktPlus.isWatched({id:438631})===false);
  check('Same-owner cache restored after credential rotation',true);
  const priorCache=await page.evaluate(()=>JSON.stringify(__issue7.cache));
  await page.evaluate(()=>{__issue7.activityMode='invalid-final';__issue7.activityCalls=0;__issue7.movieWatched=true});
  const malformed=await page.evaluate(()=>TraktPlus.syncWatched());
  check('Malformed final activity snapshot preserves all prior fixture storage',malformed.status==='failed'&&priorCache===await page.evaluate(()=>JSON.stringify(__issue7.cache)));
  await page.evaluate(()=>{__issue7.activityMode='valid';__issue7.account='runtime-a';__issue7.credential='synthetic-runtime-a2';__issue7.movieWatched=true});await page.evaluate(()=>TraktPlus.syncWatched());
  const oldRows=await page.evaluate(()=>__issue7.rows.length);await page.addScriptTag({content:files['/trakt/trakt-plus.js']});
  check('Reexecuting plugin registers no duplicate rows or initialization',await page.evaluate(()=>__issue7.rows.length)===oldRows);
  await page.evaluate(()=>{const c=Lampa.Activity.active().activity.component;c.start();});await page.waitForTimeout(400);
  const before=await page.locator('.activity--active .card.focus').getAttribute('class').catch(()=>null);await page.keyboard.press('ArrowRight');await page.waitForTimeout(250);check('Remote-style Right keeps visible native card focus',await page.locator('.activity--active .card.focus').count()===1);
  await page.keyboard.press('Enter');await page.waitForFunction(()=>Lampa.Activity.active()?.component==='full',null,{timeout:15000});check('Remote-style OK opens native details',true);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>Lampa.Activity.active()?.component==='issue7_fixture',null,{timeout:15000});check('Remote-style Back returns to native fixture cards',true);
  await page.screenshot({path:path.join(out,'native-cards.png')});
  check('Home Trakt ContentRows actually register once in native registry',await page.evaluate(()=>{const names=__issue7.rows.filter(n=>n&&n.startsWith('TraktPlus'));return names.length>4&&new Set(names).size===names.length}));
  check('No native Favorite removal during any browser scenario',await page.evaluate(()=>__issue7.removes.length===0));
  // Simulate a fresh renderer with the saved B cache supplied only in memory.
  await page.evaluate(()=>{__issue7.account='runtime-b';__issue7.credential='synthetic-runtime-b2';__issue7.movieWatched=false});await page.evaluate(()=>TraktPlus.syncWatched());
  fixtureSeed=await page.evaluate(()=>({account:__issue7.account,credential:__issue7.credential,movieWatched:false,holdIdentity:true,cache:__issue7.cache}));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.TraktPlus?.version==='3.2.1-issue7-account'&&window.__issue7?.identityResolve,null,{timeout:50000});
  check('Restart with saved owned cache remains unknown before account verification',await page.evaluate(()=>TraktPlus.isWatched({id:438631})===null));
  await page.evaluate(()=>{__issue7.holdIdentity=false;__issue7.identityResolve({user:{ids:{uuid:__issue7.account}}})});
  await page.waitForFunction(()=>TraktPlus.isWatched({id:438631})===false);
  check('Restart verifies B identity and restores B unwatched status',true);

 }catch(e){r.failure=e.message;r.errors.push(e.message.replace(/https?:\/\/[^\s)]+/g,'[URL]'));}
 finally{
  try{
   const preserved=await page.evaluate(()=>{const s=__issue7;Lampa.Storage.get=s.oldGet;Lampa.Storage.set=s.oldSet;Lampa.Storage.field=s.oldField;TraktTV.api.get=s.oldApiGet;Object.assign(Lampa.Favorite,s.oldFavorite);Lampa.ContentRows.add=s.oldRowsAdd;Lampa.Timeline.view=s.oldTimelineView;return Object.entries(s.original).every(([k,v])=>JSON.stringify(s.oldGet.call(Lampa.Storage,k,null))===v)});check('Real Favorite and owned caches/preferences unchanged after test',preserved);
  }catch(e){r.errors.push('Cleanup: '+e.message)}
  await page.unroute('**/*',route);
  // Remove fixture route from restored Activity URL before ordinary reload.
  if(page.url().includes('issue7_fixture'))await page.evaluate(()=>{location.hash=''});
  await page.reload({waitUntil:'domcontentloaded'});if(originalViewport)await page.setViewportSize(originalViewport);
 }
 fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(r,null,2));console.log(JSON.stringify(r,null,2));process.exit(r.errors.length||r.checks.some(c=>c.status==='FAIL')?1:0);
})().catch(e=>{console.error(e.message);process.exit(1)});
