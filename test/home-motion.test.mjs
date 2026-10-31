import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function fixture({reduced=false,desktop=true,top=1200}={}){
 const source=ts.transpileModule(fs.readFileSync(new URL('../src/components/HomeMotion.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const effects=[],tweens=[],timelines=[],listeners=new Map(),frames=new Map(),exports={};let frameId=0,refreshes=0;
 const node=name=>({name});
 const scenes=['works','creators','explore','invitation'].map(kind=>{
  const heading=node(kind+' heading'),art=node('art'),copy=node('copy'),feature=node('explore feature'),title=node('title'),actions=node('actions');
  const secondary=[node('secondary')],creators=[node('creator a'),node('creator b')],links=[node('explore link')];
  return{dataset:{homeScene:kind},getBoundingClientRect:()=>({top}),querySelector:selector=>({'.v2-section-heading':heading,'.v2-work-feature .v2-work-art':art,'.v2-work-copy':copy,'.v2-explore-feature':feature,h2:title,':scope > div':actions}[selector]||null),querySelectorAll:selector=>({'.v2-work-secondary':secondary,'.v2-creator':creators,'.v2-explore-link':links}[selector]||[])};
 });
 const root={querySelectorAll:selector=>selector==='[data-home-scene]'?scenes:[],addEventListener:(key,fn)=>listeners.set('root:'+key,fn),removeEventListener:key=>listeners.delete('root:'+key)};
 const media={reverted:false,add(queries,fn,scope){this.scope=scope;fn({conditions:{desktop,mobile:!desktop,reduce:reduced}});},revert(){this.reverted=true;}};
 const context={reverted:false,revert(){this.reverted=true;}};
 const gsap={registerPlugin(){},matchMedia:()=>media,context(fn,scope){context.scope=scope;fn();return context;},timeline(options){const timeline={fromTo(target,from,to,at){tweens.push({target,from,to,at});return timeline;}};timelines.push(options);return timeline;}};
 const window={innerHeight:900,addEventListener:(key,fn)=>listeners.set('window:'+key,fn),removeEventListener:key=>listeners.delete('window:'+key)};
 vm.runInNewContext(source,{exports,window,document:{fonts:{ready:Promise.resolve()}},requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id),require:name=>{
  if(name==='react')return{useEffect:fn=>effects.push(fn),useRef:()=>({current:{closest:()=>root}})};
  if(name==='gsap')return{gsap};
  if(name==='gsap/ScrollTrigger')return{ScrollTrigger:{refresh:()=>refreshes++}};
  if(name==='react/jsx-runtime')return{jsx:(type,props)=>({type,props})};
  throw new Error('Unexpected dependency '+name);
 }});
 const output=exports.HomeMotion(),cleanup=effects[0]();
 const flush=()=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn());};
 return{output,cleanup,flush,root,media,context,tweens,timelines,listeners,frames,get refreshes(){return refreshes;}};
}

test('homepage entrances have scoped, varied timelines and preserve readable content',()=>{
 const f=fixture();assert.equal(f.output.type,'span');assert.equal(f.output.props.hidden,true);
 assert.equal(f.media.scope,f.root);assert.equal(f.context.scope,f.root);assert.equal(f.timelines.length,4);
 assert.ok(f.timelines.every(t=>t.scrollTrigger.once&&t.scrollTrigger.start==='top 86%'));
 assert.ok(f.tweens.some(t=>t.from.clipPath));assert.ok(f.tweens.some(t=>t.from.x<0));assert.ok(f.tweens.some(t=>t.from.x>0));
 assert.ok(f.tweens.every(t=>t.from.opacity!==0&&t.from.autoAlpha===undefined));f.cleanup();
});

test('reduced motion and already visible restored scenes do not receive entrance animations',()=>{
 for(const options of [{reduced:true},{top:-600},{top:200}]){
  const f=fixture(options);assert.equal(f.tweens.length,0);assert.equal(f.timelines.length,0);f.cleanup();
 }
 const desktop=fixture(),mobile=fixture({desktop:false});
 assert.ok(Math.abs(mobile.tweens.find(t=>t.from.x<0).from.x)<Math.abs(desktop.tweens.find(t=>t.from.x<0).from.x));desktop.cleanup();mobile.cleanup();
});

test('image/font refreshes are batched and unmount cancels callbacks and reverts motion',async()=>{
 const f=fixture();f.listeners.get('root:load')();f.listeners.get('window:pageshow')();await Promise.resolve();
 assert.equal(f.frames.size,1);f.flush();assert.equal(f.refreshes,1);
 f.listeners.get('root:load')();f.cleanup();await Promise.resolve();
 assert.equal(f.frames.size,0);assert.equal(f.listeners.size,0);assert.ok(f.media.reverted&&f.context.reverted);assert.equal(f.refreshes,1);
});
