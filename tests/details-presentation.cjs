'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const test=require('node:test');
const source=fs.readFileSync(__dirname+'/../ui/stremio-hybrid.js','utf8');

class Node {
 constructor(name='',cls=''){this.name=name;this.className=cls;this.children=[];this.parentNode=null;this.parentElement=null;this.attrs={};this.dataset={};this.handlers={};this.listeners={};this.hidden=false;this.style={};this.classList={add:(...xs)=>xs.forEach(x=>{if(!this.className.split(/\s+/).includes(x))this.className=(this.className+' '+x).trim()}),remove:(...xs)=>{this.className=this.className.split(/\s+/).filter(y=>!xs.includes(y)).join(' ')},contains:x=>this.className.split(/\s+/).includes(x),toggle:(x,on)=>on?this.classList.add(x):this.classList.remove(x)};}
 get textContent(){return this.name+this.children.map(n=>n.textContent).join('')}
 set textContent(v){this.name=String(v);this.children.forEach(n=>n.parentNode=null);this.children=[]}
 get isConnected(){let n=this;while(n){if(n.connected)return true;n=n.parentNode}return false}
 contains(target){let n=target;while(n){if(n===this)return true;n=n.parentNode}return false}
 get nextSibling(){if(!this.parentNode)return null;const i=this.parentNode.children.indexOf(this);return this.parentNode.children[i+1]||null}
 appendChild(n){if(n.parentNode)n.parentNode.removeChild(n);this.children.push(n);n.parentNode=this;n.parentElement=this;return n}
 insertBefore(n,ref){if(n.parentNode)n.parentNode.removeChild(n);const i=ref?this.children.indexOf(ref):-1;this.children.splice(i<0?this.children.length:i,0,n);n.parentNode=this;n.parentElement=this;return n}
 removeChild(n){const i=this.children.indexOf(n);if(i>=0)this.children.splice(i,1);n.parentNode=n.parentElement=null;return n}
 remove(){if(this.parentNode)this.parentNode.removeChild(this)}
 setAttribute(k,v){this.attrs[k]=String(v)}
 getAttribute(k){return this.attrs[k]??null}
 removeAttribute(k){delete this.attrs[k]}
 querySelector(selector){const cls=selector[0]==='.'?selector.slice(1):'',tag=!cls?selector.toUpperCase():'';for(const n of this.children){if(cls&&n.classList.contains(cls)||tag&&n.tagName===tag)return n;const found=n.querySelector(selector);if(found)return found}return null}
 querySelectorAll(selector){if(selector==='span')return this.children.filter(n=>n.tagName==='SPAN');const classes=selector[0]==='.'?selector.slice(1).split('.').filter(Boolean):[];if(classes.length)return this.children.flatMap(n=>[...(classes.every(cls=>n.classList.contains(cls))?[n]:[]),...n.querySelectorAll(selector)]);return []}
 addEventListener(k,fn){this.listeners[k]=fn}
 removeEventListener(k){delete this.listeners[k]}
}
function fixture(){
 const page=new Node('', 'activity--active'),root=new Node(),tagBlock=new Node('', 'full-descr__tags'),commentsParent=new Node('', 'items-line'),commentsHead=new Node('Детально','items-line__title'),comments=new Node('Existing comments','ua-comments-root'),anchor=new Node('Synopsis toggle','selector sh-description-toggle'),genre=new Node('Жанр','tag-count selector'),genreName=new Node('Жанр','tag-count__name'),genreCount=new Node('2','tag-count__count'),tags=new Node('Теги','tag-count selector'),tagsName=new Node('Теги','tag-count__name'),tagsCount=new Node('10','tag-count__count'),production=new Node('Виробництво','tag-count selector'),productionName=new Node('Виробництво','tag-count__name'),networks=new Node('','tmdb-networks'),networkWrapper=new Node('','full-descr__tags networks-wrapper'),observers=[];let related=null,networksAttached=false;page.connected=true;
 genre.appendChild(genreName);genre.appendChild(genreCount);tags.appendChild(tagsName);tags.appendChild(tagsCount);production.appendChild(productionName);tagBlock.appendChild(genre);tagBlock.appendChild(production);tagBlock.appendChild(tags);root.connected=true;root.appendChild(anchor);const rootQueryAll=root.querySelectorAll.bind(root);root.querySelectorAll=s=>s==='.full-start-new__details .ifx-series-info > div'?[]:rootQueryAll(s);page.appendChild(root);page.appendChild(tagBlock);
 commentsParent.appendChild(commentsHead);commentsParent.appendChild(comments);networks.appendChild(networkWrapper);page.appendChild(commentsParent);page.querySelector=s=>s==='.full-descr__tags:not(.networks-wrapper)'?tagBlock:s==='.tmdb-networks'?(networksAttached?networks:null):s==='.ua-comments-root'?comments:s==='.trakttv-lists'?related:null;
 const focused=new Node('Torrent','selector focus');focused.offsetParent={};const calls={set:0,setArgs:[],focus:[]},triggered=[],listeners={fullshow:[],close:[]},frames=[];let currentFocus=focused,controllerName='full_start',selectOpen=false;page.querySelector=s=>s==='.selector.focus'||s==='.sh-detail-toggle.focus, .sh-detail-section__body .focus'?currentFocus:s==='.tag-count.selector.focus'?(currentFocus&&currentFocus.classList.contains('tag-count')?currentFocus:null):(s==='.full-descr__tags:not(.networks-wrapper)'?tagBlock:s==='.tmdb-networks'?(networksAttached?networks:null):s==='.ua-comments-root'?comments:s==='.trakttv-lists'?related:null);
 const handlers=new WeakMap(),$=node=>({on(name,selector,fn){if(typeof selector==='function'){fn=selector;selector=null;}let h=handlers.get(node)||{};name.split(/\s+/).forEach(n=>h[n]=selector?{fn,selector}:fn);handlers.set(node,h);return this},off(ns){let h=handlers.get(node)||{};Object.keys(h).forEach(k=>{if(ns===' .shDetails'||k.includes('shDetails'))delete h[k]});handlers.set(node,h);return this},trigger(name){triggered.push({node,name});return this}});
 const nativeController={link:{last:null},back(){calls.nativeBack=(calls.nativeBack||0)+1}};let activeController=nativeController,modalOpen=false,torrentOpen=false,playerOpen=false;const documentListeners={},nativeScroll={immediate(node){calls.scrolled=node},reset(){calls.scrollReset=(calls.scrollReset||0)+1}},activeComponent={scroll:nativeScroll},activeActivity={component:activeComponent,render:()=>[page]},active={component:'full',activity:activeActivity},context={window:{innerHeight:720},document:{documentElement:{clientHeight:720},createElement:()=>new Node(),addEventListener(name,fn){documentListeners[name]=fn},removeEventListener(name,fn){if(documentListeners[name]===fn)delete documentListeners[name]}},$: $,requestAnimationFrame(fn){frames.push(fn);return frames.length;},cancelAnimationFrame(){},MutationObserver:function(fn){this.fn=fn;this.disconnected=false;this.observe=(node,options)=>{this.target=node;this.options=options};this.disconnect=()=>{this.disconnected=true};this.trigger=()=>this.fn([]);observers.push(this);},Lampa:{Select:{opened:()=>selectOpen,listener:{follow(name,fn){listeners[name].push(fn)},remove(name,fn){listeners[name]=listeners[name].filter(x=>x!==fn)}}},Modal:{opened:()=>modalOpen},Torrent:{opened:()=>torrentOpen},Player:{opened:()=>playerOpen},Activity:{active:()=>active},Controller:{enabled:()=>({name:controllerName,controller:activeController}),toggle(name){calls.toggled=name;controllerName=name},collectionSet(){calls.set++;calls.setArgs.push([...arguments])},collectionFocus(node){calls.focus.push(node);currentFocus=node}}}};
 const a=source.indexOf('    function setDetailDisclosure('),b=source.indexOf('    function setupDescription(',a);assert(a>=0&&b>a,'presentation helpers must exist');vm.createContext(context);vm.runInContext(source.slice(a,b),context);
 return{context,page,root,tagBlock,commentsParent,commentsHead,comments,anchor,genre,tags,tagsName,production,networks,networkWrapper,observers,attachNetworks(){networksAttached=true;page.appendChild(networks)},setRelated(node){related=node;networkWrapper.appendChild(node)},calls,handlers,triggered,listeners,nativeController,nativeScroll,documentListeners,setFocus(node){currentFocus=node},setController(name,controller){controllerName=name;if(controller)activeController=controller},setSelectOpen(value){selectOpen=value},setModalOpen(value){modalOpen=value},setTorrentOpen(value){torrentOpen=value},setPlayerOpen(value){playerOpen=value},setActivity(component,activity){active.component=component;if(activity)active.activity=activity},setPageQuery(fn){page.querySelector=fn},flushOneFrame(){frames.splice(0,1).forEach(fn=>fn())},flushFrames(){let guard=0;while(frames.length&&guard++<50)frames.splice(0,1).forEach(fn=>fn());},focused,button(){return page.querySelectorAll('.sh-detail-section').find(n=>n.className.includes('--additional'))?.children[0]}};
}

test('Details shows descriptive genre labels and keeps one truthful shared native Genre control',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor};
 f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'},{id:10765,name:'Науково фантастичний'},{id:18,name:'Драма'}]});
 const chips=record.genreChips.children;assert.deepEqual(chips.map(n=>n.textContent),['Драма','Науково фантастичний']);assert(chips.every(n=>!n.classList.contains('selector')&&n.getAttribute('role')===null));
 assert.equal(record.genreControl,f.genre,'the native Genre control is the only interactive genre filter');
 assert.equal(record.detailPanels.length,2);assert.equal(f.button().textContent,'Додаткова інформація');assert.equal(f.button().getAttribute('aria-expanded'),'false');
});

test('existing Interface+ genre labels do not pretend to be individual filters',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor},nativeRow=new Node(),drama=new Node('Драма'),sciFi=new Node('Науково фантастичний');drama.tagName=sciFi.tagName='SPAN';nativeRow.appendChild(drama);nativeRow.appendChild(sciFi);f.root.querySelectorAll=s=>s==='.full-start-new__details .ifx-series-info > div'?[nativeRow]:[];
 f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'},{id:10765,name:'Науково фантастичний'}]});assert(nativeRow.classList.contains('sh-genre-chips'));assert(!drama.classList.contains('selector'));assert.equal(drama.getAttribute('role'),null);
 f.context.restoreDetailsPresentation(record);assert(!drama.classList.contains('sh-genre-chip'));assert(!nativeRow.classList.contains('sh-genre-chips'));
});

test('stable native Genre reference survives repeated adaptations and Select close restores the exact caller',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor},genres=[{id:18,name:'Драма'}];
 f.context.setupDetailsPresentation(record,{genres});const original=record.genreControl,additional=record.detailPanels.find(p=>p.key==='additional');
 assert.equal(original,f.genre);assert(additional.body.contains(original),'native control is moved, not cloned');
 f.context.setupDetailsPresentation(record,{genres});f.context.setupDetailsPresentation(record,{genres});assert.equal(record.genreControl,original);
 f.setFocus(original);f.setSelectOpen(true);f.handlers.get(original)['hover:enter.shDetailsFocus']();assert.equal(record.detailSelectOrigin,original);
 f.setFocus(f.button());f.setSelectOpen(false);f.setController('full_descr');f.listeners.close.forEach(fn=>fn({}));f.flushFrames();assert.equal(f.calls.focus.at(-1),original,'Select close returns to the originating Genre control after the native controller transition');
 f.context.restoreDetailsPresentation(record);assert.equal(f.listeners.fullshow.length,0);assert.equal(f.listeners.close.length,0);
});

test('non-genre Details Select restores its exact origin after native focus falls back to the actor row',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor};f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});
 f.setSelectOpen(true);f.handlers.get(f.tags)['click.shDetailsFocus']();assert.equal(record.detailSelectOrigin,f.tags);
 f.setSelectOpen(false);f.setController('items_line');f.setFocus(f.focused);f.listeners.close.forEach(fn=>fn({}));f.flushFrames();
 assert.equal(f.calls.toggled,'full_start','restoration returns to the actual native Full Start controller when Select left an unrelated row controller active');
 assert.equal(f.calls.focus.at(-1),f.tags);assert.equal(f.calls.setArgs.at(-1)[2],true);assert.equal(f.calls.scrolled,f.tags);
 f.context.restoreDetailsPresentation(record);assert.equal(f.listeners.close.length,0);
});

test('Select close waits for the native hide/controller handoff before restoring its invoking control',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor};f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});
 f.setSelectOpen(true);f.handlers.get(f.tags)['click.shDetailsFocus']();f.setController('select');f.setFocus(f.focused);f.listeners.close.forEach(fn=>fn({}));const focusCalls=f.calls.focus.length;
 f.flushOneFrame();assert.equal(f.calls.focus.length,focusCalls,'one immediate frame does not race the native menu that is still closing');assert.equal(record.detailSelectOrigin,f.tags,'origin survives while native Select.opened() remains true');f.setSelectOpen(false);f.setController('items_line');f.flushFrames();assert.equal(f.calls.toggled,'full_start');assert.equal(f.calls.focus.at(-1),f.tags,'late native focus fallback is overridden only after the menu is closed');f.context.restoreDetailsPresentation(record);
});

test('Select return restores visible Genre focus without an extra page shift',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor};f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});f.tags.getBoundingClientRect=()=>({top:280,bottom:320});f.setController('full_descr',f.nativeController);f.setSelectOpen(true);f.handlers.get(f.tags)['click.shDetailsFocus']();f.setSelectOpen(false);f.listeners.close.forEach(fn=>fn({}));f.flushFrames();assert.equal(f.calls.focus.at(-1),f.tags);assert.equal(f.nativeController.link.last,f.tags);assert.equal(f.calls.scrolled,undefined,'already visible Genre control does not jump the Details page on Select close');
 f.context.restoreDetailsPresentation(record);
});

test('localized keyword controls keep Select return focus without relying on the visible label',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor};f.tagsName.textContent='Ключові слова';f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});
 assert(record.detailSelectControls.includes(f.tags),'non-production tag controls remain part of the Additional Information action set');f.setSelectOpen(true);f.handlers.get(f.tags)['click.shDetailsFocus']();
 assert.equal(record.detailSelectOrigin,f.tags);f.setSelectOpen(false);f.setController('items_line');f.listeners.close.forEach(fn=>fn({}));f.flushFrames();assert.equal(f.calls.focus.at(-1),f.tags);assert.equal(f.calls.toggled,'full_start');f.context.restoreDetailsPresentation(record);
});

test('optional comment content is preserved inside its default-open disclosure',()=>{
 const f=fixture(),unrelated=new Node('Other plugin action','selector'),record={page:f.page,root:f.root,descriptionToggle:f.anchor};f.commentsParent.appendChild(unrelated);f.context.setupDetailsPresentation(record,{genres:[]});const panel=record.detailPanels.find(x=>x.key==='comments');assert(panel);assert.equal(panel.toggle.textContent,'Коментарі');assert.equal(panel.toggle.getAttribute('aria-expanded'),'true');assert.equal(panel.body.hidden,false);assert.equal(panel.body.children[0],f.comments);assert.equal(f.comments.parentNode,panel.body);assert(f.commentsHead.classList.contains('sh-details-heading-hidden'),'only the duplicate heading is hidden');assert(!f.commentsParent.classList.contains('sh-details-heading-hidden'),'the native row and unrelated plugin child remain visible');assert(f.commentsParent.contains(unrelated));f.handlers.get(panel.toggle)['hover:enter.shDetails']();assert.equal(panel.body.hidden,true);f.context.restoreDetailsPresentation(record);assert.equal(f.comments.parentNode,f.commentsParent);assert.equal(f.commentsParent.children[1],f.comments);assert(!f.commentsHead.classList.contains('sh-details-heading-hidden'));
});

test('inert comment loading/empty status stays visible but leaves the native D-pad collection',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor},status=new Node('Коментарі не знайдено','ua-status-card selector focus');f.comments.appendChild(status);f.setController('full_descr',f.nativeController);f.nativeController.link.last=status;
 f.context.setupDetailsPresentation(record,{genres:[]});const panel=record.detailPanels.find(item=>item.key==='comments');
 assert(panel);assert.equal(status.textContent,'Коментарі не знайдено','the visible empty-state copy remains available');assert(!status.classList.contains('selector'),'inert status cannot be reached by D-pad');assert(!status.classList.contains('focus'),'stale status focus is removed');assert.equal(f.calls.focus.at(-1),panel.toggle,'a status that held native focus transfers to the visible Comments disclosure');assert.equal(f.nativeController.link.last,panel.toggle);
 f.context.restoreDetailsPresentation(record);assert(status.classList.contains('selector'),'native state is restored during teardown');assert(status.classList.contains('focus'));
});

test('native Controller.move followed immediately by Controller.enter activates only the visibly focused action',()=>{
 const first=new Node('Коментарі','selector'),down=new Node('Студії','selector'),right=new Node('Додаткова інформація','selector');[first,down,right].forEach(node=>node.offsetParent={});
 let focus=first,frameId=0;const frames=new Map(),listeners={},link={last:first},scroll={immediate(){throw new Error('these already-visible controls must not scroll')},reset(){}},controller={name:'full_descr',link},host={contains:node=>[first,down,right].includes(node)},page={isConnected:true,classList:{contains:name=>name==='activity--active'},querySelector(selector){return selector==='.selector.focus'?focus:null;}},activity={render:()=>[page],component:{scroll}},active={component:'full',activity},calls=new Map(),visibleActions=new Map();
 // Mirror the installed Lampa API path: Controller.move → Navigator.focus →
 // Controller.enter. Last is updated as part of native focus, not repaired by
 // the test after an Arrow event.
 const navigator={focus(node){focus=node;link.last=node;}},nativeControllerApi={move(direction){const index=[first,down,right].indexOf(focus),next=[first,down,right][Math.min(index+1,2)];navigator.focus(next);},enter(){assert.equal(link.last,focus,'native Last must already match the visible focus before OK');calls.set(link.last,(calls.get(link.last)||0)+1);visibleActions.set(focus,(visibleActions.get(focus)||0)+1);}},owner={controller,scroll},context={window:{innerHeight:720},document:{documentElement:{clientHeight:720},addEventListener(name,fn){listeners[name]=fn;},removeEventListener(name,fn){if(listeners[name]===fn)delete listeners[name];}},Lampa:{Activity:{active:()=>active},Controller:{enabled:()=>controller,move:direction=>nativeControllerApi.move(direction),enter:()=>nativeControllerApi.enter()}},nativeOverlayOwnsInput:()=>false,detailsInputOwner:()=>owner,detailsNeedsScroll:()=>false,requestAnimationFrame(fn){const id=++frameId;frames.set(id,fn);return id;},cancelAnimationFrame(id){frames.delete(id);}};
 vm.createContext(context);const start=source.indexOf('    function installDetailsScroll('),end=source.indexOf('    function restoreDetailsPresentation(',start);assert(start>=0&&end>start);vm.runInContext(source.slice(start,end),context);
 const record={page,detailsHostLine:host,detailGroup:{},detailScrollBound:false};context.installDetailsScroll(record);assert.equal(typeof listeners.keydown,'function');
 listeners.keydown({key:'ArrowDown',defaultPrevented:false});context.Lampa.Controller.move('down');context.Lampa.Controller.enter();assert.equal(focus,down);assert.equal(calls.get(down),1);assert.equal(visibleActions.get(down),1,'the immediately following OK invokes the action with visible focus exactly once');assert.equal(calls.has(first),false,'the previously focused action is not invoked');
 listeners.keydown({key:'ArrowRight',defaultPrevented:false});context.Lampa.Controller.move('right');context.Lampa.Controller.enter();assert.equal(focus,right);assert.equal(calls.get(right),1);assert.equal(visibleActions.get(right),1,'rapid horizontal move plus OK invokes only the new visible action');assert.equal(calls.size,2);assert.equal(visibleActions.size,2);
 frames.forEach(fn=>fn());frames.clear();assert.equal(link.last,right);assert.equal(focus,right);
});

test('related Trakt lists move into Additional Information and restore to their native parent',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor},networks=new Node('', 'tmdb-networks'),wrapper=new Node('', 'full-descr__tags networks-wrapper'),related=new Node("Пов'язані списки",'tag-count selector trakttv-lists');wrapper.appendChild(related);networks.querySelector=s=>s==='.networks-wrapper'?wrapper:null;f.page.querySelector=s=>s==='.full-descr__tags:not(.networks-wrapper)'?f.tagBlock:s==='.tmdb-networks'?networks:s==='.trakttv-lists'?related:s==='.ua-comments-root'?f.comments:null;
 f.context.setupDetailsPresentation(record,{genres:[]});const additional=record.detailPanels.find(x=>x.key==='additional');assert(additional);assert.equal(related.parentNode,additional.body);assert(additional.toggle.textContent==='Додаткова інформація');f.context.setupDetailsPresentation(record,{genres:[]});assert.equal(related.parentNode,additional.body,'repeat adaptation leaves the list in its disclosure');f.context.restoreDetailsPresentation(record);assert.equal(related.parentNode,wrapper);
});

test('late Trakt related-list insertion joins Additional Information and observer is cleaned on teardown',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor},related=new Node("Пов'язані списки",'tag-count selector trakttv-lists');
 f.attachNetworks();f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});const additional=record.detailPanels.find(p=>p.key==='additional'),observer=record.relatedListObserver;
 assert(additional);assert(observer,'one bounded observer waits for delayed native Trakt list insertion');assert.equal(observer.target,f.page);assert.equal(observer.options.childList,true);assert.equal(observer.options.subtree,true);
 f.context.adaptMovie=()=>f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});f.setRelated(related);observer.trigger();assert(observer.disconnected,'observer stops when the delayed list appears');assert.equal(record.relatedListFrame,1);f.flushFrames();
 assert(additional.body.contains(related),'late Trakt control joins the existing Additional Information panel');assert.equal(related.parentNode,additional.body);assert.equal(f.calls.setArgs.at(-1)[2],true,'native focus collection is refreshed with visible controls only');
 f.context.restoreDetailsPresentation(record);assert.equal(related.parentNode,f.networkWrapper,'teardown restores the asynchronously moved native node');assert.equal(record.relatedListObserver,null);assert.equal(record.relatedListFrame,0);
});

test('Additional Information opens/closes without replacing controls and preserves remote focus',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor};f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});
 const panel=record.detailPanels[0],toggle=panel.toggle;assert.equal(panel.body.hidden,true);assert.equal(panel.body.children.length,2);
 f.handlers.get(toggle)['hover:enter.shDetails']();assert.equal(panel.body.hidden,false);assert.equal(toggle.getAttribute('aria-expanded'),'true');assert.equal(f.calls.focus.at(-1),toggle);
 f.handlers.get(toggle)['hover:enter.shDetails']();assert.equal(panel.body.hidden,true);assert.equal(toggle.getAttribute('aria-expanded'),'false');assert.equal(f.calls.focus.at(-1),toggle);
});

test('Back collapses the disclosure containing focus before delegating to native Details Back',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor};f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});
 const panel=record.detailPanels.find(x=>x.key==='additional');panel.activate();f.setFocus(f.genre);record.detailsBackController.back();
 assert.equal(panel.body.hidden,true);assert.equal(f.calls.focus.at(-1),panel.toggle);assert.equal(f.calls.nativeBack||0,0);
 f.setFocus(f.focused);record.detailsBackController.back();assert.equal(f.calls.nativeBack,1);
});

test('Back collapse hook follows the native controller transition into full_descr',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor};f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});
 const previous=record.detailsBackController,descrController={back(){f.calls.nativeDescrBack=(f.calls.nativeDescrBack||0)+1}};f.setController('full_descr',descrController);f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});
 const panel=record.detailPanels.find(x=>x.key==='additional');panel.activate();f.setFocus(f.genre);descrController.back();
 assert.equal(panel.body.hidden,true);assert.equal(f.calls.focus.at(-1),panel.toggle);assert.equal(f.calls.nativeDescrBack||0,0);assert.equal(previous.back===record.detailsBackWrapper,false,'previous controller is no longer the active owner');
});

test('Back from a collapsed Details panel returns to the hero with native Torrent focus and top scroll',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor},torrent=new Node('Торренти','full-start__button view--torrent selector');torrent.offsetParent={};f.root.appendChild(torrent);f.setController('full_descr',f.nativeController);f.nativeController.link.last=f.button();
 f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});f.setFocus(f.button());const collectionCalls=f.calls.setArgs.length;record.detailsBackController.back();
 assert.equal(f.calls.nativeBack||0,0,'Details Back does not open the native exit dialog');assert.equal(f.calls.toggled,'full_start');assert.equal(f.calls.scrollReset,1,'native Details scroll returns to the hero');assert.equal(f.calls.setArgs.length,collectionCalls,'Back preserves Lampa’s native Full Start collection and cross-controller Down route');assert.equal(f.calls.focus.at(-1),torrent);assert.equal(f.nativeController.link.last,torrent);
 f.context.restoreDetailsPresentation(record);
});

test('Torrent → Details → Back → Torrent → Details switches native Full Start collections without synthetic controllers',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor,detailPanels:[]},torrent=new Node('Торренти','full-start__button view--torrent selector'),details=new Node('Коментарі','selector sh-detail-toggle'),group=new Node('','sh-detail-panels');
 torrent.offsetParent=details.offsetParent={};f.page.classList.add('activity--active');f.root.appendChild(torrent);const host=new Node('','items-line');host.appendChild(details);host.appendChild(group);f.page.appendChild(host);record.detailsHostLine=host;record.detailGroup=group;record.detailLastFocus=details;
 f.setFocus(torrent);f.nativeController.link.last=torrent;let nativeDown=0;f.nativeController.down=()=>{nativeDown++};
 f.setController('full_start',f.nativeController);f.context.installDetailsDown(record);f.context.installDetailsBack(record);
 f.nativeController.down();assert.equal(f.calls.set,0,'handoff waits until native key dispatch finishes');f.flushFrames();assert.equal(f.calls.toggled,undefined,'the browser runtime has one Full Start controller, not a synthetic full_descr controller');assert.equal(f.calls.setArgs.at(-1)[0],host,'Down from Torrent scopes Lampa’s native collection to the Details row');assert.equal(f.calls.focus.at(-1),details);assert.equal(f.nativeController.link.last,details);assert.equal(record.detailsZoneActive,true);
 f.setFocus(details);record.detailsBackController.back();assert.equal(f.calls.toggled,undefined,'Back returns within the native Full Start controller');assert.equal(f.calls.focus.at(-1),torrent);assert.equal(f.nativeController.link.last,torrent);assert.equal(record.detailsZoneActive,false);assert.equal(f.calls.scrollReset,1);
 f.nativeController.down();f.flushFrames();assert.equal(f.calls.setArgs.at(-1)[0],host,'Down after returning to the hero re-enters Details instead of skipping to items_line');assert.equal(f.calls.focus.at(-1),details);assert.equal(f.nativeController.link.last,details);assert.equal(nativeDown,0,'native Full Start collection handoff owns the Torrent → Details boundary');
 f.context.restoreDetailsDown(record);assert.equal(f.nativeController.down instanceof Function,true);assert.equal(record.detailsDownController,null);f.context.restoreDetailsBack(record);
});

test('D-pad focus uses native Lampa Scroll positioning for the focused Details control and cleans up',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor};f.setController('full_descr');f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});
 assert(record.detailScrollBound);const card=new Node('Comment','ua-comment-card selector focus');record.detailPanels.find(p=>p.key==='comments').body.appendChild(card);f.setFocus(card);
 record.detailKeydown({key:'ArrowDown'});assert.equal(record.detailLastFocus,card,'the last focused Details control is remembered before leaving the controller');assert(f.documentListeners.keydown);f.flushFrames();assert.equal(f.calls.scrolled,card,'native Scroll.immediate positions the focused element in Lampa’s managed scroll container');
 f.context.restoreDetailsPresentation(record);assert.equal(f.documentListeners.keydown,undefined,'teardown removes the temporary key handler');
});

test('post-key native Details focus is synchronized to the active Controller link before OK can use stale Last',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor};f.setController('full_descr',f.nativeController);f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});
 const target=record.detailPanels.find(panel=>panel.key==='additional').toggle;f.nativeController.link.last=f.production;f.setFocus(f.genre);record.detailKeydown({key:'ArrowDown'});f.setFocus(target);f.flushFrames();assert.equal(f.nativeController.link.last,target,'remote navigation target replaces the stale hidden production selector in native Controller state');assert.equal(record.detailLastFocus,target,'post-movement Details focus, not the pre-key control, is remembered for overlay return');
 f.context.restoreDetailsPresentation(record);
});

test('all four D-pad directions synchronize visible CSS focus with native Full Controller.link.last',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor},right=new Node('Trailer','full-start__button selector'),left=f.focused;right.offsetParent={};f.root.appendChild(left);f.root.appendChild(right);f.setController('full_start',f.nativeController);f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});
 [['ArrowRight',right],['ArrowLeft',left]].forEach(([key,target])=>{record.detailKeydown({key});f.setFocus(target);f.flushFrames();assert.equal(f.nativeController.link.last,target,key+' syncs the visible action before OK can consult stale Last');assert.equal(f.calls.scrolled,undefined,key+' does not scroll the page');});
 f.setController('full_descr',f.nativeController);const toggle=record.detailPanels.find(panel=>panel.key==='additional').toggle;
 [['ArrowDown',toggle],['ArrowUp',toggle]].forEach(([key,target])=>{record.detailKeydown({key});f.setFocus(target);f.flushFrames();assert.equal(f.nativeController.link.last,target,key+' syncs the active Details selector');});
 f.context.restoreDetailsPresentation(record);
});

test('D-pad movement among visible Details categories keeps the page position stable and scrolls only for offscreen focus',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor};f.setController('full_descr',f.nativeController);f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});const target=record.detailPanels.find(panel=>panel.key==='additional').toggle;let rect={top:230,bottom:282};target.getBoundingClientRect=()=>rect;f.setFocus(target);record.detailKeydown({key:'ArrowDown'});f.setFocus(target);f.flushFrames();assert.equal(f.calls.scrolled,undefined,'a visible adjacent disclosure does not trigger an unnecessary page jump');assert.equal(f.nativeController.link.last,target);
 rect={top:760,bottom:812};record.detailKeydown({key:'ArrowDown'});f.setFocus(target);f.flushFrames();assert.equal(f.calls.scrolled,target,'native scroll is retained when the focused control is genuinely below the viewport');f.context.restoreDetailsPresentation(record);
});

test('D-pad scroll keeps focused Description controls visible outside the disclosure group',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor};f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});
 f.setFocus(f.anchor);record.detailKeydown({key:'ArrowDown'});f.flushFrames();
 assert.equal(f.calls.scrolled,f.anchor,'native Full scroll must position the offscreen description control as well as disclosure children');
 f.context.restoreDetailsPresentation(record);
});

test('native Full selector collection excludes descendants hidden by collapsed disclosures',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor};f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});
 const callsBefore=f.calls.setArgs.length,panel=record.detailPanels.find(p=>p.key==='additional');panel.activate();
 const args=f.calls.setArgs.at(-1);assert(args,'recomputing the native focus collection should use Lampa Controller');assert.equal(args[0],f.root);assert.equal(args[1],null);assert.equal(args[2],true,'Full Start collection remains scoped to its native root');
 assert.equal(panel.body.hidden,false);panel.activate();assert.equal(f.calls.setArgs.length,callsBefore+2);assert.equal(f.calls.setArgs.at(-1)[2],true);
 f.context.restoreDetailsPresentation(record);
});

test('Full Description refresh uses the native Detail row as its selector collection',()=>{
 const f=fixture(),host=new Node('','items-line');f.page.appendChild(host);const record={page:f.page,root:f.root,detailsHostLine:host};f.setController('full_descr',f.nativeController);f.context.refreshMovieCollection(record);
 assert.equal(f.calls.setArgs.at(-1)[0],host,'the native full_descr controller renders its collection from the Details items-line');assert.equal(f.calls.setArgs.at(-1)[2],true);
});

test('Full Description activation replaces a stale hidden focus with the visible synopsis control',()=>{
 const f=fixture(),host=new Node('','items-line'),hidden=new Node('Виробництво 4','selector focus');hidden.offsetParent=null;host.appendChild(f.anchor);host.appendChild(hidden);f.page.appendChild(host);f.page.querySelector=s=>s==='.selector.focus'?hidden:null;
 const record={page:f.page,root:f.root,detailsHostLine:host,descriptionToggle:f.anchor,detailPanels:[]};f.setController('full_descr',f.nativeController);
 assert.equal(f.context.refreshActiveDetailsCollection(record),true);assert.equal(f.calls.setArgs.at(-1)[0],host);assert.equal(f.calls.focus.at(-1),f.anchor,'native controller re-entry lands on the first visible Details control');
 f.setController('items_line');assert.equal(f.context.refreshActiveDetailsCollection(record),false,'the Details collection is not rewritten while cast/episode rows own navigation');
});

test('Full Description entry ignores a visible provisional focus and restores the first visual panel despite late panel registration',()=>{
 const f=fixture(),host=new Node('','items-line'),hidden=new Node('Виробництво 4','selector'),comments=new Node('Коментарі','selector sh-detail-toggle'),additional=new Node('Додаткова інформація','selector sh-detail-toggle focus');hidden.offsetParent=null;comments.offsetParent={};additional.offsetParent={};host.appendChild(hidden);host.appendChild(comments);host.appendChild(additional);f.page.appendChild(host);f.page.querySelector=s=>s==='.selector.focus'?additional:null;f.nativeController.link={last:hidden};
 const record={page:f.page,root:f.root,detailsHostLine:host,descriptionToggle:null,detailPanels:[{toggle:additional},{toggle:comments}]};f.setController('full_descr',f.nativeController);
 f.context.refreshActiveDetailsCollection(record);assert.equal(f.calls.focus.at(-1),comments,'native Last pointing at a removed control falls back to the first visible Details action');
});

test('Details focus survives the Description → episodes/actors → Description controller transition',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor};f.setController('full_descr');f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});const additional=record.detailPanels.find(p=>p.key==='additional').toggle;f.setFocus(additional);record.detailKeydown({key:'ArrowDown'});assert.equal(record.detailLastFocus,additional,'the production key handler stores the control before leaving Details');
 f.setController('items_line');f.setFocus(f.focused);f.setController('full_descr');f.context.refreshActiveDetailsCollection(record,record.detailLastFocus);assert.equal(f.calls.focus.at(-1),additional,'returning from episodes or cast restores the exact previous Details control');
});

test('native Full Start Details collection survives delayed provider updates and cast/Select returns',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor,detailsHostLine:f.page};f.setController('full_start',f.nativeController);f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});const comments=record.detailPanels.find(p=>p.key==='comments').toggle;
 assert.equal(f.context.enterDetailsZone(record,comments),true);assert.equal(record.detailsZoneActive,true);assert.equal(f.nativeController.link.last,comments,'Details owns the native Full Start last-focus entry after the zone handoff');
 const delayed=new Node('Пізня відповідь коментарів','ua-comments-card selector');f.comments.appendChild(delayed);f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});assert.equal(f.context.refreshActiveDetailsCollection(record,record.detailLastFocus),true);assert.equal(f.nativeController.link.last,comments,'a delayed provider refresh preserves Full Start Details collection ownership and focus');
 f.setController('items_line');f.setFocus(delayed);f.setController('full_start',f.nativeController);f.context.refreshActiveDetailsCollection(record,record.detailLastFocus);assert.equal(f.nativeController.link.last,comments,'returning from cast/episode rows restores the saved Full Start Details control');assert.equal(record.detailsZoneActive,true);
 f.setSelectOpen(true);record.detailSelectOrigin=f.genre;f.setController('select');f.listeners.close.forEach(fn=>fn({}));f.setSelectOpen(false);f.setController('full_start',f.nativeController);f.flushFrames();assert.equal(f.nativeController.link.last,f.genre,'returning from native Select restores its exact origin within the same Full Start Details collection');assert.equal(record.detailsZoneActive,true);
 f.context.restoreDetailsPresentation(record);
});

test('native Full controller entry retains only calm, stable Details focus styling',()=>{assert(source.includes('.sh-detail-toggle,body.stremio-hybrid .sh-movie-page .full-person{transition:none!important;animation:none!important;scroll-behavior:auto!important}'));assert(source.includes('.sh-detail-toggle.focus,body.stremio-hybrid .sh-movie-page .full-person.focus{transform:none!important}'));assert(source.includes("if(event.name==='full_descr'||event.name==='full_start'&&record.detailsZoneActive)refreshActiveDetailsCollection(record,record.detailLastFocus)"));});

test('Details key and Back handlers yield to Select, Modal, Torrent, Player, and unrelated controllers',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor};f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});const panel=record.detailPanels.find(x=>x.key==='additional');panel.activate();f.setFocus(f.genre);
 const back=record.detailsBackController.back,scroll=record.detailKeydown;for(const setOpen of [f.setSelectOpen,f.setModalOpen,f.setTorrentOpen,f.setPlayerOpen]){setOpen(true);scroll({key:'ArrowDown'});back();f.flushFrames();assert.equal(f.calls.scrolled,undefined,'no scroll runs while another native surface owns input');assert.equal(panel.body.hidden,false,'Back does not collapse Details behind an overlay');setOpen(false);}
 f.setController('select');scroll({key:'ArrowDown'});back();f.flushFrames();assert.equal(f.calls.scrolled,undefined);assert.equal(panel.body.hidden,false);
 f.setController('full_start',f.nativeController);scroll({key:'ArrowRight'});scroll({key:'Escape'});f.flushFrames();assert.equal(f.calls.scrolled,undefined,'horizontal and Back keys do not trigger background scrolling');
 f.context.restoreDetailsPresentation(record);assert.equal(f.documentListeners.keydown,undefined);
});

test('Back arriving while a native modal owns input delegates without collapsing the open Details panel',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor};f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});const panel=record.detailPanels.find(x=>x.key==='additional');panel.activate();f.setFocus(f.genre);f.setModalOpen(true);record.detailsBackController.back();assert.equal(panel.body.hidden,false);assert.equal(f.calls.nativeBack,1);f.setModalOpen(false);f.context.restoreDetailsPresentation(record);
});

test('disclosure mounting is independent of the old Details heading and tolerates delayed partial providers',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor};f.commentsHead.textContent='Comments';f.setPageQuery(s=>s==='.ua-comments-root'?f.comments:null);f.context.setupDetailsPresentation(record,{genres:[]});assert(record.detailGroup,'native disclosures mount without a visible “Детально” heading');assert.deepEqual([...record.detailPanels].map(p=>p.key),['comments']);
 const lateTags=new Node('', 'full-descr__tags'),lateGenre=new Node('Жанр','tag-count selector'),lateGenreName=new Node('Жанр','tag-count__name');lateGenre.appendChild(lateGenreName);lateTags.appendChild(lateGenre);f.page.appendChild(lateTags);
 f.setPageQuery(s=>s==='.full-descr__tags:not(.networks-wrapper)'?lateTags:s==='.tmdb-networks'?null:s==='.ua-comments-root'?f.comments:null);
 f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});assert.deepEqual([...record.detailPanels].map(p=>p.key),['comments','additional']);assert.equal(record.detailGroup.children[0],record.detailPanels[0].root);assert.equal(record.detailGroup.children[1],record.detailPanels[1].root);
 f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});assert.equal(record.detailPanels.length,2,'late repeated adaptation does not duplicate sections');f.context.restoreDetailsPresentation(record);
});

test('empty metadata creates no handlers; studio-only metadata mounts its collapsed section',()=>{
 const empty=fixture(),emptyRecord={page:empty.page,root:empty.root,descriptionToggle:empty.anchor};empty.setPageQuery(()=>null);empty.context.setupDetailsPresentation(emptyRecord,{genres:[]});assert.equal(emptyRecord.detailGroup,undefined);assert.equal(empty.documentListeners.keydown,undefined);assert.equal(emptyRecord.detailsBackController,null);
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor},networks=new Node('', 'tmdb-networks'),wrapper=new Node('', 'networks-wrapper'),studios=new Node('', 'studios-group'),logo=new Node('Studio','network-logo');studios.appendChild(logo);wrapper.appendChild(studios);networks.appendChild(wrapper);networks.querySelector=s=>s==='.networks-wrapper'?wrapper:s==='.studios-group'?studios:null;f.setPageQuery(s=>s==='.full-descr__tags:not(.networks-wrapper)'?null:s==='.tmdb-networks'?networks:s==='.ua-comments-root'?null:null);f.context.setupDetailsPresentation(record,{genres:[]});assert.deepEqual([...record.detailPanels].map(p=>p.key),['production']);assert.equal(record.detailPanels[0].toggle.getAttribute('aria-expanded'),'false');f.context.restoreDetailsPresentation(record);
});

test('production logos expose exact provider names and restore native attributes on teardown',()=>{
 const context={Array,record:null,networks:null};vm.createContext(context);const a=source.indexOf('    function decorateProductionLabels('),b=source.indexOf('    function watchRelatedLists(',a);assert(a>=0&&b>a);vm.runInContext(source.slice(a,b),context);
 const networks=new Node(),group=new Node('', 'studios-group'),button=new Node('', 'network-logo'),image=new Node();image.tagName='IMG';image.setAttribute('alt','AMC Studios');button.appendChild(image);group.appendChild(button);networks.appendChild(group);networks.querySelectorAll=s=>s==='.network-logo'?[button]:[];
 const record={};context.decorateProductionLabels(record,networks);context.decorateProductionLabels(record,networks);
 assert.equal(button.getAttribute('data-sh-name'),'AMC Studios','visible label comes from parser/native alt text verbatim');assert.equal(button.getAttribute('aria-label'),'AMC Studios');assert.equal(button.getAttribute('title'),'AMC Studios');assert.equal(record.productionLabelAttrs.length,1,'repeated adaptation does not accumulate snapshots');
 context.restoreProductionLabels(record);assert.equal(button.getAttribute('data-sh-name'),null);assert.equal(button.getAttribute('aria-label'),null);assert.equal(button.getAttribute('title'),null);assert.equal(record.productionLabelAttrs.length,0);
});

test('logo-backed Studios and Production section omits the redundant native production-count action',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor},platforms=new Node('', 'platforms-group'),separator=new Node('', 'network-separator'),studios=new Node('', 'studios-group'),platform=new Node('', 'network-logo'),studio=new Node('', 'network-logo');
 platform.tagName=studio.tagName='DIV';platforms.appendChild(platform);studios.appendChild(studio);f.networkWrapper.appendChild(platforms);f.networkWrapper.appendChild(separator);f.networkWrapper.appendChild(studios);f.networks.appendChild(f.networkWrapper);f.attachNetworks();
 f.setPageQuery(s=>s==='.full-descr__tags:not(.networks-wrapper)'?f.tagBlock:s==='.tmdb-networks'?f.networks:s==='.ua-comments-root'?f.comments:null);
 f.context.setupDetailsPresentation(record,{genres:[]});const panel=record.detailPanels.find(p=>p.key==='production');assert(panel);assert(panel.nodes.some(x=>x.node===platforms)&&panel.nodes.some(x=>x.node===studios));assert(!panel.nodes.some(x=>x.node===f.production),'the native count shortcut is not moved into the logo section');assert(f.production.classList.contains('sh-production-count-hidden'),'the redundant shortcut is removed from visible/focusable controls while actual company logos exist');
 f.context.restoreDetailsPresentation(record);assert(!f.production.classList.contains('sh-production-count-hidden'),'native count control is restored exactly on Details teardown');
});

test('the production-count action is hidden even when the movie has no network-logo container',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor};f.production.offsetParent=null;f.production.classList.add('focus');f.setController('full_descr',f.nativeController);f.nativeController.link.last=f.production;
 f.setPageQuery(s=>s==='.full-descr__tags:not(.networks-wrapper)'?f.tagBlock:s==='.tmdb-networks'?null:s==='.ua-comments-root'?f.comments:s==='.trakttv-lists'?null:s==='.selector.focus'?f.production:null);
 f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});const comments=record.detailPanels.find(p=>p.key==='comments');
 assert(f.production.classList.contains('sh-production-count-hidden'),'“Виробництво N” never remains as a separate button while logo metadata is empty or delayed');assert.equal(f.calls.focus.at(-1),comments.toggle,'existing focus transfers to the first visible disclosure');
 f.context.restoreDetailsPresentation(record);assert(!f.production.classList.contains('sh-production-count-hidden'),'the native control is restored on teardown');
});

test('hiding the production-count shortcut transfers its existing focus to the visible Studios disclosure',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor},platforms=new Node('', 'platforms-group'),studios=new Node('', 'studios-group'),platform=new Node('', 'network-logo'),studio=new Node('', 'network-logo');platforms.appendChild(platform);studios.appendChild(studio);f.networkWrapper.appendChild(platforms);f.networkWrapper.appendChild(studios);f.networks.appendChild(f.networkWrapper);f.attachNetworks();f.production.classList.add('focus');f.setController('full_descr');
 f.setPageQuery(s=>s==='.full-descr__tags:not(.networks-wrapper)'?f.tagBlock:s==='.tmdb-networks'?f.networks:s==='.ua-comments-root'?f.comments:null);f.context.setupDetailsPresentation(record,{genres:[]});const panel=record.detailPanels.find(p=>p.key==='production');assert.equal(f.calls.focus.at(-1),panel.toggle,'D-pad focus never stays on a now-hidden native count button');f.context.restoreDetailsPresentation(record);
});

test('twenty Details adaptation and destroy cycles leave no document handlers or controller wrappers',()=>{
 const f=fixture();for(let i=0;i<20;i++){const record={page:f.page,root:f.root,descriptionToggle:f.anchor};f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});assert.equal(typeof f.documentListeners.keydown,'function');assert.equal(record.detailsBackController.back,record.detailsBackWrapper);f.context.restoreDetailsPresentation(record);assert.equal(f.documentListeners.keydown,undefined);assert.equal(record.detailsBackController,null);}assert.equal(f.listeners.fullshow.length,0);assert.equal(f.listeners.close.length,0);assert.equal(f.calls.scrolled,undefined);
});

test('re-adaptation is idempotent and Hybrid teardown restores original native nodes and order',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor};f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});const panel=record.detailPanels[0],chips=record.genreChips,sectionCount=f.page.children.filter(n=>n.className.includes('sh-detail-section')).length;
 f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});assert.equal(record.detailPanels.length,2);assert.equal(record.genreChips,chips);assert.equal(f.page.children.filter(n=>n.className.includes('sh-detail-section')).length,sectionCount);
 f.context.restoreDetailsPresentation(record);assert.deepEqual(f.tagBlock.children,[f.genre,f.production,f.tags]);assert.equal(record.detailPanels.length,0);assert.equal(record.genreChips,null);assert(!f.page.children.some(n=>n.className.includes('sh-detail-section')));
});

test('Hybrid Details presentation is scoped and does not create an episode renderer or move the torrent focus action',()=>{
 assert.match(source,/body\.stremio-hybrid \.sh-movie-page \.sh-genre-chips/);assert.match(source,/body\.stremio-hybrid \.sh-movie-page \.sh-detail-section/);
 assert.match(source,/\.sh-detail-panels\{display:flex;align-self:stretch;width:100%;max-width:100%;min-width:0;flex-direction:column/);assert(!source.includes('left:-10px'));assert(!source.includes('width:calc(100% + 20px)'));assert(source.includes("page.querySelector('.tmdb-networks')"));assert(source.includes("root.querySelector('.full-start-new__buttons')"));
 assert(!source.includes('sh-episode-renderer'));assert(source.includes("classList.contains('view--torrent')"));
});

test('Details panels share one aligned row group in comments, studio, information order',()=>{
 assert(source.includes("record.detailGroup.className='sh-detail-panels'"));assert(source.includes("record.detailGroup.parentNode!==root&&record.detailGroup.parentNode!==record.detailsSecondary"));assert(source.includes("[commentPanel,productionPanel,additionalPanel].forEach"));assert(source.includes("detailDisclosure(record,comments.parentNode,'Коментарі','comments',[comments],true)"));
});

test('all three disclosure rows share the same compact chevron and TV focus treatment',()=>{
 assert(source.includes('.sh-detail-toggle::before{content:\'\';position:absolute;top:50%;right:1.02em'));
 assert(source.includes('border-right:1.5px solid #c9b9ff;border-bottom:1.5px solid #c9b9ff'));
 assert(source.includes('.sh-detail-toggle[aria-expanded="true"]::before{transform:translateY(-30%) rotate(225deg)}'));
 assert(source.includes('.sh-detail-toggle.focus{color:#fff;text-shadow:0 0 1em #ab91ff66;outline:2px solid var(--sh-accent-soft)'));
});

test('Details zones remove only a truly empty native line and place cast/episode content after the description section',()=>{
 const parent=new Node('', 'scroll__body'),root=new Node('', 'full-start-new'),empty=new Node('', 'items-line'),emptyBody=new Node('', 'items-line__body'),host=new Node('', 'items-line'),hostHead=new Node('', 'items-line__head'),hostTitle=new Node('Детально','items-line__title'),networkSlot=new Node('', 'tmdb-networks'),nestedNetworkBody=new Node('', 'items-line__body'),hostBody=new Node('', 'items-line__body'),nativeFull=new Node('', 'full-descr'),native=new Node('Synopsis text '.repeat(80),'full-descr__text'),toggle=new Node('Показати більше','selector'),content=new Node('', 'items-line'),episode=new Node('Епізод 1','card selector full-episode'),focusableEmpty=new Node('', 'items-line');
 empty.appendChild(emptyBody);hostHead.appendChild(hostTitle);nestedNetworkBody.appendChild(nativeFull);networkSlot.appendChild(nestedNetworkBody);host.appendChild(hostHead);host.appendChild(networkSlot);host.appendChild(hostBody);content.appendChild(episode);const hiddenSelector=new Node('','selector');focusableEmpty.appendChild(hiddenSelector);parent.appendChild(root);parent.appendChild(empty);parent.appendChild(host);parent.appendChild(content);parent.appendChild(focusableEmpty);parent.connected=true;
 parent.querySelectorAll=s=>s==='.items-line'?[empty,host,content,focusableEmpty]:[];empty.querySelector=s=>s==='.items-line__body'?emptyBody:null;emptyBody.querySelector=()=>null;host.querySelector=s=>s==='.items-line__head'?hostHead:s==='.items-line__title'?hostTitle:s==='.full-descr'?nativeFull:s==='.items-line__body'?nestedNetworkBody:null;hostBody.querySelector=s=>s==='.full-descr'?null:null;content.querySelector=s=>s==='.full-episode'?episode:s==='.full-person'||s==='.card.selector'?episode:null;focusableEmpty.querySelector=s=>s==='.items-line__body'?focusableEmpty:s==='.selector'?hiddenSelector:null;
 const context={document:{createElement:()=>new Node()},hideEmptyNativeDetailsRow:null};vm.createContext(context);const a=source.indexOf('    function hideEmptyNativeDetailsRow('),b=source.indexOf('    function detailDisclosure(',a);assert(a>=0&&b>a);vm.runInContext(source.slice(a,b),context);
 const record={root,page:parent,kind:'tv',description:native,descriptionToggle:toggle,descriptionNativeLine:host,detailsHostLine:empty,detailGroup:new Node('', 'sh-detail-panels')};root.appendChild(native);root.appendChild(toggle);root.appendChild(record.detailGroup);
 context.organizeDetailsZones(record);assert.equal(record.detailsHostLine,host,'the Details row that originally owned the description wins over a stale earlier Full row');assert(hostHead.classList.contains('sh-details-heading-hidden'),'the native duplicate heading is hidden structurally');assert(!host.classList.contains('sh-details-empty-native-row'),'native Full Details controller host remains visible');assert(!focusableEmpty.classList.contains('sh-details-empty-native-row'),'a row with a real selector is never hidden');assert.equal(record.detailsSecondary.parentNode,hostBody,'middle zone is mounted in the direct native Full Details body, not the hidden networks placeholder');assert.equal(native.parentNode,record.detailsSecondary);assert.equal(record.detailsSecondary.children[1],native);assert.equal(record.detailsSecondary.children[2],toggle);assert.equal(record.detailGroup.parentNode,record.detailsSecondary);assert.equal(record.detailsPeopleHeading.textContent,'Епізоди, актори та схоже');assert.equal(record.detailsPeopleHeading.nextSibling,content);
 context.organizeDetailsZones(record);assert.equal(hostBody.children.filter(n=>n.classList.contains('sh-details-secondary')).length,1);assert.equal(parent.children.filter(n=>n.classList.contains('sh-details-zone-title--content')).length,1,'re-adaptation does not duplicate zone headings');
});

test('fail-first organizer reconciles hidden native rows after its first cast or episode row',()=>{
 const page=new Node('', 'activity--active'),root=new Node('', 'full-start-new'),host=new Node('', 'items-line'),hostBody=new Node('', 'items-line__body'),description=new Node('Synopsis','full-descr full-descr__text'),firstContent=new Node('', 'items-line'),firstBody=new Node('', 'items-line__body'),firstEpisode=new Node('Епізод 1','card selector full-episode'),previouslyEmpty=new Node('', 'items-line'),emptyBody=new Node('', 'items-line__body'),lateLine=new Node('', 'items-line'),lateBody=new Node('', 'items-line__body');
 page.connected=true;host.appendChild(hostBody);hostBody.appendChild(description);firstContent.appendChild(firstBody);firstBody.appendChild(firstEpisode);previouslyEmpty.appendChild(emptyBody);lateLine.appendChild(lateBody);page.appendChild(root);page.appendChild(host);page.appendChild(firstContent);page.appendChild(previouslyEmpty);page.appendChild(lateLine);
 const lines=[host,firstContent,previouslyEmpty,lateLine];page.querySelectorAll=selector=>selector==='.items-line'?lines:[];host.querySelector=selector=>selector==='.items-line__body'?hostBody:selector==='.full-descr'?description:null;[firstContent,previouslyEmpty,lateLine].forEach(line=>{const body=line.children[0];line.querySelector=selector=>selector==='.items-line__body'?body:null;});
 firstContent.querySelector=selector=>selector==='.full-episode'?firstEpisode:null;
 const context={document:{createElement:()=>new Node()}};vm.createContext(context);const start=source.indexOf('    function hideEmptyNativeDetailsRow('),end=source.indexOf('    function detailDisclosure(',start);assert(start>=0&&end>start);vm.runInContext(source.slice(start,end),context);
 const record={root,page,kind:'tv',description,descriptionNativeLine:host,detailsHostLine:host};
 context.organizeDetailsZones(record);assert.equal(record.detailsPeopleHeading.nextSibling,firstContent,'first-content lookup still stops at the earliest episode row');assert(previouslyEmpty.classList.contains('sh-details-empty-native-row'));assert(lateLine.classList.contains('sh-details-empty-native-row'),'the first pass reaches and hides rows after the first episode row');
 const lateAction=new Node('Пізній провайдер','selector');lateBody.appendChild(lateAction);context.organizeDetailsZones(record);
 assert(previouslyEmpty.classList.contains('sh-details-empty-native-row'),'an earlier truly empty row stays hidden');assert(!lateLine.classList.contains('sh-details-empty-native-row'),'a row after the early first-content match is reconsidered and shown when its provider inserts content');assert.equal(lateAction.parentNode,lateBody,'late provider action remains in its native body');assert(page.children.indexOf(host)<page.children.indexOf(firstContent)&&page.children.indexOf(firstContent)<page.children.indexOf(previouslyEmpty)&&page.children.indexOf(previouslyEmpty)<page.children.indexOf(lateLine),'provider rows remain in their native order');assert(page.contains(lateLine));
 const lateCard=new Node('Картка','card selector');lateBody.appendChild(lateCard);context.organizeDetailsZones(record);assert(!lateLine.classList.contains('sh-details-empty-native-row'),'late media cards remain visible too');assert.equal(lateCard.parentNode,lateBody);
});

test('production description setup removes current and late-inserted Show More controls without losing their restoration position',()=>{
 const children=[];function make(className,text){return{className,textContent:text,parentNode:null,get nextSibling(){const i=children.indexOf(this);return children[i+1]||null}};}
 const parent={appendChild(node){children.push(node);node.parentNode=this;},removeChild(node){const i=children.indexOf(node);if(i>=0)children.splice(i,1);node.parentNode=null;},insertBefore(node,next){const i=next?children.indexOf(next):-1;if(i<0)children.push(node);else children.splice(i,0,node);node.parentNode=this;}};
 const first=make('selector sh-description-toggle','Показати більше'),description=make('full-descr__text','Повний опис'),after=make('selector','Наступний елемент');parent.appendChild(first);parent.appendChild(description);parent.appendChild(after);
 const classes=new Set(),root={querySelectorAll(selector){assert.equal(selector,'.sh-description-toggle');return children.filter(node=>node.className.includes('sh-description-toggle'));},classList:{add:name=>classes.add(name),remove:name=>classes.delete(name)}},page={classList:{add:name=>classes.add(name),remove:name=>classes.delete(name)}};
 const context={};vm.createContext(context);const a=source.indexOf('    function removeDescriptionToggles('),b=source.indexOf('    function plainDescription(',a);assert(a>=0&&b>a);vm.runInContext(source.slice(a,b),context);
 const record={root,page,moves:[]};context.setupDescription(record,description);assert(!children.includes(first),'the visible native action is removed from the TV focus sequence');assert.equal(record.moves[0].node,first);assert.equal(record.moves[0].parent,parent);assert.equal(record.moves[0].next,description);
 const late=make('selector sh-description-toggle','Показати більше');parent.insertBefore(late,after);context.setupDescription(record,description);assert(!children.includes(late),'a delayed native control is also removed on repeated adaptation');assert.equal(record.moves.length,2,'teardown can restore both original controls at their exact locations');assert(classes.has('sh-description-expanded'));
 record.moves.slice().reverse().forEach(move=>move.parent.insertBefore(move.node,move.next&&move.next.parentNode===move.parent?move.next:null));assert.deepEqual(children,[first,description,late,after],'the original DOM order is recoverable on teardown');
});

test('native Details heading is removed without hiding the native Full row or its controls',()=>{
 const title={classList:{added:false,add(){this.added=true},remove(){this.added=false}}},head={children:[title],classList:{added:false,add(){this.added=true},remove(){this.added=false}},querySelector(selector){return selector==='.items-line__title'?title:null;}};
 const host={querySelector(selector){return selector==='.items-line__head'?head:null;},classList:{contains(){return false}}},record={hiddenDetailHeadings:[]},context={};vm.createContext(context);const a=source.indexOf('    function hideNativeDetailsHeading('),b=source.indexOf('    function organizeDetailsZones(',a);assert(a>=0&&b>a);vm.runInContext(source.slice(a,b),context);context.hideNativeDetailsHeading(record,host);assert(head.classList.added,'the header-only wrapper is hidden');assert(!host.classList.contains('sh-details-heading-hidden'),'the native controller row remains intact');assert.equal(record.nativeDetailsHeading,head);
 const action={};head.children.push(action);head.querySelector=selector=>selector==='.items-line__title'?title:selector.includes('.selector')?action:null;context.hideNativeDetailsHeading(record,host);assert(title.classList.added,'when the header has another action, only the duplicate title is hidden');assert(!head.classList.added,'other header content remains visible');
});

test('native details row with meaningful text remains visible',()=>{
 const line=new Node('Native provider content','items-line');line.querySelector=()=>null;const context={};vm.createContext(context);const a=source.indexOf('    function hideEmptyNativeDetailsRow('),b=source.indexOf('    function detailDisclosure(',a);vm.runInContext(source.slice(a,b),context);const record={emptyDetailsRows:[]};assert.equal(context.hideEmptyNativeDetailsRow(record,line),false);assert(!line.classList.contains('sh-details-empty-native-row'));
});

test('Details synopsis text stays fully opaque and readable through its final line',()=>{
 const rule=source.match(/body\.stremio-hybrid \.sh-movie-page \.sh-movie-description,body\.stremio-hybrid \.sh-movie-page \.sh-movie-description \.full-descr__text\{([^}]*)\}/);
 assert(rule,'the native description text itself must have an explicit scoped readability rule');
 for(const declaration of ['-webkit-text-fill-color:#f4f2fa!important','opacity:1!important','-webkit-mask-image:none!important','mask-image:none!important','max-height:none!important','overflow:visible!important','background:none!important'])assert(rule[1].includes(declaration),'description rule must include '+declaration);
});
