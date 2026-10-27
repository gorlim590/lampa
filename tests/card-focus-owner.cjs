"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(__dirname+'/../'+p,'utf8');
const iface=read('ui/interface-plus.js'),hybrid=read('ui/stremio-hybrid.js');
function themeFixture(){
 const nodes=[];const document={getElementById:id=>nodes.find(n=>n.id===id)||null,createElement:()=>({remove(){nodes.splice(nodes.indexOf(this),1)}}),head:{appendChild:n=>nodes.push(n)}};
 const c={document};vm.runInNewContext(iface.slice(iface.indexOf('    function applyTheme('),iface.indexOf('    var STATUS_BASE_SEL')),c);return {nodes,apply:c.applyTheme};
}
const themes=[...iface.matchAll(/^            ([a-z_0-9]+):$/gm)].map(x=>x[1]);
test('Every Interface theme yields focus and hover pseudo-rings to actual Hybrid body activity',()=>{
 const f=themeFixture();assert.equal(themes.length,14);
 for(const name of themes){f.apply(name);assert.equal(f.nodes.length,1);const css=f.nodes[0].textContent;const rules=css.replace(/\/\*[\s\S]*?\*\//g,'').match(/[^{}]+\{[^{}]*\}/g)||[];const rings=rules.filter(r=>r.includes('.card__view::after'));assert.equal(rings.length,1,name);for(const selector of rings[0].split('{')[0].split(','))assert(selector.trim().startsWith('body:not(.stremio-hybrid) .card.'),name);assert(css.includes('.settings-param.focus'));assert(css.includes('.player-panel .button'));assert(css.includes('body { background:'));}
 f.apply('default');assert.equal(f.nodes.length,0);
});
test('Hybrid supplies one native-card ring for remote focus and mouse hover; standalone is untouched',()=>{
 const css=hybrid.slice(hybrid.indexOf('    var css = `')+15,hybrid.indexOf('`;',hybrid.indexOf('    var css = `')));
 const rules=css.replace(/\/\*[\s\S]*?\*\//g,'').match(/[^{}]+\{[^{}]*\}/g)||[];
 const clear=rules.find(r=>r.includes('.card__view::after')&&r.includes('border:0 !important'));assert(clear);assert(clear.includes('box-shadow:none !important'));assert(clear.includes('.card.focus'));assert(clear.includes('.card.hover'));for(const selector of clear.split('{')[0].split(','))assert(selector.trim().startsWith('body.stremio-hybrid'));
 const ring=rules.find(r=>r.includes('box-shadow:0 0 0 .14em var(--sh-text)'));assert(ring.includes('.card.focus .card__view'));assert(ring.includes('.card.hover .card__view'));
 assert(hybrid.includes('@media(prefers-reduced-motion:reduce)'));
});

test('Verification entry restores the prior loader base on success/failure without storage or global observers',()=>{
 const source=read('audit/ui/phase2-loader.js');
 for(const hadBase of [false,true])for(const event of ['onload','onerror']){const nodes=[],window=hadBase?{LAMPA_PLUGINS_BASE:'https://example.org/original/'}:{};const c={window,URL,document:{currentScript:{src:'https://cdn.jsdelivr.net/gh/gorlim590/lampa@fixture/audit/ui/phase2-loader.js?context=0.0.0.0'},createElement:()=>({}),head:{appendChild:n=>nodes.push(n)}}};vm.runInNewContext(source,c);assert.equal(nodes.length,1);assert.equal(nodes[0].src,'https://cdn.jsdelivr.net/gh/gorlim590/lampa@fixture/loader.js');nodes[0][event]();assert.equal(Object.hasOwn(window,'LAMPA_PLUGINS_BASE'),hadBase);if(hadBase)assert.equal(window.LAMPA_PLUGINS_BASE,'https://example.org/original/');assert.equal(nodes[0].onload,null);assert.equal(nodes[0].onerror,null);}
 assert(!/Storage|MutationObserver|setInterval|setTimeout/.test(source));
});

test('All standalone theme surfaces yield to Hybrid without changing native action or card rules',()=>{
 const f=themeFixture(),surfaces=['.settings__content','.settings-input__content','.selectbox__content','.modal__content'];
 // Compare with the pre-milestone renderer: only these four selectors may change.
 const old=iface.replace("body:not(.stremio-hybrid) .settings__content, body:not(.stremio-hybrid) .settings-input__content, body:not(.stremio-hybrid) .selectbox__content, body:not(.stremio-hybrid) .modal__content",surfaces.join(', '));
 const oldNodes=[],c={document:{getElementById:id=>oldNodes.find(n=>n.id===id)||null,createElement:()=>({remove(){oldNodes.splice(oldNodes.indexOf(this),1)}}),head:{appendChild:n=>oldNodes.push(n)}}};
 vm.runInNewContext(old.slice(old.indexOf('    function applyTheme('),old.indexOf('    var STATUS_BASE_SEL')),c);
 for(const name of themes){f.apply(name);c.applyTheme(name);const css=f.nodes[0].textContent,rules=css.match(/[^{}]+\{[^{}]*\}/g)||[];const panels=rules.filter(r=>r.includes('.modal__content'));assert.equal(panels.length,1,name);const selectors=panels[0].split('{')[0].split(',').map(x=>x.trim());assert.deepEqual(selectors,surfaces.map(x=>'body:not(.stremio-hybrid) '+x));
 let restored=css;for(const selector of surfaces)restored=restored.replace('body:not(.stremio-hybrid) '+selector,selector);assert.equal(restored,oldNodes[0].textContent,name+' must preserve standalone declarations and native action styling');}
 f.apply('default');assert.equal(f.nodes.length,0);
});
