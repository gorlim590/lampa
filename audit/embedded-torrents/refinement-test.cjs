'use strict';
const fs=require('fs'),{chromium}=require('playwright');
(async()=>{
 const b=await chromium.connectOverCDP('http://127.0.0.1:9222'),p=b.contexts()[0].pages().find(p=>p.url().startsWith('https://siaivo.isroot.in/'));
 const report={checks:[],errors:[]},save=()=>fs.writeFileSync('audit/embedded-torrents/refinement-report.json',JSON.stringify(report,null,2));
 const check=(name,ok,detail)=>{report.checks.push({name,status:ok?'PASS':'FAIL',detail});save()};
 p.on('pageerror',e=>report.errors.push(e.message.replace(/https?:\/\/[^\s)]+/g,'[URL]')));
 await p.reload({waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.StremioHybrid?.version==='2.3.0'&&document.querySelector('.activity--active .sh-streams'),null,{timeout:45000});await p.waitForTimeout(1500);
 await p.evaluate(()=>{Lampa.Screensaver.stopSlideshow();Lampa.Screensaver.resetTimer();window.__pace={interval:setInterval,delays:[],duration:Lampa.Storage.field('cardify_slideshow_duration')};window.setInterval=function(fn,delay){if(typeof fn==='function'&&String(fn).includes('cardifyCurrentItemId'))__pace.delays.push(delay);return __pace.interval.apply(this,arguments)};Lampa.Activity.push({component:'full',id:1288069,method:'movie',source:'tmdb',card:{id:1288069,title:'Тенцинґ',original_title:'Tenzing'}});});
 try{
  await p.waitForFunction(()=>document.querySelector('.activity--active .sh-streams')&&!document.querySelector('.activity--active.activity--load'),null,{timeout:20000});await p.waitForTimeout(1500);
  await p.locator('.activity--active .view--torrent').dispatchEvent('hover:enter');await p.waitForFunction(()=>document.querySelector('.activity--active .sh-streams[aria-busy=false] .torrent-item'),null,{timeout:30000});
  check('No separate Details/cast action',await p.locator('.sh-stream-details').count()===0);
  const flags=await p.evaluate(()=>Array.from(document.querySelectorAll('.activity--active .m-audio[data-sh-language]')).map(n=>({lang:n.dataset.shLanguage,visible:n.textContent,label:n.getAttribute('aria-label')})));
  check('Flags replace actual audio language labels, accessible labels retained',flags.some(x=>x.lang==='UKR'&&x.visible.includes('🇺🇦'))&&flags.every(x=>x.label),flags);
  check('Available seeded sources visibly highlighted',await p.evaluate(()=>document.querySelectorAll('.activity--active .sh-source-pick').length>0&&Array.from(document.querySelectorAll('.activity--active .sh-source-pick')).every(n=>n._ctrSource?.Seeders>0)));
  await p.waitForTimeout(1500);await p.screenshot({path:'audit/embedded-torrents/compact-final.png'});
  await p.keyboard.press('Escape');await p.keyboard.press('ArrowDown');await p.waitForTimeout(600);
  check('Native Down scrolls details; sources leave the viewport',await p.evaluate(()=>Lampa.Controller.enabled().name==='full_descr'&&document.querySelector('.activity--active .sh-streams').getBoundingClientRect().bottom<=document.querySelector('.activity--active .sh-movie-hero').getBoundingClientRect().bottom+1));
  for(let i=0;i<5;i++){await p.keyboard.press('ArrowDown');await p.waitForTimeout(150)}
  check('Native Down reaches cast or recommendation rows',await p.evaluate(()=>Lampa.Controller.enabled().name!=='full_start'&&Lampa.Controller.enabled().name!=='sh_movie_streams'&&Array.from(document.querySelectorAll('.activity--active .focus')).some(n=>{var r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.width>0;})),await p.evaluate(()=>({controller:Lampa.Controller.enabled().name,focus:document.querySelector('.activity--active .focus')?.className})));
  await p.screenshot({path:'audit/embedded-torrents/lower-content-final.png'});
  await p.evaluate(()=>Lampa.Controller.toggle('full_start'));await p.locator('.activity--active .view--torrent').dispatchEvent('hover:enter');
  await p.evaluate(()=>{const pane=document.querySelector('.activity--active .sh-streams');Lampa.Controller.collectionFocus(pane.querySelector('.torrent-item'),pane);for(let i=0;i<50&&Lampa.Controller.enabled().name==='sh_movie_streams';i++)Lampa.Controller.move('down');});await p.waitForTimeout(600);
  check('Down at final source returns to native lower content',await p.evaluate(()=>Lampa.Controller.enabled().name==='full_descr'));
  await p.evaluate(()=>Lampa.Controller.toggle('full_start'));
  await p.waitForFunction(()=>__pace.delays.length>0,null,{timeout:12000});
  check('Actual Cardify callback paced at >=25 seconds',await p.evaluate(()=>__pace.delays[0]>=25000),await p.evaluate(()=>__pace.delays.slice()));
  try{await p.waitForFunction(()=>document.querySelectorAll('.activity--active .full-start__background').length>=2,null,{timeout:35000,polling:50});await p.waitForTimeout(200);
   const fade=await p.evaluate(()=>Array.from(document.querySelectorAll('.activity--active .full-start__background')).map(n=>({opacity:Number(getComputedStyle(n).opacity),transition:getComputedStyle(n).transitionDuration})));
   check('Real Cardify rotation interpolates opacity instead of forced jump',fade.some(x=>x.opacity>0&&x.opacity<.99&&x.transition==='0.8s'),fade);await p.screenshot({path:'audit/embedded-torrents/backdrop-crossfade.png'});await p.waitForTimeout(1700);
   check('Cardify cleans old backdrop after crossfade',await p.locator('.activity--active .full-start__background').count()===1);
  }catch(e){report.checks.push({name:'Actual backdrop crossfade',status:'BLOCKED',detail:'No second decoded image observed within 35 seconds'});save();}
  await p.evaluate(()=>StremioHybrid.setEnabled(false));
  check('Theme off restores original Cardify interval',await p.evaluate(()=>__pace.delays.at(-1)===(parseInt(__pace.duration)||8000)&&!document.querySelector('.sh-streams')&&!document.querySelector('#stremio-hybrid-style')),await p.evaluate(()=>__pace.delays.slice()));
  await p.evaluate(()=>StremioHybrid.setEnabled(true));await p.waitForTimeout(800);
  check('Reenable repaces existing timer without changing Cardify preferences',await p.evaluate(()=>__pace.delays.at(-1)>=25000&&Lampa.Storage.field('cardify_slideshow_duration')===__pace.duration&&document.querySelectorAll('.activity--active .sh-streams').length===1));
  await p.emulateMedia({reducedMotion:'reduce'});check('Reduced motion removes backdrop transition',await p.evaluate(()=>getComputedStyle(document.querySelector('.activity--active .full-start__background')).transitionDuration==='0s'));await p.emulateMedia({reducedMotion:'no-preference'});
 }finally{await p.evaluate(()=>{window.setInterval=__pace.interval;delete window.__pace;});}
 await p.locator('.activity--active .view--torrent').dispatchEvent('hover:enter');await p.waitForFunction(()=>document.querySelector('.activity--active .sh-streams[aria-busy=false]'));
 save();console.log(JSON.stringify(report,null,2));process.exit(report.checks.some(x=>x.status==='FAIL')?1:0);
})().catch(e=>{console.error(e.stack);process.exit(1)});
