// Offline source attribution for a redacted, read-only runtime Settings census.
// The AST parser is an audit-tool input, never a Lampa/runtime dependency.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),census=require('../audit/settings/runtime-census.js');
const args=Object.fromEntries(process.argv.slice(2).reduce((rows,v,i,a)=>v.startsWith('--')?rows.concat([[v.slice(2),a[i+1]]]):rows,[]));
if(!args.acorn||!args.core||!args.scripts||!args.runtime)throw Error('Required: --acorn PATH --core FILE --scripts FILE --runtime FILE [--external FILE] [--out DIR]');
const acorn=require(path.resolve(args.acorn)),root=process.cwd(),out=path.resolve(args.out||'audit/settings');
const runtime=JSON.parse(fs.readFileSync(args.runtime)),observed=JSON.parse(fs.readFileSync(args.scripts));
const external=args.external?JSON.parse(fs.readFileSync(args.external)):[];
const keys=new Set(runtime.settings.map(x=>x.key).filter(x=>x&&!x.startsWith('['))),labels=new Set(runtime.settings.map(x=>x.label).filter(Boolean));
const fingerprints=new Set(runtime.settings.flatMap(x=>[x.onChangeFingerprint,x.onRenderFingerprint]).filter(Boolean));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const sources=[{file:'external/core-app.js',local:args.core,owner:'Lampa core',delivery:'observed native app script'}];
for(const item of observed){
 if(item.host==='gorlim590.github.io'&&item.path.startsWith('/lampa/')){
  const file=item.path.slice('/lampa/'.length);if(file.endsWith('.js')&&fs.existsSync(file))sources.push({file,local:file,owner:file,delivery:'observed first-party script element'});
 }
}
for(const item of external)if(item.local&&fs.existsSync(item.local))sources.push({file:item.file,local:item.local,owner:item.file,delivery:'observed third-party script element'});
const unique=[...new Map(sources.map(x=>[x.file,x])).values()],refs=new Map(),templateRefs=new Map(),registrations=[],sourceReport=[];
function member(n){if(!n)return '';if(n.type==='Identifier')return n.name;if(n.type==='MemberExpression')return member(n.object)+'.'+(n.computed?n.property.value:n.property.name);return '';}
function prop(n,name){return n?.type==='ObjectExpression'?n.properties.find(x=>(x.key?.name||x.key?.value)===name)?.value:null;}
function indexSource(source){
 const code=fs.readFileSync(source.local,'utf8'),hash=sha(code);let ast;
 try{ast=acorn.parse(code,{ecmaVersion:'latest',sourceType:'script',locations:true,allowReturnOutsideFunction:true});}catch(e){sourceReport.push({...source,local:undefined,sha256:hash,error:'AST parse failed',status:'Not verified'});return;}
 const parents=new WeakMap(),scopes=new WeakMap(),calls=[],strings=[],functions=[],properties=[],base={parent:null,bindings:new Map(),aliases:new Set()};
 function walk(n,parent,scope){
  if(!n||typeof n.type!=='string')return;
  if(/Function/.test(n.type)){functions.push(n);scope={parent:scope,bindings:new Map(),aliases:new Set()};}
  scopes.set(n,scope);if(parent)parents.set(n,parent);
  if(n.type==='VariableDeclarator'&&n.id.type==='Identifier'){scope.bindings.set(n.id.name,n.init);if(member(n.init).endsWith('SettingsApi.addParam'))scope.aliases.add(n.id.name);}
  if(n.type==='CallExpression')calls.push(n);
  if(n.type==='Property')properties.push(n);
  if(n.type==='Literal'&&typeof n.value==='string')strings.push(n);
  for(const [k,v]of Object.entries(n)){if(k==='loc'||k==='start'||k==='end')continue;if(Array.isArray(v))v.forEach(x=>walk(x,n,scope));else if(v&&typeof v.type==='string')walk(v,n,scope);}
 }
 walk(ast,null,base);
 function resolve(n,scope,depth=0){
  if(!n||depth>10)return null;if(n.type==='Literal')return n.value;
  if(n.type==='Identifier'){for(let s=scope;s;s=s.parent)if(s.bindings.has(n.name))return resolve(s.bindings.get(n.name),s,depth+1);}
  if(n.type==='BinaryExpression'&&n.operator==='+'){const a=resolve(n.left,scope,depth+1),b=resolve(n.right,scope,depth+1);return a!==null&&b!==null?String(a)+String(b):null;}
  return null;
 }
 function isRegistration(n){const name=member(n.callee);if(name.endsWith('SettingsApi.addParam'))return true;if(n.callee.type==='Identifier')for(let s=scopes.get(n);s;s=s.parent)if(s.aliases.has(n.callee.name))return true;return false;}
 function addRef(key,n,kind,registration){
  const entry={file:source.file,line:n.loc.start.line,kind};
  if(registration){entry.registrationLine=registration.loc.start.line;const arg=registration.arguments[0];entry.component=resolve(prop(arg,'component'),scopes.get(registration));
   const change=prop(arg,'onChange'),render=prop(arg,'onRender');entry.onChangeLine=change?.loc.start.line||null;entry.onRenderLine=render?.loc.start.line||null;entry.storageWrites=[];entry.storageReads=[];entry.routes=[];
   for(const call of calls){if(call.start<registration.start||call.end>registration.end)continue;const name=member(call.callee),value=resolve(call.arguments[0],scopes.get(call));if(typeof value!=='string')continue;
    if(/Storage\.(get|field)$/.test(name))entry.storageReads.push(value);if(/Storage\.set$/.test(name))entry.storageWrites.push(value);if(/Settings\.create$/.test(name))entry.routes.push(value);
   }
  }
  if(!refs.has(key))refs.set(key,[]);refs.get(key).push(entry);
 }
 for(const n of strings){
  if(keys.has(n.value)||labels.has(n.value)){
   let registration=null;for(let p=parents.get(n);p;p=parents.get(p))if(p.type==='CallExpression'&&isRegistration(p)){registration=p;break;}
   addRef(n.value,n,registration?'registration':'literal reference',registration);
  }
 }
 for(const n of functions){const fingerprint=census.sourceFingerprint(code.slice(n.start,n.end));if(fingerprints.has(fingerprint))addRef('fn:'+fingerprint,n,'handler function fingerprint',null);}
 for(const n of properties){
  const name=n.key.name||n.key.value;if(typeof name!=='string'||!name.startsWith('settings_'))continue;
  const html=resolve(n.value,scopes.get(n));if(typeof html!=='string')continue;
  census.htmlFields(html).forEach((row,index)=>{const k=name.slice('settings_'.length)+':'+index;if(!templateRefs.has(k))templateRefs.set(k,[]);templateRefs.get(k).push({file:source.file,line:n.loc.start.line,kind:'native template export',fieldKey:row.name});});
 }
 for(const call of calls){
  if(isRegistration(call)){
   const arg=call.arguments[0],param=prop(arg,'param'),name=resolve(prop(param,'name'),scopes.get(call)),component=resolve(prop(arg,'component'),scopes.get(call));
   registrations.push({file:source.file,line:call.loc.start.line,component:typeof component==='string'?component:null,key:typeof name==='string'?name:null,type:resolve(prop(param,'type'),scopes.get(call)),dynamic:typeof name!=='string'});
  }
  if(member(call.callee).endsWith('Template.add')){
   const template=resolve(call.arguments[0],scopes.get(call)),html=resolve(call.arguments[1],scopes.get(call));
   if(typeof template==='string'&&template.startsWith('settings_')&&typeof html==='string')census.htmlFields(html).forEach((row,index)=>{
    const k=template.slice('settings_'.length)+':'+index;if(!templateRefs.has(k))templateRefs.set(k,[]);templateRefs.get(k).push({file:source.file,line:call.loc.start.line,kind:'native template registration',fieldKey:row.name});
    if(keys.has(row.name))addRef(row.name,call,'native/template registration',null);
   });
  }
 }
 // Native core templates are compiled into literals before Template.add loops.
 for(const n of strings)if(n.value.includes('settings-param')&&n.value.includes('data-name'))for(const row of census.htmlFields(n.value))if(keys.has(row.name))addRef(row.name,n,'template field',null);
 sourceReport.push({...source,local:undefined,sha256:hash,status:'Source inspected; runtime effect not verified',registrationSites:registrations.filter(x=>x.file===source.file).length});
}
unique.forEach(indexSource);
const hub=require("../ui/settings-hub.js"),categories=hub.categories;
function category(row){return hub.category(row.component,row.key);}
const inventory=runtime.settings.map(row=>{
 let evidence=[...(refs.get(row.key)||[]),...(refs.get(row.label)||[])];
 if(row.registration==='template')evidence.unshift(...(templateRefs.get(row.component+':'+row.ordinal)||[]).filter(x=>x.fieldKey===row.key||!x.fieldKey&&row.key==='[handler-owned]'));
 const fnEvidence=[...(refs.get('fn:'+row.onChangeFingerprint)||[]),...(refs.get('fn:'+row.onRenderFingerprint)||[])];
 const files=new Set(fnEvidence.map(x=>x.file));
 if(files.size===1)evidence.unshift(...fnEvidence);else if(evidence.length)evidence.unshift(...fnEvidence.filter(x=>evidence.some(y=>y.file===x.file)));
 if(!evidence.length){const candidates=registrations.filter(x=>x.component===row.component&&(!x.type||x.type===row.type));if(new Set(candidates.map(x=>x.file)).size===1)evidence=candidates.slice(0,4).map(x=>({file:x.file,line:x.line,kind:'component owner; exact dynamic handler unresolved'}));}
 if(row.registration==='template')evidence.sort((a,b)=>Number(b.kind.includes('template'))-Number(a.kind.includes('template')));
 else evidence.sort((a,b)=>Number(b.kind==='registration'&&(!b.component||b.component===row.component))-Number(a.kind==='registration'&&(!a.component||a.component===row.component)));
 evidence=[...new Map(evidence.map(e=>[e.file+':'+e.line+':'+e.kind,e])).values()].slice(0,12);
 const best=evidence[0],storage=best?.storageWrites?.length?[...new Set(best.storageWrites)]:row.key==='[handler-owned]'||!['select','trigger','input','toggle'].includes(row.type)?[]:[row.key];
 const result={...row,instanceId:row.id+'@'+row.registration+':'+row.ordinal,identityVerified:row.key!=='[handler-owned]',kind:['title','space'].includes(row.type)?'presentation':'control',newCategory:category(row),oldLocation:row.component,owner:best?.file||'Unresolved',ownerConfidence:best?.kind||'unresolved',sourceEvidence:evidence,storageKeys:storage,scope:'Not verified per setting; preserve native owner scope',dependencies:'See owner API/handler; not probed',effect:row.onChange||row.onRender?'Registered owner handler; source and effect verification required':'Native parameter binding or static/navigation field',restart:'Not verified',status:'Not verified',issue:73,verification:'Registration census only; handlers, persistence, reset and physical TV not exercised'};
 if(['omdb_api_key_set','mdblist_api_key_set','simkl_api_key_set','mal_api_key_set','mal_cors_proxies_set'].includes(row.key)&&row.component==='omdb_config_ui'){
  result.status='Fixed in working tree; runtime not verified';result.priority='P0';result.effect='Panel summary now shows configured/empty instead of credentials or user HTML';result.verification='Previous rendering defect reproduced with synthetic secrets (5 FAIL), owner summaries fixed (5 PASS); original edit/save semantics preserved; actual private values were not opened/read';result.action='Verify delivered source hash and redacted summaries without opening editors';
 }
 if(row.key==='omdb_rating_size'&&row.component==='omdb_config_ui'){
  result.status='Partially works';result.priority='P2';result.effect='Menu offers 0.5/0.8/1.1em while getRatingSize clamps these to 1.25em';result.verification='media/average-rating.js menu versus getRatingSize; tests/details-ratings.cjs minimum-size regression';result.action='Explain minimum or align selectable choices without overwriting existing stored value';
 }
 if(row.component==='addCategory'&&row.key==='ncInfo'){
  result.status='Broken';result.priority='P1';result.effect='Info button replaces native Back with Settings.create(ncInfo), reopening itself';result.verification='Source-confirmed override in community/new-category.js:614; isolated handler test reproduces repeated self-navigation';result.action='Keep native fallback; Hub warns instead of invoking this confirmed broken transition';
 }
 if(row.component==='ncInfo'){
  result.status='Requires dependency';result.effect='Lazy template created only after opening addCategory';result.verification='Runtime template unavailable; community/new-category.js:585-594 creates component on owner-panel open';result.action='Do not directly create an unavailable native component; preserve original owner entry';
 }
 return result;
});
const duplicateIds=[...new Set(inventory.filter((x,i,a)=>a.findIndex(v=>v.id===x.id)!==i).map(x=>x.id))];
for(const row of inventory)if(duplicateIds.includes(row.id))row.identityVerified=false;
const result={schema:2,baseline:args.baseline||'70dd3c4c8ca9b0a3e2f8f56d41cbaa849894e832',sourceState:'Inspected working tree; per-source hashes identify proposed changes as well as baseline files',runtimeSchema:runtime.schema,coreSha256:sha(fs.readFileSync(args.core)),capturedAt:runtime.generatedAt,categories:Object.fromEntries(categories),sources:sourceReport,settings:inventory,registrationSites:registrations,duplicateIds,gaps:runtime.gaps,metrics:runtime.metrics};
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'settings-inventory.json'),JSON.stringify(result,null,2)+'\n');
const escape=x=>String(x??'').replaceAll('|','\\|').replaceAll('\n',' ');
const lines=['# Settings inventory and proposed migration map (#73)','',`Baseline: \`${result.baseline}\`. Core source SHA256: \`${result.coreSha256}\`.`,`Captured registrations/templates: **${inventory.length}**. Unattributed rows: **${inventory.filter(x=>x.owner==='Unresolved').length}**. Duplicate IDs requiring review: **${duplicateIds.length}**.`,
 '','This is registration/source evidence, not functional certification. Current values are not read. Every row remains Not verified until its handler/effect/persistence/reset/navigation is supported by evidence. Conditional DOM and storage-only gaps remain explicit. No control has been moved or preference changed.','',
 '| Stable ID | Observed label | Old location → proposed category | Owner / source | Storage key | Registered default / current | Handler/effect | Scope/dependency/restart | Status / evidence |','|---|---|---|---|---|---|---|---|---|'];
for(const row of inventory)lines.push('| '+[row.id,row.label,row.oldLocation+' → '+result.categories[row.newCategory],row.owner+(row.sourceEvidence[0]?':'+row.sourceEvidence[0].line:''),row.storageKeys.join(', ')||'Handler-owned; unresolved',JSON.stringify(row.registeredDefault)+' / [not read]',row.effect,'Not verified; original semantics retained',row.status+' — registration/source; #73'].map(escape).join(' | ')+' |');
lines.push('','## Capture gaps','',...result.gaps.map(x=>'- '+escape(x)),'','## Method','', 'Generated with scripts/settings-inventory.mjs and an explicitly provided system Acorn parser. It parses public sources without executing them, matches runtime IDs/labels to registration/template/reference locations, and preserves ambiguous/dynamic sites for follow-up. A candidate owner is evidence, not automatic handler verification. Third-party source files and the native bundle are local audit inputs and are not vendored.');
fs.writeFileSync(path.join(out,'SETTINGS-INVENTORY.md'),lines.join('\n')+'\n');
console.log(JSON.stringify({rows:inventory.length,unresolved:inventory.filter(x=>x.owner==='Unresolved').length,sources:sourceReport.length,dynamicSites:registrations.filter(x=>x.dynamic).length,duplicateIds:duplicateIds.length}));
