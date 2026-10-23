'use strict';
const fs=require('fs'),{chromium}=require('playwright');
(async()=>{
 const r={kind:'Focused UA owner smoke test in existing CDP tab; controlled KinoStrain responses and transient settings getter, no preference writes or playback',checks:[],errors:[],blocked:['Live completeness across all five providers','Full TV remote/resolution matrix and physical Google TV','Long-session heap profiling']};
 const check=(name,ok,data)=>r.checks.push({name,status:ok?'PASS':'FAIL',...(data===undefined?{}:{data})});
 const b=await chromium.connectOverCDP('http://127.0.0.1:9222'),p=b.contexts()[0].pages().find(p=>p.url().startsWith('https://siaivo.isroot.in/'));if(!p)throw Error('Existing Lampa tab absent');
 p.on('pageerror',e=>r.errors.push(e.message.replace(/https?:\/\/[^\s)]+/g,'[URL]')));
 try {
  await p.reload({waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.UAComments?.version==='1.0.0'&&window.Lampa?.Activity.active()?.activity,null,{timeout:30000});
  check('Normal local delivery, one owner and same32 extensions',await p.evaluate(()=>Array.from(document.scripts).filter(n=>n.src.includes('127.0.0.1:8766/media/ua-comments.js')).length===1&&document.querySelectorAll('#ua-comments-style').length===1&&Lampa.Storage.get('plugins',[]).length===32));
  await p.evaluate(()=>Lampa.Activity.push({component:'full',id:438631,method:'movie',source:'tmdb',card:{id:438631}}));
  await p.waitForFunction(()=>document.querySelector('.activity--active .full-descr__details')&&!document.querySelector('.activity--active.activity--load'),null,{timeout:30000});
  await p.evaluate(()=>{
   const listener=Lampa.Listener._listeners.full.find(f=>String(f).includes('UaComentsY Listener Error'));if(!listener)throw Error('Owner event handler absent');
   listener({type:'destroy'});
   const oldAjax=$.ajax,oldGet=Lampa.Storage.get;
   const t=window.__uaSmoke={listener,oldAjax,oldGet,mode:'success',count:0,aborted:0,held:[],fetch:(id=438631,type='movie')=>listener({type:'complite',data:{movie:{id,type,title:'Контрольний тест',original_title:'Fixture',release_date:'2021-01-01'}}})};
   Lampa.Storage.get=function(k,...args){if(k.startsWith('uacom_src_'))return k==='uacom_src_kinostrain';return oldGet.call(this,k,...args)};
   $.ajax=function(opts){let url;try{url=decodeURIComponent(opts.url)}catch{url=opts.url}if(!url.includes('api.kinostrain.com'))return oldAjax.apply(this,arguments);
    t.count++;let stopped=false,timer;const job={readyState:1,abort(){stopped=true;clearTimeout(timer);this.readyState=4;t.aborted++;opts.error?.(this,'abort');opts.complete?.(this,'abort')}};
    const finish=()=>{if(stopped)return;job.readyState=4;if(t.mode==='error'){opts.error?.(job,'error');opts.complete?.(job,'error');return;}
     let data=url.includes('/search?')?{data:[{slug:'fixture',format:'film',yearStart:2021}]}:url.endsWith('/content/fixture')?{data:{id:123}}:{data:t.mode==='empty'?[]:Array.from({length:65},(_,i)=>({text:'Контрольний коментар '+i,user:{nickname:'Fixture '+i}}))};
     opts.success?.(JSON.stringify(data));opts.complete?.(job,'success');};
    if(t.mode==='hold')t.held.push({opts,job});else timer=setTimeout(finish,10);return job;
   };
   t.fetch();
  });
  await p.waitForFunction(()=>UAComments.state().cards===40);
  check('65 genuine-shape fixture results render only40 cards',await p.evaluate(()=>({count:document.querySelectorAll('.activity--active .ua-comment-card').length,more:document.querySelectorAll('.activity--active .ua-comments-page').length})).then(v=>v.count===40&&v.more===1));
  await p.locator('.activity--active .ua-comments-page').dispatchEvent('hover:enter');
  check('Next page contains remaining25 with exact indices',await p.evaluate(()=>UAComments.state().cards===25&&document.querySelector('.activity--active .ua-comment-card').dataset.idx==='40'));
  await p.locator('.activity--active .ua-comment-card').first().dispatchEvent('hover:enter');
  check('Native OK action opens functional viewer on comment41',await p.evaluate(()=>document.querySelector('.uacom-counter')?.textContent==='41 / 65'));
  await p.evaluate(()=>{Lampa.Controller.toggle('uacom_viewer');Lampa.Controller.back();});
  await p.waitForFunction(()=>!document.querySelector('.uacom-overlay'));
  check('Native viewer controller Back closes viewer',await p.locator('.uacom-overlay').count()===0);
  await p.evaluate(()=>{const t=__uaSmoke;t.before=t.count;t.listener({type:'destroy'});t.fetch();});
  await p.waitForFunction(()=>UAComments.state().cards===40);
  check('Same movie cache avoids repeat requests',await p.evaluate(()=>__uaSmoke.count===__uaSmoke.before));
  await p.evaluate(()=>{const t=__uaSmoke;t.listener({type:'destroy'});t.mode='hold';t.fetch(2001);});
  await p.waitForFunction(()=>UAComments.state().requests===1);
  await p.evaluate(()=>{const t=__uaSmoke;t.listener({type:'destroy'});t.held[0].opts.success(JSON.stringify({data:[{slug:'late',format:'film',yearStart:2021}]}));});
  check('Destroy aborts request and ignores manually delivered late callback',await p.evaluate(()=>!UAComments.state().active&&UAComments.state().requests===0&&__uaSmoke.aborted>0&&!document.querySelector('.ua-comments-root')));
  await p.evaluate(()=>{__uaSmoke.mode='empty';__uaSmoke.fetch(2002)});
  await p.waitForFunction(()=>document.querySelector('.activity--active .ua-status-card')?.textContent==='Коментарі не знайдено');
  check('Empty response retains clear retryable state',await p.evaluate(()=>UAComments.state().cards===0&&UAComments.state().cacheEntries===1));
  await p.evaluate(()=>{const t=__uaSmoke;t.listener({type:'destroy'});t.mode='error';t.fetch(2003)});
  await p.waitForFunction(()=>UAComments.state().requests===0&&document.querySelector('.activity--active .ua-status-card')?.textContent==='Коментарі не знайдено');
  check('Provider error terminates without hanging or caching outage',await p.evaluate(()=>UAComments.state().cacheEntries===1));
  await p.addScriptTag({url:'http://127.0.0.1:8766/media/ua-comments.js?repeat-test'});
  check('Repeated script leaves one style and one Full listener',await p.evaluate(()=>document.querySelectorAll('#ua-comments-style').length===1&&Lampa.Listener._listeners.full.filter(f=>String(f).includes('UaComentsY Listener Error')).length===1));
  await p.evaluate(()=>{const t=__uaSmoke;t.listener({type:'destroy'});t.mode='success';t.fetch();});
  await p.waitForFunction(()=>UAComments.state().cards===40);
  check('Hybrid uses scoped cards without blur',await p.evaluate(()=>{const c=document.querySelector('.activity--active .ua-comment-card');return getComputedStyle(c).backdropFilter==='none'&&c.closest('.activity--active')!==null}));
  await p.screenshot({path:'audit/ua-comments-20261023/comments-fixture.png'});
  await p.evaluate(()=>{UAComments.destroy();});
  check('Dispose releases requests/timers/style/listener',await p.evaluate(()=>!UAComments.state().active&&!document.querySelector('#ua-comments-style')&&!Lampa.Listener._listeners.full.some(f=>String(f).includes('UaComentsY Listener Error'))));
 } finally {
  await p.evaluate(()=>{const t=window.__uaSmoke;if(t){UAComments.destroy();$.ajax=t.oldAjax;Lampa.Storage.get=t.oldGet;delete window.__uaSmoke;}}).catch(()=>{});
  await p.reload({waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.UAComments?.version==='1.0.0'&&document.querySelector('#ua-comments-style'),null,{timeout:30000});
 }
 check('Final ordinary reload restores one local owner without fixtures',await p.evaluate(()=>document.querySelectorAll('#ua-comments-style').length===1&&!window.__uaSmoke));
 fs.writeFileSync('audit/ua-comments-20261023/smoke-report.json',JSON.stringify(r,null,2));console.log(JSON.stringify(r,null,2));process.exit(r.checks.some(x=>x.status==='FAIL')||r.errors.length?1:0);
})().catch(e=>{console.error(e.stack);process.exit(1)});
