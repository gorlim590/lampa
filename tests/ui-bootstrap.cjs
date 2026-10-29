'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../ui/stremio-hybrid.js','utf8');
function fixture(value=true,full=false,primaryValue=false){
 const nodes=[],classes=new Set(),events={},native=[],params=[],writes=[],frames=new Map(),timers=new Map(),counts={setup:0,remove:0,avatar:0};let clock=0,timerId=0;
 const doc={readyState:'complete',currentScript:{src:'https://example.org/ui/stremio-hybrid.js?private=fixture'},
  body:{classList:{contains:n=>classes.has(n),toggle:(n,on)=>on?classes.add(n):classes.delete(n)}},
  head:{appendChild:n=>{nodes.push(n);n.isConnected=true;n.parentNode=doc.head;}},getElementById:id=>nodes.find(n=>n.id===id)||null,
  createElement:tag=>({tag,attrs:{},textContent:'',setAttribute(k,v){this.attrs[k]=v;},remove(){this.isConnected=false;const i=nodes.indexOf(this);if(i>=0)nodes.splice(i,1);this.parentNode=null;}}),
  addEventListener:(name,fn)=>events[name]=fn,removeEventListener:name=>delete events[name]};
 const L={Storage:{get:key=>key==='stremio_hybrid_enabled'?value:key==='stremio_hybrid_primary_settings'?primaryValue:false,set:(key,v)=>{writes.push([key,v]);if(key==='stremio_hybrid_enabled')value=v;else if(key==='stremio_hybrid_primary_settings')primaryValue=v;}},
  SettingsApi:{getParam:()=>params,addParam:p=>params.push(p)},Listener:{follow:(name,fn)=>native.push(fn),remove:(name,fn)=>{const i=native.indexOf(fn);if(i>=0)native.splice(i,1);}}};
 const c={URL,document:doc,Lampa:L,window:{appready:false,Lampa:L,performance:{now:()=>++clock}},$:()=>{},setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),nativeWaitTimer:0,nativeWaitAttempts:0,NATIVE_WAIT_MS:100,NATIVE_WAIT_MAX:300,UI_VERSION:'fixture-v1',css:'fixture-css',style:null,styleStore:{order:[],modules:{}},styleIdsByOwner:{'ydesign-cards':'ydesign-style-block','ydesign-font':'ydesign-font-css','cardify-plus':'cardify-plus-styles'},styleModuleRevision:0,styleContentCache:{valid:false,active:null,destroyed:null,revision:-1,value:''},ready:false,destroyed:false,waiting:false,watching:false,shellFrame:0,requestAnimationFrame:fn=>{const id=frames.size+1;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),
  bootStats:{scriptStartMs:0,shellAppliedMs:null,firstShellFrameMs:null,readyMs:null,initCount:0,styleInsertions:0,styleUpdates:0,styleCompositions:0,styleCacheHits:0,shellTransitions:0,settingsLoads:0,settingsMounts:0,settingsUnmounts:0,settingsFailures:0},settingsHub:null,settingsScript:null,settingsLoading:false,settingsAttempted:false,settingsFailedApi:null,
  overlayScriptURL:doc.currentScript.src,setupUI:()=>{counts.setup++;c.watching=true;},removeUI:()=>{counts.remove++;c.watching=false;},updateAvatar:()=>counts.avatar++,onHeaderUtilitiesSetting:()=>{},removeHeaderUtilitiesSetting:()=>{},openHeaderUtilities:()=>{},backdropResume:null,movieBrands:[],movieEnglish:[],paletteCache:[]};
 vm.createContext(c);
 if(full)vm.runInContext(source,c);
 else{
  const ownerStart=source.indexOf('    function renderOwnedStyles()'),ownerEnd=source.indexOf('    function mountSettings()',ownerStart);
  const start=source.indexOf('    function enabled()'),end=source.lastIndexOf('})();');
  vm.runInContext(source.slice(ownerStart,ownerEnd),c);
  vm.runInContext(source.slice(start,end),c);
 }
 return {c,doc,L,nodes,classes,events,native,params,writes,counts,frames,timers,ready(){c.window.appready=true;const cb=native[0];assert(cb);cb({type:'ready'});return cb;}};
}
test('Actual entrypoint paints static shell before appready without functional controller or metadata APIs',()=>{
 const f=fixture(true,true);assert(f.classes.has('stremio-hybrid'));assert.equal(f.nodes.length,1);assert.equal(f.nodes[0].id,'stremio-hybrid-style');assert(f.nodes[0].textContent.includes('settings-hub-active'));assert.equal(f.params.length,0);assert.equal(f.writes.length,0);assert.equal(f.native.length,1);assert.equal(f.c.window.StremioHybrid.diagnostics().initCount,0);
 vm.runInContext(source,f.c);assert.equal(f.nodes.length,1);assert.equal(f.native.length,1);
 f.c.window.StremioHybrid.destroy();assert.equal(f.nodes.length,0);assert.equal(f.native.length,0);assert.equal(f.writes.length,0);assert(!f.classes.has('stremio-hybrid'));
});
test('Disabled saved preference is respected before first paint; loading never changes it',()=>{
 for(const value of [false,'false',0,'0']){const f=fixture(value,true);assert.equal(f.nodes.length,0);assert(!f.classes.has('stremio-hybrid'));assert.equal(f.writes.length,0);}
});
test('App ready and repeated refresh initialize functional UI once and do not replace its static stylesheet',()=>{
 const f=fixture(),style=f.nodes[0],cb=f.ready();cb({type:'ready'});for(let i=0;i<4;i++)f.c.window.StremioHybrid.refresh();
 assert.equal(f.counts.setup,1);assert.equal(f.c.bootStats.initCount,1);assert.equal(f.c.bootStats.styleInsertions,1);assert.equal(f.nodes[0],style);assert.equal(f.native.length,0);assert.equal(f.params.length,4);assert.equal(f.params.some(p=>p.param.name==='stremio_hybrid_primary_settings'&&p.param.default===false),true);assert.equal(f.params.some(p=>p.param.name==='sh_torrent_mode'),false);assert.equal(f.writes.length,0);
 assert.equal(f.c.bootStats.settingsLoads,1);assert.equal(f.nodes.filter(n=>n.tag==='script').length,1);assert(!f.nodes[1].src.includes('private'));assert.equal(new URL(f.nodes[1].src).search,'?v=fixture-v1');
});
test('Canonical UI explicitly owns Settings mount/unmount; destroy preserves saved values',()=>{
 const f=fixture();let installs=0,destroys=0;f.c.window.LampaSettingsHub={contractVersion:1,install:()=>{installs++;return true;},destroy:()=>destroys++};f.ready();f.c.window.StremioHybrid.refresh();assert.equal(installs,1);
 f.c.window.StremioHybrid.setEnabled(false);assert.equal(destroys,1);assert.equal(f.counts.remove,1);
 f.c.window.StremioHybrid.setEnabled(true);assert.equal(installs,2);assert.equal(f.counts.setup,2);
 const before=f.writes.length;f.c.window.StremioHybrid.destroy();assert.equal(f.writes.length,before);assert.equal(destroys,2);assert.equal(f.c.window.StremioHybrid,undefined);assert.equal(f.nodes.filter(n=>n.tag==='style').length,0);
});
test('Late module completion after disable cannot install hidden Settings; reenable reuses the loaded inert module',()=>{
 const f=fixture();f.ready();const script=f.nodes.find(n=>n.tag==='script');let installs=0;f.c.window.StremioHybrid.setEnabled(false);
 f.c.window.LampaSettingsHub={contractVersion:1,install:()=>{installs++;return true;},destroy:()=>{}};script.onload();assert.equal(installs,0);
 f.c.window.StremioHybrid.setEnabled(true);assert.equal(installs,1);assert.equal(f.c.bootStats.settingsLoads,1);
});
test('Failed/unsupported Settings module preserves native fallback and never creates a request retry loop',()=>{
 const f=fixture();f.ready();f.nodes.find(n=>n.tag==='script').onerror();for(let i=0;i<4;i++)f.c.window.StremioHybrid.refresh();assert.equal(f.c.bootStats.settingsLoads,1);assert.equal(f.c.bootStats.settingsMounts,0);assert.equal(f.params.length,4);assert.equal(f.writes.length,0);
 f.c.window.LampaSettingsHub={contractVersion:99,install:()=>{throw Error('Unsupported API must not mount');}};f.c.window.StremioHybrid.refresh();assert.equal(f.c.bootStats.settingsMounts,0);
});
test('Destroy cancels pending callbacks; a late response cannot remount a destroyed visual owner',()=>{
 const f=fixture();f.ready();const script=f.nodes.find(n=>n.tag==='script');f.c.window.StremioHybrid.destroy();assert.equal(script.onload,null);assert.equal(script.onerror,null);assert(!script.isConnected);assert.equal(f.writes.length,0);
});
test('A throwing optional Settings adapter cannot prevent the shell/native fallback from staying usable',()=>{
 const f=fixture();let cleanup=0;f.c.window.LampaSettingsHub={contractVersion:1,install:()=>{throw Error('Fixture capability unavailable');},destroy:()=>cleanup++};assert.doesNotThrow(()=>f.ready());for(let i=0;i<3;i++)f.c.window.StremioHybrid.refresh();assert.equal(cleanup,1);assert.equal(f.c.bootStats.settingsFailures,1);assert.equal(f.c.bootStats.settingsMounts,0);assert(f.classes.has('stremio-hybrid'));assert.equal(f.params.length,4);assert.equal(f.writes.length,0);
});
test('Startup timing is retained for a late probe, uses one frame and cancels it on early teardown',()=>{
 const f=fixture();assert.equal(f.frames.size,1);const [id,frame]=f.frames.entries().next().value;f.frames.delete(id);frame();f.ready();const metrics=f.c.window.StremioHybrid.diagnostics();assert(metrics.shellAppliedMs<metrics.firstShellFrameMs);assert(metrics.firstShellFrameMs<metrics.readyMs);f.c.window.StremioHybrid.refresh();assert.equal(f.frames.size,0);
 const early=fixture(true,true);assert.equal(early.frames.size,1);early.c.window.StremioHybrid.destroy();assert.equal(early.frames.size,0);
});

test('Repeated Hybrid readiness passes reuse the composed stylesheet and invalidate only on style or theme changes',()=>{
 const f=fixture(true,true),api=f.c.window.StremioHybrid;
 const before=api.diagnostics();
 for(let i=0;i<12;i++){const next=[...f.timers.entries()].find(([,timer])=>timer.ms===100);if(!next)break;f.timers.delete(next[0]);next[1].fn();}
 const stable=api.diagnostics();assert.equal(stable.styleCompositions,before.styleCompositions,'readiness/apply calls do not rebuild unchanged adapter CSS');assert.equal(stable.styleCacheHits,before.styleCacheHits+12);
 api.registerStyles('fixture-adapter','.fixture{display:block}');const registered=api.diagnostics();assert.equal(registered.styleCompositions,2);assert.equal(registered.styleUpdates,2);
 api.registerStyles('fixture-adapter','.fixture{display:block}');assert.equal(api.diagnostics().styleCompositions,2,'duplicate registration does not invalidate the cache');
 api.setEnabled(false);assert.equal(api.diagnostics().styleCompositions,3);assert.doesNotMatch(f.nodes.find(n=>n.id==='stremio-hybrid-style').textContent,/canonical shell/);assert.match(f.nodes.find(n=>n.id==='stremio-hybrid-style').textContent,/\.fixture/);
 api.setEnabled(true);assert.equal(api.diagnostics().styleCompositions,4);assert.match(f.nodes.find(n=>n.id==='stremio-hybrid-style').textContent,/\.fixture/);
});

test('Transient Settings load failure retries only on explicit disable/reenable, not refresh',()=>{
 const f=fixture();f.ready();f.nodes.find(n=>n.tag==='script').onerror();for(let i=0;i<5;i++)f.c.window.StremioHybrid.refresh();assert.equal(f.c.bootStats.settingsLoads,1);assert.equal(f.c.bootStats.settingsFailures,1);
 f.c.window.StremioHybrid.setEnabled(false);f.c.window.StremioHybrid.setEnabled(true);assert.equal(f.c.bootStats.settingsLoads,2);let installed=0;f.c.window.LampaSettingsHub={contractVersion:1,install:()=>{installed++;return true;},destroy:()=>{}};f.nodes.find(n=>n.tag==='script').onload();assert.equal(installed,1);assert.equal(f.c.bootStats.styleInsertions,2);
});
test('A throwing Settings destroy cannot strand the shell or prevent final owner teardown',()=>{
 const f=fixture();f.c.window.LampaSettingsHub={contractVersion:1,install:()=>true,destroy:()=>{throw Error('Fixture cleanup failure');}};f.ready();assert.doesNotThrow(()=>f.c.window.StremioHybrid.destroy());assert.equal(f.c.bootStats.settingsUnmounts,1);assert.equal(f.c.bootStats.settingsFailures,1);assert.equal(f.counts.remove,1);assert(!f.classes.has('stremio-hybrid'));assert.equal(f.c.window.StremioHybrid,undefined);assert.equal(f.writes.length,0);
});

test('Full Hybrid lifecycle transfers adapter styles across off, destroy, and restart without stale registry entries',()=>{
 const f=fixture(true,true),api=f.c.window.StremioHybrid;
 api.registerStyles('ydesign-cards','.ydesign-card{display:grid}');
 api.registerStyles('ydesign-font','@font-face{font-family:fixture}');
 api.registerStyles('cardify-plus','.cardify{display:flex}');
 const canonical=f.nodes.find(n=>n.id==='stremio-hybrid-style');
 assert(canonical);assert.equal(f.nodes.filter(n=>n.id==='stremio-hybrid-style').length,1);
 api.setEnabled(false);
 assert.equal(f.nodes.find(n=>n.id==='stremio-hybrid-style'),canonical,'Hybrid off keeps one registry stylesheet for standalone adapters');
 api.registerStyles('ydesign-cards','.ydesign-card{display:block}');
 assert.match(canonical.textContent,/display:block/);assert.doesNotMatch(canonical.textContent,/display:grid/);
 api.setEnabled(true);assert.equal(f.nodes.filter(n=>n.id==='stremio-hybrid-style').length,1);
 assert.equal(api.unregisterStyles('ydesign-font'),true);assert.equal(api.unregisterStyles('ydesign-font'),false);
 api.registerStyles('ydesign-font','@font-face{font-family:fixture-new}');
 api.destroy();
 assert.equal(f.nodes.some(n=>n.id==='stremio-hybrid-style'),false,'destroy removes its canonical style node');
 assert.equal(f.c.window.__StremioHybridStyleStore,undefined,'destroy releases the global module store');
 assert.deepEqual(f.nodes.filter(n=>n.tag==='style').map(n=>n.id).sort(),['cardify-plus-styles','ydesign-font-css','ydesign-style-block']);
 assert(f.nodes.find(n=>n.id==='ydesign-style-block').textContent.includes('display:block'));
 assert(f.nodes.find(n=>n.id==='ydesign-font-css').textContent.includes('fixture-new'));
 vm.runInContext(source,f.c);
 assert.equal(f.c.window.StremioHybrid.version,'3.1.0-single-presentation-owner');
 assert.equal(f.nodes.filter(n=>n.id==='stremio-hybrid-style').length,1,'restart adopts all standalone style nodes into one owner');
 assert.equal(f.nodes.filter(n=>['ydesign-style-block','ydesign-font-css','cardify-plus-styles'].includes(n.id)).length,0);
 assert.deepEqual(Array.from(f.c.window.StremioHybrid.diagnostics().registeredStyleOwners),['ydesign-cards','ydesign-font','cardify-plus']);
 assert.equal(f.native.length,1,'restart owns one native readiness subscription');
});

test('Full Hybrid version migration discards unknown stale modules and adopts only current adapters',()=>{
 const f=fixture(true,true);
 delete f.c.window.StremioHybrid;
 f.c.window.__StremioHybridStyleStore={version:'3.0.0-obsolete',order:['stale-plugin','ydesign-cards'],modules:{'stale-plugin':'.obsolete-plugin{color:red}','ydesign-cards':'.ydesign-card{display:block}'}};
 const old=f.doc.createElement('style');old.id='stremio-hybrid-style';old.textContent='.old-hybrid{color:red}';f.doc.head.appendChild(old);
 vm.runInContext(source,f.c);
 const canonical=f.nodes.find(n=>n.id==='stremio-hybrid-style');
 assert(canonical);assert.match(canonical.textContent,/ydesign-card/);assert.doesNotMatch(canonical.textContent,/obsolete-plugin|old-hybrid/);
 assert.deepEqual(Array.from(f.c.window.StremioHybrid.diagnostics().registeredStyleOwners),['ydesign-cards']);
 assert.equal(f.nodes.filter(n=>n.id==='stremio-hybrid-style').length,1);
});
