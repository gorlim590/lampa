'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const inventory=JSON.parse(fs.readFileSync(__dirname+'/../audit/settings/settings-inventory.json','utf8'));
const hub=require('../ui/settings-hub.js');
test('Published inventory preserves every captured record and explicit effect/owner/persistence gaps',()=>{
 assert.equal(inventory.runtimeSchema,2);assert.equal(inventory.settings.length,inventory.metrics.options);
 assert.equal(new Set(inventory.settings.map(r=>r.instanceId)).size,inventory.settings.length);
 for(const row of inventory.settings){assert.equal(row.currentValue,'[not read]');assert(row.owner&&row.ownerConfidence&&row.scope&&row.dependencies&&row.restart&&row.verification);assert.equal(row.newCategory,hub.category(row.component,row.key));assert.notEqual(row.status,'Works');assert(Array.isArray(row.sourceEvidence));}
});
test('Unresolved and duplicate identities remain explicit rather than treated as certified owners or duplicate handlers',()=>{
 assert(inventory.settings.some(r=>r.owner==='Unresolved'));assert(inventory.gaps.length);
 for(const id of inventory.duplicateIds)for(const row of inventory.settings.filter(r=>r.id===id))assert.equal(row.identityVerified,false);
 assert(inventory.settings.some(r=>r.status==='Broken'));assert(inventory.settings.some(r=>r.status==='Requires dependency'));
});
test('Public artifacts contain no local source paths, callback bodies or captured current values',()=>{
 assert(inventory.sources.length);for(const source of inventory.sources){assert.equal(source.local,undefined);assert.match(source.sha256,/^[a-f0-9]{64}$/);}
 for(const row of inventory.settings){assert(!('onChangeSource' in row));assert(!('onRenderSource' in row));if(/token|password|api_key/.test(row.key)&&row.registeredDefault!==undefined)assert(['[redacted]','[native binding; not read]'].includes(row.registeredDefault));}
});
