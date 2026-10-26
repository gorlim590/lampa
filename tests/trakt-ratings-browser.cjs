'use strict';
// Verified MAIN Chrome CDP tab only. Set LAMPA_MAIN_CDP_URL explicitly after
// confirming its profile; no default/test-browser fallback. Fixtures are synthetic.
// --live permits only
// this task's reversible rating writes. Never emits headers/tokens or raw errors.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..'),live=process.argv.includes('--live');
const endpoint=process.env.LAMPA_MAIN_CDP_URL;
if(!endpoint||process.env.LAMPA_MAIN_CDP_CONFIRMED!=='yes'){console.error('BLOCKED: explicitly verified primary Chrome CDP endpoint required; no test-browser fallback');process.exit(2);}
const files=['trakt/trakt.js','trakt/trakt-plus.js'],bytes=Object.fromEntries(files.map(f=>[f,fs.readFileSync(path.join(root,f))]));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const report={commit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),mode:live?'live':'fixtures',checks:[],sources:{},exceptions:[],transport:[]};
const check=(name,value)=>{report.checks.push({name,status:value?'PASS':'FAIL'});if(!value)throw Error(name);};
(async()=>{
 const browser=await chromium.connectOverCDP(endpoint);
 const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().startsWith('https://siaivo.isroot.in/'));
 if(!page)throw Error('Existing Lampa tab unavailable');
 const original=page.url(),values={movie:null,show:4,episode:7},responses=[];let fail=false;
 const cdp=await page.context().newCDPSession(page);
 const shadow=await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{const values={},get=Storage.prototype.getItem,set=Storage.prototype.setItem,remove=Storage.prototype.removeItem;const auth=k=>${live}&&/^trakt.*(token|expire|auth)/.test(k);Storage.prototype.getItem=function(k){return Object.prototype.hasOwnProperty.call(values,k)?values[k]:get.call(this,k)};Storage.prototype.setItem=function(k,v){if(auth(k))return set.call(this,k,v);values[k]=String(v)};Storage.prototype.removeItem=function(k){if(auth(k))return remove.call(this,k);values[k]=null};})()`});
 const route=async r=>{
  const req=r.request(),u=new URL(req.url()),file=files.find(f=>u.pathname.endsWith('/'+f));
  if(file){return r.fulfill({contentType:'application/javascript',body:bytes[file],headers:{'cache-control':'no-store','x-ratings-commit':report.commit}});}
  if(u.hostname==='api.trakt.tv'||u.hostname==='wh.lme.isroot.in'||(u.hostname==='apx.lme.isroot.in'&&u.pathname.startsWith('/trakt/'))){
   const rating=/\/sync\/ratings/.test(u.pathname),identity=/\/users\/me$/.test(u.pathname),oauth=/\/oauth\/token$/.test(u.pathname);
   if(live&&(rating||identity||oauth))return r.continue();
   if(identity)return r.fulfill({json:{ids:{uuid:'isolated-rating-browser'}}});
   if(rating){if(fail)return r.fulfill({status:400,json:{error:'fixture'}});if(req.method()==='POST'){
    const body=req.postDataJSON(),type=body.movies?'movie':body.shows?.[0]?.seasons?'episode':'show',item=body.movies?.[0]||body.shows?.[0];values[type]=u.pathname.endsWith('/remove')?null:type==='episode'?item.seasons[0].episodes[0].rating:item.rating;
    return r.fulfill({json:u.pathname.endsWith('/remove')?{deleted:{[type+'s']:1}}:{updated:{[type+'s']:1}}});
   }const type=u.pathname.split('/').pop().slice(0,-1);return r.fulfill({json:values[type]==null?[]:[{rating:values[type],[type]:{ids:{tmdb:550},...(type==='episode'?{season:1,number:2}:{})},...(type==='episode'?{show:{ids:{tmdb:550}}}:{})}]});}
   if(oauth)return r.abort();
   return r.fulfill({json:[]});
  }
  if(!['GET','HEAD','OPTIONS'].includes(req.method()))return r.abort();
  return r.continue();
 };
 const onResponse=r=>{const u=new URL(r.url());if(/ratings|users\/me/.test(u.pathname))report.transport.push({host:u.hostname,path:u.pathname,status:r.status(),method:r.request().method()});const f=files.find(f=>u.pathname.endsWith('/'+f));if(f)responses.push(r.body().then(b=>report.sources[f]={sha256:sha(b),matches:sha(b)===sha(bytes[f])}).catch(()=>{}));};
 const onError=e=>report.exceptions.push(e.message.replace(/https?:\/\/\S+/g,'[URL]'));
 await page.route('**/*',route);page.on('response',onResponse);page.on('pageerror',onError);
 try{
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.TraktPlus?.version==='3.4.1-rating-widgets'&&window.TraktTV?.api?.writeRating,{},{timeout:45000});
  // Suppress unrelated background Favorite imports; no test writes to history.
  await page.evaluate(()=>{Lampa.Favorite.add=Lampa.Favorite.remove=()=>{};});
  if(live){
   const result=await page.evaluate(async()=>{
    const card={id:550,source:'tmdb'},t=TraktPlus;let original,changed=false,restored=false;
    try{original=(await t.rating(card,true)).value;const first=original===8?7:8;changed=true;await t.setRating(card,first);if((await t.rating(card,true)).value!==first)throw Error('readback');await t.setRating(card,first===9?6:9);await t.setRating(card,null);return {read:true,add:true,change:true,remove:true};}
    finally{if(changed){await t.setRating(card,original);restored=(await t.rating(card,true)).value===original;if(!restored)throw Error('Original rating restoration unconfirmed');}window.__ratingLiveRestored=restored;}
   });
   check('Actual Trakt authenticated CRUD and readback',result.read&&result.add&&result.change&&result.remove);
   check('Original rating restored',await page.evaluate(()=>window.__ratingLiveRestored===true));
  }else{
   await page.evaluate(()=>Lampa.Activity.push({component:'full',id:550,method:'movie',source:'tmdb'}));
   await page.waitForSelector('.tp-personal-rating',{timeout:45000});
   check('One personal rating in existing external ratings strip',await page.evaluate(()=>document.querySelectorAll('.activity--active .tp-personal-rating').length===1&&!!document.querySelector('.full-start-new__rate-line .tp-personal-rating')));
   await page.evaluate(()=>{const n=document.querySelector('.tp-personal-rating');Lampa.Controller.toggle('full_start');Lampa.Controller.collectionFocus($(n),$(n).closest('.full-start-new'));});
   await page.keyboard.press('Enter');await page.waitForSelector('.tp-rating-dropdown .tp-rating-half',{timeout:10000});
   check('Native OK opens anchored half-star dropdown',await page.evaluate(()=>document.querySelectorAll('.tp-rating-dropdown .tp-rating-half').length>=10));
   await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');
   await page.waitForFunction(()=>document.querySelector('.tp-personal-rating')?.textContent.includes('/5'));
   report.focus=await page.evaluate(()=>({controller:Lampa.Controller.enabled().name,focus:document.querySelector('.focus')?.className,personal:document.querySelector('.tp-personal-rating')?.className}));
   check('Remote selection updates rating and returns focus',await page.evaluate(()=>document.querySelector('.tp-personal-rating').classList.contains('focus')));
   check('Movie/show isolation',await page.evaluate(async()=>{const t=TraktPlus;await t.setRating({id:550},8);return (await t.rating({id:550})).value===8&&(await t.rating({id:550,type:'anime'})).value===4;}));
   await page.evaluate(async()=>{await TraktPlus.setRating({id:550},null)});
   check('Removal confirmed',await page.evaluate(async()=>(await TraktPlus.rating({id:550})).value===null));
   const episode=await page.evaluate(async()=>{const data={id:901002,card:{id:550,original_name:'Episode fixture',source:'tmdb'},season_number:1,episode_number:2,name:'Episode fixture',vote_average:8.2,air_date:'2025-01-01',runtime:23};const item=Lampa.Maker.make('Episode',data);item.create();const root=item.render();window.$(document.querySelector('.full-start-new')).append(root);window.__ratingEpisode=item;const button=window.$(root).find('.tp-personal-rating')[0];return {control:!!button,publicScore:data.vote_average,value:(await TraktPlus.rating({...data,rating_type:'episode',show:data.card})).value};});
   check('Native episode control preserves public score and personal identity',episode.control&&episode.publicScore===8.2&&episode.value===7);
   fail=true;check('API failure is surfaced without success',await page.evaluate(async()=>{try{await TraktPlus.setRating({id:550},9);return false;}catch(e){return true;}}));fail=false;
   await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.TraktPlus?.version==='3.4.1-rating-widgets');
   check('Reload reads server state',await page.evaluate(async()=>(await TraktPlus.rating({id:550},true)).value===null));
  }
  await Promise.all(responses);check('Exact changed JS served',files.every(f=>report.sources[f]?.matches));
  check('No JavaScript exceptions during acceptance',report.exceptions.length===0);
 }catch(e){report.failure=e.message.replace(/https?:\/\/\S+/g,'[URL]').slice(0,250);}
 finally{await cdp.send('Page.removeScriptToEvaluateOnNewDocument',{identifier:shadow.identifier});await cdp.detach();await page.unroute('**/*',route);page.off('response',onResponse);page.off('pageerror',onError);await page.goto(original,{waitUntil:'domcontentloaded'});}
 console.log(JSON.stringify(report));process.exit(report.failure?1:0);
})().catch(e=>{console.error('CDP ratings test blocked: '+e.message.slice(0,150));process.exit(1)});
