'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/../ui/screensaver-plus.js','utf8');
function fixture(initial={}){
 const values={ssp_folder:'https://a.example/videos/',ssp_urls:'',language:'uk',...initial},writes=[],requests=[];let now=1000000;
 class XHR{open(method,url){this.url=url}send(){requests.push(this)}reply(text,status=200){this.status=status;this.responseText=text;this.onload()}fail(){this.onerror()}expire(){this.ontimeout()}}
 const c={Lampa:{Storage:{field:k=>values[k],get:(k,d)=>k in values?values[k]:d,set:(k,v)=>{values[k]=v;writes.push({key:k,value:v})}}},XMLHttpRequest:XHR,Date:{now:()=>now},Promise,console};vm.createContext(c);
 const start=source.indexOf('  var VIDEO_RE'),end=source.indexOf('  // ───────────── ПОГОДА');assert(start>=0&&end>start);vm.runInContext(source.slice(start,end),c);
 const reset=source.match(/    function reset\(\) \{[^\n]+/)[0];vm.runInContext(reset,c);
 vm.runInContext('this.api={load:loadSources,warm:warmSources,reset:reset,state:function(){return {sources:sources.slice(),via:sourcesVia,error:sourcesErr}}};',c);
 return{values,writes,requests,api:c.api,tick:ms=>now+=ms};
}
const plain=x=>JSON.parse(JSON.stringify(x));
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve()};
test('concurrent reload/test/start shares one active directory request',async()=>{const f=fixture();const a=f.api.load(true),b=f.api.load(true);assert.equal(f.requests.length,1);f.requests[0].reply('["first.mp4"]');assert.deepEqual(plain(await a),plain(await b));});
test('same configuration reuses successful memory TTL and refreshes after expiry',async()=>{const f=fixture();let p=f.api.load();f.requests[0].reply('["first.mp4"]');await p;await f.api.load();assert.equal(f.requests.length,1);f.tick(600001);p=f.api.load();assert.equal(f.requests.length,2);f.requests[1].reply('["second.mp4"]');assert.deepEqual(plain(await p),['https://a.example/videos/second.mp4']);});
test('configuration identity prevents old successful playlist leaking into new folder',async()=>{const f=fixture();let p=f.api.load();f.requests[0].reply('["a.mp4"]');await p;f.values.ssp_folder='https://b.example/';p=f.api.load();assert.equal(f.requests.length,2);f.requests[1].reply('[]');assert.deepEqual(plain(await p),[]);});
test('late A directory response cannot overwrite B memory or persisted cache',async()=>{const f=fixture();const a=f.api.load(true);f.values.ssp_folder='https://b.example/';f.api.reset();const b=f.api.load(true);f.requests[1].reply('["b.mp4"]');await b;f.requests[0].reply('["a.mp4"]');assert.deepEqual(plain(await a),[]);assert.deepEqual(plain(f.api.state().sources),['https://b.example/b.mp4']);assert.equal(f.values.ssp_cache.k,'https://b.example/|');});
test('A to B to A reset rejects first generation even when configuration key matches',async()=>{const f=fixture();const old=f.api.load(true);f.values.ssp_folder='https://b.example/';f.api.reset();f.values.ssp_folder='https://a.example/videos/';f.api.reset();const fresh=f.api.load(true);f.requests[1].reply('["fresh.mp4"]');await fresh;f.requests[0].reply('["old.mp4"]');assert.deepEqual(plain(await old),[]);assert.match(f.api.state().sources[0],/fresh/);});
test('reset cancels pending commit and does not resurrect cleared cache',async()=>{const f=fixture();const p=f.api.load(true);f.api.reset();f.requests[0].reply('["old.mp4"]');assert.deepEqual(plain(await p),[]);assert.equal(f.values.ssp_cache,null);});
test('local unavailable listing falls through to loopback and retains manual HTTPS links',async()=>{const f=fixture({ssp_folder:'/storage/emulated/0/Download/mp4',ssp_urls:'https://cdn.example/manual.mp4'});const p=f.api.load(true);assert.equal(f.requests[0].timeout,4000);f.requests[0].expire();await flush();assert.equal(f.requests[1].url,'http://127.0.0.1:8000/');f.requests[1].reply('["one.mp4","one.mp4"]');assert.deepEqual(plain(await p),['http://127.0.0.1:8000/one.mp4','https://cdn.example/manual.mp4']);});
test('all local candidates fail: manual URLs remain usable without guessed fallback',async()=>{const f=fixture({ssp_folder:'/storage/emulated/0/Download/mp4',ssp_urls:'https://cdn.example/manual.mp4'});const p=f.api.load(true);f.requests[0].fail();await flush();f.requests[1].reply('unavailable',503);await flush();f.requests[2].expire();assert.deepEqual(plain(await p),['https://cdn.example/manual.mp4']);assert.equal(f.requests.length,3);});
test('restart warm cache rejects malformed list and foreign configuration',()=>{const f=fixture({ssp_cache:{k:'https://a.example/videos/|',l:'not-an-array'}});f.api.warm();assert.deepEqual(plain(f.api.state().sources),[]);f.values.ssp_cache={k:'https://other.example/|',l:['https://cdn.example/other.mp4']};f.api.warm();assert.deepEqual(plain(f.api.state().sources),[]);});
test('valid restarted cache warms without a request and refreshes on explicit reload',async()=>{const f=fixture({ssp_cache:{k:'https://a.example/videos/|',l:['https://cdn.example/old.mp4']}});f.api.warm();assert.equal(f.requests.length,0);assert.deepEqual(plain(f.api.state().sources),['https://cdn.example/old.mp4']);const p=f.api.load(true);f.requests[0].reply('["fresh.mp4"]');await p;assert.match(f.api.state().sources[0],/fresh/);});
test('cancelled local lookup does not probe more loopback candidates',async()=>{
 const f=fixture({ssp_folder:'/storage/emulated/0/Download/mp4'}),p=f.api.load(true);
 f.api.reset();f.requests[0].expire();assert.deepEqual(plain(await p),[]);assert.equal(f.requests.length,1);
});
test('failed refresh retains last valid list for the same source identity',async()=>{
 const f=fixture();let p=f.api.load();f.requests[0].reply('["good.mp4"]');await p;
 p=f.api.load(true);f.requests[1].reply('unavailable',503);
 assert.deepEqual(plain(await p),['https://a.example/videos/good.mp4']);
 assert.deepEqual(plain(f.values.ssp_cache.l),['https://a.example/videos/good.mp4']);
});
test('warm cache discards invalid entries without modifying persisted settings',()=>{
 const cached={k:'https://a.example/videos/|',l:[null,7,{},'javascript:bad','https://cdn.example/good.mp4']};
 const f=fixture({ssp_cache:cached});f.api.warm();
 assert.deepEqual(plain(f.api.state().sources),['https://cdn.example/good.mp4']);
 assert.equal(f.writes.length,0);assert.equal(f.values.ssp_cache,cached);
});
