'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const checker=path.resolve(__dirname,'../scripts/check-repository.mjs'),base='https://gorlim590.github.io/lampa/';
function check(t,options={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'lampa-checker-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const files={'plugins/demo.js':'var valid = true;',...options.files};
 for(const [name,content]of Object.entries(files)){fs.mkdirSync(path.dirname(path.join(root,name)),{recursive:true});fs.writeFileSync(path.join(root,name),content)}
 if(!options.omitManifest)fs.writeFileSync(path.join(root,'plugins.json'),options.raw===undefined?JSON.stringify(options.manifest===undefined?[{url:base+'plugins/demo.js',status:1}]:options.manifest):options.raw);
 const r=spawnSync(process.execPath,[checker],{cwd:root,encoding:'utf8',timeout:10000});assert(!r.error,r.error&&r.error.message);return{status:r.status,output:r.stdout+r.stderr};
}
function fail(r,pattern){assert.equal(r.status,1,r.output);if(pattern)assert.match(r.output,pattern)}
test('valid first-party manifest and unavailable external URL need no remote network',t=>{const r=check(t,{manifest:[{url:base+'plugins/demo.js',status:1},{url:'https://not-a-real-service.invalid/plugin.js',status:0}]});assert.equal(r.status,0,r.output)});
test('malformed manifest JSON fails the job',t=>fail(check(t,{raw:'['}),/plugins\.json/));
test('missing manifest fails rather than silently skipping validation',t=>fail(check(t,{omitManifest:true}),/plugins\.json/));
test('manifest root must be an array',t=>fail(check(t,{manifest:{plugins:[]}}),/array/i));
test('manifest entries must be objects with nonempty URL and binary numeric status',t=>{for(const entry of [null,[],{}, {url:base+'plugins/demo.js',status:'1'},{url:base+'plugins/demo.js',status:2}])fail(check(t,{manifest:[entry]}),/plugins\.json/)});
test('optional name is allowed; provided invalid name fails',t=>{assert.equal(check(t).status,0);fail(check(t,{manifest:[{url:base+'plugins/demo.js',status:1,name:7}]}),/name/)});
test('manifest-only missing first-party file is rejected even for disabled entries',t=>fail(check(t,{manifest:[{url:base+'missing.js',status:0}]}),/target.*not present/i));
test('manifest URL must be absolute HTTP or HTTPS',t=>{for(const url of ['https://[broken','ui/plugin.js','javascript:alert(1)'])fail(check(t,{manifest:[{url,status:1}]}),/URL|protocol/)});
test('escaped JSON slashes decode before first-party target validation',t=>fail(check(t,{raw:'[{"url":"https:\\/\\/gorlim590.github.io\\/lampa\\/missing.js","status":1}]'}),/target.*not present/i));
test('first-party query/hash and encoded filename do not cause false missing-target errors',t=>{const r=check(t,{files:{'plugins/my file.js':'var ok = true;'},manifest:[{url:base+'plugins/my%20file.js?v=1#x',status:1}]});assert.equal(r.status,0,r.output)});
test('malformed first-party path encoding fails',t=>fail(check(t,{manifest:[{url:base+'plugins/%ZZ.js',status:1}]}),/encoding/i));
test('separate third-party checkout resolves canonical first-party paths',t=>{const r=check(t,{files:{'third-party-branch/legacy.js':'var legacy = true;'},manifest:[{url:base+'legacy.js',status:1}]});assert.equal(r.status,0,r.output)});
test('existing invalid JavaScript still fails without executing it',t=>fail(check(t,{files:{'plugins/demo.js':'function ('}}),/syntax error/i));
test('existing Markdown URL checks and illustrative placeholder skips are preserved',t=>{assert.equal(check(t,{files:{'README.md':'Example http://…/a.mp4'}}).status,0);fail(check(t,{files:{'README.md':base+'missing.js'}}),/target.*not present/i)});
test('UTF8 BOM and anonymous or empty display names remain valid',t=>{
 const raw='\uFEFF'+JSON.stringify([{url:base+'plugins/demo.js',status:1,name:''}]);
 const r=check(t,{raw});assert.equal(r.status,0,r.output);
});
test('missing-target diagnostics do not print URL query or fragment data',t=>{
 const r=check(t,{manifest:[{url:base+'missing.js?token=fixture-only-private#fixture-fragment',status:1}]});
 fail(r,/target.*not present/i);assert(!r.output.includes('fixture-only-private'));assert(!r.output.includes('fixture-fragment'));
});
