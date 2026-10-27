'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');

test('machine summary is reproducible and covers controls separately from presentation records',()=>{
 const root=__dirname+'/..';
 execFileSync(process.execPath,['scripts/settings-audit-summary.mjs','--check'],{cwd:root,stdio:'pipe'});
 const inventory=JSON.parse(fs.readFileSync(root+'/audit/settings/settings-inventory.json','utf8'));
 const summary=JSON.parse(fs.readFileSync(root+'/audit/settings/settings-audit-summary.json','utf8'));
 assert.equal(summary.counts.capturedRecords,inventory.settings.length);
 assert.equal(summary.counts.identifiableControls,inventory.settings.filter(row=>row.kind==='control').length);
 assert.equal(summary.counts.presentationRecords,inventory.settings.filter(row=>row.kind!=='control').length);
 assert.equal(summary.counts.identifiableControls,506);
 assert.equal(summary.counts.presentationRecords,70);
 assert.equal(summary.records.length,summary.counts.identifiableControls);
 assert.equal(Object.values(summary.categories).reduce((n,row)=>n+row.total,0),506);
 assert.equal(Object.values(summary.categories).reduce((n,row)=>n+row.verified,0),0,'static inventory evidence cannot certify a setting as working');
 assert.equal(summary.confirmedDefects.length,1);
 assert.equal(summary.confirmedDefects[0].id,'addCategory:ncInfo');
 assert(summary.records.find(row=>row.id==='addCategory:ncInfo').status.includes('Fixed in source'));
});
