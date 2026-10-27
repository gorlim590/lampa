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
 const functional=JSON.parse(fs.readFileSync(root+'/tests/fixtures/settings-functional-evidence.json','utf8')).controls;
 assert.equal(summary.counts.capturedRecords,inventory.settings.length);
 assert.equal(summary.counts.identifiableControls,inventory.settings.filter(row=>row.kind==='control').length);
 assert.equal(summary.counts.presentationRecords,inventory.settings.filter(row=>row.kind!=='control').length);
 assert.equal(summary.records.length,summary.counts.identifiableControls);
 assert.equal(Object.values(summary.categories).reduce((n,row)=>n+row.total,0),summary.counts.identifiableControls);
 assert.equal(summary.counts.distinctControlsExercised,functional.length);
 assert.equal(summary.counts.verifiedInIsolation,functional.filter(row=>row.status==='Verified in isolated tests').length);
 assert.equal(Object.values(summary.categories).reduce((n,row)=>n+row.verifiedIsolated,0),summary.counts.verifiedInIsolation);
 assert.equal(Object.values(summary.categories).reduce((n,row)=>n+row.verifiedRuntime,0),0,'Mocks cannot certify live runtime behavior');
 assert.equal(summary.confirmedDefects.length,0,'No new broken control is confirmed by this representative batch');
 assert(summary.previouslyFixedFindings.some(row=>row.id==='addCategory:ncInfo'));
 assert.equal(summary.records.find(row=>row.id==='addCategory:ncInfo').status,'Fixed in source; runtime not verified (merged PR #99)');
});
