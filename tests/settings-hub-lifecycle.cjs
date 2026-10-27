'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){
 delete require.cache[require.resolve('../ui/settings-hub.js')];const hub=require('../ui/settings-hub.js');
 const components={},params={},templates={},listeners={},styles=[],warnings=[],classes=new Set();let items=[],enabled={name:'settings',controller:{}},focused=null,destroyed=0,creates=0;
 const bodyNode={},rootNode={attrs:{},setAttribute(k,v){this.attrs[k]=v;}};
 function wrap(nodes){if(!Array.isArray(nodes))nodes=[nodes];const out={length:nodes.length,toArray:()=>nodes,detach:()=>out,remove:()=>out,
  find(selector){if(selector==='.settings__body')return wrap(bodyNode);if(selector==='.settings-folder[data-component]')return wrap([]);if(selector==='[data-name]'||selector==='.settings-param.selector')return wrap(items);if(selector==='.settings-param__name')return {text:()=>nodes[0]?.label||''};return wrap([]);},
  filter(fn){return wrap(nodes.filter(n=>fn.call(n)));},first(){return wrap(nodes.slice(0,1));},on(event,fn){nodes.forEach(n=>n.enter=fn);return out;},trigger(event){if(event==='hover:focus')nodes.forEach(n=>n.scrollFocused=true);else nodes[0]?.enter?.();return out;}};
 nodes.forEach((n,i)=>out[i]=n);return out;}
 const $=wrap,L={Template:{add:(name,html)=>templates[name]=html,get:name=>templates[name]||'<div></div>'},SettingsApi:{allParams:()=>params,allComponents:()=>components,addComponent:d=>{components[d.component]=d;templates['settings_'+d.component]='<div></div>';},addParam:d=>(params[d.component]||=[]).push(d),removeParams:id=>delete params[id],removeComponent:id=>{delete components[id];delete params[id];}},Settings:{main:()=>({render:()=>wrap({})}),render:()=>wrap(rootNode),listener:{follow:(event,fn)=>(listeners[event]||=[]).push(fn),remove:(event,fn)=>{listeners[event]=(listeners[event]||[]).filter(x=>x!==fn);}},
  create(name,options={}){creates++;let dead=false;items=(params[name]||[]).map(def=>{const item={label:def.field.name,key:def.param.name,getAttribute:k=>k==='data-name'?def.param.name:null};def.onRender?.(wrap(item));return item;});
   const controller={back(){assert(!dead,'native component destroyed twice');dead=true;destroyed++;items=[];if(options.onBack)options.onBack();else L.Controller.toggle('settings');}};
   // Mirrors native order: build controller, send open, then toggle component.
   enabled={name:'settings_component',controller};(listeners.open||[]).forEach(fn=>fn({name,body:wrap(bodyNode),params:options}));
  }},Controller:{enabled:()=>enabled,collectionFocus:node=>focused=node,toggle:name=>{enabled={name,controller:{}};}},Input:{edit(){}},Noty:{show:message=>warnings.push(message)},Storage:{get(){throw Error('Unexpected preference read');},set(){throw Error('Unexpected preference write');}}};
 const doc={body:{classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}},head:{appendChild:n=>styles.push(n)},createElement:()=>({})};
 return {hub,L,$,doc,params,listeners,styles,warnings,classes,rootNode,open:()=>L.Settings.create('settings_hub'),
  enter(key){const item=items.find(n=>n.key===key);assert(item,'Missing navigation row '+key);item.enter();},back:()=>enabled.controller.back(),items:()=>items,focus:()=>focused,stats:()=>({destroyed,creates})};
}
test('Hub delegates native owner Back once and restores the selected row/category without re-registering business handlers',()=>{
 const f=fixture();let business=0;f.params.ydesign=[{param:{name:'radius',type:'select'},field:{name:'Радіус'},onRender:()=>business++}];const original=f.params.ydesign;
 assert.equal(f.hub.install(f.L,f.$,f.doc),true);f.open();f.enter('hub_category_appearance');f.enter('hub_item_0');assert.equal(business,1);
 f.back();assert.equal(f.focus().key,'hub_item_0');assert(f.focus().scrollFocused);f.back();assert.equal(f.focus().key,'hub_category_appearance');
 assert.equal(f.params.ydesign,original);assert.equal(f.params.ydesign.length,1);assert.equal(business,1);assert.equal(f.stats().destroyed,4);
});
test('Paging bounds rendered links, discovers late registrations and does not duplicate listeners/styles on reopen',()=>{
 const f=fixture();f.params.ydesign=Array.from({length:65},(_,i)=>({param:{name:'setting_'+i,type:'select'},field:{name:'Параметр '+i}}));f.hub.install(f.L,f.$,f.doc);
 f.open();f.enter('hub_category_appearance');assert.equal(f.items().filter(x=>x.key.startsWith('hub_item_')).length,24);f.enter('hub_next');assert.equal(f.items().filter(x=>x.key.startsWith('hub_item_')).length,24);
 f.back();f.params.ydesign.push({param:{name:'late',type:'select'},field:{name:'Новий'}});f.enter('hub_category_appearance');f.enter('hub_next');f.enter('hub_next');assert.equal(f.items().filter(x=>x.key.startsWith('hub_item_')).length,18);
 assert.equal(f.hub.install(f.L,f.$,f.doc),false);assert.equal(f.styles.length,0);assert.equal(f.listeners.open.length,1);assert.equal(f.listeners.close.length,1);
 f.listeners.close[0]();assert.equal(f.hub.owns('ydesign'),false);assert(!f.classes.has('settings-hub-active'));
});
test('Unsafe credential owner is never opened from the index and native fallback remains available',()=>{
 const f=fixture();f.params.omdb_config_ui=[{param:{name:'omdb_api_key_set',type:'static'},field:{name:'Ключ'}}];f.hub.install(f.L,f.$,f.doc);f.open();f.enter('hub_problems');const before=f.stats().creates;f.enter('hub_item_0');assert.equal(f.stats().creates,before);assert.equal(f.warnings.length,1);
 f.back();f.enter('hub_native');assert.equal(f.L.Controller.enabled().name,'settings');assert(!f.classes.has('settings-hub-active'));
});
test('Hybrid cancels its queued rail and yields before creating a competing navigation controller',()=>{
 const source=fs.readFileSync(__dirname+'/../ui/stremio-hybrid.js','utf8'),calls=[];
 const c={settingsFrame:7,settingsCategory:'settings_hub',window:{LampaSettingsHub:{owns:name=>name==='settings_hub'}},cancelAnimationFrame:id=>calls.push(['cancel',id]),onSettingsClose:()=>calls.push('close'),requestAnimationFrame:()=>{throw Error('Competing rail scheduled');}};
 vm.runInNewContext(source.slice(source.indexOf('    function onSettingsOpen('),source.indexOf('    function onSettingsClose(')),c);c.onSettingsOpen({name:'settings_hub'});assert.deepEqual(calls,[['cancel',7],'close']);assert.equal(c.settingsCategory,'','Native fallback must not auto-reopen Hub');
});
test('Native Main restores its rail even before the Hub listener clears the previous active flag',()=>{
 const source=fs.readFileSync(__dirname+'/../ui/stremio-hybrid.js','utf8'),queued=[],calls=[];
 const c={settingsFrame:0,watching:true,settingsCategory:'',settingsParameter:null,window:{LampaSettingsHub:{owns:()=>true}},cancelAnimationFrame:()=>{},onSettingsClose:()=>{throw Error('Native Main must not yield to a stale Hub flag');},requestAnimationFrame:fn=>{queued.push(fn);return 1;},document:{body:{classList:{contains:()=>true}}},nativeSettingsFolders:()=>[{getAttribute:()=> 'interface'}],updateSettingsRail:()=>calls.push('rail'),chooseSettingsCategory:(...args)=>calls.push(args)};
 vm.runInNewContext(source.slice(source.indexOf('    function onSettingsOpen('),source.indexOf('    function onSettingsClose(')),c);c.onSettingsOpen({name:'main'});assert.equal(queued.length,1);c.window.LampaSettingsHub.owns=()=>false;queued[0]();assert.deepEqual(calls,['rail',['interface',true]]);
});
test('Audit harness never reloads themes and blocks incompatible active visual ownership',()=>{
 const source=fs.readFileSync(__dirname+'/../audit/settings/preview.js','utf8');
 for(const [enabled,legacy]of [[false,false],[true,false],[true,true]]){
  const loads=[],calls=[],L={Utils:{putScriptAsync:(urls,ok)=>{loads.push(urls[0]);ok();}},Noty:{show:()=>{}},Storage:{get(){throw Error('No preference access');},set(){throw Error('No preference writes');}}};
  const c={URL,Lampa:L,window:{appready:true,Lampa:L,StremioHybrid:{destroy:()=>calls.push('destroy')},LampaSettingsHub:{install:()=>calls.push('mount')}},document:{body:{classList:{contains:()=>legacy}},currentScript:{src:'https://cdn.jsdelivr.net/gh/gorlim590/lampa@fixture/audit/settings/preview.js?settings_preview='+(enabled?'1':'0')}}};
  vm.runInNewContext(source,c);vm.runInNewContext(source,c);
  assert(!calls.includes('destroy'));assert.equal(loads.length,enabled&&!legacy?1:0);if(loads.length){assert(loads[0].endsWith('@fixture/ui/settings-hub.js'));assert.deepEqual(calls,['mount']);}
 }
});
test('Single UI owner can unmount/remount functional Settings without retaining listeners, navigation params or changing foreign settings',()=>{
 const f=fixture(),foreign=[{param:{name:'radius',type:'select'},field:{name:'Радіус'}}];f.params.ydesign=foreign;
 for(let i=0;i<3;i++){
  assert.equal(f.hub.install(f.L,f.$,f.doc),true);f.open();f.enter('hub_category_appearance');
  f.hub.destroy();f.hub.destroy();assert.equal(f.listeners.open.length,0);assert.equal(f.listeners.close.length,0);assert.equal(f.params.settings_hub,undefined);assert.equal(f.params.settings_hub_page,undefined);assert.equal(f.params.ydesign,foreign);assert.equal(f.hub.owns('settings_hub'),false);assert.equal(f.L.Controller.enabled().name,'settings');assert.equal(f.styles.length,0);
 }
});
