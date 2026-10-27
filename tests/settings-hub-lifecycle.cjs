'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){
 delete require.cache[require.resolve('../ui/settings-hub.js')];const hub=require('../ui/settings-hub.js');
 const components={},params={},templates={},listeners={},styles=[],warnings=[],classes=new Set(),openedSettings=[];let items=[],nativeFolders=[],editRequest=null,enabled={name:'settings',controller:{}},focused=null,destroyed=0,creates=0;
 const bodyNode={},rootNode={attrs:{},setAttribute(k,v){this.attrs[k]=v;}};
 function wrap(nodes){if(!Array.isArray(nodes))nodes=[nodes];const out={length:nodes.length,toArray:()=>nodes,detach:()=>out,remove:()=>out,
  find(selector){if(selector==='.settings__body')return wrap(bodyNode);if(selector==='.settings-folder[data-component]')return wrap(nativeFolders);if(selector==='[data-name]'||selector==='.settings-param.selector')return wrap(items);if(selector==='.settings-param__name')return {text:()=>nodes[0]?.label||''};return wrap([]);},
  filter(fn){return wrap(nodes.filter(n=>fn.call(n)));},first(){return wrap(nodes.slice(0,1));},on(event,fn){nodes.forEach(n=>n.enter=fn);return out;},addClass(name){nodes.forEach(n=>(n.classes||(n.classes=[])).push(name));return out;},trigger(event){if(event==='hover:focus')nodes.forEach(n=>n.scrollFocused=true);else nodes[0]?.enter?.();return out;}};
 nodes.forEach((n,i)=>out[i]=n);return out;}
 const $=wrap,L={Template:{add:(name,html)=>templates[name]=html,get:name=>templates[name]||'<div></div>'},SettingsApi:{allParams:()=>params,allComponents:()=>components,addComponent:d=>{components[d.component]=d;templates['settings_'+d.component]='<div></div>';},addParam:d=>(params[d.component]||=[]).push(d),removeParams:id=>delete params[id],removeComponent:id=>{delete components[id];delete params[id];}},Settings:{main:()=>({render:()=>wrap({})}),render:()=>wrap(rootNode),listener:{follow:(event,fn)=>(listeners[event]||=[]).push(fn),remove:(event,fn)=>{listeners[event]=(listeners[event]||[]).filter(x=>x!==fn);}},
  create(name,options={}){creates++;openedSettings.push(name);let dead=false;items=(params[name]||[]).map(def=>{const item={label:def.field.name,description:def.field.description,key:def.param.name,classes:[],getAttribute:k=>k==='data-name'?def.param.name:null};def.onRender?.(wrap(item));return item;});
   const controller={back(){assert(!dead,'native component destroyed twice');dead=true;destroyed++;items=[];if(options.onBack)options.onBack();else L.Controller.toggle('settings');}};
   // Mirrors native order: build controller, send open, then toggle component.
   enabled={name:'settings_component',controller};(listeners.open||[]).forEach(fn=>fn({name,body:wrap(bodyNode),params:options}));
  }},Controller:{enabled:()=>enabled,collectionFocus:node=>focused=node,toggle:name=>{enabled={name,controller:{}};}},Input:{edit:(options,callback)=>editRequest={options,callback}},Noty:{show:message=>warnings.push(message)},Storage:{get(){throw Error('Unexpected preference read');},set(){throw Error('Unexpected preference write');}}};
 const doc={body:{classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)}},head:{appendChild:n=>styles.push(n)},createElement:()=>({})};
 function addFolder(id,options={}){const attrs={'data-component':id},hidden=new Set();if(options.marker!==undefined)attrs['data-settings-hub-consolidated']=options.marker;if(options.hidden)hidden.add('hidden');const node={style:{display:options.display||''},getAttribute:key=>Object.prototype.hasOwnProperty.call(attrs,key)?attrs[key]:null,setAttribute:(key,value)=>attrs[key]=value,removeAttribute:key=>delete attrs[key],classList:{contains:key=>hidden.has(key)},enter:options.enter||(()=>{})};nativeFolders.push(node);return node;}
 return {hub,L,$,doc,params,templates,listeners,styles,warnings,classes,rootNode,openedSettings,addFolder,open:()=>L.Settings.create('settings_hub'),openMain:()=>L.Settings.create('main'),search:value=>{assert(editRequest,'Search input was not opened');editRequest.callback(value);return editRequest;},searchOptions:()=>editRequest&&editRequest.options,
  enter(key){const item=items.find(n=>n.key===key);assert(item,'Missing navigation row '+key);item.enter();},back:()=>enabled.controller.back(),items:()=>items,focus:()=>focused,stats:()=>({destroyed,creates})};
}
test('Hub delegates native owner Back once and restores the selected row/category without re-registering business handlers',()=>{
 const f=fixture();let business=0;f.params.ydesign=[{param:{name:'radius',type:'select'},field:{name:'Радіус'},onRender:()=>business++}];const original=f.params.ydesign;
 assert.equal(f.hub.install(f.L,f.$,f.doc),true);f.open();f.enter('hub_category_appearance');f.enter('hub_item_0');assert.equal(business,1);
 f.back();assert.equal(f.focus().key,'hub_item_0');assert(f.focus().scrollFocused);f.back();assert.equal(f.focus().key,'hub_category_appearance');
 assert.equal(f.params.ydesign,original);assert.equal(f.params.ydesign.length,1);assert.equal(business,1);assert.equal(f.stats().destroyed,4);
});
test('Opt-in primary entry opens the existing Hub root from native Main and Back restores native Settings',()=>{
 const f=fixture();assert.equal(f.hub.install(f.L,f.$,f.doc),true);f.openMain();assert(!f.classes.has('settings-hub-active'));
 assert.equal(f.hub.openPrimary(),true);assert(f.classes.has('settings-hub-active'));assert.equal(f.items().some(x=>x.key==='hub_native'),true);
 f.back();assert.equal(f.L.Controller.enabled().name,'settings');assert(!f.classes.has('settings-hub-active'));
});
test('Primary entry reports failure and restores native Settings when Hub creation throws',()=>{
 const f=fixture();f.hub.install(f.L,f.$,f.doc);f.L.Settings.create=()=>{throw Error('fixture initialization failure');};
 assert.equal(f.hub.openPrimary(),false);assert.equal(f.L.Controller.enabled().name,'settings');assert(!f.classes.has('settings-hub-active'));
});
test('Integrated Hub and Hybrid routing keeps explicit native returns one-shot and allows the next fresh open',()=>{
 const f=fixture(),source=fs.readFileSync(__dirname+'/../ui/stremio-hybrid.js','utf8'),frames=[],events=[],hybridCalls=[];let primary=true;
 f.classes.add('settings--open');
 const c={settingsFrame:0,watching:true,settingsCategory:'interface',settingsParameter:null,settingsPrimaryRouting:false,settingsHub:f.hub,
  window:{LampaSettingsHub:f.hub},Lampa:{Storage:{get:key=>{assert.equal(key,'stremio_hybrid_primary_settings');return primary;}},Controller:{enabled:()=>f.L.Controller.enabled()}},cancelAnimationFrame:()=>{},
  onSettingsClose:()=>hybridCalls.push('close'),requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},document:f.doc,nativeSettingsFolders:()=>[],updateSettingsRail:()=>hybridCalls.push('native-main'),chooseSettingsCategory:()=>{}};
 vm.runInNewContext(source.slice(source.indexOf('    function onSettingsOpen('),source.indexOf('    function onSettingsClose(')),c);
 const originalCreate=f.L.Settings.create;f.L.Settings.create=(name,options)=>{events.push(name);return originalCreate(name,options);};
 assert.equal(f.hub.install(f.L,f.$,f.doc),true);f.listeners.open.unshift(c.onSettingsOpen);
 const baseToggle=f.L.Controller.toggle;f.L.Controller.toggle=name=>{baseToggle(name);if(name==='settings')f.listeners.open.slice().forEach(fn=>fn({name:'main'}));};
 function flush(){let guard=0;while(frames.length){assert(guard++<12,'Settings Main/Hub transition loop');frames.shift()();}}
 function freshOpen(){f.openMain();flush();}
 const hubOpens=()=>events.filter(name=>name==='settings_hub').length;
 primary=false;freshOpen();assert.equal(hubOpens(),0,'Preference OFF leaves the native Main open');
 primary=true;freshOpen();assert.equal(hubOpens(),1,'Preference ON opens Hub');
 f.enter('hub_native');flush();assert.equal(f.L.Controller.enabled().name,'settings');assert.equal(hubOpens(),1,'Standard Settings return must bypass primary routing once');
 freshOpen();assert.equal(hubOpens(),2,'A fresh Settings opening routes to Hub again');
 f.back();flush();assert.equal(f.L.Controller.enabled().name,'settings');assert.equal(hubOpens(),2,'Hub root Back returns to native Settings once');
 freshOpen();assert.equal(hubOpens(),3,'The bypass was consumed and does not suppress a fresh open');
 const beforeFailure=hubOpens(),create=f.L.Settings.create;let failedAttempts=0;f.L.Settings.create=(name,options)=>{if(name==='settings_hub'){failedAttempts++;throw Error('fixture Hub initialization failure');}return create(name,options);};
 f.openMain();flush();assert.equal(failedAttempts,1,'Failed attempt is bounded to one Hub initialization');assert.equal(hubOpens(),beforeFailure);assert.equal(f.L.Controller.enabled().name,'settings');
 f.L.Settings.create=create;
 c.settingsHub=null;f.hub.destroy();assert.equal(f.listeners.open.filter(fn=>fn===c.onSettingsOpen).length,1);assert.equal(f.listeners.open.length,1,'Destroy removes the Hub listener');
 c.watching=false;freshOpen();assert.equal(hubOpens(),beforeFailure,'Disabled Hybrid leaves native Settings working');c.watching=true;
 c.settingsHub=f.hub;assert.equal(f.hub.install(f.L,f.$,f.doc),true);assert.equal(f.listeners.open.length,2,'Reinstall adds one Hub listener');freshOpen();assert.equal(hubOpens(),beforeFailure+1,'Reinstall routes a fresh opening with no stale bypass');
});
test('Paging bounds rendered links, discovers late registrations and does not duplicate listeners/styles on reopen',()=>{
 const f=fixture();f.params.ydesign=Array.from({length:65},(_,i)=>({param:{name:'setting_'+i,type:'select'},field:{name:'Параметр '+i}}));f.hub.install(f.L,f.$,f.doc);
 f.open();f.enter('hub_category_appearance');assert.equal(f.items().filter(x=>x.key.startsWith('hub_item_')).length,24);f.enter('hub_next');assert.equal(f.items().filter(x=>x.key.startsWith('hub_item_')).length,24);
 f.back();const rootKeys=f.params.settings_hub.map(x=>x.param.name);assert.equal(new Set(rootKeys).size,rootKeys.length,'Root controls are not duplicated on reentry');
 f.params.ydesign.push({param:{name:'late',type:'select'},field:{name:'Новий'}});f.enter('hub_category_appearance');f.enter('hub_next');f.enter('hub_next');assert.equal(f.items().filter(x=>x.key.startsWith('hub_item_')).length,18);
 assert.equal(f.hub.install(f.L,f.$,f.doc),false);assert.equal(f.styles.length,0);assert.equal(f.listeners.open.length,1);assert.equal(f.listeners.close.length,1);
 f.listeners.close[0]();assert.equal(f.hub.owns('ydesign'),false);assert(!f.classes.has('settings-hub-active'));
});
test('Search is global, case-insensitive, metadata-only, deduplicated, and preserves query and result focus on owner Back',()=>{
 const f=fixture();f.params.ydesign=[{param:{name:'rating_card_mode',type:'select'},field:{name:'Режим карток'}}];
 f.templates.settings_ydesign='<div class="settings-param selector" data-name="rating_card_mode" data-type="select"><div class="settings-param__name">Режим карток</div></div>';
 f.hub.install(f.L,f.$,f.doc);f.open();assert.equal(f.items().filter(x=>x.key==='hub_problems').length,0,'No problem shortcut without evidence');
 assert.match(f.items().find(x=>x.key==='hub_category_appearance').description,/Зареєстровано опцій: 1\. Це не підтверджує їхню роботу/);
 f.enter('hub_search');f.search('DESIGN-OPTIMIZED');assert.equal(f.items().filter(x=>x.key.startsWith('hub_item_')).length,1,'Template and SettingsApi duplicates render once');
 assert.match(f.items().find(x=>x.key==='hub_item_0').description,/Зовнішній вигляд · ui\/design-optimized\.js · Панель доступна · ефект не перевірено/);
 assert(f.items().find(x=>x.key==='hub_item_0').classes.includes('settings-hub-status-unverified'));
 f.enter('hub_search');assert.equal(f.searchOptions().value,'DESIGN-OPTIMIZED');f.search('YDESIGN');assert.equal(f.items().filter(x=>x.key.startsWith('hub_item_')).length,1);
 f.enter('hub_search');f.search('RATING_CARD_MODE');assert.equal(f.items().filter(x=>x.key.startsWith('hub_item_')).length,1);
 f.enter('hub_item_0');f.back();assert.equal(f.focus().key,'hub_item_0','Back restores focus to the same search result');f.enter('hub_search');assert.equal(f.searchOptions().value,'RATING_CARD_MODE','Owner Back preserves the query');
 f.search('РЕЖИМ КАРТОК');assert.equal(f.items().filter(x=>x.key.startsWith('hub_item_')).length,1,'Visible Ukrainian labels are searched case-insensitively');
 f.enter('hub_search');f.search('no-such-option');assert.equal(f.items().find(x=>x.key==='hub_empty').label,'За цим запитом нічого не знайдено');
 f.enter('hub_back');assert.equal(f.focus().key,'hub_search');
 f.enter('hub_search');assert.equal(f.searchOptions().value,'no-such-option','Root Back preserves the last query');
});
test('Home and Appearance categories route to native controls and preserve owner registrations across Back',()=>{
 const f=fixture();let ownerRender=0;
 f.params.home_history=[{param:{name:'home_history_edit_order',type:'button'},field:{name:'Порядок рядків Home'},onRender:()=>ownerRender++}];
 f.params.ydesign_grid=[{param:{name:'ydesign_row_continue',type:'trigger',default:true},field:{name:'Рядок «Продовжити перегляд»'}}];
 f.params.ydesign_styles=[{param:{name:'ydesign_style',type:'select',default:'classic',values:{classic:'Класичний',glass:'Скло'}},field:{name:'Стиль карток'}}];
 const homeParams=f.params.home_history,homeDisplayParams=f.params.ydesign_grid,appearanceParams=f.params.ydesign_styles;
 f.hub.install(f.L,f.$,f.doc);f.open();
 f.enter('hub_category_home');assert(f.items().some(x=>x.key==='hub_item_0'&&x.label==='Порядок рядків Home'));
 assert.match(f.items().find(x=>x.key==='hub_item_0').description,/plugins-to-enable\/home-policy\.js/);
 f.enter('hub_item_0');assert.equal(f.openedSettings.at(-1),'home_history');assert.equal(ownerRender,1);
 f.back();assert.equal(f.focus().key,'hub_item_0');f.back();assert.equal(f.focus().key,'hub_category_home');
 f.enter('hub_category_home');assert(f.items().some(x=>x.key==='hub_item_1'&&x.label==='Рядок «Продовжити перегляд»'));
 f.enter('hub_item_1');assert.equal(f.openedSettings.at(-1),'ydesign_grid');f.back();
 f.back();f.enter('hub_category_appearance');assert(f.items().some(x=>x.key==='hub_item_0'&&x.label==='Стиль карток'));
 f.enter('hub_item_0');assert.equal(f.openedSettings.at(-1),'ydesign_styles');f.back();
 assert.equal(f.params.home_history,homeParams,'Hub never replaces the Home owner registration');assert.equal(f.params.ydesign_grid,homeDisplayParams,'Hub never replaces the Home display registration');assert.equal(f.params.ydesign_styles,appearanceParams,'Hub never replaces the Appearance owner registration');
});
test('An empty category offers direct native fallback without inventing a setting',()=>{
 const f=fixture();f.hub.install(f.L,f.$,f.doc);f.open();f.enter('hub_category_home');
 assert.equal(f.items().find(x=>x.key==='hub_empty').label,'У цій категорії немає зареєстрованих опцій');
 assert.equal(f.items().filter(x=>x.key.startsWith('hub_item_')).length,0);
 f.enter('hub_empty_native');assert.equal(f.L.Controller.enabled().name,'settings');assert(!f.classes.has('settings-hub-active'));
});
test('Search opened from a category restores that category and query after owner Back and list Back',()=>{
 const f=fixture();f.params.ydesign=[{param:{name:'card_size',type:'select'},field:{name:'Розмір картки'}}];f.hub.install(f.L,f.$,f.doc);f.open();
 f.enter('hub_category_appearance');f.enter('hub_search');f.search('YDESIGN');f.enter('hub_item_0');f.back();
 assert.equal(f.focus().key,'hub_item_0');assert.match(f.items().find(x=>x.key==='hub_item_0').description,/Зовнішній вигляд/);
 f.enter('hub_back');assert.equal(f.focus().key,'hub_category_appearance');f.enter('hub_search');assert.equal(f.searchOptions().value,'YDESIGN');
});
test('Every status class emitted by Hub has a matching Hybrid Settings selector',()=>{
 const hubSource=fs.readFileSync(__dirname+'/../ui/settings-hub.js','utf8'),hybridSource=fs.readFileSync(__dirname+'/../ui/stremio-hybrid.js','utf8');
 const block=hubSource.slice(hubSource.indexOf('        function statusClass('),hubSource.indexOf('        function editSearch('));
 const emitted=Array.from(block.matchAll(/return '(settings-hub-status-[a-z]+)'/g),match=>match[1]);
 assert.deepEqual(new Set(emitted),new Set(['settings-hub-status-unverified','settings-hub-status-partial','settings-hub-status-broken','settings-hub-status-unavailable']));
 emitted.forEach(name=>assert.match(hybridSource,new RegExp('settings-hub-active \\.settings-param\\.'+name+' \\{'),name+' must have an active-Hybrid selector'));
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
 const c={settingsFrame:0,watching:true,settingsCategory:'',settingsParameter:null,settingsPrimaryRouting:false,settingsHub:null,Lampa:{Storage:{get:()=>false}},window:{LampaSettingsHub:{owns:()=>true}},cancelAnimationFrame:()=>{},onSettingsClose:()=>{throw Error('Native Main must not yield to a stale Hub flag');},requestAnimationFrame:fn=>{queued.push(fn);return 1;},document:{body:{classList:{contains:()=>true}}},nativeSettingsFolders:()=>[{getAttribute:()=> 'interface'}],updateSettingsRail:()=>calls.push('rail'),chooseSettingsCategory:(...args)=>calls.push(args)};
 vm.runInNewContext(source.slice(source.indexOf('    function onSettingsOpen('),source.indexOf('    function onSettingsClose(')),c);c.onSettingsOpen({name:'main'});assert.equal(queued.length,1);c.window.LampaSettingsHub.owns=()=>false;queued[0]();assert.deepEqual(calls,['rail',['interface',true]]);
});
test('Primary Settings routing is opt-in, requires the mounted compatible Hub and yields nested events without a Back loop',()=>{
 const source=fs.readFileSync(__dirname+'/../ui/stremio-hybrid.js','utf8'),run=source.slice(source.indexOf('    function onSettingsOpen('),source.indexOf('    function onSettingsClose('));
 function route(primary,makeApi,watching=true){
  const queued=[],calls=[];const c={settingsFrame:0,watching,settingsCategory:'interface',settingsParameter:null,settingsPrimaryRouting:false,settingsHub:null,
   window:{LampaSettingsHub:null},Lampa:{Storage:{get:key=>{assert.equal(key,'stremio_hybrid_primary_settings');return primary;}}},cancelAnimationFrame:()=>{},onSettingsClose:()=>calls.push('close'),requestAnimationFrame:fn=>{queued.push(fn);return queued.length;},
   document:{body:{classList:{contains:()=>true}}},updateSettingsRail:()=>calls.push('native-rail'),nativeSettingsFolders:()=>[{getAttribute:()=> 'interface'}],chooseSettingsCategory:(...args)=>calls.push(['native-category',...args])};
  const api=makeApi?makeApi(c,calls):null;c.settingsHub=api;c.window.LampaSettingsHub=api;
  vm.runInNewContext(run,c);c.onSettingsOpen({name:'main'});queued.shift()();return {c,calls,queued};
 }
 const target=(c,calls,version=1,result=true)=>({contractVersion:version,owns:name=>name==='settings_hub',openPrimary(){calls.push('hub-root');c.onSettingsOpen({name:'settings_hub'});return result;}});
 let r=route(true,target);assert.deepEqual(r.calls,['hub-root','close']);assert.equal(r.queued.length,0);
 r=route('true',target);assert.deepEqual(r.calls,['hub-root','close'],'Boolean-like persisted opt-in values remain compatible');
 r=route(true,null);assert.deepEqual(r.calls,['native-rail',['native-category','interface',true]]);
 r=route(false,target);assert.deepEqual(r.calls,['native-rail',['native-category','interface',true]]);
 r=route(true,(c,calls)=>target(c,calls,99));assert.deepEqual(r.calls,['native-rail',['native-category','interface',true]]);
 r=route(true,(c,calls)=>({contractVersion:1,owns:()=>false,openPrimary:()=>{throw Error('unowned Hub must not be called');}}));assert.deepEqual(r.calls,['native-rail',['native-category','interface',true]]);
 r=route(true,(c,calls)=>target(c,calls,1,false));assert.deepEqual(r.calls,['hub-root','close','native-rail',['native-category','interface',true]]);
 r=route(true,target,false);assert.deepEqual(r.calls,[]);
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
test('Missing owner template is blocked with an explanation while the native Settings fallback remains available',()=>{
 const f=fixture();f.params.missing_external_owner=[{param:{name:'external_pref',type:'select'},field:{name:'External preference'}}];
 const nativeTemplate=f.L.Template.get;f.L.Template.get=name=>name==='settings_missing_external_owner'?null:nativeTemplate(name);
 assert.equal(f.hub.install(f.L,f.$,f.doc),true);f.open();f.enter('hub_problems');const creates=f.stats().creates;f.enter('hub_item_0');
 assert.equal(f.stats().creates,creates,'Unavailable owner panel must not be opened');assert.equal(f.warnings.length,1);assert.match(f.warnings[0],/Панель ще не зареєстрована/);
 f.back();f.enter('hub_native');assert.equal(f.L.Controller.enabled().name,'settings');assert(!f.classes.has('settings-hub-active'));
});
test('Hub hides only known direct owner folders while active and restores every folder on native fallback or destroy',()=>{
 const f=fixture(),safe=f.addFolder('ydesign'),unknown=f.addFolder('external_plugin'),system=f.addFolder('system_tools'),missing=f.addFolder('trakt_plus'),preserved=f.addFolder('ydesign_legacy',{marker:''}),templateOnly=f.addFolder('ydesign_template_only');
 f.params.ydesign=[{param:{name:'card_size',type:'select'},field:{name:'Розмір картки'}}];
 f.params.external_plugin=[{param:{name:'external_pref',type:'select'},field:{name:'Зовнішній параметр'}}];
 f.params.trakt_plus=[{param:{name:'trakt_pref',type:'select'},field:{name:'Trakt'}}];
 f.params.ydesign_legacy=[{param:{name:'old_pref',type:'select'},field:{name:'Стара опція'}}];
 f.templates.settings_ydesign_template_only='<div class="settings-param selector" data-name="orphaned"><div class="settings-param__name">Осиротілий шаблон</div></div>';
 const get=f.L.Template.get;f.L.Template.get=name=>name==='settings_trakt_plus'?null:get(name);
 f.hub.install(f.L,f.$,f.doc);f.open();
 const hybridSource=fs.readFileSync(__dirname+'/../ui/stremio-hybrid.js','utf8');assert(hybridSource.includes('settings-hub-active .settings-folder[data-settings-hub-consolidated="true"]'));
 assert(hybridSource.includes('settings-hub-active .settings-param__name { font-size:1.1em; line-height:1.35; white-space:normal; overflow-wrap:anywhere; }'));
 assert.equal(safe.getAttribute('data-settings-hub-consolidated'),'true','Known owner panel with a registered template is consolidated');
 assert.equal(unknown.getAttribute('data-settings-hub-consolidated'),null,'Unknown owner remains in native navigation');
 assert.equal(system.getAttribute('data-settings-hub-consolidated'),null,'Native/system folder remains visible');
 assert.equal(missing.getAttribute('data-settings-hub-consolidated'),null,'Missing panel remains reachable natively');
 assert.equal(preserved.getAttribute('data-settings-hub-consolidated'),'','Pre-existing folder metadata is preserved');
 assert.equal(templateOnly.getAttribute('data-settings-hub-consolidated'),null,'Template rows without an owner SettingsApi registration do not establish an accessible Hub route');
 f.enter('hub_native');assert.equal(safe.getAttribute('data-settings-hub-consolidated'),null,'Standard Settings immediately restores consolidated folders');
 assert.equal(safe.style.display,'','Fallback preserves original folder visibility');assert.equal(safe.getAttribute('data-component'),'ydesign');assert.equal(preserved.getAttribute('data-settings-hub-consolidated'),'');
 f.open();assert.equal(safe.getAttribute('data-settings-hub-consolidated'),'true');f.listeners.close[0]();assert.equal(safe.getAttribute('data-settings-hub-consolidated'),null,'Close restores consolidated folders');
 assert.equal(safe.style.display,'');assert.equal(safe.getAttribute('data-component'),'ydesign');assert.equal(preserved.getAttribute('data-settings-hub-consolidated'),'');
 f.open();assert.equal(safe.getAttribute('data-settings-hub-consolidated'),'true');f.hub.destroy();
 assert.equal(safe.getAttribute('data-settings-hub-consolidated'),null,'Destroy restores the original folder');assert.equal(safe.style.display,'');assert.equal(safe.getAttribute('data-component'),'ydesign');assert.equal(preserved.getAttribute('data-settings-hub-consolidated'),'');
});
test('A native owner panel failure restores consolidated folders and the native Settings route',()=>{
 const f=fixture(),safe=f.addFolder('ydesign',{display:'block'});f.params.ydesign=[{param:{name:'card_size',type:'select'},field:{name:'Розмір картки'}}];
 f.hub.install(f.L,f.$,f.doc);f.open();f.enter('hub_category_appearance');const create=f.L.Settings.create;
 f.L.Settings.create=(name,options)=>{if(name==='ydesign')throw Error('fixture owner delivery failure');return create(name,options);};
 f.enter('hub_item_0');assert.equal(f.L.Controller.enabled().name,'settings');assert.equal(safe.getAttribute('data-settings-hub-consolidated'),null);assert.equal(safe.style.display,'block');assert.equal(safe.getAttribute('data-component'),'ydesign');assert(!f.classes.has('settings-hub-active'));assert.match(f.warnings.at(-1),/стандартними налаштуваннями/);
});

test('Repeated Hub navigation, owner Back, search and reinstall cycles keep registrations and listeners bounded',()=>{
 const f=fixture();
 f.params.ydesign=Array.from({length:65},(_,i)=>({param:{name:'stress_'+i,type:'select'},field:{name:'Опція '+i}}));
 assert.equal(f.hub.install(f.L,f.$,f.doc),true);
 const rootParams=()=>f.params.settings_hub.map(item=>item.param.name);
 const rootBaseline=rootParams();
 for(let i=0;i<30;i++){
  f.open();f.enter('hub_category_appearance');f.enter('hub_item_0');f.back();
  assert.equal(f.focus().key,'hub_item_0','Owner Back restores the selected setting after cycle '+i);
  f.back();assert.equal(f.focus().key,'hub_category_appearance','List Back restores its category after cycle '+i);
  f.back();assert.equal(f.L.Controller.enabled().name,'settings','Root Back exits to native Settings after cycle '+i);
  assert.deepEqual(rootParams(),rootBaseline,'Hub root registrations remain stable after cycle '+i);
 }
 for(let i=0;i<20;i++){
  f.open();f.enter('hub_search');f.search('STRESS_6'+(i%5));
  assert(f.items().some(item=>item.key.startsWith('hub_item_')),'Search returns a result on edit cycle '+i);
  f.back();f.enter('hub_search');assert.equal(f.searchOptions().value,'STRESS_6'+(i%5),'Search query survives list reentry '+i);
  f.listeners.close[0]();
 }
 assert.equal(f.listeners.open.length,1);assert.equal(f.listeners.close.length,1);
 assert.equal(f.styles.length,0,'Hub does not accumulate a separate stylesheet');
 const roots=new Set(rootParams());assert.equal(roots.size,rootBaseline.length,'No duplicate root IDs after repeated entry');
 f.hub.destroy();assert.equal(f.listeners.open.length,0);assert.equal(f.listeners.close.length,0);
 for(let i=0;i<10;i++){
  assert.equal(f.hub.install(f.L,f.$,f.doc),true);f.open();f.hub.destroy();
  assert.equal(f.listeners.open.length,0,'Destroy removes open listener after reinstall '+i);
  assert.equal(f.listeners.close.length,0,'Destroy removes close listener after reinstall '+i);
  assert.equal(f.params.settings_hub,undefined);assert.equal(f.params.settings_hub_page,undefined);
 }
});

test('Synthetic 506-row Hub workload stays paginated and reports cold/warm navigation timings',t=>{
 const {performance}=require('node:perf_hooks'),f=fixture();
 f.params.ydesign=Array.from({length:506},(_,i)=>({param:{name:'bench_'+i,type:'select'},field:{name:'Налаштування '+i}}));
 const elapsed=fn=>{const start=performance.now();fn();return +(performance.now()-start).toFixed(3);};
 const timings={registryInstallMs:elapsed(()=>assert.equal(f.hub.install(f.L,f.$,f.doc),true))};
 timings.coldRootMs=elapsed(()=>f.open());
 timings.categoryMs=elapsed(()=>f.enter('hub_category_appearance'));
 assert.equal(f.items().filter(row=>row.key.startsWith('hub_item_')).length,24);
 timings.pageMs=elapsed(()=>f.enter('hub_next'));
 timings.searchMs=elapsed(()=>{f.enter('hub_search');f.search('BENCH_5');});
 assert(f.items().filter(row=>row.key.startsWith('hub_item_')).length<=24);
 timings.ownerOpenMs=elapsed(()=>f.enter('hub_item_0'));
 timings.ownerBackMs=elapsed(()=>f.back());
 timings.warmRootMs=elapsed(()=>f.back());
 f.back();
 timings.reopenMs=elapsed(()=>f.open());
 const rows=f.items().filter(row=>row.key.startsWith('hub_item_')).length;
 const activeMetrics=JSON.parse(f.rootNode.attrs['data-settings-hub-metrics']);
 assert.equal(activeMetrics.observers,0);assert.equal(activeMetrics.timers,0);assert.equal(activeMetrics.listeners,2);
 assert.equal(f.params.ydesign.length,506);assert(rows<=24);
 t.diagnostic(JSON.stringify({machine:process.platform+' '+process.arch+' Node '+process.version,fixture:'mock Lampa SettingsApi; 506 synthetic owner records; no real storage/services',timingsMs:timings,registryRows:506,renderedSettingRows:rows,maxRows:24,metrics:activeMetrics}));
 f.hub.destroy();
});
