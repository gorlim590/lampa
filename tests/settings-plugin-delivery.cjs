'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../loader.js','utf8');
const critical=['ui/stremio-hybrid.js','ui/interface-plus.js','ui/design-optimized.js','trakt/trakt.js','trakt/trakt-plus.js','plugins-to-enable/home-policy.js','plugins-to-enable/home-history.js'];

function fixture(options={}){
 const scripts=[],timers=new Map(),storageReads=[],logs=[],listeners=[];let timerId=0,appendCount=0,followCount=0,removeCount=0;
 const stored=options.storedList;
 const parent={appendChild(script){scripts.push(script);script.parentNode=parent;const response=(options.responses||[])[appendCount++]||'pending';if(response==='throw')throw Error('fixture script insertion failure');if(response==='ok')script.onload();else if(response==='error')script.onerror();},removeChild(script){script.parentNode=null;}};
 const Lampa={Storage:{get:key=>{storageReads.push(key);return stored;}},Listener:options.noListener?null:{follow:(name,fn)=>{followCount++;listeners.push({name,fn});},remove:(name,fn)=>{removeCount++;const i=listeners.findIndex(row=>row.name===name&&row.fn===fn);if(i>=0)listeners.splice(i,1);}}};
 const window={appready:options.appready===true,Lampa:options.lateLampa?undefined:Lampa,console:{log:message=>logs.push(message)},LAMPA_PLUGINS_BASE:'https://fixture.invalid/plugins/',LAMPA_PLUGINS_VERSION:'fixture'};
 if(Object.prototype.hasOwnProperty.call(options,'list'))window.LAMPA_PLUGINS_LIST=options.list;
 const document={location:{href:'https://lampa.example/'},head:parent,documentElement:parent,createElement:tag=>({tagName:tag,async:true}),getElementsByTagName:()=>[parent]};
 const context={window,Lampa:options.lateLampa?undefined:Lampa,document,URL,setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),console:window.console};
 vm.createContext(context);vm.runInContext(source,context);
 function fireReady(){window.appready=true;listeners.filter(row=>row.name==='app').forEach(row=>row.fn({type:'ready'}));}
 function resolve(index,result='ok'){const script=scripts[index];assert(script,'Missing synthetic script '+index);if(result==='ok')script.onload();else script.onerror();}
 function timeout(){const timer=[...timers.entries()].find(([,row])=>row.ms===8000);assert(timer,'Missing bounded timeout');timer[1].fn();}
 function installLampa(){window.Lampa=Lampa;context.Lampa=Lampa;}
 function tickReadiness(){const timer=[...timers.entries()].find(([,row])=>row.ms===100);assert(timer,'Missing bounded readiness check');timers.delete(timer[0]);timer[1].fn();}
 function expireReadiness(){for(let i=0;i<310&&[...timers.values()].some(row=>row.ms===100);i++)tickReadiness();}
 return{window,Lampa,scripts,timers,storageReads,logs,listeners,fireReady,resolve,timeout,installLampa,tickReadiness,expireReadiness,get followCount(){return followCount;},get removeCount(){return removeCount;},runAgain:()=>vm.runInContext(source,context)};
}
const paths=f=>f.scripts.map(s=>new URL(s.src).pathname.replace(/^\/plugins\//,''));

test('Hybrid, Trakt and both Home modules are ordered startup-critical before appready',()=>{
 const f=fixture({responses:Array(7).fill('ok')});
 assert.deepEqual(paths(f).slice(0,7),critical);assert.equal(f.scripts.length,7);
 assert.equal(f.storageReads.length,0,'custom optional list is not read before critical modules finish');
 assert.equal(f.window.LampaLoaderDiagnostics.waitingForAppReady,true);
 f.fireReady();assert.deepEqual(paths(f).slice(7),['ui/full-cast.js']);f.resolve(7);
 assert.deepEqual(paths(f).slice(7),['ui/full-cast.js','providers/torrent-search.js']);
 assert.equal(f.window.LampaLoaderDiagnostics.activeDeferredLanes,2);
});

test('late Lampa API arrival installs one readiness listener then loads optional graph once',()=>{
 const f=fixture({lateLampa:true,responses:Array(12).fill('ok')});
 assert.equal(f.scripts.length,7);assert.equal(f.window.LampaLoaderDiagnostics.stage,'waiting-for-appready');
 f.installLampa();f.tickReadiness();assert.equal(f.followCount,1);f.fireReady();
 assert.deepEqual(paths(f),critical.concat(['ui/full-cast.js','providers/torrent-search.js','media/average-rating.js','ui/cardify-plus.js','localization/translate.js']));
 assert.equal(f.window.LampaLoaderDiagnostics.stage,'complete');assert.equal(f.storageReads.filter(x=>x==='gl_loader_plugins').length,1);assert.equal(f.removeCount,1);
 f.fireReady();assert.equal(f.scripts.length,12);
});

test('missing native API reaches explicit bounded timeout without starting optional plugins',()=>{
 const f=fixture({lateLampa:true,responses:Array(7).fill('ok')});f.expireReadiness();
 assert.equal(f.window.LampaLoaderDiagnostics.readinessChecks,300);assert.equal(f.window.LampaLoaderDiagnostics.readinessFailure,'lampa-readiness-timeout');
 assert.equal(f.window.LampaLoaderDiagnostics.stage,'deferred-unavailable');assert.equal(f.window.LampaLoaderDiagnostics.deferredStartedAt,null);assert.equal(f.scripts.length,7);
});

test('Trakt and Home scripts remain startup-critical even when one critical script errors',()=>{
 const f=fixture({responses:['ok','ok','ok','error','ok','ok','ok']});
 assert.deepEqual(paths(f).slice(0,7),critical);assert.equal(f.window.LampaLoaderDiagnostics.failed,1);
 f.fireReady();assert(paths(f).includes('ui/full-cast.js'));f.resolve(7);assert(paths(f).includes('providers/torrent-search.js'));
});

test('critical script timeout is bounded and late completion is recorded once',()=>{
 const f=fixture({responses:['ok','ok','ok','pending','ok','ok','ok']});assert.equal(f.scripts.length,7);f.timeout();
 assert.equal(f.window.LampaLoaderDiagnostics.timedOut,1);f.resolve(3,'ok');assert.equal(f.window.LampaLoaderDiagnostics.lateLoads,1);
 assert.equal(paths(f).filter(x=>x==='trakt/trakt.js').length,1);
});

test('custom list preserves optional order, deduplicates critical and duplicate URLs and redacts query text',()=>{
 const f=fixture({appready:true,responses:Array(10).fill('ok'),list:['ui/stremio-hybrid.js','custom.js','custom.js','https://third.example/provider.js?token=synthetic-secret']});
 assert.equal(f.scripts.filter(x=>x.src.includes('stremio-hybrid.js')).length,1);assert.equal(f.scripts.filter(x=>x.src.includes('custom.js')).length,1);
 assert(f.scripts.some(x=>x.src==='https://third.example/provider.js?token=synthetic-secret'));assert.equal(f.storageReads.length,0);assert(!f.logs.join('|').includes('synthetic-secret'));
});

test('explicit empty custom list keeps critical Home and built-in full-cast only',()=>{
 const f=fixture({appready:true,responses:Array(8).fill('ok'),list:[]});assert.equal(f.scripts.length,8);assert.deepEqual(paths(f).slice(0,7),critical);assert.equal(paths(f)[7],'ui/full-cast.js');assert.equal(f.window.LampaLoaderDiagnostics.stage,'complete');
});

test('duplicate loader evaluation does not add a second critical request sequence',()=>{
 const f=fixture({responses:Array(7).fill('ok')});f.runAgain();assert.equal(f.scripts.length,7);assert.equal(f.window.LampaLoaderDiagnostics.requested,7);
});

test('native API without Listener remains bounded and reports readiness failure',()=>{
 const f=fixture({appready:false,noListener:true,responses:Array(7).fill('ok')});assert.equal(f.window.LampaLoaderDiagnostics.stage,'waiting-for-appready');f.expireReadiness();assert.equal(f.window.LampaLoaderDiagnostics.readinessFailure,'lampa-readiness-timeout');assert.equal(f.timers.size,0);
});

test('legacy torrent URLs normalize to one canonical optional request without duplicates',()=>{
 const f=fixture({appready:true,list:['torrents-redesign.js','ui/torrent-overlay.js','ui/torrent-cinema.js'],responses:Array(9).fill('ok')});
 assert.equal(f.scripts.length,9);assert.deepEqual(paths(f).slice(0,7),critical);assert.equal(paths(f)[7],'ui/full-cast.js');assert.equal(f.scripts[8].src,'https://fixture.invalid/plugins/ui/torrent-cinema.js?v=fixture');
 assert.equal(f.scripts.filter(s=>/torrent-cinema/.test(s.src)).length,1);assert(!f.scripts.some(s=>/torrents-redesign|torrent-overlay/.test(s.src)));
});
