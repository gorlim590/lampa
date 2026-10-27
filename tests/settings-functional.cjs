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
 const registered=[],ctx={document,add:def=>registered.push(def),Lampa:{Lang:{translate:key=>key},SettingsApi:{addParam:def=>registered.push(def)}}};vm.createContext(ctx);
 vm.runInContext(extractParamRegistration(source,'interface_mod_new_theme_select')+');\n'+block,ctx);
 assert.equal(registered[0].param.default,'default');
 ctx.applyTheme('netflix');assert(active&&active.textContent.includes('#E50914'));
 assert(active.textContent.includes('body:not(.stremio-hybrid) .settings-param.focus'),'Standalone focus theme must yield to Hybrid');
 bodyClasses.add('stremio-hybrid');ctx.applyTheme('spotify');assert.equal(added.length,2);assert(added[1].textContent.includes('#1DB954'));
 ctx.applyTheme('default');assert.equal(active,null,'Default theme must remove the generated override');
 mark('ui/interface-plus.js',['interface_mod_new_theme_select'],'Actual theme application function selected/switched/restored; confirms focus selectors yield while Hybrid owns focus.');
});

test('Hybrid enable setting updates mocked Storage and shell across repeated disable/enable cycles',()=>{
 const source=fs.readFileSync(__dirname+'/../ui/stremio-hybrid.js','utf8');
 let enabled=true,style=null,insertions=0,removals=0;const classes=new Set(),transitions=[],calls=[];
 const body={classList:{contains:key=>classes.has(key),toggle:(key,on)=>on?classes.add(key):classes.delete(key)}};
 const document={body,head:{appendChild(node){style=node;insertions++;}},getElementById:()=>null,createElement:()=>({setAttribute(){},remove(){style=null;removals++;}})};
 const stats={styleInsertions:0,shellTransitions:0,shellAppliedMs:null,firstShellFrameMs:null};
 const settings=[],globals={destroyed:false,style:null,css:'fixture-css',UI_VERSION:'fixture',bootStats:stats,shellFrame:0,ready:false,watching:false,settingsHub:null,document,window:{performance:{now:()=>1},StremioHybrid:{refresh:()=>calls.push(['refresh'])}},Lampa:{Storage:{set:(key,value)=>{calls.push([key,value]);enabled=value;}},SettingsApi:{addParam:def=>settings.push(def)}},requestAnimationFrame:fn=>{fn();return 1;},cancelAnimationFrame(){},uiNow:()=>1,syncHeaderPresentation(){}};
 vm.createContext(globals);
 vm.runInContext(extractParamRegistration(source,'stremio_hybrid_enabled')+');\n'+[extractFunction(source,'applyShell'),extractFunction(source,'apply',{last:true}),extractFunction(source,'setEnabled')].join('\n'),globals);
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
 mark('trakt/trakt.js',['trakt_auth'],'Actual missing-token onRender only; no auth-start/API call.','Partially verified');
});

test('functional verification set is unique and reaches the requested representative batch size',()=>{
 const expected=new Map(functionalManifest.controls.map(row=>[row.id,row]));
 assert.equal(exercised.size,expected.size);assert(exercised.size>=25&&exercised.size<=40);
 assert.deepEqual([...exercised.keys()].sort(),[...expected.keys()].sort());
 for(const[id,evidence]of exercised)assert.equal(evidence.status,expected.get(id).status,id);
 global.__settingsFunctionalEvidence=Object.fromEntries(exercised);
});
