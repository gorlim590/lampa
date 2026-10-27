'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../loader.js','utf8');

function fixture(options={}){
 const scripts=[],timers=new Map(),storageReads=[],logs=[],listeners=[];let timerId=0,appendCount=0,followCount=0,removeCount=0;
 const stored=options.storedList;
 const parent={appendChild(script){scripts.push(script);script.parentNode=parent;const response=(options.responses||[])[appendCount++]||'pending';if(response==='throw')throw Error('fixture script insertion failure');if(response==='ok')script.onload();else if(response==='error')script.onerror();},removeChild(script){script.parentNode=null;}};
 const Lampa=makeLampa();
 function makeLampa(){return{Storage:{get:key=>{storageReads.push(key);return stored;}},Listener:options.noListener?null:{follow:(name,fn)=>{followCount++;listeners.push({name,fn});},remove:(name,fn)=>{removeCount++;const i=listeners.findIndex(row=>row.name===name&&row.fn===fn);if(i>=0)listeners.splice(i,1);}}};}
 const window={appready:options.appready===true,Lampa:options.lateLampa?undefined:Lampa,console:{log:message=>logs.push(message)},LAMPA_PLUGINS_BASE:'https://fixture.invalid/plugins/',LAMPA_PLUGINS_VERSION:'fixture'};
 if(Object.prototype.hasOwnProperty.call(options,'list'))window.LAMPA_PLUGINS_LIST=options.list;
 const document={location:{href:'https://lampa.example/'},head:parent,documentElement:parent,createElement:tag=>({tagName:tag,async:true}),getElementsByTagName:()=>[parent]};
 const context={window,Lampa:options.lateLampa?undefined:Lampa,document,URL,setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),console:window.console};
 vm.createContext(context);vm.runInContext(source,context);
 function fireReady(){window.appready=true;const rows=listeners.filter(row=>row.name==='app');rows.forEach(row=>row.fn({type:'ready'}));}
 function resolve(index,result='ok'){const script=scripts[index];assert(script,'Missing synthetic script '+index);if(result==='ok')script.onload();else script.onerror();}
 function timeout(index){const timer=[...timers.entries()].find(([,row])=>row.ms===8000);assert(timer,'Missing bounded timeout');timer[1].fn();}
 function installLampa(){window.Lampa=Lampa;context.Lampa=Lampa;}
 function tickReadiness(){const timer=[...timers.entries()].find(([,row])=>row.ms===100);assert(timer,'Missing bounded readiness check');timers.delete(timer[0]);timer[1].fn();}
 function expireReadiness(){for(let i=0;i<310&&[...timers.values()].some(row=>row.ms===100);i++)tickReadiness();}
 return{window,Lampa,scripts,timers,storageReads,logs,listeners,fireReady,resolve,timeout,installLampa,tickReadiness,expireReadiness,get followCount(){return followCount;},get removeCount(){return removeCount;},runAgain:()=>vm.runInContext(source,context)};
}

test('Hybrid and essential presentation start before appready; optional modules wait for native readiness',()=>{
 const f=fixture({responses:['ok','ok','ok','pending','pending']});
 assert.deepEqual(f.scripts.map(x=>x.src),[
  'https://fixture.invalid/plugins/ui/stremio-hybrid.js?v=fixture',
  'https://fixture.invalid/plugins/ui/interface-plus.js?v=fixture',
  'https://fixture.invalid/plugins/ui/design-optimized.js?v=fixture'
 ]);
 assert.equal(f.storageReads.length,0,'the optional list and its storage key are not read before critical UI finishes');
 assert.equal(f.window.LampaLoaderDiagnostics.waitingForAppReady,true);
 f.fireReady();
 assert.deepEqual(f.scripts.slice(3).map(x=>new URL(x.src).pathname),['/plugins/trakt/trakt.js','/plugins/providers/torrent-search.js']);
 assert.equal(f.window.LampaLoaderDiagnostics.activeDeferredLanes,2,'bounded to a Trakt dependency lane and one independent lane');
 assert.equal(f.scripts.some(x=>x.src.includes('trakt-plus')),false,'Trakt+ waits for successful Trakt Core completion');
});

test('late Lampa API arrival is observed once and starts the full default plugin graph after native readiness',()=>{
 const f=fixture({lateLampa:true,responses:Array(9).fill('ok')});
 assert.equal(f.window.LampaLoaderDiagnostics.stage,'waiting-for-appready');
 assert.equal(f.scripts.length,3,'critical UI is delivered before native API availability');
 assert.equal(f.window.LampaLoaderDiagnostics.waitingForAppReady,true);
 f.installLampa();f.tickReadiness();
 assert.equal(f.followCount,1,'one native readiness listener is installed when the API arrives');
 f.fireReady();
 assert.deepEqual(f.scripts.map(x=>new URL(x.src).pathname),[
  '/plugins/ui/stremio-hybrid.js','/plugins/ui/interface-plus.js','/plugins/ui/design-optimized.js',
  '/plugins/trakt/trakt.js','/plugins/trakt/trakt-plus.js','/plugins/providers/torrent-search.js',
  '/plugins/media/average-rating.js','/plugins/ui/cardify-plus.js','/plugins/localization/translate.js'
 ]);
 assert.equal(f.window.LampaLoaderDiagnostics.stage,'complete');
 assert.equal(f.storageReads.filter(key=>key==='gl_loader_plugins').length,1);
 assert.equal(f.removeCount,1,'the one-shot native listener is removed after startup');
 f.fireReady();
 assert.equal(f.scripts.length,9,'a repeated ready event cannot start a second sequence');
});

test('missing native API reaches an explicit bounded timeout without silently claiming deferred success',()=>{
 const f=fixture({lateLampa:true,responses:['ok','ok','ok']});
 assert.equal(f.window.LampaLoaderDiagnostics.stage,'waiting-for-appready');
 f.expireReadiness();
 assert.equal(f.window.LampaLoaderDiagnostics.readinessChecks,300);
 assert.equal(f.window.LampaLoaderDiagnostics.readinessFailure,'lampa-readiness-timeout');
 assert.equal(f.window.LampaLoaderDiagnostics.stage,'deferred-unavailable');
 assert.equal(f.window.LampaLoaderDiagnostics.deferredStartedAt,null);
 assert.equal(f.timers.size,0,'timeout cancels the bounded readiness timer');
 assert.equal(f.scripts.length,3,'no optional plugin is loaded against a missing native API');
 assert.equal(f.logs.filter(line=>line.includes('readiness')&&line.includes('timeout')).length,1);
});

test('Trakt+ is skipped when Trakt Core fails while independent deferred providers continue',()=>{
 const f=fixture({responses:['ok','ok','ok','error','ok','ok','ok','ok','ok']});
 f.fireReady();
 assert.equal(f.scripts.some(x=>x.src.includes('trakt-plus')),false);
 assert.equal(f.scripts.some(x=>x.src.includes('torrent-search')),true);
 assert.equal(f.scripts.some(x=>x.src.includes('cardify-plus')),true);
 assert.equal(f.window.LampaLoaderDiagnostics.failed,1);
 assert.equal(f.window.LampaLoaderDiagnostics.stage,'complete');
});

test('Trakt+ starts only after Trakt Core succeeds and both deferred lanes remain independent',()=>{
 const f=fixture({responses:['ok','ok','ok','ok','pending','pending']});f.fireReady();
 assert.equal(new URL(f.scripts[3].src).pathname,'/plugins/trakt/trakt.js');
 assert.equal(new URL(f.scripts[4].src).pathname,'/plugins/trakt/trakt-plus.js');
 assert.equal(new URL(f.scripts[5].src).pathname,'/plugins/providers/torrent-search.js');
 assert.equal(f.window.LampaLoaderDiagnostics.activeDeferredLanes,2);
});

test('timeout advances once; a late load is counted without loading a dependent twice',()=>{
 const f=fixture({responses:['ok','ok','ok','pending','pending']});f.fireReady();
 const before=f.scripts.length;assert.equal(before,5);
 f.timeout(3);
 assert.equal(f.scripts.some(x=>x.src.includes('trakt-plus')),false);
 assert.equal(f.window.LampaLoaderDiagnostics.timedOut,1);
 f.resolve(3,'ok');
 assert.equal(f.window.LampaLoaderDiagnostics.lateLoads,1);
 assert.equal(f.scripts.filter(x=>x.src.includes('trakt/trakt.js')).length,1);
 assert.equal(f.scripts.some(x=>x.src.includes('trakt-plus')),false);
});

test('a late optional delivery error removes its failed script node without advancing twice',()=>{
 const f=fixture({responses:['ok','ok','ok','pending','pending']});f.fireReady();f.timeout(3);const failed=f.scripts[3];
 f.resolve(3,'error');
 assert.equal(failed.parentNode,null);
 assert.equal(f.window.LampaLoaderDiagnostics.lateLoads,1);
 assert.equal(f.window.LampaLoaderDiagnostics.requested,5);
});

test('custom list preserves its order, deduplicates critical/duplicate URLs and keeps private query text out of logs',()=>{
 const f=fixture({appready:true,responses:Array(8).fill('ok'),list:['ui/stremio-hybrid.js','custom.js','custom.js','https://third.example/provider.js?token=synthetic-secret']});
 const urls=f.scripts.map(x=>x.src);
 assert.equal(urls.filter(x=>x.includes('stremio-hybrid.js')).length,1);
 assert.equal(urls.filter(x=>x.includes('custom.js')).length,1);
 assert(urls.some(x=>x==='https://third.example/provider.js?token=synthetic-secret'));
 assert.equal(f.storageReads.length,0,'explicit list avoids reading plugin-list Storage');
 assert.equal(f.logs.join('|').includes('synthetic-secret'),false,'diagnostics never log configured URLs');
});

test('an explicit empty custom list keeps only the critical UI entry',()=>{
 const f=fixture({appready:true,responses:['ok','ok','ok'],list:[]});
 assert.equal(f.scripts.length,3);
 assert.equal(f.window.LampaLoaderDiagnostics.stage,'complete');
});

test('duplicate loader evaluation does not add another stylesheet-owner request sequence',()=>{
 const f=fixture({responses:['ok','ok','ok']});f.runAgain();
 assert.equal(f.scripts.length,3);
 assert.equal(f.window.LampaLoaderDiagnostics.requested,3);
});

test('native API without a Listener remains bounded and reports readiness failure',()=>{
 const f=fixture({appready:false,responses:['ok','ok','ok'],noListener:true});
 assert.equal(f.window.LampaLoaderDiagnostics.stage,'waiting-for-appready');
 f.expireReadiness();
 assert.equal(f.window.LampaLoaderDiagnostics.readinessFailure,'lampa-readiness-timeout');
 assert.equal(f.timers.size,0);
});
