'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),test=require('node:test');
const {fixture}=require('./helpers/trakt-watched-fixture.cjs');
const interfaceSource=fs.readFileSync(__dirname+'/../ui/interface-plus.js','utf8'),start=interfaceSource.indexOf('    function seriesInfoModel('),end=interfaceSource.indexOf('    function seriesOwns(',start);
const c={Date,calculateAverageEpisodeDuration:m=>m.episode_run_time?.[0]||0,formatDurationMinutes:n=>n+' хв'};vm.createContext(c);vm.runInContext(interfaceSource.slice(start,end),c);
const movie={id:220542,source:'tmdb',media_type:'tv',first_air_date:'2023-10-22',number_of_seasons:1,number_of_episodes:60,episode_run_time:[23],seasons:[{season_number:0,episode_count:53},{season_number:1,episode_count:60}],next_episode_to_air:{id:7810341,season_number:1,episode_number:52,air_date:'2026-10-23'}};
const episodes=[{id:7810341,season_number:1,episode_number:52,air_date:'2026-10-23'},{id:7810342,season_number:1,episode_number:53,air_date:'2026-10-30'}];
const progress={aired:52,completed:52,last_episode:{title:'The Last Volume',season:1,number:52,ids:{tmdb:7810341},first_aired:'2026-10-23T14:40:00Z'},next_episode:{title:'Next volume',season:1,number:53,ids:{tmdb:7810342},first_aired:'2026-10-30T14:40:00Z'},seasons:[{number:0,aired:1,completed:1},{number:1,aired:52,completed:52}]};
const evidence={confirmed:true,phase:'ready',completed:52,aired:52,last:{title:'The Last Volume',tmdb:7810341,season:1,number:52},next:{title:'Next volume',date:'2026-10-30',tmdb:7810342,season:1,number:53},seasons:[{number:1,aired:52,completed:52}]};
const model=(m=movie,e=episodes,p=evidence)=>JSON.parse(JSON.stringify(c.seriesInfoModel(m,e,p,'2026-10-24')));
const transport=(path)=>{if(path==='/users/me')return {ids:{uuid:'fixture-details'}};if(path.startsWith('/search/tmdb/'))return [{show:{ids:{tmdb:220542,trakt:202569}}}];if(path.startsWith('/shows/'))return progress;throw Error('Unexpected fixture path '+path)};
test('only confirmed Trakt counters, one occurrence, runtime retained; no TMDB season/episode totals',()=>{
 const view=model(),keys=view.fields.map(f=>f.key);assert.equal(new Set(keys).size,keys.length);
 assert.equal(view.fields.find(f=>f.key==='watched').text,'Trakt · Переглянуто: 52/52 в ефірі');
 assert(!keys.includes('seasons'));assert(!keys.includes('episodes'));assert.equal(view.fields.find(f=>f.key==='runtime').text,'≈23 хв');
 assert.equal(view.last,'Остання переглянута (Trakt): The Last Volume');assert.match(view.next,/Next volume.*2026-10-30/);
});
test('unavailable/loading/error do not fabricate zero, seasons, episodes or TMDB future episode',()=>{
 for(const phase of ['unavailable','loading','error']){const view=model(movie,episodes,{phase});assert(!view.fields.some(f=>/Переглянуто: 0/.test(f.text)));assert(!view.fields.some(f=>/^(seasons|episodes)$/.test(f.key)));assert.equal(view.last,'');assert.equal(view.next,'');}
});
test('absolute numbers without titles never become fabricated local S1E52, even with matching TMDB IDs',()=>{
 const view=model(movie,episodes,{...evidence,last:{tmdb:7810341,season:1,number:52},next:{tmdb:7810342,season:1,number:53}});
 assert.equal(view.last,'');assert.equal(view.next,'');assert.match(view.fields.find(f=>f.key==='watched').text,/52\/52 в ефірі/);
});
test('different TMDB/Trakt or anime season catalogues never overwrite Trakt counters or claim total seasons',()=>{
 for(const count of [1,3,99]){const view=model({...movie,number_of_seasons:count,number_of_episodes:900,seasons:[{season_number:count,episode_count:900}]},episodes,evidence);assert.equal(view.fields.find(f=>f.key==='watched').text,'Trakt · Переглянуто: 52/52 в ефірі');assert(!view.fields.some(f=>f.key==='seasons'||f.key==='episodes'));}
});
test('invalid or fractional personal counters remain unknown',()=>{
 for(const completed of [null,-1,53,1.5,'52'])assert(!model(movie,episodes,{...evidence,completed}).fields.some(f=>f.key==='watched'));
});
test('confirmed unwatched zero and last-known confirmed error remain distinct from unknown',()=>{
 assert.match(model(movie,episodes,{...evidence,completed:0,last:null}).fields.find(f=>f.key==='watched').text,/0\/52/);
 assert.match(model(movie,episodes,{...evidence,phase:'error'}).fields.find(f=>f.key==='watched').text,/52\/52/);
});
test('details API verifies account/show identity, reads progress, caches/coalesces without importing any history',async()=>{const f=fixture({transport});const [a,b]=await Promise.all([f.api.detailsProgress(movie),f.api.detailsProgress(movie)]);assert.equal(a.confirmed,true);assert.equal(a.completed,52);assert.equal(a.last.tmdb,7810341);assert.equal(a.last.title,'The Last Volume');assert.equal(a.next.tmdb,7810342);assert.equal(a.seasons.length,1);assert.equal(f.requests.filter(p=>p.startsWith('/shows/')).length,1);await f.api.detailsProgress(movie);assert.equal(f.requests.filter(p=>p.startsWith('/shows/')).length,1);assert.equal(f.writes.length,0);assert.equal(f.adds.length,0);assert.equal(f.removes.length,0);assert.equal(a.session,b.session);});
test('details disabled, signed out, unknown mapping and invalid counters do not publish fabricated progress',async()=>{for(const opts of [{authorized:false},{fields:{trakt_plus_enable:false}},{transport:p=>p==='/users/me'?{ids:{uuid:'fixture'}}:[]},{transport:p=>p.startsWith('/shows/')?{aired:null,completed:null}:transport(p)}]){const f=fixture(opts);const r=await f.api.detailsProgress(movie);assert.equal(r.confirmed,false);assert.equal(r.completed,undefined)}});
test('details error preserves same-session last verified evidence, but new account cannot reuse it',async()=>{let offline=false;const f=fixture({transport:p=>{if(offline&&p.startsWith('/shows/'))throw Object.assign(Error('offline'),{status:401});return transport(p)}});await f.api.detailsProgress(movie);offline=true;const r=await f.api.detailsProgress(movie,true);assert.equal(r.confirmed,true);assert.equal(r.phase,'error');assert.equal(r.completed,52);f.options.credential='new-synthetic-token';const changed=await f.api.detailsProgress(movie);assert.equal(changed.confirmed,false);assert.notEqual(changed.session,r.session);});
test('late account-A result is cancelled rather than displayed after token/session changes',async()=>{let finish;const f=fixture({transport:p=>p.startsWith('/shows/')?new Promise(r=>finish=r):transport(p)});const pending=f.api.detailsProgress(movie);for(let i=0;i<20&&!finish;i++)await Promise.resolve();assert(finish);f.options.credential='other-fixture';f.api.detailsSession();finish(progress);const r=await pending;assert.equal(r.confirmed,false);assert.equal(r.phase,'cancelled');});
test('repeated full/renderer initialization has no multi-target .after insertion; canonical owner and Hybrid handoff explicit',()=>{const native=fs.readFileSync(__dirname+'/../trakt/trakt.js','utf8'),a=native.indexOf('showWatchProgress: function'),b=native.indexOf('addHistoryButton:',a),legacy=native.slice(a,b);assert(!legacy.includes('taglineElement.after'));assert(legacy.includes('window.LampaSeriesDetails.owns'));assert(legacy.includes("host.append(progressElement)"));assert(interfaceSource.includes('if (window.__ifx_plugin_initialized) return;'));assert(fs.readFileSync(__dirname+'/../ui/stremio-hybrid.js','utf8').includes("record.root.querySelector('[data-series-info]')"));});
