'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../ui/torrent-cinema.js','utf8');
function fixture(){
    const hubs=[],params=[],components=[],values={},frames=new Map();let sequence=0;
    function hub(){const listeners=new Map();const result={follow(event,fn){const set=listeners.get(event)||new Set();set.add(fn);listeners.set(event,set);},remove(event,fn){listeners.get(event)?.delete(fn);},emit(event,data){[...(listeners.get(event)||[])].forEach(fn=>fn(data));},count(){return [...listeners.values()].reduce((n,s)=>n+s.size,0);}};hubs.push(result);return result;}
    const Lampa={Listener:hub(),Activity:{all:()=>[],active:()=>null,push(){},replace(){}},Component:{},Controller:{listener:hub()},Modal:{listener:hub()},Select:{listener:hub()},Storage:{get:(key,fallback)=>Object.hasOwn(values,key)?values[key]:fallback,listener:hub()},Account:{listener:hub()},Search:{listener:hub()},PlayerVideo:{listener:hub()},SettingsApi:{addComponent:item=>components.push(item),addParam:item=>params.push(item)}};
    const context={Lampa,appready:true,console,Date,Set,WeakMap,URL,setTimeout,clearTimeout,requestAnimationFrame:fn=>{frames.set(++sequence,fn);return sequence;},cancelAnimationFrame:id=>frames.delete(id),document:{getElementById:()=>null,querySelectorAll:()=>[]}};context.window=context;vm.createContext(context);vm.runInContext(source,context);
    return {context,api:context.LampaTorrentCinema,values,params,components,frames,hubs,count:()=>hubs.reduce((n,h)=>n+h.count(),0)};
}
test('direct entry and repeated load share exactly one owner, settings registry and listener graph',()=>{
    const f=fixture(),owner=f.api,count=f.count(),settings=f.params.length;
    assert.equal(owner,f.context.TorrentsRedesign);assert.equal(owner,f.context.LampaTorrentOverlay);
    assert.equal(owner.diagnostics().running,true);assert.equal(f.components.length,1);
    for(let i=0;i<10;i++){vm.runInContext(source,f.context);owner.install();}
    assert.equal(f.context.LampaTorrentCinema,owner);assert.equal(f.count(),count);assert.equal(f.params.length,settings);assert.equal(f.frames.size,1);
    assert.equal(f.params.filter(p=>p.param.name==='torrents_cinema_enabled').length,1);
});
test('disable releases runtime listeners and scheduled work; reenable does not accumulate resources',()=>{
    const f=fixture(),initial=f.count();
    for(let i=0;i<20;i++){f.api.setEnabled(false);assert.equal(f.api.diagnostics().running,false);assert.equal(f.count(),1,'only the reversible enable-setting listener remains');assert.equal(f.frames.size,0);f.api.setEnabled(true);assert.equal(f.count(),initial);assert.equal(f.frames.size,1);}
    f.api.destroy();assert.equal(f.count(),0);assert.equal(f.frames.size,0);f.api.destroy();assert.equal(f.count(),0);f.api.install();assert.equal(f.count(),initial);assert.equal(f.components.length,1);
});
test('existing persisted enable key controls native fallback and recovers through the same settings handler',()=>{
    const f=fixture(),enabled=f.params.find(p=>p.param.name==='torrents_cinema_enabled');
    f.values.torrents_cinema_enabled=false;enabled.onChange();assert.equal(f.api.diagnostics().running,false);
    f.values.torrents_cinema_enabled=true;enabled.onChange();assert.equal(f.api.diagnostics().running,true);
    assert.equal(f.values.torrents_cinema_enabled,true);assert(!f.params.some(p=>/theme|color|watchlist|intensity|darkness/.test(p.param.name)),'obsolete standalone controls are retired, stored values are untouched');
});
test('both legacy URLs only request the canonical entry and deduplicate a pending request, including inline host delivery',()=>{
    for(const src of ['', 'blob:https://siaivo.isroot.in/fixture','https://gorlim590.github.io/lampa/torrents-redesign.js?v=117']){
        const scripts=[];const context={window:{},URL,document:{currentScript:{src},querySelector:()=>scripts[0]||null,createElement:()=>({setAttribute(){},remove(){scripts.splice(0);}}),head:{appendChild:n=>scripts.push(n)}}};vm.createContext(context);
        for(const file of ['torrents-redesign.js','ui/torrent-overlay.js','torrents-redesign.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+file,'utf8'),context);
        assert.equal(scripts.length,1);assert.match(scripts[0].src,/\/ui\/torrent-cinema\.js(?:\?|$)/);scripts[0].onerror();assert.equal(scripts.length,0);
    }
});

test('published artifact is reproducibly built from the modular sources',()=>{require('node:child_process').execFileSync(process.execPath,['scripts/build-torrent-cinema.mjs','--check'],{cwd:__dirname+'/..',stdio:'pipe'});});
