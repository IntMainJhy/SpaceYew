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
 const gsap={matchMedia:()=>media,timeline(options){operations.push('write');const timeline={options,restarts:0,pauses:0,progresses:[],fromTo(target,from,to,at){tweens.push({target,from,to,at});return timeline;},restart(){this.restarts++;return this;},progress(value){this.progresses.push(value);return this;},pause(){this.pauses++;return this;}};timelines.push(timeline);return timeline;}};
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

test('stories retain one reusable timeline and replay on every viewport visit',()=>{
 const f=fixture();assert.equal(f.output.type,'span');assert.equal(f.output.props.hidden,true);assert.equal(f.media.scope,f.root);
 assert.equal(f.timelines.length,0);assert.equal(f.frames.size,0);assert.equal(f.operations.join(','),Array(8).fill('read').join(','),'restored-position reads are batched before writes');
 assert.equal(f.observers.length,1);assert.equal(f.observers[0].options.threshold,0);assert.equal(f.observers[0].targets.size,8);
 f.enter(undefined,false);assert.equal(f.timelines.length,0,'offscreen rows have neither animation work nor hidden initial styles');
 f.enter();assert.equal(f.timelines.length,8);assert.ok(f.timelines.every(t=>t.options.paused&&!t.options.scrollTrigger&&t.restarts===1));
 assert.ok(f.tweens.find(t=>t.target.name==='first work art').from.x<0);assert.ok(f.tweens.find(t=>t.target.name==='second work art').from.x>0);
 assert.ok(f.tweens.find(t=>t.target.name==='creator art').from.x>0);assert.ok(f.tweens.find(t=>t.target.name==='resources art').from.x<0);
 assert.ok(f.tweens.every(t=>(t.from.opacity??1)>=.8&&t.from.autoAlpha===undefined&&t.from.clipPath===undefined&&t.to.immediateRender===false));
 f.enter();assert.ok(f.timelines.every(t=>t.restarts===1),'duplicate visible entries do not interrupt an active entrance');
 f.enter(undefined,false);assert.ok(f.timelines.every(t=>t.pauses===1&&t.progresses.at(-1)===1),'offscreen rows finish without a reset or an ongoing ticker');
 f.enter();assert.equal(f.timelines.length,8,'re-entry reuses existing timelines');assert.ok(f.timelines.every(t=>t.restarts===2));
 f.enter(undefined,false);f.enter();assert.ok(f.timelines.every(t=>t.restarts===3),'up and down crossings keep replaying');
 assert.equal(f.observers[0].targets.size,8,'completed rows remain observable');f.cleanup();
});

test('reduced motion is static; initially visible or restored scenes only animate after leaving',()=>{
 const reduced=fixture({reduced:true});assert.equal(reduced.tweens.length,0);assert.equal(reduced.observers.length,0);assert.equal(reduced.listeners.size,0);reduced.cleanup();
 for(const top of [-600,200]){
  const f=fixture({top});assert.equal(f.timelines.length,0);assert.equal(f.observers.length,1);f.enter();assert.equal(f.timelines.length,0,'first-paint content is not reset');
  f.enter(undefined,false);f.enter();assert.equal(f.timelines.length,8,'restored rows are eligible for later entrances');f.cleanup();
 }
 const desktop=fixture(),mobile=fixture({desktop:false});desktop.enter();mobile.enter();
 assert.ok(desktop.tweens.some(t=>Math.abs(t.from.rotationY)>0));
 assert.ok(mobile.tweens.every(t=>(t.from.x??0)===0&&(t.from.rotationY??0)===0));desktop.cleanup();mobile.cleanup();
});

test('rows enter independently and preserve their settled state across observer recreation',()=>{
 const f=fixture({top:200,storyTop:1200});assert.equal(f.observers[0].targets.size,8);f.enter([f.stories[2]]);assert.equal(f.timelines.length,1);
 assert.equal(f.observers[0].targets.has(f.stories[2]),true);f.enter([f.stories[2]]);assert.equal(f.timelines[0].restarts,1);
 f.window.innerHeight=800;f.listeners.get('resize')();f.listeners.get('resize')();assert.equal(f.frames.size,1);f.flush();
 assert.equal(f.observers[0].disconnected,true);assert.equal(f.observers.at(-1).targets.size,8);
 f.enter([f.stories[2]]);assert.equal(f.timelines[0].restarts,1,'rebuilding an observer does not replay a visible row');
 f.observers[0].callback([{target:f.stories[2],isIntersecting:false}]);f.enter([f.stories[2]]);assert.equal(f.timelines[0].restarts,1,'late callbacks from a disconnected observer are ignored');
 f.enter([f.stories[2]],false);f.enter([f.stories[2]]);assert.equal(f.timelines[0].restarts,2);
 assert.equal(f.operations.filter(op=>op==='read').length,8,'resizing does not globally remeasure or refresh stories');f.cleanup();
});

test('cleanup cancels queued resize work, observers and late callbacks',()=>{
 const f=fixture();f.enter([f.stories[0]]);f.listeners.get('resize')();f.cleanup();
 assert.equal(f.frames.size,0);assert.equal(f.listeners.size,0);assert.equal(f.media.reverted,true);assert.ok(f.observers.every(observer=>observer.disconnected));
 const count=f.timelines.length;f.enter(f.scenes);assert.equal(f.timelines.length,count,'a late observer callback cannot animate after unmount');
});
