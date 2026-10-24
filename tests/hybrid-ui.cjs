'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/../ui/stremio-hybrid.js','utf8');
function fixture(){
 const buttons=[],classes=new Set(),handlers=new Map();
 const root={classList:{toggle:(k,on)=>on?classes.add(k):classes.delete(k),remove:k=>classes.delete(k)},querySelector:()=>({appendChild:n=>buttons.push(n)})};
 const $=node=>({on:(key,fn)=>handlers.set(node,fn),off:()=>{handlers.delete(node);return{remove:()=>buttons.splice(buttons.indexOf(node),1)}}});
 const context={document:{createElement:()=>({attrs:{},setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]}})},$};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('    function setupDescription('),source.indexOf('    function movieDescriptionEnter(')),context);
 return{context,root,buttons,classes,handlers,record:{root}};
}
test('each description starts collapsed and repeated adaptation adds one native action',()=>{const f=fixture();f.context.setupDescription(f.record,{});f.context.setupDescription(f.record,{});assert.equal(f.buttons.length,1);assert.equal(f.handlers.size,1);assert.equal(f.buttons[0].getAttribute('aria-expanded'),'false');assert.equal(f.classes.has('sh-description-expanded'),false);});
test('description action is outside ButtonsPlus generic movie-action rewriting',()=>{const f=fixture();f.context.setupDescription(f.record,{});assert(!f.buttons[0].className.split(' ').includes('full-start__button'));assert(f.buttons[0].className.split(' ').includes('selector'));});
test('native enter toggles inline expansion without replacing text or changing focus',()=>{const f=fixture();f.context.setupDescription(f.record,{});const button=f.buttons[0],enter=f.handlers.get(button);enter();assert.equal(button.getAttribute('aria-expanded'),'true');assert.equal(button.textContent,'Згорнути опис');assert(f.classes.has('sh-description-expanded'));enter();assert.equal(button.textContent,'Показати більше');assert.equal(button.getAttribute('aria-expanded'),'false');});
test('theme cleanup removes the exact action/handler and reactivation is collapsed',()=>{const f=fixture();f.context.setupDescription(f.record,{});f.handlers.get(f.buttons[0])();f.context.clearDescription(f.record);assert.equal(f.buttons.length,0);assert.equal(f.handlers.size,0);assert.equal(f.record.descriptionToggle,null);assert(!f.classes.has('sh-description-expanded'));f.context.setupDescription(f.record,{});assert.equal(f.buttons[0].getAttribute('aria-expanded'),'false');});
test('description state is owned by one detail instance, not shared by media type',()=>{const f=fixture(),other={root:f.root};f.context.setupDescription(f.record,{});f.context.setupDescription(other,{});f.handlers.get(f.record.descriptionToggle)();assert.equal(other.descriptionToggle.getAttribute('aria-expanded'),'false');});
