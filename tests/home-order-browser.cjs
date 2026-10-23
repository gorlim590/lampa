'use strict';
// One existing-CDP pass. All writes and Trakt responses are isolated fixtures.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'audit/issue-30'),sha=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const files=Object.fromEntries(['loader.js','trakt/trakt.js','trakt/trakt-plus.js','ui/stremio-hybrid.js','plugins-to-enable/home-history.js','plugins-to-enable/home-policy.js'].map(p=>['/'+p,fs.readFileSync(path.join(root,p),'utf8')]));
const key=u=>u.pathname.endsWith('/preview-loader.js')?'/loader.js':u.pathname.endsWith('/stremio-hybrid.js')?'/ui/stremio-hybrid.js':Object.keys(files).find(k=>u.pathname.endsWith(k));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const report={commit:sha,checks:[],sources:{},errors:[],blocked:['Physical Google TV Streamer 4K','Live Trakt API: synthetic read-only responses used']},check=(name,ok,data)=>{report.checks.push({name,status:ok?'PASS':'FAIL',data});if(!ok)throw Error(name)};
 const browser=await chromium.connectOverCDP('http://127.0.0.1:9222'),page=browser.contexts()[0].pages().find(p=>p.url().includes('siaivo.isroot.in'));if(!page)throw Error('BLOCKED: no existing Lampa tab');
 const restoreUrl=page.url();let seed={},capture=true;const jobs=[];
 const onError=e=>{if(capture)report.errors.push(e.message.replace(/https?:\/\/\S+/g,'[URL]'))};page.on('pageerror',onError);
 const onResponse=response=>{const k=key(new URL(response.url()));if(capture&&k)jobs.push(response.body().then(b=>report.sources[k]={received:hash(b),expected:hash(files[k]),commit:response.headers()['x-issue30-commit']}).catch(()=>{}))};page.on('response',onResponse);
 const setup=()=>page.evaluate(seed=>{
  if(window.__issue30)return;const L=Lampa,og=L.Storage.get,of=L.Storage.field;
  const s=window.__issue30={shadow:{...seed},local:{},filename:'file_view_issue30',files:{},lists:{},requests:[],writes:[],registry:[],auth:false};
  window.LAMPA_PLUGINS_LIST=['trakt/trakt.js','trakt/trakt-plus.js','ui/stremio-hybrid.js'];
  L.Timeline.filename=()=>s.filename;
  function special(k,d){
   if(k in s.shadow)return s.shadow[k];if(/^file_view(?:_|$)/.test(k))return s.files;
   if(/^content_rows_/.test(k))return /^(content_rows_TraktPlusTrend_(movies|shows)|content_rows_home_history_(resume|watched)|content_rows_issue30_third_party)$/.test(k);
   if(k==='trakt_token')return s.auth?'synthetic-issue30-not-a-real-token':null;
   if(k==='trakt_plus_enable'||k==='trakt_plus_more')return true;
   if(/^trakt_/.test(k))return false;
   if(k==='gl_loader_plugins')return window.LAMPA_PLUGINS_LIST.join(',');
   if(/^ydesign_/.test(k))return d;
   return og.call(L.Storage,k,d);
  }
  L.Storage.get=special;L.Storage.field=k=>/^trakt_|^content_rows_|^file_view/.test(k)||k in s.shadow?special(k,undefined):of.call(L.Storage,k);
  L.Storage.set=(k,v)=>{s.writes.push(k);if(/^file_view/.test(k))s.files=v;else s.shadow[k]=v;};
  const get=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(k in s.local)return s.local[k];if(/^trakt_|^ydesign_/.test(k))return null;return get.call(this,k)};Storage.prototype.setItem=function(k,v){s.local[k]=String(v)};Storage.prototype.removeItem=function(k){s.local[k]=null};
  L.Favorite.get=({type})=>s.lists[type]||[];L.Favorite.check=()=>({});L.Favorite.add=L.Favorite.remove=()=>{throw Error('Unexpected account mutation')};if(L.Socket)L.Socket.send=()=>{};
  const add=L.ContentRows.add;L.ContentRows.add=function(r){s.registry.push(r);return add.call(this,r)};
 },seed);
 const route=async route=>{
  const req=route.request(),u=new URL(req.url()),k=key(u);if(!['GET','HEAD','OPTIONS'].includes(req.method()))return route.abort();
  if(k){await setup();if(k==='/trakt/trakt-plus.js')await page.evaluate(()=>{
   const s=__issue30;s.auth=true;
   TraktTV.api.get=url=>{s.requests.push(url);if(url.startsWith('/users/me'))return Promise.resolve({ids:{uuid:'issue30-fixture'}});if(url.startsWith('/sync/last_activities'))return Promise.resolve({all:'2026-10-01T00:00:00.000Z',movies:{watched_at:'2026-10-01T00:00:00.000Z'},episodes:{watched_at:'2026-10-01T00:00:00.000Z'}});if(url.startsWith('/sync/'))return Promise.resolve([]);
    const show=url.includes('/shows/'),items=Array.from({length:10},(_,i)=>({title:'Issue30 '+(show?'Show':'Movie')+(i+1),year:2020,rating:8,votes:10000,genres:['drama'],language:'en',country:'us',ids:{tmdb:(show?100:200)+i,trakt:(show?100:200)+i},images:{poster:['https://image.tmdb.org/t/p/w500/issue30.svg']}}));return Promise.resolve(url.includes('/trending')?items.map(v=>({[show?'show':'movie']:v,watchers:100})):items);};
  });return route.fulfill({contentType:'application/javascript',body:files[k],headers:{'Cache-Control':'no-store','X-Issue30-Commit':sha}})}
  if(u.hostname==='image.tmdb.org')return route.fulfill({contentType:'image/svg+xml',headers:{'Access-Control-Allow-Origin':'*'},body:'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="400" height="600" fill="#24354b"/><text x="20" y="90" fill="white" font-size="28">Issue30 fixture</text></svg>'});
  if(u.hostname==='api.themoviedb.org')return route.fulfill({json:{results:[],genres:[{id:18,name:'Drama'}],images:{logos:[],posters:[]},title:'Fixture',release_date:'2020-01-01'}});
  if(/(?:api\.trakt\.tv|apx\.lme\.isroot\.in|wh\.lme\.isroot\.in)$/.test(u.hostname))return route.fulfill({json:[]});
  return route.continue();
 };
 const datasets=()=>page.evaluate(()=>{const c=Lampa.Activity.active().activity.component;return{ids:c.items.map(l=>l.data.home_row_id||null),active:c.active,dom:c.items.map(l=>{const n=l.render(true);return{sameParent:!!n.parentNode,title:l.data.title}}),inventory:LampaHomeHistory.policy().inventory()}});
 await page.route('**/*',route);
 try{
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.TraktPlus&&window.StremioHybrid&&Lampa.Activity.active()?.activity,null,{timeout:45000});
  await page.evaluate(()=>{
   const s=__issue30,card=id=>({id,source:'tmdb',media_type:'movie',title:'History '+id,original_title:'History '+id,release_date:'2020-01-01',poster_path:'/issue30.svg'});s.lists.history=[card(1),card(2)];s.files={partial:{card:'movie_1',percent:25,time:15,duration:60,updated:1}};s.realWatched=TraktPlus.isWatched;TraktPlus.isWatched=c=>c.id===2?true:s.realWatched(c);Lampa.Timeline.read(true);
  });
  await page.addScriptTag({url:'https://gorlim590.github.io/lampa/plugins-to-enable/home-history.js?fixture='+sha});await page.waitForFunction(()=>LampaHomeHistory.policyReady);
  await page.evaluate(()=>{
   const s=__issue30;s.requests=[];Lampa.ContentRows.add({name:'issue30_third_party',title:'Unrelated plugin',screen:['main'],index:9,call:()=>done=>done({title:Lampa.Lang.translate('title_top_movie'),results:[s.lists.history[0]]})});
   Lampa.Activity.replace({component:'main',source:'tmdb',title:'Issue30 fixtures',page:1});
  });
  await page.waitForFunction(()=>{const c=Lampa.Activity.active().activity.component;return c.items.some(l=>l.data.home_row_id==='TraktPlusTrend_movies')&&c.items.some(l=>l.data.home_row_id==='TraktPlusTrend_shows')&&c.items.some(l=>l.data.home_history==='watched')&&c.items.some(l=>l.data.home_row_id==='issue30_third_party')},null,{timeout:15000});
  await page.waitForTimeout(300);await Promise.all(jobs);
  check('Exact changed JS and helper auto-loaded by commit/hash',Object.keys(files).every(k=>report.sources[k]?.received===hash(files[k])&&report.sources[k]?.commit===sha),report.sources);
  const before=await datasets();check('Native TMDB Home keeps actual Trakt+ rows, both History rows and title-identical plugin; native recommendations absent',before.ids.length===5&&before.ids.every(Boolean),before);
  await page.evaluate(()=>{const c=Lampa.Activity.active().activity.component;__issue30.refs=c.items.slice();__issue30.nodes=c.items.map(l=>l.render(true));__issue30.networkBefore=__issue30.requests.length;c.items[0].toggle();LampaHomeHistory.policy().editor()});
  await page.keyboard.press('Enter');await page.keyboard.press('Enter');
  await page.waitForFunction(()=>__issue30.writes.some(k=>k.startsWith('home_history_order_v1:')));
  const reordered=await datasets();check('Native Select keyboard OK moves first row down',reordered.ids[0]===before.ids[1]&&reordered.ids[1]===before.ids[0],reordered.ids);
  check('Reorder preserves row/card nodes, native selected index and adds no Trakt calls',await page.evaluate(()=>{const c=Lampa.Activity.active().activity.component,s=__issue30;return c.items.every(l=>s.refs.includes(l)&&s.nodes.includes(l.render(true)))&&c.items[c.active]===s.refs[0]&&s.requests.length===s.networkBefore}));
  await page.keyboard.press('Escape');await page.waitForTimeout(250);await page.keyboard.press('Escape');await page.waitForTimeout(250);check('Back returns to native Home',await page.evaluate(()=>Lampa.Activity.active().component==='main'&&!Lampa.Select.opened()),await page.evaluate(()=>({component:Lampa.Activity.active().component,select:Lampa.Select.opened(),controller:Lampa.Controller.enabled().name})));await page.keyboard.press('ArrowRight');await page.waitForTimeout(150);await page.keyboard.press('ArrowDown');check('Arrows retain native Home focus',await page.evaluate(()=>Lampa.Activity.active().component==='main'&&!!document.querySelector('.activity--active .focus')));
  await page.evaluate(()=>{const c=Lampa.Activity.active().activity.component;c.emit('createAndAppend',{home_row_id:'TraktPlusLateFixture',home_row_origin:'trakt',trakt_line:true,title:'Late Trakt fixture',results:[__issue30.lists.history[0]]});c.scroll.append(c.fragment);});
  await page.waitForFunction(()=>Lampa.Activity.active().activity.component.items.some(l=>l.data.home_row_id==='TraktPlusLateFixture'));await page.waitForTimeout(200);
  check('Async append lifecycle keeps saved prefix and synchronizes item/DOM order',(await datasets()).ids.slice(0,5).join()===reordered.ids.join()&&await page.evaluate(()=>{const c=Lampa.Activity.active().activity.component,nodes=c.items.map(l=>l.render(true)),actual=[...nodes[0].parentNode.children].filter(n=>nodes.includes(n));return actual.every((n,i)=>n===nodes[i])}));
  await page.evaluate(()=>{StremioHybrid.setEnabled(false);StremioHybrid.setEnabled(true)});check('Hybrid off/on respects custom Home order',(await datasets()).ids.slice(0,5).join()===reordered.ids.join());
  seed=await page.evaluate(()=>Object.fromEntries(Object.entries(__issue30.shadow).filter(([k])=>k.startsWith('home_history_order_v1:'))));
  await page.screenshot({path:path.join(out,'home-order-final.png')});
  // A real page restart; only synthetic order namespace carried into the fixture.
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.TraktPlus&&window.StremioHybrid,null,{timeout:40000});
  await page.addScriptTag({url:'https://gorlim590.github.io/lampa/plugins-to-enable/home-history.js?fixture='+sha});await page.waitForFunction(()=>LampaHomeHistory.policyReady);
  await page.evaluate(()=>Lampa.Activity.replace({component:'main',source:'tmdb',page:1}));await page.waitForFunction(()=>Lampa.Activity.active().activity.component.items.filter(l=>l.data.trakt_line).length>=2);await page.waitForTimeout(200);
  const restored=await datasets(),expected=reordered.ids.filter(id=>/^TraktPlusTrend_/.test(id));check('Persisted native setting restores order after page restart with temporarily missing rows',restored.ids.filter(id=>/^TraktPlusTrend_/.test(id)).join()===expected.join(),restored.ids);
  check('No JavaScript exceptions in changed-code pass',report.errors.length===0,report.errors);
 }catch(e){report.errors.push(e.message.replace(/https?:\/\/\S+/g,'[URL]'))}
 finally{
  capture=false;await page.unroute('**/*',route);page.off('pageerror',onError);page.off('response',onResponse);await page.goto(restoreUrl,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.Lampa?.Activity?.active()?.activity&&!window.__issue30,null,{timeout:30000});report.checks.push({name:'Original page restored; no fixture globals or browser closure',status:'PASS'});
 }
 fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks,errors:report.errors,blocked:report.blocked}));process.exit(report.errors.length||report.checks.some(c=>c.status==='FAIL')?1:0);
})().catch(e=>{console.error(e.message);process.exit(1)});
