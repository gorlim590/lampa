'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {fixture}=require('./helpers/trakt-watched-fixture.cjs');

const cards=(count,offset=0)=>Array.from({length:count},(_,i)=>({method:'movie',id:offset+i,title:'Title '+(offset+i)}));
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
  let rejected=false;self.hooks.onNext.call(self,()=>{},()=>{rejected=true;});assert.equal(rejected,true);
});

test('sparse cached catalog is shown immediately and ends without fake next pages',async()=>{
  const f=fixture(),v=viewer(f,{cards:cards(5),nextChunk:2,exhausted:true,title:'Sparse'}),self=v.component;
  let calls=0;f.api.__test.setFullPagerLoader(()=>{calls++;return Promise.resolve({cards:[],raw:0,errs:0});});
  self.hooks.onCreate.call(self);await tick();
  assert.equal(self.built.results.length,5);assert.equal(self.built.total_pages,1);assert.equal(calls,0);
  let rejected=false;self.hooks.onNext.call(self,()=>{},()=>{rejected=true;});assert.equal(rejected,true);assert.match(f.notifications[0].text,/reached the end/);
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
  assert.match(f.notifications[0].text,/Could not load the next page/);
  const retry=await next();assert.equal(retry.failed,false);assert.equal(retry.data.results.length,24);assert.equal(calls,2);
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
  assert.match(f.notifications[0].text,/Could not load the catalog/);
});

