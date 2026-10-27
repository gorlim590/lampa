'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/../ui/stremio-hybrid.js','utf8');
function node(names,title=''){const classes=new Set(names.split(' '));return{isConnected:true,style:{},textContent:title,classList:{contains:n=>classes.has(n),add:n=>classes.add(n),remove:n=>classes.delete(n)},getAttribute:()=>null,querySelector:()=>null};}
function fixture(){
 const nodes=[node('notice--icon'),node('open--settings'),node('open--profile'),node('trakt-head-action'),node('full--screen'),node('third-party','Plugin action')],panel=node(''),calls=[],params=[];
 const c={URL,menuOpen:false,moreButton:node('sh-head-more'),document:{querySelectorAll:()=>nodes},Lampa:{Controller:{enabled:()=>({name:'settings_component'}),toggle:n=>calls.push(n),collectionFocus:()=>{},back:()=>calls.push('back')},Head:{render:()=>({})},SettingsApi:{getParam:()=>params},Activity:{mixState(){}},Select:{show:options=>{c.selected=options},hide:()=>calls.push('hide'),render:()=>[panel]}},$:n=>({trigger:event=>calls.push({node:n,event,profileStyle:panel.classList.contains('sh-profile-menu')})}),window:{}};
 c.window.Lampa=c.Lampa;
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('    function actionLabel('),source.indexOf('    css += `',source.indexOf('    function actionLabel('))),c);
 vm.runInContext(source.slice(source.indexOf('    function restoreHead('),source.indexOf('    function onSearchEnter(')),c);
 return{c,nodes,panel,calls,params};
}
const titles=f=>Array.from(f.c.selected.items,x=>x.title);
test('primary dropdown excludes requested utility actions but retains Settings/fullscreen/third-party/Back',()=>{const f=fixture();f.c.openActions();assert.deepEqual(titles(f),['Налаштування','Повний екран','Plugin action','Назад']);});
test('utilities preserve original action nodes and native navigation without copied handlers',()=>{const f=fixture();f.c.openHeaderUtilities();assert.deepEqual(titles(f),['Сповіщення','Профіль','Trakt · статус та списки','Навігація']);assert.equal(f.c.selected.items[0].shNode,f.nodes[0]);f.c.selected.onSelect(f.c.selected.items[0]);assert.equal(f.calls.at(-1).node,f.nodes[0]);assert.equal(f.calls.at(-1).event,'hover:enter');});
test('unknown plugin actions are retained even with a label matching a removed action',()=>{const f=fixture();f.nodes.push(node('third-party','Trakt'));f.c.openActions();assert(titles(f).includes('Trakt'));});
test('hidden native actions are not resurrected and late plugin controls are discovered on open',()=>{const f=fixture();f.nodes[0].classList.add('hidden');f.nodes.push(node('plugin-late','Late action'));f.c.openHeaderUtilities();assert(!titles(f).includes('Сповіщення'));f.c.openActions();assert(titles(f).includes('Late action'));});
test('profile Back removes scoped panel skin and returns focus to head',()=>{const f=fixture();f.c.openActions();assert(f.panel.classList.contains('sh-profile-menu'));f.c.selected.onBack();assert.equal(f.c.menuOpen,false);assert(!f.panel.classList.contains('sh-profile-menu'));assert.equal(f.calls.at(-1),'head');});
test('profile selection removes skin before executing native action',()=>{const f=fixture();f.c.openActions();f.c.selected.onSelect(f.c.selected.items[0]);assert.equal(f.calls.at(-1).profileStyle,false);assert.equal(f.calls.at(-1).node,f.nodes[1]);});
test('detached actions cannot fire a stale handler after page transition',()=>{const f=fixture();f.c.openActions();const item=f.c.selected.items[0];item.shNode.isConnected=false;f.c.selected.onSelect(item);assert(!f.calls.some(x=>x&&x.event));});
test('utility Back restores originating controller and releases shared-menu ownership',()=>{const f=fixture();f.c.openHeaderUtilities();assert.equal(f.c.menuOpen,true);f.c.selected.onBack();assert.equal(f.c.menuOpen,false);assert.equal(f.calls.at(-1),'settings_component');});
test('utility Navigation delegates to native controller only after confirmation',()=>{const f=fixture();f.c.openHeaderUtilities();assert.equal(f.calls.length,0);f.c.selected.onSelect(f.c.selected.items.at(-1));assert.equal(f.calls.at(-1),'menu');});
test('destroy cleanup removes only the owned setting and preserves foreign Interface params',()=>{const f=fixture();const foreign={param:{name:'sh_header_utilities'},onChange:()=>{}},unrelated={param:{name:'native'}};f.params.push(foreign,unrelated,{param:{name:'sh_header_utilities'},onChange:f.c.onHeaderUtilitiesSetting});f.c.removeHeaderUtilitiesSetting();f.c.removeHeaderUtilitiesSetting();assert.deepEqual(f.params,[foreign,unrelated]);});
test('settings dispatcher follows current Hybrid instance rather than retaining the old action',()=>{const f=fixture();f.c.onHeaderUtilitiesSetting();let calls=0;f.c.window.StremioHybrid={openUtilities:()=>calls++};f.c.onHeaderUtilitiesSetting();assert.equal(calls,1);});
test('early destroy tolerates a runtime whose SettingsApi is not ready',()=>{const f=fixture();f.c.window.Lampa=null;assert.doesNotThrow(()=>f.c.removeHeaderUtilitiesSetting());f.c.window.Lampa=f.c.Lampa;f.c.Lampa.SettingsApi=null;assert.doesNotThrow(()=>f.c.removeHeaderUtilitiesSetting());});
test('repeated initialization and destroy/reinitialize register one utility setting',()=>{
 const f=fixture(),c=f.c;c.ready=false;c.destroyed=false;c.bootStats={initCount:0};c.uiNow=()=>0;c.stopWaiting=()=>{};c.apply=()=>{};c.enabled=()=>true;
 c.window.Lampa=c.Lampa;c.Lampa.SettingsApi.addParam=p=>f.params.push(p);
 vm.runInContext(source.slice(source.indexOf('    function init() {'),source.indexOf('    window.StremioHybrid = {')),c);
 c.init();c.init();assert.equal(f.params.filter(p=>p.param.name==='sh_header_utilities').length,1);
 c.removeHeaderUtilitiesSetting();c.ready=false;c.init();
 assert.deepEqual(f.params.map(p=>p.param.name).sort(),['sh_header_utilities','sh_profile_avatar','stremio_hybrid_enabled','stremio_hybrid_primary_settings']);
});
test('avatar URL policy rejects embedded data, credentials, files and excessive input',()=>{const c={URL};vm.createContext(c);vm.runInContext(source.slice(source.indexOf('    function avatarURL('),source.indexOf('    function updateAvatar(')),c);for(const x of ['data:image/png;base64,AAA','file:///private/image','https://u:p@example.org/a','https://example.org/'+'a'.repeat(2048),null])assert.equal(c.avatarURL(x),'');assert.equal(c.avatarURL('https://example.org/avatar.png'),'https://example.org/avatar.png');});
