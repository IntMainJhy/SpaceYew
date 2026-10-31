import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=ts.transpileModule(fs.readFileSync(new URL('../src/lib/space-atmosphere.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function mount({reduced=false,width=1400,height=900,loading=false,failed=false}={}){
 class Target extends EventTarget{
  listeners=new Set();dataset={};attributes=new Map();inert=false;top=0;left=0;width=width;height=height;
  style={setProperty(name,value){this[name]=value;}};
  addEventListener(name,fn,options){super.addEventListener(name,fn,options);this.listeners.add(name);}
  removeEventListener(name,fn){super.removeEventListener(name,fn);this.listeners.delete(name);}
  setAttribute(name,value){this.attributes.set(name,value);}
  removeAttribute(name){this.attributes.delete(name);}
  getAttribute(name){return this.attributes.get(name)??null;}
  getBoundingClientRect(){return{left:this.left,top:this.top,width:this.width,height:this.height,right:this.left+this.width,bottom:this.top+this.height};}
  closest(){return null;}
 }
 class CustomEvent extends Event{constructor(name,{detail}){super(name);this.detail=detail;}}
 const preference=Object.assign(new Target(),{matches:reduced}),root=new Target(),host=new Target(),copy=new Target(),journey=new Target(),viewport=new Target(),surface=new Target();journey.height=height*4.3;
 host.querySelector=selector=>({'.v2-space-journey':journey,'.v2-space-viewport':viewport,'.v2-hero-copy':copy})[selector]??null;
 const document=Object.assign(new Target(),{hidden:false,documentElement:root}),window=Object.assign(new Target(),{devicePixelRatio:3,scrollY:0,matchMedia:()=>preference});
 const canvas=Object.assign(new Target(),{parentElement:surface,closest:selector=>selector==='.v2-home'?host:null});
 const captures=new Set(),captureLog=[];viewport.setPointerCapture=id=>{captures.add(id);captureLog.push(['set',id]);};viewport.hasPointerCapture=id=>captures.has(id);viewport.releasePointerCapture=id=>{captures.delete(id);captureLog.push(['release',id]);};
 const draws=[],sizes=[],drags=[],activations=[],states=[];let releases=0,resets=0,nearest=0,resolve,signal,hit=true;
 window.addEventListener('spaceyew-space-state',event=>states.push(event.detail));
 const externalStateListenerCount=window.listeners.size;
 const adapter={animated:true,resize:(...args)=>sizes.push(args),render:(...args)=>draws.push(args),dispose:()=>releases++,drag:(...args)=>drags.push(args),resetFocus:()=>{resets++;canvas.dataset.spaceFocus='false';},activate:(...args)=>{activations.push(args);canvas.dataset.spaceFocus=String(hit);return hit;},focusNearest:()=>{nearest++;canvas.dataset.spaceFocus=String(hit);return hit;}};
 let resize,intersection,theme,now=0,id=0;const frames=new Map();
 class Resize{constructor(fn){this.fn=fn;resize=this;}observe(){}disconnect(){this.disconnected=true;}}
 class Intersection{constructor(fn){this.fn=fn;intersection=this;}observe(target){this.observed=target;}disconnect(){this.disconnected=true;}set(value){this.fn([{isIntersecting:value}]);}}
 class Mutation{constructor(fn){this.fn=fn;theme=this;}observe(){}disconnect(){this.disconnected=true;}}
 const exports={};vm.runInNewContext(source,{exports,window,document,AbortController,CustomEvent,Math,ResizeObserver:Resize,IntersectionObserver:Intersection,MutationObserver:Mutation,requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:key=>frames.delete(key)});
 const cleanup=exports.mountSpaceAtmosphere(canvas,(_,abortSignal)=>{signal=abortSignal;if(failed)return Promise.reject(Error('WebGL unavailable'));return loading?new Promise(done=>{resolve=()=>done(adapter);}):Promise.resolve(adapter);});
 const step=(ms=35)=>{now+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));};
 const pointer=(target,type,{x=width/2,y=height/2,pointerType='mouse',pointerId=1,...extra}={})=>{const event=Object.assign(new Event(type,{cancelable:true}),{clientX:x,clientY:y,pointerType,pointerId,button:0,...extra});target.dispatchEvent(event);return event;};
 const scrollTo=value=>{window.scrollY=Math.max(0,value);journey.top=-window.scrollY;window.dispatchEvent(new Event('scroll'));};window.scrollTo=({top})=>scrollTo(top);
 const setProgress=value=>scrollTo(value*(journey.height-canvas.height));
 const command=detail=>window.dispatchEvent(new CustomEvent('spaceyew-space-command',{detail}));
 const listenerCount=()=>host.listeners.size+viewport.listeners.size+canvas.listeners.size+document.listeners.size+window.listeners.size+preference.listeners.size-externalStateListenerCount;
 return{canvas,host,copy,journey,viewport,document,window,root,preference,draws,sizes,frames,drags,activations,states,captures,captureLog,step,pointer,scrollTo,setProgress,command,cleanup,listenerCount,get resize(){return resize;},get intersection(){return intersection;},get theme(){return theme;},get signal(){return signal;},get releases(){return releases;},get resets(){return resets;},get nearest(){return nearest;},resolve:()=>resolve(),hit:value=>{hit=value;}};
}
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
const elapsed=s=>s.draws.at(-1)[5];

test('space keeps an active 30fps clock, pauses every inactive state and never advances time on a resize or theme redraw',async()=>{
 const s=mount();s.intersection.set(true);await flush();assert.equal(s.intersection.observed,s.canvas,'visible ambient canvas stays active beyond the flight section');assert.deepEqual(s.sizes.at(-1),[1400,900,1.5]);assert.equal(elapsed(s),0);assert.equal(s.frames.size,1);
 s.step(16);const first=s.draws.length;s.step(16);assert.equal(s.draws.length,first,'the continuous loop respects the 30fps draw ceiling');s.step(19);assert.ok(elapsed(s)>0);assert.equal(s.frames.size,1,'idle space still animates');
 s.scrollTo(s.journey.height+100);const readingTime=elapsed(s);s.step();assert.ok(elapsed(s)>readingTime,'background motion continues behind reading sections');assert.equal(s.draws.at(-1)[3],1);
 const time=elapsed(s);s.theme.fn();assert.equal(elapsed(s),time);s.resize.fn();assert.equal(elapsed(s),time,'layout and color changes are read-only for animation time');
 for(const [pause,resume] of[
  [()=>{s.document.hidden=true;s.document.dispatchEvent(new Event('visibilitychange'));},()=>{s.document.hidden=false;s.document.dispatchEvent(new Event('visibilitychange'));}],
  [()=>s.intersection.set(false),()=>s.intersection.set(true)],
  [()=>s.window.dispatchEvent(new Event('beforeprint')),()=>s.window.dispatchEvent(new Event('afterprint'))],
 ]){
  const before=elapsed(s);pause();assert.equal(s.frames.size,0);const count=s.draws.length;s.step(60000);s.theme.fn();s.resize.fn();assert.equal(s.draws.length,count,'inactive redraw requests do not render');resume();assert.equal(elapsed(s),before,'resuming does not catch up hidden time');s.step();assert.ok(elapsed(s)-before<=.05,'only a bounded active frame is added');
 }
 const beforeReduced=elapsed(s);s.preference.matches=true;s.preference.dispatchEvent(new Event('change'));assert.equal(s.draws.at(-1)[4],true);assert.equal(s.frames.size,0);s.step(60000);s.theme.fn();s.resize.fn();assert.equal(elapsed(s),beforeReduced);
 s.preference.matches=false;s.preference.dispatchEvent(new Event('change'));assert.equal(elapsed(s),beforeReduced);s.step();assert.ok(elapsed(s)-beforeReduced<=.05);
 s.cleanup();assert.equal(s.releases,1);assert.equal(s.signal.aborted,true);assert.equal(s.frames.size,0);assert.ok(s.resize.disconnected&&s.intersection.disconnected&&s.theme.disconnected);assert.equal(s.listenerCount(),0);
});

test('native journey dimensions drive normalized progress and hidden copy regains semantics when returning, printing or unmounting',async()=>{
 const s=mount();s.intersection.set(true);await flush();assert.equal(s.host.dataset.journeyReady,'true');assert.equal(s.host.dataset.journeyCompact,'false');
 for(const screens of[4.3,3.4]){s.journey.height=screens*s.canvas.height;s.setProgress(.5);s.step();assert.equal(s.draws.at(-1)[3],.5,'progress follows the actual journey height');}
 assert.equal(s.copy.inert,true);assert.equal(s.copy.getAttribute('aria-hidden'),'true');assert.equal(s.host.style['--space-copy'],'0');
 s.window.dispatchEvent(new Event('beforeprint'));assert.equal(s.copy.inert,false);assert.equal(s.copy.getAttribute('aria-hidden'),null);assert.equal(s.host.style['--space-copy'],'1');
 s.window.dispatchEvent(new Event('afterprint'));assert.equal(s.copy.inert,true);
 s.setProgress(2);s.step();assert.equal(s.draws.at(-1)[3],1);s.setProgress(0);s.step();assert.equal(s.draws.at(-1)[3],0);assert.equal(s.copy.inert,false);assert.equal(s.copy.getAttribute('aria-hidden'),null);
 s.setProgress(.7);s.cleanup();assert.equal(s.copy.inert,false);assert.equal(s.copy.getAttribute('aria-hidden'),null);assert.equal(s.host.style['--space-copy'],'1');
});

test('desktop dragging is distinct from selection, scrolling and Escape reset the view, and touch scrolling stays native',async()=>{
 const s=mount();s.intersection.set(true);await flush();s.setProgress(.5);s.step();
 const down=s.pointer(s.viewport,'pointerdown');assert.equal(down.defaultPrevented,false);assert.equal(s.captures.size,1);s.pointer(s.viewport,'pointerup');assert.equal(s.activations.length,1);assert.deepEqual(s.activations[0],[0,0]);assert.equal(s.host.dataset.journeyFocus,'true');assert.equal(s.captures.size,0);
 s.window.dispatchEvent(Object.assign(new Event('keydown'),{key:'Escape'}));assert.equal(s.host.dataset.journeyFocus,'false');
 s.pointer(s.viewport,'pointerdown');s.pointer(s.host,'pointermove',{x:800,y:500});s.pointer(s.viewport,'pointerup',{x:800,y:500});assert.equal(s.drags.length,1);assert.deepEqual(s.drags[0],[100/1400,50/900]);assert.equal(s.activations.length,1,'a drag is never interpreted as a tap');
 const beforeScroll=s.resets;s.scrollTo(s.window.scrollY+20);assert.ok(s.resets>beforeScroll,'native scrolling recenters a dragged view even when no asteroid is focused');
 const captures=s.captureLog.length,touchDown=s.pointer(s.viewport,'pointerdown',{pointerType:'touch'});assert.equal(touchDown.defaultPrevented,false);s.pointer(s.host,'pointermove',{x:700,y:500,pointerType:'touch'});s.scrollTo(s.window.scrollY+50);s.pointer(s.viewport,'pointerup',{x:700,y:500,pointerType:'touch'});assert.equal(s.captureLog.length,captures,'touch never takes pointer capture');assert.equal(s.activations.length,1,'a touch scroll is never selected');assert.equal(s.drags.length,1);
 s.command('focus');assert.equal(s.nearest,1);assert.equal(s.host.dataset.journeyFocus,'true');s.command('reset');assert.equal(s.host.dataset.journeyFocus,'false');
 s.hit(false);s.pointer(s.viewport,'pointerdown');s.pointer(s.viewport,'pointerup');assert.equal(s.host.dataset.journeyFocus,'false','a miss never reports successful focus');
 s.preference.matches=true;s.preference.dispatchEvent(new Event('change'));const counts=[s.activations.length,s.drags.length,s.nearest];s.pointer(s.viewport,'pointerdown');s.pointer(s.host,'pointermove',{x:1000});s.pointer(s.viewport,'pointerup');s.command('focus');assert.deepEqual([s.activations.length,s.drags.length,s.nearest],counts,'reduced motion disables spatial interaction');s.cleanup();
});

test('failed, late, interrupted and reduced loads keep a compact readable page and release every lifecycle resource',async()=>{
 const failed=mount({failed:true});await flush();assert.equal(failed.canvas.dataset.atmosphere,'fallback');assert.equal(failed.host.dataset.journeyCompact,'true');assert.equal(failed.host.dataset.journeyReady,'false');assert.equal(failed.copy.inert,false);assert.equal(failed.listenerCount(),0);
 const pending=mount({loading:true});pending.cleanup();assert.equal(pending.signal.aborted,true);pending.resolve();await flush();assert.equal(pending.releases,1);assert.equal(pending.draws.length,0);
 const late=mount({loading:true});late.journey.top=-late.canvas.height*.3;late.intersection.set(true);late.resolve();await flush();assert.equal(late.host.dataset.journeyCompact,'true','loading cannot stretch an already-scrolled page');assert.equal(late.draws.at(-1)[3],0);late.cleanup();
 const reduced=mount({reduced:true,width:390,height:844});reduced.intersection.set(true);await flush();assert.equal(reduced.host.dataset.journeyCompact,'true');assert.equal(reduced.frames.size,0);assert.deepEqual(reduced.sizes.at(-1),[390,844,1.25]);reduced.cleanup();
 const lost=mount();lost.intersection.set(true);await flush();lost.pointer(lost.viewport,'pointerdown');assert.equal(lost.captures.size,1);const event=new Event('webglcontextlost',{cancelable:true});lost.canvas.dispatchEvent(event);assert.equal(event.defaultPrevented,true);assert.equal(lost.releases,1);assert.equal(lost.signal.aborted,true);assert.equal(lost.frames.size,0);assert.equal(lost.captures.size,0);assert.equal(lost.canvas.style.opacity,'0');assert.equal(lost.canvas.dataset.atmosphere,'fallback');assert.equal(lost.host.dataset.journeyCompact,'true');assert.equal(lost.copy.inert,false);assert.equal(lost.listenerCount(),0);lost.cleanup();assert.equal(lost.releases,1);
});
