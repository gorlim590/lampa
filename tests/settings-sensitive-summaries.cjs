'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../media/average-rating.js','utf8');
const controls={omdb_api_key_set:'omdb_api_key',mdblist_api_key_set:'mdblist_api_key',simkl_api_key_set:'simkl_api_key',mal_api_key_set:'mal_api_key',mal_cors_proxies_set:'mal_cors_proxies'};
for(const [name,key]of Object.entries(controls))test(name+' masks summaries and preserves the original editor/storage handler',()=>{
 const marker=source.indexOf('name: "'+name+'"'),start=source.lastIndexOf('        Lampa.SettingsApi.addParam({',marker),end=source.indexOf('\n        });',marker)+12;
 assert(marker>0&&start>0&&end>marker);
 let definition,enter,editor,save;const writes=[],rendered=[];let stored='<img src=x onerror=fixture()>-synthetic-secret';
 const value={text:v=>{rendered.push(v);return value;}};
 const c={COMPONENT_NAME:'omdb_config_ui',$:html=>{rendered.push(html);return value;},Lampa:{Storage:{get:()=>stored,set:(k,v)=>writes.push([k,v])},SettingsApi:{addParam:d=>definition=d},Input:{edit:(o,cb)=>{editor=o;save=cb;}}}};
 vm.runInNewContext(source.slice(start,end),c);
 definition.onRender({find:()=>({after:()=>{}}),on:(event,fn)=>{assert.equal(event,'hover:enter');enter=fn;}});
 assert.equal(writes.length,0);assert(!rendered.join('').includes(stored));assert(!rendered.join('').includes('<img'));
 enter();assert.equal(editor.value,stored);assert.equal(editor.nosave,true);
 const replacement='  replacement-secret  ';save(replacement);
 assert.deepEqual(writes,[[key,key==='mal_cors_proxies'?replacement.trim():replacement]]);
 assert(!rendered.join('').includes('replacement-secret'));
 save('');assert(rendered.at(-1).includes('Не встановлено')||rendered.at(-1).includes('Немає'));
});
