'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../audit/ui/startup-probe.js','utf8');
test('Bounded startup diagnostics strip resource queries, classify failures without payloads and clean every owned hook',()=>{
 const docEvents={},windowEvents={},nodes=[];let disconnects=0,cleared=0;
 const node={textContent:'',setAttribute(){},contains:()=>false};
 const document={documentElement:{appendChild:n=>nodes.push(n)},body:{classList:{contains:()=>false}},createElement:()=>node,querySelectorAll:()=>[],querySelector:()=>null,addEventListener:(name,fn)=>docEvents[name]=fn,removeEventListener:name=>delete docEvents[name]};
 const performance={now:()=>123,timeOrigin:1000,getEntriesByType:kind=>kind==='resource'?[{name:'https://cdn.jsdelivr.net/gh/gorlim590/lampa@fixture/ui/stremio-hybrid.js?private=fixture-secret',initiatorType:'script',transferSize:10,startTime:1,responseEnd:2}]:[]};
 const window={performance,appready:false,addEventListener:(name,fn)=>windowEvents[name]=fn,removeEventListener:name=>delete windowEvents[name]};
 const context={window,document,URL,requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},setTimeout:()=>1,clearTimeout:()=>cleared++,MutationObserver:function(){this.observe=()=>{};this.disconnect=()=>disconnects++;}};
 vm.runInNewContext(source,context);assert.equal(nodes.length,1);assert(docEvents.keydown&&windowEvents.error);
 windowEvents.error({target:{tagName:'IMG'},filename:'https://private.invalid/account/fixture-secret'});
 windowEvents.error({error:{name:'TypeError'},message:'fixture-secret',lineno:10});
 const report=JSON.parse(node.textContent);assert.equal(report.schema,4);assert.equal(report.uiResources.length,1);assert(!JSON.stringify(report).includes('fixture-secret'));assert.equal(report.errors[0].kind,'resource');assert.equal(report.errors[1].kind,'exception');
 window.LampaStartupProbe.stop();window.LampaStartupProbe.stop();assert.equal(disconnects,1);assert.equal(cleared,1);assert.deepEqual(Object.keys(docEvents),[]);assert.deepEqual(Object.keys(windowEvents),[]);
});
