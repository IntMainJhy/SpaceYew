import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=ts.transpileModule(fs.readFileSync(new URL('../src/lib/home-flow.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function mount(reduced=false,fine=true,interactive=true){
 class Target extends EventTarget{
  listeners=new Set();attrs={};writes={};
  addEventListener(type,listener,options){super.addEventListener(type,listener,options);this.listeners.add(type);}
  removeEventListener(type,listener){super.removeEventListener(type,listener);this.listeners.delete(type);}
  setAttribute(name,value){this.attrs[name]=value;this.writes[name]=(this.writes[name]||0)+1;}
 }
 const preference=Object.assign(new Target(),{matches:reduced}),pointer=Object.assign(new Target(),{matches:fine});
 const document=Object.assign(new Target(),{hidden:false}),window=Object.assign(new Target(),{matchMedia:q=>q.includes('reduced')?preference:pointer});
 const host=new Target(),ribbons=[new Target(),new Target(),new Target()],folds=new Target(),trail=new Target(),pool=Array.from({length:84},()=>new Target());
 const nodes={'[data-flow-ribbons]':folds,'[data-flow-trail]':trail};
 const svg={dataset:{},parentElement:host,querySelectorAll:s=>s==='[data-flow-ribbon]'?ribbons:pool,querySelector:s=>nodes[s],getBoundingClientRect:()=>({left:0,top:100,width:1600,height:900})};
 let observer,now=0,id=0;const frames=new Map();
 class Observer{constructor(callback){this.callback=callback;observer=this;}observe(target){assert.equal(target,svg)}disconnect(){this.disconnected=true;}intersect(value){this.callback([{isIntersecting:value}]);}}
 const exports={};
 vm.runInNewContext(source,{exports,window,document,IntersectionObserver:Observer,performance:{now:()=>now},requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:key=>frames.delete(key)});
 const cleanup=exports.mountHomeFlow(svg,interactive);
 const step=(ms=35)=>{now+=ms;const pending=[...frames.values()];frames.clear();for(const fn of pending)fn(now);};
 const move=(x,y,type='mouse')=>host.dispatchEvent(Object.assign(new Event('pointermove'),{clientX:x,clientY:y,pointerType:type}));
 return {preference,pointer,document,window,host,svg,ribbons,folds,trail,pool,observer,frames,cleanup,step,move,homeFlowPaths:exports.homeFlowPaths};
}

test('background pauses offscreen, hidden, during print and reduced motion; unmount releases resources',()=>{
 for(const reduced of[false,true]){
  const s=mount(reduced),{preference,document,window,svg,observer,frames}=s;
  assert.equal(svg.dataset.flowState,'paused');assert.equal(frames.size,0);
  observer.intersect(true);assert.equal(frames.size,reduced?0:1);
  preference.matches=false;preference.dispatchEvent(new Event('change'));s.step();
  const initial=s.ribbons[0].attrs.d;s.step(1000);assert.notEqual(s.ribbons[0].attrs.d,initial);
  for(const [target,event,field] of[[document,'visibilitychange','hidden'],[preference,'change','matches']]){
   target[field]=true;target.dispatchEvent(new Event(event));assert.equal(frames.size,0);assert.equal(s.trail.attrs.opacity,'0');
   target[field]=false;target.dispatchEvent(new Event(event));assert.equal(frames.size,1);
  }
  window.dispatchEvent(new Event('beforeprint'));assert.equal(frames.size,0);
  window.dispatchEvent(new Event('afterprint'));assert.equal(frames.size,1);
  observer.intersect(false);assert.equal(frames.size,0);observer.intersect(true);
  s.cleanup();assert.equal(frames.size,0);assert.equal(svg.dataset.flowState,'paused');assert.ok(observer.disconnected);
  assert.equal(window.listeners.size+document.listeners.size+preference.listeners.size+s.pointer.listeners.size+s.host.listeners.size,0);
 }
});

test('character particles follow fast and slow movement, dissipate, stay bounded and ignore touch/coarse input',()=>{
 const s=mount();s.observer.intersect(true);s.step();
 const active=()=>s.pool.filter(p=>p.textContent);
 s.move(30,300,'touch');s.step();assert.equal(active().length,0);
 for(let i=0;i<85;i++){s.move(100+i*19,300+Math.sin(i/8)*80);s.step();}
 assert.ok(active().length>0);assert.ok(active().some(p=>Number(p.attrs.opacity)>0));
 assert.ok(active().length<=84,'bounded particle pool');
 assert.ok(active().every(p=>['#477b9f','#397e73','#a77956'].includes(p.attrs.fill)));
 assert.notEqual(s.folds.attrs.transform,'translate(0.00 0.00)');
 s.host.dispatchEvent(new Event('pointerleave'));
 const particle=active().find(p=>Number(p.attrs.opacity)>.05),before=Number(particle.attrs.opacity),position=particle.attrs.transform;
 s.step(600);assert.ok(Number(particle.attrs.opacity)<before);assert.notEqual(particle.attrs.transform,position,'particle disperses while fading');
 for(let i=0;i<48;i++)s.step();assert.equal(s.trail.attrs.opacity,'0');assert.equal(active().length,0);
 for(let i=0;i<40;i++){s.move(200+i*2,400);s.step();}assert.ok(active().length>0,'slow pointer movement also emits');
 s.window.dispatchEvent(new Event('scroll'));assert.equal(s.trail.attrs.opacity,'0');assert.equal(active().length,0);
 s.pointer.matches=false;s.pointer.dispatchEvent(new Event('change'));
 for(let i=0;i<5;i++){s.move(300+i*30,300);s.step();}assert.equal(active().length,0);
 s.cleanup();
});

test('quiet authentication background keeps flowing without emitting pointer characters',()=>{
 const s=mount(false,true,false);s.observer.intersect(true);s.step();
 const initial=s.ribbons[0].attrs.d;
 for(let i=0;i<10;i++){s.move(100+i*40,300);s.step();}
 assert.notEqual(s.ribbons[0].attrs.d,initial);assert.equal(s.trail.attrs.opacity,'0');
 assert.equal(s.pool.filter(p=>p.textContent).length,0);s.cleanup();assert.equal(s.frames.size,0);
});

test('admin background motion follows 120/144Hz callbacks without a decorative 30fps ceiling',()=>{
 for(const hz of[120,144]){
  const s=mount(false,true,false);s.observer.intersect(true);
  for(let index=0;index<hz;index++)s.step(1000/hz);
  assert.equal(s.ribbons[0].writes.d,hz,'one curve update per visible callback at '+hz+'Hz');
  const actual=s.ribbons[0].attrs.d.match(/-?\d+(?:\.\d+)?/g).map(Number),expected=s.homeFlowPaths((hz-1)/hz)[0].match(/-?\d+(?:\.\d+)?/g).map(Number);
  assert.equal(actual.length,expected.length);assert.ok(actual.every((value,index)=>Math.abs(value-expected[index])<1e-9),'wall-clock curve phase stays independent of refresh rate');s.cleanup();assert.equal(s.frames.size,0);
 }
});
