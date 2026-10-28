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
    return {viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,modal:rect(modal),firstRow:rect(list[0]),lastVisibleRow:rect(visible.at(-1)),focus:rect(modal.querySelector('.focus')),filters:rect(tools),visibleRows:visible.length,filterOverflow:tools.scrollWidth-tools.clientWidth,horizontalOverflow:document.documentElement.scrollWidth-innerWidth,font:parseFloat(getComputedStyle(modal).fontSize),toolbars:modal.querySelectorAll('.ctr-tools').length,inlineFilesButtons:modal.querySelectorAll('.tc-open-files').length,controller:Lampa.Controller.enabled().name,styleCount:document.querySelectorAll('#torrent-cinema-style').length,legacyStyles:document.querySelectorAll('#torrents-redesign-style,#sh-torrent-overlay-style').length};
});}
(async()=>{
    let page,cdp,preload,original,route,errorListener,initialMetrics;
    fs.mkdirSync(dir,{recursive:true});
    try{
        const browser=await chromium.connectOverCDP(process.env.LAMPA_TEST_CDP||'http://127.0.0.1:9222',{timeout:5000});
        const pages=browser.contexts().flatMap(c=>c.pages()).filter(p=>p.url().startsWith('https://siaivo.isroot.in/'));assert.equal(pages.length,1,'reuse the one authorized Lampa tab');page=pages[0];original=page.url();
        cdp=await page.context().newCDPSession(page);initialMetrics=await cdp.send('Page.getLayoutMetrics');report.browser=(await cdp.send('Browser.getVersion')).product;
        errorListener=error=>report.exceptions.push(error.stack.replace(/https?:\/\/\S+/g,'[URL]').slice(0,600));page.on('pageerror',errorListener);
        route=async intercepted=>{
            const request=intercepted.request(),url=new URL(request.url()),file=assets.get(path.posix.basename(url.pathname));
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
        // The host restores its last route after appready; allow that native transition to settle.
        await page.waitForTimeout(3500);report.hostStartupExceptions=report.exceptions.splice(0);
        await page.evaluate(fixture);
        const ready=()=>page.waitForFunction(()=>Lampa.Activity.active()?.component==='full'&&Number(Lampa.Activity.active()?.id)===99117001&&Lampa.Activity.active().activity.render()[0].querySelector('.view--torrent')&&document.querySelector('.sh-torrent-overlay'),null,{timeout:15000});
        await ready();
        const enter=selector=>page.evaluate(selector=>{const n=document.querySelector(selector);if(!n)throw Error('Missing test control '+selector);$(n).trigger('hover:enter');},selector);
        const open=async()=>{await page.evaluate(()=>{window.__tcQa.opened=performance.now();const p=Lampa.Activity.active().activity.render()[0],button=p.querySelector('.view--torrent');Lampa.Controller.collectionFocus(button,p);button.dispatchEvent(new Event('hover:enter',{bubbles:true}));});};
        const loaded=()=>page.waitForFunction(()=>document.querySelectorAll('.sh-torrent-overlay:not([hidden]) .torrent-item').length===12,null,{timeout:10000});
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
        for(const [width,height] of [[1280,720],[1920,1080],[3840,2160]]){
            await setViewport(width,height);
            const layout=await geometry(page);layout.collapsed=await capture((standalone?'standalone-':'after-')+width+'.png');
            check('layout '+width,layout.modal.width>width*.85&&layout.modal.width<width*.91&&layout.horizontalOverflow<=1&&layout.filterOverflow<=1&&layout.toolbars===1&&layout.styleCount===1&&layout.legacyStyles===0&&layout.inlineFilesButtons===0,layout);
            assert.deepEqual(layout.collapsed.pixels,[width,height]);
            await enter('.sh-torrent-overlay:not([hidden]) .torrent-item .tc-info');
            check('inline opens '+width,await page.locator('.sh-torrent-overlay:not([hidden]) .tc-details:not([hidden])').count()===1);
            layout.expanded=await capture((standalone?'standalone-expanded-':'expanded-')+width+'.png');layout.expandedGeometry=await geometry(page);report.layouts.push(layout);
            await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.sh-torrent-overlay:not([hidden]) .tc-details:not([hidden])'));
        }
        await setViewport(1920,1080,2);const equivalent=await geometry(page);equivalent.capture=await capture((standalone?'standalone-':'')+'device-equivalent-1080-dpr2.png');report.deviceEquivalent=equivalent;assert.deepEqual(equivalent.capture.pixels,[3840,2160]);
        // Scenario 2: native D-pad, info/Back, row OK, native Files template/modal, return.
        await setViewport(1920,1080);
        await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowUp');
        check('native row navigation retains one focused release',await page.locator('.sh-torrent-overlay:not([hidden]) .torrent-item.focus').count()===1);
        await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');
        check('remote info expands without selection',await page.evaluate(()=>!!document.querySelector('.tc-details:not([hidden])')&&!__tcQa.selected));
        await page.keyboard.press('Escape');check('Back collapses before closing',await page.evaluate(()=>!!document.querySelector('.sh-torrent-overlay:not([hidden])')&&!document.querySelector('.tc-details:not([hidden])')));
        await page.keyboard.press('Enter');await page.waitForFunction(()=>Lampa.Controller.enabled().name==='modal');
        check('native selection preserves synthetic transport and opens Files modal',await page.evaluate(()=>__tcQa.selected?.magnet==='magnet:?xt=urn:btih:'+__tcQa.selected.hash&&!!document.querySelector('.sh-files-modal .torrent-file')));
        await page.keyboard.press('Escape');await page.waitForFunction(()=>Lampa.Controller.enabled().name==='sh_movie_streams');
        check('Files Back restores popup row',await page.locator('.sh-torrent-overlay:not([hidden]) .torrent-item.focus').count()===1);
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
