'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

test('new-category Info keeps native Back and opens its owner panel once',()=>{
 const source=fs.readFileSync(__dirname+'/../community/new-category.js','utf8');
 const marker='Lampa.SettingsApi.addParam({\n        component: \'addCategory\',\n        param: {\n          name: "ncInfo"';
 const start=source.indexOf(marker);
 assert(start>=0,'Info registration must remain discoverable in its owner source');
 const end=source.indexOf('\n      });',start);
 assert(end>start,'Info registration must have a complete addParam call');
 const calls=[];
 const nativeBack=()=>calls.push('native-back');
 const controller={back:nativeBack};
 const Lampa={
  Lang:{translate:key=>key},
  SettingsApi:{addParam(definition){this.definition=definition;}},
  Settings:{create(name){calls.push(name);}},
  Controller:{enabled(){return {controller};}}
 };
 vm.runInNewContext(source.slice(start,end+'\n      });'.length),{Lampa});
 const definition=Lampa.SettingsApi.definition;
 assert.equal(typeof definition.onRender,'function');
 let enter;
 definition.onRender({show(){},on(event,handler){assert.equal(event,'hover:enter');enter=handler;}});
 enter();
 assert.deepEqual(calls,['ncInfo']);
 assert.equal(controller.back,nativeBack,'opening Info must not replace native controller Back');
 controller.back();
 assert.deepEqual(calls,['ncInfo','native-back'],'Back must delegate to the native panel transition');
});
