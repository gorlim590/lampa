const {chromium}=require('playwright');
const fs=require('fs');
const path=require('path');
const dir=path.join(__dirname,'active-session');fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const direct=process.argv[2]==='cinema-audit'&&/^ws:\/\/127\.0\.0\.1:9222\/devtools\/browser\/[a-f0-9-]+$/.test(process.argv[4]||'')?process.argv[4]:null;
 const browser=await chromium.connectOverCDP(direct||'http://127.0.0.1:9222',{timeout:15000});
 const context=browser.contexts()[0];
 const page=context.pages().find(page=>page.url().includes('siaivo.isroot.in'));
 if(!page)throw Error('Активну вкладку Lampa не знайдено');
 if(process.argv[2]==='cinema-audit'){page.setDefaultTimeout(12000);page.setDefaultNavigationTimeout(25000);let deadline;try{await Promise.race([require('./cinema-upgrade-20261022/browser.cjs')({browser,context,page}),new Promise((_,reject)=>{deadline=setTimeout(()=>reject(Error('Cinema audit deadline exceeded; browser left open')),150000)})]);}finally{clearTimeout(deadline);}process.exit(0);}
 if(process.argv[2]==='reload'){
  const errors=[],network=[];
  page.on('pageerror',e=>errors.push((e.stack||e.message).replace(/https?:\/\/[^\s)]+/g,u=>u.split('?')[0])));
  page.on('requestfailed',r=>network.push({url:r.url().split('?')[0],error:r.failure()?.errorText}));
  page.on('response',r=>{if(r.status()>=400)network.push({url:r.url().split('?')[0],status:r.status()})});
  await page.goto('https://siaivo.isroot.in/',{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.appready,null,{timeout:45000});await page.waitForTimeout(12000);
  fs.writeFileSync(path.join(dir,'final-load.json'),JSON.stringify({errors,network,text:(await page.locator('body').innerText()).slice(-12000)},null,2));await page.screenshot({path:path.join(dir,'final-load.png')});console.log(JSON.stringify({errors,networkCount:network.length}));process.exit(0);
 }
 if(process.argv[2]==='select-plugin'){
  await page.locator('.extensions__item').filter({hasText:'https://gorlim590.github.io/lampa/'+process.argv[3]}).dispatchEvent('hover:enter');await page.waitForTimeout(400);console.log((await page.locator('body').innerText()).slice(-3500));process.exit(0);
 }
 if(process.argv[2]==='manage'){
  await page.locator('.open--settings').click({force:true});await page.waitForTimeout(300);
  await page.locator('.settings-folder[data-component="plugins"]').dispatchEvent('hover:enter');await page.waitForTimeout(1000);
  console.log(JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('[class*=extensions]')].slice(0,20).map(e=>({class:e.className,html:e.outerHTML.slice(0,800)}))),null,2));process.exit(0);
 }
 if(process.argv[2]==='trakt-read'){
  const result=await page.evaluate(async()=>{
   const endpoints=['/users/me','/sync/last_activities','/sync/watched/movies','/sync/watched/shows','/sync/collection/movies'];const out=[];
   const token=Lampa.Storage.get('trakt_token');if(!token)return {blocked:'No token'};
   for(const endpoint of endpoints){try{const r=await fetch('https://apx.lme.isroot.in/trakt'+endpoint,{method:'GET',headers:{Authorization:'Bearer '+token,'trakt-api-version':'2','x-requested-with':'lme-plugins'},signal:AbortSignal.timeout(20000)});const body=await r.json().catch(()=>null);out.push({endpoint,status:r.status,json:body!==null,type:Array.isArray(body)?'array':typeof body,count:Array.isArray(body)?body.length:undefined});}catch(e){out.push({endpoint,error:e.name})}}
   return out;
  });fs.writeFileSync(path.join(dir,'trakt-read.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));process.exit(0);
 }
 if(process.argv[2]==='verify'){
  const backup=fs.readdirSync(path.join(__dirname,'..','backups')).filter(x=>x.startsWith('active-storage-')).sort()[0];
  const before=JSON.parse(fs.readFileSync(path.join(__dirname,'..','backups',backup))).local;
  const now=await page.evaluate(()=>({...localStorage}));
  const parse=s=>{try{return JSON.parse(s)}catch{return s}};
  const data=await page.evaluate(()=>({url:location.href,ready:window.appready,plugins:Lampa.Storage.get('plugins',[]),flags:{trakt:!!window.TraktTV,plus:!!window.TraktPlus,ydesign:!!window.YDesignLoaded,profiles:!!window.profiles_plugin,customFavorites:!!window.custom_favorites},text:document.body.innerText.slice(-5000)}));
  data.authorization={traktTokenUnchanged:before.trakt_token===now.trakt_token,traktRefreshUnchanged:before.trakt_refresh_token===now.trakt_refresh_token,cubTokenUnchanged:parse(before.account)?.token===parse(now.account)?.token,cubSyncSettingUnchanged:before.account_use===now.account_use};
  fs.writeFileSync(path.join(dir,'final-state.json'),JSON.stringify(data,null,2));await page.screenshot({path:path.join(dir,'final-state.png')});console.log(JSON.stringify({ready:data.ready,plugins:data.plugins.length,authorization:data.authorization,flags:data.flags},null,2));process.exit(0);
 }
 if(process.argv[2]==='isolate'){
  const outFile=path.join(dir,'individual.json');const out=fs.existsSync(outFile)?JSON.parse(fs.readFileSync(outFile)):[];
  let allowed=new Set(),errors=[],blocked=[],responses=[];
  const pattern='**/gorlim590.github.io/lampa/**';
  const handler=async route=>{const file=new URL(route.request().url()).pathname.replace('/lampa/','');if(file==='loader.js'||allowed.has(file))return route.continue();blocked.push(file);return route.abort('blockedbyclient')};
  page.on('pageerror',e=>errors.push((e.stack||e.message).replace(/https?:\/\/[^\s)]+/g,u=>u.split('?')[0])));
  page.on('response',r=>{if(r.url().includes('gorlim590.github.io/lampa/'))responses.push({url:r.url().split('?')[0],status:r.status()})});
  await page.route(pattern,handler);
  try{
   for(const file of process.argv.slice(3)){
    allowed=new Set([file]);if(file==='trakt/trakt-plus.js')allowed.add('trakt/trakt.js');if(file==='ui/design-optimized.js')allowed.add('ui/interface-plus.js');
    errors=[];blocked=[];responses=[];
    await page.goto('https://siaivo.isroot.in/?component=full&id=1429&method=tv&source=tmdb',{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>window.appready,null,{timeout:45000});await page.waitForTimeout(4500);
    const text=await page.locator('body').innerText();
    const result={file,dependencies:[...allowed].filter(x=>x!==file),method:'Temporary request blocking in existing authorized page; original external plugins remain enabled',responses,errors,blocked:[...new Set(blocked)],text:text.slice(-12000),time:new Date().toISOString()};
    await page.screenshot({path:path.join(dir,'individual-'+file.replaceAll('/','--')+'.png')});
    out.push(result);fs.writeFileSync(outFile,JSON.stringify(out,null,2));console.log(file,'http='+responses.find(x=>x.url.endsWith('/'+file))?.status,'errors='+errors.length);
   }
  }finally{await page.unroute(pattern,handler);await page.goto('https://siaivo.isroot.in/',{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.appready,null,{timeout:45000});await page.waitForTimeout(5000);}
  process.exit(0);
 }
 if(process.argv[2]==='sources'){
  const crypto=require('crypto'),out=[];const live=path.join(dir,'live-sources');fs.mkdirSync(live,{recursive:true});
  for(const file of require('./static-inventory.json').files.filter(f=>f.classification==='standalone-candidate')){
   try{const r=await context.request.get(file.url,{timeout:20000}),body=await r.body();fs.writeFileSync(path.join(live,file.path.replaceAll('/','--')),body);const old=fs.readFileSync(path.join(__dirname,'..','repository-snapshot',file.path),'utf8');const norm=s=>s.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').trim();out.push({file:file.path,status:r.status(),mime:r.headers()['content-type'],sha256:crypto.createHash('sha256').update(body).digest('hex'),sameNormalized:norm(body.toString())===norm(old)});}catch(e){out.push({file:file.path,error:e.message})}
  }
  fs.writeFileSync(path.join(dir,'sources.json'),JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));process.exit(0);
 }
 if(process.argv[2]==='scenarios'){
  const results=[],errors=[],network=[];
  const redact=s=>String(s).replace(/https?:\/\/[^\s"')]+/g,u=>u.split('?')[0]);
  page.on('pageerror',e=>errors.push(redact(e.message)));
  page.on('requestfailed',r=>network.push({url:r.url().split('?')[0],error:r.failure()?.errorText}));
  page.on('response',r=>{if(r.status()>=400)network.push({url:r.url().split('?')[0],status:r.status()})});
  const origin='https://siaivo.isroot.in/';
  for(const [name,query] of [['movie','?component=full&id=550&method=movie&source=tmdb'],['series','?component=full&id=1399&method=tv&source=tmdb'],['anime','?component=full&id=1429&method=tv&source=tmdb'],['home','']]){
   const start=errors.length,net=network.length;
   await page.goto(origin+query,{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForFunction(()=>window.appready,null,{timeout:45000});
   await page.waitForTimeout(7000);
   const state=await page.evaluate(()=>({url:location.href,text:document.body.innerText.slice(-20000),classes:document.body.className,details:document.querySelectorAll('.full-start,.full-start-new').length,ratings:[...document.querySelectorAll('[class*=rating]')].slice(0,45).map(e=>({class:e.className,text:e.textContent.slice(0,100)})),flags:{trakt:!!window.TraktTV,traktPlus:!!window.TraktPlus,ydesign:!!window.YDesignLoaded},plugins:Lampa.Storage.get('plugins',[])}));
   await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowLeft');
   state.focus=await page.locator('.focus').count();state.errors=errors.slice(start);state.network=network.slice(net);state.name=name;
   await page.screenshot({path:path.join(dir,'scenario-'+name+'.png')});results.push(state);
   fs.writeFileSync(path.join(dir,'scenarios.json'),JSON.stringify(results,null,2));
   console.log(name,'details='+state.details,'errors='+state.errors.length,'network='+state.network.length);
  }
  process.exit(0);
 }
 if(process.argv[2]==='globals'){
  console.log(JSON.stringify(await page.evaluate(()=>({flags:Object.fromEntries(['plugin_community_watches_ready','bandera_online','custom_favorites','profiles_plugin','YDesignLoaded','tv_status_color'].map(k=>[k,Boolean(window[k])])),loader:Lampa.Storage.get('gl_loader_plugins'),trakt:{base:!!window.TraktTV,plus:!!window.TraktPlus,tokenPresent:!!Lampa.Storage.get('trakt_token')},version:Lampa.Manifest.app_digital})),null,2));process.exit(0);
 }
 if(process.argv[2]==='add'){
  for(const file of process.argv.slice(3)){
  const url=/^https:\/\//.test(file)?file:'https://gorlim590.github.io/lampa/'+file;
  if(await page.evaluate(url=>Lampa.Storage.get('plugins',[]).some(p=>p.url===url),url)){console.log(file,'already installed');continue;}
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(!await page.locator('.simple-keyboard-input').isVisible().catch(()=>false))await page.locator('.extensions__block-add').dispatchEvent('hover:enter');
  await page.locator('.simple-keyboard-input').fill(url);
  await page.getByText('Готово',{exact:true}).last().click({force:true,timeout:5000});
  await page.waitForTimeout(5000);
  const data=await page.evaluate(()=>({plugins:Lampa.Storage.get('plugins',[]),text:document.body.innerText.slice(-7000),scripts:[...document.scripts].map(s=>s.src).filter(s=>s.includes('gorlim590'))}));
  data.errors=errors;fs.writeFileSync(path.join(dir,file.replaceAll('/','--')+'.json'),JSON.stringify(data,null,2));
  await page.screenshot({path:path.join(dir,file.replaceAll('/','--')+'.png')});
  console.log(JSON.stringify({file,registered:data.plugins.some(p=>p.url===url),errors}));
  }
  process.exit(0);
 }
 if(process.argv[2]==='ui'){
  const target=process.argv[3];
  if(target==='settings')await page.locator('.open--settings').click();
  else {const folder=page.locator('.settings-folder').filter({hasText:target});if(await folder.count()){
   for(let i=0;i<35;i++){if((await page.locator('.settings-folder.focus').innerText().catch(()=>'' )).trim()===target)break;await page.keyboard.press('ArrowDown');await page.waitForTimeout(80);}
   if((await page.locator('.settings-folder.focus').innerText().catch(()=>'' )).trim()!==target)throw Error('Unable to focus settings item');
   await page.keyboard.press('Enter');
  }else await page.getByText(target,{exact:true}).last().click({force:true,timeout:5000});}
  await page.waitForTimeout(800);
  console.log((await page.locator('body').innerText()).slice(-14000));
  console.log(JSON.stringify(await page.locator('input').evaluateAll(es=>es.map(e=>({type:e.type,placeholder:e.placeholder,class:e.className})))));
  await page.screenshot({path:path.join(dir,'ui-current.png')});
  process.exit(0);
 }
 if(process.argv[2]==='inspect-ui'){
  console.log(JSON.stringify(await page.evaluate(()=>({text:document.body.innerText.slice(-4000),inputs:[...document.querySelectorAll('input')].map(e=>e.outerHTML),focus:[...document.querySelectorAll('.focus')].map(e=>e.outerHTML.slice(0,500)),events:[...document.querySelectorAll('.extensions__block-add')].map(e=>Object.keys(window.$._data(e,'events')||{}))})),null,2));
  console.log(JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('[class*=settings], [class*=extension]')].slice(0,45).map(e=>({tag:e.tagName,class:e.className,text:e.textContent.slice(0,180)}))),null,2));
  process.exit(0);
 }
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 await context.storageState({path:path.join(__dirname,'..','backups',`active-${stamp}.json`),indexedDB:true});
 fs.chmodSync(path.join(__dirname,'..','backups',`active-${stamp}.json`),0o600);
 const storage=await page.evaluate(()=>({local:{...localStorage},session:{...sessionStorage}}));
 fs.writeFileSync(path.join(__dirname,'..','backups',`active-storage-${stamp}.json`),JSON.stringify(storage),{mode:0o600});
 const report=await page.evaluate(()=>({url:location.href,title:document.title,ready:window.appready,scripts:[...document.scripts].map(s=>s.src).filter(Boolean),plugins:Lampa.Storage.get('plugins',[]),accountPluginType:typeof Lampa.Storage.get('account_plugins'),keys:Object.keys(localStorage),text:document.body.innerText.slice(-8000)}));
 fs.writeFileSync(path.join(dir,'before.json'),JSON.stringify(report,null,2));
 await page.screenshot({path:path.join(dir,'before.png')});
 console.log(JSON.stringify({ready:report.ready,plugins:report.plugins,backup:stamp},null,2));
 process.exit(0);
})().catch(e=>{console.error(e.message);process.exit(1)});
