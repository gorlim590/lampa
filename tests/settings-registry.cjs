'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const hub=require('../ui/settings-hub.js');
function fixture(){
 let calls=0;const params={trakt_plus:[{param:{name:'trakt_sync',type:'button'},field:{name:'Синхронізація'},onRender:()=>{calls++;}}],ydesign:[{param:{name:'ydesign_title',type:'title'},field:{name:'Текст'}},{param:{name:'ydesign_radius',type:'select',default:'secret-default'},field:{name:'Радіус'}}],bwa:[{param:{name:'bwa_style',type:'select'},field:{name:'Вигляд'}}]};
 const templates={settings_player:'<div><div class="settings-param selector" data-name="player" data-type="select"><div class="settings-param__name">Плеєр</div></div></div>',settings_omdb_config_ui:'<div></div>'};
 const L={SettingsApi:{allParams:()=>params,allComponents:()=>({trakt_plus:{name:'Trakt+'},ydesign:{name:'YDesign'},player:{name:'Плеєр'}})},Template:{get:key=>templates[key]||'<div></div>'},Storage:{get:()=>{throw Error('Must not read preferences');},set:()=>{throw Error('Must not write preferences');}}};
 return {L,params,calls:()=>calls};
}
test('Registry indexes native templates and API definitions without invoking handlers or values',()=>{
 const {L,params,calls}=fixture(),snapshot=JSON.stringify(params),r=hub.createRegistry(L);
 assert.equal(r.rows.length,4);assert.equal(calls(),0);assert.equal(JSON.stringify(params),snapshot);assert(!JSON.stringify(r).includes('secret-default'));
 assert.equal(r.rows.find(x=>x.key==='ydesign_radius').owner,'ui/design-optimized.js');assert.equal(r.rows.find(x=>x.key==='player').category,'playback');
 assert.deepEqual(Object.keys(r.metrics).sort(),['buildMs','preferenceReads','preferenceWrites','records','serviceProbes']);
 assert.equal(r.metrics.preferenceReads+r.metrics.preferenceWrites+r.metrics.serviceProbes,0);
});
test('Ten Ukrainian categories preserve native Home and torrent ownership boundaries',()=>{
 assert.equal(hub.categories.length,10);assert.equal(hub.category('home_history','order'),'home');assert.equal(hub.category('addCategory','add'),'home');
 assert.equal(hub.category('trakt_plus','trakt_sync'),'trakt');assert.equal(hub.category('server','url'),'torrents');assert.equal(hub.category('screensaver_plus','enabled'),'screensaver');
 const {L}=fixture(),r=hub.createRegistry(L);assert.equal(r.select('trakt').length,1);assert.equal(r.select('all','радіус')[0].key,'ydesign_radius');assert.equal(r.select('all','bwa_style').length,1);
});
test('Unknown options never become confirmed failures or working controls',()=>{
 const {L}=fixture(),r=hub.createRegistry(L);assert.equal(r.select('problems').length,0);assert.equal(r.select('unverified').length,r.rows.length);assert(r.rows.every(x=>x.status==='unverified'));
});
test('Confirmed unsafe owner versions are separated from unverified; fixed capability clears the blocker',()=>{
 const {L,params}=fixture();params.omdb_config_ui=[{param:{name:'omdb_api_key_set',type:'static'},field:{name:'Ключ'}},{param:{name:'omdb_rating_size',type:'select'},field:{name:'Розмір рейтингів'}}];
 let r=hub.createRegistry(L);assert.equal(r.select('problems').length,2);assert.equal(r.rows.find(x=>x.key==='omdb_api_key_set').status,'blocked');
 L.AverageRating={settingsPrivacyVersion:1};r=hub.createRegistry(L);assert.equal(r.select('problems').length,1);assert.equal(r.rows.find(x=>x.key==='omdb_api_key_set').status,'unverified');assert.equal(r.select('problems')[0].status,'partial');
});
test('Snapshot refresh discovers late registrations without observers, polling or re-registering owners',()=>{
 const {L,params}=fixture(),before=hub.createRegistry(L);params.trakt_plus.push({param:{name:'late',type:'trigger'},field:{name:'Пізній параметр'}});
 const after=hub.createRegistry(L);assert.equal(after.rows.length,before.rows.length+1);assert.equal(before.select('all','late').length,0);assert.equal(after.select('all','late').length,1);
});
test('Missing templates retain an explicit gap and original special-folder route',()=>{
 const {L}=fixture();L.Template.get=()=>{throw Error('No template');};const r=hub.createRegistry(L,[{id:'hub'}]);assert(r.gaps.includes('hub'));assert.equal(r.rows.find(x=>x.component==='hub').route,'folder');assert.equal(r.rows.find(x=>x.component==='hub').status,'unverified');
});
test('Presentation wrappers are not controls and duplicate registrations are not silently discarded',()=>{
 assert.deepEqual(hub.fields('<div></div>'),[]);assert.equal(hub.fields('<div class="settings-param-title">Header</div>').length,0);
 const {L,params}=fixture();params.trakt_plus.push(params.trakt_plus[0]);const rows=hub.createRegistry(L).select('trakt');assert.equal(rows.length,2);assert.notEqual(rows[0].instanceId,rows[1].instanceId);assert(rows.every(r=>r.identityVerified===false));
});
test('Missing native capability leaves fallback untouched',()=>{assert.equal(hub.install({},()=>{throw Error('Unexpected DOM');},{}),false);assert.equal(hub.owns('interface'),false);assert.equal(hub.owns('settings_hub'),false);});
test('Loading the reusable module has no UI/bootstrap/listener side effect before the single UI owner mounts it',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),fail=()=>{throw Error('Unexpected bootstrap effect');};
 const window={appready:true,document:{createElement:fail},Lampa:{Listener:{follow:fail},SettingsApi:{addParam:fail}}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/../ui/settings-hub.js','utf8'),{window});
 assert.equal(window.LampaSettingsHub.contractVersion,1);assert.equal(window.LampaSettingsHub.owns('settings_hub'),false);
});
test('Info self-navigation is reproduced in isolation and reported separately from a lazy template dependency',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),source=fs.readFileSync(__dirname+'/../community/new-category.js','utf8');
 const marker=source.indexOf('name: "ncInfo",',source.indexOf('//Info\n      Lampa.SettingsApi.addParam')),start=source.lastIndexOf('      Lampa.SettingsApi.addParam({',marker),end=source.indexOf('\n      });',marker)+10;
 assert(marker>0&&end>marker);let definition,enter;const routes=[],controller={};const Lampa={Lang:{translate:x=>x},SettingsApi:{addParam:d=>definition=d},Settings:{create:name=>routes.push(name)},Controller:{enabled:()=>({controller})}};
 vm.runInNewContext(source.slice(start,end),{Lampa});definition.onRender({show(){},on:(event,fn)=>enter=fn});enter();controller.back();controller.back();assert.deepEqual(routes,['ncInfo','ncInfo','ncInfo']);
 const {L,params}=fixture();params.addCategory=[definition];params.ncInfo=[{param:{name:'group',type:'static'},field:{name:'Інформація'}}];const get=L.Template.get;L.Template.get=key=>{if(key==='settings_ncInfo')throw Error('Lazy template');return get(key);};
 const r=hub.createRegistry(L);assert.equal(r.rows.find(x=>x.component==='addCategory').status,'broken');assert.equal(r.rows.find(x=>x.component==='ncInfo').status,'blocked');assert.equal(r.select('problems').length,2);
});
