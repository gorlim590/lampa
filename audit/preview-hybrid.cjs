'use strict';
// Applies the local theme to the existing Lampa tab. No reload, storage reset or browser close.
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.connectOverCDP('http://127.0.0.1:9222');
 const page=browser.contexts()[0].pages().find(p=>p.url().startsWith('https://siaivo.isroot.in/'));
 if(!page)throw Error('Lampa tab not found');
 await page.waitForFunction(()=>window.appready,null,{timeout:30000});
 await page.addScriptTag({path:require('path').resolve(__dirname,'../ui/stremio-hybrid.js')});
 console.log('PASS: local theme available; Interface → Stremio × Lampa controls visibility.');
 process.exit(0);
})().catch(e=>{console.error(e.message);process.exit(1)});
