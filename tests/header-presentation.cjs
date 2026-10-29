"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const read=p=>fs.readFileSync(__dirname+'/../'+p,'utf8');
const hybrid=read('ui/stremio-hybrid.js'),iface=read('ui/interface-plus.js');
const legacy=iface.slice(iface.indexOf('    // Standalone fallback for one delegated'),iface.indexOf('    var IFX_TITLE_SIZE_DEFAULT'));
function fixture(){
 const nodes=[],classes=new Set(),frames=new Map();let clock=0;
 const document={body:{classList:{contains:n=>classes.has(n),toggle:(n,on)=>on?classes.add(n):classes.delete(n)}},getElementById:id=>nodes.find(n=>n.id===id)||null,createElement:()=>({setAttribute(){},remove(){const i=nodes.indexOf(this);if(i>=0)nodes.splice(i,1);this.isConnected=false;}}),head:{appendChild:n=>{nodes.push(n);n.isConnected=true;}}};
 const c={document,window:{},destroyed:false,style:null,styleStore:{order:[],modules:{}},styleModuleRevision:0,styleContentCache:{valid:false,active:null,destroyed:null,revision:-1,value:''},setHybridThemeOwner:function(){},css:hybrid.slice(hybrid.indexOf('    var css = `')+15,hybrid.indexOf('`;',hybrid.indexOf('    var css = `'))),UI_VERSION:'fixture',shellFrame:0,uiNow:()=>++clock,bootStats:{styleInsertions:0,styleUpdates:0,styleCompositions:0,styleCacheHits:0,shellTransitions:0,shellAppliedMs:null,firstShellFrameMs:null,presentationFailures:0},requestAnimationFrame:fn=>{frames.set(1,fn);return 1;},cancelAnimationFrame:id=>frames.delete(id)};
 vm.createContext(c);vm.runInContext(hybrid.slice(hybrid.indexOf('    function renderOwnedStyles()'),hybrid.indexOf('    function mountSettings(')),c);
 return{c,nodes,classes,frames,legacy(){vm.runInContext(legacy,c)},canonical(){const owns=hybrid.split('\n').find(l=>l.trim().startsWith('ownsPresentation:'));vm.runInContext('window.StremioHybrid={presentationVersion:1,'+owns+'};',c)},styles:id=>nodes.filter(n=>n.id===id)};
}
test('Both load orders transfer the whole header to one canonical stylesheet',()=>{
 for(const order of ['interface-first','hybrid-first']){const f=fixture();if(order==='interface-first'){f.legacy();assert.equal(f.styles('ifx_header_css').length,1);f.canonical();f.c.applyShell(true);}else{f.canonical();f.c.applyShell(true);f.legacy();}
 assert.equal(f.styles('ifx_header_css').length,0,order);assert.equal(f.styles('stremio-hybrid-style').length,1);for(const region of ['theme','header','navigation','cards','details','overlays','settings'])assert.equal(f.c.window.StremioHybrid.ownsPresentation(region),true,region);assert.equal(f.c.window.StremioHybrid.ownsPresentation('player'),false);assert.equal(f.c.bootStats.presentationFailures,0);}
});
test('Off/on and same-state refresh preserve exact standalone CSS with no accumulating styles or frames',()=>{
 const f=fixture();f.canonical();f.c.applyShell(true);f.legacy();const canonical=f.styles('stremio-hybrid-style')[0];for(let i=0;i<8;i++)f.c.applyShell(true);assert.equal(f.styles('stremio-hybrid-style')[0],canonical);assert.equal(f.frames.size,1);assert.equal(f.c.bootStats.styleInsertions,1);
 for(let i=0;i<3;i++){f.c.applyShell(false);assert.equal(f.nodes.length,1);const old=f.styles('ifx_header_css')[0];assert.equal(crypto.createHash('sha256').update(old.textContent).digest('hex'),'8ab67c06fa65589f67a2a9cf00a9074b67e3acb33324d91039bf7ef752f420e5');assert.match(old.textContent,/body:not\(\.stremio-hybrid\) \.head/);f.c.applyShell(false);assert.equal(f.styles('ifx_header_css')[0],old);assert.equal(f.frames.size,0);f.c.applyShell(true);assert.equal(f.nodes.length,1);assert.equal(f.styles('ifx_header_css').length,0);}
 f.c.applyShell(false);f.c.destroyed=true;assert.equal(f.c.window.StremioHybrid.ownsPresentation('header'),false);f.c.applyShell(true);assert.equal(f.styles('ifx_header_css').length,1);
});
test('Absent/old/incompatible or failing canonical owner leaves Interface standalone header available',()=>{
 for(const owner of [null,{version:'legacy'},{presentationVersion:99,ownsPresentation:()=>true},{presentationVersion:1,ownsPresentation:()=>{throw Error('Fixture optional owner unavailable')}}]){const f=fixture();f.c.window.StremioHybrid=owner;assert.doesNotThrow(()=>f.legacy());assert.equal(f.styles('ifx_header_css').length,1);}
});
test('Delegation removes only the adapter-owned fallback, never a foreign style with the same id',()=>{
 const f=fixture(),foreign={id:'ifx_header_css',textContent:'foreign'};f.nodes.push(foreign);f.legacy();f.canonical();f.c.applyShell(true);assert(f.nodes.includes(foreign));f.c.applyShell(false);assert.equal(f.styles('ifx_header_css').length,1);
});
test('A failed optional adapter cannot prevent the canonical shell; incompatible contracts are ignored',()=>{
 const f=fixture();f.canonical();f.c.window.InterfacePlusPresentation={contractVersion:1,syncHeader:()=>{throw Error('Fixture adapter failure')}};assert.doesNotThrow(()=>f.c.applyShell(true));assert(f.classes.has('stremio-hybrid'));assert.equal(f.c.bootStats.presentationFailures,1);f.c.window.InterfacePlusPresentation.contractVersion=99;f.c.applyShell(true);assert.equal(f.c.bootStats.presentationFailures,1);
});
test('Canonical header contains transferred parity rules and adapter never creates clocks/handlers or accesses values',()=>{
 assert(hybrid.includes('flex-shrink:0;align-items:center;-webkit-align-items:center'));
 assert(hybrid.includes('.head .head__time > div:last-child{text-align:left}'));
 assert(hybrid.includes('font-feature-settings:"tnum"'));
 assert(!/Storage|setInterval|setTimeout|MutationObserver|addEventListener|Listener|\.on\(/.test(legacy));
});
test('Hybrid is the declared active owner for both header and left navigation with one rail color token',()=>{
 const f=fixture();f.canonical();f.c.applyShell(true);
 assert(f.c.css.includes('--sh-rail:#090a12'));
 assert.equal((f.c.css.match(/\.wrap__left\s*\{[^}]*background:/g)||[]).length,1,'sidebar background is declared once in the canonical shell');
 assert(!f.c.css.includes('wrap__left{background:#090a12!important}'),'no later hard-coded sidebar override');
 f.c.applyShell(false);assert.equal(f.c.window.StremioHybrid.ownsPresentation('navigation'),false);
});
