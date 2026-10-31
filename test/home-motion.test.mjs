import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function fixture({reduced=false,desktop=true,top=1200,storyTop=top}={}){
 const source=ts.transpileModule(fs.readFileSync(new URL('../src/components/HomeMotion.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const effects=[],tweens=[],timelines=[],listeners=new Map(),frames=new Map(),exports={};let frameId=0,refreshes=0;
 const node=name=>({name});
 const story=(name,side)=>{
  const art=node(name+' art'),copy=node(name+' copy');
  return{name,dataset:{homeStory:'',...(side?{homeSide:side}:{})},classList:{contains:()=>false},matches:()=>true,getBoundingClientRect:()=>({top:storyTop}),querySelector:selector=>({'.home-story-visual,.v2-work-art':art,'.home-story-copy,.v2-work-copy':copy}[selector]||null)};
 };
 const stories=[story('first work'),story('second work'),story('creator','right'),story('resources','left')];
 const sections=['works','creators','explore','invitation'].map(kind=>{
  const heading=kind!=='invitation'?node(kind+' heading'):null,title=node('title'),actions=node('actions');
  return{dataset:{homeScene:kind},classList:{contains:()=>false},matches:()=>false,getBoundingClientRect:()=>({top}),querySelector:selector=>({'.v2-section-heading':heading,h2:title,':scope > div':actions}[selector]||null)};
 });
 const scenes=[sections[0],stories[0],stories[1],sections[1],stories[2],sections[2],stories[3],sections[3]];
 const root={querySelectorAll:()=>scenes,addEventListener:(key,fn)=>listeners.set('root:'+key,fn),removeEventListener:key=>listeners.delete('root:'+key)};
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
 return{output,cleanup,flush,root,stories,media,context,tweens,timelines,listeners,frames,get refreshes(){return refreshes;}};
}

test('large alternating stories have independent scoped entrances and retain crisp readable content',()=>{
 const f=fixture();assert.equal(f.output.type,'span');assert.equal(f.output.props.hidden,true);
 assert.equal(f.media.scope,f.root);assert.equal(f.context.scope,f.root);assert.equal(f.timelines.length,8);
 assert.ok(f.timelines.every(t=>t.scrollTrigger.once&&t.scrollTrigger.start==='top 86%'));
 assert.ok(f.tweens.find(t=>t.target.name==='first work art').from.x<0);assert.ok(f.tweens.find(t=>t.target.name==='second work art').from.x>0);
 assert.ok(f.tweens.find(t=>t.target.name==='creator art').from.x>0);assert.ok(f.tweens.find(t=>t.target.name==='resources art').from.x<0);
 assert.ok(f.stories.every(story=>f.timelines.some(t=>t.scrollTrigger.trigger===story)));
 assert.ok(f.tweens.every(t=>(t.from.opacity??1)>=.8&&t.from.autoAlpha===undefined&&t.from.clipPath===undefined));f.cleanup();
});

test('reduced motion and already visible restored scenes do not receive entrance animations',()=>{
 for(const options of [{reduced:true},{top:-600},{top:200}]){
  const f=fixture(options);assert.equal(f.tweens.length,0);assert.equal(f.timelines.length,0);f.cleanup();
 }
 const desktop=fixture(),mobile=fixture({desktop:false});
 assert.ok(desktop.tweens.some(t=>Math.abs(t.from.rotationY)>0));
 assert.ok(mobile.tweens.every(t=>(t.from.x??0)===0&&(t.from.rotationY??0)===0));desktop.cleanup();mobile.cleanup();
});

test('later story rows still enter independently when a section heading is already visible',()=>{
 const f=fixture({top:200,storyTop:1200});assert.equal(f.timelines.length,4);assert.ok(f.timelines.every(t=>f.stories.includes(t.scrollTrigger.trigger)));f.cleanup();
});

test('image/font refreshes are batched and unmount cancels callbacks and reverts motion',async()=>{
 const f=fixture();f.listeners.get('root:load')();f.listeners.get('window:pageshow')();await Promise.resolve();
 assert.equal(f.frames.size,1);f.flush();assert.equal(f.refreshes,1);
 f.listeners.get('root:load')();f.cleanup();await Promise.resolve();
 assert.equal(f.frames.size,0);assert.equal(f.listeners.size,0);assert.ok(f.media.reverted&&f.context.reverted);assert.equal(f.refreshes,1);
});
