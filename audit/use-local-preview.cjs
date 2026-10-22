'use strict';
// Existing desktop test profile only; replaces owned active entries, never adds duplicate plugins.
const fs=require('fs'),{chromium}=require('playwright');
const changes={
 'https://marv2on.github.io/lampa-plugins-sync/sync/Yaroslav/uacoments.js':'http://127.0.0.1:8766/media/ua-comments.js',
 'https://gorlim590.github.io/lampa/loader.js':'http://127.0.0.1:8766/preview-loader.js',
 'https://gorlim590.github.io/lampa/providers/parsers.js':'http://127.0.0.1:8766/providers/parsers.js',
 'https://gorlim590.github.io/lampa/media/custom-favorites.js':'http://127.0.0.1:8766/media/custom-favorites.js',
 'https://gorlim590.github.io/lampa/ui/screensaver-plus.js':'http://127.0.0.1:8766/ui/screensaver-plus.js'
};
(async()=>{let action=process.argv[2]||'apply';if(!['apply','restore'].includes(action))throw Error('Use apply or restore');let b=await chromium.connectOverCDP('http://127.0.0.1:9222'),p=b.contexts()[0].pages().find(p=>p.url().startsWith('https://siaivo.isroot.in/'));if(!p)throw Error('Existing authorized Lampa tab unavailable');let backup='backups/integration-followup-20261023/preview-plugin-urls.json';
if(action==='apply'){
 for(let url of Object.values(changes)){let r=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(3000)});if(r.status!==200)throw Error('Local preview asset unavailable');}
 let before=await p.evaluate(changes=>Lampa.Storage.get('plugins',[]).filter(n=>Object.hasOwn(changes,n.url)&&n.status!==0).map(n=>({url:n.url,status:n.status})),changes);if(before.length){let saved=fs.existsSync(backup)?JSON.parse(fs.readFileSync(backup,'utf8')):[];for(let n of before)if(!saved.some(o=>o.url===n.url))saved.push(n);fs.writeFileSync(backup,JSON.stringify(saved,null,2));}if(!before.length&&!fs.existsSync(backup))throw Error('No expected active owned extension matches; nothing changed');
 let result=await p.evaluate(changes=>{let old=Lampa.Storage.get('plugins',[]),count=0,next=old.map(n=>{if(Object.hasOwn(changes,n.url)&&n.status!==0){count++;return Object.assign({},n,{url:changes[n.url]});}return n});if(count)Lampa.Storage.set('plugins',next);return{changed:count,totalBefore:old.length,totalAfter:next.length}},changes);console.log(JSON.stringify({action,...result}));
}else{if(!fs.existsSync(backup))throw Error('Preview URL backup not found');let original=JSON.parse(fs.readFileSync(backup,'utf8'));let count=await p.evaluate(({original,changes})=>{let count=0,next=Lampa.Storage.get('plugins',[]).map(n=>{let row=original.find(o=>changes[o.url]===n.url);if(row){count++;return Object.assign({},n,{url:row.url});}return n});if(count)Lampa.Storage.set('plugins',next);return count},{original,changes});console.log(JSON.stringify({action,changed:count}));}
await p.reload({waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.Lampa&&Lampa.Activity.active()?.activity,null,{timeout:50000});console.log('Existing tab reloaded; browser left open.');process.exit();})().catch(e=>{console.error(e.message);process.exit(1)});
