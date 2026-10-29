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
 const page=new Node(),root=new Node(),tagBlock=new Node('', 'full-descr__tags'),commentsParent=new Node('', 'items-line'),commentsHead=new Node('Детально','items-line__title'),comments=new Node('Existing comments','ua-comments-root'),anchor=new Node('Synopsis toggle','selector sh-description-toggle'),genre=new Node('Жанр','tag-count selector'),genreName=new Node('Жанр','tag-count__name'),genreCount=new Node('2','tag-count__count'),tags=new Node('Теги','tag-count selector'),tagsName=new Node('Теги','tag-count__name'),tagsCount=new Node('10','tag-count__count'),production=new Node('Виробництво','tag-count selector'),productionName=new Node('Виробництво','tag-count__name');page.connected=true;
 genre.appendChild(genreName);genre.appendChild(genreCount);tags.appendChild(tagsName);tags.appendChild(tagsCount);production.appendChild(productionName);tagBlock.appendChild(genre);tagBlock.appendChild(production);tagBlock.appendChild(tags);root.connected=true;root.appendChild(anchor);root.querySelectorAll=()=>[];page.appendChild(root);page.appendChild(tagBlock);
 commentsParent.appendChild(commentsHead);commentsParent.appendChild(comments);page.appendChild(commentsParent);page.querySelector=s=>s==='.full-descr__tags:not(.networks-wrapper)'?tagBlock:s==='.tmdb-networks'?null:s==='.ua-comments-root'?comments:null;
 const focused=new Node('Torrent','selector focus'),calls={set:0,focus:[]},triggered=[];page.querySelector=s=>s==='.selector.focus'?focused:(s==='.full-descr__tags:not(.networks-wrapper)'?tagBlock:s==='.tmdb-networks'?null:s==='.ua-comments-root'?comments:null);
 const handlers=new WeakMap(),$=node=>({on(name,fn){let h=handlers.get(node)||{};h[name]=fn;handlers.set(node,h);return this},off(ns){let h=handlers.get(node)||{};Object.keys(h).forEach(k=>{if(ns===' .shDetails'||k.includes('shDetails'))delete h[k]});handlers.set(node,h);return this},trigger(name){triggered.push({node,name});return this}});
 const context={document:{createElement:()=>new Node()},$: $,Lampa:{Controller:{enabled:()=>({name:'full_start',controller:{}}),collectionSet(){calls.set++},collectionFocus(node){calls.focus.push(node)}}}};
 const a=source.indexOf('    function restoreDetailsPresentation('),b=source.indexOf('    function setupDescription(',a);assert(a>=0&&b>a,'presentation helpers must exist');vm.createContext(context);vm.runInContext(source.slice(a,b),context);
 return{context,page,root,tagBlock,commentsParent,comments,anchor,genre,tags,production,calls,handlers,triggered,button(){return page.querySelectorAll('.sh-detail-section').find(n=>n.className.includes('--additional'))?.children[0]}};
}

test('Details turns actual TMDb genres into visible named chips and keeps native genre catalog reachable',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor};
 f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'},{id:10765,name:'Науково фантастичний'},{id:18,name:'Драма'}]});
 const chips=record.genreChips.children;assert.deepEqual(chips.map(n=>n.textContent),['Драма','Науково фантастичний']);assert(chips.every(n=>n.classList.contains('selector')));
 f.handlers.get(chips[0])['hover:enter.shDetails']();assert.equal(f.triggered[0].node,f.genre,'genre chip delegates to the existing native genre catalog control');
 assert.equal(record.detailPanels.length,2);assert.equal(f.button().textContent,'Додаткова інформація');assert.equal(f.button().getAttribute('aria-expanded'),'false');
});

test('existing Interface+ genre chips join remote focus and retain the native genre action',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor},nativeRow=new Node(),drama=new Node('Драма'),sciFi=new Node('Науково фантастичний');drama.tagName=sciFi.tagName='SPAN';nativeRow.appendChild(drama);nativeRow.appendChild(sciFi);f.root.querySelectorAll=s=>s==='.full-start-new__details .ifx-series-info > div'?[nativeRow]:[];
 f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'},{id:10765,name:'Науково фантастичний'}]});assert(nativeRow.classList.contains('sh-genre-chips'));assert(drama.classList.contains('selector'));assert.equal(drama.getAttribute('role'),'button');f.handlers.get(drama)['hover:enter.shDetails']();assert.equal(f.triggered.at(-1).node,f.genre,'existing genre UI delegates to the native genre selector');
 f.context.restoreDetailsPresentation(record);assert(!drama.classList.contains('selector'));assert(!drama.classList.contains('sh-genre-chip'));assert.equal(drama.getAttribute('role'),null);assert(!nativeRow.classList.contains('sh-genre-chips'));
});

test('optional comment content is preserved inside its default-open disclosure',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor};f.context.setupDetailsPresentation(record,{genres:[]});const panel=record.detailPanels.find(x=>x.key==='comments');assert(panel);assert.equal(panel.toggle.textContent,'Коментарі');assert.equal(panel.toggle.getAttribute('aria-expanded'),'true');assert.equal(panel.body.hidden,false);assert.equal(panel.body.children[0],f.comments);assert.equal(f.comments.parentNode,panel.body);assert(f.commentsParent.classList.contains('sh-details-heading-hidden'),'duplicate native Details heading is hidden');f.handlers.get(panel.toggle)['hover:enter.shDetails']();assert.equal(panel.body.hidden,true);f.context.restoreDetailsPresentation(record);assert.equal(f.comments.parentNode,f.commentsParent);assert.equal(f.commentsParent.children[1],f.comments);assert(!f.commentsParent.classList.contains('sh-details-heading-hidden'));
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

test('re-adaptation is idempotent and Hybrid teardown restores original native nodes and order',()=>{
 const f=fixture(),record={page:f.page,root:f.root,descriptionToggle:f.anchor};f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});const panel=record.detailPanels[0],chips=record.genreChips,sectionCount=f.page.children.filter(n=>n.className.includes('sh-detail-section')).length;
 f.context.setupDetailsPresentation(record,{genres:[{id:18,name:'Драма'}]});assert.equal(record.detailPanels.length,2);assert.equal(record.genreChips,chips);assert.equal(f.page.children.filter(n=>n.className.includes('sh-detail-section')).length,sectionCount);
 f.context.restoreDetailsPresentation(record);assert.deepEqual(f.tagBlock.children,[f.genre,f.production,f.tags]);assert.equal(record.detailPanels.length,0);assert.equal(record.genreChips,null);assert(!f.page.children.some(n=>n.className.includes('sh-detail-section')));
});

test('Hybrid Details presentation is scoped and does not create an episode renderer or move the torrent focus action',()=>{
 assert.match(source,/body\.stremio-hybrid \.sh-movie-page \.sh-genre-chips/);assert.match(source,/body\.stremio-hybrid \.sh-movie-page \.sh-detail-section/);
 assert.match(source,/\.sh-detail-panels\{position:relative;left:-10px;width:calc\(100% \+ 20px\);display:flex;flex-direction:column/);assert(source.includes("page.querySelector('.tmdb-networks')"));assert(source.includes("root.querySelector('.full-start-new__buttons')"));
 assert(!source.includes('sh-episode-renderer'));assert(source.includes("classList.contains('view--torrent')"));
});

test('Details panels share one aligned row group in comments, studio, information order',()=>{
 assert(source.includes("record.detailGroup.className='sh-detail-panels'"));assert(source.includes("[commentPanel,productionPanel,additionalPanel].forEach"));assert(source.includes("detailDisclosure(record,comments.parentNode,'Коментарі','comments',[comments],true)"));
});
