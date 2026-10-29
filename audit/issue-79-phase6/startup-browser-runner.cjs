'use strict';

// Controlled cold-start harness for Issue #79 Phase 6. It launches disposable
// Chromium contexts, routes exact repository script bytes before host bootstrap,
// and starts the loader when the native Lampa API exists, as on the live host.
// No account credentials or user Storage are copied into these contexts.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || '/tmp/lampa-pr130-browser/node_modules/playwright-core');

const root = path.resolve(__dirname, '../..');
const base = 'https://gorlim590.github.io/lampa/';
const mode = process.argv[2] || 'main';
const count = Number(process.argv[3] || 1);
if (!['main', 'branch'].includes(mode) || !Number.isInteger(count) || count < 1 || count > 10) throw new Error('usage: node startup-browser-runner.cjs main|branch [1..10]');

const deferred = [
  'trakt/trakt.js', 'trakt/trakt-plus.js', 'providers/torrent-search.js',
  'media/average-rating.js', 'ui/cardify-plus.js', 'localization/translate.js',
  'plugins-to-enable/home-policy.js', 'plugins-to-enable/home-history.js',
  'ui/torrent-cinema.js'
];
const fixtureTvIds = Array.from({ length: 24 }, (_, i) => 980000 + i);
const pluginFiles = new Set([
  'loader.js', 'ui/stremio-hybrid.js', 'ui/interface-plus.js', 'ui/design-optimized.js',
  'ui/cardify-plus.js', 'ui/settings-hub.js', 'ui/torrent-cinema.js',
  'trakt/trakt.js', 'trakt/trakt-plus.js', 'providers/torrent-search.js',
  'media/average-rating.js', 'localization/translate.js',
  'plugins-to-enable/home-policy.js', 'plugins-to-enable/home-history.js'
]);

const source = new Map();
for (const file of pluginFiles) {
  const body = mode === 'main'
    ? execFileSync('git', ['show', 'origin/main:' + file], { cwd: root, encoding: 'utf8' })
    : fs.readFileSync(path.join(root, file), 'utf8');
  source.set(file, body);
}

const probe = `(()=>{
  const p=window.__p6={marks:{documentStart:performance.now()},runs:[],resources:[],longTasks:[],loaderRequests:[],readinessEvents:[],fixtureFavoriteCalls:0,
    mark(name,extra){if(!this.marks[name])this.marks[name]=performance.now();if(extra)this.runs.push({name,at:this.marks[name],extra})}};
  document.addEventListener('DOMContentLoaded',()=>p.mark('domContentLoaded'),{once:true});
  window.addEventListener('load',()=>p.mark('windowLoad'),{once:true});
  try{new PerformanceObserver(list=>{for(const e of list.getEntries())if(p.longTasks.length<100)p.longTasks.push({start:+e.startTime.toFixed(1),duration:+e.duration.toFixed(1)})}).observe({type:'longtask',buffered:true})}catch(e){}
  try{new PerformanceObserver(list=>{for(const e of list.getEntries())if(p.resources.length<1000){let u;try{u=new URL(e.name)}catch(e){continue}p.resources.push({origin:u.origin,path:u.pathname.replace(/\\/\\d{4,}/g,'/:id').replace(/\\/[a-f0-9]{32,}/ig,'/:hash'),type:e.initiatorType,start:+e.startTime.toFixed(1),end:+e.responseEnd.toFixed(1),bytes:e.transferSize||0})}}).observe({type:'resource',buffered:true})}catch(e){}
  let ticks=0,seen={};const timer=setInterval(()=>{ticks++;const L=window.Lampa;if(L&&L.ContentRows&&!seen.rows){seen.rows=1;p.mark('contentRowsAvailable')}
    if(L&&!seen.lampa){seen.lampa=1;p.mark('lampaGlobalAvailable');try{L.Listener?.follow('activity',e=>p.readinessEvents.push({kind:'activity',type:e?.type,component:e?.component,at:+performance.now().toFixed(1)}));L.Controller?.listener?.follow('toggle',e=>p.readinessEvents.push({kind:'controller',name:e?.name,at:+performance.now().toFixed(1)}));L.Favorite?.listener?.follow('read',()=>p.readinessEvents.push({kind:'favorite-read',at:+performance.now().toFixed(1)}))}catch(e){}}
    if(window.Lampa?.Favorite?.get&&window.Lampa.Favorite.get!==p.fixtureFavoriteGet){const original=window.Lampa.Favorite.get;const fixture=${JSON.stringify(fixtureTvIds)}.map((id,i)=>({id,media_type:'tv',name:'Fixture Series '+i,original_name:'Fixture Series '+i,source:'tmdb',poster_path:'/fixture-'+i+'.jpg'}));p.fixtureFavoriteGet=function(params){if(params&&params.type==='look'){p.fixtureFavoriteCalls++;return fixture.slice()}return original.apply(this,arguments)};window.Lampa.Favorite.get=p.fixtureFavoriteGet;seen.favorite=1}
    if(window.appready===true&&!seen.appready){seen.appready=1;p.mark('nativeAppReady')}
    const card=document.querySelector('.activity--active .card.selector'),focus=document.querySelector('.activity--active .card.selector.focus');
    if(card&&card.getClientRects().length&&!seen.firstCard){seen.firstCard=1;p.mark('firstVisibleHomeCard',snapshot())}
    if(focus&&focus.getClientRects().length&&!seen.focus){seen.focus=1;p.mark('firstHomeFocus',snapshot())}
    const ctl=L&&L.Controller&&L.Controller.enabled&&L.Controller.enabled();
    if(document.body?.classList.contains('stremio-hybrid')&&document.querySelector('#stremio-hybrid-style')&&!seen.hybrid){seen.hybrid=1;requestAnimationFrame(()=>requestAnimationFrame(()=>p.mark('firstHybridActiveFrame',snapshot())))}
    if(focus&&ctl&&ctl.name&&!seen.usable){seen.usable=1;p.mark('firstUsableHome',snapshot())}
    if(seen.appready&&seen.firstCard&&seen.focus&&ticks>80){clearInterval(timer);p.mark('stageProbeStopped')}
    if(ticks>=1600){clearInterval(timer);p.mark('stageProbeTimeout')}
  },25);
  function snapshot(){const L=window.Lampa,act=L&&L.Activity&&L.Activity.active();return{at:+performance.now().toFixed(1),activity:act&&act.component,controller:L&&L.Controller&&L.Controller.enabled&&L.Controller.enabled()?.name,cards:document.querySelectorAll('.activity--active .card.selector').length,nodes:document.querySelectorAll('*').length,styles:document.querySelectorAll('style,link[rel=stylesheet]').length,focus:!!document.querySelector('.activity--active .card.selector.focus')}}
  p.snapshot=snapshot;
})();`;

function sanitizedPath(name) { return name.replace(/\?.*$/, ''); }
function sourceBody(file) { return source.get(file); }

async function executeRun(browser, iteration) {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, locale: 'uk-UA' });
  await context.addInitScript(() => { try { localStorage.setItem('language', 'uk'); } catch (e) {} });
  const page = await context.newPage();
  const requests = [];
  const documentUrl = 'https://siaivo.isroot.in/';
  await page.route('**/*', async route => {
    const req = route.request(); let u;
    try { u = new URL(req.url()); } catch (e) { return route.continue(); }
    if (u.origin === documentUrl.slice(0, -1) && u.pathname === '/' && req.resourceType() === 'document') {
      const response = await route.fetch();
      let html = await response.text();
      const launcher = `<script>${probe}\nwindow.LAMPA_PLUGINS_BASE=${JSON.stringify(base)};window.LAMPA_PLUGINS_VERSION=${JSON.stringify('p6-'+mode)};window.LAMPA_PLUGINS_LIST=${JSON.stringify(deferred)};(function(){var tries=0;function waitForNativeApi(){if(window.Lampa&&Lampa.Lang&&Lampa.Storage){window.__p6.mark('lampaRuntimeAvailable');window.__p6.mark('loaderRequested');var s=document.createElement('script');s.src=${JSON.stringify(base+'loader.js?p6='+mode)};s.onload=function(){window.__p6.mark('loaderExecuted')};s.onerror=function(){window.__p6.mark('loaderFailed')};document.head.appendChild(s)}else if(++tries<1500)setTimeout(waitForNativeApi,10);else window.__p6.mark('lampaRuntimeTimeout')}waitForNativeApi()})();</script>`;
      const marker = '<script>\n        var lampa_url';
      if (!html.includes(marker)) throw new Error('host bootstrap marker missing');
      html = html.replace(marker, launcher + '\n' + marker);
      return route.fulfill({ response, body: html });
    }
    if (u.hostname === 'api.themoviedb.org' && /^\/3\/tv\/(\d+)$/.test(u.pathname) && fixtureTvIds.includes(Number(u.pathname.split('/')[3]))) {
      const id=Number(u.pathname.split('/')[3]);
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id,name:'Fixture Series '+(id-980000),tagline:'Controlled startup fixture',first_air_date:'2020-01-01',number_of_seasons:1,number_of_episodes:2,seasons:[{season_number:1}],last_episode_to_air:{season_number:1,episode_number:1,air_date:'2026-10-20'},next_episode_to_air:{season_number:1,episode_number:2,air_date:new Date(Date.now()+86400000).toISOString().slice(0,10),name:'Fixture episode'},countries:[],origin_country:[],production_countries:[],genres:[],images:{posters:[]},release_dates:{results:[]},content_ratings:{results:[]}})});
    }
    if (u.hostname === 'gorlim590.github.io' && u.pathname.startsWith('/lampa/')) {
      const file = sanitizedPath(u.pathname.slice('/lampa/'.length));
      if (pluginFiles.has(file)) {
        const body = sourceBody(file); requests.push({ path: file, bytes: Buffer.byteLength(body) });
        return route.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }, body });
      }
      return route.fulfill({ status: 404, contentType: 'text/plain', body: 'not in phase6 source allowlist' });
    }
    return route.continue();
  });

  const pageErrors = [], consoleErrors=[];
  const responses=[];
  page.on('response',r=>{if(responses.length<200){let u;try{u=new URL(r.url())}catch{return}responses.push({origin:u.origin,path:u.pathname.replace(/\/\d{4,}/g,'/:id').replace(/\/[a-f0-9]{32,}/ig,'/:hash'),status:r.status(),type:r.request().resourceType()})}});
  page.on('pageerror', e => pageErrors.push({name:e.name,frames:String(e.stack||'').split('\n').slice(0,3).map(line=>line.replace(/https?:\/\/[^\s)]+/g,value=>{try{const u=new URL(value);return u.origin+u.pathname}catch{return '[url]'}}))}));
  page.on('console', m => { if(m.type()==='error'&&consoleErrors.length<10)consoleErrors.push(m.text().split(/[\n:]/)[0].slice(0,100)); });
  const started = Date.now();
  await page.goto(documentUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  try {
    await page.waitForFunction(() => window.__p6?.marks?.firstUsableHome !== undefined, null, { timeout: 60000 });
  } catch (e) {}
  await page.waitForTimeout(50);
  const metrics = await page.evaluate(() => {
    const p=window.__p6,nav=performance.getEntriesByType('navigation')[0],snap=p.snapshot();
    const resources=performance.getEntriesByType('resource').map(e=>{let u;try{u=new URL(e.name)}catch{return null}return{origin:u.origin,path:u.pathname.replace(/\/\d{4,}/g,'/:id').replace(/\/[a-f0-9]{32,}/ig,'/:hash'),type:e.initiatorType,start:+e.startTime.toFixed(1),end:+e.responseEnd.toFixed(1),bytes:e.transferSize||0}}).filter(Boolean);
    return{marks:Object.fromEntries(Object.entries(p.marks).map(([k,v])=>[k,+v.toFixed(1)])),stages:p.runs,readinessEvents:p.readinessEvents.slice(),fixtureFavoriteCalls:p.fixtureFavoriteCalls,warmRowsSettings:window.Lampa&&Lampa.Storage?{continue:Lampa.Storage.get('ydesign_row_continue'),week:Lampa.Storage.get('ydesign_row_week'),source:Lampa.Storage.get('source')}:null,homeTvPrefetch:{total:resources.filter(r=>r.origin==='https://api.themoviedb.org'&&r.path==='/3/tv/:id').length,beforeFirstUsable:resources.filter(r=>r.origin==='https://api.themoviedb.org'&&r.path==='/3/tv/:id'&&r.start<(p.marks.firstUsableHome||Infinity)).length,starts:resources.filter(r=>r.origin==='https://api.themoviedb.org'&&r.path==='/3/tv/:id').map(r=>r.start)},nav:nav&&{domContentLoaded:+nav.domContentLoadedEventEnd.toFixed(1),load:+nav.loadEventEnd.toFixed(1),responseStart:+nav.responseStart.toFixed(1),transfer:nav.transferSize},final:snap,hybrid:window.StremioHybrid?.version||null,loader:window.LampaLoaderDiagnostics&&{requested:LampaLoaderDiagnostics.requested,loaded:LampaLoaderDiagnostics.loaded,failed:LampaLoaderDiagnostics.failed,criticalMs:LampaLoaderDiagnostics.criticalFinishedAt,appreadyStart:LampaLoaderDiagnostics.deferredStartedAt,deferredFinished:LampaLoaderDiagnostics.deferredFinishedAt},longTasks:p.longTasks,resources};
  });

  const navigation = { dpad: null, details: null, back: null };
  if (metrics.marks.firstUsableHome !== undefined) {
    navigation.dpad = await page.evaluate(() => {const p=performance.now(),before=document.querySelector('.activity--active .card.selector.focus'),idx=[...document.querySelectorAll('.activity--active .card.selector')].indexOf(before);return{start:p,index:idx,controller:Lampa.Controller.enabled()?.name}});
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(i => {const a=[...document.querySelectorAll('.activity--active .card.selector')];return a.some((n,j)=>n.classList.contains('focus')&&j!==i)}, navigation.dpad.index, { timeout: 2000 }).catch(()=>{});
    navigation.dpad = await page.evaluate(before => {const now=performance.now(),f=document.querySelector('.activity--active .card.selector.focus'),i=[...document.querySelectorAll('.activity--active .card.selector')].indexOf(f);return{start:before.start,end:+now.toFixed(1),responseMs:+(now-before.start).toFixed(1),from:before.index,to:i,moved:i!==before.index,controller:Lampa.Controller.enabled()?.name}}, navigation.dpad);
    const detailsStart = await page.evaluate(()=>performance.now());
    const intendedCard = await page.evaluate(()=>{const n=document.querySelector('.activity--active .card.selector.focus'),d=n&&(n._ydesign_data||n.data)||{};return n?{id:d.id||n.dataset?.id||null,source:d.source||n.dataset?.source||null,title:String(d.title||d.name||n.textContent||'').trim().slice(0,100)}:null});
    await page.keyboard.press('Enter');
    try { await page.waitForFunction(()=>Lampa.Activity.active()?.component==='full'&&document.querySelector('.activity--active .full-start-new'),null,{timeout:10000});navigation.details=await page.evaluate(start=>({at:+performance.now().toFixed(1),responseMs:+(performance.now()-start).toFixed(1),controller:Lampa.Controller.enabled()?.name,details:!!document.querySelector('.activity--active .full-start-new')}),detailsStart); }
    catch(e){navigation.details={blocked:true,failure:await page.evaluate(({errors,responses,target})=>{const active=Lampa.Activity.active(),controller=Lampa.Controller.enabled(),focus=document.activeElement,card=document.querySelector('.activity--active .card.selector.focus');function identity(n){if(!n)return null;const d=n._ydesign_data||n.data||{};return{title:String(d.title||d.name||n.getAttribute?.('aria-label')||n.textContent||'').trim().slice(0,100),id:d.id||n.dataset?.id||null,source:d.source||n.dataset?.source||null,classes:String(n.className||'').slice(0,180)}}return{activity:active?.component||null,activityKeys:active?.activity?Object.keys(active.activity).slice(0,20):[],controller:controller?.name||null,focus:identity(focus),focusedCard:identity(card),targetCard:target,url:location.pathname+location.search,pageErrors:errors.slice(-5),network:responses.slice(-15)}},{errors:pageErrors.slice(),responses:responses.slice(),target:intendedCard})};}
    if(navigation.details&&!navigation.details.blocked){const backStart=await page.evaluate(()=>performance.now());await page.keyboard.press('Escape');try{await page.waitForFunction(()=>Lampa.Activity.active()?.component==='main'&&document.querySelector('.activity--active .card.selector.focus'),null,{timeout:10000});navigation.back=await page.evaluate(start=>({at:+performance.now().toFixed(1),responseMs:+(performance.now()-start).toFixed(1),restored:!!document.querySelector('.activity--active .card.selector.focus'),controller:Lampa.Controller.enabled()?.name}),backStart);}catch(e){navigation.back={restored:false};}}
    navigation.cycles=[{details:navigation.details,back:navigation.back}];
    for(let cycle=2;cycle<=3&&navigation.details&&!navigation.details.blocked;cycle++){
      const cycleStart=await page.evaluate(()=>performance.now()); await page.keyboard.press('Enter');
      try{await page.waitForFunction(()=>Lampa.Activity.active()?.component==='full'&&document.querySelector('.activity--active .full-start-new'),null,{timeout:10000});const details=await page.evaluate(start=>({responseMs:+(performance.now()-start).toFixed(1),controller:Lampa.Controller.enabled()?.name}),cycleStart);const backStart=await page.evaluate(()=>performance.now());await page.keyboard.press('Escape');await page.waitForFunction(()=>Lampa.Activity.active()?.component==='main'&&document.querySelector('.activity--active .card.selector.focus'),null,{timeout:10000});const back=await page.evaluate(start=>({responseMs:+(performance.now()-start).toFixed(1),restored:!!document.querySelector('.activity--active .card.selector.focus'),controller:Lampa.Controller.enabled()?.name}),backStart);navigation.cycles.push({details,back});}
      catch(e){const failure=await page.evaluate(({errors,responses})=>{const active=Lampa.Activity.active(),controller=Lampa.Controller.enabled(),focus=document.activeElement,card=document.querySelector('.activity--active .card.selector.focus');function id(n){if(!n)return null;const d=n._ydesign_data||n.data||{};return{title:String(d.title||d.name||n.textContent||'').trim().slice(0,100),id:d.id||n.dataset?.id||null,source:d.source||n.dataset?.source||null,classes:String(n.className||'').slice(0,160)}}return{activity:active?.component||null,activityKeys:active?.activity?Object.keys(active.activity).slice(0,20):[],controller:controller?.name||null,focus:id(focus),focusedCard:id(card),url:location.pathname+location.search,pageErrors:errors.slice(-5),network:responses.slice(-15)}},{errors:pageErrors.slice(),responses:responses.slice()});navigation.cycles.push({blocked:true,failure});break;}
    }
  }
  await page.waitForTimeout(8000);
  const tail=await page.evaluate(()=>{const resources=performance.getEntriesByType('resource').map(e=>{let u;try{u=new URL(e.name)}catch{return null}return{origin:u.origin,path:u.pathname.replace(/\/\d{4,}/g,'/:id').replace(/\/[a-f0-9]{32,}/ig,'/:hash'),type:e.initiatorType,start:+e.startTime.toFixed(1),end:+e.responseEnd.toFixed(1),bytes:e.transferSize||0}}).filter(Boolean),tv=resources.filter(r=>r.origin==='https://api.themoviedb.org'&&r.path==='/3/tv/:id'),events=[];tv.forEach(r=>{events.push([r.start,1],[r.end,-1])});events.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);let active=0,max=0;events.forEach(e=>{active+=e[1];if(active>max)max=active});return{resources,homeTvPrefetch:{total:tv.length,beforeFirstUsable:tv.filter(r=>r.start<(window.__p6.marks.firstUsableHome||Infinity)).length,starts:tv.map(r=>r.start),maxConcurrent:max},fixtureFavoriteCalls:window.__p6.fixtureFavoriteCalls,readinessEvents:window.__p6.readinessEvents.slice(),activity:Lampa.Activity.active()?.component,controller:Lampa.Controller.enabled()?.name,ydesignLoaded:!!window.YDesignLoaded,homeHistoryActive:!!window.LampaHomeHistory?.active,marks:window.__p6.marks}});
  metrics.resources=tail.resources;metrics.homeTvPrefetch=tail.homeTvPrefetch;metrics.fixtureFavoriteCalls=tail.fixtureFavoriteCalls;metrics.finalDiagnostics=tail;
  const result = { mode, iteration, browser: await browser.version(), viewport: [1920,1080], dpr: await page.evaluate(()=>devicePixelRatio), elapsedWallMs: Date.now()-started, localAssets: requests, pageErrors, consoleErrors, responses, metrics, navigation };
  await context.close();
  return result;
}

(async()=>{
  const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/usr/bin/google-chrome-stable';
  const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--force-device-scale-factor=1']});
  const results=[];
  try { for(let i=1;i<=count;i++)results.push(await executeRun(browser,i)); }
  finally { await browser.close(); }
  process.stdout.write(JSON.stringify({schema:1,cacheCondition:'new isolated browser context per run; empty HTTP cache/storage/cookies; real Siaivo host/core and API endpoints; repository plugin source bytes intercepted locally',mode,baseCommit:execFileSync('git',['rev-parse','origin/main'],{cwd:root,encoding:'utf8'}).trim(),testedCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sourceHashes:Object.fromEntries([...source].map(([file,body])=>[file,crypto.createHash('sha256').update(body).digest('hex')])),results},null,2)+'\n');
})().catch(e=>{process.stderr.write(String(e.stack||e)+'\n');process.exit(1)});
