'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../media/average-rating.js','utf8');
function helpers(storage){const context={Lampa:{Storage:{get:(key,value)=>key in storage?storage[key]:value}}};vm.createContext(context);for(const name of ['getRatingSize','ratingsApiKey'])vm.runInContext(source.match(new RegExp('function '+name+'\\([^\\n]+'))[0],context);return context;}
test('Details reuses configured YDesign service credentials without exposing/copying them',()=>{const f=helpers({ydesign_omdb_key:'fixture-omdb',ydesign_mdblist_key:'fixture-mdb'});assert.equal(f.ratingsApiKey('omdb'),'fixture-omdb');assert.equal(f.ratingsApiKey('mdblist'),'fixture-mdb');const own=helpers({omdb_api_key:'own',ydesign_omdb_key:'other'});assert.equal(own.ratingsApiKey('omdb'),'own');assert.equal(helpers({}).ratingsApiKey('mdblist'),'');});
test('small legacy Details ratings gain a TV-readable minimum, larger settings remain respected',()=>{for(const size of ['0.5em','0.8em','1.1em',undefined,'bogus'])assert.equal(helpers({omdb_rating_size:size}).getRatingSize(),'1.25em');assert.equal(helpers({omdb_rating_size:'1.5em'}).getRatingSize(),'1.5em');assert.equal(helpers({omdb_rating_size:'2.0em'}).getRatingSize(),'2.0em');});
test('public score replacement becomes ready only after a valid score exists; personal rating is excluded',()=>{let ready=false,items=[];const context={isRatingEnabled:()=>true,normalizeValue:v=>String(v),getColor:()=>'',createBlock:(...args)=>args,refreshAverage:()=>{}};vm.createContext(context);const start=source.indexOf('    function addRatingBlock('),end=source.indexOf('\n    function ',start+10);vm.runInContext(source.slice(start,end),context);const container={find:()=>({length:0}),append:item=>items.push(item),closest:()=>({addClass:()=>ready=true})};context.addRatingBlock(container,'rate--imdb','',null,'imdb');assert.equal(ready,false);context.addRatingBlock(container,'rate--imdb','',7.8,'imdb');assert.equal(ready,true);assert.equal(items.length,1);assert(source.includes("container.children('.custom-rating')"));assert(!source.includes("render.find('.rate--tmdb, .rate--imdb, .rate--kp, .full-start__rates').remove()"));});
test('late-loaded ratings hydrate an already-open Full once, without refreshing the page or polling',()=>{let current={component:'main'},exists=false,calls=0;const movie={id:10,vote_average:8};const c={CONTAINER_CLASS:'omdb-mdb-yarik-rate',Lampa:{Activity:{active:()=>current}},updateRatings:e=>{assert.equal(e.data.movie,movie);calls++;exists=true;}};vm.createContext(c);vm.runInContext(source.slice(source.indexOf('    function hydrateOpenRatings('),source.indexOf('    function startPlugin(')),c);c.hydrateOpenRatings();assert.equal(calls,0);current={component:'full',activity:{component:{props:{get:()=>movie}},render:()=>({find:()=>({length:exists?1:0})})}};c.hydrateOpenRatings();c.hydrateOpenRatings();assert.equal(calls,1);});

test('missing IMDb identity resolves through the native Reguest transport for movies and shows',()=>{
 const code=source.slice(source.indexOf('        if (imdb_id) {'),source.indexOf('        refreshAverage(container);',source.indexOf('        if (imdb_id) {')));
 for(const [method,seasons,expected] of [['movie',undefined,'movie'],['tv',2,'tv'],['movie',3,'tv']]){
  const sent=[],ids=[];let response;
  const Lampa={Reguest:function(){this.silent=(url,ok)=>{sent.push(url);response=ok;}},TMDB:{api:path=>'fixture/'+path,key:()=>'fixture-key'}};
  const c={ratingStatus:()=>{},container:{},window:{Lampa},Lampa,imdb_id:'',movie:{id:438631,number_of_seasons:seasons},e:{object:{method}},requestSources:id=>ids.push(id)};
  vm.runInNewContext(code,c);assert.equal(sent.length,1);assert(sent[0].startsWith('fixture/'+expected+'/438631/external_ids?'));assert.deepEqual(ids,[]);
  response({});assert.deepEqual(ids,[]);response({imdb_id:'tt1160419'});assert.deepEqual(ids,['tt1160419']);
 }
 const ids=[];vm.runInNewContext(code,{ratingStatus:()=>{},container:{},imdb_id:'tt1160419',requestSources:id=>ids.push(id)});assert.deepEqual(ids,['tt1160419']);
});

test('public request diagnostics expose only status codes and bound requests',()=>{
 const attrs={};let config;
 const c={$:{ajax:x=>{config=x;return x;}}};vm.createContext(c);
 vm.runInContext(source.slice(source.indexOf('    function ratingStatus('),source.indexOf('    function getRatingGap(')),c);
 const container={attr:(key,value)=>attrs[key]=value};let consumed=0,completed=0;
 c.requestPublicRating(container,'omdb','fixture-private-url',()=>consumed++,()=>completed++);
 assert.equal(config.timeout,8000);assert.equal(attrs['data-rating-omdb'],'loading');
 config.success({Response:'False',Error:'Invalid API key! private-value'});assert.equal(attrs['data-rating-omdb'],'authentication-error');
 config.success({error:'Daily API limit exceeded!'});assert.equal(attrs['data-rating-omdb'],'rate-limited');
 config.error({status:429},'error');assert.equal(attrs['data-rating-omdb'],'http-429');
 config.error({status:0},'timeout');assert.equal(attrs['data-rating-omdb'],'timeout');
 config.error({status:0},'error');assert.equal(attrs['data-rating-omdb'],'network-error');
 config.complete();assert.equal(completed,1);assert.equal(consumed,2);assert(!JSON.stringify(attrs).includes('private'));
 assert.equal(c.ratingResponseStatus(null),'invalid-response');assert.equal(c.ratingResponseStatus({ratings:[]}),'received');
});

test('public sources start independently and do not wait for a hanging OMDb callback',()=>{
 const started=[];const c={requestOMDB:id=>started.push('omdb:'+id),requestMDBList:id=>started.push('mdb:'+id)};
 const start=source.indexOf('        var requestSources = function('),end=source.indexOf('        // Full completion',start);
 vm.runInNewContext(source.slice(start,end),c);c.requestSources('tt1160419');assert.deepEqual(started,['omdb:tt1160419','mdb:tt1160419']);
 const omdb=source.slice(source.indexOf('        var requestOMDB ='),start);assert(!omdb.includes('requestMDBList('));
});
test('overlapping public sources cannot append a second IMDb rating',()=>{
 let appended=0;const c={isRatingEnabled:()=>true};vm.createContext(c);
 const start=source.indexOf('    function addRatingBlock('),end=source.indexOf('\n    function ',start+10);vm.runInContext(source.slice(start,end),c);
 const container={find:selector=>({length:selector.includes('data-rating-key=')?1:0}),append:()=>appended++};
 c.addRatingBlock(container,'rate--omdb-imdb','',8,'imdb');c.addRatingBlock(container,'rate--mdblist-imdb','',8,'imdb');assert.equal(appended,0);
});

test('repeated Full completion coalesces sources on the same container without mixing movie/show IDs',()=>{
 const c={};vm.createContext(c);vm.runInContext(source.slice(source.indexOf('    function beginPublicRatings('),source.indexOf('    function getRatingGap(')),c);
 const host={0:{}};assert.equal(c.beginPublicRatings(host,{id:10},'movie'),true);assert.equal(c.beginPublicRatings(host,{id:10},'movie'),false);
 assert.equal(c.beginPublicRatings(host,{id:10},'tv'),true);assert.equal(c.beginPublicRatings(host,{id:11},'tv'),true);assert.equal(c.beginPublicRatings({0:{}},{id:10},'movie'),true);
});
