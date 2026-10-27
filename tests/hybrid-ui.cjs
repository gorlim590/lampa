'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/../ui/stremio-hybrid.js','utf8');
function fixture(){
 const buttons=[],classes=new Set(),handlers=new Map();
 const root={classList:{toggle:(k,on)=>on?classes.add(k):classes.delete(k),remove:k=>classes.delete(k)},querySelector:()=>({appendChild:()=>{throw Error('Description must not enter primary action row')}})};
 const $=node=>({on:(key,fn)=>handlers.set(node,fn),off:()=>{handlers.delete(node);return{remove:()=>buttons.splice(buttons.indexOf(node),1)}}});
 const context={document:{createElement:()=>({isConnected:true,attrs:{},setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]}})},$};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('    function setupDescription('),source.indexOf('    function plainDescription(')),context);
 return{context,root,buttons,classes,handlers,description:{insertAdjacentElement:(where,node)=>{assert.equal(where,'afterend');buttons.push(node)}},record:{root}};
}
test('each description starts collapsed and repeated adaptation adds one native action',()=>{const f=fixture();f.context.setupDescription(f.record,f.description);f.context.setupDescription(f.record,f.description);assert.equal(f.buttons.length,1);assert.equal(f.handlers.size,1);assert.equal(f.buttons[0].getAttribute('aria-expanded'),'false');assert.equal(f.classes.has('sh-description-expanded'),false);});
test('description action is outside ButtonsPlus generic movie-action rewriting',()=>{const f=fixture();f.context.setupDescription(f.record,f.description);assert(!f.buttons[0].className.split(' ').includes('full-start__button'));assert(f.buttons[0].className.split(' ').includes('selector'));});
test('native enter toggles inline expansion without replacing text or changing focus',()=>{const f=fixture();f.context.setupDescription(f.record,f.description);const button=f.buttons[0],enter=f.handlers.get(button);enter();assert.equal(button.getAttribute('aria-expanded'),'true');assert.equal(button.textContent,'Показати менше');assert(f.classes.has('sh-description-expanded'));enter();assert.equal(button.textContent,'Показати більше');assert.equal(button.getAttribute('aria-expanded'),'false');});
test('theme cleanup removes the exact action/handler and reactivation is collapsed',()=>{const f=fixture();f.context.setupDescription(f.record,f.description);f.handlers.get(f.buttons[0])();f.context.clearDescription(f.record);assert.equal(f.buttons.length,0);assert.equal(f.handlers.size,0);assert.equal(f.record.descriptionToggle,null);assert(!f.classes.has('sh-description-expanded'));f.context.setupDescription(f.record,f.description);assert.equal(f.buttons[0].getAttribute('aria-expanded'),'false');});
test('description state is owned by one detail instance, not shared by media type',()=>{const f=fixture(),other={root:f.root};f.context.setupDescription(f.record,f.description);f.context.setupDescription(other,f.description);f.handlers.get(f.record.descriptionToggle)();assert.equal(other.descriptionToggle.getAttribute('aria-expanded'),'false');});
test('profile Select never inherits the focused torrent filter surface',()=>{let cleared=0;const context={menuOpen:true,clearStreamSelect:()=>cleared++};vm.createContext(context);vm.runInContext(source.slice(source.indexOf('    function onStreamSelect('),source.indexOf('    function setupStreamTools(')),context);context.onStreamSelect({});assert.equal(cleared,1);});

function nativeReadinessFixture(max=3){
 const timers=new Map(),listeners=[];let id=0,prepared=0,removed=0;
 const context={window:{appready:false},ready:false,destroyed:false,waiting:false,nativeWaitTimer:0,nativeWaitAttempts:0,NATIVE_WAIT_MS:100,NATIVE_WAIT_MAX:max,bootStats:{},document:{removeEventListener(){},addEventListener(){}},setTimeout(fn,ms){const key=++id;timers.set(key,{fn,ms});return key;},clearTimeout(key){timers.delete(key);},prepareShell(){prepared++;},init(){context.ready=true;context.stopWaiting();}};
 Object.defineProperty(context,'Lampa',{get(){return context.window.Lampa;}});
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('    function stopWaiting()'),source.indexOf('    function init()')),context);
 return{context,timers,listeners,prepared:()=>prepared,removed:()=>removed,install(){context.window.Lampa={SettingsApi:{},Listener:{follow(name,fn){listeners.push({name,fn});},remove(name,fn){removed++;const i=listeners.findIndex(x=>x.name===name&&x.fn===fn);if(i>=0)listeners.splice(i,1);}},Storage:{get(){return true;}}};},tick(){const entry=[...timers.entries()][0];assert(entry,'Expected one pending bounded readiness timer');timers.delete(entry[0]);entry[1].fn();}};
}

test('Hybrid loaded before Lampa API recovers after DOM readiness and subscribes once',()=>{
 const f=nativeReadinessFixture();f.context.checkNativeReadiness();
 assert.equal(f.context.ready,false);assert.equal(f.prepared(),1);assert.equal(f.timers.size,1);
 f.install();f.tick();
 assert.equal(f.listeners.length,1);assert.equal(f.context.waiting,true);assert.equal(f.timers.size,1);
 f.context.window.appready=true;f.listeners[0].fn({type:'ready'});
 assert.equal(f.context.ready,true);assert.equal(f.removed(),1);assert.equal(f.timers.size,0);
 f.context.checkNativeReadiness();assert.equal(f.listeners.length,0,'readiness completion cannot subscribe again');
});

test('Hybrid late native API wait terminates at its configured bound',()=>{
 const f=nativeReadinessFixture(2);f.context.checkNativeReadiness();f.tick();
 assert.equal(f.context.bootStats.nativeReadinessTimedOut,true);assert.equal(f.context.nativeWaitTimer,0);assert.equal(f.timers.size,0);
});

test('a replaced action bar releases its detached handler before rebuilding',()=>{const f=fixture();f.context.setupDescription(f.record,f.description);const old=f.record.descriptionToggle;old.isConnected=false;f.context.setupDescription(f.record,f.description);assert.notEqual(f.record.descriptionToggle,old);assert(!f.handlers.has(old));assert.equal(f.handlers.size,1);assert.equal(f.record.descriptionToggle.getAttribute('aria-expanded'),'false');});

function focusFixture(){const torrent={classList:{contains:x=>x==='view--torrent'}},other={classList:{contains:()=>false}},root={current:null,querySelector(){return this.current},contains:n=>[torrent,other].includes(n)},link={last:null},controller={name:'full_start',controller:{link}},calls=[],c={Lampa:{Controller:{enabled:()=>controller,collectionSet(){},collectionFocus:n=>{calls.push(n);root.current=n}}}};vm.createContext(c);vm.runInContext(source.slice(source.indexOf('    function focusMovieActions('),source.indexOf('    function movieButtonFocus(')),c);return{c,root,link,controller,calls,torrent,other,record:{root}};}
test('initial focus prefers actual available Torrent action even when it is not first, without activation',()=>{const f=focusFixture();f.c.focusMovieActions(f.record,[f.other,f.torrent]);assert.equal(f.calls[0],f.torrent);assert.equal(f.link.last,f.torrent);assert.equal(f.record.initialFocusDone,true);});
test('later adaptation and Back preserve an existing action focus instead of resetting to Torrents',()=>{const f=focusFixture();f.c.focusMovieActions(f.record,[f.torrent,f.other]);f.root.current=f.other;f.link.last=f.other;f.c.focusMovieActions(f.record,[f.torrent,f.other]);assert.equal(f.calls.length,1);assert.equal(f.root.current,f.other);});
test('modal/content controllers are not hijacked and missing torrent keeps a native visible fallback',()=>{const f=focusFixture();f.controller.name='content';f.c.focusMovieActions(f.record,[f.torrent]);assert.equal(f.calls.length,0);f.controller.name='full_start';f.c.focusMovieActions(f.record,[]);assert.equal(f.record.initialFocusDone,undefined);f.c.focusMovieActions(f.record,[f.other]);assert.equal(f.calls[0],f.other);});
test('synopsis presentation has no copied selectors, tabindex, click handlers or dialog; original node is restorable',()=>{const original={textContent:'Опис українською\nДовгий другий рядок',nativeHandler:()=>{},classList:{contains:()=>false},matches:()=>true,hasAttribute:()=>false},parent={child:original,replaceChild(next,old){assert.equal(this.child,old);this.child=next;next.parentNode=this;old.parentNode=null}};original.parentNode=parent;const c={document:{createElement:()=>({attrs:{},setAttribute(k,v){this.attrs[k]=v},hasAttribute(k){return k in this.attrs}})}};vm.createContext(c);vm.runInContext(source.slice(source.indexOf('    function plainDescription('),source.indexOf('    function focusMovieActions(')),c);const record={},plain=c.plainDescription(record,original);assert.equal(parent.child,plain);assert.equal(plain.textContent,original.textContent);assert.equal(plain.className,'full-descr__text');assert.equal(plain.attrs.tabindex,undefined);assert.equal(plain.nativeHandler,undefined);assert.equal(record.plainDescriptions[0].original.nativeHandler,original.nativeHandler);c.record=record;vm.runInContext(source.split('\n').find(l=>l.includes('(record.plainDescriptions||[]).forEach')),c);assert.equal(parent.child,original);assert.equal(record.plainDescriptions.length,0);});

test('primary action row retains native scrolling after description action moves below the synopsis',()=>{const button={classList:{contains:()=>false},getAttribute:()=>null,textContent:'Онлайн',getBoundingClientRect:()=>({left:270,right:410})},row={scrollLeft:0,contains:()=>true,setAttribute(){},getBoundingClientRect:()=>({left:0,right:300})},c={};vm.createContext(c);vm.runInContext(source.slice(source.indexOf('    function movieButtonFocus('),source.indexOf('    function ratingFallback(')),c);c.movieButtonFocus({currentTarget:row,target:{closest:selector=>selector.includes('full-start__button')?button:null}});assert.equal(row.scrollLeft,118);});
test('Up from every native action visits personal rating before delegating to the header',()=>{let onAction=true,up=0;const rating={getClientRects:()=>[{}]},focuses=[],controller={link:{},up:()=>up++},root={isConnected:true,querySelector:s=>s.includes('buttons')?(onAction?{}:null):rating},record={root};const c={Lampa:{Controller:{collectionSet:()=>{},collectionFocus:n=>focuses.push(n)}}};vm.createContext(c);vm.runInContext(source.slice(source.indexOf('    function bindRatingNavigation('),source.indexOf('    function movieButtonFocus(')),c);c.bindRatingNavigation(record,controller);const wrapper=controller.up;c.bindRatingNavigation(record,controller);assert.equal(controller.up,wrapper);controller.up();assert.equal(focuses[0],rating);assert.equal(controller.link.last,rating);assert.equal(up,0);onAction=false;controller.up();assert.equal(up,1);root.isConnected=false;onAction=true;controller.up();assert.equal(up,2);});

test('Native menu controller expands the existing sidebar and leaving it restores the compact rail',()=>{
 const classes=new Set(),context={document:{body:{classList:{toggle:(name,on)=>on?classes.add(name):classes.delete(name)}}},movieRecords:[],Lampa:{}};
 const sync=source.match(/    function syncNavigationState\(name\) \{[\s\S]*?\n    \}/)[0];
 const start=source.indexOf('    function onStreamController(event) {'),end=source.indexOf('    function onStreamProfile(',start);
 vm.createContext(context);vm.runInContext(sync+'\n'+source.slice(start,end),context);
 context.onStreamController({name:'menu'});assert(classes.has('sh-navigation-expanded'));
 context.onStreamController({name:'main'});assert(!classes.has('sh-navigation-expanded'));
 assert(source.includes('.sh-navigation-expanded .wrap__left .menu__text { display:block !important;'));
 assert(source.includes('.menu__item.traverse:not(.focus) { box-shadow:inset .18em 0 var(--sh-accent); }'));
 assert(source.includes('@media(prefers-reduced-motion:reduce){body.stremio-hybrid .wrap__left'));
 assert(source.includes("classList.remove('sh-movie-active','sh-navigation-expanded')"),'Hybrid teardown must restore the compact rail');
});

test('Hybrid Settings rail skips explicitly hidden folders and isolates plugin component IDs',()=>{
 const makeFolder=(component,label,display='',hiddenClass=false)=>({component,label,style:{display},classList:{contains:name=>(name==='hide'&&hiddenClass)},getAttribute:name=>name==='data-component'?component:null,querySelector:()=>({textContent:label})});
 const folders=[makeFolder('bandera_online','Bandera Online'),makeFolder('omdb_config_ui','OMDB','none'),makeFolder('omdb_ratings_select','Вибір рейтингів','',true),makeFolder('uacomentsy','UaKomentsY')];
 const selection={filter(fn){return{toArray:()=>folders.filter(node=>fn.call(node))}}};
 let created=0,activeRail;const makeElement=()=>{const node={attrs:{},children:[],className:'',textContent:'',focused:false,classList:{contains:()=>false},addEventListener(){},appendChild(child){this.children.push(child);child.parentNode=this;},setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k]||null;},removeAttribute(k){delete this.attrs[k];},querySelectorAll(){return this.children;},querySelector(selector){return selector==='.focus'?this.children.find(item=>item.focused)||null:null;},scrollIntoView(){}};if(created++===0)activeRail=node;return node;};
 const content={appendChild(node){this.rail=node;}};
 const c={settingsRail:null,settingsCategory:'bandera_online',onSettingsCategory(){},document:{createElement:makeElement},Lampa:{Settings:{main:()=>({render:()=>({find:()=>selection})}),render:()=>[{querySelector:()=>content}]},Controller:{collectionFocus(node){activeRail.children.forEach(item=>item.focused=false);node.focused=true;}}}};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('    function nativeSettingsFolders('),source.indexOf('    function releaseSettingsParameter(')),c);
 const available=c.nativeSettingsFolders();assert.deepEqual(available.map(node=>node.component),['bandera_online','uacomentsy']);
 assert.equal(folders.length,4,'native registrations are preserved');c.updateSettingsRail();assert.deepEqual(activeRail.children.map(node=>node.textContent),['Bandera Online','UaKomentsY']);
 assert.equal(activeRail.children[0].getAttribute('data-component'),null,'copied routes must not inherit native plugin CSS selectors');
 assert.equal(activeRail.children[0].getAttribute('data-sh-settings-component'),'bandera_online');
 activeRail.children[0].focused=true;c.focusSettingsCategory(1);assert.equal(activeRail.querySelector('.focus').textContent,'UaKomentsY');
});
