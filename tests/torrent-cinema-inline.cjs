'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../ui/torrent-cinema/runtime.js','utf8');
function extract(name){const start=source.indexOf('    function '+name+'('),end=source.indexOf('\n    function ',start+15);assert(start>=0);return source.slice(start,end);}
function fixture(){
    const details={hidden:true},info={attrs:{},setAttribute(k,v){this.attrs[k]=v;},closest:()=>row},row={querySelector:s=>s==='.tc-details'?details:s==='.tc-info'?info:null},record={streamView:{isOpen:()=>true}},st={record,root:{querySelector:()=>null},child:{},wantFocus:true};record.streamChild=st;
    let controller,closed=0;const context={streamAlive:()=>true,streamFocus:(state,node)=>state.last=node,closeStreamOverlay:()=>closed++,Lampa:{Controller:{add:(name,methods)=>controller=methods,toggle(){}}}};
    vm.createContext(context);vm.runInContext(['collapseInline','toggleInline','inlineEnter','streamActivate'].map(extract).join('\n'),context);
    return {context,st,record,row,details,info,get controller(){return controller;},get closed(){return closed;}};
}
test('only explicit info expands; ordinary row OK remains native and no inline Files action exists',()=>{
    const f=fixture();let stopped=0;
    assert.equal(f.context.inlineEnter(f.st,{target:{closest:()=>null}}),false);
    assert.equal(f.details.hidden,true);
    assert.equal(f.context.inlineEnter(f.st,{target:{closest:()=>f.info},stopImmediatePropagation(){stopped++;}}),true);
    assert.equal(stopped,1);assert.equal(f.details.hidden,false);assert.equal(f.info.attrs['aria-expanded'],'true');
    assert.equal(f.st.last,f.info);
    const view=fs.readFileSync(__dirname+'/../ui/torrent-cinema/view.js','utf8');assert(!view.includes('tc-open-files'),'owner removed the right-hand Files button from expanded details');
});
test('native controller Back collapses details first, then closes the popup',()=>{
    const f=fixture();f.context.toggleInline(f.st,f.row);f.context.streamActivate(f.record);
    f.controller.back();assert.equal(f.details.hidden,true);assert.equal(f.st.last,f.row);assert.equal(f.closed,0);
    f.controller.back();assert.equal(f.closed,1);assert.equal(f.info.attrs['aria-expanded'],'false');
});
