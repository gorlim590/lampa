'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../ui/torrent-cinema/runtime.js','utf8');
function slice(from,to){return source.slice(source.indexOf(from),source.indexOf(to));}
function selectFixture(){
    const focused=[],oldNode={classList:{remove(){}},style:{getPropertyValue:()=>'',removeProperty(){},setProperty(){}}};
    const context={Lampa:{Select:{opened:()=>false,render:()=>[oldNode]},Controller:{enabled:()=>({name:'sh_movie_streams'})}},streamAlive:()=>true,streamFocus:(state,node)=>focused.push([state,node])};
    vm.createContext(context);vm.runInContext(slice('    var streamSelectOwner=null','    function setupStreamTools('),context);
    const state={selectNode:oldNode,selectTokens:{},wantFocus:true,last:{id:'last'}};context.streamSelectOwner=state;
    return{context,state,oldNode,focused};
}
test('native Select hide releases ownership synchronously even while a replacement menu remains open',()=>{
    const f=selectFixture();f.context.onStreamSelectHide();
    assert.equal(f.context.streamSelectOwner,null);assert.equal(f.context.streamSelectRestore.state,f.state);
    const replacement={};f.context.Lampa.Select.opened=()=>true;f.context.Lampa.Select.render=()=>[replacement];
    f.context.onStreamSelectClose();
    assert.equal(f.context.streamSelectRestore,null);assert.equal(f.focused.length,0,'closing one menu must not focus behind the next menu');
});
test('native Select close restores overlay focus only after the same menu is closed',()=>{
    const f=selectFixture();f.context.onStreamSelectHide();f.context.onStreamSelectClose();
    assert.equal(f.focused.length,1);assert.equal(f.focused[0][0],f.state);assert.equal(f.focused[0][1],f.state.last);
});
test('Files close keeps release selection armed until native Loading/player/Back lifecycle events arrive',()=>{
    const calls=[],record={selectionArmed:true,streamStage:'files'},context={metadata:{overlayState:()=>null,clearFileRatings(){}},streamRecord:()=>record,clearStreamFiles(){calls.push('files')},clearNativeSurfaces(_r,name){calls.push(name)},setTimeout(){throw Error('Files close must not race native Loading with a zero-delay timer')}};
    vm.createContext(context);vm.runInContext(slice('    function onFilesClose()','    function start()'),context);context.onFilesClose();
    assert.equal(record.selectionArmed,true);assert.deepEqual(calls,['files','tc-native-torrent-modal']);
});
function loadingFixture(initial=[]){
    let observer=null,timer=null,disconnected=0,cleared=0;const nodes=initial.slice();
    class Observer{constructor(fn){this.fn=fn;observer=this;}observe(){}disconnect(){disconnected++;observer=null;}}
    const context={document:{body:{},querySelectorAll:selector=>selector==='.loading-layer,.media-loading--standalone'?nodes:[]},MutationObserver:Observer,setTimeout(fn,ms){timer={fn,ms};return timer;},clearTimeout(){cleared++;timer=null;},markNativeSurface(record,node,className){node.classList.add(className);record.nativeSurfaces.push({node,className});},scanUnused:null};
    vm.createContext(context);vm.runInContext(slice('    function scanTransitionSurfaces(','    function streamRecord()'),context);
    return{context,nodes,get observer(){return observer;},get timer(){return timer;},disconnected:()=>disconnected,cleared:()=>cleared};
}
function surface(){const classes=new Set();return{classList:{add:n=>classes.add(n),remove:n=>classes.delete(n),contains:n=>classes.has(n)}};}
test('generic native Loading surface is found after its delayed insertion and observation ends before long loading',()=>{
    const f=loadingFixture(),record={selectionArmed:true,streamStage:'loading',nativeSurfaces:[]};f.context.watchTransitionSurfaces(record);
    assert.equal(f.timer.ms,1500);const layer=surface();f.nodes.push(layer);f.observer.fn([]);
    assert(layer.classList.contains('tc-native-loading'));assert.equal(f.observer,null);assert.equal(f.disconnected(),1);assert.equal(f.cleared(),1);
    // The native Loading controller can remain active for minutes; no observer
    // remains after the delayed surface is styled.
    assert.equal(record.nativeSurfaces.length,1);
});
test('synchronous media Loading surface needs no observer and cancellation disconnects a pending generic observer',()=>{
    const layer=surface(),immediate=loadingFixture([layer]),record={selectionArmed:true,streamStage:'loading',nativeSurfaces:[]};immediate.context.watchTransitionSurfaces(record);
    assert(layer.classList.contains('tc-native-loading'));assert.equal(immediate.observer,null);
    const cancelled=loadingFixture(),pending={selectionArmed:true,streamStage:'loading',nativeSurfaces:[]};cancelled.context.watchTransitionSurfaces(pending);assert(cancelled.observer);cancelled.context.stopWatchingSurfaces(pending);
    assert.equal(cancelled.observer,null);assert.equal(cancelled.disconnected(),1);assert.equal(cancelled.timer,null);assert.equal(cancelled.cleared(),1);
});
