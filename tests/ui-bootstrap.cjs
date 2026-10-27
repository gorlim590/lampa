'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../ui/stremio-hybrid.js','utf8');
function fixture(value=true,full=false,primaryValue=false){
 const nodes=[],classes=new Set(),events={},native=[],params=[],writes=[],frames=new Map(),counts={setup:0,remove:0,avatar:0};let clock=0;
 const doc={readyState:'complete',currentScript:{src:'https://example.org/ui/stremio-hybrid.js?private=fixture'},
  body:{classList:{contains:n=>classes.has(n),toggle:(n,on)=>on?classes.add(n):classes.delete(n)}},
  head:{appendChild:n=>{nodes.push(n);n.isConnected=true;}},getElementById:id=>nodes.find(n=>n.id===id)||null,
  createElement:tag=>({tag,attrs:{},setAttribute(k,v){this.attrs[k]=v;},remove(){this.isConnected=false;const i=nodes.indexOf(this);if(i>=0)nodes.splice(i,1);}}),
  addEventListener:(name,fn)=>events[name]=fn,removeEventListener:name=>delete events[name]};
 const L={Storage:{get:key=>key==='stremio_hybrid_enabled'?value:key==='stremio_hybrid_primary_settings'?primaryValue:false,set:(key,v)=>{writes.push([key,v]);if(key==='stremio_hybrid_enabled')value=v;else if(key==='stremio_hybrid_primary_settings')primaryValue=v;}},
  SettingsApi:{getParam:()=>params,addParam:p=>params.push(p)},Listener:{follow:(name,fn)=>native.push(fn),remove:(name,fn)=>{const i=native.indexOf(fn);if(i>=0)native.splice(i,1);}}};
 const c={URL,document:doc,Lampa:L,window:{appready:false,Lampa:L,performance:{now:()=>++clock}},$:()=>{},UI_VERSION:'fixture-v1',css:'fixture-css',style:null,ready:false,destroyed:false,waiting:false,watching:false,shellFrame:0,requestAnimationFrame:fn=>{const id=frames.size+1;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),
  bootStats:{scriptStartMs:0,shellAppliedMs:null,firstShellFrameMs:null,readyMs:null,initCount:0,styleInsertions:0,shellTransitions:0,settingsLoads:0,settingsMounts:0,settingsUnmounts:0,settingsFailures:0},settingsHub:null,settingsScript:null,settingsLoading:false,settingsAttempted:false,settingsFailedApi:null,
  overlayScriptURL:doc.currentScript.src,setupUI:()=>{counts.setup++;c.watching=true;},removeUI:()=>{counts.remove++;c.watching=false;},updateAvatar:()=>counts.avatar++,onHeaderUtilitiesSetting:()=>{},removeHeaderUtilitiesSetting:()=>{},openHeaderUtilities:()=>{},backdropResume:null,movieBrands:[],movieEnglish:[],paletteCache:[]};
 vm.createContext(c);
 if(full)vm.runInContext(source,c);
 else{
  const start=source.indexOf('    function enabled()'),end=source.indexOf('    window.StremioHybrid = {');
  vm.runInContext(source.slice(start,end),c);vm.runInContext(source.slice(end,source.lastIndexOf('})();')),c);
 }
 return {c,doc,L,nodes,classes,events,native,params,writes,counts,frames,ready(){c.window.appready=true;const cb=native[0];assert(cb);cb({type:'ready'});return cb;}};
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

test('Transient Settings load failure retries only on explicit disable/reenable, not refresh',()=>{
 const f=fixture();f.ready();f.nodes.find(n=>n.tag==='script').onerror();for(let i=0;i<5;i++)f.c.window.StremioHybrid.refresh();assert.equal(f.c.bootStats.settingsLoads,1);assert.equal(f.c.bootStats.settingsFailures,1);
 f.c.window.StremioHybrid.setEnabled(false);f.c.window.StremioHybrid.setEnabled(true);assert.equal(f.c.bootStats.settingsLoads,2);let installed=0;f.c.window.LampaSettingsHub={contractVersion:1,install:()=>{installed++;return true;},destroy:()=>{}};f.nodes.find(n=>n.tag==='script').onload();assert.equal(installed,1);assert.equal(f.c.bootStats.styleInsertions,2);
});
test('A throwing Settings destroy cannot strand the shell or prevent final owner teardown',()=>{
 const f=fixture();f.c.window.LampaSettingsHub={contractVersion:1,install:()=>true,destroy:()=>{throw Error('Fixture cleanup failure');}};f.ready();assert.doesNotThrow(()=>f.c.window.StremioHybrid.destroy());assert.equal(f.c.bootStats.settingsUnmounts,1);assert.equal(f.c.bootStats.settingsFailures,1);assert.equal(f.counts.remove,1);assert(!f.classes.has('stremio-hybrid'));assert.equal(f.c.window.StremioHybrid,undefined);assert.equal(f.writes.length,0);
});
