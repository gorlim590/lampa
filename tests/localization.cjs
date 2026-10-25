'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const ifx=fs.readFileSync(__dirname+'/../ui/interface-plus.js','utf8');
const translate=fs.readFileSync(__dirname+'/../localization/translate.js','utf8');
function titleFixture(){
 const values={},requests=[],c={Date,Array,Lampa:{Storage:{get:k=>values[k],set:(k,v)=>values[k]=v},TMDB:{key:()=>''},Api:{tmdb:(path,params,success,error)=>requests.push({path,params,success,error})}}};
 vm.createContext(c);vm.runInContext(ifx.slice(ifx.indexOf('    var IFX_TITLE_SIZE_DEFAULT'),ifx.indexOf('    function isMonoEnabled(')),c);
 vm.runInContext(ifx.slice(ifx.indexOf('    function titleTranslations('),ifx.indexOf('    function getOriginalTitleEnabled(')),c);
 return{c,values,requests,resolve:movie=>new Promise(done=>c.getLocalizedTitleAsync(movie,done))};
}
const translation=(language,name,type='movie',country='US')=>({iso_639_1:language,iso_3166_1:country,data:{[type==='tv'?'name':'title']:name}});
const response=(items,extra={})=>({title:'Девятые врата',original_title:'The Ninth Gate',translations:{translations:items},...extra});
test('official Ukrainian title takes priority over English and provider title',async()=>{const f=titleFixture(),p=f.resolve({id:1,title:'Девятые врата'});f.requests[0].success(response([translation('en','The Ninth Gate'),translation('uk',"Дев’ята брама")]));assert.equal(await p,'Дев’ята брама');});
test('Ukraine country does not turn Russian translation into Ukrainian',async()=>{const f=titleFixture(),p=f.resolve({id:1});f.requests[0].success(response([translation('ru','Девятые врата','movie','UA'),translation('en','The Ninth Gate')]));assert.equal(await p,'The Ninth Gate');});
test('missing Ukrainian translation falls back to English before original language',async()=>{const f=titleFixture(),p=f.resolve({id:1});f.requests[0].success(response([translation('en','English title')],{original_title:'Titre original'}));assert.equal(await p,'English title');});
test('without confirmed translations use original, never guess language from country',async()=>{const f=titleFixture(),p=f.resolve({id:1});f.requests[0].success(response([]));assert.equal(await p,'The Ninth Gate');});
test('TV/anime names use the same explicit translation policy',async()=>{const f=titleFixture(),p=f.resolve({id:2,media_type:'tv',first_air_date:'2020-01-01'});assert.equal(f.requests[0].path,'tv/2');f.requests[0].success(response([translation('uk','Українська назва','tv')],{original_name:'Original show'}));assert.equal(await p,'Українська назва');});
test('explicit anime type uses TV title lookup rather than the movie with the same ID',async()=>{const f=titleFixture(),p=f.resolve({id:6,type:'anime'});assert.equal(f.requests[0].path,'tv/6');f.requests[0].success(response([translation('uk','Назва аніме','tv')]));assert.equal(await p,'Назва аніме');});
test('empty or malformed translation entries are ignored in favor of valid later entries',()=>{const f=titleFixture();assert.equal(f.c.pickDisplayTitle(response([translation('uk',{}),translation('uk',''),translation('uk','Валідна назва')]),'movie'),'Валідна назва');assert.equal(f.c.pickDisplayTitle({translations:'broken',original_title:'Original'},'movie'),'Original');});
test('API failure retains available original title and leaves source metadata unchanged',async()=>{const f=titleFixture(),movie={id:3,title:'Девятые врата',original_title:'The Ninth Gate'},before=JSON.stringify(movie),p=f.resolve(movie);f.requests[0].error();assert.equal(await p,'The Ninth Gate');assert.equal(JSON.stringify(movie),before);});
test('no alternate metadata retains existing display text instead of blanking it',async()=>{const f=titleFixture(),p=f.resolve({id:4,title:'Provider title'});f.requests[0].error();assert.equal(await p,'Provider title');});
test('old title cache is ignored and new cache keeps movie and TV IDs separate',async()=>{const f=titleFixture();f.values['ifx_tmdb_ua_title_v1.7:movie:5']=JSON.stringify({t:Date.now(),v:'Old Russian title'});let p=f.resolve({id:5});f.requests[0].success(response([translation('uk','Фільм')]));assert.equal(await p,'Фільм');p=f.resolve({id:5,media_type:'tv'});assert.equal(f.requests.length,2);f.requests[1].success(response([translation('uk','Серіал','tv')]));assert.equal(await p,'Серіал');});

function translatorFixture(){
 const values={},calls=[];let now=1000000,respond=async()=>({text:'Переклад'});
 const c={Map,Promise,Date:{now:()=>now},window:{},Lampa:{Storage:{get:k=>values[k],set:(k,v)=>values[k]=v}}};c.window.Lampa=c.Lampa;
 vm.createContext(c);vm.runInContext(translate.slice(translate.indexOf('    var DefaultSettings'),translate.indexOf('    function scanAndTranslate(')),c);
 c.backends=[{id:'fixture',parse:r=>r.text}];c.sendRequest=async(...args)=>{calls.push(args);return respond(...args)};
 return{c,values,calls,respond:fn=>respond=fn,tick:ms=>now+=ms};
}
const ru='Девятые врата';
test('backend failure is not cached as a confirmed translation; retry is bounded and recovers',async()=>{const f=translatorFixture();f.respond(async()=>{throw Error('offline')});assert.equal(await f.c.doTranslate(ru),ru);assert(!f.c.memoryCache.has(ru));await f.c.doTranslate(ru);assert.equal(f.calls.length,1);f.tick(30001);f.respond(async()=>({text:'Дев’ята брама'}));assert.equal(await f.c.doTranslate(ru),'Дев’ята брама');assert.equal(f.calls.length,2);});
test('unchanged backend output cannot poison the successful translation cache',async()=>{const f=translatorFixture();f.respond(async()=>({text:ru}));await f.c.doTranslate(ru);assert(!f.c.memoryCache.has(ru));assert.equal(Object.keys(f.values).length,0);});
test('malformed or unchanged legacy persisted translations are retried',async()=>{for(const cached of [{error:true},ru]){const f=translatorFixture();f.values['ytrans_'+f.c.hashStr(ru)]=cached;assert.equal(await f.c.doTranslate(ru),'Переклад');assert.equal(f.calls.length,1);}});
test('parallel translations share one request and successful cache avoids another request',async()=>{const f=translatorFixture();let done;f.respond(()=>new Promise(resolve=>done=resolve));const a=f.c.doTranslate(ru),b=f.c.doTranslate(ru);assert.equal(f.calls.length,1);done({text:'Дев’ята брама'});assert.equal(await a,await b);await f.c.doTranslate(ru);assert.equal(f.calls.length,1);});
function element(text){const data={},attrs={},node={isConnected:true};return{0:node,length:1,closest:()=>({length:0}),text(value){if(arguments.length){text=value;return this}return text},data(k,v){if(arguments.length>1){data[k]=v;return this}return data[k]},attr(k,v){if(arguments.length>1){attrs[k]=v;return this}return attrs[k]},removeAttr(k){delete attrs[k];return this},addClass(){return this},removeClass(){return this}};}
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve()};
test('late translation cannot overwrite a title replaced by another metadata response',async()=>{const f=translatorFixture(),el=element(ru);let done;f.respond(()=>new Promise(r=>done=r));f.c.processElement(el,'title');el.text('Another movie');done({text:'Дев’ята брама'});await flush();assert.equal(el.text(),'Another movie');assert.notEqual(el.attr('data-ytrans-done'),'1');});
test('failed DOM translation stays retryable after cooldown rather than permanently marked done',async()=>{const f=translatorFixture(),el=element(ru);f.respond(async()=>{throw Error('offline')});f.c.processElement(el,'title');await flush();assert.notEqual(el.attr('data-ytrans-done'),'1');f.tick(30001);f.respond(async()=>({text:'Дев’ята брама'}));f.c.processElement(el,'title');await flush();assert.equal(el.text(),'Дев’ята брама');assert.equal(el.attr('data-ytrans-done'),'1');});
test('detached title nodes are not modified by a late response',async()=>{const f=translatorFixture(),el=element(ru);el[0].isConnected=false;f.c.processElement(el,'title');await flush();assert.equal(el.text(),ru);});
