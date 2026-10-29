'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const inventory=JSON.parse(fs.readFileSync(__dirname+'/../audit/settings/settings-inventory.json','utf8'));
const functionalManifest=JSON.parse(fs.readFileSync(__dirname+'/fixtures/settings-functional-evidence.json','utf8'));
const {fixture:ydFixture}=require('./helpers/ydesign-fixture.cjs');
const {fixture:traktPlusFixture}=require('./helpers/trakt-watched-fixture.cjs');
const {extractFunction,extractParamRegistration}=require('./helpers/settings-owner-source.cjs');

const exercised=new Map();
function mark(owner,keys,evidence,status='Verified in isolated tests'){
 for(const key of keys){const row=inventory.settings.find(item=>item.key===key&&item.owner===owner);assert(row,'No captured owner control '+owner+':'+key);assert(!exercised.has(row.id),'Control counted twice: '+row.id);exercised.set(row.id,{owner,status,evidence});}
}
function refine(owner,key,evidence,status){
 const row=inventory.settings.find(item=>item.key===key&&item.owner===owner);assert(row,'No captured owner control '+owner+':'+key);assert(exercised.has(row.id),'Cannot refine untested control '+row.id);exercised.set(row.id,{owner,status,evidence});
}
function uniqueSettings(rows,names){
 const byName=new Map(rows.filter(row=>row.param&&row.param.name).map(row=>[row.param.name,row]));
 for(const name of names)assert(byName.has(name),'Owner did not register '+name);
 return byName;
}

test('YDesign grid, styles, badges and visual options persist in mock Storage and reach owner effects',()=>{
 const f=ydFixture();f.api.createSettings();
 const values={
  ydesign_theme:'oled',ydesign_style:'neon',ydesign_focus_fx:'glow',
  ydesign_ribbons:false,ydesign_watched_mark:false,ydesign_progress_marks:false,ydesign_collection_mark:false,
  ydesign_grid_items_v:'7',ydesign_card_gap:'1.2',ydesign_ratings_saturate:'25',
  ydesign_v_show_ua:false,ydesign_v_show_age:false,ydesign_v_show_genres:false
 };
 const names=Object.keys(values),registered=uniqueSettings(f.settingsParams,names);
 for(const name of names)assert.notEqual(registered.get(name).param.default,undefined,'Missing saved default '+name);
 for(const[name,value]of Object.entries(values)){f.context.Lampa.Storage.set(name,value);f.api.onSettingChange({name});}
 f.flush(60);f.flush(60);
 for(const name of ['ydesign-theme-oled','ydesign-style-neon','ydesign-focus-glow','ydesign-ribbons-off','ydesign-watched-off','ydesign-progress-off','ydesign-seq-off','ydesign-sat-on','ydesign-v-hide-ua','ydesign-v-hide-age','ydesign-v-hide-genres'])assert(f.classes.has(name),'Expected owner effect '+name);
 assert.equal(f.cssVars['--ydesign-grid-items-v'],'7');assert.equal(f.cssVars['--ydesign-card-gap'],'1.2em');assert.equal(f.cssVars['--ydesign-ratings-saturate'],'25%');
 const restarted=ydFixture({storage:{...f.store}});restarted.api.applyDynamicCSSNow();
 assert.equal(restarted.cssVars['--ydesign-grid-items-v'],'7');assert(restarted.classes.has('ydesign-theme-oled'));
 mark('ui/design-optimized.js',names,'Registered owner options; simulated Storage writes, actual onSettingChange/applyDynamicCSSNow effects and mock restart readback.');
});

test('Cardify+ rating visibility and position handlers update native owner classes and survive mock restart',()=>{
 const source=fs.readFileSync(__dirname+'/../ui/cardify-plus.js','utf8');
 const values={cardify_show_status:true,cardify_show_pg:true,cardify_show_rating:true,cardify_ratings_position:'card'},classes=new Set(),writes=[],registered=[];
 const Lampa={Storage:{field:key=>values[key],set:(key,value)=>{values[key]=value;writes.push(key)}},Settings:{update(){this.updates=(this.updates||0)+1},create(){}},SettingsApi:{addParam:def=>registered.push(def)}};
 const $=()=>({toggleClass:(name,on)=>on?classes.add(name):classes.delete(name),removeClass:(...names)=>names.forEach(name=>classes.delete(name)),addClass:name=>classes.add(name)});
 const ctx={Lampa,$};vm.createContext(ctx);
 const keys=['cardify_show_status','cardify_show_pg','cardify_show_rating','cardify_ratings_position'];
 const blocks=keys.map(name=>extractParamRegistration(source,name));
 vm.runInContext(extractFunction(source,'updateCardifyVisibility')+'\n'+blocks.map(block=>block+');').join('\n'),ctx);
 const params=uniqueSettings(registered,keys);
 assert.deepEqual(keys.map(key=>params.get(key).param.default),[true,true,true,'card']);
 values.cardify_show_status=false;values.cardify_show_pg=false;values.cardify_show_rating=false;
 params.get('cardify_show_rating').onChange(false);
 assert(classes.has('cardify-hide-status'));assert(classes.has('cardify-hide-pg'));assert(classes.has('cardify-hide-rating'));
 params.get('cardify_ratings_position').onChange('corner');
 assert.deepEqual(writes,['cardify_ratings_position']);assert.equal(values.cardify_ratings_position,'corner');
 assert(classes.has('cardify-ratings-corner'));assert.equal(Lampa.Settings.updates,1);
 let hidden=false;params.get('cardify_ratings_position').onRender({hide(){hidden=true;}});assert(hidden,'Position editor must follow the persisted visibility setting');
 const restartClasses=new Set();const restartCtx={Lampa:{Storage:{field:key=>values[key]}},$:()=>({toggleClass:(name,on)=>on?restartClasses.add(name):restartClasses.delete(name),removeClass:(...names)=>names.forEach(name=>restartClasses.delete(name)),addClass:name=>restartClasses.add(name)})};vm.createContext(restartCtx);vm.runInContext(extractFunction(source,'updateCardifyVisibility'),restartCtx);restartCtx.updateCardifyVisibility();
 assert(restartClasses.has('cardify-hide-rating'));assert(restartClasses.has('cardify-ratings-corner'));
 mark('ui/cardify-plus.js',keys,'Actual registration blocks and owner visibility handler; mock persistence/readback, onChange and onRender.');
});

test('Trakt+ preference handlers invalidate configuration and preserve all 18 values across mock restart/reset',async()=>{
 const values={
  trakt_plus_enable:false,trakt_plus_hide_watched:false,trakt_plus_hide_shows:false,trakt_plus_mark:false,trakt_plus_mark_shows:false,
  trakt_plus_autosync:false,trakt_plus_trend_hide_watched:true,trakt_plus_more:false,trakt_plus_full_rows:false,
  trakt_plus_full_button:false,trakt_plus_auto_home:false,trakt_plus_row_limit:'60',trakt_plus_cache_min:'30',
  trakt_plus_min_rating:'7.5',trakt_plus_min_votes:'1000',trakt_plus_rec_type:'shows',
  trakt_plus_exclude_genres:'news, talk-show',trakt_plus_reset_cache:null
 };
 const f=traktPlusFixture({captureSettings:true,fields:{language:'uk'}});f.api.__test.initSettings();
 const names=Object.keys(values),params=uniqueSettings(f.settingsParams,names);
 const configNames=names.filter(name=>name!=='trakt_plus_reset_cache');
 for(const name of configNames){const def=params.get(name);assert.notEqual(def.param.default,undefined,'Missing default '+name);f.runtime.Storage.set(name,values[name]);def.onChange(values[name]);}
 const cfg=f.api.__test.cfg();
 const expected={enable:false,hideWatched:false,hideShows:false,mark:false,markShows:false,autosync:false,trendHide:true,more:false,fullRows:false,fullButton:false,autoHome:false,rowLimit:60,cacheMin:30,minRating:7.5,minVotes:1000,recType:'shows',exclude:['news','talk-show']};
 for(const[key,value]of Object.entries(expected))assert.equal(JSON.stringify(cfg[key]),JSON.stringify(value),'Setting effect mismatch: '+key);
 assert.equal(f.writes.filter(name=>configNames.includes(name)).length,configNames.length);
 const originalRegistrationCount=f.settingsParams.length;f.reinitialize();assert.equal(f.settingsParams.length,originalRegistrationCount,'Repeated plugin enable must not duplicate setting registrations');
 const restarted=traktPlusFixture({captureSettings:true,storage:{...f.store},fields:{...f.fields}});assert.equal(restarted.api.__test.cfg().recType,'shows');assert.equal(restarted.api.__test.cfg().cacheMin,30);
 // The actual reset handler runs against the fixture's intercepted API only.
 f.store.trakt_plus_watched_cache={v:7,owner:'uuid:fixture-a'};
 params.get('trakt_plus_reset_cache').onChange();
 await Promise.resolve();await Promise.resolve();
 assert(f.writes.includes('trakt_plus_watched_cache'));
 assert.deepEqual(f.removes,[],'Resetting cache must not alter local Lampa favorites');
 assert(f.requests.every(path=>path.startsWith('/')),'All reset follow-up requests must remain inside the mock API');
 mark('trakt/trakt-plus.js',names,'Actual registered callbacks/config parser with disposable Storage and intercepted service API; reset keeps local favorites untouched.');
});

test('Interface+ theme setting owner applies a selected theme, yields Hybrid focus and restores default',()=>{
 const source=fs.readFileSync(__dirname+'/../ui/interface-plus.js','utf8'),block=extractFunction(source,'applyTheme');
 let active=null;const bodyClasses=new Set(),added=[];
 const document={body:{classList:{add:x=>bodyClasses.add(x),remove:x=>bodyClasses.delete(x),contains:x=>bodyClasses.has(x)}},getElementById:id=>active&&active.id===id?active:null,createElement:tag=>({tag,remove(){if(active===this)active=null;this.removed=true;}}),head:{appendChild:node=>{active=node;added.push(node);}}};
 const registered=[],ctx={document,window:{StremioHybrid:{ownsPresentation:region=>region==='theme'&&bodyClasses.has('stremio-hybrid')}},hybridOwnsTheme:false,currentInterfaceTheme:null,add:def=>registered.push(def),Lampa:{Lang:{translate:key=>key},SettingsApi:{addParam:def=>registered.push(def)}}};vm.createContext(ctx);
 vm.runInContext(extractParamRegistration(source,'interface_mod_new_theme_select')+');\n'+block,ctx);
 assert.equal(registered[0].param.default,'default');
 ctx.applyTheme('netflix');assert(active&&active.textContent.includes('#E50914'));
 assert(active.textContent.includes('body:not(.stremio-hybrid) .settings-param.focus'),'Standalone focus theme must yield to Hybrid');
 bodyClasses.add('stremio-hybrid');ctx.applyTheme('spotify');assert.equal(added.length,1,'legacy theme yields completely to the active canonical owner');assert.equal(active,null);
 bodyClasses.delete('stremio-hybrid');ctx.applyTheme('spotify');assert.equal(added.length,2);assert(added[1].textContent.includes('#1DB954'));
 ctx.applyTheme('default');assert.equal(active,null,'Default theme must remove the generated override');
 mark('ui/interface-plus.js',['interface_mod_new_theme_select'],'Actual theme application function selected/switched/restored; confirms focus selectors yield while Hybrid owns focus.');
});

test('Hybrid enable setting updates mocked Storage and shell across repeated disable/enable cycles',()=>{
 const source=fs.readFileSync(__dirname+'/../ui/stremio-hybrid.js','utf8');
 let enabled=true,style=null,insertions=0,removals=0;const classes=new Set(),transitions=[],calls=[];
 const body={classList:{contains:key=>classes.has(key),toggle:(key,on)=>on?classes.add(key):classes.delete(key)}};
 const document={body,head:{appendChild(node){style=node;insertions++;}},getElementById:()=>null,createElement:()=>({setAttribute(){},remove(){style=null;removals++;}})};
 const stats={styleInsertions:0,styleUpdates:0,shellTransitions:0,shellAppliedMs:null,firstShellFrameMs:null};
 const settings=[],globals={destroyed:false,style:null,styleStore:{order:[],modules:{}},css:'fixture-css',UI_VERSION:'fixture',bootStats:stats,shellFrame:0,ready:false,watching:false,settingsHub:null,document,window:{performance:{now:()=>1},StremioHybrid:{refresh:()=>calls.push(['refresh'])}},Lampa:{Storage:{set:(key,value)=>{calls.push([key,value]);enabled=value;}},SettingsApi:{addParam:def=>settings.push(def)}},requestAnimationFrame:fn=>{fn();return 1;},cancelAnimationFrame(){},uiNow:()=>1,syncHeaderPresentation(){}};
 vm.createContext(globals);
 vm.runInContext(extractParamRegistration(source,'stremio_hybrid_enabled')+');\n'+[extractFunction(source,'renderOwnedStyles'),extractFunction(source,'applyShell'),extractFunction(source,'apply',{last:true}),extractFunction(source,'setEnabled')].join('\n'),globals);
 assert.equal(settings.length,1);assert.equal(settings[0].param.default,true);
 enabled=false;settings[0].onChange();assert.deepEqual(calls.at(-1),['refresh']);
 globals.setEnabled(false);globals.setEnabled(true);globals.setEnabled(false);globals.setEnabled(true);
 const storageWrites=calls.filter(pair=>pair[0]==='stremio_hybrid_enabled');
 assert.deepEqual(storageWrites.map(pair=>pair[1]),[false,true,false,true]);assert.equal(calls.filter(pair=>pair[0]==='refresh').length,1);assert(classes.has('stremio-hybrid'));
 assert.equal(insertions,2);assert.equal(removals,1);assert.equal(stats.shellTransitions,3);
 mark('ui/stremio-hybrid.js',['stremio_hybrid_enabled'],'Actual setEnabled/applyShell functions with disposable Storage and repeated lifecycle transitions; Hub mounting remains covered by settings-hub-lifecycle.cjs.');
});

test('Trakt auth renders its missing-token state without requesting user data; scrobble interval resolves safely',()=>{
 const source=fs.readFileSync(__dirname+'/../trakt/trakt.js','utf8'),auth=extractParamRegistration(source,'trakt_auth');
 const registrations=[],calls=[],values={trakt_token:null,trakt_scrobble_interval:'90'};
 const Lampa={Storage:{get:key=>values[key],field:key=>values[key]},Lang:{translate:key=>key},SettingsApi:{addParam:def=>registrations.push(def)}};
 const ctx={Lampa,t$1:(key,fallback)=>fallback,startDeviceAuth:()=>calls.push('auth-start')};vm.createContext(ctx);vm.runInContext(auth+');',ctx);
 const def=uniqueSettings(registrations,['trakt_auth']).get('trakt_auth'),labels=[];
 def.onRender({find:()=>({html:value=>labels.push(value)})});assert(labels[0].includes('trakttvAuthMissed'));assert.deepEqual(calls,[]);
 const interval=extractFunction(source,'resolveMinInterval');vm.runInContext(interval,ctx);
 assert.equal(ctx.resolveMinInterval(),90000);values.trakt_scrobble_interval='30';assert.equal(ctx.resolveMinInterval(),30000);values.trakt_scrobble_interval='120';assert.equal(ctx.resolveMinInterval(),120000);values.trakt_scrobble_interval='0';assert.equal(ctx.resolveMinInterval(),90000);
 mark('trakt/trakt.js',['trakt_scrobble_interval'],'Actual interval resolver with mocked Storage and invalid-value fallback.');
 mark('trakt/trakt.js',['trakt_auth'],'Actual registration onRender missing-token branch; Phase 3 test below adds connected/failed status and mocked connect/disconnect paths.','Partially verified');
});

test('Trakt Core registrations route navigation, auth/logout, bookmark sync choices and full reset through isolated mocks',async()=>{
 const source=fs.readFileSync(__dirname+'/../trakt/trakt.js','utf8'),names=['trakt_auth','nav_trakt_sync','nav_trakt_progress','nav_trakt_source','trakt_full_clear','trakt_bookmarks_mode','trakt_bookmarks_favorite_type','trakt_bookmarks_import','trakt_bookmarks_export'];
 const definitions=[],routes=[],notices=[],writes=[],calls=[],operations=[],selections=[],storage={trakt_token:null,trakt_refresh_token:'refresh-fixture',trakt_bookmarks_mode:'watchlist',trakt_bookmarks_favorite_type:'like',favorite_movie:[{id:7}],profile_name:'fixture'};
 const local={trakt_plus_cache:'fixture-cache',trakt_sync_cursor:'fixture-cursor',favorite_movie:'keep',profile_name:'profile-a',other:'keep'};
 const localStorage=Object.assign({get length(){return Object.keys(local).length;},key(index){return Object.keys(local)[index]||null;},removeItem(key){delete local[key];delete this[key];}},local);
 const api={get(path){calls.push(path);return Promise.resolve({username:'fixture-user',vip:false});},auth:{logout(){calls.push('logout');},device:{login(){calls.push('device-login');return Promise.resolve(null);}}}};
 const Lampa={SettingsApi:{addParam:value=>definitions.push(value)},Storage:{get:key=>storage[key],field:key=>storage[key],set:(key,value)=>{storage[key]=value;writes.push([key,value]);}},Lang:{translate:key=>key},Platform:{is:()=>false},Settings:{create:(name,options)=>{routes.push({name,options});},update(){calls.push('settings-update');}},Bell:{push:value=>notices.push(value)}};
 const context={Lampa,Api$1:api,localStorage,window:{},t$1:(key,fallback)=>fallback,DEFAULT_BOOKMARKS_SYNC_TYPES:['book','like','wath','look','viewed','scheduled','continued','thrown'],bookmarksSync:null,
  startDeviceAuth:()=>calls.push('device-auth-dispatched'),logDebugOnce(){},ensureBookmarksSyncAvailable:()=>true,
  runBookmarksSyncOperation:(operation,options)=>operations.push({operation,options}),selectMyList:(title,onSelect)=>selections.push({title,onSelect})};
 const functions=['getBookmarksSyncMode','getSupportedFavoriteTypes','getFavoriteTypeTitle','getBookmarksFavoriteTypeValues','getBookmarksFavoriteType','startBookmarksImportFlow','startBookmarksExportFlow','addMainParams','addSyncParams','addProgressParams','addSourceParams'].map(name=>extractFunction(source,name));
 vm.createContext(context);vm.runInContext(functions.join('\n'),context);context.addMainParams();context.addSyncParams();context.addProgressParams();context.addSourceParams();
 const params=uniqueSettings(definitions,names);
 // Status rendering and disconnect/connect dispatch are exercised without OAuth or account writes.
 const label={value:'',html(value){this.value=value;}};params.get('trakt_auth').onRender({find:()=>label});assert(label.value.includes('trakttvAuthMissed'));assert.deepEqual(calls,[]);
 params.get('trakt_auth').onChange();assert(calls.includes('device-auth-dispatched'));
 storage.trakt_token='synthetic-token';params.get('trakt_auth').onRender({find:()=>label});await Promise.resolve();assert(label.value.includes('fixture-user'));assert(calls.includes('/users/me'));
 params.get('trakt_auth').onChange();assert(calls.includes('logout'));assert(calls.includes('settings-update'));assert.deepEqual(storage.favorite_movie,[{id:7}]);
 api.get=()=>Promise.reject(Error('synthetic expired auth'));params.get('trakt_auth').onRender({find:()=>label});await Promise.resolve();await Promise.resolve();assert.equal(label.value,'<span class="trakt-auth-label">Trakt.TV</span>');
 // Navigation always opens the registered native owner and returns to Trakt on Back.
 for(const [key,target] of [['nav_trakt_sync','trakt_sync'],['nav_trakt_progress','trakt_progress'],['nav_trakt_source','trakt_source']]){
  params.get(key).onChange();assert.equal(routes.at(-1).name,target);routes.at(-1).options.onBack();assert.equal(routes.at(-1).name,'trakt');
 }
 // Import/export controls follow the selected list/favorite type, but the service-operation seam is intercepted.
 storage.trakt_bookmarks_mode='watchlist';params.get('trakt_bookmarks_import').onRender({show(){calls.push('import-visible');},hide(){calls.push('import-hidden');}});params.get('trakt_bookmarks_import').onChange();
 params.get('trakt_bookmarks_export').onChange();assert.equal(JSON.stringify(operations.slice(-2)),JSON.stringify([
  {operation:'import',options:{source:'watchlist',favoriteType:'like'}},
  {operation:'export',options:{target:'watchlist',favoriteType:'like'}}
 ]));
 storage.trakt_bookmarks_mode='my_lists';params.get('trakt_bookmarks_import').onChange();assert.equal(selections.length,1);selections[0].onSelect({listId:44});assert.equal(JSON.stringify(operations.at(-1)),JSON.stringify({operation:'import',options:{source:'my_list',listId:44,favoriteType:'like'}}));
 storage.trakt_token=null;params.get('trakt_bookmarks_export').onRender({show(){},hide(){calls.push('export-hidden');}});assert(calls.includes('export-hidden'));
 // The destructive control only touches Trakt-keyed localStorage plus the explicit auth keys it owns.
 storage.trakt_token='synthetic-token';params.get('trakt_full_clear').onChange();
 assert.equal(local.trakt_plus_cache,undefined);assert.equal(local.trakt_sync_cursor,undefined);assert.equal(local.favorite_movie,'keep');assert.equal(local.profile_name,'profile-a');assert.equal(local.other,'keep');
 for(const key of ['trakt_token','trakt_refresh_token','trakt_token_created_at','trakt_token_expires_in','trakt_token_expires_at','trakt_active_device_auth','trakt_active_device_auth_started_at'])assert(writes.some(([name])=>name===key));
 assert.deepEqual(storage.favorite_movie,[{id:7}]);assert(notices.length);assert(calls.includes('settings-update'));
 mark('trakt/trakt.js',['nav_trakt_sync','nav_trakt_progress','nav_trakt_source','trakt_full_clear'],'Actual registered callbacks/routes or full-clear owner handler with synthetic auth, intercepted API, disposable localStorage and preserved Lampa favorites.');
 mark('trakt/trakt.js',['trakt_bookmarks_mode','trakt_bookmarks_favorite_type'],'Actual mode/type resolver functions control watchlist versus selected-list dispatch and supported favorite type.');
 mark('trakt/trakt.js',['trakt_bookmarks_import','trakt_bookmarks_export'],'Actual registered action callbacks and import/export flow routing; downstream sync operation is intercepted before API or favorite mutations.','Partially verified');
 refine('trakt/trakt.js','trakt_auth','Actual registration covers missing and connected status, rejected /users/me fallback, mocked connect dispatch and disconnect delegation; real device OAuth/polling remains untested.','Partially verified');
});

test('Torrent Cinema preserves functional preferences and safely retires standalone-only settings',()=>{
 const source=fs.readFileSync(__dirname+'/../ui/torrent-cinema/metadata.js','utf8'),entry=fs.readFileSync(__dirname+'/../ui/torrent-cinema/entry.js','utf8'),registered=[],saved={},changed=[];
 const retired=['theme','tv','animations','title_lines','cards','intensity','opacity','darkness'];retired.forEach((name,index)=>saved['torrents_cinema_'+name]='old-value-'+index);const before=JSON.stringify(saved);
 const context={window:{localStorage:{getItem:key=>Object.hasOwn(saved,key)?String(saved[key]):null}},Lampa:{SettingsApi:{addComponent(){},addParam:def=>registered.push(def)},Storage:{get:(key,fallback)=>Object.hasOwn(saved,key)?saved[key]:fallback}},settingsRegistered:false,applySettings:()=>changed.push(true),Date,Set,WeakMap};
 vm.createContext(context);vm.runInContext(source+';var metadata=createCinemaMetadata();'+extractFunction(entry,'registerSettings')+';registerSettings();',context);
 const names=['ua','ua_audio','ua_subs','quality','tracker','sort','dedupe','suspect','auto','parallel','episode_ratings'],params=uniqueSettings(registered,names.map(name=>'torrents_cinema_'+name));
 retired.forEach(name=>assert(!params.has('torrents_cinema_'+name)));assert.equal(JSON.stringify(saved),before,'retired stored values remain untouched for rollback');
 assert.equal(params.get('torrents_cinema_enabled').param.default,true);assert.equal(params.get('torrents_cinema_quality').param.default,'1080');assert.equal(params.get('torrents_cinema_sort').param.default,'recommended');assert.deepEqual(Object.keys(params.get('torrents_cinema_tracker').param.values),['all','toloka','mazepa','source']);params.get('torrents_cinema_quality').onChange();assert.equal(changed.length,1);
 const api=context.metadata,match={eligible:true,similarity:1,reasons:[]},data=(quality,audio,subs,tracker='Toloka')=>({bytes:5e9,seeds:50,tracker,parsed:{quality,audio:{ua:audio},subs:{ua:subs}}});
 const audio=data('1080',true,false),subtitle=data('1080',false,true,'Mazepa'),quality=data('2160',false,false);
 function score(row){return api.score(row,match,{ua:api.flag('ua',true),audio:api.flag('ua_audio',true),subs:api.flag('ua_subs',true),quality:api.setting('torrents_cinema_quality','1080')});}
 assert(score(audio)>score(subtitle));saved.torrents_cinema_ua_audio=false;assert(score(subtitle)>score(audio));saved.torrents_cinema_ua=false;saved.torrents_cinema_quality='2160';assert(score(quality)>score(audio));
 saved.torrents_cinema_tracker='toloka';assert(api.trackerMatches(audio.tracker,api.selectedTrackerFilter()));assert(!api.trackerMatches(subtitle.tracker,api.selectedTrackerFilter()));saved.torrents_cinema_auto=false;assert.equal(api.flag('auto',true),false);
 mark('torrents-redesign.js',retired.map(name=>'torrents_cinema_'+name),'Canonical registration omits obsolete standalone controls and preserves their stored values for rollback.','Retired in Torrent Cinema 2.0; stored value preserved');
 mark('torrents-redesign.js',['torrents_cinema_ua','torrents_cinema_ua_audio','torrents_cinema_ua_subs','torrents_cinema_quality','torrents_cinema_tracker','torrents_cinema_dedupe','torrents_cinema_suspect','torrents_cinema_auto'],'Canonical registration/metadata preferences; dedupe, recommendation and labels additionally exercised by hybrid-torrent-discovery.cjs; no playback.');
});

test('Torrents request concurrency and episode-rating preferences honor mock persistence without external calls',()=>{
 const source=fs.readFileSync(__dirname+'/../ui/torrent-cinema/metadata.js','utf8'),saved={},context={window:{localStorage:{getItem:key=>Object.hasOwn(saved,key)?String(saved[key]):null}},Lampa:{},stopped:false,runningRequests:0,requestQueue:[],ratingCalls:0,ratingNode:()=>{context.ratingCalls++;},flag:null};
 vm.createContext(context);vm.runInContext([extractFunction(source,'setting'),extractFunction(source,'flag'),extractFunction(source,'pumpRequests'),extractFunction(source,'refreshFileRatings')].join('\n'),context);
 saved.torrents_cinema_parallel='2';context.requestQueue=Array.from({length:4},()=>({st:{dead:false},start(){context.runningRequests++;}}));context.pumpRequests();assert.equal(context.runningRequests,2);assert.equal(context.requestQueue.length,2);
 context.runningRequests=1;context.pumpRequests();assert.equal(context.runningRequests,2,'Configured concurrency caps owner scheduling');
 let removed=0;const node={isConnected:true,querySelector:()=>({remove(){removed++;}})};const state={fileNodes:[node]};saved.torrents_cinema_episode_ratings=false;context.refreshFileRatings(state);assert.equal(removed,1);assert.equal(context.ratingCalls,0);
 saved.torrents_cinema_episode_ratings=true;context.refreshFileRatings(state);assert.equal(context.ratingCalls,1);
 mark('torrents-redesign.js',['torrents_cinema_parallel','torrents_cinema_episode_ratings'],'Actual request pump and file-rating owner handlers consume disposable settings; queue starts are counted locally, and rating badge removal/enable is mocked.');
});

test('functional verification set is unique and reaches the requested representative batch size',()=>{
 const expected=new Map(functionalManifest.controls.map(row=>[row.id,row]));
 const added=functionalManifest.controls.filter(row=>row.batch==='phase3').length;
 assert.equal(functionalManifest.controls.filter(row=>row.batch==='baseline').length,functionalManifest.baselineDistinctControls);
 assert.equal(exercised.size,expected.size);assert.equal(exercised.size,functionalManifest.baselineDistinctControls+added);assert(added>=25&&added<=40);
 assert.deepEqual([...exercised.keys()].sort(),[...expected.keys()].sort());
 for(const[id,evidence]of exercised){assert.equal(evidence.status,expected.get(id).status,id);assert.equal(evidence.owner,expected.get(id).owner,id);assert.equal(expected.get(id).liveRuntime,'Not verified',id);}
 global.__settingsFunctionalEvidence=Object.fromEntries(exercised);
});
