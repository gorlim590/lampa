'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const census=require('../audit/settings/runtime-census.js');
test('census enumerates definitions without invoking handlers, storage or service probes',()=>{
 const fail=()=>{throw Error('Forbidden side effect')},params=Object.freeze({interface:[Object.freeze({param:{name:'theme',type:'select',default:'default'},field:{name:'Тема'},onChange:fail,onRender:fail})]});
 const L={Storage:{get:fail,set:fail},SettingsApi:{allParams:()=>params,allComponents:()=>({interface:{name:'Інтерфейс'}})},Settings:{create:fail},Template:{get:()=>'<div class="settings-param selector" data-type="toggle" data-name="animation"><div class="settings-param__name">Анімація</div></div>'}};
 const r=census.capture(L);assert.equal(r.settings.length,2);assert.equal(r.settings[0].onChange,true);assert.equal(r.settings[1].key,'animation');assert.equal(r.settings[0].status,'Not verified');assert.equal(r.metrics.directStorageReads,0);assert.equal(r.metrics.directStorageWrites,0);assert.equal(r.metrics.serviceProbes,0);
});
test('credentials, server URLs and arbitrary string defaults never leave the census',()=>{
 for(const name of ['token','omdb_api_key','torrserver_url','avatar_url','profile_name','mp4_folder'])assert.equal(census.safeDefault('sensitive-fixture',name),'[redacted]');
 assert.equal(census.safeDefault('unclassified-secret','theme'),'[not exported]');assert.equal(census.safeDefault(false,'enabled'),false);
});
test('unavailable enumeration remains a gap, never a successful empty audit',()=>{const r=census.capture({});assert.equal(r.settings.length,0);assert(r.gaps.length);assert(!('captureMs' in r.metrics));});
test('template wrappers and similarly named title classes are not phantom settings',()=>{
 assert.deepEqual(census.htmlFields('<div></div>'),[]);
 const rows=census.htmlFields('<div><div class="settings-param-title">Heading</div><div class="settings-param selector" data-name="animation" data-type="toggle"><div class="settings-param__name">Анімація</div></div></div>');
 assert.equal(rows.length,1);assert.equal(rows[0].name,'animation');
});
test('source attribution uses code-only fingerprints without invoking or exporting callbacks',()=>{
 const one=Function('return "fixture-secret-a"'),two=Function('return "fixture-secret-b"');
 assert.equal(census.sourceFingerprint(one.toString()),census.sourceFingerprint(two.toString()));
 const L={SettingsApi:{allParams:()=>({test:[{param:{name:'button',type:'button'},field:{name:'Тест'},onChange:one}]}),allComponents:()=>({})}};
 const row=census.capture(L).settings[0];assert(row.onChangeFingerprint);assert(!JSON.stringify(row).includes('fixture-secret'));
});
test('script inventory strips credentials/query strings and never serializes function bodies',()=>{
 const L={SettingsApi:{allParams:()=>({test:[{param:{name:'api_key_set',default:'fixture-secret'},field:{name:'API key: fixture-secret'},onRender:()=> 'fixture-secret'}]}),allComponents:()=>({})}};
 const doc={querySelectorAll:()=>[{getAttribute:()=> 'https://user:secret@example.org/plugin.js?token=fixture-secret'}]};
 const r=census.capture(L,doc),json=JSON.stringify(r);assert(!json.includes('fixture-secret'));assert(!json.includes('user:secret'));assert.deepEqual(r.scripts,[{host:'example.org',path:'/plugin.js'}]);
});
test('loader audit path is explicit and does not change its normal plugin sequence',()=>{
 const source=fs.readFileSync(__dirname+'/../loader.js','utf8');
 for(const [query,extra]of [['',0],['?settings_audit=0',0],['?settings_audit=1',1]]){
  const loaded=[];vm.runInNewContext(source,{window:{appready:true,location:{search:query}},Lampa:{Storage:{get:()=>null},Utils:{putScriptAsync:(urls,ok)=>{loaded.push(urls[0]);ok()}}},setTimeout:()=>1,clearTimeout:()=>{}});
  assert.equal(loaded.length,8+extra);assert.equal(loaded.some(x=>x.includes('runtime-census.js')),!!extra);
 }
});
test('Hub preview is opt-in and completes before a combined audit capture',()=>{
 const source=fs.readFileSync(__dirname+'/../loader.js','utf8');
 for(const [query,count]of [['?settings_hub=0',8],['?settings_hub=1',9],['?settings_hub=1&settings_audit=1',10]]){
  const loaded=[];vm.runInNewContext(source,{window:{appready:true,location:{search:query}},Lampa:{Storage:{get:()=>null},Utils:{putScriptAsync:(urls,ok)=>{loaded.push(urls[0]);ok()}}},setTimeout:()=>1,clearTimeout:()=>{}});
  assert.equal(loaded.length,count);if(count===10){assert(loaded[8].includes('settings-hub.js'));assert(loaded[9].includes('runtime-census.js'));}
 }
});
