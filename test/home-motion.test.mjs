import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function fixture({reduced=false,desktop=true,top=1200,storyTop=top}={}){
 const source=ts.transpileModule(fs.readFileSync(new URL('../src/components/HomeMotion.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const effects=[],tweens=[],timelines=[],listeners=new Map(),frames=new Map(),observers=[],operations=[],exports={};let frameId=0,mediaCleanup;
 const node=name=>({name});
 const story=(name,side)=>{
  const art=node(name+' art'),copy=node(name+' copy');
  return{name,dataset:{homeStory:'',...(side?{homeSide:side}:{})},classList:{contains:()=>false},matches:()=>true,getBoundingClientRect:()=>{operations.push('read');return{top:storyTop};},querySelector:selector=>({'.home-story-visual,.v2-work-art':art,'.home-story-copy,.v2-work-copy':copy}[selector]||null)};
 };
 const stories=[story('first work'),story('second work'),story('creator','right'),story('resources','left')];
 const sections=['works','creators','explore','invitation'].map(kind=>{
  const heading=kind!=='invitation'?node(kind+' heading'):null,title=node('title'),actions=node('actions');
  return{dataset:{homeScene:kind},classList:{contains:()=>false},matches:()=>false,getBoundingClientRect:()=>{operations.push('read');return{top};},querySelector:selector=>({'.v2-section-heading':heading,h2:title,':scope > div':actions}[selector]||null)};
 });
 const scenes=[sections[0],stories[0],stories[1],sections[1],stories[2],sections[2],stories[3],sections[3]],root={querySelectorAll:()=>scenes};
 const media={reverted:false,add(queries,fn,scope){this.scope=scope;mediaCleanup=fn({conditions:{desktop,mobile:!desktop,reduce:reduced},add:fn=>fn()});},revert(){this.reverted=true;mediaCleanup?.();}};
 const gsap={matchMedia:()=>media,timeline(options){operations.push('write');const timeline={fromTo(target,from,to,at){tweens.push({target,from,to,at});return timeline;}};timelines.push(options);return timeline;}};
 const window={innerHeight:900,addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)};
 class IntersectionObserver{
  constructor(callback,options){this.callback=callback;this.options=options;this.targets=new Set();observers.push(this);}
  observe(target){this.targets.add(target);}
  unobserve(target){this.targets.delete(target);}
  disconnect(){this.disconnected=true;this.targets.clear();}
 }
 vm.runInNewContext(source,{exports,window,IntersectionObserver,requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id),require:name=>{
  if(name==='react')return{useEffect:fn=>effects.push(fn),useRef:()=>({current:{closest:()=>root}})};
  if(name==='gsap')return{gsap};
  if(name==='react/jsx-runtime')return{jsx:(type,props)=>({type,props})};
  throw new Error('Unexpected dependency '+name);
 }});
 const output=exports.HomeMotion(),cleanup=effects[0]();
 const enter=(targets=[...observers.at(-1)?.targets||[]],visible=true)=>observers.at(-1)?.callback(targets.map(target=>({target,isIntersecting:visible})));
 const flush=()=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn());};
 return{output,cleanup,flush,enter,root,stories,scenes,media,tweens,timelines,listeners,frames,observers,operations,window};
}

test('one-shot story entrances create no scroll ticker, refresh or offscreen tweens',()=>{
 const f=fixture();assert.equal(f.output.type,'span');assert.equal(f.output.props.hidden,true);assert.equal(f.media.scope,f.root);
 assert.equal(f.timelines.length,0);assert.equal(f.frames.size,0);assert.equal(f.operations.join(','),Array(8).fill('read').join(','),'all restored-position reads are batched before writes');
 assert.equal(f.observers.length,1);assert.equal(f.observers[0].options.rootMargin,'0px 0px -126px 0px');assert.equal(f.observers[0].targets.size,8);
 f.enter(undefined,false);assert.equal(f.timelines.length,0);
 f.enter();assert.equal(f.timelines.length,8);assert.ok(f.timelines.every(t=>!t.scrollTrigger));
 assert.ok(f.tweens.find(t=>t.target.name==='first work art').from.x<0);assert.ok(f.tweens.find(t=>t.target.name==='second work art').from.x>0);
 assert.ok(f.tweens.find(t=>t.target.name==='creator art').from.x>0);assert.ok(f.tweens.find(t=>t.target.name==='resources art').from.x<0);
 assert.ok(f.tweens.every(t=>(t.from.opacity??1)>=.8&&t.from.autoAlpha===undefined&&t.from.clipPath===undefined));
 assert.equal(f.observers[0].disconnected,true);assert.equal(f.listeners.size,0,'completed entrances no longer need viewport work');f.cleanup();
});

test('reduced motion and already visible restored scenes do not receive entrance animations',()=>{
 for(const options of [{reduced:true},{top:-600},{top:200}]){
  const f=fixture(options);assert.equal(f.tweens.length,0);assert.equal(f.timelines.length,0);assert.equal(f.observers.length,0);assert.equal(f.listeners.size,0);f.cleanup();
 }
 const desktop=fixture(),mobile=fixture({desktop:false});desktop.enter();mobile.enter();
 assert.ok(desktop.tweens.some(t=>Math.abs(t.from.rotationY)>0));
 assert.ok(mobile.tweens.every(t=>(t.from.x??0)===0&&(t.from.rotationY??0)===0));desktop.cleanup();mobile.cleanup();
});

test('later story rows enter independently and cannot retrigger when scrolling back',()=>{
 const f=fixture({top:200,storyTop:1200});assert.equal(f.observers[0].targets.size,4);f.enter([f.stories[2]]);assert.equal(f.timelines.length,1);
 assert.equal(f.observers[0].targets.has(f.stories[2]),false);f.enter([f.stories[2]]);assert.equal(f.timelines.length,1);f.enter();assert.equal(f.timelines.length,4);f.cleanup();
});

test('viewport changes batch one margin update and cleanup cancels late observer callbacks',()=>{
 const f=fixture();f.enter([f.stories[0]]);f.window.innerHeight=800;f.listeners.get('resize')();f.listeners.get('resize')();assert.equal(f.frames.size,1);f.flush();
 assert.equal(f.observers[0].disconnected,true);assert.equal(f.observers.at(-1).options.rootMargin,'0px 0px -112px 0px');assert.equal(f.observers.at(-1).targets.size,7);
 assert.equal(f.operations.filter(op=>op==='read').length,8,'resizing does not globally remeasure or refresh stories');
 f.listeners.get('resize')();f.cleanup();assert.equal(f.frames.size,0);assert.equal(f.listeners.size,0);assert.equal(f.media.reverted,true);assert.ok(f.observers.every(observer=>observer.disconnected));
 const count=f.timelines.length;f.enter(f.scenes);assert.equal(f.timelines.length,count,'a late observer callback cannot animate after unmount');
});
