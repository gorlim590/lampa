'use strict';
const vm=require('vm'),fs=require('fs'),assert=require('assert');
const code=fs.readFileSync('ui/stremio-hybrid.js','utf8');
function fixture(){const nodes=[],events={},listeners=[],params=[],data={},classes=new Set();
const document={readyState:'loading',body:{classList:{toggle:(s,on)=>on?classes.add(s):classes.delete(s)}},head:{appendChild:n=>nodes.push(n)},createElement:()=>({remove(){nodes.splice(nodes.indexOf(this),1);}}),addEventListener:(t,f)=>events[t]=f,removeEventListener:(t,f)=>{if(events[t]===f)delete events[t];}};
const Lampa={Storage:{get:(k,d)=>k in data?data[k]:d,set:(k,v)=>data[k]=v},Listener:{follow:(t,f)=>listeners.push(f),remove:(t,f)=>{const i=listeners.indexOf(f);if(i>=0)listeners.splice(i,1);}},SettingsApi:{getParam:()=>params,addParam:p=>params.push(p)}};
const ctx={document,Lampa};ctx.window=ctx;vm.createContext(ctx);return {ctx,nodes,events,listeners,params,data,classes,load:()=>vm.runInContext(code,ctx)};}
const a=fixture();a.load();assert.equal(a.listeners.length,1);a.load();assert.equal(a.listeners.length,1);a.ctx.StremioHybrid.destroy();assert.equal(a.listeners.length,0);assert.equal(Object.keys(a.events).length,0);assert.equal(a.nodes.length,0);
a.load();a.ctx.appready=true;for(const f of [...a.listeners])f({type:'ready'});assert.equal(a.listeners.length,0);assert.equal(a.nodes.length,1);assert.equal(a.params.length,1);
for(let i=0;i<10;i++){a.ctx.StremioHybrid.destroy();a.load();assert.equal(a.nodes.length,1);assert.equal(a.params.length,1);assert.equal(a.listeners.length,0);}
for(const value of [false,'false',0,'0']){a.data.stremio_hybrid_enabled=value;a.ctx.StremioHybrid.refresh();assert.equal(a.nodes.length,0);}
a.data.stremio_hybrid_enabled=true;a.params[0].onChange();assert.equal(a.nodes.length,1);a.ctx.StremioHybrid.setEnabled(false);assert.equal(a.nodes.length,0);assert.equal(a.classes.has('stremio-hybrid'),false);
console.log('PASS: early ready, cancel pending ready, duplicate load, 10 destroy/reinit cycles, one settings registration, disabled values, native settings callback; no jQuery required.');
