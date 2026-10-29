'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../ui/torrent-cinema/runtime.js','utf8');
function slice(from,to){return source.slice(source.indexOf(from),source.indexOf(to));}
function selectFixture(){
    const focused=[],oldNode={classList:{remove(){}},style:{getPropertyValue:()=>'',removeProperty(){},setProperty(){}}};
    let controller='select';const toggles=[];const context={Lampa:{Select:{opened:()=>false,render:()=>[oldNode]},Controller:{enabled:()=>({name:controller}),toggle:name=>{controller=name;toggles.push(name);}}},streamAlive:()=>true,streamFocus:(state,node)=>focused.push([state,node])};
    vm.createContext(context);vm.runInContext(slice('    var streamSelectOwner=null','    function setupStreamTools('),context);
    const state={selectNode:oldNode,selectTokens:{},wantFocus:true,last:{id:'last'}};context.streamSelectOwner=state;
    return{context,state,oldNode,focused,toggles,controller:()=>controller};
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
    assert.deepEqual(f.toggles,['sh_movie_streams']);assert.equal(f.controller(),'sh_movie_streams');assert.equal(f.focused.length,1);assert.equal(f.focused[0][0],f.state);assert.equal(f.focused[0][1],f.state.last);
});
test('native Select close never steals focus from a newly opened Player or Files controller',()=>{
    const f=selectFixture();f.context.onStreamSelectHide();f.context.Lampa.Controller.enabled=()=>({name:'player'});f.context.onStreamSelectClose();
    assert.deepEqual(f.toggles,[]);assert.equal(f.focused.length,0);
});
test('Files close keeps release selection armed until native Loading/player/Back lifecycle events arrive',()=>{
    const calls=[],record={selectionArmed:true,streamStage:'files'},context={metadata:{overlayState:()=>null,clearFileRatings(){}},streamRecord:()=>record,clearStreamFiles(){calls.push('files')},clearNativeSurfaces(_r,name){calls.push(name)},setTimeout(){throw Error('Files close must not race native Loading with a zero-delay timer')}};
    vm.createContext(context);vm.runInContext(slice('    function onFilesClose()','    function start()'),context);context.onFilesClose();
    assert.equal(record.selectionArmed,true);assert.deepEqual(calls,['files','tc-native-torrent-modal']);
});
test('Files surface never inherits Player layer while the native player stage is active',()=>{
    const classes=new Set(),record={selectionArmed:true,streamStage:'player',nativeSurfaces:[]},node={classList:{add:name=>classes.add(name)},querySelector:()=>({})};
    const context={markNativeSurface(r,n,name){n.classList.add(name);r.nativeSurfaces.push({node:n,className:name});}};
    vm.createContext(context);vm.runInContext(slice('    function ownStreamFilesSurface(','    function onStreamFiles('),context);context.ownStreamFilesSurface(record,node);
    assert(classes.has('tc-native-torrent-modal'));assert.equal(classes.has('tc-native-player'),false);assert.equal(record.streamStage,'player');
});
test('Loading to Player transition clears Loading ownership using the previous stage',()=>{
    const calls=[],record={page:{classList:{contains:()=>true}},streamPane:{},selectionArmed:true,streamStage:'loading',streamFocused:false};
    const context={movieRecords:[record],streamSelectRestore:null,Lampa:{Select:{opened:()=>false},Controller:{enabled:()=>({name:'player',controller:{}})}},stopWatchingSurfaces:r=>calls.push(['stop',r]),clearNativeSurfaces:(r,name)=>calls.push(['clear',name]),watchTransitionSurfaces:(r)=>calls.push(['watch',r.streamStage]),streamAlive:()=>true,streamFocus(){},streamInfo(){},streamActivate(){},streamRecord:()=>record};
    vm.createContext(context);vm.runInContext(slice('    function onStreamController(','    function schedule()'),context);context.onStreamController({name:'player'});
    assert.equal(record.streamStage,'player');assert.deepEqual(calls.map(x=>x[0]==='clear'?x:['stop','watch'].includes(x[0])?[x[0],x[1]===record?'record':x[1]]:x),[['watch','player'],['stop','record'],['clear','tc-native-loading']]);
});
test('parser Settings opened from the stream are raised above the overlay and released on return',()=>{
    const classes=new Set(),settings={classList:{add:n=>classes.add(n),remove:n=>classes.delete(n)}},record={page:{classList:{contains:()=>true}},streamPane:{},streamFocused:true,streamView:{isOpen:()=>true},streamStage:'filter',nativeSurfaces:[],streamChild:{wantFocus:true}};let activated=0;
    const context={movieRecords:[record],streamSelectRestore:null,document:{querySelectorAll:s=>s==='.settings'?[settings]:[]},markNativeSurface(r,n,c){n.classList.add(c);r.nativeSurfaces.push({node:n,className:c});},clearNativeSurfaces(r,c){r.nativeSurfaces=r.nativeSurfaces.filter(i=>{if(i.className===c)i.node.classList.remove(c);return i.className!==c;});},streamAlive:()=>true,streamActivate:()=>activated++,Lampa:{Select:{opened:()=>false},Controller:{enabled:()=>({name:'settings_component',controller:{}})}}};
    vm.createContext(context);vm.runInContext(slice('    function onStreamController(','    function schedule()'),context);context.onStreamController({name:'settings_component'});
    assert(classes.has('tc-native-settings'));
    context.onStreamController({name:'head'});assert.equal(classes.has('tc-native-settings'),false);assert.equal(activated,1,'Back from Settings restores the open Torrent controller');
    const css=fs.readFileSync(__dirname+'/../ui/torrent-cinema/style.css','utf8');assert.match(css,/\.tc-native-settings\{z-index:110!important\}/);
});
test('result status distinguishes raw all-season totals from a loaded native season-filtered list',()=>{
    const context={window:{TorrentsRedesign:{selectedTrackerFilter:()=> 'all'}}};vm.createContext(context);vm.runInContext(slice('    function streamResultStatus(','    function streamSession('),context);
    const season1={record:{kind:'tv'},params:{season:0},total:142,rows:Array(14),displayRows:Array(14),child:{getFilterData:()=>({season:['1'],quality:[]})}};
    const allSeasons={record:{kind:'tv'},params:{season:0},total:142,rows:Array(14),displayRows:Array(14),child:{getFilterData:()=>({season:[],quality:[]})}};
    const filtered=context.streamResultStatus(season1),progressive=context.streamResultStatus(allSeasons);
    assert.match(filtered,/Знайдено загалом: 142/);assert.match(filtered,/сезон S01: завантажено 14/);assert.doesNotMatch(filtered,/14 із 142/);
    assert.match(progressive,/Знайдено загалом: 142/);assert.match(progressive,/завантажено 14 із 142/);
});
test('movie result status ignores a stale native season filter',()=>{
    const context={window:{TorrentsRedesign:{selectedTrackerFilter:()=> 'all'}}};vm.createContext(context);vm.runInContext(slice('    function streamResultStatus(','    function streamSession('),context);
    const status=context.streamResultStatus({record:{kind:'movie'},total:7,rows:Array(2),displayRows:Array(2),audioCategory:'ua',child:{getFilterData:()=>({season:['1'],quality:[]})}});
    assert.equal(status,'Знайдено загалом: 7 · озвучка UA: завантажено 2');assert.doesNotMatch(status,/сезон/);
});
test('season status reports raw parser total, selected audio, and actual visible count including zero',()=>{
 const context={window:{TorrentsRedesign:{selectedTrackerFilter:()=> 'all'}}};vm.createContext(context);vm.runInContext(slice('    function streamResultStatus(','    function streamSession('),context);
 const state={record:{kind:'tv'},params:{season:8},total:5,rawTotal:23,displayRows:[{_tcSeasonGroup:'season'},{_tcSeasonGroup:'season'},{_tcSeasonGroup:'collection'}]};assert.equal(context.streamResultStatus(state),'Парсер знайшов: 23 · S08: 2 · колекції: 1 · UA: 3 видимих');state.audioCategory='en';assert.match(context.streamResultStatus(state),/EN: 3 видимих$/);state.displayRows=[];state.total=0;assert.match(context.streamResultStatus(state),/Парсер знайшов: 23 · S08: 0 · колекції: 0 · EN: 0 видимих$/);
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
