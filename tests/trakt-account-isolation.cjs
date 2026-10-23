'use strict';
const assert=require('node:assert/strict'),test=require('node:test');
const {fixture,stamp,movie,show,clone}=require('./helpers/trakt-watched-fixture.cjs');
const card={id:1};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const flush=async()=>{for(let i=0;i<80;i++)await Promise.resolve();};
function switchTo(f,account,movies){f.options.account=account;f.options.credential='synthetic-'+account;f.options.movies=movies;}
function transportFor(options,path){
 if(path==='/users/me')return {user:{ids:{uuid:options.account||'fixture-a'}}};
 if(path==='/sync/last_activities')return clone(stamp);
 if(path.startsWith('/sync/watched/movies'))return options.movies||[];
 if(path.startsWith('/sync/watched/shows'))return options.shows||[];
 if(path.startsWith('/sync/history/movies'))return [];
 if(path.startsWith('/shows/'))return {aired:3,completed:3};
 throw Error('Unexpected fixture endpoint');
}
for(const [label,a,b]of [['watched to unwatched',[movie(1)],[]],['unwatched to watched',[],[movie(1)]]])test('account A to B '+label+' invalidates both true and false',async()=>{
 const f=fixture({movies:a});await f.api.syncWatched();assert.equal(f.api.isWatched(card),!!a.length);
 const previous=clone(f.store);switchTo(f,'fixture-b',b);
 assert.equal(f.api.isWatched(card),null);assert.deepEqual(f.store,previous);
 assert.equal((await f.api.syncWatched()).status,'complete');assert.equal(f.api.isWatched(card),!!b.length);assert.equal(f.removes.length,0);
 assert.equal(f.store.trakt_plus_watched_cache.owner,'uuid:fixture-b');
});
test('restart under B cannot hydrate A evidence; matching owner may restore only after verification',async()=>{
 const a=fixture();await a.api.syncWatched();const saved=clone(a.store);
 const b=fixture({account:'fixture-b',credential:'synthetic-b',storage:saved,movies:[]});assert.equal(b.api.isWatched(card),null);await b.api.__test.loadWatched();assert.equal(b.api.isWatched(card),false);
 const same=fixture({storage:saved});assert.equal(same.api.isWatched(card),null);await flush();assert.equal(same.api.isWatched(card),true);assert.equal(same.adds.length,0);
});
test('ownerless v6 cache remains unknown and is preserved until a verified replacement',async()=>{
 const c={v:6,t:Date.now(),m:['1'],status:{t:Date.now(),movies:true,shows:true,ids:['1']},shows:{}};
 const f=fixture({storage:{trakt_plus_watched_cache:c},failMovies:true});assert.equal(f.api.isWatched(card),null);await f.api.__test.loadWatched(true);assert.deepEqual(f.store.trakt_plus_watched_cache,c);assert.equal(f.api.isWatched(card),null);assert.equal(f.removes.length,0);
});
test('logout/login clears in-memory authority without deleting local data',async()=>{
 const f=fixture();await f.api.syncWatched();const saved=clone(f.store);f.options.authorized=false;assert.equal(f.api.isWatched(card),null);assert.equal(f.api.watchedStatus(card).phase,'unavailable');assert.deepEqual(f.store,saved);
 f.options.authorized=true;switchTo(f,'fixture-b',[]);assert.equal(f.api.isWatched(card),null);await f.api.syncWatched();assert.equal(f.api.isWatched(card),false);assert.equal(f.removes.length,0);
});
test('same-user token rotation verifies identity and restores same-owner evidence without reimport',async()=>{
 const f=fixture();await f.api.syncWatched();const cache=clone(f.store.trakt_plus_watched_cache),adds=f.adds.length;
 f.options.credential='synthetic-rotated-same-user';assert.equal(f.api.isWatched(card),null);await flush();assert.equal(f.api.isWatched(card),true);assert.equal(f.adds.length,adds);assert.deepEqual(f.store.trakt_plus_watched_cache,cache);
 assert(!JSON.stringify(cache).includes('synthetic'));
});
for(const mode of ['background','manual'])test('account switch during '+mode+' rejects stale response without committing',async()=>{
 const wait=deferred(),options={movies:[movie(1)]};let held=false;
 options.transport=path=>{if(path.startsWith('/sync/watched/movies')&&!held){held=true;return wait.promise;}return transportFor(options,path);};
 const f=fixture(options),before=clone(f.store);
 const old=mode==='manual'?f.api.syncWatched(true):f.api.__test.loadWatched(true);await flush();assert(held);
 switchTo(f,'fixture-b',[]);assert.equal(f.api.isWatched(card),null);wait.resolve([movie(1)]);await old;
 assert.deepEqual(f.store,before);assert.equal(f.adds.length,0);assert.equal(f.api.isWatched(card),null);
 assert.equal((await f.api.syncWatched()).status,'complete');assert.equal(f.api.isWatched(card),false);
});
test('new account sync need not wait for hung old session and old completion cannot unlock new sync',async()=>{
 const wait=deferred(),options={movies:[movie(1)]};let held=false;
 options.transport=p=>{if(p.startsWith('/sync/watched/movies')&&!held){held=true;return wait.promise;}return transportFor(options,p);};
 const f=fixture(options),old=f.api.syncWatched();await flush();switchTo(f,'fixture-b',[]);
 const b=await f.api.syncWatched();assert.equal(b.status,'complete');assert.equal(f.api.isWatched(card),false);const saved=clone(f.store);
 wait.resolve([movie(1)]);await old;assert.deepEqual(f.store,saved);assert.equal(f.api.isWatched(card),false);
});
test('identity response from an expired session cannot hydrate its cache',async()=>{
 const wait=deferred(),options={};let first=true;
 options.transport=p=>{if(p==='/users/me'&&first){first=false;return wait.promise;}return transportFor(options,p);};
 const f=fixture(options);const old=f.api.__test.loadWatched(true);await flush();switchTo(f,'fixture-b',[]);const current=f.api.syncWatched();wait.resolve({user:{ids:{uuid:'fixture-a'}}});await old;await current;assert.equal(f.api.isWatched(card),false);assert.equal(f.store.trakt_plus_watched_cache.owner,'uuid:fixture-b');
});
test('lazy show-progress from previous owner never marks, persists or emits into new account',async()=>{
 const wait=deferred(),options={movies:[],shows:[show(5,3,[],{seasons:undefined})]};
 options.transport=p=>p.startsWith('/shows/')?wait.promise:transportFor(options,p);
 const f=fixture(options);await f.api.__test.loadWatched(true);assert.equal(f.api.isWatched({id:5,type:'tv'}),null);await flush();switchTo(f,'fixture-b',[]);options.shows=[];await f.api.syncWatched();const before=clone(f.store);
 wait.resolve({aired:3,completed:3});await flush();assert.deepEqual(f.store,before);assert.equal(f.api.isWatched({id:5,type:'anime'}),false);
});
const invalid=[['empty containers',{movies:{},episodes:{}}],['missing all',{movies:stamp.movies,episodes:stamp.episodes}],['null watched',{...stamp,movies:{watched_at:null}}],['numeric timestamp',{...stamp,all:0}],['empty timestamp',{...stamp,all:''}],['garbage date',{...stamp,all:'not-a-date'}],['date-only',{...stamp,all:'2026-01-01'}],['invalid calendar date',{...stamp,all:'2026-02-30T00:00:00.000Z'}],['array container',{...stamp,movies:[]}],['invalid optional paused',{...stamp,episodes:{...stamp.episodes,paused_at:''}}]];
for(const [name,value]of invalid)for(const mode of ['manual','background'])test(mode+' rejects '+name+' activity snapshot without writes',async()=>{
 const f=fixture({activities:value}),before=clone(f.store);
 if(mode==='manual')assert.equal((await f.api.syncWatched()).status,'failed');else assert.equal(await f.api.__test.loadWatched(true),false);
 assert.deepEqual(f.store,before);assert.equal(f.adds.length,0);assert.equal(f.api.isWatched(card),null);
});
for(const mode of ['manual','background'])for(const kind of ['invalid','changed'])test(mode+' validates final '+kind+' snapshot and preserves prior trusted state',async()=>{
 const options={},f=fixture(options);await f.api.syncWatched();const before=clone(f.store);let n=0;
 options.activities=()=>++n===1?stamp:kind==='invalid'?{movies:{},episodes:{}}:{...stamp,all:'2026-01-02T00:00:00.000Z'};options.movies=[movie(2)];const adds=f.adds.length;
 if(mode==='manual')assert.equal((await f.api.syncWatched()).status,'failed');else assert.equal(await f.api.__test.loadWatched(true),false);
 assert.deepEqual(f.store,before);assert.equal(f.adds.length,adds);assert.equal(f.api.isWatched(card),null);
});
test('valid empty-account timestamps and empty lists are complete, without invented watched data',async()=>{
 const f=fixture({movies:[],activities:{movies:{watched_at:'1970-01-01T00:00:00.000Z'},episodes:{watched_at:'1970-01-01T00:00:00.000Z'},all:'2020-02-29T00:00:00.000Z'}});
 assert.equal((await f.api.syncWatched()).status,'complete');assert.equal(f.api.isWatched(card),false);assert.equal(f.api.isWatched({id:5,type:'anime'}),false);assert.equal(f.adds.length,0);assert.equal(f.removes.length,0);
});
for(const response of [null,{}, {user:{ids:{}}}, {user:{ids:{uuid:4}}}])test('unverified identity fails closed '+JSON.stringify(response),async()=>{
 const options={transport:p=>p==='/users/me'?response:transportFor({},p)},f=fixture(options),before=clone(f.store);
 assert.equal((await f.api.syncWatched()).status,'failed');assert.equal(f.api.isWatched(card),null);assert.deepEqual(f.store,before);assert.equal(f.adds.length,0);
});
test('unavailable identity API retains cache and local records without asserting status',async()=>{
 const f=fixture();await f.api.syncWatched();const before=clone(f.store);f.options.credential='synthetic-new';f.options.transport=()=>Promise.reject(Object.assign(Error('network fixture'),{status:401}));
 assert.equal((await f.api.syncWatched()).status,'failed');assert.equal(f.api.isWatched(card),null);assert.deepEqual(f.store,before);assert.equal(f.removes.length,0);
});
test('stale manual completion cannot clear the busy lock of the active new-account import',async()=>{
 const a=deferred(),b=deferred(),options={};let stage='a';
 options.transport=p=>p.startsWith('/sync/watched/movies')?(stage==='a'?a.promise:b.promise):transportFor(options,p);
 const f=fixture(options),old=f.api.syncWatched();await flush();switchTo(f,'fixture-b',[]);stage='b';const current=f.api.syncWatched();await flush();a.resolve([movie(1)]);await old;
 assert.equal((await f.api.syncWatched()).status,'busy');b.resolve([]);assert.equal((await current).status,'complete');assert.equal(f.api.isWatched(card),false);
});
test('authenticated slug fallback is account-bound and never inferred from a credential',async()=>{
 const options={transport:p=>p==='/users/me'?{user:{ids:{slug:'Example-User'}}}:transportFor({},p)},f=fixture(options);
 assert.equal((await f.api.syncWatched()).status,'complete');assert.equal(f.store.trakt_plus_watched_cache.owner,'slug:example-user');assert.equal(f.api.isWatched(card),false);
});
test('Trakt+ requests bypass native response cache and cross-session in-flight deduplication',async()=>{
 let seen=0;const f=fixture({onRequestOptions:({unauthorized,requestOptions})=>{assert.equal(unauthorized,false);assert.equal(requestOptions.cache,false);assert.equal(requestOptions.dedup,false);assert.equal(requestOptions.forceFresh,true);seen++;}});
 // Inspect the actual native public get adapter separately; Trakt+ fixture records
 // options at its API boundary, not through HTTP or real credentials.
 const fs=require('node:fs'),vm=require('node:vm');
 const native=fs.readFileSync(require('node:path').join(__dirname,'../trakt/trakt.js'),'utf8');
 const block=native.slice(native.indexOf('get: function get(url) {'));const body=block.slice(5,block.indexOf('\n    },')+6);
 const calls=[];const get=vm.runInNewContext('('+body.trim().replace(/,$/,'')+')',{requestApi:(...args)=>calls.push(args)});
 const options={cache:false,dedup:false,forceFresh:true};get('/users/me',false,options);assert.deepEqual(calls[0].slice(0,2),['GET','/users/me']);assert.equal(calls[0][5],options);get('/movies/1',true);assert.equal(calls[1][3],true);
 await f.api.syncWatched();assert(f.requests.includes('/users/me'));assert(seen>=5);
});
test('auth event invalidation is immediate and repeat initialization adds no auth listeners',async()=>{
 const f=fixture();await f.api.syncWatched();assert.equal(f.storageHandlers.length,1);assert.equal(f.windowHandlers.length,1);f.reinitialize();assert.equal(f.storageHandlers.length,1);assert.equal(f.windowHandlers.length,1);
 f.options.authorized=false;f.storageHandlers[0]({name:'trakt_token'});assert.equal(f.api.watchedStatus(card).phase,'unavailable');assert.equal(f.api.isWatched(card),null);
});
test('another owner last-success does not suppress automatic sync of the current account',async()=>{
 const f=fixture({storage:{trakt_plus_last_sync:Date.now(),trakt_plus_last_sync_owner:'uuid:fixture-b'}});await f.api.__test.loadWatched(true);assert.equal(f.adds.length,0);
 f.api.__test.scheduleAutoSync();for(const fn of [...f.timers.values()])fn();await flush();assert(f.adds.length>0);assert.equal(f.store.trakt_plus_last_sync_owner,'uuid:fixture-a');
});
test('native authenticated profile response supplies direct ids without a settings wrapper',async()=>{
 const options={transport:p=>p==='/users/me'?{username:'fixture-name',ids:{uuid:'fixture-profile'}}:transportFor({},p)},f=fixture(options);
 assert.equal((await f.api.syncWatched()).status,'complete');assert.equal(f.store.trakt_plus_watched_cache.owner,'uuid:fixture-profile');
});
