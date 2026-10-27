"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../audit/ui/header-runtime.js','utf8');
const SHA='a7ecc18a2757b582aa50be46a60634cf3a6305ea';
function fixture(revision=SHA,started=false){
 const nodes=[],keys={},frames=[],timers=[],calls=[],added=[];
 const document={baseURI:'https://siaivo.isroot.in/',currentScript:{src:'https://cdn.jsdelivr.net/gh/gorlim590/lampa@fixture/audit/ui/header-runtime.js?ui='+revision},body:{classList:{contains:()=>false}},createElement:()=>({}),documentElement:{appendChild:n=>nodes.push(n)},head:{appendChild:n=>nodes.push(n)},querySelectorAll:()=>[],addEventListener:(n,fn)=>keys[n]=fn,removeEventListener:n=>delete keys[n]};
 const originalPut=function(...args){calls.push({self:this,args});return 'native-return';};
 const originalAdd=function(row){added.push(row);return row;};
 const originalCall=function(screen,params,callbacks){callbacks.push(params);return 42;};
 class XHR{constructor(){this.events={};this.status=200;}addEventListener(n,fn){this.events[n]=fn;}removeEventListener(n,fn){if(this.events[n]===fn)delete this.events[n];}open(...args){this.args=args;return 'native-open';}}
 let promise;const originalFetch=function(){return promise=Promise.resolve({status:503,body:'PRIVATE_BODY'});};
 const L={Utils:{putScriptAsync:originalPut},ContentRows:{add:originalAdd,call:originalCall},Storage:{get:()=>{throw Error('Audit must not read settings')}}};
 const nativeOpen=XHR.prototype.open;const window={Lampa:L,LampaLoaderStarted:started,XMLHttpRequest:XHR,fetch:originalFetch};
 const c={window,Lampa:L,document,URL,performance:{now:()=>123},requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},cancelAnimationFrame:()=>{},setTimeout:(fn,ms)=>{timers.push({fn,ms});return 1;},clearTimeout:()=>{}};
 vm.runInNewContext(source,c);
 const report=()=>JSON.parse(nodes.find(n=>n.id==='lampa-header-runtime').textContent),flush=()=>{while(frames.length)frames.shift()();};
 return{L,window,document,nodes,keys,timers,calls,added,originalPut,originalAdd,originalCall,originalFetch,originalOpen:nativeOpen,report,flush,fetchPromise:()=>promise};
}
test('UI-only audit keeps every service URL, callback result, argument and order; only Interface is redirected',()=>{
 const f=fixture(),ui='https://gorlim590.github.io/lampa/ui/interface-plus.js?v=existing',service='https://gorlim590.github.io/lampa/trakt/trakt-plus.js?v=existing',extra={keep:true},ctx={};let done,fail,success;
 assert.equal(f.L.Utils.putScriptAsync.call(ctx,[service,ui],x=>done=x,x=>fail=x,x=>success=x,extra),'native-return');const call=f.calls[0];assert.equal(call.self,ctx);assert.equal(call.args[0][0],service);assert.equal(call.args[0][1],'https://cdn.jsdelivr.net/gh/gorlim590/lampa@'+SHA+'/ui/interface-plus.js');assert.equal(call.args[4],extra);call.args[3](service);call.args[1]('ok');call.args[2]('failure');assert.equal(done,'ok');assert.equal(fail,'failure');assert.equal(success,service);f.flush();assert.equal(f.report().scripts[0].module,'trakt-plus');assert.equal(f.report().scripts[0].family,'pages');assert(f.report().scripts.some(x=>x.state==='loaded'));assert.equal(f.nodes.find(n=>n.src)?.src,'https://gorlim590.github.io/lampa/loader.js');const unchanged=[service];f.L.Utils.putScriptAsync(unchanged);assert.equal(f.calls.at(-1).args[0],unchanged);
});
test('Registration observation passes original row/params/callback identities and returns through unchanged',()=>{
 const f=fixture(),row={privateName:'PRIVATE_ROW'},params={id:'PRIVATE_ID'},callbacks=[];assert.equal(f.L.ContentRows.add(row),row);assert.equal(f.added[0],row);assert.equal(f.L.ContentRows.call('main',params,callbacks),42);assert.equal(callbacks[0],params);f.flush();assert.equal(f.report().rows.registrations,1);assert.equal(f.report().rows.mainCalls,1);assert.equal(f.report().rows.callbacks[0].after,1);assert(!JSON.stringify(f.report()).includes('PRIVATE'));
});
test('XHR/fetch audit exports only aggregate status; expiry releases hooks without aborting requests',async()=>{
 const f=fixture(),XHR=f.window.XMLHttpRequest,wrappedOpen=XHR.prototype.open,x=new XHR();assert.equal(x.open('GET','https://api.themoviedb.org/3/movie/PRIVATE_ID?api_key=PRIVATE_TOKEN'),'native-open');x.events.loadend();const returned=f.window.fetch('https://api.trakt.tv/users/PRIVATE_ACCOUNT/lists');assert.equal(returned,f.fetchPromise());await returned;f.flush();assert.equal(f.report().network.tmdb['200'],1);assert.equal(f.report().network.trakt['503'],1);assert(!JSON.stringify(f.report()).includes('PRIVATE'));
 const pending=new XHR();pending.open('GET','https://api.trakt.tv/shows/trending');assert.equal(f.timers[0].ms,60000);f.timers[0].fn();assert.equal(pending.events.loadend,undefined);assert.equal(Object.keys(f.keys).length,0);assert.equal(f.L.Utils.putScriptAsync,f.originalPut);assert.equal(f.L.ContentRows.add,f.originalAdd);assert.equal(f.L.ContentRows.call,f.originalCall);assert.equal(f.window.fetch,f.originalFetch);assert.notEqual(XHR.prototype.open,wrappedOpen);assert.equal(XHR.prototype.open,f.originalOpen);assert.equal(f.report().stopped,true);
});
test('Invalid revision is inert and no audit can start a second native loader',()=>{
 const f=fixture('invalid');assert.equal(f.nodes.length,0);assert.equal(f.L.Utils.putScriptAsync,f.originalPut);const started=fixture(SHA,true);assert.equal(started.nodes.length,0);assert.equal(started.L.Utils.putScriptAsync,started.originalPut);
});
