'use strict';
// Manual existing-CDP runner: three scenarios, no browser/context/page launch.
// Run with Playwright available in the environment: node tests/torrent-cinema-browser.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process'),{chromium}=require('playwright');
const standalone=process.argv.includes('--standalone');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'audit/torrent-cinema');
const fixture=require('./helpers/torrent-cinema-browser-fixture.cjs');
const hash=body=>crypto.createHash('sha256').update(body).digest('hex');
const files=['ui/torrent-cinema.js','ui/stremio-hybrid.js','ui/torrent-overlay.js','torrents-redesign.js','loader.js','ui/settings-hub.js'];
const assets=new Map(files.map(file=>[path.basename(file),file]));
const report={installation:standalone?'direct canonical plugin; Hybrid/other visual extensions suppressed for this isolated test':'Hybrid integration',suppressedScripts:[],commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),branch:execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim(),fixture:true,assets:{},checks:[],layouts:[],exceptions:[],blockedWrites:0,limits:['Synthetic parser results and transport; real native Lampa Full/torrent/Files template/Modal/controllers','Physical Google TV, real providers, TorrServer/player/track switching and 4K playback unverified','Host delivery errors/toast recorded separately; no whole-page zero-error claim']};
const check=(name,passed,details)=>{report.checks.push({name,status:passed?'PASS':'FAIL',details});assert(passed,name);};
const shadow=`(()=>{const p=Storage.prototype,m=new WeakMap(),cleared=new WeakSet(),get=p.getItem;function s(x){let v=m.get(x);if(!v){v=new Map();m.set(x,v)}return v}p.getItem=function(k){k=String(k);return s(this).has(k)?s(this).get(k):cleared.has(this)?null:get.call(this,k)};p.setItem=function(k,v){s(this).set(String(k),String(v))};p.removeItem=function(k){s(this).set(String(k),null)};p.clear=function(){s(this).clear();cleared.add(this)};})();`;
async function geometry(page){return page.evaluate(()=>{
    const modal=[...document.querySelectorAll('.sh-torrent-overlay')].find(n=>!n.hidden),rect=n=>{if(!n)return null;const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
    const list=[...modal.querySelectorAll('.torrent-item')].filter(n=>n.getBoundingClientRect().height>0),tools=modal.querySelector('.ctr-tools'),viewport=modal.querySelector('.torrent-list')?.closest('.scroll')?.getBoundingClientRect();
    const visible=list.filter(n=>{const r=n.getBoundingClientRect();return r.top>=(viewport?.top||0)&&r.bottom<=(viewport?.bottom||innerHeight);});
    const info=rect(modal.querySelector('.torrent-item:not([hidden]) .tc-info'));
    return {viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,modal:rect(modal),firstRow:rect(list[0]),lastVisibleRow:rect(visible.at(-1)),focus:rect(modal.querySelector('.focus')),filters:rect(tools),visibleRows:visible.length,filterOverflow:tools.scrollWidth-tools.clientWidth,horizontalOverflow:document.documentElement.scrollWidth-innerWidth,font:parseFloat(getComputedStyle(modal).fontSize),toolbars:modal.querySelectorAll('.ctr-tools').length,inlineFilesButtons:modal.querySelectorAll('.tc-open-files').length,controller:Lampa.Controller.enabled().name,styleCount:document.querySelectorAll('#torrent-cinema-style').length,legacyStyles:document.querySelectorAll('#torrents-redesign-style,#sh-torrent-overlay-style').length,info,infoRound:!!info&&Math.abs(info.width-info.height)<=1};
});}
async function rowTextGeometry(page,expanded=false){return page.evaluate(expanded=>{
    const all=[...document.querySelectorAll('.sh-torrent-overlay:not([hidden]) .torrent-item:not([hidden])')].filter(n=>n.getBoundingClientRect().height>0&&(!expanded||n.querySelector('.tc-details:not([hidden])'))),targets=expanded?['.tc-raw-title']:['.ctr-name','.tc-secondary-row','.tc-audio-label','.tc-voice','.tc-subtitles'],box=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}},inside=(r,c)=>r.x>=c.x-1&&r.y>=c.y-1&&r.right<=c.right+1&&r.bottom<=c.bottom+1;
    return all.map((row,index)=>{const clip=expanded?row.querySelector('.tc-details'):row,raw=row._ctrSource?.Title||row._ctrSource?.Name||'',texts=targets.flatMap(selector=>{const n=row.querySelector(selector);if(!n||!n.textContent.trim())return[];const r=box(n),c=box(clip),style=getComputedStyle(n),range=document.createRange();range.selectNodeContents(n);const textRects=[...range.getClientRects()].map(x=>({x:x.x,y:x.y,right:x.right,bottom:x.bottom,width:x.width,height:x.height}));const naturalFit=selector==='.ctr-name'||selector==='.tc-raw-title'||(n.scrollWidth<=n.clientWidth+1&&n.scrollHeight<=n.clientHeight+1);return[{selector,text:n.textContent.trim(),rect:r,clip:c,visible:!!r.width&&!!r.height&&style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)>0&&naturalFit&&textRects.some(x=>x.width&&x.height&&inside(x,c)),textRects,scroll:[n.scrollWidth,n.scrollHeight],client:[n.clientWidth,n.clientHeight]}];});return{index,raw,long:/Extended Edition|[\u3400-\u9fff].{12,}/u.test(raw)||raw.length>90,texts};});
},expanded);}
(async()=>{
    let page,cdp,preload,original,route,errorListener,initialMetrics,exceptionListener;
    fs.mkdirSync(dir,{recursive:true});
    try{
        const browser=await chromium.connectOverCDP(process.env.LAMPA_TEST_CDP||'http://127.0.0.1:9222',{timeout:5000});
        const pages=browser.contexts().flatMap(c=>c.pages()).filter(p=>p.url().startsWith('https://siaivo.isroot.in/'));assert.equal(pages.length,1,'reuse the one authorized Lampa tab');page=pages[0];original=page.url();
        cdp=await page.context().newCDPSession(page);initialMetrics=await cdp.send('Page.getLayoutMetrics');report.browser=(await cdp.send('Browser.getVersion')).product;
        errorListener=error=>report.exceptions.push(error.stack.replace(/https?:\/\/[^\s)]+/g,value=>{try{const u=new URL(value);return u.origin+u.pathname;}catch{return '[URL]';}}).slice(0,1000));page.on('pageerror',errorListener);
        await cdp.send('Runtime.enable');
        exceptionListener=event=>{if(!report.startupExceptionDetails)report.startupExceptionDetails={text:event.exceptionDetails.text,exception:event.exceptionDetails.exception?.description||'',frames:(event.exceptionDetails.stackTrace?.callFrames||[]).slice(0,8).map(frame=>({functionName:frame.functionName,url:frame.url,line:frame.lineNumber+1,column:frame.columnNumber+1}))};};cdp.on('Runtime.exceptionThrown',exceptionListener);
        route=async intercepted=>{
            const request=intercepted.request(),url=new URL(request.url()),file=assets.get(path.posix.basename(url.pathname));
            if(url.hostname==='tc-fixture.invalid'){
                const mode=decodeURIComponent(url.pathname.split('/')[2]||'success');
                if(mode==='failed')return intercepted.fulfill({status:503,body:'controlled preload failure',contentType:'text/plain'});
                if(mode==='cancelled')await new Promise(resolve=>setTimeout(resolve,5000));
                if(mode==='delayed')await new Promise(resolve=>setTimeout(resolve,750));
                try{return await intercepted.fulfill({status:200,body:JSON.stringify({preloaded_bytes:100,preload_size:100,download_speed:1,active_peers:4,total_peers:8}),contentType:'application/json'});}catch{return;}
            }
            if(standalone&&/\.js$/.test(url.pathname)&&url.hostname!=='siaivo.isroot.in'&&!url.pathname.includes('/providers/')&&path.posix.basename(url.pathname)!=='torrent-cinema.js'){report.suppressedScripts.push(url.hostname==='gorlim590.github.io'||url.hostname==='127.0.0.1'?url.pathname:'external optional script');return intercepted.fulfill({status:200,body:'/* isolated canonical-only test; restored after this run */',contentType:'application/javascript',headers:{'Access-Control-Allow-Origin':'*'}});}
            if(file&&(url.hostname==='gorlim590.github.io'||url.hostname==='127.0.0.1')){
                const body=fs.readFileSync(path.join(root,file));report.assets[file]={url:url.origin+url.pathname,sha256:hash(body),bytes:body.length};
                return intercepted.fulfill({status:200,body,contentType:'application/javascript',headers:{'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'}});
            }
            if(!['GET','HEAD','OPTIONS'].includes(request.method())){report.blockedWrites++;return intercepted.abort('blockedbyclient');}
            return intercepted.continue();
        };
        await page.route('**/*',route);preload=(await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:shadow})).identifier;
        await page.reload({waitUntil:'domcontentloaded'});
        await page.waitForFunction(()=>window.appready,null,{timeout:25000});
        if(standalone)await page.addScriptTag({url:'https://gorlim590.github.io/lampa/ui/torrent-cinema.js?v=qa117-direct'});
        await page.waitForFunction(standalone=>window.LampaTorrentCinema&&(standalone?!window.StremioHybrid:!!window.StremioHybrid),standalone,{timeout:25000});
        check('installation boundary',await page.evaluate(standalone=>standalone?!window.StremioHybrid&&!window.ButtonsPlus:!!window.StremioHybrid,standalone));
        report.nativeCompatibility=await page.evaluate(()=>{const source=String(Lampa.Component.get('torrents'));return{componentAvailable:typeof Lampa.Component.get('torrents')==='function',requiresTitle:/element\.Title\.toLowerCase\(\)/.test(source),directTitleFilter:/var title = element\.Title\.toLowerCase\(\)/.test(source),supportsNameOnly:false,contract:'native torrent component dereferences element.Title during parse and filter construction; Torrent Cinema adapter independently accepts Name-only records'};});
        check('live native component compatibility boundary for a genuine Name-only parser result',report.nativeCompatibility.componentAvailable&&report.nativeCompatibility.requiresTitle&&report.nativeCompatibility.directTitleFilter&&!report.nativeCompatibility.supportsNameOnly,report.nativeCompatibility);
        // The host restores its last route after appready; allow that native transition to settle.
        await page.waitForTimeout(3500);cdp.off('Runtime.exceptionThrown',exceptionListener);await cdp.send('Runtime.disable');report.hostStartupExceptions=report.exceptions.splice(0);report.preFixtureStartup={activity:await page.evaluate(()=>Lampa.Activity.active()?.component||null),scriptCount:await page.locator('script[src]').count(),hostErrors:report.hostStartupExceptions,runtimeException:report.startupExceptionDetails||null};
        await page.evaluate(fixture);
        const ready=()=>page.waitForFunction(()=>Lampa.Activity.active()?.component==='full'&&Number(Lampa.Activity.active()?.id)===Number(window.__tcQa.movie.id)&&Lampa.Activity.active().activity.render()[0].querySelector('.view--torrent')&&document.querySelector('.sh-torrent-overlay'),null,{timeout:15000});
        await ready();
        const enter=selector=>page.evaluate(selector=>{const n=document.querySelector(selector);if(!n)throw Error('Missing test control '+selector);$(n).trigger('hover:enter');},selector);
        const remoteOk=async selector=>{await page.evaluate(selector=>{const n=document.querySelector(selector),pane=document.querySelector('.sh-torrent-overlay:not([hidden])');if(!n||!pane)throw Error('Missing remote control '+selector);Lampa.Controller.collectionFocus(n,pane);},selector);await page.keyboard.press('Enter');};
        const selectTopmost=async()=>page.evaluate(()=>{const node=document.querySelector('.sh-cinema-select'),content=node?.querySelector('.selectbox__content'),r=content?.getBoundingClientRect(),top=r&&document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return{visible:!!node&&node.getClientRects().length>0,controller:Lampa.Controller.enabled().name,z:Number(node&&getComputedStyle(node).zIndex),overlayZ:Number(document.querySelector('.sh-torrent-overlay:not([hidden])')&&getComputedStyle(document.querySelector('.sh-torrent-overlay:not([hidden])')).zIndex),actualTopmost:!!top&&node.contains(top)};});
        const focusKey=()=>page.evaluate(()=>{const pane=document.querySelector('.sh-torrent-overlay:not([hidden])'),n=pane?.querySelector('.focus');if(!n)return'';if(n.classList.contains('torrent-item'))return'row:'+Array.from(pane.querySelectorAll('.torrent-item')).indexOf(n);if(n.classList.contains('tc-info'))return'info:'+Array.from(pane.querySelectorAll('.torrent-item')).indexOf(n.closest('.torrent-item'));if(n.hasAttribute('data-quality'))return'quality:'+n.dataset.quality;if(n.hasAttribute('data-tracker'))return'tracker:'+n.dataset.tracker;return'control:'+n.textContent.trim();});
        const open=async()=>{await page.evaluate(()=>{window.__tcQa.opened=performance.now();const p=Lampa.Activity.active().activity.render()[0],button=p.querySelector('.view--torrent');Lampa.Controller.collectionFocus(button,p);button.dispatchEvent(new Event('hover:enter',{bubbles:true}));});};
        const loaded=(expected=12)=>page.waitForFunction(expected=>document.querySelectorAll('.sh-torrent-overlay:not([hidden]) .torrent-item:not([hidden])').length===expected,expected,{timeout:10000});
        const setViewport=async(width,height,dpr=1)=>{
            const metrics=await cdp.send('Page.getLayoutMetrics'),zoom=metrics.cssVisualViewport.zoom||1;
            await cdp.send('Emulation.setDeviceMetricsOverride',{width:Math.round(width*zoom),height:Math.round(height*zoom),deviceScaleFactor:dpr/zoom,mobile:false});
            await page.waitForFunction(([w,h,d])=>innerWidth===w&&innerHeight===h&&devicePixelRatio===d,[width,height,dpr],{timeout:5000});
            await page.waitForTimeout(900); // Native Lampa resize debounce.
        };
        const capture=async file=>{
            // Playwright screenshot resets metrics in a CDP-attached, zoomed host.
            // CDP capture retains the independently rendered CSS/DPR configuration.
            const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}),body=Buffer.from(shot.data,'base64');fs.writeFileSync(path.join(dir,file),body);
            return {file,pixels:[body.readUInt32BE(16),body.readUInt32BE(20)]};
        };
        // Scenario 1: true independent layouts plus inline detail geometry.
        await open();await loaded();report.openMs=await page.evaluate(()=>performance.now()-__tcQa.opened);
        check('release identity and metadata hierarchy',await page.evaluate(()=>{const row=document.querySelector('.sh-torrent-overlay:not([hidden]) .torrent-item');return row?.querySelector('.ctr-name')?.textContent==='Silent Orbit (2024)'&&/4K/.test(row.querySelector('.tc-secondary-row')?.textContent||'')&&/WEB-DL/.test(row.querySelector('.tc-secondary-row')?.textContent||'')&&/UA/.test(row.querySelector('.tc-priority-row')?.textContent||'')&&row.querySelector('.tc-audio-label')?.textContent.includes('Українська')&&row.querySelector('.tc-raw-title')?.textContent===row._ctrSource.Title;}));
        for(const [width,height] of [[1280,720],[1920,1080],[3840,2160]]){
            await setViewport(width,height);
            const layout=await geometry(page);layout.collapsed=await capture((standalone?'standalone-':'after-')+width+'.png');
            check('layout '+width,layout.modal.width>width*.85&&layout.modal.width<width*.91&&layout.horizontalOverflow<=1&&layout.filterOverflow<=1&&layout.toolbars===1&&layout.styleCount===1&&layout.legacyStyles===0&&layout.inlineFilesButtons===0&&(width!==1280||layout.infoRound),layout);
            if(width===1280){const texts=await rowTextGeometry(page);check('720p release, format, audio and subtitle text stays visible across all rows including long titles',texts.length===12&&texts.every(row=>row.texts.some(t=>t.selector==='.ctr-name')&&row.texts.some(t=>t.selector==='.tc-secondary-row')&&row.texts.some(t=>t.selector==='.tc-audio-label')&&row.texts.every(t=>t.visible))&&texts.some(row=>row.long),texts);
                const effects=await page.evaluate(async()=>{const row=document.querySelector('.sh-torrent-overlay:not([hidden]) .torrent-item'),diag=()=>JSON.stringify(LampaTorrentCinema.diagnostics()),before=diag(),measure=()=>({animation:getComputedStyle(row).animationName,transform:getComputedStyle(row).transform,backdropFilter:getComputedStyle(document.querySelector('.sh-torrent-overlay')).backdropFilter,styles:document.querySelectorAll('#torrent-cinema-style').length,subscriptions:LampaTorrentCinema.diagnostics().subscriptions});localStorage.setItem('torrents_cinema_tv','true');localStorage.setItem('torrents_cinema_animations','true');LampaTorrentCinema.applySettings();const on=measure();localStorage.setItem('torrents_cinema_tv','false');localStorage.setItem('torrents_cinema_animations','false');LampaTorrentCinema.applySettings();const off=measure();return{on,off,diagnosticsStable:before===diag()};});
                check('retired TV/animation toggles add no effects, styles or subscriptions',effects.on.animation==='none'&&effects.off.animation==='none'&&effects.on.transform==='none'&&effects.off.transform==='none'&&effects.on.backdropFilter==='none'&&effects.off.backdropFilter==='none'&&effects.on.styles===1&&effects.off.styles===1&&effects.on.subscriptions===effects.off.subscriptions&&effects.diagnosticsStable,effects);
            }
            assert.deepEqual(layout.collapsed.pixels,[width,height]);
            await enter('.sh-torrent-overlay:not([hidden]) .torrent-item .tc-info');
            check('inline opens '+width,await page.locator('.sh-torrent-overlay:not([hidden]) .tc-details:not([hidden])').count()===1);
            check('expanded Video/Audio/Subtitles/Files sections '+width,await page.evaluate(()=>{const details=document.querySelector('.sh-torrent-overlay:not([hidden]) .tc-details:not([hidden])');return details?.querySelectorAll('.tc-section').length===4&&['Відео','Аудіо','Субтитри','Файли'].every(label=>details.textContent.includes(label))&&!details.querySelector('.tc-open-files')&&details.querySelector('.tc-raw-title')?.textContent===document.querySelector('.sh-torrent-overlay:not([hidden]) .torrent-item')?._ctrSource.Title;}));
            layout.expanded=await capture((standalone?'standalone-expanded-':'expanded-')+width+'.png');layout.expandedGeometry=await geometry(page);report.layouts.push(layout);
            if(width===1280){const texts=await rowTextGeometry(page,true);check('720p expanded raw release title stays visible inside details',texts.length===1&&texts[0].texts.length===1&&texts[0].texts[0].visible,texts);}
            await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.sh-torrent-overlay:not([hidden]) .tc-details:not([hidden])'));
        }
        await setViewport(1920,1080,2);const equivalent=await geometry(page);equivalent.capture=await capture((standalone?'standalone-':'')+'device-equivalent-1080-dpr2.png');report.deviceEquivalent=equivalent;assert.deepEqual(equivalent.capture.pixels,[3840,2160]);
        // A long multilingual series release must remain legible in the compact
        // row and retain the exact unmodified name in its expanded details.
        await setViewport(1920,1080);await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.sh-torrent-overlay:not([hidden]) .tc-details:not([hidden])'));await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.sh-torrent-overlay:not([hidden])'));await page.evaluate(()=>__tcQa.installSeries());await ready();await open();await loaded(1);
        const series=await page.evaluate(()=>{const row=document.querySelector('.sh-torrent-overlay:not([hidden]) .torrent-item:not([hidden])'),text=row?.querySelector('.ctr-name')?.textContent||'',badges=row?.querySelector('.tc-priority-row')?.textContent||'',technical=row?.querySelector('.tc-secondary-row')?.textContent||'',audio=row?.querySelector('.tc-audio')?.textContent||'';return{raw:row?._ctrSource.Title,title:text,badges,technical,audio,kind:window.__tcQa.movie.media_type,eligible:row?._ctrData&&TorrentsRedesign.releaseMatch(row._ctrData,window.__tcQa.movie,{}).eligible};});
        check('series fixture shows parser-provided Ukrainian and English names, verified year/range/quality/audio, and accepts later season',series.kind==='tv'&&series.title==='Нічний архів / Night Archive — 夜のアーカイブ — 별빛 항로 (2024)'&&series.badges.includes('S02E01–E03')&&/1080p/.test(series.technical)&&series.audio.includes('Студія Переклад')&&series.eligible===true,series);
        const seriesShot=await capture((standalone?'standalone-':'')+'series-long-1920.png');assert.deepEqual(seriesShot.pixels,[1920,1080]);
        await enter('.sh-torrent-overlay:not([hidden]) .torrent-item .tc-info');const seriesExpanded=await page.evaluate(()=>{const details=document.querySelector('.sh-torrent-overlay:not([hidden]) .tc-details:not([hidden])'),raw=details?.querySelector('.tc-raw-title');return{raw:raw?.textContent,wrap:getComputedStyle(raw).overflowWrap,scroll:[raw?.scrollWidth,raw?.scrollHeight],client:[raw?.clientWidth,raw?.clientHeight]};});
        check('series expanded details retain complete multilingual raw title without clipping',seriesExpanded.raw===series.raw&&seriesExpanded.wrap==='anywhere'&&seriesExpanded.scroll[0]<=seriesExpanded.client[0]+1,seriesExpanded);
        const seriesExpandedShot=await capture((standalone?'standalone-':'')+'series-expanded-1920.png');assert.deepEqual(seriesExpandedShot.pixels,[1920,1080]);report.seriesFixture={compact:series,expanded:seriesExpanded,compactCapture:seriesShot,expandedCapture:seriesExpandedShot};
        const cases=[
            {id:'later-season',kind:'tv',premiere:'2013-04-07',metadataName:'Attack on Titan',source:{Title:'Attack on Titan (2018) S03E01-E12 1080p WEB-DL HEVC Ukr Eng'},audio:['uk','en'],subtitles:['uk'],studio:'ТакТреба',quality:'1080p',expected:{name:'Attack on Titan',year:2018,coverage:'S03E01–E12',resolution:'1080p',audio:'Українська / English',studio:'ТакТреба',eligible:true}},
            {id:'multi-season-anime',kind:'tv',source:{Title:'葬送のフリーレン Frieren: Beyond Journey’s End S01-S03 2023 2160p BluRay HEVC Jap Eng'},audio:['ja','en'],subtitles:['en'],quality:'2160p',expected:{name:'葬送のフリーレン Frieren: Beyond Journey’s End',year:2023,coverage:'S01–S03',resolution:'4K',audio:'Японська / English'}},
            {id:'complete-season',kind:'tv',source:{Title:'Blue Eye Samurai Complete Season 2 2024 1080p WEBRip Ukr'},audio:['uk'],subtitles:['uk'],quality:'1080p',expected:{name:'Blue Eye Samurai',year:2024,coverage:'Complete Season 2',resolution:'1080p',audio:'Українська'}},
            {id:'episode-pack',kind:'tv',source:{Title:'Arcane S01E01-E09 2021 1080p WEB-DL AVC Ukr DVO Коло'},audio:['uk'],subtitles:['uk'],studio:'Коло',quality:'1080p',expected:{name:'Arcane',year:2021,coverage:'S01E01–E09',resolution:'1080p',audio:'Українська',studio:'Коло'}},
            {id:'anime',kind:'tv',source:{Title:'葬送のフリーレン S01E01-E28 2023 1080p WEB-DL H.265 Jap Eng'},audio:['ja','en'],subtitles:['en'],quality:'1080p',expected:{name:'葬送のフリーレン',year:2023,coverage:'S01E01–E28',resolution:'1080p',audio:'Японська / English'}},
            {id:'dorama',kind:'tv',source:{Title:'이상한 변호사 우영우 S01E01-E16 2022 1080p WEB-DL HEVC Kor Eng'},audio:['ko','en'],subtitles:['en'],quality:'1080p',expected:{name:'이상한 변호사 우영우',year:2022,coverage:'S01E01–E16',resolution:'1080p',audio:'Корейська / English'}},
            {id:'movie',kind:'movie',source:{Title:'Dune Part Two 2024 2160p UHD BluRay HDR10+ DV HEVC Ukr Eng'},audio:['uk','en'],subtitles:['uk'],quality:'2160p',expected:{name:'Dune Part Two',year:2024,coverage:'',resolution:'4K',audio:'Українська / English'}},
            {id:'unicode-long-movie',kind:'movie',source:{Title:'海辺の長い物語 / The Long Shore Story — قصة طويلة على الشاطئ 2023 1080p WEB-DL AVC Ukr'},audio:['uk'],subtitles:['uk'],quality:'1080p',expected:{name:'海辺の長い物語 / The Long Shore Story — قصة طويلة على الشاطئ',year:2023,coverage:'',resolution:'1080p',audio:'Українська'}},
            {id:'title-and-name',kind:'movie',source:{Title:'Amélie 2001 1080p BluRay AVC French Eng',Name:'Amélie 2001 1080p BluRay AVC French Eng'},audio:['fr','en'],subtitles:['en'],quality:'1080p',expected:{name:'Amélie',year:2001,coverage:'',resolution:'1080p',audio:'Французька / English'}},
            {id:'sparse-raw',kind:'movie',source:{Title:'未知の物語 — Невідома історія українською'},audio:[],subtitles:[],quality:'',expected:{name:'未知の物語 — Невідома історія українською',year:null,coverage:'',resolution:'',audio:'Аудіо не визначено'}},
            {id:'korean-series',kind:'tv',source:{Title:'무빙 Moving 2023 S01E01-E20 1080p WEB-DL DUAL-AUDIO Kor Eng'},audio:['ko','en'],subtitles:['en'],quality:'1080p',expected:{name:'무빙 Moving',year:2023,coverage:'S01E01–E20',resolution:'1080p',audio:'Корейська / English'}},
            {id:'latin-long-series',kind:'tv',source:{Title:'Зоряний архів / Star Archive — 星の書庫 — 별빛 기록 S03E01-E08 2026 720p WEBRip Ukr DVO Коло'},audio:['uk'],subtitles:['uk'],studio:'Коло',quality:'720p',expected:{name:'Зоряний архів / Star Archive — 星の書庫 — 별빛 기록',year:2026,coverage:'S03E01–E08',resolution:'720p',audio:'Українська',studio:'Коло'}},
            {id:'ukrainian-only',kind:'movie',source:{Title:'Самотня українська назва 2022 720p WEBRip Ukr'},audio:['uk'],subtitles:['uk'],quality:'720p',expected:{name:'Самотня українська назва',year:2022,coverage:'',resolution:'720p',audio:'Українська'}},
            {id:'english-only',kind:'movie',source:{Title:'Only the English Name 2020 1080p WEB-DL Eng'},audio:['en'],subtitles:['en'],quality:'1080p',expected:{name:'Only the English Name',year:2020,coverage:'',resolution:'1080p',audio:'English'}},
            {id:'bilingual-title',kind:'movie',source:{Title:'Українська назва / English Name 2025 4K WEB-DL Ukr Eng'},audio:['uk','en'],subtitles:['uk'],quality:'2160p',expected:{name:'Українська назва / English Name',year:2025,coverage:'',resolution:'4K',audio:'Українська / English'}}
        ];
        report.mediaCases=[];
        for(let index=0;index<cases.length;index++){
            const testCase=cases[index];testCase.index=index;
            await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.sh-torrent-overlay:not([hidden]) .tc-details:not([hidden])'));
            await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.sh-torrent-overlay:not([hidden])'));
            const beforeCalls=await page.evaluate(()=>__tcQa.parserCalls);
            await page.evaluate(testCase=>__tcQa.installCase(testCase),testCase);await ready();await open();await loaded(1);
            const compact=await page.evaluate(()=>{const rows=[...document.querySelectorAll('.sh-torrent-overlay:not([hidden]) .torrent-item:not([hidden])')],row=rows[0],source=row?._ctrSource||{},sourceKey=source.Title?'Title':'Name',name=row?.querySelector('.ctr-name'),pane=document.querySelector('.sh-torrent-overlay:not([hidden])');return{visibleRowCount:rows.length,raw:source[sourceKey]||'',sourceKey,nameValue:source.Name||'',title:name?.textContent||'',coverage:row?.querySelector('.tc-coverage')?.textContent||'',resolution:row?.querySelector('.tc-resolution')?.textContent||'',audio:row?.querySelector('.tc-audio-label')?.textContent.replace(/^♫\s*/, '')||'',voice:row?.querySelector('.tc-voice')?.textContent||'',parsedQuality:row?._ctrData?.parsed?.quality||'',eligible:row?._ctrData&&TorrentsRedesign.releaseMatch(row._ctrData,window.__tcQa.movie,{}).eligible,cacheHit:pane?.dataset.cacheHit||'',parserCalls:window.__tcQa.parserCalls,movieId:window.__tcQa.movie.id,clamp:name?getComputedStyle(name).webkitLineClamp:''};});
            const e=testCase.expected,expectedTitle=e.name+(e.year?' ('+e.year+')':'');
            check('case '+testCase.id+' uses exact parser field and exact release title',compact.visibleRowCount===1&&compact.sourceKey===(testCase.source.Title?'Title':'Name')&&compact.raw===testCase.source[compact.sourceKey]&&(!testCase.source.Name||compact.nameValue===testCase.source.Name)&&compact.title===expectedTitle&&compact.clamp==='2'&&!compact.title.includes('Catalog Alias MUST NOT APPEAR'),{expected:e,actual:compact});
            check('case '+testCase.id+' matches verified year, coverage, resolution, and audio',compact.coverage===(e.coverage||'')&&compact.resolution===(e.resolution||'')&&compact.audio===(e.audio||'Аудіо не визначено')&&(!e.studio||compact.voice.includes(e.studio))&&(!e.eligible||compact.eligible===true),{expected:e,actual:compact});
            check('case '+testCase.id+' is cache-isolated and has no previous result rows',compact.visibleRowCount===1&&compact.cacheHit==='false'&&compact.parserCalls===beforeCalls+1,[{raw:compact.raw,cacheHit:compact.cacheHit,parserCalls:compact.parserCalls,expectedParserCalls:beforeCalls+1}]);
            await enter('.sh-torrent-overlay:not([hidden]) .torrent-item .tc-info');
            const details=await page.evaluate(()=>{const row=document.querySelector('.sh-torrent-overlay:not([hidden]) .torrent-item:not([hidden])'),title=row?.querySelector('.tc-raw-title');return{raw:title?.textContent,wrap:getComputedStyle(title).overflowWrap,scroll:[title.scrollWidth,title.scrollHeight],client:[title.clientWidth,title.clientHeight]};});
            check('case '+testCase.id+' preserves the complete raw parser title',details.raw===testCase.source[testCase.source.Title?'Title':'Name']&&details.wrap==='anywhere'&&details.scroll[0]<=details.client[0]+1,{expected:testCase.source,actual:details});
            report.mediaCases.push({id:testCase.id,kind:testCase.kind,expected:e,compact,rawDetails:details.raw});
        }
        await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.sh-torrent-overlay:not([hidden]) .tc-details:not([hidden])'));await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.sh-torrent-overlay:not([hidden])'));
        await page.evaluate(()=>__tcQa.restoreMovie());await ready();await open();await loaded();
        // Scenario 2: native D-pad, info/Back, row OK, native Files template/modal, return.
        await setViewport(1920,1080);
        await remoteOk('.sh-torrent-overlay:not([hidden]) [data-tracker="source"]');await page.waitForFunction(()=>Lampa.Controller.enabled().name==='select'&&document.querySelector('.selectbox.animate'));
        const otherTrackerMenu=await selectTopmost();check('native Other Trackers Select is topmost and owns input',otherTrackerMenu.visible&&otherTrackerMenu.controller==='select'&&otherTrackerMenu.z>otherTrackerMenu.overlayZ&&otherTrackerMenu.actualTopmost,otherTrackerMenu);
        await page.keyboard.press('Escape');await page.waitForFunction(()=>Lampa.Controller.enabled().name==='sh_movie_streams');
        const sortButton=await page.evaluate(()=>[...document.querySelectorAll('.sh-stream-head .ctr-button')].find(n=>n.textContent.includes('Рекомендовані'))?.classList.contains('selector'));
        check('sort control exists in the native header group',sortButton===true);
        await page.evaluate(()=>{const n=[...document.querySelectorAll('.sh-stream-head .ctr-button')].find(x=>x.textContent.includes('Рекомендовані'));Lampa.Controller.collectionFocus(n,document.querySelector('.sh-torrent-overlay:not([hidden])'));});await page.keyboard.press('Enter');await page.waitForFunction(()=>Lampa.Controller.enabled().name==='select');
        const sortMenu=await selectTopmost();check('native Sort Select is topmost and owns input',sortMenu.visible&&sortMenu.controller==='select'&&sortMenu.z>sortMenu.overlayZ&&sortMenu.actualTopmost,sortMenu);
        await page.keyboard.press('Escape');await page.waitForFunction(()=>Lampa.Controller.enabled().name==='sh_movie_streams');
        await page.evaluate(()=>{const n=[...document.querySelectorAll('.sh-stream-head .ctr-button')].find(x=>x.textContent.includes('Фільтри'));Lampa.Controller.collectionFocus(n,document.querySelector('.sh-torrent-overlay:not([hidden])'));});await page.keyboard.press('Enter');await page.waitForFunction(()=>Lampa.Controller.enabled().name==='select');
        const filterMenu=await selectTopmost();check('native Filters/Search Select is topmost and owns input',filterMenu.visible&&filterMenu.controller==='select'&&filterMenu.z>filterMenu.overlayZ&&filterMenu.actualTopmost,filterMenu);
        await page.keyboard.press('Escape');await page.waitForFunction(()=>Lampa.Controller.enabled().name==='sh_movie_streams');
        await page.evaluate(()=>{const pane=document.querySelector('.sh-torrent-overlay:not([hidden])'),row=pane.querySelector('.torrent-item:not([hidden])');Lampa.Controller.collectionFocus(row,pane);});
        const expectedFocus=await page.evaluate(()=>[...document.querySelectorAll('.sh-torrent-overlay:not([hidden]) .selector')].filter(n=>n.offsetParent!==null&&!n.disabled&&n.getAttribute('aria-disabled')!=='true').map(n=>n.classList.contains('torrent-item')?'row:'+Array.from(document.querySelectorAll('.sh-torrent-overlay:not([hidden]) .torrent-item')).indexOf(n):n.classList.contains('tc-info')?'info:'+Array.from(document.querySelectorAll('.sh-torrent-overlay:not([hidden]) .torrent-item')).indexOf(n.closest('.torrent-item')):n.hasAttribute('data-quality')?'quality:'+n.dataset.quality:n.hasAttribute('data-tracker')?'tracker:'+n.dataset.tracker:'control:'+n.textContent.trim()));
        const reached=new Set();let current=await focusKey();reached.add(current);
        for(let pass=0;pass<8;pass++){
            await page.keyboard.press('ArrowUp');current=await focusKey();reached.add(current);
            for(let step=0;step<14;step++){const before=current;await page.keyboard.press('ArrowLeft');current=await focusKey();reached.add(current);if(current===before)break;}
            if(await page.evaluate(()=>!!document.querySelector('.sh-torrent-overlay:not([hidden]) .sh-stream-head .focus')))break;
        }
        for(let pass=0;pass<8;pass++){await page.keyboard.press('ArrowDown');current=await focusKey();reached.add(current);if(current.startsWith('row:'))break;}
        for(let row=0;row<12;row++){
            current=await focusKey();if(!current.startsWith('row:'))break;reached.add(current);
            await page.keyboard.press('ArrowRight');current=await focusKey();reached.add(current);
            await page.keyboard.press('ArrowLeft');current=await focusKey();reached.add(current);
            await page.keyboard.press('ArrowDown');current=await focusKey();reached.add(current);
        }
        check('directional-only navigation reaches every visible control from the first torrent',expectedFocus.length>0&&expectedFocus.every(key=>reached.has(key)),{expected:expectedFocus,reached:[...reached]});
        await page.evaluate(()=>{const pane=document.querySelector('.sh-torrent-overlay:not([hidden])'),row=pane.querySelector('.torrent-item:not([hidden])');Lampa.Controller.collectionFocus(row,pane);});
        await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowUp');
        check('native row navigation retains one focused release',await page.locator('.sh-torrent-overlay:not([hidden]) .torrent-item.focus').count()===1);
        await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');
        check('remote info expands without selection',await page.evaluate(()=>!!document.querySelector('.tc-details:not([hidden])')&&!__tcQa.selected));
        await page.keyboard.press('Escape');check('Back collapses before closing',await page.evaluate(()=>!!document.querySelector('.sh-torrent-overlay:not([hidden])')&&!document.querySelector('.tc-details:not([hidden])')));
        await page.keyboard.press('Enter');await page.waitForFunction(()=>Lampa.Controller.enabled().name==='modal');await page.waitForFunction(()=>document.querySelector('.sh-files-modal .torrent-file'));
        check('native selection preserves synthetic transport and opens Files modal',await page.evaluate(()=>__tcQa.selected?.magnet==='magnet:?xt=urn:btih:'+__tcQa.selected.hash&&!!document.querySelector('.sh-files-modal .torrent-file')));
        const filesStack=await page.evaluate(()=>{const files=document.querySelector('.sh-files-modal'),overlay=document.querySelector('.sh-torrent-overlay:not([hidden])'),panel=files?.querySelector('.modal__content'),rect=panel?.getBoundingClientRect(),x=rect?.left+rect?.width/2,y=rect?.top+rect?.height/2,top=rect?document.elementFromPoint(x,y):null;return{filesVisible:!!files&&files.getClientRects().length>0,overlayVisible:!!overlay&&overlay.getClientRects().length>0,filesZ:files?Number(getComputedStyle(files).zIndex):null,overlayZ:overlay?Number(getComputedStyle(overlay).zIndex):null,actualTopmost:!!top&&files.contains(top)};});
        check('native Files dialog renders in front of the still-open Torrent overlay',filesStack.filesVisible&&filesStack.overlayVisible&&filesStack.filesZ>filesStack.overlayZ&&filesStack.actualTopmost,filesStack);
        await page.keyboard.press('Escape');await page.waitForFunction(()=>Lampa.Controller.enabled().name==='sh_movie_streams');
        check('Files Back restores popup row',await page.locator('.sh-torrent-overlay:not([hidden]) .torrent-item.focus').count()===1);
        await page.evaluate(()=>__tcQa.setTransportMode('server-failure'));await page.keyboard.press('Enter');await page.waitForFunction(()=>!!document.querySelector('.tc-native-torrent-modal'));
        const errorLayer=await page.evaluate(()=>{const modal=document.querySelector('.tc-native-torrent-modal'),overlay=document.querySelector('.sh-torrent-overlay:not([hidden])'),r=modal?.getBoundingClientRect(),top=r&&document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return{nativeModal:!!modal,hasError:!!modal?.querySelector('.torrent-error,.torrent-checklist,.error'),modalZ:Number(modal&&getComputedStyle(modal).zIndex),overlayZ:Number(overlay&&getComputedStyle(overlay).zIndex),actualTopmost:!!top&&modal.contains(top),controller:Lampa.Controller.enabled().name};});
        check('native TorrServer error modal is topmost and owns the modal controller',errorLayer.nativeModal&&errorLayer.modalZ>errorLayer.overlayZ&&errorLayer.actualTopmost&&errorLayer.controller==='modal',errorLayer);
        await page.keyboard.press('Escape');await page.waitForFunction(()=>Lampa.Controller.enabled().name==='sh_movie_streams');
        await page.evaluate(()=>__tcQa.setTransportMode('cancelled'));await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('.sh-files-modal .torrent-file'));
        await page.keyboard.press('Enter');await page.waitForFunction(()=>Lampa.Controller.enabled().name==='loading'&&document.querySelector('.tc-native-loading'));
        const loadingLayer=await page.evaluate(()=>{const loading=document.querySelector('.tc-native-loading'),files=document.querySelector('.sh-files-modal'),overlay=document.querySelector('.sh-torrent-overlay:not([hidden])'),r=loading?.getBoundingClientRect(),top=r&&document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return{loadingVisible:!!loading&&loading.getClientRects().length>0,filesVisible:!!files&&files.getClientRects().length>0,loadingZ:Number(loading&&getComputedStyle(loading).zIndex),filesZ:Number(files&&getComputedStyle(files).zIndex),overlayZ:Number(overlay&&getComputedStyle(overlay).zIndex),actualTopmost:!!top&&loading.contains(top),controller:Lampa.Controller.enabled().name};});
        check('native preload Loading owns input and is topmost over Files and Torrent Cinema',loadingLayer.loadingVisible&&loadingLayer.filesVisible&&loadingLayer.loadingZ>loadingLayer.filesZ&&loadingLayer.filesZ>loadingLayer.overlayZ&&loadingLayer.actualTopmost&&loadingLayer.controller==='loading',loadingLayer);
        await page.keyboard.press('Escape');await page.waitForFunction(()=>Lampa.Controller.enabled().name==='modal'&&!document.querySelector('.tc-native-loading'));
        check('Back cancels native preload and restores the exact Files modal',await page.evaluate(()=>!!document.querySelector('.sh-files-modal .torrent-file')&&Lampa.Controller.enabled().name==='modal'&&!__tcQa.playRequested));
        await page.keyboard.press('Escape');await page.waitForFunction(()=>Lampa.Controller.enabled().name==='sh_movie_streams');
        await page.evaluate(()=>__tcQa.setTransportMode('delayed'));await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('.sh-files-modal .torrent-file'));
        await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('.tc-native-loading'));
        await page.waitForFunction(()=>!!__tcQa.playRequested,null,{timeout:8000});
        check('delayed native preload reaches the existing Player.play boundary without issuing real playback',await page.evaluate(()=>!!__tcQa.playRequested&&__tcQa.playRequested.urlHost==='tc-fixture.invalid'&&!document.querySelector('.tc-native-loading')));
        await page.keyboard.press('Escape');await page.waitForFunction(()=>Lampa.Controller.enabled().name==='sh_movie_streams');
        await page.evaluate(()=>__tcQa.setTransportMode('failed'));await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('.sh-files-modal .torrent-file'));
        await page.keyboard.press('Enter');await page.waitForFunction(()=>!!document.querySelector('.tc-native-torrent-modal .torrent-error,.tc-native-torrent-modal .torrent-checklist,.tc-native-torrent-modal .error'),null,{timeout:8000});
        const preloadFailure=await page.evaluate(()=>{const modal=document.querySelector('.tc-native-torrent-modal'),overlay=document.querySelector('.sh-torrent-overlay:not([hidden])'),r=modal?.getBoundingClientRect(),top=r&&document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return{visible:!!modal&&modal.getClientRects().length>0,z:Number(modal&&getComputedStyle(modal).zIndex),overlayZ:Number(overlay&&getComputedStyle(overlay).zIndex),actualTopmost:!!top&&modal.contains(top),controller:Lampa.Controller.enabled().name,text:modal?.innerText.slice(0,300)||''};});
        check('failed native preload keeps its error visible above Files and Torrent Cinema',preloadFailure.visible&&preloadFailure.z>preloadFailure.overlayZ&&preloadFailure.actualTopmost&&preloadFailure.controller==='modal',preloadFailure);
        await page.keyboard.press('Escape');await page.waitForFunction(()=>Lampa.Controller.enabled().name==='sh_movie_streams');
        await page.keyboard.press('Escape');check('popup Back restores actual Torrent action',await page.evaluate(()=>!document.querySelector('.sh-torrent-overlay:not([hidden])')&&!!Lampa.Activity.active().activity.render()[0].querySelector('.view--torrent.focus')));
        // Scenario 3: reuse, filters/sort, empty/error/delayed/profile, teardown and standalone use.
        const initial=await page.evaluate(()=>({calls:__tcQa.parserCalls,diagnostics:LampaTorrentCinema.diagnostics()}));
        for(let i=0;i<5;i++){await open();await page.keyboard.press('Escape');}
        check('reopen reuses one child/search and stable subscriptions',await page.evaluate(initial=>__tcQa.parserCalls===initial.calls&&LampaTorrentCinema.diagnostics().subscriptions===initial.diagnostics.subscriptions&&LampaTorrentCinema.diagnostics().children===1,initial));
        await open();await enter('.sh-torrent-overlay:not([hidden]) [data-tracker=mazepa]');
        const trackerState=await page.evaluate(()=>({filter:TorrentsRedesign.selectedTrackerFilter(),rows:[...document.querySelectorAll('.sh-torrent-overlay:not([hidden]) .torrent-item')].filter(n=>n.getBoundingClientRect().height).map(n=>({tracker:n._ctrData?.tracker,best:n.classList.contains('is-best')}))}));
        check('tracker keeps eligible global recommendation plus actual matches',trackerState.filter==='mazepa'&&trackerState.rows.length===5&&trackerState.rows[0].best,trackerState);
        await enter('.sh-torrent-overlay:not([hidden]) [data-tracker=mazepa]');
        await enter('.sh-torrent-overlay:not([hidden]) .sh-stream-head .ctr-button');await page.keyboard.press('Escape');
        const refresh=async mode=>{await page.evaluate(mode=>__tcQa.mode=mode,mode);await enter('.sh-torrent-overlay:not([hidden]) .sh-stream-retry');};
        await refresh('empty');await page.waitForFunction(()=>document.querySelector('.sh-torrent-overlay:not([hidden]) .sh-stream-status').textContent.includes('не знайдено'));
        check('empty state remains navigable',await page.evaluate(()=>Lampa.Controller.enabled().name==='sh_movie_streams'));
        await refresh('error');await page.waitForFunction(()=>document.querySelector('.sh-torrent-overlay:not([hidden]) .sh-stream-status').textContent.includes('недоступний'));
        check('provider error has retry and popup controller',await page.evaluate(()=>Lampa.Controller.enabled().name==='sh_movie_streams'));
        await refresh('delayed');await page.waitForFunction(()=>__tcQa.pending.length===1);await page.keyboard.press('Escape');
        await page.evaluate(()=>{__tcQa.pending.shift()();});check('closed delayed result cannot steal focus',await page.evaluate(()=>!document.querySelector('.sh-torrent-overlay:not([hidden])')&&Lampa.Controller.enabled().name==='full_start'));
        await open();await loaded();
        if(await page.evaluate(()=>__tcQa.isolatedAccount===true)){
            check('profile fixture owns only a temporary public-identity boundary',await page.evaluate(()=>LampaTorrentCinema.session().includes('qa117-a')));
            await page.keyboard.press('Escape');await page.evaluate(()=>{__tcQa.account.profile.id='qa117-b';__tcQa.mode='ready';});const calls=await page.evaluate(()=>__tcQa.parserCalls);await open();await loaded();
            check('new profile gets a fresh native child/search',await page.evaluate(calls=>__tcQa.parserCalls===calls+1,calls));
        }
        await page.keyboard.press('Escape');
        await page.evaluate(()=>{window.StremioHybrid?.setEnabled(false);LampaTorrentCinema.setEnabled(false);});
        check('disable removes owned UI/style and runtime subscriptions',await page.evaluate(()=>document.querySelectorAll('.sh-torrent-overlay,#torrent-cinema-style').length===0&&LampaTorrentCinema.diagnostics().subscriptions===0));
        await page.evaluate(()=>{LampaTorrentCinema.setEnabled(true);});await ready();await open();await loaded();
        check('independent plugin works with Hybrid disabled',await page.evaluate(()=>!document.body.classList.contains('stremio-hybrid')&&document.querySelectorAll('#torrent-cinema-style').length===1&&Lampa.Controller.enabled().name==='sh_movie_streams'));
        await page.keyboard.press('Escape');await page.evaluate(()=>window.StremioHybrid?.setEnabled(true));
        await page.evaluate(()=>__tcQa.installSeasonContext());await ready();
        // Open the actual Details → Torrent UI; initialize the native component's selected-season filter through its public API.
        await page.evaluate(()=>__tcQa.selectSeasonForNextOpen(2));await open();await loaded(1);await enter('.sh-torrent-overlay:not([hidden]) .torrent-item .tc-info');
        const selectedSeason2=await page.evaluate(()=>{const row=document.querySelector('.sh-torrent-overlay:not([hidden]) .torrent-item:not([hidden])'),details=row?.querySelector('.tc-details:not([hidden])'),match=row?._shMatch;return{season:2,firstAirDate:window.__tcQa.movie.first_air_date,nativeFilter:window.__tcQa.lastNativeSeasonFilter,raw:row?._ctrSource.Title,eligible:match?.eligible,reasons:match?.reasons||[],warningElements:details?.querySelectorAll('.tc-match-note').length||0,note:details?.querySelector('.tc-match-note')?.textContent||''};});
        check('actual selected season 2 UI context accepts later-year S02 release without a mismatch warning element',selectedSeason2.firstAirDate==='2013-04-07'&&selectedSeason2.nativeFilter?.season?.[0]==='2'&&selectedSeason2.raw.includes('(2018) S02')&&selectedSeason2.eligible===true&&selectedSeason2.reasons.length===0&&selectedSeason2.warningElements===0,selectedSeason2);
        await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.sh-torrent-overlay:not([hidden]) .tc-details:not([hidden])'));
        await page.evaluate(()=>{const row=document.querySelector('.sh-torrent-overlay:not([hidden]) .torrent-item:not([hidden])');row._tcSignature=null;window.__tcQa.selectedSeason1Match=LampaTorrentOverlay.decorate(row,row._ctrSource,window.__tcQa.movie,'tv',{season:1}).match;});
        await enter('.sh-torrent-overlay:not([hidden]) .torrent-item .tc-info');
        const selectedSeason1=await page.evaluate(()=>{const row=document.querySelector('.sh-torrent-overlay:not([hidden]) .torrent-item:not([hidden])'),details=row?.querySelector('.tc-details:not([hidden])'),match=window.__tcQa.selectedSeason1Match,note=details?.querySelector('.tc-match-note');return{season:1,raw:row?._ctrSource.Title,eligible:match?.eligible,reasons:match?.reasons||[],warningElements:details?.querySelectorAll('.tc-match-note').length||0,note:note?.textContent||''};});
        check('renderer-level negative context: selected season 1 shows the S02 mismatch warning',selectedSeason1.raw.includes('S02')&&selectedSeason1.eligible===false&&selectedSeason1.reasons.some(reason=>reason.includes('Інший сезон'))&&selectedSeason1.warningElements===1&&selectedSeason1.note.includes('Інший сезон'),selectedSeason1);
        await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.sh-torrent-overlay:not([hidden]) .tc-details:not([hidden])'));await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.sh-torrent-overlay:not([hidden])'));
        await page.evaluate(()=>__tcQa.restoreMovie());
        check('canonical source bytes were actually delivered',!!report.assets['ui/torrent-cinema.js']&&report.assets['ui/torrent-cinema.js'].sha256===hash(fs.readFileSync(path.join(root,'ui/torrent-cinema.js'))));
        check('changed-runtime scenario has no uncaught exception',report.exceptions.length===0,report.exceptions);
        report.finalDiagnostics=await page.evaluate(()=>LampaTorrentCinema.diagnostics());report.status='PASS';
    }catch(error){if(page)try{report.failureState=await page.evaluate(()=>({controller:Lampa.Controller.enabled().name,activity:Lampa.Activity.active()?.component,diagnostics:window.LampaTorrentCinema?.diagnostics(),filter:window.TorrentsRedesign?.selectedTrackerFilter(),panes:[...document.querySelectorAll('.sh-torrent-overlay')].map(n=>({hidden:n.hidden,state:n.dataset.state,status:n.querySelector('.sh-stream-status')?.textContent,rows:n.querySelectorAll('.torrent-item').length})),pending:window.__tcQa?.pending.length,parserCalls:window.__tcQa?.parserCalls}));}catch{}report.status='FAIL';report.failure=error.stack.replace(/https?:\/\/\S+/g,'[URL]');console.error(error.message);process.exitCode=1;}
    finally{
        if(page)try{
            if(errorListener)page.off('pageerror',errorListener);
            if(preload)await cdp.send('Page.removeScriptToEvaluateOnNewDocument',{identifier:preload});
            await cdp.send('Emulation.clearDeviceMetricsOverride');
            if(route)await page.unroute('**/*',route);
            // A reload discards all fixture/global/shadow changes, preserves stored data and the original URL.
            await page.goto(original,{waitUntil:'domcontentloaded'});report.restoredOriginalTab=true;
        }catch(error){report.restoreFailure=error.message;process.exitCode=1;}
        if(cdp)await cdp.detach();
        fs.writeFileSync(path.join(dir,standalone?'browser-standalone.json':'browser-results.json'),JSON.stringify(report,null,2));
        console.log(JSON.stringify({status:report.status,checks:report.checks.length,passed:report.checks.filter(c=>c.status==='PASS').length,restored:report.restoredOriginalTab,report:standalone?'audit/torrent-cinema/browser-standalone.json':'audit/torrent-cinema/browser-results.json'}));
    }
    process.exit(process.exitCode||0);
})();
