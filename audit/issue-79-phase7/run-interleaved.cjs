'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),out=path.join(__dirname,'interleaved-runs');fs.mkdirSync(out,{recursive:true});
const pairs=Number(process.argv[2]||10);if(!Number.isInteger(pairs)||pairs<1||pairs>10)throw new Error('usage: run-interleaved.cjs [1..10 pairs]');
const order=[];for(let i=0;i<pairs;i++)order.push(...(i%2?['branch','main']:['main','branch']));
const results=[];
for(let i=0;i<order.length;i++){
 const mode=order[i],file=path.join(out,String(i+1).padStart(2,'0')+'-'+mode+'.json');
 const child=spawnSync(process.execPath,[path.join(__dirname,'startup-browser-runner.cjs'),mode,'1'],{cwd:root,encoding:'utf8',timeout:120000,env:process.env});
 if(child.status!==0)throw new Error('run '+(i+1)+' '+mode+' failed: '+(child.stderr||child.error||child.status));
 fs.writeFileSync(file,child.stdout);const parsed=JSON.parse(child.stdout);const r=parsed.results[0];results.push({file,mode,result:r});
 const m=r.metrics.marks;process.stderr.write(JSON.stringify({run:i+1,pair:Math.floor(i/2)+1,mode,firstCard:m.firstVisibleHomeCard,focusReady:m.firstHomeFocus,usable:m.firstUsableHome,dpad:r.navigation.dpad&&{moved:r.navigation.dpad.moved,attempts:r.navigation.dpad.attempts,response:r.navigation.dpad.responseMs},details:r.navigation.details?.blocked?'BLOCKED':'PASS',back:r.navigation.back?.restored,cpu:r.topCpu.slice(0,5)})+'\n');
}
function summary(items){const vals=items.filter(Number.isFinite).sort((a,b)=>a-b);const mean=vals.reduce((a,b)=>a+b,0)/Math.max(1,vals.length);return{n:vals.length,median:vals.length%2?vals[(vals.length-1)/2]:(vals[vals.length/2-1]+vals[vals.length/2])/2,min:vals[0],max:vals[vals.length-1],mean,sd:Math.sqrt(vals.reduce((a,v)=>a+(v-mean)**2,0)/Math.max(1,vals.length))}}
const modes=['main','branch'];const aggregate={};for(const mode of modes){const rs=results.filter(x=>x.mode===mode).map(x=>x.result),metrics=['firstUsableHome','firstHomeFocus','nativeAppReady','firstVisibleHomeCard'];aggregate[mode]={n:rs.length,metrics:Object.fromEntries(metrics.map(k=>[k,summary(rs.map(r=>r.metrics.marks[k]))])),dpadPass:rs.filter(r=>r.navigation.dpad?.moved).length,dpadRetries:rs.map(r=>r.navigation.dpad?.attempts||0),detailsPass:rs.filter(r=>r.navigation.details&&!r.navigation.details.blocked).length,backPass:rs.filter(r=>r.navigation.back?.restored).length,topCpu:rs.map(r=>r.topCpu.slice(0,10))}}
const result={schema:1,pairs,order,baseCommit:results[0]?.result&&require('node:child_process').execFileSync('git',['rev-parse','origin/main'],{cwd:root,encoding:'utf8'}).trim(),testedCommit:require('node:child_process').execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),summary:aggregate,results:results.map(x=>({file:x.file,mode:x.mode,result:x.result}))};
fs.writeFileSync(path.join(__dirname,'interleaved-results.json'),JSON.stringify(result,null,2)+'\n');
