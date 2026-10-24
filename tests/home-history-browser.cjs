'use strict';
// Existing CDP tab only. Owned source routes + isolated storage/provider fixtures.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'audit/issue-25-followup');fs.mkdirSync(out,{recursive:true});
const sourcesOnly=process.env.HOME25_SOURCES_ONLY==='1';
const sha=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const files=Object.fromEntries(['loader.js','trakt/trakt-plus.js','ui/design-optimized.js','plugins-to-enable/home-history.js','plugins-to-enable/home-policy.js','ui/stremio-hybrid.js'].map(p=>['/'+p,fs.readFileSync(path.join(root,p),'utf8')]));
const sourceKey=u=>u.pathname.endsWith('/preview-loader.js')?'/loader.js':u.pathname.endsWith('/stremio-hybrid.js')?'/ui/stremio-hybrid.js':Object.keys(files).find(k=>u.pathname.endsWith(k));
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
//60 seconds of silence, valid PCM WAV, no downloads or random stream playback.
const wav=Buffer.alloc(44+480000,128);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(8000,28);wav.writeUInt16LE(1,32);wav.writeUInt16LE(8,34);wav.write('data',36);wav.writeUInt32LE(480000,40);
(async()=>{
 const r={commit:sha,checks:[],errors:[],sources:{},blocked:['Physical Google TV','Actual user three titles/missing examples not available in this test profile','External player/provider backend']},check=(name,ok,data)=>r.checks.push({name,status:ok?'PASS':'FAIL',...(data===undefined?{}:{data})});
 const browser=await chromium.connectOverCDP('http://127.0.0.1:9222'),page=browser.contexts()[0].pages().find(p=>p.url().includes('siaivo.isroot.in'));if(!page)throw Error('BLOCKED: existing Lampa tab unavailable');
 const originalUrl=page.url(),restoreUrl=/issue25_/.test(originalUrl)?'https://siaivo.isroot.in/?component=main&source=tmdb&page=1':originalUrl;let capture=true;
 const jobs=[];page.on('response',response=>{const u=new URL(response.url()),key=sourceKey(u);if(capture&&key)jobs.push(response.body().then(b=>r.sources[key]={received:hash(b),expected:hash(files[key]),commit:response.headers()['x-issue25-commit']}).catch(()=>{}))});
 page.on('pageerror',e=>r.errors.push(e.message.replace(/https?:\/\/\S+/g,'[URL]')));
 const setup=()=>page.evaluate(()=>{
  if(window.__issue25)return;const L=Lampa,og=L.Storage.get,of=L.Storage.field;
  const s=window.__issue25={shadow:{ydesign_ua_torrents:false},local:{ydesign_legacy_cleaned:'1'},files:{file_view_fixture_a:{},file_view_fixture_b:{}},filename:'file_view_fixture_a',lists:{},watched:{},registry:[],writes:[],socketWrites:[],playerStarted:false};
  const originalFilename=L.Timeline.filename;s.originalFilename=originalFilename;
  L.Timeline.filename=()=>s.filename;
  L.Storage.get=function(k,d){if(/^file_view(?:_|$)/.test(k))return s.files[s.filename];if(k==='player_timecode')return'continue';if(/^trakt_/.test(k))return k==='trakt_token'?(s.token||null):k==='trakt_plus_enable'?true:false;if(k in s.shadow)return s.shadow[k];if(/^ydesign_/.test(k))return d;return og.call(this,k,d)};
  L.Storage.field=function(k){if(k==='player_timecode')return'continue';if(/^trakt_/.test(k))return k==='trakt_plus_enable'?true:false;if(k in s.shadow)return s.shadow[k];if(/^ydesign_/.test(k))return undefined;return of.call(this,k)};
  L.Storage.set=function(k,v){s.writes.push(k);if(/^file_view(?:_|$)/.test(k))s.files[s.filename]=v;else s.shadow[k]=v;};
  const get=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(k in s.local)return s.local[k];if(/^ydesign_/.test(k))return null;return get.call(this,k)};Storage.prototype.setItem=function(k,v){s.local[k]=String(v)};Storage.prototype.removeItem=function(k){s.local[k]=null};
  L.Favorite.get=({type})=>s.lists[type]||[];L.Favorite.check=()=>({});L.Favorite.add=()=>{throw Error('Unexpected Favorite mutation')};L.Favorite.remove=()=>{throw Error('Unexpected Favorite deletion')};
  if(L.Socket)L.Socket.send=(...args)=>s.socketWrites.push(args[0]);
  const add=L.ContentRows.add;L.ContentRows.add=function(row){s.registry.push(row);return add.call(this,row)};
 });
 const route=async route=>{
  const req=route.request(),u=new URL(req.url()),key=sourceKey(u);
  if(!['GET','HEAD','OPTIONS'].includes(req.method()))return route.abort();
  if(key){await setup();return route.fulfill({status:200,contentType:'application/javascript',body:files[key],headers:{'Cache-Control':'no-store','X-Issue25-Commit':sha}})}
  if(u.pathname==='/issue25-fixture.wav'){
   const m=/bytes=(\d+)-(\d*)/.exec(req.headers().range||''),start=m?Number(m[1]):0,end=m&&m[2]?Math.min(Number(m[2]),wav.length-1):wav.length-1;
   return route.fulfill({status:m?206:200,contentType:'audio/wav',body:wav.subarray(start,end+1),headers:{'Accept-Ranges':'bytes','Content-Length':String(end-start+1),...(m?{'Content-Range':`bytes ${start}-${end}/${wav.length}`}:{})}});
  }
  if(u.hostname==='api.themoviedb.org'){
   const tv=u.pathname.includes('/tv/'),id=Number(u.pathname.match(/\/(?:movie|tv)\/(\d+)/)?.[1]||0);
   return route.fulfill({json:{id,title:'Fixture '+id,original_title:'Movie '+id,tagline:'Контрольований тест',genres:[{id:18,name:'Драма'}],vote_average:8,release_date:'2020-01-01',images:{posters:[],logos:[]},results:[],...(tv?{name:'Series '+id,original_name:'Series '+id,first_air_date:'2020-01-01',number_of_seasons:1,number_of_episodes:3,status:'Ended',last_episode_to_air:{season_number:1,episode_number:3},seasons:[{season_number:1,episode_count:3}]}:{})}});
  }
  if(u.hostname==='image.tmdb.org')return route.fulfill({contentType:'image/svg+xml',headers:{'Access-Control-Allow-Origin':'*'},body:'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="400" height="600" fill="#24354b"/><text x="30" y="70" fill="white" font-size="30">Issue25 fixture</text></svg>'});
  if(/(?:api\.trakt\.tv|apx\.lme\.isroot\.in|wh\.lme\.isroot\.in)$/.test(u.hostname))return route.fulfill({json:[]});
  return route.continue();
 };
 await page.route('**/*',route);
 try{stage:{
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.Lampa?.Activity?.active()?.activity&&window.YDesignLoaded,null,{timeout:50000});
  await page.evaluate(()=>{
   const s=__issue25;s.cards=Array.from({length:6},(_,i)=>({id:i+1,source:'tmdb',media_type:'movie',original_title:'Movie '+(i+1),title:'Fixture '+(i+1),release_date:'2020-01-01',poster_path:'/fixture.svg'}));
   s.cards.push({id:7,source:'tmdb',media_type:'tv',original_name:'Series 7',name:'Series7',first_air_date:'2020-01-01',poster_path:'/fixture.svg'},{id:8,source:'tmdb',media_type:'tv',type:'anime',original_name:'Series 8',name:'Anime8',first_air_date:'2020-01-01',poster_path:'/fixture.svg'});
   s.lists.history=s.cards.concat([{...s.cards[0],source:'trakt',id:999,ids:{tmdb:1,trakt:999}}]);s.watched={'movie:6':true};
   for(const c of s.cards)s.files.file_view_fixture_a['provider-'+c.id]={card:(c.media_type==='tv'?'tv_':'movie_')+c.id,percent:c.id===6||c.id===8?100:100/3,time:c.id===6||c.id===8?60:20,duration:60,updated:c.id,...(c.media_type==='tv'?{season:1,episode:1}:{})};
   s.schedule=[{season_number:1,episode_number:1,air_date:'2020-01-01'},{season_number:1,episode_number:2,air_date:'2020-01-02'}];Lampa.TimeTable.get=()=>s.schedule;
   s.account='A';s.token='synthetic-home-A';
   TraktTV.api.get=async path=>{s.apiCalls=(s.apiCalls||0)+1;if(path==='/users/me')return{user:{ids:{uuid:'home-'+s.account}}};if(path==='/sync/last_activities')return{all:'2026-01-01T12:00:00Z',movies:{watched_at:'2026-01-01T12:00:00Z'},episodes:{watched_at:'2026-01-01T12:00:00Z'}};if(path.startsWith('/sync/watched/movies'))return s.account==='A'?[{movie:{ids:{tmdb:6,trakt:6},title:'Movie6'},last_watched_at:'2026-01-01T12:00:00Z'}]:[];if(path.startsWith('/sync/watched/shows'))return s.account==='A'?[{show:{ids:{tmdb:7,trakt:7},aired_episodes:2},seasons:[{number:1,episodes:[{number:1,plays:1}]}]}]:[];return[]};
   Lampa.Storage.listener.send('change',{name:'trakt_token'});Lampa.Timeline.read(true);
  });
  await page.waitForFunction(()=>TraktPlus.version==='3.3.1-home'&&TraktPlus.cachedWatched({id:6,media_type:'movie'})===true,null,{timeout:20000});
  await page.addScriptTag({url:'https://gorlim590.github.io/lampa/plugins-to-enable/home-history.js?fixture='+sha});
  await page.waitForFunction(()=>window.LampaHomeHistory?.active&&window.LampaHomeHistory?.policyReady);
  await Promise.all(jobs);check('Exact changed source and loader loaded by hash/commit',Object.keys(files).every(k=>r.sources[k]?.received===hash(files[k])&&r.sources[k]?.commit===sha),r.sources);
  if(sourcesOnly)break stage;
  await page.evaluate(()=>{
   const s=__issue25;s.prefix=[{title:'First',results:[s.cards[0]]},{title:'Second',results:[s.cards[1]]}];
   Lampa.Component.add('main',function(o){const c=Lampa.Maker.make('Main',o);c.use({onCreate(){const rows=s.registry.filter(r=>/^home_history_/.test(r.name)).map(r=>{let data;r.call()((result)=>data=result);return data});c.build(s.prefix.concat(rows));}});return c});Lampa.Activity.push({component:'main',source:'tmdb',title:'Issue25 fixtures',page:1});
  });
  const datasets=()=>page.evaluate(()=>{const comp=Lampa.Activity.active().activity.component;return comp.items.filter(l=>l.data.home_history).map(l=>({kind:l.data.home_history,ids:l.data.results.map(c=>c.id),count:l.data.results.length}))});
  await page.waitForFunction(()=>document.querySelectorAll('[data-home-history]').length===2);
  await page.evaluate(()=>Lampa.Activity.active().activity.component.items.find(l=>l.data.home_history==='resume').toggle());
  await page.waitForFunction(()=>!!document.querySelector('.activity--active .focus'));
  const rows=await datasets();check('More than3 real-position/episode fixtures and confirmed watched are distinct/deduplicated',rows.find(r=>r.kind==='resume')?.count===7&&rows.find(r=>r.kind==='watched')?.ids.join(',')==='6',rows);
  check('Next episode without position is visibly labelled',await page.locator('.home-history-note').filter({hasText:'позиція недоступна'}).count()>0);
  await page.evaluate(()=>{__issue25.files.file_view_fixture_a['provider-1']={card:'movie_1',percent:100,time:60,duration:60,updated:100};Lampa.Timeline.read()});
  await page.waitForFunction(()=>Lampa.Activity.active().activity.component.items.find(l=>l.data.home_history==='resume')?.data.results.length===6);check('Timeline completion updates mounted Home row',true);
  await page.evaluate(()=>{__issue25.filename='file_view_fixture_b';__issue25.watched={};__issue25.account='B';__issue25.token='synthetic-home-B';Lampa.Storage.listener.send('change',{name:'trakt_token'});Lampa.Timeline.read();document.dispatchEvent(new Event('traktplus:watched'))});
  await page.waitForFunction(()=>!document.querySelector('[data-home-history]'));check('New empty profile removes old datasets without reusing a Home cache',true);
  await page.evaluate(()=>{__issue25.filename='file_view_fixture_a';__issue25.watched={'movie:6':true};__issue25.account='A';__issue25.token='synthetic-home-A';Lampa.Storage.listener.send('change',{name:'trakt_token'});__issue25.files.file_view_fixture_a['provider-1']={card:'movie_1',percent:100/3,time:20,duration:60,updated:200};Lampa.Timeline.read();document.dispatchEvent(new Event('traktplus:watched'))});
  await page.waitForFunction(()=>document.querySelectorAll('[data-home-history]').length===2);check('Returning profile restores native positions and no duplicate rows',true);
  await page.evaluate(()=>{const s=__issue25;s.files.file_view_fixture_a['provider-6'].percent=25;s.files.file_view_fixture_a['provider-6'].time=15;s.files.file_view_fixture_a['provider-6'].updated=Date.parse('2026-01-02T00:00:00Z');Lampa.Timeline.read()});
  await page.waitForFunction(()=>Lampa.Activity.active().activity.component.items.find(l=>l.data.home_history==='resume')?.data.results.some(c=>c.id===6&&c.home_history_resume.rewatch));check('Newer actual position supports explicit replay while confirmed watched history remains', (await datasets()).find(r=>r.kind==='watched')?.ids.join(',')==='6');
  await page.evaluate(()=>{const s=__issue25;s.files.file_view_fixture_a['provider-6'].percent=100;s.files.file_view_fixture_a['provider-6'].time=60;Lampa.Timeline.read()});await page.waitForFunction(()=>Lampa.Activity.active().activity.component.items.find(l=>l.data.home_history==='resume')?.data.results.length===7);
  const requestsBefore=await page.evaluate(()=>__issue25.apiCalls);await page.evaluate(()=>{LampaHomeHistory.buildRows();LampaHomeHistory.buildRows();});check('Repeated Home builds use cache-only Trakt status and progress with no API calls',await page.evaluate(n=>__issue25.apiCalls===n,requestsBefore));
  if(await page.evaluate(()=>!!window.StremioHybrid)){await page.waitForTimeout(100);await page.evaluate(()=>StremioHybrid.setEnabled(false));check('Hybrid off does not restore destroyed profile/history rows',(await datasets()).find(r=>r.kind==='resume')?.count===7);await page.evaluate(()=>StremioHybrid.setEnabled(true));check('Hybrid on retains one of each managed row',(await datasets()).length===2);}
  await page.evaluate(()=>Lampa.Activity.active().activity.component.items.find(l=>l.data.home_history==='resume').toggle());
  await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowLeft');check('Native directional focus survives refresh',await page.locator('.activity--active .focus').count()>0);
  const native=await page.evaluate(()=>{const c=LampaHomeHistory.buildRows().resume.find(c=>c.id===1),meta=Lampa.Timeline.link(c),hash=Lampa.Utils.hash(c.original_title),position=Lampa.Timeline.view(hash,meta);__issue25.playCard=c;__issue25.nativePosition=position;return{time:position.time,duration:position.duration,percent:position.percent,handler:typeof position.handler,customHash:c.home_history_resume.hash,nativeHash:hash}});
  check('Native Timeline resolves provider hash to actual playable position/handler',native.time===20&&native.duration===60&&native.handler==='function',native);
  await page.evaluate(()=>{document.addEventListener('keydown',function controlled(e){if(e.key!=='F8')return;e.preventDefault();e.stopImmediatePropagation();__issue25.playerStarted=true;Lampa.Player.play({url:location.origin+'/issue25-fixture.wav',title:'Issue25 controlled silence',launch_player:'inner',timeline:__issue25.nativePosition})},true)});
  await page.keyboard.press('F8');
  try{
   await page.waitForFunction(()=>[...document.querySelectorAll('video,audio')].some(v=>v.currentSrc.includes('issue25-fixture.wav')&&v.currentTime>=18&&v.currentTime<40&&v.duration===60),null,{timeout:15000});
   r.player=await page.evaluate(()=>{const v=[...document.querySelectorAll('video,audio')].find(v=>v.currentSrc.includes('issue25-fixture.wav'));return{currentTime:v.currentTime,duration:v.duration}});check('Real built-in player resumes controlled PCM media near20s',true,r.player);
   await page.keyboard.press('Escape');await page.waitForFunction(()=>!Lampa.Player.opened());
   check('Player Back returns to Home and saves only fixture progress',await page.evaluate(()=>Lampa.Activity.active().component==='main'&&__issue25.writes.some(k=>/^file_view/.test(k))));
  }catch(e){r.blocked.push('Controlled native player: '+e.message.replace(/https?:\/\/\S+/g,'[URL]'));if(await page.evaluate(()=>Lampa.Player.opened()))await page.evaluate(()=>Lampa.Player.close())}
  await page.evaluate(()=>{__issue25.token=null;Lampa.Storage.listener.send('change',{name:'trakt_token'})});await page.waitForFunction(()=>!Lampa.Activity.active().activity.component.items.some(l=>l.data.home_history==='watched'));check('Unavailable Trakt removes unconfirmed watched row but preserves real local resume', (await datasets()).some(r=>r.kind==='resume'&&r.count>3));
  await page.screenshot({path:path.join(out,'home-final.png')});
 }}catch(e){r.errors.push(e.message.replace(/https?:\/\/\S+/g,'[URL]'))}
 finally{
  capture=false;try{await page.evaluate(()=>{if(window.__issue25?.playerStarted&&Lampa.Player.opened())Lampa.Player.close()})}catch{}
  await page.unroute('**/*',route);await page.goto(restoreUrl,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.Lampa?.Activity?.active()?.activity&&!window.__issue25,null,{timeout:30000});check('Original page/methods restored with no fixture globals',true);
 }
 fs.writeFileSync(path.join(out,sourcesOnly?'browser-source-proof.json':'browser.json'),JSON.stringify(r,null,2));console.log(JSON.stringify({checks:r.checks,errors:r.errors,blocked:r.blocked}));process.exit(r.errors.length||r.checks.some(c=>c.status==='FAIL')?1:0);
})().catch(e=>{console.error(e.message);process.exit(1)});
