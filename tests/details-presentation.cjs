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
 querySelector(selector){const cls=selector[0]==='.'?selector.slice(1):'';for(const n of this.children){if(cls&&n.classList.contains(cls))return n;const found=n.querySelector(selector);if(found)return found}return null}
 querySelectorAll(selector){if(selector==='span')return this.children.filter(n=>n.tagName==='SPAN');if(selector==='.tag-count.selector')return this.children.filter(n=>n.className.split(/\s+/).includes('tag-count')&&n.classList.contains('selector'));const cls=selector[0]==='.'?selector.slice(1):'';if(cls)return this.children.flatMap(n=>[...(n.classList.contains(cls)?[n]:[]),...n.querySelectorAll(selector)]);return []}
 addEventListener(k,fn){this.listeners[k]=fn}
 removeEventListener(k){delete this.listeners[k]}
}
function fixture(){
 const page=new Node('', 'activity--active'),root=new Node(),tagBlock=new Node('', 'full-descr__tags'),commentsParent=new Node('', 'items-line'),commentsHead=new Node('Детально','items-line__title'),comments=new Node('Existing comments','ua-comments-root'),anchor=new Node('Synopsis toggle','selector sh-description-toggle'),genre=new Node('Жанр','tag-count selector'),genreName=new Node('Жанр','tag-count__name'),genreCount=new Node('2','tag-count__count'),tags=new Node('Теги','tag-count selector'),tagsName=new Node('Теги','tag-count__name'),tagsCount=new Node('10','tag-count__count'),production=new Node('Виробництво','tag-count selector'),productionName=new Node('Виробництво','tag-count__name');page.connected=true;
 genre.appendChild(genreName);genre.appendChild(genreCount);tags.appendChild(tagsName);tags.appendChild(tagsCount);production.appendChild(productionName);tagBlock.appendChild(genre);tagBlock.appendChild(production);tagBlock.appendChild(tags);root.connected=true;root.appendChild(anchor);const rootQueryAll=root.querySelectorAll.bind(root);root.querySelectorAll=s=>s==='.full-start-new__details .ifx-series-info > div'?[]:rootQueryAll(s);page.appendChild(root);page.appendChild(tagBlock);
 commentsParent.appendChild(commentsHead);commentsParent.appendChild(comments);page.appendChild(commentsParent);page.querySelector=s=>s==='.full-descr__tags:not(.networks-wrapper)'?tagBlock:s==='.tmdb-networks'?null:s==='.ua-comments-root'?comments:null;
 const focused=new Node('Torrent','selector focus'),calls={set:0,focus:[]},triggered=[],listeners={fullshow:[],close:[]},frames=[];let currentFocus=focused,controllerName='full_start',selectOpen=false;page.querySelector=s=>s==='.selector.focus'||s==='.sh-detail-toggle.focus, .sh-detail-section__body .focus'?currentFocus:s==='.tag-count.selector.focus'?(currentFocus&&currentFocus.classList.contains('tag-count')?currentFocus:null):(s==='.full-descr__tags:not(.networks-wrapper)'?tagBlock:s==='.tmdb-networks'?null:s==='.ua-comments-root'?comments:null);
 const handlers=new WeakMap(),$=node=>({on(name,selector,fn){if(typeof selector==='function'){fn=selector;selector=null;}let h=handlers.get(node)||{};name.split(/\s+/).forEach(n=>h[n]=selector?{fn,selector}:fn);handlers.set(node,h);return this},off(ns){let h=handlers.get(node)||{};Object.keys(h).forEach(k=>{if(ns===' .shDetails'||k.includes('shDetails'))delete h[k]});handlers.set(node,h);return this},trigger(name){triggered.push({node,name});return this}});
 const nativeController={back(){calls.nativeBack=(calls.nativeBack||0)+1}};let activeController=nativeController,modalOpen=false,torrentOpen=false,playerOpen=false;const documentListeners={},nativeScroll={immediate(node){calls.scrolled=node}},activeComponent={scroll:nativeScroll},activeActivity={component:activeComponent,render:()=>[page]},active={component:'full',activity:activeActivity},context={document:{createElement:()=>new Node(),addEventListener(name,fn){documentListeners[name]=fn},removeEventListener(name,fn){if(documentListeners[name]===fn)delete documentListeners[name]}},$: $,requestAnimationFrame(fn){frames.push(fn);return frames.length;},cancelAnimationFrame(){},Lampa:{Select:{opened:()=>selectOpen,listener:{follow(name,fn){listeners[name].push(fn)},remove(name,fn){listeners[name]=listeners[name].filter(x=>x!==fn)}}},Modal:{opened:()=>modalOpen},Torrent:{opened:()=>torrentOpen},Player:{opened:()=>playerOpen},Activity:{active:()=>active},Controller:{enabled:()=>({name:controllerName,controller:activeController}),collectionSet(){calls.set++},collectionFocus(node){calls.focus.push(node);currentFocus=node}}}};
 const a=source.indexOf('    function setDetailDisclosure('),b=source.indexOf('    function setupDescription(',a);assert(a>=0&&b>a,'presentation helpers must exist');vm.createContext(context);vm.runInContext(source.slice(a,b),context);
 return{context,page,root,tagBlock,commentsParent,commentsHead,comments,anchor,genre,tags,production,calls,handlers,triggered,listeners,nativeController,nativeScroll,documentListeners,setFocus(node){currentFocus=node},setController(name,controller){controllerName=name;if(controller)activeController=controller},setSelectOpen(value){selectOpen=value},setModalOpen(value){modalOpen=value},setTorrentOpen(value){torrentOpen=value},setPlayerOpen(value){playerOpen=value},setActivity(component,activity){active.component=component;if(activity)active.activity=activity},setPageQuery(fn){page.querySelector=fn},flushFrames(){frames.splice(0).forEach(fn=>fn())},focused,button(){return page.querySelectorAll('.sh-detail-section').find(n=>n.className.includes('--additional'))?.children[0]}};
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
 f.setFocus(original);f.listeners.fullshow.forEach(fn=>fn({}));assert.equal(record.genreSelectOrigin,null);f.setSelectOpen(true);f.handlers.get(original)['hover:enter.shDetailsFocus']();assert.equal(record.genreSelectOrigin,original);
 f.setFocus(f.button());f.setSelectOpen(false);f.setController('full_descr');f.listeners.close.forEach(fn=>fn({}));f.flushFrames();assert.equal(f.calls.focus.at(-1),original,'Select close returns to the originating Genre control after the native controller transition');
 f.context.restoreDetailsPresentation(record);assert.equal(f.listeners.fullshow.length,0);assert.equal(f.listeners.close.length,0);
});

test('optional comment content is preserved inside its default-open disclosure',()=>{
 const f=fixture(),unrelated=new Node('Other plugin action','selector'),record={page:f.page,root:f.root,descriptionToggle:f.anchor};f.commentsParent.appendChild(unrelated);f.context.setupDetailsPresentation(record,{genres:[]});const panel=record.detailPanels.find(x=>x.key==='comments');assert(panel);assert.equal(panel.toggle.textContent,'Коментарі');assert.equal(panel.toggle.getAttribute('aria-expanded'),'true');assert.equal(panel.body.hidden,false);assert.equal(panel.body.children[0],f.comments);assert.equal(f.comments.parentNode,panel.body);assert(f.commentsHead.classList.contains('sh-details-heading-hidden'),'only the duplicate heading is hidden');assert(!f.commentsParent.classList.contains('sh-details-heading-hidden'),'the native row and unrelated plugin child remain visible');assert(f.commentsParent.contains(unrelated));f.handlers.get(panel.toggle)['hover:enter.shDetails']();assert.equal(panel.body.hidden,true);f.context.restoreDetailsPresentation(record);assert.equal(f.comments.parentNode,f.commentsParent);assert.equal(f.commentsParent.children[1],f.comments);assert(!f.commentsHead.classList.contains('sh-details-heading-hidden'));
});

test('related Trakt lists move into Additional Information and restore to their native parent',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor},networks=new Node('', 'tmdb-networks'),wrapper=new Node('', 'full-descr__tags networks-wrapper'),related=new Node("Пов'язані списки",'tag-count selector trakttv-lists');wrapper.appendChild(related);networks.querySelector=s=>s==='.networks-wrapper'?wrapper:null;f.page.querySelector=s=>s==='.full-descr__tags:not(.networks-wrapper)'?f.tagBlock:s==='.tmdb-networks'?networks:s==='.trakttv-lists'?related:s==='.ua-comments-root'?f.comments:null;
 f.context.setupDetailsPresentation(record,{genres:[]});const additional=record.detailPanels.find(x=>x.key==='additional');assert(additional);assert.equal(related.parentNode,additional.body);assert(additional.toggle.textContent==='Додаткова інформація');f.context.setupDetailsPresentation(record,{genres:[]});assert.equal(related.parentNode,additional.body,'repeat adaptation leaves the list in its disclosure');f.context.restoreDetailsPresentation(record);assert.equal(related.parentNode,wrapper);
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

test('D-pad focus uses native Lampa Scroll positioning for the focused Details control and cleans up',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor};f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});
 assert(record.detailScrollBound);const card=new Node('Comment','ua-comment-card selector focus');record.detailPanels.find(p=>p.key==='comments').body.appendChild(card);f.setFocus(card);
 record.detailKeydown({key:'ArrowDown'});assert(f.documentListeners.keydown);f.flushFrames();assert.equal(f.calls.scrolled,card,'native Scroll.immediate positions the focused element in Lampa’s managed scroll container');
 f.context.restoreDetailsPresentation(record);assert.equal(f.documentListeners.keydown,undefined,'teardown removes the temporary key handler');
});

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
 assert(source.includes("record.detailGroup.className='sh-detail-panels'"));assert(source.includes("record.detailGroup.parentNode!==root)root.appendChild(record.detailGroup)"));assert(source.includes("[commentPanel,productionPanel,additionalPanel].forEach"));assert(source.includes("detailDisclosure(record,comments.parentNode,'Коментарі','comments',[comments],true)"));
});

test('all three disclosure rows share the same compact chevron and TV focus treatment',()=>{
 assert(source.includes('.sh-detail-toggle::before{content:\'\';position:absolute;top:50%;right:1.02em'));
 assert(source.includes('border-right:1.5px solid #c9b9ff;border-bottom:1.5px solid #c9b9ff'));
 assert(source.includes('.sh-detail-toggle[aria-expanded="true"]::before{transform:translateY(-30%) rotate(225deg)}'));
 assert(source.includes('.sh-detail-toggle.focus{color:#fff;text-shadow:0 0 1em #ab91ff66;outline:2px solid var(--sh-accent-soft)'));
});
