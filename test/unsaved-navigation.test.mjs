import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=ts.transpileModule(fs.readFileSync(new URL('../src/components/useUnsaved.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function mount(dirty,allow=false){
 const listeners=new Map(),prompts=[],exports={};let effect;
 class Element{
  href='https://site.example/blogs';target='';
  closest(){return this}
  hasAttribute(){return false}
  getAttribute(name){return name==='href'?'/blogs':null}
 }
 const events={addEventListener:(name,handler)=>listeners.set(name,handler),removeEventListener:name=>listeners.delete(name)};
 vm.runInNewContext(source,{exports,Element,URL,location:new URL('https://site.example/workspace/blog'),document:events,window:events,confirm:message=>{prompts.push(message);return allow},require:name=>{
  if(name==='react')return{useEffect:callback=>{effect=callback}};
  if(name==='./LocaleProvider')return{useLocale:()=>({t:value=>value})};
  throw new Error('Unexpected dependency: '+name);
 }});
 exports.useUnsaved(dirty);const cleanup=effect();
 const click={button:0,target:new Element(),preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true}};
 return{listeners,prompts,cleanup,click};
}
test('canvas return navigation can be canceled while a draft is unsaved',()=>{
 const f=mount(true);f.listeners.get('click')(f.click);
 assert.equal(f.prompts.length,1);assert.equal(f.click.prevented,true);assert.equal(f.click.stopped,true);
 const unload={preventDefault(){this.prevented=true}};f.listeners.get('beforeunload')(unload);
 assert.equal(unload.prevented,true);assert.equal(unload.returnValue,'');
 f.cleanup();assert.equal(f.listeners.size,0);
});
test('saved drafts leave freely, and an explicit decision allows leaving an unsaved draft',()=>{
 const clean=mount(false);assert.equal(clean.listeners.size,0);assert.equal(clean.prompts.length,0);
 const dirty=mount(true,true);dirty.listeners.get('click')(dirty.click);
 assert.equal(dirty.prompts.length,1);assert.equal(dirty.click.prevented,undefined);assert.equal(dirty.click.stopped,undefined);
 dirty.cleanup();
});
