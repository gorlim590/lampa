'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {fixture}=require('./helpers/trakt-watched-fixture.cjs');

const cards=(count,offset=0)=>Array.from({length:count},(_,i)=>({method:'movie',id:offset+i,title:'Title '+(offset+i)}));
// Mirrors native Category's onLoadNext contract (upstream next.js): increment
// object.page before emit('next'); rejection only clears next_wait.
// https://github.com/yumata/lampa-source/blob/master/src/interaction/items/category/module/next.js
function nativeCategoryScrollEnd(self){
  if(self.next_wait||!self.built||!self.built.results.length||self.object.page>=self.total_pages)return Promise.resolve('idle');
  self.next_wait=true;self.object.page++;
  return new Promise(resolve=>self.hooks.onNext.call(self,data=>{self.next_wait=false;if(!self.destroyed)(self.loadedPages||(self.loadedPages=[])).push(data.results);resolve('loaded');},()=>{self.next_wait=false;resolve('rejected');}));
}
function viewer(f,initial){
  f.api.detailsSession();
  const def={name:'fixture-more',uk:'Fixture',en:'Fixture',fullUrls:()=>[],urls:()=>[],opts:{},combine:groups=>groups.reduce((all,g)=>all.concat(g.cards),[])};
  f.api.__test.setCatalogRow(def,initial);
  f.api.__test.registerView();
  const component=f.components.trakt_plus_view({row:def.name,page:1});
  return {component,def};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('More builds the first native Category page from cached cards without waiting for catalog requests',async()=>{
  const f=fixture(),all=cards(140),v=viewer(f,{cards:all,nextChunk:3,exhausted:true,title:'Fixture'});let requests=0;
  f.api.__test.setFullPagerLoader(()=>{requests++;return Promise.resolve({cards:[],raw:0,errs:0});});
  const self=v.component;self.hooks.onCreate.call(self);await tick();
  assert.equal(self.built.results.length,24);assert.deepEqual(Array.from(self.built.results,x=>x.id),Array.from({length:24},(_,i)=>i));
  assert.equal(self.built.page,1);assert.equal(self.built.total_pages,2);assert.equal(requests,0);
});

test('native Category receives bounded, unique pages and an honest final-page count',async()=>{
  const f=fixture(),all=cards(61);all.splice(30,0,all[0]);
  const v=viewer(f,{cards:all,nextChunk:3,exhausted:true,title:'Fixture'}),self=v.component;
  self.hooks.onCreate.call(self);await tick();
  const ids=Array.from(self.built.results,x=>x.id);assert.equal(ids.length,24);
  const pages=[];
  while(self.total_pages>=self.object.page+1){
    let data;
    await new Promise(resolve=>self.hooks.onNext.call(self,value=>{data=value;resolve();},()=>resolve()));
    if(!data)break;
    assert(data.results.length<=24);pages.push(Array.from(data.results));self.object.page=data.page;
  }
  const joined=ids.concat(...pages).map(id=>typeof id==='object'?id.id:id);
  assert.deepEqual(joined,Array.from({length:61},(_,i)=>i));
  assert.equal(new Set(joined).size,joined.length);
  assert.equal(self.total_pages,3);
  assert.match(f.notifications.at(-1).text,/All available results/);
  const count=f.notifications.length;assert.equal(await nativeCategoryScrollEnd(self),'idle');assert.equal(f.notifications.length,count);
});

test('sparse cached catalog is shown immediately and ends without fake next pages',async()=>{
  const f=fixture(),v=viewer(f,{cards:cards(5),nextChunk:2,exhausted:true,title:'Sparse'}),self=v.component;
  let calls=0;f.api.__test.setFullPagerLoader(()=>{calls++;return Promise.resolve({cards:[],raw:0,errs:0});});
  self.hooks.onCreate.call(self);await tick();
  assert.equal(self.built.results.length,5);assert.equal(self.built.total_pages,1);assert.equal(calls,0);
  assert.match(f.notifications[0].text,/All available results/);
  assert.equal(await nativeCategoryScrollEnd(self),'idle');
});

test('uncached empty viewer fetches only until the first bounded page is available',async()=>{
  const f=fixture(),v=viewer(f,{cards:[],nextChunk:2,exhausted:false,title:'Fixture'}),self=v.component;
  let calls=0;f.api.__test.setFullPagerLoader((def,chunk)=>{calls++;return Promise.resolve({cards:cards(24,(chunk-2)*24),raw:24,errs:0,moreSources:true});});
  self.hooks.onCreate.call(self);await tick();await tick();
  assert.equal(self.built.results.length,24);assert.equal(calls,1);assert.equal(self.built.total_pages,2);
});

test('failed page keeps its source cursor and a later user retry can load it',async()=>{
  const f=fixture(),v=viewer(f,{cards:cards(24),nextChunk:7,exhausted:false,title:'Fixture'}),self=v.component;
  let calls=0;f.api.__test.setFullPagerLoader((def,chunk)=>{calls++;assert.equal(chunk,7);return calls===1?Promise.reject(Object.assign(Error('rate limited'),{status:429,headers:{'retry-after':'30'}})):Promise.resolve({cards:cards(24,100),raw:24,errs:0,moreSources:true});});
  self.hooks.onCreate.call(self);await tick();
  const next=()=>new Promise(resolve=>{let data,failed=false;self.hooks.onNext.call(self,value=>{data=value;resolve({data,failed});},()=>{failed=true;resolve({data,failed});});});
  const first=await next();assert.equal(first.failed,true);assert.equal(calls,1);
  assert.match(f.notifications[0].text,/rate-limited/i);
  const retry=await next();assert.equal(retry.failed,false);assert.equal(retry.data.results.length,24);assert.equal(calls,2);
});

test('native Category scroll-end rejection exposes another reachable scroll-end retry without an automatic loop on 429',async()=>{
  const f=fixture(),v=viewer(f,{cards:cards(24),nextChunk:7,exhausted:false,title:'Fixture'}),self=v.component;
  let calls=0;f.api.__test.setFullPagerLoader((def,chunk)=>{calls++;assert.equal(chunk,7);return calls===1?Promise.reject(Object.assign(Error('rate limited'),{status:429,headers:{'retry-after':'30'}})):Promise.resolve({cards:cards(24,100),raw:24,errs:0,moreSources:true});});
  self.hooks.onCreate.call(self);await tick();
  assert.equal(await nativeCategoryScrollEnd(self),'rejected');
  assert.equal(calls,1);assert.equal(self.next_wait,false);assert.equal(self.object.page,1);assert.equal(self.total_pages,2);
  assert.match(f.notifications.at(-1).text,/rate-limited/i);
  assert.equal(await nativeCategoryScrollEnd(self),'loaded');
  assert.equal(calls,2);assert.equal(self.object.page,2);assert.equal(self.loadedPages[0].length,24);
});

test('a page resolving after Trakt credential or profile changes is discarded',async(t)=>{
  for(const change of ['credential','profile']){
    await t.test(change,async()=>{
      const f=fixture(),v=viewer(f,{cards:cards(24),nextChunk:8,exhausted:false,title:'Fixture'}),self=v.component;
      let finish,calls=0;f.api.__test.setFullPagerLoader(()=>{calls++;return new Promise(resolve=>{finish=resolve;});});
      self.hooks.onCreate.call(self);await tick();
      const pending=nativeCategoryScrollEnd(self);await tick();assert.equal(calls,1);
      if(change==='credential')f.setCredential('new-test-account-token');else f.setProfile('other-test-profile');
      finish({cards:cards(24,500),raw:24,errs:0,moreSources:true});
      assert.equal(await pending,'rejected');
      assert.equal(self.loadedPages,undefined);assert.equal(self.object.page,1);assert.equal(self.emptied,true);
      assert.match(f.notifications.at(-1).text,/profile changed/i);
    });
  }
});

test('initial More response is discarded when the profile changes while getRow is pending',async()=>{
  const f=fixture(),pendingResult={cards:cards(12,700),raw:12,errs:0},v=viewer(f,undefined),self=v.component;
  let finish;f.api.__test.setFullPagerLoader(()=>new Promise(resolve=>{finish=resolve;}));
  self.hooks.onCreate.call(self);await tick();
  f.setProfile('changed-before-first-build');finish(pendingResult);await tick();await tick();
  assert.equal(self.built,undefined);assert.equal(self.emptied,true);
  assert.match(f.notifications.at(-1).text,/profile changed/i);
});

test('catalog queue does not automatically retry a Trakt 429 response',async()=>{
  let calls=0;const f=fixture({transport:()=>{calls++;return Promise.reject(Object.assign(Error('rate limited'),{status:429,headers:{'retry-after':'30'}}));}});
  await f.api.__test.whenApi();
  await assert.rejects(f.api.__test.catalogRequest('/movies/popular?page=8',true),/rate limited/);
  assert.equal(calls,1);assert.equal(f.requests.length,1);
  await assert.rejects(f.api.__test.catalogRequest('/movies/popular?page=8',true),/rate limited/);
  assert.equal(calls,1,'Retry-After cooldown must suppress manual retries until the server window expires');
});

test('More keeps the registered row identity and opens the existing native component',()=>{
  const f=fixture(),def={name:'TraktPlusTrend_movies',fullUk:'Фільми Trakt',fullEn:'Trakt movies'};
  f.api.__test.openMore(def,'preview title');
  assert.deepEqual(f.activityPushes,[{url:'',title:'Trakt movies',component:'trakt_plus_view',row:'TraktPlusTrend_movies',page:1}]);
  assert.equal(f.requests.length,0);
});

test('an initial catalog error shows a retry message without fabricating an empty success',async()=>{
  const f=fixture(),v=viewer(f,{cards:[],nextChunk:2,exhausted:false,title:'Fixture'}),self=v.component;
  f.api.__test.setFullPagerLoader(()=>Promise.reject(Object.assign(Error('temporarily unavailable'),{status:429,headers:{'retry-after':'30'}})));
  self.hooks.onCreate.call(self);await tick();await tick();
  assert.equal(self.emptied,true);assert.equal(self.built,undefined);
  assert.match(f.notifications[0].text,/rate-limited/i);
});
