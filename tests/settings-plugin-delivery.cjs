'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../loader.js','utf8');
function fixture(options={}){
 const requests=[],timers=new Map(),storageReads=[],logs=[];let timerId=0;
 const stored=options.storedList;
 const Lampa={Storage:{get:key=>{storageReads.push(key);return stored;}},Utils:{putScriptAsync:(urls,ok,fail)=>{const url=urls[0];requests.push(url);const response=options.responses?.[requests.length-1]||'ok';if(response==='throw')throw Error('synthetic failed delivery');if(response==='ok')ok();else if(response==='error')fail();else if(response==='late')requests.lastCallback={ok,fail};}},Listener:{follow(){}}};
 const consoleMock={log:message=>logs.push(message)},window={appready:true,Lampa,console:consoleMock,location:{search:''},LAMPA_PLUGINS_BASE:'https://fixture.invalid/plugins/',LAMPA_PLUGINS_VERSION:'fixture'};if(options.list)window.LAMPA_PLUGINS_LIST=options.list;
 const context={window,Lampa,URL,setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),console:consoleMock};
 vm.createContext(context);vm.runInContext(source,context);return{requests,timers,storageReads,logs,completeLate(){requests.lastCallback?.ok();requests.lastCallback?.fail();}};
}
test('failed and throwing plugin delivery advances the configured sequence exactly once without settings mutation',()=>{
 const f=fixture({list:['first.js','missing.js','last.js'],responses:['ok','error','ok']});
 // The explicit configured list is authoritative; the fixture invokes loader code through its public startup path.
 assert.deepEqual(f.requests,['https://fixture.invalid/plugins/first.js?v=fixture','https://fixture.invalid/plugins/missing.js?v=fixture','https://fixture.invalid/plugins/last.js?v=fixture']);
 assert.equal(f.storageReads.length,0);assert.equal(f.timers.size,0);assert.equal(f.logs.filter(line=>line.includes('FAIL')&&line.includes('missing.js')).length,1);
 const thrown=fixture({list:['throwing.js','next.js'],responses:['throw','ok']});assert.deepEqual(thrown.requests,['https://fixture.invalid/plugins/throwing.js?v=fixture','https://fixture.invalid/plugins/next.js?v=fixture']);assert.equal(thrown.logs.filter(line=>line.includes('FAIL')&&line.includes('throwing.js')).length,1);
});
test('stored plugin list parsing, timeout and late callbacks stay bounded and cannot double-advance',()=>{
 const f=fixture({storedList:' first.js, external.js ',responses:['late','ok']});
 assert.equal(f.storageReads.length,1);assert.equal(f.storageReads[0],'gl_loader_plugins');
 assert.equal(f.requests.length,1);assert(f.timers.size===1,'one in-flight delivery has one bounded timeout');
 const timer=f.timers.values().next().value;timer.fn();assert.equal(f.requests.length,2,'a timeout continues to the next configured entry');
 f.completeLate();assert.equal(f.requests.length,2,'late success/error callbacks cannot advance twice');assert.equal(f.timers.size,0,'completed sequence leaves no timeout behind');
});
