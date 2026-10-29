'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),out=path.join(__dirname,'interleaved-runs');fs.mkdirSync(out,{recursive:true});
const order=['main','branch','branch','main','main','branch','branch','main','main','branch'];
const results=[];
for(let i=0;i<order.length;i++){
 const mode=order[i],file=path.join(out,String(i+1).padStart(2,'0')+'-'+mode+'.json');
 const child=spawnSync(process.execPath,[path.join(__dirname,'startup-browser-runner.cjs'),mode,'1'],{cwd:root,encoding:'utf8',timeout:120000,env:process.env});
 if(child.status!==0)throw new Error('run '+(i+1)+' '+mode+' failed: '+(child.stderr||child.error||child.status));
 fs.writeFileSync(file,child.stdout);const parsed=JSON.parse(child.stdout);results.push({file,mode,result:parsed.results[0]});
 process.stderr.write(JSON.stringify({run:i+1,mode,usable:parsed.results[0].metrics.marks.firstUsableHome,dpad:parsed.results[0].navigation.dpad?.moved,details:parsed.results[0].navigation.details?.blocked?'BLOCKED':'PASS',back:parsed.results[0].navigation.back?.restored,prefetch:parsed.results[0].metrics.homeTvPrefetch.total,postHome:parsed.results[0].metrics.homeTvPrefetch.total-parsed.results[0].metrics.homeTvPrefetch.beforeFirstUsable})+'\n');
}
fs.writeFileSync(path.join(__dirname,'interleaved-results.json'),JSON.stringify({schema:1,order,results:results.map(x=>({file:x.file,mode:x.mode,marks:x.result.metrics.marks,homeTvPrefetch:x.result.metrics.homeTvPrefetch,navigation:x.result.navigation,fixtureFavoriteCalls:x.result.metrics.fixtureFavoriteCalls,errors:x.result.pageErrors}))},null,2)+'\n');
