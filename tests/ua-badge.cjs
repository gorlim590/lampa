'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {fixture}=require('./helpers/ydesign-fixture.cjs');
const root=path.join(__dirname,'..'),tick=()=>new Promise(setImmediate);
for(const [name,data,expected] of [
 ['Ukrainian original movie',{original_language:'uk'},true],
 ['ISO-639-2 original',{original_language:'ukr'},true],
 ['explicit movie audio',{audio_languages:['en','uk-UA']},true],
 ['series audio track',{audio_tracks:[{language:'uk',type:'audio'}]},true],
 ['anime voice label',{voice_over:'Український дубляж'},true],
 ['localized title',{title:'Українська назва',language:'uk',original_language:'en'},false],
 ['subtitles only',{subtitles:['uk'],subtitle_languages:['uk']},false],
 ['subtitle in audio array',{audio_tracks:[{language:'uk',type:'subtitle'}]},false],
 ['mixed object field priority',{audio_tracks:[{language:'en',title:'Ukr subtitles'}]},false],
 ['subtitles text',{audio_languages:['English','Ukr subtitles']},false],
 ['minor spoken dialogue',{spoken_languages:[{iso_639_1:'uk'}]},false],
 ['no metadata',{},false]
])test('UA audio evidence: '+name,()=>assert.equal(fixture().api.confirmedUaAudio(data),expected));
test('reuses loaded audio immediately; uncached WH starts before extended metadata',async()=>{
 const f=fixture(),known=f.api.beginUaAudio({id:20,audio_tracks:[{language:'uk'}]},'movie');
 assert.equal(known.known,true);assert.equal(await known.answer,true);assert.equal(f.jobs.length,0);
 const pending=f.api.beginUaAudio({id:21},'movie');assert.equal(f.jobs.length,1);assert(f.jobs[0].url.includes('serial=0'));f.jobs[0].success({play:'https://example.org/ua'});assert.equal(await pending.answer,true);
 const source=fs.readFileSync(path.join(root,'ui/design-optimized.js'),'utf8'),build=source.slice(source.indexOf('var buildExtendedCard = function'));
 assert(build.indexOf('beginUaAudio(data, type)')<build.indexOf('fetchExtendedData(data.id, type)'));
});
test('unknown errors have bounded retry cooldown, no false persistent negative, then recover',async()=>{
 const f=fixture();let now=Date.now();f.context.Date=class extends Date{static now(){return now;}};
 const a=f.api.checkUaVoiceover(100,'movie'),b=f.api.checkUaVoiceover(100,'movie');assert.equal(a,b);assert.equal(f.jobs.length,1);
 f.jobs[0].error();assert.equal(await a,null);assert.equal(await f.api.checkUaVoiceover(100,'movie'),null);assert.equal(f.jobs.length,1);assert.equal(f.api.ApiCache.get('ua_v2_movie_100'),null);
 now+=31000;const retry=f.api.checkUaVoiceover(100,'movie');assert.equal(f.jobs.length,2);f.jobs[1].success(true);assert.equal(await retry,true);
});
test('subtitle labels and title words do not masquerade as release audio',()=>{
 const f=fixture();for(const s of ['Movie 2024 [UKR / ENG]','Movie.2024.1080p.UKR','Movie 2024 Audio: Ukrainian'])assert.equal(f.api.titleHasUaVoice(s),true,s);
 for(const s of ['Movie 2024 [Subs: UKR]','Movie 2024 Ukrainian subtitles','The Ukrainian 2024 1080p','Україна 2024 1080p'])assert.equal(f.api.titleHasUaVoice(s),false,s);
});
test('torrent audio lookups coalesce typed IDs, ignore legacy positives and clear the watchdog',async()=>{
 const f=fixture(),calls=[];f.context.Lampa.Parser={get:(query,ok,error)=>calls.push({query,ok,error})};
 f.api.ApiCache.set('uat_tv_42',{r:true,t:Date.now()});assert.equal(f.api.torrentUaCached(42,'tv'),null);
 const data={id:42,original_title:'Fixture'},a=f.api.checkTorrentsUa(data,'anime'),b=f.api.checkTorrentsUa(data,'tv');assert.equal(a,b);await tick();assert.equal(calls.length,1);assert.equal(calls[0].query.movie.number_of_seasons,1);
 calls[0].ok({Results:[{Title:'Fixture [UKR]',Seeders:4}]});assert.equal(await a,true);assert.equal([...f.timers.values()].filter(t=>t.ms===25000).length,0);assert.equal(f.api.torrentUaCached(42,'tv'),true);
 const movie=f.api.checkTorrentsUa(data,'movie');await tick();assert.equal(calls.length,2);calls[1].ok({error:'unavailable'});assert.equal(await movie,null);assert.equal(f.api.torrentUaCached(42,'movie'),null);
});
test('a torrent response after timeout cannot turn unknown into UA or populate the cache',async()=>{
 const f=fixture();let reply;f.context.Lampa.Parser={get:(query,ok)=>reply=ok};const p=f.api.checkTorrentsUa({id:1,original_title:'Fixture'},'movie');await tick();f.flush(25000);assert.equal(await p,null);reply({Results:[{Title:'Fixture [UKR]',Seeders:4}]});assert.equal(f.api.torrentUaCached(1,'movie'),null);
});
test('Nightingale is removed from delivery; only the saturated bottom badge is rendered',()=>{
 assert.equal(fs.existsSync(path.join(root,'community/nightingale.js')),false);
 assert(!JSON.parse(fs.readFileSync(path.join(root,'plugins.json'),'utf8')).some(p=>/nightingale/i.test(p.url)));
 const source=fs.readFileSync(path.join(root,'ui/design-optimized.js'),'utf8');assert(!source.includes('nightingale-ua-flag'));assert(source.includes('background:#ffd700 !important'));assert(source.includes('color:#17202a !important'));
});

test('hidden UA does no lookup and WH queue reserves capacity for metadata',async()=>{
 const hidden=fixture({storage:{ydesign_v_show_ua:false}}),off=hidden.api.beginUaAudio({id:1},'movie');assert.equal(off.enabled,false);assert.equal(await off.answer,null);assert.equal(hidden.jobs.length,0);
 const f=fixture(),promises=[1,2,3,4].map(id=>f.api.checkUaVoiceover(id,'movie'));assert.equal(f.jobs.length,2);
 const metadata=f.api.fetchExtendedData(100,'movie');assert.equal(f.jobs.length,3);assert(f.jobs[2].url.includes('/movie/100?'));
 f.jobs[2].success({id:100,tagline:'Fixture',genres:[{id:18,name:'Drama'}]});await metadata;f.jobs[0].success(false);assert.equal(f.jobs.length,4);f.jobs[1].success(false);assert.equal(f.jobs.length,5);f.jobs[3].success(false);f.jobs[4].success(false);assert.deepEqual(await Promise.all(promises),[false,false,false,false]);
});

test('recycled, replaced and detached cards reject old UA completions',()=>{
 const f=fixture(),data={id:42},el={isConnected:true,_ydesign_render:1,_ydesign_data:data};assert.equal(f.api.cardRenderCurrent(el,data,1,'42'),true);
 data.id=43;assert.equal(f.api.cardRenderCurrent(el,data,1,'42'),false);data.id=42;el._ydesign_render=2;assert.equal(f.api.cardRenderCurrent(el,data,1,'42'),false);
 el._ydesign_render=1;el._ydesign_data={id:42};assert.equal(f.api.cardRenderCurrent(el,data,1,'42'),false);el._ydesign_data=data;el.isConnected=false;assert.equal(f.api.cardRenderCurrent(el,data,1,'42'),false);
});
