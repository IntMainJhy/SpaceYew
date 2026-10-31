import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=ts.transpileModule(fs.readFileSync(new URL('../src/components/BlogSpacesJourney.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function fixture({reduced=false,late=false}={}){
 class Target extends EventTarget{
  listeners=new Set();dataset={};style={setProperty(name,value){this[name]=value;}};reads=0;
  addEventListener(name,fn,options){super.addEventListener(name,fn,options);this.listeners.add(name);}
  removeEventListener(name,fn){super.removeEventListener(name,fn);this.listeners.delete(name);}
  getBoundingClientRect(){this.reads++;return{left:0,top:0,width:1440,height:900};}
 }
 const opening=new Target(),host=new Target(),canvas=new Target(),link={},controls={setAttribute(){}};
 opening.top=0;opening.getBoundingClientRect=function(){this.reads++;return{top:this.top,height:2350};};
 host.parentElement=opening;host.clientHeight=900;host.querySelector=()=>controls;
 const preference=Object.assign(new Target(),{matches:reduced}),document=Object.assign(new Target(),{hidden:false}),window=new Target(),effects=[],refs=[host,canvas,link],frames=new Map(),draws=[],sizes=[];
 let next=0,now=0,ref=0,intersection,bounds,loads=0,releases=0,resolve,signal;
 const engine={render:(...args)=>{draws.push(args);return 0;},resize:(...args)=>sizes.push(args),dispose:()=>releases++,pick:()=>'/blog/test'};
 class Intersection{constructor(fn){this.fn=fn;intersection=this;}observe(){}disconnect(){this.disconnected=true;}set(value){this.fn([{isIntersecting:value}]);}}
 class Resize{constructor(fn){this.fn=fn;bounds=this;}observe(){}disconnect(){this.disconnected=true;}}
 const exports={};
 vm.runInNewContext(source,{exports,Math,AbortController,document,window,devicePixelRatio:2,matchMedia:()=>preference,getComputedStyle:()=>({getPropertyValue:()=> '72px'}),IntersectionObserver:Intersection,ResizeObserver:Resize,requestAnimationFrame:fn=>{frames.set(++next,fn);return next;},cancelAnimationFrame:id=>frames.delete(id),require:name=>{
  if(name==='react')return{useRef:()=>({current:refs[ref++]}),useEffect:fn=>effects.push(fn)};
  if(name==='react/jsx-runtime')return{jsx(){},jsxs(){}};
  if(name==='next/navigation')return{useRouter:()=>({push(){}})};
  if(name==='@/lib/blog-spaces-scene')return{createBlogSpacesScene:(_canvas,_spaces,abortSignal)=>{loads++;signal=abortSignal;return late?new Promise(done=>{resolve=done;}):Promise.resolve(engine);}};
  throw Error('Unexpected '+name);
 }});
 exports.BlogSpacesJourney({spaces:[{handle:'test',name:'真实空间',href:'/blog/test',intro:'',avatarId:'',coverId:''}],labels:{open:'打开',skip:'跳过'}});
 const cleanup=effects[0]();
 const step=(ms=1000/120)=>{now+=ms;const pending=[...frames.values()];frames.clear();for(const callback of pending)callback(now);};
 const move=()=>host.dispatchEvent(Object.assign(new Event('pointermove'),{clientX:1300,clientY:750,pointerType:'mouse'}));
 return{opening,host,canvas,link,controls,preference,document,window,intersection,bounds,frames,draws,sizes,cleanup,step,move,get loads(){return loads;},get releases(){return releases;},get signal(){return signal;},resolve:()=>resolve(engine)};
}

test('the journey coalesces scroll and resize work and renders every 120/144Hz display callback',async()=>{
 for(const hz of[120,144]){
  const s=fixture();assert.equal(s.loads,0,'offscreen routes do not parse a GPU scene');s.intersection.set(true);await flush();
  assert.equal(s.loads,1);assert.equal(s.frames.size,1);s.step(1000/hz);assert.equal(s.draws.length,1);assert.equal(s.sizes.length,1);
  const reads=s.host.reads+s.opening.reads,draws=s.draws.length;
  for(let i=0;i<12;i++){s.window.dispatchEvent(new Event('scroll'));s.bounds.fn();}
  assert.equal(s.host.reads+s.opening.reads,reads,'event handlers never force layout');assert.equal(s.draws.length,draws);assert.equal(s.frames.size,1);
  s.step(1000/hz);assert.equal(s.host.reads+s.opening.reads,reads+2,'one geometry batch per display frame');assert.equal(s.draws.length,draws+1);assert.equal(s.sizes.length,2);
  const before=s.draws.length;
  for(let i=0;i<hz;i++){s.opening.top=-i;s.window.dispatchEvent(new Event('scroll'));s.step(1000/hz);}
  assert.equal(s.draws.length-before,hz,'no timer ceiling drops high-refresh scroll frames');s.cleanup();assert.equal(s.releases,1);assert.equal(s.frames.size,0);
 }
});

test('pointer motion reuses measured bounds, settles, and sleeps while hidden or offscreen',async()=>{
 const s=fixture();s.intersection.set(true);await flush();s.step();const reads=s.host.reads+s.opening.reads;s.move();
 for(let i=0;i<240;i++)s.step();
 assert.equal(s.host.reads+s.opening.reads,reads,'pointer damping does not read layout on every frame');assert.equal(s.frames.size,0,'settled pointer motion has no idle loop');
 s.host.dispatchEvent(new Event('pointerleave'));assert.equal(s.frames.size,1);s.document.hidden=true;s.document.dispatchEvent(new Event('visibilitychange'));assert.equal(s.frames.size,0);
 const count=s.draws.length;s.window.dispatchEvent(new Event('scroll'));s.step();assert.equal(s.draws.length,count);
 s.document.hidden=false;s.document.dispatchEvent(new Event('visibilitychange'));s.step();assert.equal(s.draws.length,count+1);
 s.intersection.set(false);const measured=s.host.reads+s.opening.reads;s.window.dispatchEvent(new Event('scroll'));s.bounds.fn();s.step();assert.equal(s.host.reads+s.opening.reads,measured);assert.equal(s.frames.size,0);
 s.intersection.set(true);s.step();assert.equal(s.sizes.length,2);s.cleanup();assert.equal(s.signal.aborted,true);assert.ok(s.intersection.disconnected&&s.bounds.disconnected);assert.equal(s.host.listeners.size+s.canvas.listeners.size+s.window.listeners.size+s.document.listeners.size+s.preference.listeners.size,0);
});

test('reduced motion, printing, context loss and a late load preserve the static fallback',async()=>{
 const s=fixture({reduced:true});s.intersection.set(true);await flush();assert.equal(s.loads,0);assert.equal(s.opening.dataset.journey,'static');
 s.preference.matches=false;s.preference.dispatchEvent(new Event('change'));await flush();s.step();assert.equal(s.loads,1);assert.equal(s.opening.dataset.journey,'ready');
 s.window.dispatchEvent(new Event('beforeprint'));assert.equal(s.frames.size,0);assert.equal(s.opening.dataset.journey,'static');s.window.dispatchEvent(new Event('afterprint'));s.step();assert.equal(s.opening.dataset.journey,'ready');
 s.canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));assert.equal(s.opening.dataset.journey,'fallback');assert.equal(s.canvas.style.opacity,'0');assert.equal(s.frames.size,0);assert.equal(s.releases,1);s.cleanup();assert.equal(s.releases,1);
 const pending=fixture({late:true});pending.intersection.set(true);await flush();pending.cleanup();pending.resolve();await flush();assert.equal(pending.signal.aborted,true);assert.equal(pending.releases,1);assert.equal(pending.draws.length,0);
});
