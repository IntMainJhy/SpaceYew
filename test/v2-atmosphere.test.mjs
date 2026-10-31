import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {Box3,Mesh,MeshPhysicalMaterial,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const source=ts.transpileModule(fs.readFileSync(new URL('../src/components/V2Atmosphere.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
function mount({reduced=false,width=1400,height=900,loading=false,failed=false,kind='glass',component=false}={}){
 class Target extends EventTarget{
  listeners=new Set();dataset={};style={};
  addEventListener(name,fn,options){super.addEventListener(name,fn,options);this.listeners.add(name)}
  removeEventListener(name,fn){super.removeEventListener(name,fn);this.listeners.delete(name)}
  getBoundingClientRect(){return{left:0,top:this.top||0,width,height}}
 }
 const preference=Object.assign(new Target(),{matches:reduced}),root=new Target(),host=new Target(),document=Object.assign(new Target(),{hidden:false,documentElement:root}),window=Object.assign(new Target(),{devicePixelRatio:3,matchMedia:()=>preference});
 const surface=new Target(),canvas=Object.assign(new Target(),{parentElement:surface,closest:selector=>selector==='.v2-home'?host:null});
 const draws=[],sizes=[],loads=[],effects=[],delegations=[];let releases=0,resolve,reject,signal;
 const adapter={resize:(...args)=>sizes.push(args),render:(...args)=>draws.push(args),dispose:()=>releases++};
 const load=(kind,abortSignal)=>{
  signal=abortSignal;
  const record={kind,signal,releases:0,adapter:{...adapter,dispose:()=>{record.releases++;releases++}}};loads.push(record);
  if(failed)return Promise.reject(Error('Model or WebGL unavailable'));
  return loading?new Promise((a,b)=>{record.resolve=()=>a(record.adapter);resolve=record.resolve;reject=b}):Promise.resolve(record.adapter);
 };
 let resize,intersection,theme,now=0,id=0;const frames=new Map();
 class Resize{constructor(fn){this.fn=fn;resize=this}observe(){}disconnect(){this.disconnected=true}}
 class Intersection{constructor(fn){this.fn=fn;intersection=this}observe(){}disconnect(){this.disconnected=true}set(value){this.fn([{isIntersecting:value}])}}
 class Mutation{constructor(fn){this.fn=fn;theme=this}observe(){}disconnect(){this.disconnected=true}}
 const exports={};
 vm.runInNewContext(source,{exports,window,document,AbortController,Math,ResizeObserver:Resize,IntersectionObserver:Intersection,MutationObserver:Mutation,requestAnimationFrame:fn=>{frames.set(++id,fn);return id},cancelAnimationFrame:key=>frames.delete(key),require:name=>{
  if(name==='react')return{useEffect(fn){effects.push(fn)},useRef(){return{current:canvas}}};
  if(name==='react/jsx-runtime')return{jsx(){}};
  if(name==='@/lib/home-moon')return{createHomeMoon:(_,abortSignal)=>load('moon',abortSignal)};
  if(name==='@/lib/home-glass')return{createHomeGlass:(_,abortSignal)=>load('glass',abortSignal)};
  if(name==='@/lib/home-space')return{createHomeSpace:(_,abortSignal)=>load('space',abortSignal)};
  if(name==='@/lib/space-atmosphere')return{mountSpaceAtmosphere:(element,createScene)=>{const delegation={element,createScene,released:false};delegations.push(delegation);return()=>{delegation.released=true;}}};
  throw Error('Unexpected dependency '+name);
 }});
 let cleanup;
 if(component){exports.V2Atmosphere({initialScene:kind});cleanup=effects[0]();}
 else cleanup=exports.mountV2Atmosphere(canvas,(_,abortSignal)=>load(kind,abortSignal),kind);
 const step=(ms=35)=>{now+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now))};
 const move=(x=width,y=height,pointerType='mouse')=>host.dispatchEvent(Object.assign(new Event('pointermove'),{clientX:x,clientY:y,pointerType}));
 return{canvas,host,window,document,root,preference,get resize(){return resize},get intersection(){return intersection},get theme(){return theme},frames,draws,sizes,cleanup,step,move,get signal(){return signal},adapter,loads,delegations,get releases(){return releases},resolve:()=>resolve(),reject:()=>reject(Error('Load failed'))};
}
const flush=async()=>{await Promise.resolve();await Promise.resolve()};

test('space delegates to its continuous journey lifecycle while the archived scenes retain their own scheduler',async()=>{
 const s=mount({kind:'space'});assert.equal(s.delegations.length,1);assert.equal(s.delegations[0].element,s.canvas);assert.equal(s.loads.length,0);
 await s.delegations[0].createScene(s.canvas,new AbortController().signal);assert.equal(s.loads[0].kind,'space');
 s.cleanup();assert.equal(s.delegations[0].released,true);
});

test('glass follows the pointer with damping, caps redraws and resolution, and stops when idle or outside the viewport',async()=>{
 const s=mount();s.intersection.set(true);await flush();
 assert.deepEqual(s.sizes.at(-1),[1400,900,1.5]);assert.equal(s.draws.length,1);assert.equal(s.frames.size,0,'no continuous idle GPU loop');
 s.move();s.step(16);assert.ok(s.draws.at(-1)[0]>0&&s.draws.at(-1)[0]<1,'smooth rather than instant camera motion');
 const first=s.draws.length;s.step(16);assert.equal(s.draws.length,first,'draws capped near 30 fps');
 for(let i=0;i<100;i++)s.step();assert.equal(s.frames.size,0,'settled camera sleeps');
 s.host.dispatchEvent(new Event('pointerleave'));assert.equal(s.frames.size,1);
 s.intersection.set(false);assert.equal(s.frames.size,0);
 const offscreen=s.draws.length;s.move(0,0);s.theme.fn();assert.equal(s.draws.length,offscreen);
 s.intersection.set(true);assert.equal(s.frames.size,1);
 s.document.hidden=true;s.document.dispatchEvent(new Event('visibilitychange'));assert.equal(s.frames.size,0);
 s.document.hidden=false;s.document.dispatchEvent(new Event('visibilitychange'));assert.equal(s.frames.size,1);
 s.window.dispatchEvent(new Event('beforeprint'));assert.equal(s.frames.size,0);
 s.window.dispatchEvent(new Event('afterprint'));assert.equal(s.frames.size,1);
 s.root.dataset.colorMode='dark';s.theme.fn();assert.equal(s.draws.at(-1)[2],true);
 s.cleanup();assert.equal(s.releases,1);assert.equal(s.signal.aborted,true);assert.equal(s.frames.size,0);
 assert.ok(s.resize.disconnected&&s.intersection.disconnected&&s.theme.disconnected);
 assert.equal(s.host.listeners.size+s.canvas.listeners.size+s.document.listeners.size+s.window.listeners.size+s.preference.listeners.size,0);
});

test('touch and reduced motion keep the glass static, including preference changes during movement',async()=>{
 const s=mount({reduced:true,width:390,height:844});s.intersection.set(true);await flush();
 assert.deepEqual(s.sizes.at(-1),[390,844,1.25]);assert.equal(s.draws.length,1);s.move();assert.equal(s.frames.size,0);
 s.preference.matches=false;s.preference.dispatchEvent(new Event('change'));s.move(390,844,'touch');assert.equal(s.frames.size,0);
 s.move();s.step();assert.ok(s.draws.at(-1)[0]>0);
 s.preference.matches=true;s.preference.dispatchEvent(new Event('change'));
 assert.deepEqual(s.draws.at(-1),[0,0,false,0,true]);assert.equal(s.frames.size,0);s.cleanup();
});

test('scrolling below the hero redraws the same viewport canvas and coalesces scroll events, including reduced motion',async()=>{
 const s=mount({reduced:true});s.intersection.set(true);await flush();
 s.host.top=-1800;for(let i=0;i<12;i++)s.window.dispatchEvent(new Event('scroll'));
 assert.equal(s.frames.size,1,'scroll events share one pending frame');
 const before=s.draws.length;s.step();assert.equal(s.draws.length,before+1);
 assert.deepEqual(s.draws.at(-1),[0,0,false,2,true],'reading colors update without enabling spatial motion');
 assert.equal(s.frames.size,0);assert.deepEqual(s.sizes.at(-1),[1400,900,1.5],'GPU target stays viewport-sized');
 s.window.dispatchEvent(new Event('scroll'));s.step(16);assert.equal(s.draws.length,before+1,'independent scroll events still respect the 30fps ceiling');s.step(19);assert.equal(s.draws.length,before+2);
 s.intersection.set(false);s.host.top=-2700;s.window.dispatchEvent(new Event('scroll'));s.step();assert.equal(s.draws.length,before+2);
 s.intersection.set(true);assert.equal(s.draws.at(-1)[3],3);s.cleanup();assert.equal(s.window.listeners.size,0);
});

test('load failures, context loss and unmount during a late load preserve the CSS fallback and release resources',async()=>{
 const failed=mount({failed:true});await flush();assert.equal(failed.canvas.dataset.atmosphere,'fallback');assert.equal(failed.host.listeners.size,0);failed.cleanup();
 const pending=mount({loading:true});pending.cleanup();assert.equal(pending.signal.aborted,true);pending.resolve();await flush();assert.equal(pending.releases,1);assert.equal(pending.draws.length,0);
 const lost=mount();lost.intersection.set(true);await flush();lost.move();
 lost.canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));assert.equal(lost.frames.size,0);assert.equal(lost.canvas.style.opacity,'0');assert.equal(lost.canvas.dataset.atmosphere,'fallback');
 assert.equal(lost.releases,1,'context loss promptly releases GPU resources');assert.equal(lost.signal.aborted,true);assert.equal(lost.host.listeners.size,0);
 lost.cleanup();assert.equal(lost.releases,1);
});

test('scene changes abort old loads before mounting, ignore invalid events, and release late scenes',async()=>{
 const s=mount({kind:'moon',component:true,loading:true});await flush();
 const change=detail=>s.window.dispatchEvent(Object.assign(new Event('spaceyew-home-scene'),{detail}));
 assert.equal(s.host.dataset.scene,'moon');assert.equal(s.loads.length,1);
 const moon=s.loads[0];change('invalid');change({scene:'glass'});assert.equal(s.loads.length,1);assert.equal(moon.signal.aborted,false);
 change('glass');assert.equal(moon.signal.aborted,true,'old async work is aborted synchronously');assert.equal(s.host.dataset.scene,'glass');await flush();
 const glass=s.loads[1];moon.resolve();await flush();assert.equal(moon.releases,1);assert.equal(s.draws.length,0,'late old model never renders');
 s.intersection.set(true);glass.resolve();await flush();assert.equal(s.draws.length,1);
 change('glass');await flush();assert.equal(s.loads.length,2,'selecting the current scene preserves the renderer');
 change('moon');assert.equal(glass.releases,1);assert.equal(glass.signal.aborted,true);await flush();
 const next=s.loads[2];s.cleanup();assert.equal(next.signal.aborted,true);next.resolve();await flush();assert.equal(next.releases,1);
 assert.equal(s.window.listeners.size+s.host.listeners.size+s.canvas.listeners.size+s.document.listeners.size+s.preference.listeners.size,0);
});

test('moon retains presence below the hero while glass keeps the archived reading opacity',async()=>{
 for(const [kind,dark,opacity] of [['moon',false,.5],['moon',true,.45],['glass',false,.55],['glass',true,.2]]){
  const s=mount({kind});s.root.dataset.colorMode=dark?'dark':'light';s.intersection.set(true);await flush();
  s.host.top=-1800;s.window.dispatchEvent(new Event('scroll'));s.step();
  assert.ok(Math.abs(Number(s.canvas.style.opacity)-opacity)<.00001);s.cleanup();
 }
});

test('the shipped original GLB loads as two bounded glass meshes with real transmission and volume',async()=>{
 const bytes=fs.readFileSync(new URL('../public/models/spaceyew-glass.glb',import.meta.url));
 assert.ok(bytes.length<64*1024,'small self-contained model');
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const meshes=[];gltf.scene.traverse(node=>{if(node instanceof Mesh)meshes.push(node)});assert.equal(meshes.length,2);
 const size=new Box3().setFromObject(gltf.scene).getSize(new Vector3());assert.ok(size.x>2&&size.y>3&&size.z>.4);
 for(const mesh of meshes){assert.ok(mesh.material instanceof MeshPhysicalMaterial);assert.equal(mesh.material.transmission,1);assert.ok(mesh.material.thickness>.4);mesh.geometry.dispose();mesh.material.dispose()}
});
